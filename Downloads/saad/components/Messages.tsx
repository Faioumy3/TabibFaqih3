import React, { useState, useEffect } from 'react';
import { Send, Trash2, X, MessageSquare } from 'lucide-react';
import { Card, Button, Input } from './UI';
import { api } from '../services/api';
import { Message, Role } from '../types';

interface MessagesProps {
  userId: string;
  userName: string;
  userRole: Role;
  recipients?: Array<{ id: string; name: string; role: Role }>;
}

export const Messages: React.FC<MessagesProps> = ({
  userId,
  userName,
  userRole,
  recipients = []
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [selectedRecipient, setSelectedRecipient] = useState<{ id: string; name: string; role: Role } | null>(null);
  const [loading, setLoading] = useState(false);
  const [conversationMessages, setConversationMessages] = useState<Message[]>([]);

  useEffect(() => {
    const loadMessages = async () => {
      try {
        const msgs = await api.getMessages(userId);
        setMessages(msgs);
      } catch (e) {
        console.error('Error loading messages:', e);
      }
    };
    loadMessages();
    const interval = setInterval(loadMessages, 3000);
    return () => clearInterval(interval);
  }, [userId]);

  useEffect(() => {
    if (selectedConversation) {
      const loadConversation = async () => {
        try {
          const msgs = await api.getConversation(userId, selectedConversation);
          setConversationMessages(msgs);
        } catch (e) {
          console.error('Error loading conversation:', e);
        }
      };
      loadConversation();
      const interval = setInterval(loadConversation, 2000);
      return () => clearInterval(interval);
    }
  }, [selectedConversation, userId]);

  const handleSendMessage = async () => {
    if (!messageText.trim()) return alert('أكتب الرسالة');
    if (!selectedRecipient && !selectedConversation) return alert('اختر المتلقي');

    const toId = selectedConversation || selectedRecipient?.id;
    const toName = messages.find(m => m.from === selectedConversation)?.fromName || selectedRecipient?.name || '';
    
    let toRole: Role = 'admin';
    if (userRole === 'admin') {
      toRole = selectedRecipient?.role as Role || 'student';
    }

    if (!toId) return;

    setLoading(true);
    try {
      const message: Omit<Message, 'id'> = {
        from: userId,
        fromName: userName,
        fromRole: userRole,
        to: toId,
        toName,
        toRole,
        content: messageText,
        timestamp: new Date().toISOString(),
        read: false
      };
      
      await api.sendMessage(message);
      setMessageText('');
      
      if (selectedConversation) {
        const msgs = await api.getConversation(userId, selectedConversation);
        setConversationMessages(msgs);
      }
    } catch (e) {
      console.error('Error sending message:', e);
      alert('خطأ في إرسال الرسالة');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm('حذف الرسالة?')) return;
    setLoading(true);
    try {
      await api.deleteMessage(messageId);
      setMessages(messages.filter(m => m.id !== messageId));
      setConversationMessages(conversationMessages.filter(m => m.id !== messageId));
    } catch (e) {
      console.error('Error deleting message:', e);
      alert('خطأ في حذف الرسالة');
    } finally {
      setLoading(false);
    }
  };

  const conversations = Array.from(
    new Map(
      messages.map(m => [m.from, { id: m.from, name: m.fromName, role: m.fromRole }])
    ).values()
  );

  const unreadCount = messages.filter(m => !m.read).length;
  const selectedConversationName = conversations.find(c => c.id === selectedConversation)?.name;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-secondary" />
        <h2 className="text-lg font-bold text-gray-700">الرسائل {unreadCount > 0 && <span className="bg-red-500 text-white px-2 py-0.5 rounded-full text-xs">({unreadCount})</span>}</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1">
          <Card className="p-4 max-h-96 overflow-y-auto">
            <h3 className="font-bold mb-3 text-gray-700">المحادثات</h3>
            
            {conversations.length === 0 ? (
              <p className="text-gray-500 text-sm">لا توجد رسائل</p>
            ) : (
              <div className="space-y-2">
                {conversations.map((conv: any) => (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv.id)}
                    className={`w-full text-right p-2 rounded transition-all ${
                      selectedConversation === conv.id
                        ? 'bg-secondary text-white'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                  >
                    <div className="font-semibold text-sm">{conv.name}</div>
                    <div className="text-xs opacity-75">{conv.role}</div>
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="md:col-span-2">
          {selectedConversation ? (
            <>
              <Card className="p-4 mb-4 max-h-96 overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-700">{selectedConversationName}</h3>
                  <button
                    onClick={() => {
                      setSelectedConversation(null);
                      setConversationMessages([]);
                    }}
                    className="text-gray-500 hover:text-red-500"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {conversationMessages.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-4">لا توجد رسائل</p>
                ) : (
                  <div className="space-y-3">
                    {conversationMessages.map(msg => (
                      <div
                        key={msg.id}
                        className={`p-3 rounded-lg ${
                          msg.from === userId
                            ? 'bg-blue-100 text-right ml-8'
                            : 'bg-gray-100 text-right mr-8'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-600">
                            {new Date(msg.timestamp).toLocaleTimeString('ar-EG')}
                          </span>
                          {msg.from === userId && (
                            <button
                              onClick={() => handleDeleteMessage(msg.id)}
                              className="text-gray-500 hover:text-red-500"
                              title="حذف"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <p className="text-sm text-gray-800">{msg.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="أكتب الرسالة..."
                  value={messageText}
                  onChange={e => setMessageText(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && handleSendMessage()}
                  disabled={loading}
                  className="flex-1"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  {loading ? 'جاري...' : 'إرسال'}
                </Button>
              </div>
            </>
          ) : (
            <Card className="p-8 text-center">
              <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">اختر محادثة لعرضها</p>
            </Card>
          )}
        </div>
      </div>

      <Card className="p-4 border-t-2 border-secondary">
        <h3 className="font-bold mb-3 text-gray-700">إرسال رسالة جديدة</h3>
        <div className="space-y-3">
          {recipients.length > 0 ? (
            <>
              <select
                value={selectedRecipient?.id || ''}
                onChange={e => {
                  const recipient = recipients.find(r => r.id === e.target.value);
                  setSelectedRecipient(recipient || null);
                }}
                className="w-full p-2 border border-gray-300 rounded text-right"
              >
                <option value="">اختر المتلقي</option>
                {recipients.map((r: any) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.role})
                  </option>
                ))}
              </select>
              {selectedRecipient && (
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="أكتب رسالة جديدة..."
                    value={messageText}
                    onChange={e => setMessageText(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && handleSendMessage()}
                    disabled={loading}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={loading}
                    className="flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    {loading ? 'جاري...' : 'إرسال'}
                  </Button>
                </div>
              )}
            </>
          ) : (
            <p className="text-gray-500 text-sm">لا توجد جهات اتصال متاحة</p>
          )}
        </div>
      </Card>
    </div>
  );
};
