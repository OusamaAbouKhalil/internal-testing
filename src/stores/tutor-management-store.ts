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
  getCountFromServer
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Tutor, CreateTutorData, UpdateTutorData, TutorFilters } from '@/types/tutor';
import { fetchWithProgress } from '@/lib/api-progress';

interface TutorManagementStore {
  // State
  tutors: Tutor[];
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
  fetchTutors: (filters?: TutorFilters, page?: number, direction?: 'next' | 'prev' | 'first') => Promise<void>;
  createTutor: (tutorData: CreateTutorData) => Promise<void>;
  updateTutor: (tutorId: string, tutorData: UpdateTutorData) => Promise<void>;
  deleteTutor: (tutorId: string) => Promise<void>;
  restoreTutor: (tutorId: string) => Promise<void>;
  toggleVerification: (tutorId: string, verified: boolean) => Promise<void>;
  getTutorById: (tutorId: string) => Promise<Tutor | null>;
  importTutors: (tutors: Tutor[]) => Promise<void>;
  toggleNotifications: (tutorId: string, enabled: boolean) => Promise<void>;
  toggleCancelled: (tutorId: string, cancelled: boolean) => Promise<void>;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  resetPagination: () => void;
  setCurrentPage: (page: number) => void;
  setPerPage: (perPage: number) => void;
}

// Helper function to determine sign-in method based on social IDs
const determineSignInMethod = (tutor: any): 'manual' | 'facebook' | 'google' | 'apple' => {
  if (tutor.facebook_id) return 'facebook';
  if (tutor.google_id) return 'google';
  if (tutor.apple_id) return 'apple';
  return 'manual';
};

// Helper function to determine ALL sign-in methods based on social IDs
const determineSignInMethods = (tutor: any): ('manual' | 'facebook' | 'google' | 'apple')[] => {
  const methods: ('manual' | 'facebook' | 'google' | 'apple')[] = [];
  
  // Check for multiple social IDs
  if (tutor.facebook_id) methods.push('facebook');
  if (tutor.google_id) methods.push('google');
  if (tutor.apple_id) methods.push('apple');
  
  // If no social IDs, user signed in manually
  if (methods.length === 0) {
    methods.push('manual');
  }
  
  return methods;
};

// Helper function to convert Firestore document to Tutor
const convertFirestoreDocToTutor = (doc: any): Tutor => {
  const data = doc.data();
  const tutor = {
    id: doc.id,
    ...data,
    created_at: data.created_at?.toDate?.()?.toISOString() || data.created_at,
    updated_at: data.updated_at?.toDate?.()?.toISOString() || data.updated_at,
    deleted_at: data.deleted_at?.toDate?.()?.toISOString() || data.deleted_at,
  } as Tutor;
  
  // Determine and add sign-in method (backwards compatibility)
  return tutor;
};

// Helper function to get request count for a tutor
const getTutorRequestCount = async (tutorId: string): Promise<number> => {
  try {
    const requestsRef = collection(db, 'requests');
    const q = query(requestsRef, where('tutor_id', '==', tutorId));
    const snapshot = await getCountFromServer(q);
    return snapshot.data().count;
  } catch (error) {
    console.error(`Error getting request count for tutor ${tutorId}:`, error);
    return 0;
  }
};

// Helper function to get request counts for multiple tutors
const getTutorsRequestCounts = async (tutors: Tutor[]): Promise<Tutor[]> => {
  try {
    const requestCountPromises = tutors.map(async (tutor) => {
      const requestCount = await getTutorRequestCount(tutor.id);
      return { ...tutor, request_count: requestCount };
    });
    
    return await Promise.all(requestCountPromises);
  } catch (error) {
    console.error('Error getting request counts for tutors:', error);
    return tutors; // Return tutors without request counts if there's an error
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

export const useTutorManagementStore = create<TutorManagementStore>((set, get) => ({
  // Initial state
  tutors: [],
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
  fetchTutors: async (filters = {}, page?: number, direction?: 'next' | 'prev' | 'first') => {
    try {
      set({ loading: true, error: null });
      
      const { currentPage, perPage } = get();
      
      // Determine target page  
      const targetPage = page || currentPage;

      // Always use Algolia for fetching tutors
      const response = await fetchWithProgress('/api/tutors/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: filters.search || '',
          email: filters.email,
          nickname: filters.nickname,
          phone: filters.phone,
          whatsapp_phone: filters.whatsapp_phone,
          page: targetPage,
          perPage,
          filters: {
            verified: filters.verified,
            cancelled: filters.cancelled,
            deleted: filters.deleted,
            country: (filters as any).country,
            nationality: (filters as any).nationality,
            gender: (filters as any).gender,
            has_requests: filters.has_requests,
          },
        }),
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Algolia search failed');

      const hits = (result.hits || []).map((h: any) => {
        const docLike = { id: h.id || h.objectID, data: () => h } as any;
        return convertFirestoreDocToTutor(docLike);
      });

      const tutorsWithCounts = await getTutorsRequestCounts(hits);

      set({
        tutors: tutorsWithCounts,
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
      console.error('Error fetching tutors:', error);
      set({ 
        error: error.message || 'Failed to fetch tutors',
        loading: false 
      });
    }
  },

  createTutor: async (tutorData) => {
    try {
      set({ loading: true, error: null });
      
      // Call API route to create tutor with bcrypt password hashing
      const response = await fetchWithProgress('/api/tutors/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tutorData),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to create tutor');
      }

      console.log('✅ Tutor created successfully:', result.tutorId);
      
      set({ loading: false });
    } catch (error: any) {
      console.error('Error creating tutor:', error);
      set({ 
        error: error.message || 'Failed to create tutor',
        loading: false 
      });
      throw error;
    }
  },

  updateTutor: async (tutorId, tutorData) => {
    try {
      console.log('Updating tutor:', tutorId);
      set({ loading: true, error: null });
      console.log('Tutor data:', tutorData);
      
      // Call API route to update tutor with bcrypt password hashing
      const response = await fetchWithProgress('/api/tutors/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tutorId,
          ...tutorData,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to update tutor');
      }

      console.log('✅ Tutor updated successfully:', tutorId);
      
      set({ loading: false });
    } catch (error: any) {
      console.error('Error updating tutor:', error);
      set({ 
        error: error.message || 'Failed to update tutor',
        loading: false 
      });
      throw error;
    }
  },

  deleteTutor: async (tutorId) => {
    try {
      set({ loading: true, error: null });
      
      // Soft delete by setting deleted_at timestamp
      const tutorRef = doc(db, 'tutors', tutorId);
      await updateDoc(tutorRef, {
        deleted_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });
      
      set({ loading: false });
    } catch (error: any) {
      console.error('Error deleting tutor:', error);
      set({ 
        error: error.message || 'Failed to delete tutor',
        loading: false 
      });
      throw error;
    }
  },

  restoreTutor: async (tutorId) => {
    try {
      set({ loading: true, error: null });
      
      // Call API route to restore tutor with conflict checking
      const response = await fetchWithProgress('/api/tutors/restore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tutorId }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to restore tutor');
      }

      console.log('✅ Tutor restored successfully:', tutorId);
      
      set({ loading: false });
    } catch (error: any) {
      console.error('Error restoring tutor:', error);
      set({ 
        error: error.message || 'Failed to restore tutor',
        loading: false 
      });
      throw error;
    }
  },

  toggleVerification: async (tutorId, verified) => {
    try {
      console.log('Toggling tutor verification:', tutorId, 'to:', verified);
      set({ loading: true, error: null });
      
      const tutorRef = doc(db, 'tutors', tutorId);
      await updateDoc(tutorRef, {
        verified: verified ? '2' : '0',
        updated_at: serverTimestamp(),
      });
      
      console.log('✅ Tutor verification toggled successfully:', tutorId, 'to:', verified ? 'verified' : 'unverified');
      
      set({ loading: false });
      get().fetchTutors();
    } catch (error: any) {
      console.error('Error toggling tutor verification:', error);
      set({ 
        error: error.message || 'Failed to toggle tutor verification',
        loading: false 
      });
      throw error;
    }
  },

  toggleNotifications: async (tutorId, enabled) => {
    try {
      const tutorRef = doc(db, 'tutors', tutorId);
      await updateDoc(tutorRef, {
        send_notifications: enabled ? '1' : '0',
        updated_at: serverTimestamp(),
      });
      
      // Update local state
      set(state => ({
        tutors: state.tutors.map(tutor =>
          tutor.id === tutorId ? { ...tutor, send_notifications: enabled ? '1' : '0' } : tutor
        ),
      }));
    } catch (error: any) {
      console.error('Error toggling notifications:', error);
      set({ error: error.message || 'Failed to toggle notifications' });
      throw error;
    }
  },

  toggleCancelled: async (tutorId, cancelled) => {
    try {
      const tutorRef = doc(db, 'tutors', tutorId);
      await updateDoc(tutorRef, {
        cancelled: cancelled ? '1' : '0',
        updated_at: serverTimestamp(),
      });
      
      // Update local state
      set(state => ({
        tutors: state.tutors.map(tutor =>
          tutor.id === tutorId ? { ...tutor, cancelled: cancelled ? '1' : '0' } : tutor
        ),
      }));
    } catch (error: any) {
      console.error('Error toggling cancelled status:', error);
      set({ error: error.message || 'Failed to toggle cancelled status' });
      throw error;
    }
  },

  getTutorById: async (tutorId) => {
    try {
      const tutorSnapshot = await getDocs(query(collection(db, 'tutors'), where('__name__', '==', tutorId)));
      
      if (tutorSnapshot.empty) {
        return null;
      }
      
      return convertFirestoreDocToTutor(tutorSnapshot.docs[0]);
    } catch (error: any) {
      console.error('Error fetching tutor by ID:', error);
      return null;
    }
  },

  importTutors: async (tutors) => {
    try {
      set({ loading: true, error: null });
      
      const batch = tutors.map(async (tutor) => {
        const tutorRef = doc(collection(db, 'tutors'));
        const cleanedTutor = cleanData({
          ...tutor,
          created_at: serverTimestamp(),
          updated_at: serverTimestamp(),
        });
        await setDoc(tutorRef, cleanedTutor);
      });
      
      await Promise.all(batch);
      
      set({ loading: false });
    } catch (error: any) {
      console.error('Error importing tutors:', error);
      set({ 
        error: error.message || 'Failed to import tutors',
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
