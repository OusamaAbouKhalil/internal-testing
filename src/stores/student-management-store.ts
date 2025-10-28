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
  lastDoc: any;
  hasMore: boolean;

  // Actions
  fetchStudents: (filters?: StudentFilters, loadMore?: boolean) => Promise<void>;
  createStudent: (studentData: CreateStudentData) => Promise<void>;
  updateStudent: (studentId: string, studentData: UpdateStudentData) => Promise<void>;
  deleteStudent: (studentId: string) => Promise<void>;
  toggleVerification: (studentId: string, verified: boolean) => Promise<void>;
  getStudentById: (studentId: string) => Promise<Student | null>;
  importStudents: (students: Student[]) => Promise<void>;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  resetPagination: () => void;
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
  lastDoc: null,
  hasMore: true,

  // Actions
  fetchStudents: async (filters = {}, loadMore = false) => {
    try {
      set({ loading: true, error: null });
      
      const studentsRef = collection(db, 'students');
      let students: Student[] = [];
      
      // Determine which field to use for range query (only one allowed per query)
      const hasEmailFilter = !!filters.email;
      const hasNicknameFilter = !!filters.nickname;
      const hasSearchFilter = !!filters.search;
      
      // Build base query with equality filters
      const buildBaseQuery = (baseRef: any, useRangeField?: 'email' | 'nickname', includeLimit = true) => {
        let constraints: any[] = [];
        
        // Add equality filters
        if (filters.verified !== undefined) {
          constraints.push(where('verified', '==', filters.verified === '1' ? '1' : '0'));
        }

        if (filters.is_banned !== undefined) {
          constraints.push(where('is_banned', '==', filters.is_banned === '1' ? '1' : '0'));
        }

        // Apply sign_in_method filter
        if (filters.sign_in_method) {
          if(filters.sign_in_method == 'google') {
            constraints.push(where('google_id', '!=', null));
          } else if(filters.sign_in_method == 'facebook') {
            constraints.push(where('facebook_id', '!=', null));
          } else if(filters.sign_in_method == 'apple') {
            constraints.push(where('apple_id', '!=', null));
          } else {
            constraints.push(where('google_id', '==', null));
            constraints.push(where('facebook_id', '==', null));
            constraints.push(where('apple_id', '==', null));
          }
        }

        if (filters.deleted !== undefined && filters.deleted === true) {
          constraints.push(where('deleted_at', '!=', null));
        }

        if (filters.phone_number !== undefined) {
          constraints.push(where('phone_number', '>=', filters.phone_number));
          constraints.push(where('phone_number', '<=', filters.phone_number + '\uf8ff'));
        }
        
        // Add orderBy - required for queries that use where clauses
        if (constraints.length > 0 || !useRangeField) {
          constraints.push(orderBy('created_at', 'desc'));
        }
        
        // Add range query for email or nickname (not both - Firestore limitation)
        if (useRangeField === 'email' && hasEmailFilter) {
          const emailLower = filters.email!.toLowerCase();
          constraints.push(where('email', '>=', emailLower));
          constraints.push(where('email', '<=', emailLower + '\uf8ff'));
        } 
        
        // Add limit only if requested
        if (includeLimit) {
          constraints.push(limit(hasSearchFilter ? 100 : 20));
        }
        
        return query(baseRef, ...constraints);
      };
      
      // Decide query strategy based on active filters
      let q;
      let countQuery;
      let rangeField: 'email' | 'nickname' | undefined;
      
      if (hasEmailFilter && !hasNicknameFilter) {
        // Email filter takes priority
        rangeField = 'email';
        q = buildBaseQuery(studentsRef, 'email');
        countQuery = buildBaseQuery(studentsRef, 'email', false);
      } else if (hasNicknameFilter && !hasEmailFilter) {
        // Nickname filter takes priority
        rangeField = 'nickname';
        q = buildBaseQuery(studentsRef, 'nickname');
        countQuery = buildBaseQuery(studentsRef, 'nickname', false);
      } else if (hasEmailFilter && hasNicknameFilter) {
        // Both filters active - prioritize email in Firebase, filter nickname client-side
        rangeField = 'email';
        q = buildBaseQuery(studentsRef, 'email');
        countQuery = buildBaseQuery(studentsRef, 'email', false);
      } else {
        // No email/nickname filters
        rangeField = undefined;
        q = buildBaseQuery(studentsRef);
        countQuery = buildBaseQuery(studentsRef, undefined, false);
      }
      
      // Apply pagination
      if (loadMore && get().lastDoc) {
        q = query(q, startAfter(get().lastDoc));
      }
      
      // Fetch students and total count in parallel (only on first load, not on loadMore)
      let totalCountValue = get().totalCount;
      
      const [studentsSnapshot, countSnapshot] = await Promise.all([
        getDocs(q),
        loadMore ? Promise.resolve(null) : getCountFromServer(countQuery)
      ]);
      
      if (countSnapshot) {
        totalCountValue = countSnapshot.data().count;
      }
      
      let allStudents = studentsSnapshot.docs.map(convertFirestoreDocToStudent);
      
      // Client-side filtering for nickname when both email and nickname filters are active
      if (hasEmailFilter && hasNicknameFilter) {
        const nicknameTerm = filters.nickname!.toLowerCase();
        allStudents = allStudents.filter(student => 
          student.nickname?.toLowerCase().includes(nicknameTerm)
        );
      }
      
      // Apply general search filter across all fields
      if (hasSearchFilter) {
        const searchTerm = filters.search!.toLowerCase();
        allStudents = allStudents.filter(student => {
          const searchableFields = [
            student.full_name?.toLowerCase(),
            student.phone_number?.toLowerCase(),
            student.student_level?.toLowerCase(),
            student.majorId?.toString(),
            student.otherMajor?.toLowerCase(),
            student.country?.toLowerCase(),
            student.city?.toLowerCase(),
            student.nationality?.toLowerCase(),
            student.gender?.toLowerCase(),
            student.request_count?.toString(),
            student.sign_in_method?.toLowerCase(),
            student.spend_amount?.toString()
          ].filter(Boolean);
          
          return searchableFields.some(field => field?.includes(searchTerm));
        });
      }
      
      students = allStudents;
      
      // Get request counts for filtered students
      students = await getStudentsRequestCounts(students);
      
      
      
      // Sort by created_at if not already sorted by range query
      if (!hasEmailFilter && !hasNicknameFilter) {
        students = students.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      }
      
      // Calculate total count before pagination
      // For searches and client-side filtered queries, the count is the filtered result count
      // For Firebase-only queries, use the Firebase count
      const hasClientSideFilters = hasSearchFilter || 
                                    (hasEmailFilter && hasNicknameFilter) ||
                                    filters.has_requests !== undefined ||
                                    filters.sign_in_method !== undefined;
      
      if (!loadMore) {
        if (hasClientSideFilters) {
          // For client-side filtered queries, count the filtered results
          totalCountValue = students.length;
        }
        // Otherwise, use the Firebase count we already fetched
      }
      
      // Apply pagination for search results
      if (hasSearchFilter || hasEmailFilter || hasNicknameFilter) {
        const startIndex = loadMore ? get().students.length : 0;
        const endIndex = startIndex + 20;
        students = students.slice(startIndex, endIndex);
      }
      
      // Update state for all results
      set(state => ({
        students: loadMore ? [...state.students, ...students] : students,
        lastDoc: hasSearchFilter || hasEmailFilter || hasNicknameFilter ? null : studentsSnapshot.docs[studentsSnapshot.docs.length - 1] || null,
        hasMore: students.length === 20,
        totalCount: loadMore ? state.totalCount : totalCountValue,
        loading: false,
      }));
      
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
      get().fetchStudents(); // Refresh students list
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
      get().fetchStudents(); // Refresh students list
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
      get().fetchStudents(); // Refresh students list
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
      get().fetchStudents();
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
      get().fetchStudents(); // Refresh students list
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
  resetPagination: () => set({ lastDoc: null, hasMore: true }),
}));
