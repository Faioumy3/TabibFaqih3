import { Teacher, Student, AttendanceRecord, StudentLog, ExportData } from '../types';
import { db } from './firebase';
import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  getDoc, 
  deleteDoc, 
  query, 
  where, 
  writeBatch,
  addDoc
} from 'firebase/firestore';

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

export const api = {
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
        // Seed if empty
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
      return {};
    }
  },

  saveTeacher: async (teacher: Teacher): Promise<void> => {
    await setDoc(doc(db, 'teachers', teacher.code), teacher);
  },

  deleteTeacher: async (code: string): Promise<void> => {
    await deleteDoc(doc(db, 'teachers', code));
  },

  getStudents: async (): Promise<Student[]> => {
    const snap = await getDocs(collection(db, 'students'));
    return snap.docs.map(d => d.data() as Student);
  },

  registerStudent: async (student: Student): Promise<void> => {
    // Using student ID as the document ID for uniqueness
    await setDoc(doc(db, 'students', student.id), student);
  },

  updateStudent: async (student: Student): Promise<void> => {
    await setDoc(doc(db, 'students', student.id), student, { merge: true });
  },

  deleteStudent: async (id: string): Promise<void> => {
    await deleteDoc(doc(db, 'students', id));
  },

  getAttendance: async (): Promise<AttendanceRecord[]> => {
    const snap = await getDocs(collection(db, 'attendance'));
    return snap.docs.map(d => d.data() as AttendanceRecord);
  },

  saveAttendanceBatch: async (records: AttendanceRecord[]): Promise<void> => {
    const batch = writeBatch(db);
    records.forEach(r => {
      // Create a new document reference with auto-generated ID
      const ref = doc(collection(db, 'attendance'));
      batch.set(ref, r);
    });
    await batch.commit();
  },

  getStudentLogs: async (studentCode: string): Promise<StudentLog[]> => {
    const q = query(collection(db, 'student_logs'), where('studentCode', '==', studentCode));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as StudentLog);
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
  }
};
