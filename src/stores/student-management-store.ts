import { create } from 'zustand';
import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  updateDoc, 
  query,
  where,
  serverTimestamp,
  orderBy,
  limit,
  startAfter,
  getCountFromServer
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Student, CreateStudentData, UpdateStudentData, StudentFilters } from '@/types/student';
import { fetchWithProgress } from '@/lib/api-progress';

interface StudentManagementStore {
  // State
  students: Student[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  totalPages: number;
  lastDoc: any;
  hasMore: boolean;
  currentPage: number;
  perPage: number;
  pageHistory: any[]; // Store lastDoc for each page visited

  // Actions
  fetchStudents: (filters?: StudentFilters, page?: number, direction?: 'next' | 'prev' | 'first') => Promise<void>;
  createStudent: (studentData: CreateStudentData) => Promise<void>;
  updateStudent: (studentId: string, studentData: UpdateStudentData) => Promise<void>;
  deleteStudent: (studentId: string) => Promise<void>;
  toggleVerification: (studentId: string, verified: boolean) => Promise<void>;
  getStudentById: (studentId: string) => Promise<Student | null>;
  importStudents: (students: Student[]) => Promise<void>;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  resetPagination: () => void;
  setCurrentPage: (page: number) => void;
  setPerPage: (perPage: number) => void;
}

// Helper function to determine sign-in method based on social IDs
const determineSignInMethod = (student: any): 'manual' | 'facebook' | 'google' | 'apple' => {
  if (student.facebook_id) return 'facebook';
  if (student.google_id) return 'google';
  if (student.apple_id) return 'apple';
  return 'manual';
};

// Helper function to determine ALL sign-in methods based on social IDs
const determineSignInMethods = (student: any): ('manual' | 'facebook' | 'google' | 'apple')[] => {
  const methods: ('manual' | 'facebook' | 'google' | 'apple')[] = [];
  
  // Check for multiple social IDs
  if (student.facebook_id) methods.push('facebook');
  if (student.google_id) methods.push('google');
  if (student.apple_id) methods.push('apple');
  
  // If no social IDs, user signed in manually
  if (methods.length === 0) {
    methods.push('manual');
  }
  
  return methods;
};

// Helper function to convert Firestore document to Student
const convertFirestoreDocToStudent = (doc: any): Student => {
  const data = doc.data();
  const student = {
    id: doc.id,
    ...data,
    created_at: data.created_at?.toDate?.()?.toISOString() || data.created_at,
    updated_at: data.updated_at?.toDate?.()?.toISOString() || data.updated_at,
    deleted_at: data.deleted_at?.toDate?.()?.toISOString() || data.deleted_at,
  } as Student;
  
  // Determine and add sign-in method (backwards compatibility)
  student.sign_in_method = determineSignInMethod(student);
  
  // Determine and add all sign-in methods
  student.sign_in_methods = determineSignInMethods(student);
  
  return student;
};

// Helper function to get request count for a student
const getStudentRequestCount = async (studentId: string): Promise<number> => {
  try {
    const requestsRef = collection(db, 'requests');
    const q = query(requestsRef, where('student_id', '==', studentId));
    const snapshot = await getCountFromServer(q);
    return snapshot.data().count;
  } catch (error) {
    console.error(`Error getting request count for student ${studentId}:`, error);
    return 0;
  }
};

// Helper function to get request counts for multiple students
const getStudentsRequestCounts = async (students: Student[]): Promise<Student[]> => {
  try {
    const requestCountPromises = students.map(async (student) => {
      const requestCount = await getStudentRequestCount(student.id);
      return { ...student, request_count: requestCount };
    });
    
    return await Promise.all(requestCountPromises);
  } catch (error) {
    console.error('Error getting request counts for students:', error);
    return students; // Return students without request counts if there's an error
  }
};

// Helper function to convert undefined values to null (Firestore doesn't support undefined)
const cleanData = (obj: any): any => {
  const cleaned: any = {};
  Object.keys(obj).forEach(key => {
    // Convert undefined to null, keep all other values including null
    cleaned[key] = obj[key] === undefined ? null : obj[key];
  });
  return cleaned;
};

export const useStudentManagementStore = create<StudentManagementStore>((set, get) => ({
  // Initial state
  students: [],
  loading: false,
  error: null,
  totalCount: 0,
  totalPages: 0,
  lastDoc: null,
  hasMore: true,
  currentPage: 1,
  perPage: 10,
  pageHistory: [],

  // Actions
  fetchStudents: async (filters = {}, page?: number, direction?: 'next' | 'prev' | 'first') => {
    try {
      set({ loading: true, error: null });
      
      const { currentPage, perPage } = get();
      
      // Determine target page  
      const targetPage = page || currentPage;

      // Always use Algolia for fetching students
      const response = await fetchWithProgress('/api/students/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: filters.search || '',
          email: filters.email,
          nickname: filters.nickname,
          phone_number: filters.phone_number,
            page: targetPage,
            perPage,
            filters: {
              verified: filters.verified,
              is_banned: filters.is_banned,
              deleted: filters.deleted,
              sign_in_method: filters.sign_in_method,
              country: (filters as any).country,
              nationality: (filters as any).nationality,
              gender: (filters as any).gender,
            },
          }),
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.error || 'Algolia search failed');

        const hits = (result.hits || []).map((h: any) => {
          const docLike = { id: h.id || h.objectID, data: () => h } as any;
          return convertFirestoreDocToStudent(docLike);
        });

        const studentsWithCounts = await getStudentsRequestCounts(hits);

        set({
          students: studentsWithCounts,
          totalCount: result.total || 0,
          totalPages: result.totalPages || 0,
          hasMore: targetPage < (result.totalPages || 1),
          currentPage: targetPage,
          // Reset Firestore cursor state while in Algolia mode
          lastDoc: null,
          pageHistory: [],
          loading: false,
        });
      
    } catch (error: any) {
      console.error('Error fetching students:', error);
      set({ 
        error: error.message || 'Failed to fetch students',
        loading: false 
      });
    }
  },

  createStudent: async (studentData) => {
    try {
      set({ loading: true, error: null });
      
      // Call API route to create student with bcrypt password hashing
      const response = await fetchWithProgress('/api/students/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(studentData),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to create student');
      }

      console.log('✅ Student created successfully:', result.studentId);
      
      set({ loading: false });
    } catch (error: any) {
      console.error('Error creating student:', error);
      set({ 
        error: error.message || 'Failed to create student',
        loading: false 
      });
      throw error;
    }
  },

  updateStudent: async (studentId, studentData) => {
    try {
      console.log('Updating student:', studentId);
      set({ loading: true, error: null });
      console.log('Student data:', studentData);
      
      // Call API route to update student with bcrypt password hashing
      const response = await fetchWithProgress('/api/students/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId,
          ...studentData,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to update student');
      }

      console.log('✅ Student updated successfully:', studentId);
      
      set({ loading: false });
    } catch (error: any) {
      console.error('Error updating student:', error);
      set({ 
        error: error.message || 'Failed to update student',
        loading: false 
      });
      throw error;
    }
  },

  deleteStudent: async (studentId) => {
    try {
      set({ loading: true, error: null });
      
      // Soft delete by setting deleted_at timestamp
      const studentRef = doc(db, 'students', studentId);
      await updateDoc(studentRef, {
        deleted_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });
      
      set({ loading: false });
    } catch (error: any) {
      console.error('Error deleting student:', error);
      set({ 
        error: error.message || 'Failed to delete student',
        loading: false 
      });
      throw error;
    }
  },

  toggleVerification: async (studentId, verified) => {
    try {
      console.log('Toggling student verification:', studentId, 'to:', verified);
      set({ loading: true, error: null });
      
      const studentRef = doc(db, 'students', studentId);
      await updateDoc(studentRef, {
        verified: verified ? '1' : '0',
        updated_at: serverTimestamp(),
      });
      
      console.log('✅ Student verification toggled successfully:', studentId, 'to:', verified ? 'verified' : 'unverified');
      
      set({ loading: false });
    } catch (error: any) {
      console.error('Error toggling student verification:', error);
      set({ 
        error: error.message || 'Failed to toggle student verification',
        loading: false 
      });
      throw error;
    }
  },

  getStudentById: async (studentId) => {
    try {
      const studentSnapshot = await getDocs(query(collection(db, 'students'), where('__name__', '==', studentId)));
      
      if (studentSnapshot.empty) {
        return null;
      }
      
      return convertFirestoreDocToStudent(studentSnapshot.docs[0]);
    } catch (error: any) {
      console.error('Error fetching student by ID:', error);
      return null;
    }
  },

  importStudents: async (students) => {
    try {
      set({ loading: true, error: null });
      
      const batch = students.map(async (student) => {
        const studentRef = doc(collection(db, 'students'));
        const cleanedStudent = cleanData({
          ...student,
          created_at: serverTimestamp(),
          updated_at: serverTimestamp(),
        });
        await setDoc(studentRef, cleanedStudent);
      });
      
      await Promise.all(batch);
      
      set({ loading: false });
    } catch (error: any) {
      console.error('Error importing students:', error);
      set({ 
        error: error.message || 'Failed to import students',
        loading: false 
      });
      throw error;
    }
  },

  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  resetPagination: () => set({ lastDoc: null, hasMore: true, currentPage: 1, pageHistory: [], totalPages: 0 }),
  setCurrentPage: (page) => set({ currentPage: page }),
  setPerPage: (perPage) => {
    set({ perPage, currentPage: 1 });
  },
}));
