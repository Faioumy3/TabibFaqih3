import React, { useState, useRef, useEffect } from 'react';
import { 
  Stethoscope, 
  HeartPulse,
  Settings, 
  Send, 
  BookOpen, 
  ChevronDown,
  Sparkles,
  ArrowRight,
  Search
} from 'lucide-react';
// Import from constants-1 as requested (Strict Local Database)
import { CATEGORIES, MOCK_FATWAS as INITIAL_FATWAS } from './constants-1';
import { LATAIF_DATA as INITIAL_LATAIF } from './constants-lataif';
import { QuoteCard } from './components/QuoteCard';
import { FatwaCard } from './components/FatwaCard';
import { AdminPanel } from './components/AdminPanel';
import { DailyLatifa } from './components/DailyLatifa';
import { ChatMessage, CategoryId, Quote, Fatwa, Latifa } from './types';
import ReactMarkdown from 'react-markdown';
import { 
  getFatwasFromFirestore, 
  addFatwaToFirestore, 
  deleteFatwaFromFirestore,
  updateFatwaInFirestore,
  getLataifFromFirestore,
  addLatifaToFirestore,
  updateLatifaInFirestore,
  deleteLatifaFromFirestore
} from './services/firebase';

const QUOTES: Quote[] = [
  {
    id: 1,
    text: "لا أعلم علمًا بعد الحلال والحرام أنبل من الطب",
    author: "الإمام الشافعي"
  },
  {
    id: 2,
    text: "عليَّ أن أتسلح بالعلم؛ لأجابه هذا العدو البغيض الذي يفتك ببنيان الله المقدس",
    author: "أبوبكر الرازي"
  }
];

type ViewMode = 'chat' | 'details' | 'admin';

// Helper function to normalize Arabic text for accurate search
const normalizeText = (text: string): string => {
  if (!text) return "";
  let normalized = text
    .replace(/(آ|إ|أ)/g, 'ا') // Normalize Alef
    .replace(/ة/g, 'ه')       // Normalize Taa Marbuta
    .replace(/ى/g, 'ي')       // Normalize Ya/Alif Maqsura
    .replace(/[\u064B-\u065F]/g, '') // Remove Tashkeel (Diacritics)
    .replace(/[^\w\s\u0600-\u06FF]/g, ' ') // Remove special chars but keep Arabic
    .toLowerCase()
    .trim();

  return normalized.replace(/(^|\s)ال/g, '$1');
};

const DELETED_FATWAS_KEY = 'deletedFatwaIds';
const DELETED_LATAIF_KEY = 'deletedLatifaIds';

const getDeletedFatwaIds = (): string[] => {
  try {
    const stored = localStorage.getItem(DELETED_FATWAS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const addToDeletedFatwaIds = (id: string) => {
  const deleted = getDeletedFatwaIds();
  if (!deleted.includes(id)) {
    deleted.push(id);
    localStorage.setItem(DELETED_FATWAS_KEY, JSON.stringify(deleted));
  }
};

const getDeletedLatifaIds = (): number[] => {
  try {
    const stored = localStorage.getItem(DELETED_LATAIF_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const addToDeletedLatifaIds = (id: number) => {
  const deleted = getDeletedLatifaIds();
  if (!deleted.includes(id)) {
    deleted.push(id);
    localStorage.setItem(DELETED_LATAIF_KEY, JSON.stringify(deleted));
  }
};

const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('chat');
  const [selectedFatwa, setSelectedFatwa] = useState<Fatwa | null>(null);
  
  // Use State for Fatwas to allow Runtime Adding/Deleting
  const [fatwasList, setFatwasList] = useState<Fatwa[]>(INITIAL_FATWAS);
  
  // Use State for Lataif to allow Runtime Adding/Deleting
  const [lataifList, setLataifList] = useState<Latifa[]>(INITIAL_LATAIF);

  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showTopics, setShowTopics] = useState(false);
  const [expandedCategoryId, setExpandedCategoryId] = useState<CategoryId | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (viewMode === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Fetch Data from Firebase on Mount
  useEffect(() => {
    const fetchData = async () => {
      // Get list of deleted local items
      const deletedFatwaIds = getDeletedFatwaIds();
      const deletedLatifaIds = getDeletedLatifaIds();
      
      // 1. Fatwas - filter out deleted ones
      const firebaseFatwas = await getFatwasFromFirestore();
      const filteredInitialFatwas = INITIAL_FATWAS.filter(f => !deletedFatwaIds.includes(f.id));
      setFatwasList([...filteredInitialFatwas, ...firebaseFatwas]);

      // 2. Lataif - filter out deleted ones
      const filteredInitialLataif = INITIAL_LATAIF.filter(l => !deletedLatifaIds.includes(l.id));
      setLataifList(filteredInitialLataif);
    };
    fetchData();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, viewMode]);

  // Handlers for Admin Panel (Fatwas)
  const handleAddFatwa = async (newFatwa: Fatwa) => {
    // 1. Add to Firebase
    const firestoreId = await addFatwaToFirestore(newFatwa);
    
    // 2. Add to Local State (UI)
    if (firestoreId) {
      setFatwasList(prev => [...prev, { ...newFatwa, _firestoreId: firestoreId } as any]);
    } else {
      setFatwasList(prev => [...prev, newFatwa]);
    }
  };

  const handleDeleteFatwa = async (id: string) => {
    const fatwaToDelete = fatwasList.find(f => f.id === id);
    if (fatwaToDelete && (fatwaToDelete as any)._firestoreId) {
      // Delete from Firebase (cloud)
      const success = await deleteFatwaFromFirestore((fatwaToDelete as any)._firestoreId);
      if (success) {
        setFatwasList(prev => prev.filter(f => f.id !== id));
      } else {
        alert("حدث خطأ أثناء الحذف من قاعدة البيانات.");
      }
    } else {
      // Delete local/static fatwa - save to deleted list
      addToDeletedFatwaIds(id);
      setFatwasList(prev => prev.filter(f => f.id !== id));
    }
  };

  const handleUpdateFatwa = async (updatedFatwa: Fatwa) => {
    // If it has a firestore ID, update it there
    if ((updatedFatwa as any)._firestoreId) {
      const success = await updateFatwaInFirestore(updatedFatwa);
      if (!success) alert("فشل تحديث الفتوى في قاعدة البيانات");
    }
    // Always update local state for immediate feedback
    setFatwasList(prev => prev.map(f => f.id === updatedFatwa.id ? updatedFatwa : f));
  };

  // Handlers for Admin Panel (Lataif)
  const handleAddLatifa = async (newLatifa: Latifa) => {
    // Generate new ID for local ones
    const newId = Math.max(...INITIAL_LATAIF.map(l => l.id), ...lataifList.map(l => l.id)) + 1;
    const latifaWithId = { ...newLatifa, id: newId };
    
    // Persist to Firebase
    const docId = await addLatifaToFirestore(latifaWithId);
    if (docId) {
        setLataifList(prev => [...prev, { ...latifaWithId, _firestoreId: docId }]);
    } else {
        alert("فشل حفظ اللطيفة في قاعدة البيانات");
    }
  };

  const handleUpdateLatifa = async (updatedLatifa: Latifa) => {
    // إذا كانت من Firebase، حدّثها هناك
    if (updatedLatifa._firestoreId) {
        const success = await updateLatifaInFirestore(updatedLatifa);
        if (!success) {
            alert("فشل تحديث اللطيفة في قاعدة البيانات");
            return;
        }
    }
    // Always update local state for immediate feedback
    setLataifList(prev => prev.map(l => l.id === updatedLatifa.id ? updatedLatifa : l));
  };

  const handleDeleteLatifa = async (id: number) => {
    const latifaToDelete = lataifList.find(l => l.id === id);
    
    if (!latifaToDelete) {
        alert("اللطيفة غير موجودة");
        return;
    }

    if (latifaToDelete._firestoreId) {
        // Delete from Firebase (cloud)
        const success = await deleteLatifaFromFirestore(latifaToDelete._firestoreId);
        if (!success) {
            alert("فشل الحذف من قاعدة البيانات");
            return;
        }
    } else {
        // Delete local/static latifa - save to deleted list
        addToDeletedLatifaIds(id);
    }
    
    // Delete from state
    setLataifList(prev => prev.filter(l => l.id !== id));
  };

  const handleSearch = () => {
    if (!inputText.trim()) return;

    if (viewMode !== 'chat') {
      setViewMode('chat');
    }

    const userMsg: ChatMessage = {
      role: 'user',
      content: inputText,
      timestamp: new Date(),
      isFatwa: false
    };

    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);
    
    setTimeout(() => {
      // 1. Prepare Query
      const normalizedQuery = normalizeText(inputText);
      const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);
      
      // 2. Perform Search on the LIVE state (fatwasList)
      const foundFatwas = fatwasList.filter(fatwa => {
        const searchableText = [
          fatwa.title,
          fatwa.question,
          ...fatwa.tags
        ].map(t => normalizeText(t || "")).join(" ");
        
        return queryTokens.every(token => searchableText.includes(token));
      });

      // 3. Response Generation
      if (foundFatwas.length > 0) {
        const aiMsg: ChatMessage = {
          role: 'model',
          content: foundFatwas, 
          timestamp: new Date(),
          isFatwa: true
        };
        setMessages(prev => [...prev, aiMsg]);
      } else {
        const errorMsg: ChatMessage = {
          role: 'model',
          content: "عذراً، لم يتم العثور على مسألة مطابقة تماماً للبحث في العناوين أو الأسئلة الرئيسية. يرجى التأكد من الكلمات المستخدمة أو تصفح الفهرس.",
          timestamp: new Date(),
          isFatwa: false
        };
        setMessages(prev => [...prev, errorMsg]);
      }
      
      setIsLoading(false);
    }, 600); 
    
    setInputText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const selectTopic = (topic: Fatwa) => {
    setSelectedFatwa(topic);
    setViewMode('details');
    setShowTopics(false);
  };

  const toggleCategory = (id: CategoryId) => {
    setExpandedCategoryId(prev => prev === id ? null : id);
  };

  const goBackToChat = () => {
    setViewMode('chat');
    setSelectedFatwa(null);
  };

  // Group topics by category from the LIVE state
  const groupedTopics = fatwasList.reduce((acc, topic) => {
    if (!acc[topic.category]) acc[topic.category] = [];
    acc[topic.category].push(topic);
    return acc;
  }, {} as Record<CategoryId, Fatwa[]>);

  return (
    <div className="h-full flex flex-col bg-gray-50/50 relative font-cairo text-right">
      
      {/* 1. Main Content Area */}
      <main className="flex-1 overflow-y-auto custom-scrollbar w-full max-w-3xl mx-auto px-4 pt-6 pb-4">
        
        {/* Header Section */}
        <div className="flex flex-col items-center mb-3">
          <div className="flex items-center gap-2 mb-0.5">
             <Stethoscope className="w-6 h-6 text-teal-600" />
            <h1 className="text-2xl font-extrabold text-gray-800 tracking-tight">
              الطبيب الفقيه
            </h1>
            <Stethoscope className="w-6 h-6 text-teal-600 transform scale-x-[-1]" />
          </div>
          <p className="text-teal-600 font-medium text-xs">(بين الطب والشريعة)</p>
        </div>

        {/* View Switching Logic */}
        {viewMode === 'admin' ? (
          <AdminPanel 
            onClose={() => setViewMode('chat')} 
            onAddFatwa={handleAddFatwa}
            onDeleteFatwa={handleDeleteFatwa}
            onUpdateFatwa={handleUpdateFatwa}
            currentFatwas={fatwasList}
            currentLataif={lataifList}
            onAddLatifa={handleAddLatifa}
            onUpdateLatifa={handleUpdateLatifa}
            onDeleteLatifa={handleDeleteLatifa}
          />
        ) : viewMode === 'details' && selectedFatwa ? (
          // --- Details View (Separate Page) ---
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-500">
            <button 
              onClick={goBackToChat}
              className="mb-4 flex items-center gap-2 text-gray-500 hover:text-teal-600 transition-colors font-bold text-sm bg-white px-3 py-2 rounded-lg border border-gray-200 shadow-sm"
            >
              <ArrowRight className="w-4 h-4" />
              <span>العودة للمحادثة الرئيسية</span>
            </button>
            <FatwaCard fatwa={selectedFatwa} />
          </div>
        ) : (
          // --- Chat View ---
          <>
            {messages.length === 0 ? (
              <div className="w-full flex flex-col items-center animate-in fade-in duration-500">
                
                {/* Daily Latifa Section */}
                <DailyLatifa data={lataifList} />

                {/* Pulse Icon */}
                <div className="bg-white p-3 rounded-full shadow-sm mb-4 animate-pulse">
                   <HeartPulse className="w-8 h-8 text-teal-600" />
                </div>

                {/* Greeting */}
                <div className="text-center mb-4">
                  <h2 className="text-xl font-bold text-gray-800 mb-1">السلام عليكم دكتور</h2>
                  <p className="text-gray-500 text-xs">
                    صلِّ على سيدنا النبي ﷺ خير معلم الناس الخير
                  </p>
                </div>

                {/* Quotes */}
                <div className="w-full space-y-3 mb-2">
                  {QUOTES.map(quote => (
                    <QuoteCard key={quote.id} quote={quote} />
                  ))}
                </div>
              </div>
            ) : (
              <div className="w-full space-y-6 mb-4">
                {messages.map((msg, idx) => (
                  <div 
                    key={idx} 
                    className={`flex w-full ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}
                  >
                    {/* Render Logic */}
                    {msg.isFatwa && Array.isArray(msg.content) ? (
                      <div className="w-full max-w-2xl space-y-4 animate-in slide-in-from-bottom-4 fade-in">
                        <div className="bg-teal-50 border border-teal-100 p-3 rounded-xl text-teal-800 text-sm font-bold flex items-center gap-2">
                          <Search className="w-4 h-4" />
                          <span>تم العثور على {msg.content.length} نتيجة مطابقة لبحثك:</span>
                        </div>
                        {msg.content.map((fatwa, fIdx) => (
                          <FatwaCard key={fatwa.id || fIdx} fatwa={fatwa} />
                        ))}
                      </div>
                    ) : msg.isFatwa && !Array.isArray(msg.content) && typeof msg.content !== 'string' ? (
                      <div className="w-full max-w-2xl">
                        <FatwaCard fatwa={msg.content as Fatwa} />
                      </div>
                    ) : (
                      <div 
                        className={`max-w-[85%] rounded-2xl p-4 shadow-sm text-base ${
                          msg.role === 'user' 
                            ? 'bg-teal-600 text-white rounded-tr-none' 
                            : 'bg-white border border-gray-100 text-gray-800 rounded-tl-none'
                        }`}
                      >
                         {msg.role === 'model' ? (
                            <div className="prose prose-sm max-w-none text-right font-medium leading-7 dir-rtl">
                              <ReactMarkdown>{msg.content as string}</ReactMarkdown>
                            </div>
                         ) : (
                           <p className="font-medium">{msg.content as string}</p>
                         )}
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && (
                   <div className="flex justify-end w-full">
                     <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-none p-4 shadow-sm flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-teal-500 animate-spin" />
                        <span className="text-sm text-gray-400">جاري البحث في المصادر...</span>
                     </div>
                   </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </>
        )}
      </main>

      {/* 2. Fixed Bottom Controls Area */}
      {viewMode !== 'admin' && (
      <footer className="flex-shrink-0 w-full bg-white border-t border-gray-200 z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="max-w-3xl mx-auto px-4 py-2 flex flex-col gap-2">
          {/* ... existing footer code ... */}
          {/* Topic Accordion Dropdown */}
          <div className="w-full relative">
            <button 
              onClick={() => setShowTopics(!showTopics)}
              className={`w-full border rounded-lg py-2 px-3 flex items-center justify-between font-semibold transition-colors text-xs ${
                showTopics 
                  ? 'bg-teal-50 border-teal-200 text-teal-700' 
                  : 'bg-sky-50 border-sky-100 text-gray-700 hover:bg-sky-100'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" />
                <span className="text-sm">فهرس الموضوعات</span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${showTopics ? 'rotate-180' : ''}`} />
            </button>

            {showTopics && (
              <div className="absolute z-50 bottom-full mb-2 w-full bg-white rounded-xl shadow-2xl border border-gray-200 max-h-[60vh] overflow-y-auto custom-scrollbar">
                {/* PDF Link */}
                <div className="p-2 border-b border-gray-100 sticky top-0 bg-white rounded-t-xl">
                  <a 
                    href="فقه قضايا طبية معاصرة.pdf" 
                    download
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 text-amber-800 rounded-lg text-xs font-bold transition-colors border border-amber-200"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    <span>تحميل كتاب الأحكام المتعلقة بقضايا الطب والدواء المقرر على طب الأزهر بالقاهرة - الفرقة الأولى</span>
                  </a>
                </div>
                {CATEGORIES.map((category) => {
                  const categoryTopics = groupedTopics[category.id];
                  if (!categoryTopics || categoryTopics.length === 0) return null;
                  
                  const isExpanded = expandedCategoryId === category.id;

                  return (
                    <div key={category.id} className="border-b border-gray-100 last:border-0">
                      {/* Accordion Header */}
                      <button 
                        onClick={() => toggleCategory(category.id)}
                        className={`w-full flex items-center justify-between p-2 text-right hover:bg-gray-50 transition-colors ${
                          isExpanded ? 'bg-gray-50' : ''
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-6 rounded-full ${category.color.replace('text-', 'bg-').split(' ')[0]}`}></span>
                          <span className="text-xs font-bold text-gray-700">{category.name}</span>
                          <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                            {categoryTopics.length}
                          </span>
                        </div>
                        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                      </button>

                      {/* Accordion Content */}
                      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[3000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                        <div className="bg-gray-50/50 p-1.5 space-y-0.5">
                          {categoryTopics.map(topic => (
                            <button
                              key={topic.id}
                              onClick={() => selectTopic(topic)}
                              className="w-full text-right px-3 py-2 text-xs text-gray-600 hover:bg-white hover:text-teal-700 hover:shadow-sm rounded-lg transition-all duration-200 flex items-center gap-1.5 group"
                            >
                              <div className="w-1 h-1 rounded-full bg-gray-300 group-hover:bg-teal-500 transition-colors" />
                              <span className="truncate">{topic.title}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Search Input */}
          <div className="w-full relative">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="سل ما تريد أو اكتب الكلمة المفتاحية"
              className="w-full bg-gray-50 border-2 border-gray-100 hover:border-teal-200 focus:border-teal-500 rounded-full py-2 pr-5 pl-12 text-base text-gray-700 placeholder-gray-400 outline-none transition-all shadow-sm focus:bg-white"
            />
            <button 
              onClick={handleSearch}
              disabled={isLoading || !inputText.trim()}
              className="absolute left-1.5 top-1/2 -translate-y-1/2 p-1.5 bg-transparent hover:bg-teal-50 rounded-full transition-colors disabled:opacity-50"
            >
              <Send className={`w-4 h-4 ${inputText.trim() ? 'text-teal-600' : 'text-gray-300'}`} />
            </button>
          </div>

          {/* Footer Text */}
          <div className="text-center pt-1">
            <p className="text-gray-400 text-xs font-medium leading-tight">
              (أخوكم وابنكم، محمد محمود الفيومي، كلية طب بنين القاهرة - جامعة الأزهر الشريف)
            </p>
          </div>

          {/* Bottom Row: Contact (Right) and Settings (Left) */}
          <div className="flex justify-between items-center w-full pb-0.5 pt-0.5">
            
            {/* Contact Us - Right Side (Start) */}
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-bold text-teal-700">تواصل معنا:</span>
              <div className="flex items-center gap-1.5">
                {/* Facebook */}
                <a 
                  href="https://www.facebook.com/share/17XjZt9zR5/?mibextid=wwXIfr" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-blue-600 text-white p-0.5 rounded-full hover:scale-110 transition-transform flex items-center justify-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
                </a>
                
                {/* Telegram */}
                <a 
                  href="https://t.me/El_Faioumy" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-sky-500 text-white p-0.5 rounded-full hover:scale-110 transition-transform flex items-center justify-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
                </a>
              </div>
            </div>

            {/* Settings Button - Left Side (End) */}
            <button 
              onClick={() => setViewMode('admin')}
              className="w-8 h-8 bg-teal-600 hover:bg-teal-700 text-white rounded-full shadow-md flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
            >
              <Settings className="w-4 h-4 animate-[spin_10s_linear_infinite]" />
            </button>
          </div>

        </div>
      </footer>
      )}

    </div>
  );
};

export default App;