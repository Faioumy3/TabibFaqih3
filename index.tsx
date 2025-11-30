import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { 
  User, FileText, Users, Download, Settings, Lock, 
  UserCheck, UserX, Trash2, Eye, Key, LogOut, 
  Settings as SettingsIcon, Check, X, UserPlus, 
  Save, History, BookOpen, Search
} from 'lucide-react';
// @ts-ignore
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, getDocs, doc, setDoc, getDoc, 
  addDoc, deleteDoc, updateDoc, query, where, writeBatch 
} from 'firebase/firestore';

// ==========================================
// CONFIGURATION
// ==========================================

const firebaseConfig = {
  apiKey: "AIzaSyAfbHhSxXazdJmgraHWm4BtujUGoWcEUQU",
  authDomain: "saadqu-92cfc.firebaseapp.com",
  projectId: "saadqu-92cfc",
  storageBucket: "saadqu-92cfc.firebasestorage.app",
  messagingSenderId: "143670086980",
  appId: "1:143670086980:web:81b09b0103966856269b11",
  measurementId: "G-B1NH1DGEE3"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ==========================================
// TYPES
// ==========================================

export type Role = 'admin' | 'teacher' | 'student';

export interface StudentSimple {
  id: string;
  name: string;
}

export interface Teacher {
  code: string;
  name: string;
  password?: string;
  email?: string;
  students: StudentSimple[];
}

export interface Student {
  id: string;
  name: string;
  code: string;
  password?: string;
  class?: string;
  registrationDate?: string;
}

export interface AttendanceRecord {
  id: string;
  date: string;
  teacherCode: string;
  studentName: string;
  status: 'present' | 'absent';
  notes?: string;
}

export interface StudentLog {
  id?: string;
  studentCode: string;
  date: string;
  dateDisplay: string;
  newMemorizing: string;
  review: string;
  listening: string;
  newTarget: string;
  notes?: string;
}

export interface ExportData {
  teachers: Record<string, Teacher>;
  students: Student[];
  attendance: AttendanceRecord[];
  studentLogs: Record<string, StudentLog[]>;
}

// ==========================================
// API SERVICE
// ==========================================

const INITIAL_TEACHERS: Record<string, Teacher> = {
  'eman': { 
    name: 'إيمان الصباغ', 
    code: 'eman', 
    password: 'eman2025', 
    email: 'ahmed@example.com',
    students: [
      { id: '31201261802388', name: 'أروى نصر الحسيني المزين' },
      { id: '31112141802322', name: 'بسملة رضا جابر ساري' },
      { id: '31203151804361', name: 'بسملة سعيد إسماعيل نوار' },
      { id: '31210201800741', name: 'جنى إبراهيم أحمد الفاضلي' },
      { id: '31110171800976', name: 'سعد محمود سعد عبد الرحيم' },
      { id: '30905231802441', name: 'سمر سعد حسني الشاعر' },
      { id: '31205031802805', name: 'ليلى سمارة محمود الحلو' },
      { id: '31205101802344', name: 'بسملة محمد محمد الهنداوي' },
      { id: '31008141800301', name: 'جنات رضا عبد النبي حيدر' },
      { id: '31303161802728', name: 'خلود وائل نصر الفيومي' }
    ]
  },
  'samar': { 
    name: 'سمر الشاعر', 
    code: 'samar', 
    password: 'samar2025', 
    email: 'samar@example.com',
    students: [
      { id: '31309271801245', name: 'روان قطب إبراهيم أبوبكر' },
      { id: '31206201801651', name: 'محمد رمضان محمد محمد ساري' },
      { id: '31206211801161', name: 'مريم علي السيد نصر' },
      { id: '30901011806327', name: 'إيمان محمد عبد الحميد الصباغ' },
      { id: '31407171806209', name: 'آية محمود سعد عبد الرحيم' },
      { id: '31111111800884', name: 'تميمة مدحت أحمد الدهمة' },
      { id: '31408031801629', name: 'ريناد رزق سالم أبونوارج' },
      { id: '31001311801966', name: 'سمية عمر محمد القريشي' },
      { id: '31601261802378', name: 'محمد محمود إبراهيم الرويني' }
    ]
  }
};

const api = {
  getAdminPassword: async (): Promise<string> => {
    try {
      const d = await getDoc(doc(db, 'settings', 'admin'));
      return d.exists() ? d.data().password : 'admin2025';
    } catch (e) {
      console.error(e);
      return 'admin2025';
    }
  },

  setAdminPassword: async (password: string): Promise<void> => {
    await setDoc(doc(db, 'settings', 'admin'), { password });
  },

  getTeachers: async (): Promise<Record<string, Teacher>> => {
    try {
      const snap = await getDocs(collection(db, 'teachers'));
      const teachers: Record<string, Teacher> = {};
      
      if (snap.empty) {
        const batch = writeBatch(db);
        for (const [code, t] of Object.entries(INITIAL_TEACHERS)) {
          const ref = doc(db, 'teachers', code);
          batch.set(ref, t);
          teachers[code] = t;
        }
        await batch.commit();
        return teachers;
      }

      snap.forEach(d => {
        teachers[d.id] = d.data() as Teacher;
      });
      return teachers;
    } catch (e) {
      console.error("Error fetching teachers:", e);
      // Return initial teachers if DB fails, to prevent empty screen
      return INITIAL_TEACHERS;
    }
  },

  saveTeacher: async (teacher: Teacher): Promise<void> => {
    await setDoc(doc(db, 'teachers', teacher.code), teacher);
  },

  deleteTeacher: async (code: string): Promise<void> => {
    await deleteDoc(doc(db, 'teachers', code));
  },

  getStudents: async (): Promise<Student[]> => {
    try {
      const snap = await getDocs(collection(db, 'students'));
      return snap.docs.map(d => d.data() as Student);
    } catch (e) {
      return [];
    }
  },

  registerStudent: async (student: Student): Promise<void> => {
    await setDoc(doc(db, 'students', student.id), student);
  },

  updateStudent: async (student: Student): Promise<void> => {
    await setDoc(doc(db, 'students', student.id), student, { merge: true });
  },

  deleteStudent: async (id: string): Promise<void> => {
    await deleteDoc(doc(db, 'students', id));
  },

  getAttendance: async (): Promise<AttendanceRecord[]> => {
    try {
      const snap = await getDocs(collection(db, 'attendance'));
      return snap.docs.map(d => d.data() as AttendanceRecord);
    } catch (e) {
      return [];
    }
  },

  saveAttendanceBatch: async (records: AttendanceRecord[]): Promise<void> => {
    const batch = writeBatch(db);
    records.forEach(r => {
      const ref = doc(collection(db, 'attendance'));
      batch.set(ref, r);
    });
    await batch.commit();
  },

  getStudentLogs: async (studentCode: string): Promise<StudentLog[]> => {
    try {
      const q = query(collection(db, 'student_logs'), where('studentCode', '==', studentCode));
      const snap = await getDocs(q);
      return snap.docs.map(d => d.data() as StudentLog);
    } catch (e) {
      return [];
    }
  },

  saveStudentLog: async (studentCode: string, record: Partial<StudentLog>): Promise<void> => {
    await addDoc(collection(db, 'student_logs'), { ...record, studentCode });
  },

  exportData: async (): Promise<ExportData> => {
    const tSnap = await getDocs(collection(db, 'teachers'));
    const sSnap = await getDocs(collection(db, 'students'));
    const aSnap = await getDocs(collection(db, 'attendance'));
    const lSnap = await getDocs(collection(db, 'student_logs'));
    
    const teachers: Record<string, Teacher> = {};
    tSnap.forEach(d => teachers[d.id] = d.data() as Teacher);
    
    const students = sSnap.docs.map(d => d.data() as Student);
    const attendance = aSnap.docs.map(d => d.data() as AttendanceRecord);
    
    const studentLogs: Record<string, StudentLog[]> = {};
    lSnap.forEach(d => {
       const data = d.data() as StudentLog;
       if(!studentLogs[data.studentCode]) studentLogs[data.studentCode] = [];
       studentLogs[data.studentCode].push(data);
    });
    
    return { teachers, students, attendance, studentLogs };
  },

  // Optimized Login functions
  loginTeacher: async (code: string): Promise<Teacher | null> => {
    try {
      const docSnap = await getDoc(doc(db, 'teachers', code));
      if (docSnap.exists()) {
        return docSnap.data() as Teacher;
      }
      return null;
    } catch (e) {
      console.error(e);
      return null;
    }
  },

  loginStudent: async (code: string): Promise<Student | null> => {
    try {
      // Query students collection where code == provided code
      const q = query(collection(db, 'students'), where('code', '==', code));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        return querySnapshot.docs[0].data() as Student;
      }
      return null;
    } catch (e) {
      console.error(e);
      return null;
    }
  }
};

// ==========================================
// UI COMPONENTS
// ==========================================

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'accent' | 'purple' | 'pink';
  fullWidth?: boolean;
}

const Button: React.FC<ButtonProps> = ({ 
  children, variant = 'primary', fullWidth = false, className = '', ...props 
}) => {
  const baseStyles = "py-3 px-6 rounded-xl font-bold transition-all duration-300 transform hover:scale-[1.02] shadow-md disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-primary text-white hover:bg-secondary",
    secondary: "bg-gray-200 text-gray-800 hover:bg-gray-300",
    danger: "bg-danger text-white hover:bg-red-700",
    accent: "bg-accent text-white hover:bg-orange-600",
    purple: "bg-purple-600 text-white hover:bg-purple-700",
    pink: "bg-pink-500 text-white hover:bg-pink-600",
  };
  return (
    <button className={`${baseStyles} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`} {...props}>
      {children}
    </button>
  );
};

const Card = ({ children, className = '', title, actions }: any) => (
  <div className={`bg-white rounded-2xl shadow-[0_2px_12px_rgba(80,180,82,0.1)] p-6 md:p-8 ${className}`}>
    {(title || actions) && (
      <div className="flex justify-between items-center mb-6">
        {title && <h2 className="text-2xl md:text-3xl font-bold text-secondary text-center">{title}</h2>}
        {actions && <div>{actions}</div>}
      </div>
    )}
    {children}
  </div>
);

const Input = ({ label, className = '', ...props }: any) => (
  <div className="mb-4">
    <label className="block text-gray-700 font-medium mb-2 text-right">{label}</label>
    <input 
      className={`w-full p-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-right ${className}`} 
      {...props} 
    />
  </div>
);

const Select = ({ label, children, ...props }: any) => (
  <div className="mb-4">
    <label className="block text-gray-700 font-medium mb-2 text-right">{label}</label>
    <select className="w-full p-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-right bg-white" {...props}>
      {children}
    </select>
  </div>
);

const StatCard = ({ label, value, colorClass = "text-primary", icon: Icon }: any) => (
  <div className="bg-white rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center text-center hover:shadow-md transition-shadow">
    {Icon && <Icon className={`w-8 h-8 mb-2 ${colorClass}`} />}
    <div className="text-gray-500 text-sm mb-1">{label}</div>
    <div className={`text-3xl font-bold ${colorClass}`}>{value}</div>
  </div>
);

// ==========================================
// VIEWS
// ==========================================

const Home = ({ onNavigate }: any) => (
  <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 animate-[fadeIn_0.5s_ease-out]">
    <div className="text-center mb-8">
      <p className="text-xl text-primary font-bold mb-6">السلام عليكم ورحمة الله وبركاته ☺️</p>
      <div className="space-y-2 text-gray-800 text-lg md:text-xl font-medium max-w-2xl mx-auto leading-relaxed">
        <p>لَعَلَّ إِلهَ الْعَرْشِ يَا إِخْوَتِي يَقِي ... جَمَاعَتَنَا كُلَّ المَكاَرِهِ هُوَّلَا</p>
        <p>وَيَجْعَلُنَا مِمَّنْ يَكُونُ كِتاَبُهُ ... شَفِيعًا لَهُمْ إِذْ مَا نَسُوْهُ فَيمْحَلَا</p>
      </div>
    </div>
    <div className="w-full max-w-md">
      <Card className="animate-[slideUp_0.5s_ease-out]">
        <p className="text-center text-gray-800 mb-6 leading-relaxed">
          متابعة حضور وغياب الطلاب والمعلمين وإدارة شؤون المكتب <br/> بشكل رقمي لتسهيل الإدارة اليومية.
        </p>
        <div className="space-y-3">
          <Button fullWidth onClick={() => onNavigate('LOGIN_TEACHER')}>دخول المعلمين</Button>
          <Button fullWidth variant="purple" onClick={() => onNavigate('LOGIN_ADMIN')}>لوحة التحكم</Button>
          <Button fullWidth variant="pink" onClick={() => onNavigate('LOGIN_STUDENT')}>دخول الطالب</Button>
          <Button fullWidth variant="accent" onClick={() => onNavigate('REGISTER_STUDENT')}>تسجيل طالب جديد</Button>
        </div>
      </Card>
    </div>
  </div>
);

const Login = ({ view, onNavigate, onLoginSuccess }: any) => {
  const [formData, setFormData] = useState({ code: '', password: '', name: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleAdminLogin = async () => {
    setLoading(true);
    const pwd = await api.getAdminPassword();
    setLoading(false);
    if (formData.password === pwd) {
      onLoginSuccess('admin', {});
    } else {
      setError('كلمة السر غير صحيحة');
    }
  };

  const handleTeacherLogin = async () => {
    setLoading(true);
    const teacher = await api.loginTeacher(formData.code);
    setLoading(false);
    if (teacher && teacher.password === formData.password) {
      onLoginSuccess('teacher', teacher);
    } else {
      setError('الكود أو كلمة السر خطأ');
    }
  };

  const handleStudentLogin = async () => {
    setLoading(true);
    const student = await api.loginStudent(formData.code);
    setLoading(false);
    if (student && student.password === formData.password) {
      onLoginSuccess('student', student);
    } else {
      setError('بيانات الدخول غير صحيحة');
    }
  };

  const handleStudentRegister = async () => {
    if (!formData.name || !formData.code || !formData.password) return setError('أكمل البيانات');
    if (formData.password !== formData.confirmPassword) return setError('كلمات السر غير متطابقة');
    setLoading(true);
    
    // Check duplication
    const existing = await api.loginStudent(formData.code);
    if (existing) {
       setLoading(false);
       return setError('الكود مستخدم من قبل');
    }

    await api.registerStudent({
      id: Date.now().toString(),
      name: formData.name,
      code: formData.code,
      password: formData.password,
      class: 'جديد',
      registrationDate: new Date().toISOString()
    });
    setLoading(false);

    setSuccess('تم التسجيل بنجاح! جاري التحويل...');
    setTimeout(() => onNavigate('LOGIN_STUDENT'), 1500);
  };

  const titles: Record<string, string> = {
    'LOGIN_ADMIN': 'دخول الإدارة',
    'LOGIN_TEACHER': 'دخول المعلم',
    'LOGIN_STUDENT': 'دخول الطالب',
    'REGISTER_STUDENT': 'تسجيل طالب جديد'
  };

  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <Card className="w-full max-w-md animate-[fadeIn_0.3s_ease-out]">
        <h2 className="text-2xl font-bold text-center text-secondary mb-6">{titles[view]}</h2>
        {view === 'REGISTER_STUDENT' && (
          <Input label="اسم الطالب" name="name" value={formData.name} onChange={handleChange} placeholder="الاسم الثلاثي" />
        )}
        {(view !== 'LOGIN_ADMIN') && (
          <Input label={view === 'REGISTER_STUDENT' ? 'اختر كود للدخول' : 'كود الدخول'} name="code" value={formData.code} onChange={handleChange} />
        )}
        <Input label="كلمة السر" type="password" name="password" value={formData.password} onChange={handleChange} />
        {view === 'REGISTER_STUDENT' && (
          <Input label="تأكيد كلمة السر" type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} />
        )}
        {error && <div className="text-red-500 text-center mb-4 text-sm font-bold">{error}</div>}
        {success && <div className="text-green-500 text-center mb-4 text-sm font-bold">{success}</div>}
        <div className="mt-6 space-y-3">
          {view === 'LOGIN_ADMIN' && <Button fullWidth onClick={handleAdminLogin} disabled={loading}>{loading ? 'جاري التحقق...' : 'دخول'}</Button>}
          {view === 'LOGIN_TEACHER' && <Button fullWidth onClick={handleTeacherLogin} disabled={loading}>{loading ? 'جاري التحقق...' : 'دخول'}</Button>}
          {view === 'LOGIN_STUDENT' && <Button fullWidth onClick={handleStudentLogin} disabled={loading}>{loading ? 'جاري التحقق...' : 'دخول'}</Button>}
          {view === 'REGISTER_STUDENT' && <Button fullWidth onClick={handleStudentRegister} disabled={loading}>{loading ? 'جاري التسجيل...' : 'تسجيل'}</Button>}
          <Button fullWidth variant="secondary" onClick={() => onNavigate('HOME')}>رجوع للقائمة الرئيسية</Button>
          {view === 'LOGIN_STUDENT' && (
            <div className="text-center mt-2">
              <button className="text-primary text-sm underline" onClick={() => onNavigate('REGISTER_STUDENT')}>ليس لدي حساب؟ تسجيل جديد</button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

const AdminPanel = ({ onLogout }: any) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [teachers, setTeachers] = useState<Record<string, Teacher>>({});
  const [students, setStudents] = useState<Student[]>([]);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterTeacher, setFilterTeacher] = useState('');
  
  const [newTeacher, setNewTeacher] = useState<Teacher>({ name: '', code: '', password: '', email: '', students: [] });
  const [newStudentData, setNewStudentData] = useState({ name: '', teacherCode: '', id: '' });
  
  const [pwdData, setPwdData] = useState({ old: '', new: '', confirm: '' });
  const [selectedStudentLogs, setSelectedStudentLogs] = useState<{student: Student, logs: StudentLog[]} | null>(null);
  const [loading, setLoading] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');

  const refreshData = async () => {
    setLoading(true);
    try {
      const [attData, teachersData, studentsData] = await Promise.all([
        api.getAttendance(),
        api.getTeachers(),
        api.getStudents()
      ]);
      
      setRecords(attData);
      setTeachers(teachersData);

      const mergedStudentsMap = new Map<string, Student>();
      studentsData.forEach(s => mergedStudentsMap.set(s.id, s));

      Object.values(teachersData).forEach(t => {
        t.students.forEach(s => {
          if (!mergedStudentsMap.has(s.id)) {
            mergedStudentsMap.set(s.id, {
              id: s.id,
              name: s.name,
              code: '---', 
              class: `قائمة: ${t.name}`,
              password: '', 
            });
          } else {
              const existing = mergedStudentsMap.get(s.id)!;
              if (!existing.class || existing.class === 'جديد') {
                  existing.class = `قائمة: ${t.name}`;
                  mergedStudentsMap.set(s.id, existing);
              }
          }
        });
      });

      setStudents(Array.from(mergedStudentsMap.values()));
    } catch(e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refreshData(); }, []);

  const filteredRecords = records.filter(r => {
    return (filterDate ? r.date === filterDate : true) && (filterTeacher ? r.teacherCode === filterTeacher : true);
  });
  filteredRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const stats = {
    total: filteredRecords.length,
    present: filteredRecords.filter(r => r.status === 'present').length,
    absent: filteredRecords.filter(r => r.status === 'absent').length,
  };

  const filteredStudents = students.filter(s => 
     s.name.includes(studentSearch) || 
     (s.code && s.code.includes(studentSearch)) ||
     (s.id && s.id.includes(studentSearch))
  );

  const handleAddTeacher = async () => {
    if (!newTeacher.name || !newTeacher.code) return alert('أكمل البيانات');
    setLoading(true);
    await api.saveTeacher({ ...newTeacher, students: [] });
    setNewTeacher({ name: '', code: '', password: '', email: '', students: [] });
    await refreshData();
    setLoading(false);
    alert('تم إضافة المعلم');
  };

  const handleAddStudentToTeacher = async () => {
    if(!newStudentData.name || !newStudentData.teacherCode) return alert('يرجى ملء الاسم واختيار المعلم');
    
    setLoading(true);
    const teacher = teachers[newStudentData.teacherCode];
    if(!teacher) { 
        setLoading(false); 
        return alert('المعلم غير موجود'); 
    }
    
    const studentId = newStudentData.id || Date.now().toString().slice(-8);
    
    if (teacher.students.some(s => s.id === studentId)) {
        setLoading(false);
        return alert('هذا المعرف موجود بالفعل لدى هذا المعلم');
    }

    const updatedTeacher = { 
        ...teacher, 
        students: [...teacher.students, { id: studentId, name: newStudentData.name }] 
    };
    
    await api.saveTeacher(updatedTeacher);
    await refreshData();
    setNewStudentData({ name: '', teacherCode: '', id: '' });
    setLoading(false);
    alert(`تم إضافة الطالب "${newStudentData.name}" إلى المعلم "${teacher.name}" بنجاح`);
  };

  const handleDeleteTeacher = async (code: string) => { if (confirm('هل أنت متأكد؟')) { setLoading(true); await api.deleteTeacher(code); await refreshData(); setLoading(false); } };
  const handleDeleteStudent = async (id: string) => { 
      if(confirm('هل أنت متأكد من حذف الطالب؟ سيتم حذفه من سجلات المعلمين أيضاً.')) { 
          setLoading(true); 
          await api.deleteStudent(id); 
          const teachersList = Object.values(teachers);
          for (const t of teachersList) {
              if (t.students.some(s => s.id === id)) {
                  const updatedStudents = t.students.filter(s => s.id !== id);
                  await api.saveTeacher({ ...t, students: updatedStudents });
              }
          }
          await refreshData(); 
          setLoading(false);
      } 
  };

  const handleExportCSV = () => {
    let csv = '\uFEFFالتاريخ,المعلم,اسم الطالب,الحالة,الملاحظات\n';
    filteredRecords.forEach(r => {
      const teacherName = teachers[r.teacherCode]?.name || r.teacherCode;
      const status = r.status === 'present' ? 'حاضر' : 'غائب';
      csv += `${r.date},"${teacherName}","${r.studentName}","${status}","${(r.notes || '').replace(/"/g, '""')}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `attendance_${filterDate}.csv`; link.click();
  };

  const handleExportStudentLogsCSV = async () => {
    setLoading(true);
    const allData = await api.exportData();
    setLoading(false);
    const studentsList = await api.getStudents();
    const studentMap = studentsList.reduce((acc, s: Student) => { if(s.code) acc[s.code] = s.name; return acc; }, {} as Record<string, string>);
    let csv = '\uFEFFالتاريخ,اسم الطالب,الكود,الحفظ الجديد,المراجعة,التسميع,الهدف,ملاحظات\n';
    Object.entries(allData.studentLogs).forEach(([code, logs]) => {
       const name = studentMap[code] || 'غير معروف';
       logs.forEach(log => {
          csv += `"${log.dateDisplay}","${name}","${code}","${(log.newMemorizing || '').replace(/"/g, '""')}","${(log.review || '').replace(/"/g, '""')}","${log.listening}","${(log.newTarget || '').replace(/"/g, '""')}","${(log.notes || '').replace(/"/g, '""')}"\n`;
       });
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `student_logs_${new Date().toISOString().split('T')[0]}.csv`; link.click();
  };

  const handleChangePassword = async () => {
    const currentPwd = await api.getAdminPassword();
    if (pwdData.old !== currentPwd) return alert('كلمة السر الحالية خطأ');
    if (pwdData.new.length < 4 || pwdData.new !== pwdData.confirm) return alert('خطأ في كلمة السر الجديدة');
    await api.setAdminPassword(pwdData.new);
    setPwdData({ old: '', new: '', confirm: '' });
    alert('تم التغيير بنجاح'); onLogout();
  };

  const viewStudentLogs = async (student: Student) => {
      if(!student.code || student.code === '---') return alert('هذا الطالب غير مسجل في التطبيق، لا يوجد سجلات إلكترونية.');
      setLoading(true);
      const logs = await api.getStudentLogs(student.code);
      setLoading(false);
      setSelectedStudentLogs({ student, logs });
  };

  return (
    <div className="pb-20">
      <div className="bg-white p-6 rounded-2xl shadow-sm mb-6 flex flex-col justify-between items-center gap-4 text-center">
        <div><h2 className="text-2xl font-bold text-secondary">لوحة الإدارة</h2><p className="text-primary mt-1">{new Date().toLocaleDateString('ar-EG')}</p></div>
        {loading && <div className="text-accent font-bold">جاري التحميل...</div>}
        <Button variant="danger" onClick={onLogout}>خروج</Button>
      </div>
      <div className="flex flex-wrap gap-2 mb-6 justify-center">
        {['dashboard','teachers','students','reports','settings'].map(tab => (
          <Button key={tab} variant={activeTab === tab ? 'primary' : 'secondary'} onClick={() => setActiveTab(tab)} className="text-sm px-3 capitalize">
            {tab === 'dashboard' ? 'الرئيسية' : tab === 'teachers' ? 'المعلمين' : tab === 'students' ? 'الطلاب' : tab === 'reports' ? 'التقارير' : 'الإعدادات'}
          </Button>
        ))}
      </div>
      {activeTab === 'dashboard' && (
        <>
          <Card className="mb-6">
            <div className="flex flex-col gap-4">
              <Input label="التاريخ" type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} />
              <Select label="المعلم" value={filterTeacher} onChange={e => setFilterTeacher(e.target.value)}>
                <option value="">الكل</option>
                {Object.values(teachers).map(t => <option key={t.code} value={t.code}>{t.name}</option>)}
              </Select>
              <Button onClick={refreshData} fullWidth>تحديث</Button>
            </div>
          </Card>
          <div className="grid grid-cols-3 gap-2 mb-6">
            <StatCard label="السجلات" value={stats.total} icon={FileText} colorClass="text-blue-600" />
            <StatCard label="حاضر" value={stats.present} icon={UserCheck} colorClass="text-green-600" />
            <StatCard label="غائب" value={stats.absent} icon={UserX} colorClass="text-red-600" />
          </div>
          
          <div className="bg-white rounded-2xl shadow-sm p-4 mb-20">
              <h3 className="font-bold text-secondary mb-4 border-b pb-2">سجل الحضور ({filteredRecords.length})</h3>
              {filteredRecords.length === 0 ? (
                  <div className="text-center text-gray-400 py-6">لا توجد سجلات</div>
              ) : (
                  <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar">
                      {filteredRecords.map((r, idx) => (
                          <div key={idx} className="p-3 bg-gray-50 rounded-lg border flex flex-col gap-1">
                              <div className="flex justify-between items-center">
                                  <span className="font-bold text-gray-800">{r.studentName}</span>
                                  <span className={`text-xs px-2 py-1 rounded-full ${r.status === 'present' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                      {r.status === 'present' ? 'حاضر' : 'غائب'}
                                  </span>
                              </div>
                              <div className="flex justify-between text-xs text-gray-500">
                                  <span>👨‍🏫 {teachers[r.teacherCode]?.name || r.teacherCode}</span>
                                  <span>📅 {r.date}</span>
                              </div>
                              {r.notes && <div className="text-xs bg-yellow-50 text-yellow-800 p-1 mt-1 rounded">{r.notes}</div>}
                          </div>
                      ))}
                  </div>
              )}
          </div>

          <div className="fixed bottom-14 left-0 right-0 p-4 flex justify-center z-30 pointer-events-none">
             <Button onClick={handleExportCSV} variant="accent" className="pointer-events-auto shadow-lg"><Download className="w-4 h-4 inline ml-2" /> تقرير الحضور (CSV)</Button>
          </div>
        </>
      )}
      {activeTab === 'teachers' && (
        <div className="space-y-6">
          <Card title="إضافة معلم">
            <Input label="الاسم" value={newTeacher.name} onChange={e => setNewTeacher({...newTeacher, name: e.target.value})} />
            <Input label="الكود" value={newTeacher.code} onChange={e => setNewTeacher({...newTeacher, code: e.target.value})} />
            <Input label="كلمة السر" type="password" value={newTeacher.password} onChange={e => setNewTeacher({...newTeacher, password: e.target.value})} />
            <Input label="البريد الإلكتروني (اختياري)" value={newTeacher.email || ''} onChange={e => setNewTeacher({...newTeacher, email: e.target.value})} />
            <Button fullWidth onClick={handleAddTeacher}>إضافة</Button>
          </Card>
          <Card title="المعلمين">
             <div className="space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar">
               {Object.values(teachers).map((t: Teacher) => (
                 <div key={t.code} className="p-4 border rounded-lg flex justify-between items-center bg-gray-50">
                   <div className="flex-1">
                       <div className="font-bold text-secondary text-lg">{t.name}</div>
                       <div className="flex flex-wrap gap-2 text-sm text-gray-600 mt-2">
                           <div className="bg-blue-50 text-blue-800 px-2 py-1 rounded border border-blue-100">الكود: {t.code}</div>
                           <div className="bg-green-50 text-green-800 px-2 py-1 rounded border border-green-100">كلمة السر: {t.password}</div>
                           {t.email && <div className="bg-gray-50 text-gray-700 px-2 py-1 rounded border">📧 {t.email}</div>}
                           <div className="bg-purple-50 text-purple-800 px-2 py-1 rounded border border-purple-100">👨‍🎓 طلاب: {t.students?.length || 0}</div>
                       </div>
                   </div>
                   <Button className="p-2 h-10 w-10 flex items-center justify-center shrink-0 mr-2" variant="danger" onClick={() => handleDeleteTeacher(t.code)}><Trash2 className="w-4 h-4" /></Button>
                 </div>
               ))}
             </div>
          </Card>
        </div>
      )}
      {activeTab === 'students' && (
        <div className="space-y-6">
          <Card title="إضافة طالب وتسكين لمعلم">
            <Input 
                label="اسم الطالب" 
                value={newStudentData.name} 
                onChange={e => setNewStudentData({...newStudentData, name: e.target.value})} 
                placeholder="الاسم الثلاثي"
            />
            <Select 
                label="اختر المعلم" 
                value={newStudentData.teacherCode} 
                onChange={e => setNewStudentData({...newStudentData, teacherCode: e.target.value})}
            >
                <option value="">-- اختر المعلم --</option>
                {Object.values(teachers).map(t => (
                    <option key={t.code} value={t.code}>{t.name}</option>
                ))}
            </Select>
            <Input 
                label="رقم الهوية / المعرف (اختياري)" 
                value={newStudentData.id} 
                onChange={e => setNewStudentData({...newStudentData, id: e.target.value})} 
                placeholder="اتركه فارغاً للتوليد التلقائي"
            />
            <Button fullWidth onClick={handleAddStudentToTeacher} variant="accent" disabled={loading}>
                <UserPlus className="w-4 h-4 inline ml-2" />
                إضافة للقائمة
            </Button>
          </Card>

          <Card>
              <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-secondary flex items-center gap-2">
                      <Users className="w-5 h-5"/> كل الطلاب
                  </h2>
                  <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-bold">{students.length} طالب</span>
              </div>

              <div className="relative mb-6">
                  <input 
                    type="text" 
                    placeholder="بحث بالاسم أو الكود..." 
                    className="w-full p-3 pr-10 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-right"
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                  />
                  <Search className="w-5 h-5 text-gray-400 absolute top-3.5 right-3" />
              </div>

              {filteredStudents.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">لا يوجد طلاب مطابقين</div>
              ) : (
                  <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar">
                     {filteredStudents.map(s => (
                       <div key={s.id} className="p-4 border border-gray-100 rounded-xl bg-gray-50 hover:border-primary/30 transition-all">
                         <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-3 w-full">
                                <div className="w-10 h-10 rounded-full bg-secondary/10 text-secondary flex items-center justify-center font-bold text-lg shrink-0">
                                    {s.name.charAt(0)}
                                </div>
                                <div className="flex-1">
                                    <div className="font-bold text-gray-800">{s.name}</div>
                                    <div className="flex gap-2 text-xs text-gray-500 mt-1 flex-wrap items-center">
                                        <span className={`px-2 py-0.5 rounded border ${s.class?.includes('قائمة') ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-gray-100'}`}>
                                            {s.class || 'غير محدد'}
                                        </span>
                                        <span className="bg-white px-2 py-0.5 rounded border">ID: {s.id}</span>
                                        {s.registrationDate && <span className="bg-yellow-50 text-yellow-800 px-2 py-0.5 rounded border border-yellow-200">تاريخ: {new Date(s.registrationDate).toLocaleDateString('ar-EG')}</span>}
                                        {s.code !== '---' && (
                                             <>
                                                <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded border border-green-200">كود: {s.code}</span>
                                                <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">سر: {s.password}</span>
                                             </>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <Button 
                              className="p-2 h-8 w-8 flex items-center justify-center bg-red-50 text-red-500 hover:bg-red-500 hover:text-white shrink-0" 
                              onClick={() => handleDeleteStudent(s.id)}
                              title="حذف الطالب من النظام بالكامل"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                         </div>
                         <Button fullWidth className="text-sm py-2" variant="primary" onClick={() => viewStudentLogs(s)} disabled={s.code === '---'}>
                              <Eye className="w-4 h-4 inline ml-1" /> سجل اليوميات
                         </Button>
                       </div>
                     ))}
                   </div>
              )}
          </Card>
        </div>
      )}
      {activeTab === 'reports' && (
        <Card title="التقارير">
          <div className="space-y-4">
            <Button onClick={handleExportStudentLogsCSV} variant="primary" fullWidth><Download className="ml-2 w-4 h-4" /> يوميات الطلاب (Excel)</Button>
            <div className="text-sm text-gray-500 text-center mt-2">بيانات التطبيق محفوظة سحابياً (Firebase).</div>
          </div>
        </Card>
      )}
      {activeTab === 'settings' && (
         <Card title="الإعدادات">
            <Input label="كلمة السر الحالية" type="password" value={pwdData.old} onChange={e => setPwdData({...pwdData, old: e.target.value})} />
            <Input label="الجديدة" type="password" value={pwdData.new} onChange={e => setPwdData({...pwdData, new: e.target.value})} />
            <Input label="تأكيد" type="password" value={pwdData.confirm} onChange={e => setPwdData({...pwdData, confirm: e.target.value})} />
            <Button onClick={handleChangePassword} variant="primary" fullWidth className="mt-2">حفظ</Button>
         </Card>
      )}
      {selectedStudentLogs && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <Card className="w-full max-w-md max-h-[80vh] flex flex-col bg-white" title={`يوميات: ${selectedStudentLogs.student.name}`}>
             <div className="overflow-y-auto flex-1 custom-scrollbar p-1 space-y-3">
               {selectedStudentLogs.logs.length===0?<div className="text-center py-10">لا توجد يوميات</div>:selectedStudentLogs.logs.slice().reverse().map((log, idx)=>(
                 <div key={idx} className="bg-gray-50 p-3 rounded-xl border">
                    <div className="font-bold text-primary mb-2 border-b pb-1">📅 {log.dateDisplay}</div>
                    <div className="text-sm space-y-1">
                       <div><span className="text-gray-500">الحفظ:</span> {log.newMemorizing}</div>
                       <div><span className="text-gray-500">المراجعة:</span> {log.review}</div>
                       <div><span className="text-gray-500">الهدف:</span> {log.newTarget}</div>
                       {log.notes && <div className="text-xs text-yellow-700 bg-yellow-50 p-1 rounded mt-1">{log.notes}</div>}
                    </div>
                 </div>
               ))}
             </div>
             <Button fullWidth variant="secondary" onClick={() => setSelectedStudentLogs(null)} className="mt-4">إغلاق</Button>
          </Card>
        </div>
      )}
    </div>
  );
};

const TeacherPanel = ({ teacher, onLogout }: any) => {
  const [currentTeacher, setCurrentTeacher] = useState<Teacher>(teacher);
  const [attendance, setAttendance] = useState<Record<string, { status: 'present' | 'absent' | null, notes: string }>>({});
  const [showManageStudents, setShowManageStudents] = useState(false);
  const [showChangePwd, setShowChangePwd] = useState(false);
  const [newStudent, setNewStudent] = useState({ name: '', id: '' });
  const [newPwd, setNewPwd] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
       const teachers = await api.getTeachers();
       const updated = teachers[teacher.code];
       if (updated) {
          setCurrentTeacher(updated);
          const init: Record<string, { status: 'present' | 'absent' | null, notes: string }> = {}; 
          updated.students?.forEach(s => init[s.name] = { status: null, notes: '' });
          setAttendance(init);
       }
    }
    load();
  }, [teacher.code]);

  const handleStatus = (name: string, status: 'present' | 'absent') => {
    setAttendance(p => ({ 
      ...p, 
      [name]: { ...p[name], status: p[name]?.status === status ? null : status } 
    }));
  };
  
  const handleNote = (name: string, notes: string) => {
    setAttendance(p => ({ ...p, [name]: { ...p[name], notes } }));
  };
  
  const saveAttendance = async () => {
    const records = Object.entries(attendance)
      .filter(([_, d]: [string, { status: 'present' | 'absent' | null, notes: string }]) => d.status)
      .map(([n, d]: [string, { status: 'present' | 'absent' | null, notes: string }]) => ({
        id: `${Date.now()}-${Math.random()}`, 
        teacherCode: currentTeacher.code, 
        studentName: n, 
        status: d.status!, 
        notes: d.notes, 
        date: new Date().toISOString().split('T')[0]
      }));
    if (!records.length) return alert('حدد الحالة');
    setLoading(true);
    await api.saveAttendanceBatch(records); 
    setLoading(false);
    alert('تم الحفظ'); onLogout();
  };

  const handleAddStudent = async () => {
    if(!newStudent.name||!newStudent.id) return alert('بيانات ناقصة');
    const t = { ...currentTeacher }; if(!t.students) t.students=[];
    if(t.students.some(s=>s.id===newStudent.id)) return alert('موجود');
    t.students.push(newStudent); 
    setLoading(true);
    await api.saveTeacher(t); 
    setCurrentTeacher(t); 
    setLoading(false);
    setNewStudent({name:'',id:''}); alert('تم');
  };

  const handleChangePwd = async () => {
    if(newPwd.length<4) return alert('قصيرة');
    const t={...currentTeacher, password:newPwd}; 
    setLoading(true);
    await api.saveTeacher(t); 
    setCurrentTeacher(t); 
    setLoading(false);
    setNewPwd(''); alert('تم'); setShowChangePwd(false);
  };

  return (
    <div className="pb-24">
      <Card className="mb-6 sticky top-4 z-40 border-green-100 flex justify-between items-center">
        <div><h2 className="text-2xl font-bold text-secondary">الحضور</h2><div className="text-sm">{currentTeacher.name}</div></div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={()=>setShowChangePwd(true)} className="p-2"><Key className="w-4 h-4"/></Button>
          <Button variant="accent" onClick={()=>setShowManageStudents(true)} className="px-3 text-sm">إدارة الطلاب</Button>
        </div>
      </Card>
      {loading && <div className="text-center py-2 text-primary">جاري المعالجة...</div>}
      <div className="space-y-4">
        {currentTeacher.students?.map(s => {
            const d = attendance[s.name] || { status: null, notes: '' };
            return (
              <div key={s.id} className="bg-white rounded-xl p-4 shadow-sm border flex flex-col md:flex-row gap-4 items-center">
                <div className="flex-1 w-full text-right"><div className="font-bold text-lg">{s.name}</div><input type="text" placeholder="ملاحظات..." className="w-full mt-2 p-2 border rounded bg-gray-50 text-right" value={d.notes} onChange={e=>handleNote(s.name, e.target.value)} /></div>
                <div className="flex gap-2 w-full md:w-auto">
                  <button onClick={()=>handleStatus(s.name, 'absent')} className={`flex-1 px-4 py-3 rounded font-bold border transition-colors ${d.status==='absent'?'bg-red-500 text-white':'bg-red-50 text-red-500'}`}>غائب</button>
                  <button onClick={()=>handleStatus(s.name, 'present')} className={`flex-1 px-4 py-3 rounded font-bold border transition-colors ${d.status==='present'?'bg-green-500 text-white':'bg-green-50 text-green-500'}`}>حاضر</button>
                </div>
              </div>
            );
        })}
      </div>
      <div className="fixed bottom-0 left-0 right-0 bg-white p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] flex gap-4 z-50">
        <Button variant="danger" onClick={onLogout} className="flex-1">خروج</Button>
        <Button onClick={saveAttendance} className="flex-[2]" disabled={loading}>{loading?'...':'حفظ'}</Button>
      </div>
      {showManageStudents && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <Card className="w-full max-w-lg" title="إدارة الطلاب">
            <div className="bg-gray-50 p-4 rounded mb-4">
                <Input label="الاسم" value={newStudent.name} onChange={e=>setNewStudent({...newStudent, name:e.target.value})} />
                <Input label="الهوية" value={newStudent.id} onChange={e=>setNewStudent({...newStudent, id:e.target.value})} />
                <Button fullWidth onClick={handleAddStudent} variant="accent" disabled={loading}>إضافة</Button>
            </div>
            <div className="max-h-60 overflow-y-auto space-y-2">
               {currentTeacher.students?.map(s=>(<div key={s.id} className="flex justify-between p-2 border bg-white"><span>{s.name}</span><button onClick={async ()=>{if(confirm('حذف؟')){const t={...currentTeacher};t.students=t.students.filter(x=>x.id!==s.id);setLoading(true);await api.saveTeacher(t);setCurrentTeacher(t);setLoading(false);}}} className="text-red-500"><Trash2 className="w-4 h-4"/></button></div>))}
            </div>
            <Button fullWidth variant="secondary" onClick={()=>setShowManageStudents(false)} className="mt-4">إغلاق</Button>
          </Card>
        </div>
      )}
      {showChangePwd && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <Card title="تغيير كلمة السر">
            <Input label="الجديدة" type="password" value={newPwd} onChange={e=>setNewPwd(e.target.value)} />
            <div className="flex gap-2 mt-4"><Button fullWidth variant="secondary" onClick={()=>setShowChangePwd(false)}>إلغاء</Button><Button fullWidth onClick={handleChangePwd} disabled={loading}>حفظ</Button></div>
          </Card>
        </div>
      )}
    </div>
  );
};

const StudentPanel = ({ student, onLogout }: any) => {
  const [logs, setLogs] = useState<StudentLog[]>([]);
  const [form, setForm] = useState({ newMemorizing: '', review: '', listening: '', newTarget: '', notes: '' });
  const [showChangePwd, setShowChangePwd] = useState(false);
  const [newPwd, setNewPwd] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { 
      const load = async () => {
          if(student.code) {
              const l = await api.getStudentLogs(student.code);
              setLogs(l);
          }
      }
      load();
  }, [student.code]);

  const handleSubmit = async () => {
    if (!form.newMemorizing || !form.review || !form.listening || !form.newTarget) return alert('أكمل البيانات');
    if (!student.code) return alert('خطأ في الكود');
    const rec = { 
        ...form, 
        studentCode: student.code,
        date: new Date().toISOString(), 
        dateDisplay: new Date().toLocaleDateString('ar-EG') 
    };
    setLoading(true);
    await api.saveStudentLog(student.code, rec);
    setLoading(false);
    setLogs([rec as StudentLog, ...logs]);
    setForm({ newMemorizing: '', review: '', listening: '', newTarget: '', notes: '' });
    alert('تم الحفظ');
  };

  const handleChangePwd = async () => {
     if(newPwd.length<4) return alert('قصيرة');
     setLoading(true);
     await api.updateStudent({ ...student, password: newPwd });
     setLoading(false);
     setNewPwd(''); alert('تم التغيير'); onLogout();
  };

  return (
    <div className="pb-20">
      <Card className="mb-6 bg-gradient-to-r from-green-50 to-white flex justify-between items-center">
        <div><h2 className="text-2xl font-bold text-secondary">مرحباً {student.name}</h2><div className="text-sm text-gray-600">الكود: {student.code}</div></div>
        <Button variant="secondary" onClick={()=>setShowChangePwd(true)} className="p-2 h-10 w-10 flex items-center justify-center"><Key className="w-5 h-5"/></Button>
      </Card>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="تسجيل اليوميات">
          <Input label="📖 الحفظ الجديد" value={form.newMemorizing} onChange={e=>setForm({...form, newMemorizing:e.target.value})} />
          <Input label="🔄 المراجعة" value={form.review} onChange={e=>setForm({...form, review:e.target.value})} />
          <Select label="🎤 التسميع" value={form.listening} onChange={e=>setForm({...form, listening:e.target.value})}>
            <option value="">-- اختر --</option>
            <option value="نعم">نعم</option>
            <option value="لا">لا</option>
            <option value="جزئي">جزئي</option>
          </Select>
          <Input label="📍 الهدف القادم" value={form.newTarget} onChange={e=>setForm({...form, newTarget:e.target.value})} />
          <div className="mb-4">
            <label className="block mb-2 text-right text-gray-700 font-medium">ملاحظات</label>
            <textarea className="w-full border-2 border-gray-200 p-3 rounded-lg focus:outline-none focus:border-primary text-right h-24" value={form.notes} onChange={e=>setForm({...form, notes:e.target.value})} />
          </div>
          <Button fullWidth onClick={handleSubmit} disabled={loading}>{loading?'...':'حفظ'}</Button>
        </Card>
        <Card title="السجل السابق" className="max-h-[800px] flex flex-col">
           <div className="overflow-y-auto flex-1 custom-scrollbar space-y-4 pr-2">
              {logs.length===0 && <div className="text-center py-10 text-gray-400">لا يوجد سجلات</div>}
              {logs.slice().reverse().map((log, i) => (
                <div key={i} className="bg-gray-50 rounded-xl p-4 border hover:border-green-200 transition-colors">
                  <div className="font-bold text-primary mb-2 border-b pb-1">📅 {log.dateDisplay}</div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="font-bold text-gray-700">الحفظ:</span> {log.newMemorizing}</div>
                    <div><span className="font-bold text-gray-700">المراجعة:</span> {log.review}</div>
                    <div><span className="font-bold text-gray-700">التسميع:</span> {log.listening}</div>
                    <div><span className="font-bold text-gray-700">الهدف:</span> {log.newTarget}</div>
                  </div>
                  {log.notes && <div className="mt-2 text-xs bg-white p-2 border rounded text-gray-600">{log.notes}</div>}
                </div>
              ))}
           </div>
        </Card>
      </div>
      <div className="fixed bottom-0 left-0 right-0 bg-white p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] flex justify-center z-50">
        <Button variant="danger" onClick={onLogout} className="px-8 flex gap-2 items-center"><LogOut className="w-4 h-4"/> خروج</Button>
      </div>
      {showChangePwd && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <Card title="تغيير كلمة السر">
            <Input label="الجديدة" type="password" value={newPwd} onChange={e=>setNewPwd(e.target.value)} />
            <div className="flex gap-2 mt-4"><Button fullWidth variant="secondary" onClick={()=>setShowChangePwd(false)}>إلغاء</Button><Button fullWidth onClick={handleChangePwd} disabled={loading}>حفظ</Button></div>
          </Card>
        </div>
      )}
    </div>
  );
};

// ==========================================
// MAIN APP COMPONENT
// ==========================================

const App = () => {
  const [view, setView] = useState('HOME');
  const [session, setSession] = useState<{type: Role, data: any} | null>(null);
  const [imageError, setImageError] = useState(false);

  const handleLoginSuccess = (userType: string, data: any) => {
    setSession({ type: userType as any, data });
    if (userType === 'admin') setView('DASHBOARD_ADMIN');
    if (userType === 'teacher') setView('DASHBOARD_TEACHER');
    if (userType === 'student') setView('DASHBOARD_STUDENT');
  };

  const handleLogout = () => { 
    setSession(null); 
    setView('HOME'); 
  };

  const renderContent = () => {
    switch (view) {
      case 'HOME': return <Home onNavigate={setView} />;
      case 'LOGIN_TEACHER': 
      case 'LOGIN_ADMIN': 
      case 'LOGIN_STUDENT': 
      case 'REGISTER_STUDENT':
        return <Login view={view} onNavigate={setView} onLoginSuccess={handleLoginSuccess} />;
      case 'DASHBOARD_ADMIN': 
        return session?.type === 'admin' ? <AdminPanel onLogout={handleLogout} /> : <Home onNavigate={setView} />;
      case 'DASHBOARD_TEACHER': 
        return session?.type === 'teacher' ? <TeacherPanel teacher={session.data} onLogout={handleLogout} /> : <Home onNavigate={setView} />;
      case 'DASHBOARD_STUDENT': 
        return session?.type === 'student' ? <StudentPanel student={session.data} onLogout={handleLogout} /> : <Home onNavigate={setView} />;
      default: return <Home onNavigate={setView} />;
    }
  };

  return (
    <div className="min-h-screen relative bg-gray-100 flex justify-center items-start pt-0 md:pt-4 font-amiri">
      <div className="w-full max-w-md md:max-w-4xl bg-gradient-to-br from-bgStart to-bgEnd min-h-screen shadow-2xl relative flex flex-col md:rounded-xl overflow-hidden border-x border-gray-200">
        
        {/* Header */}
        <header className="sticky top-0 z-50 bg-secondary text-white shadow-md">
          <div className="px-4 py-3 flex items-center gap-3 w-full">
            <div className="shrink-0">
              {imageError ? (
                 <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center border border-white/30"><User className="w-6 h-6 text-white/90" /></div>
              ) : (
                <img 
                  src="sheikh.jpg" 
                  alt="الشيخ" 
                  className="w-10 h-10 rounded-full object-cover border border-white/40 shadow-sm bg-white" 
                  onError={(e) => { setImageError(true); e.currentTarget.style.display = 'none'; }} 
                />
              )}
            </div>
            <h1 className="text-xl md:text-2xl font-bold whitespace-nowrap overflow-hidden text-ellipsis flex-1 leading-relaxed pt-1">
              مكتب الشيخ سعد بن محمود أبو نوارج
            </h1>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 px-4 py-6 pb-28 overflow-x-hidden w-full">
          {renderContent()}
        </main>

        {/* Footer */}
        <footer className="absolute bottom-0 left-0 w-full bg-white/95 backdrop-blur-md shadow-[0_-4px_20px_rgba(0,0,0,0.08)] py-4 px-6 z-40 border-t border-gray-100 block">
          <div className="flex flex-col md:flex-row justify-center items-center gap-3 text-sm font-bold text-gray-700">
            <span className="text-gray-500 text-xs mb-1 md:mb-0">تواصل معنا عبر:</span>
            <div className="flex flex-wrap justify-center gap-3">
              {/* WhatsApp */}
              <a 
                href="https://wa.me/201060936428" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-white bg-[#25D366] hover:bg-[#20bd5a] px-3 py-1.5 rounded-full transition-all shadow-sm hover:shadow-md"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.272-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.67-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.076 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421-7.403h-.004a9.87 9.87 0 00-4.951 1.263l-.355.192-.368-.06 1.41 5.209.9.003c1.231-1.187 2.927-1.9 4.773-1.9 4.97 0 9.005 4.028 9.005 9.009 0 4.983-4.032 9.015-9.009 9.015-4.981 0-9.01-4.032-9.01-9.015 0-1.946.648-3.835 1.8-5.36l.134-.341-.086-.368-1.41-5.209-.37-.056.192-.355A9.87 9.87 0 0112.051 2c5.495 0 9.973 4.478 9.973 9.973 0 5.495-4.478 9.973-9.973 9.973-5.495 0-9.973-4.478-9.973-9.973 0-2.15.697-4.243 1.977-6.004"/>
                </svg>
                <span className="font-sans pt-0.5">01060936428</span>
              </a>

              {/* Telegram */}
              <a 
                href="https://t.me/SaaD2961" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-white bg-[#0088cc] hover:bg-[#0077b5] px-3 py-1.5 rounded-full transition-all shadow-sm hover:shadow-md"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 11.944 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
                <span className="font-sans pt-0.5">@SaaD2961</span>
              </a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

// ==========================================
// RENDER ROOT
// ==========================================

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
