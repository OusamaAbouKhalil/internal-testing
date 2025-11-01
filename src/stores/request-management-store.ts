import { create } from 'zustand';
import { 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  DocumentSnapshot,
  QueryDocumentSnapshot
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { 
  Request, 
  TutorOffer,
  CreateRequestData,
  UpdateRequestData,
  RequestFilters,
  PaginationParams
} from '@/types/request';
import { combineDateAndTime, dateToTimestamp } from '@/lib/date-utils';

interface RequestManagementStore {
  // State
  requests: Request[];
  tutorOffers: TutorOffer[];
  loading: boolean;
  error: string | null;
  selectedRequest: Request | null;
  
  // Pagination state
  currentPage: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  totalItems: number;
  lastVisibleDoc: QueryDocumentSnapshot | null;
  firstVisibleDoc: QueryDocumentSnapshot | null;
  pageCache: Map<number, { docs: QueryDocumentSnapshot[], requests: Request[] }>;

  // CRUD Actions
  fetchRequests: (filters?: RequestFilters, pagination?: PaginationParams) => Promise<void>;
  fetchNextPage: (filters?: RequestFilters) => Promise<void>;
  fetchPreviousPage: (filters?: RequestFilters) => Promise<void>;
  goToPage: (page: number, filters?: RequestFilters) => Promise<void>;
  setPageSize: (pageSize: number) => void;
  fetchRequestById: (requestId: string) => Promise<Request | null>;
  createRequest: (requestData: CreateRequestData) => Promise<void>;
  updateRequest: (requestId: string, requestData: UpdateRequestData) => Promise<void>;
  deleteRequest: (requestId: string) => Promise<void>;
  
  // Request Management Actions
  changeRequestStatus: (requestId: string, status: string, reason?: string) => Promise<void>;
  assignTutor: (requestId: string, tutorId: string, tutorPrice: string) => Promise<void>;
  assignStudent: (requestId: string, studentId: string, studentPrice: string) => Promise<void>;
  setTutorPrice: (requestId: string, tutorPrice: string) => Promise<void>;
  setStudentPrice: (requestId: string, studentPrice: string) => Promise<void>;
  cancelRequest: (requestId: string, reason: string) => Promise<void>;
  completeRequest: (requestId: string, feedback?: string) => Promise<void>;
  
  // File Management Actions
  updateRequestFiles: (requestId: string, fileLinks: string[], fileNames: string[]) => Promise<void>;
  
  // Payment Management Actions
  updateTutorPaid: (requestId: string, tutorPaid: string) => Promise<void>;
  
  // Tutor Offers Management
  fetchTutorOffers: (requestId: string) => Promise<void>;
  createTutorOffer: (requestId: string, tutorId: string, price: string) => Promise<void>;
  updateTutorOffer: (offerId: string, requestId: string, status: string, price?: string) => Promise<void>;
  deleteTutorOffer: (offerId: string, requestId: string) => Promise<void>;
  acceptTutorOffer: (offerId: string, requestId: string) => Promise<void>;
  rejectTutorOffer: (offerId: string, requestId: string, reason?: string) => Promise<void>;
  
  // Utility
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSelectedRequest: (request: Request | null) => void;
  clearRequests: () => void;
}

// Helper function to convert Firestore timestamps
const convertTimestamps = (items: any[]) => {
  return items.map(item => ({
    ...item,
    created_at: item.created_at?.toDate?.()?.toISOString() || item.created_at,
    updated_at: item.updated_at?.toDate?.()?.toISOString() || item.updated_at,
    date: item.date?.toDate?.()?.toISOString() || item.date,
    deadline: item.deadline?.toDate?.()?.toISOString() || item.deadline,
    deleted_at: item.deleted_at?.toDate?.()?.toISOString() || item.deleted_at,
  }));
};

export const useRequestManagementStore = create<RequestManagementStore>((set, get) => ({
  // Initial state
  requests: [],
  tutorOffers: [],
  loading: false,
  error: null,
  selectedRequest: null,
  
  // Pagination initial state
  currentPage: 1,
  pageSize: 20,
  hasNextPage: false,
  hasPreviousPage: false,
  totalItems: 0,
  lastVisibleDoc: null,
  firstVisibleDoc: null,
  pageCache: new Map(),

  // Fetch requests with optional filters and pagination
  fetchRequests: async (filters = {}, pagination) => {
    try {
      const state = get();
      set({ loading: true, error: null });
      
      // Reset to page 1 if not specified
      const targetPage = pagination?.page || 1;
      const currentPageSize = pagination?.pageSize || state.pageSize;
      
      // Check cache first for the exact page
      const cachedPage = state.pageCache.get(targetPage);
      if (cachedPage && !pagination?.lastVisible) {
        set({
          requests: cachedPage.requests,
          currentPage: targetPage,
          hasPreviousPage: targetPage > 1,
          loading: false,
          firstVisibleDoc: cachedPage.docs[0] || null,
          lastVisibleDoc: cachedPage.docs[cachedPage.docs.length - 1] || null
        });
        return;
      }
      
      // Build base query
      let q = query(
        collection(db, 'requests'), 
        orderBy('created_at', 'desc'),
        limit(currentPageSize + 1) // Fetch one extra to check if there's a next page
      );
      
      // Apply Firestore filters
      if (filters.assistance_type) {
        q = query(q, where('assistance_type', '==', filters.assistance_type));
      }
      
      if (filters.request_status) {
        q = query(q, where('request_status', '==', filters.request_status));
      }
      
      if (filters.country) {
        q = query(q, where('country', '==', filters.country));
      }
      
      if (filters.language) {
        q = query(q, where('language', '==', filters.language));
      }
      
      if (filters.subject) {
        q = query(q, where('subject', '==', filters.subject));
      }
      
      if (filters.student_id) {
        q = query(q, where('student_id', '==', filters.student_id));
      }
      
      if (filters.tutor_id) {
        q = query(q, where('tutor_id', '==', filters.tutor_id));
      }
      
      // Add pagination cursor if provided
      if (pagination?.lastVisible) {
        q = query(q, startAfter(pagination.lastVisible));
      }
      
      const querySnapshot = await getDocs(q);
      const docs = querySnapshot.docs;
      
      // Check if there's a next page
      const hasMore = docs.length > currentPageSize;
      const requestDocs = hasMore ? docs.slice(0, currentPageSize) : docs;
      
      const requests = requestDocs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Apply client-side filters
      let filteredRequests = convertTimestamps(requests);
      
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        filteredRequests = filteredRequests.filter((request: Request) => 
          request.label?.toLowerCase().includes(searchTerm) ||
          request.description?.toLowerCase().includes(searchTerm) ||
          request.subject?.toLowerCase().includes(searchTerm) ||
          request.language?.toLowerCase().includes(searchTerm)
        );
      }
      
      if (filters.date_from) {
        filteredRequests = filteredRequests.filter((request: Request) => {
          const requestDate = typeof request.date === 'string' 
            ? new Date(request.date) 
            : (request.date as any)?.toDate?.() || new Date();
          return requestDate >= new Date(filters.date_from!);
        });
      }
      
      if (filters.date_to) {
        filteredRequests = filteredRequests.filter((request: Request) => {
          const requestDate = typeof request.date === 'string' 
            ? new Date(request.date) 
            : (request.date as any)?.toDate?.() || new Date();
          return requestDate <= new Date(filters.date_to!);
        });
      }
      
      // Cache the page
      const newCache = new Map(state.pageCache);
      newCache.set(targetPage, { docs: requestDocs, requests: filteredRequests });
      
      set({ 
        requests: filteredRequests,
        currentPage: targetPage,
        pageSize: currentPageSize,
        hasNextPage: hasMore,
        hasPreviousPage: targetPage > 1,
        firstVisibleDoc: requestDocs[0] || null,
        lastVisibleDoc: requestDocs[requestDocs.length - 1] || null,
        pageCache: newCache,
        loading: false 
      });
    } catch (error: any) {
      console.error('Error fetching requests:', error);
      set({ 
        error: error.message || 'Failed to fetch requests',
        loading: false 
      });
    }
  },
  
  // Fetch next page
  fetchNextPage: async (filters = {}) => {
    const state = get();
    if (!state.hasNextPage || state.loading) return;
    
    await get().fetchRequests(filters, {
      page: state.currentPage + 1,
      pageSize: state.pageSize,
      lastVisible: state.lastVisibleDoc
    });
  },
  
  // Fetch previous page
  fetchPreviousPage: async (filters = {}) => {
    const state = get();
    if (!state.hasPreviousPage || state.loading) return;
    
    const prevPage = state.currentPage - 1;
    await get().fetchRequests(filters, {
      page: prevPage,
      pageSize: state.pageSize
    });
  },
  
  // Go to specific page
  goToPage: async (page: number, filters = {}) => {
    const state = get();
    if (page < 1 || state.loading) return;
    
    await get().fetchRequests(filters, {
      page,
      pageSize: state.pageSize
    });
  },
  
  // Set page size
  setPageSize: (pageSize: number) => {
    set({ 
      pageSize,
      pageCache: new Map() // Clear cache when page size changes
    });
  },

  // Fetch single request by ID
  fetchRequestById: async (requestId: string) => {
    try {
      set({ loading: true, error: null });
      
      const requestDoc = await getDoc(doc(db, 'requests', requestId));
      
      if (requestDoc.exists()) {
        const request = {
          id: requestDoc.id,
          ...requestDoc.data()
        };
        
        const convertedRequest = convertTimestamps([request])[0];
        set({ selectedRequest: convertedRequest, loading: false });
        return convertedRequest;
      } else {
        set({ selectedRequest: null, loading: false });
        return null;
      }
    } catch (error: any) {
      console.error('Error fetching request:', error);
      set({ 
        error: error.message || 'Failed to fetch request',
        loading: false 
      });
      return null;
    }
  },

  // Create new request
  createRequest: async (requestData) => {
    try {
      set({ loading: true, error: null });
      
      const now = new Date().toISOString();
      
      // Combine date and time for deadline if both are provided
      let deadlineTimestamp = requestData.deadline;
      if (requestData.date && requestData.time) {
        try {
          const combinedDeadline = combineDateAndTime(requestData.date, requestData.time);
          deadlineTimestamp = dateToTimestamp(combinedDeadline);
        } catch (error) {
          console.warn('Failed to combine date and time, using original deadline:', error);
        }
      }
      
      const newRequest = {
        ...requestData,
        accepted: '0',
        answer_files: null,
        answer_text: null,
        cancel_reason: null,
        cancelled: '0',
        cms_attributes: '0',
        comments: null,
        completed: '0',
        created_at: now,
        deadline: deadlineTimestamp,
        deleted_at: null,
        description_type: null,
        discount: '0',
        exam_type: '',
        feedback: null,
        field: null,
        field_id: null,
        file_links: JSON.stringify(requestData.file_links || []),
        file_names: JSON.stringify(requestData.file_names || []),
        grade: null,
        is_paid: '0',
        issue_reported: '0',
        locked: '0',
        meeting_id: null,
        meeting_password: null,
        meeting_record_url: null,
        min_price: null,
        notes: '',
        omt_info: null,
        paid: '0',
        promo_id: '0',
        rating: null,
        receipt_submitted: '0',
        request_status: 'NEW',
        saved_by: null,
        state: null,
        student_meeting_url: null,
        student_nickname: null,
        tutor_accepted: '0',
        tutor_id: '',
        tutor_meeting_url: null,
        tutor_nickname: null,
        tutor_price: '0',
        updated_at: now,
        version: '1',
        zoom_information: null,
        zoom_user_id: null
      };
      
      await addDoc(collection(db, 'requests'), newRequest);
      
      set({ loading: false, pageCache: new Map() }); // Clear cache
      get().fetchRequests(); // Refresh the list
    } catch (error: any) {
      console.error('Error creating request:', error);
      set({ 
        error: error.message || 'Failed to create request',
        loading: false 
      });
      throw error;
    }
  },

  // Update request
  updateRequest: async (requestId, requestData) => {
    try {
      set({ loading: true, error: null });
      
      const updateData: any = {
        ...requestData,
        updated_at: new Date().toISOString()
      };
      
      // Handle file arrays - convert to JSON strings for storage
      if (requestData.file_links) {
        (updateData as any).file_links = Array.isArray(requestData.file_links) 
          ? JSON.stringify(requestData.file_links)
          : requestData.file_links;
      }
      
      if (requestData.file_names) {
        (updateData as any).file_names = Array.isArray(requestData.file_names)
          ? JSON.stringify(requestData.file_names)
          : requestData.file_names;
      }
      
      await updateDoc(doc(db, 'requests', requestId), updateData);
      
      set({ loading: false, pageCache: new Map() }); // Clear cache
      get().fetchRequests(); // Refresh the list
    } catch (error: any) {
      console.error('Error updating request:', error);
      set({ 
        error: error.message || 'Failed to update request',
        loading: false 
      });
      throw error;
    }
  },

  // Delete request
  deleteRequest: async (requestId) => {
    try {
      set({ loading: true, error: null });
      
      await deleteDoc(doc(db, 'requests', requestId));
      
      set({ loading: false, pageCache: new Map() }); // Clear cache
      get().fetchRequests(); // Refresh the list
    } catch (error: any) {
      console.error('Error deleting request:', error);
      set({ 
        error: error.message || 'Failed to delete request',
        loading: false 
      });
      throw error;
    }
  },

  // Request Management Actions
  changeRequestStatus: async (requestId, status, reason) => {
    try {
      set({ loading: true, error: null });
      
      const updateData: any = {
        request_status: status,
        updated_at: new Date().toISOString()
      };
      
      if (reason) {
        updateData.cancel_reason = reason;
      }
      
      // Handle specific status changes
      if (status === 'CANCELLED') {
        updateData.cancelled = '1';
        updateData.cancel_reason = reason || 'Cancelled by admin';
      } else if (status === 'COMPLETED') {
        updateData.completed = '1';
        updateData.accepted = '1';
      } else if (status === 'ONGOING') {
        updateData.accepted = '1';
      }
      
      await updateDoc(doc(db, 'requests', requestId), updateData);
      
      set({ loading: false, pageCache: new Map() }); // Clear cache
      get().fetchRequests(); // Refresh the list
    } catch (error: any) {
      console.error('Error changing request status:', error);
      set({ 
        error: error.message || 'Failed to change request status',
        loading: false 
      });
      throw error;
    }
  },

  assignTutor: async (requestId, tutorId, tutorPrice) => {
    try {
      set({ loading: true, error: null });
      
      const updateData = {
        tutor_id: tutorId,
        tutor_price: tutorPrice,
        tutor_accepted: '1',
        request_status: 'ONGOING',
        updated_at: new Date().toISOString()
      };
      
      await updateDoc(doc(db, 'requests', requestId), updateData);
      
      set({ loading: false, pageCache: new Map() }); // Clear cache
      get().fetchRequests(); // Refresh the list
    } catch (error: any) {
      console.error('Error assigning tutor:', error);
      set({ 
        error: error.message || 'Failed to assign tutor',
        loading: false 
      });
      throw error;
    }
  },

  assignStudent: async (requestId, studentId, studentPrice) => {
    try {
      set({ loading: true, error: null });
      
      const updateData = {
        student_id: studentId,
        student_price: studentPrice,
        updated_at: new Date().toISOString()
      };
      
      await updateDoc(doc(db, 'requests', requestId), updateData);
      
      set({ loading: false, pageCache: new Map() }); // Clear cache
      get().fetchRequests(); // Refresh the list
    } catch (error: any) {
      console.error('Error assigning student:', error);
      set({ 
        error: error.message || 'Failed to assign student',
        loading: false 
      });
      throw error;
    }
  },

  setTutorPrice: async (requestId, tutorPrice) => {
    try {
      set({ loading: true, error: null });
      console.log("tutorPrice: " + tutorPrice);
      const updateData = {
        tutor_price: tutorPrice ? tutorPrice : '',
        updated_at: new Date().toISOString()
      };
      
      await updateDoc(doc(db, 'requests', requestId), updateData);
      
      set({ loading: false, pageCache: new Map() }); // Clear cache
      get().fetchRequests(); // Refresh the list
    } catch (error: any) {
      console.error('Error setting tutor price:', error);
      set({ 
        error: error.message || 'Failed to set tutor price',
        loading: false 
      });
      throw error;
    }
  },

  setStudentPrice: async (requestId, studentPrice) => {
    try {
      set({ loading: true, error: null });
      
      const updateData = {
        student_price: studentPrice,
        updated_at: new Date().toISOString()
      };
      
      await updateDoc(doc(db, 'requests', requestId), updateData);
      
      set({ loading: false, pageCache: new Map() }); // Clear cache
      get().fetchRequests(); // Refresh the list
    } catch (error: any) {
      console.error('Error setting student price:', error);
      set({ 
        error: error.message || 'Failed to set student price',
        loading: false 
      });
      throw error;
    }
  },

  cancelRequest: async (requestId, reason) => {
    try {
      set({ loading: true, error: null });
      
      const updateData = {
        request_status: 'CANCELLED',
        cancelled: '1',
        cancel_reason: reason,
        updated_at: new Date().toISOString()
      };
      
      await updateDoc(doc(db, 'requests', requestId), updateData);
      
      set({ loading: false, pageCache: new Map() }); // Clear cache
      get().fetchRequests(); // Refresh the list
    } catch (error: any) {
      console.error('Error cancelling request:', error);
      set({ 
        error: error.message || 'Failed to cancel request',
        loading: false 
      });
      throw error;
    }
  },

  completeRequest: async (requestId, feedback) => {
    try {
      set({ loading: true, error: null });
      
      const updateData: any = {
        request_status: 'COMPLETED',
        completed: '1',
        accepted: '1',
        updated_at: new Date().toISOString()
      };
      
      if (feedback) {
        updateData.feedback = feedback;
      }
      
      await updateDoc(doc(db, 'requests', requestId), updateData);
      
      set({ loading: false, pageCache: new Map() }); // Clear cache
      get().fetchRequests(); // Refresh the list
    } catch (error: any) {
      console.error('Error completing request:', error);
      set({ 
        error: error.message || 'Failed to complete request',
        loading: false 
      });
      throw error;
    }
  },

  // File Management Actions
  updateRequestFiles: async (requestId, fileLinks, fileNames) => {
    try {
      set({ loading: true, error: null });
      
      await updateDoc(doc(db, 'requests', requestId), {
        file_links: JSON.stringify(fileLinks),
        file_names: JSON.stringify(fileNames),
        updated_at: new Date().toISOString()
      });
      
      set({ loading: false, pageCache: new Map() }); // Clear cache
      get().fetchRequests(); // Refresh the list
    } catch (error: any) {
      console.error('Error updating request files:', error);
      set({ 
        error: error.message || 'Failed to update files',
        loading: false 
      });
      throw error;
    }
  },

  // Payment Management Actions
  updateTutorPaid: async (requestId, tutorPaid) => {
    try {
      set({ loading: true, error: null });
      
      const response = await fetch(`/api/requests/${requestId}/tutor-paid`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tutor_paid: tutorPaid
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update tutor payment status');
      }

      const data = await response.json();
      
      if (data.success) {
        set({ loading: false, pageCache: new Map() }); // Clear cache
        get().fetchRequests(); // Refresh the list
      } else {
        throw new Error(data.error || 'Failed to update tutor payment status');
      }
    } catch (error: any) {
      console.error('Error updating tutor payment status:', error);
      set({ 
        error: error.message || 'Failed to update tutor payment status',
        loading: false 
      });
      throw error;
    }
  },

  // Tutor Offers Management
  fetchTutorOffers: async (requestId) => {
    try {
      set({ loading: true, error: null });
      
      const q = query(
        collection(db, 'requests', requestId, 'tutor_offers'),
        orderBy('created_at', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const offers = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      set({ tutorOffers: convertTimestamps(offers), loading: false });
    } catch (error: any) {
      console.error('Error fetching tutor offers:', error);
      set({ 
        error: error.message || 'Failed to fetch tutor offers',
        loading: false 
      });
    }
  },

  createTutorOffer: async (requestId, tutorId, price) => {
    try {
      set({ loading: true, error: null });
      
      const now = new Date().toISOString();
      
      const newOffer = {
        tutor_id: tutorId,
        price: price,
        request_id: requestId,
        status: 'pending',
        cancel_reason: null,
        created_at: now,
        updated_at: now
      };
      
      await addDoc(collection(db, 'requests', requestId, 'tutor_offers'), newOffer);
      
      set({ loading: false });
      get().fetchTutorOffers(requestId); // Refresh offers
    } catch (error: any) {
      console.error('Error creating tutor offer:', error);
      set({ 
        error: error.message || 'Failed to create tutor offer',
        loading: false 
      });
      throw error;
    }
  },

  updateTutorOffer: async (offerId, requestId, status, price) => {
    try {
      set({ loading: true, error: null });
      
      const updateData: any = {
        status: status,
        updated_at: new Date().toISOString()
      };
      
      if (price) {
        updateData.price = price;
      }
      
      await updateDoc(doc(db, 'requests', requestId, 'tutor_offers', offerId), updateData);
      
      set({ loading: false });
      get().fetchTutorOffers(requestId); // Refresh offers
    } catch (error: any) {
      console.error('Error updating tutor offer:', error);
      set({ 
        error: error.message || 'Failed to update tutor offer',
        loading: false 
      });
      throw error;
    }
  },

  deleteTutorOffer: async (offerId, requestId) => {
    try {
      set({ loading: true, error: null });
      
      await deleteDoc(doc(db, 'requests', requestId, 'tutor_offers', offerId));
      
      set({ loading: false });
      get().fetchTutorOffers(requestId); // Refresh offers
    } catch (error: any) {
      console.error('Error deleting tutor offer:', error);
      set({ 
        error: error.message || 'Failed to delete tutor offer',
        loading: false 
      });
      throw error;
    }
  },

  acceptTutorOffer: async (offerId, requestId) => {
    try {
      set({ loading: true, error: null });
      
      // Update the offer status
      await updateDoc(doc(db, 'requests', requestId, 'tutor_offers', offerId), {
        status: 'accepted',
        updated_at: new Date().toISOString()
      });
      
      // Get the offer to get tutor info
      const offerDoc = await getDoc(doc(db, 'requests', requestId, 'tutor_offers', offerId));
      const offerData = offerDoc.data();
      
      if (offerData) {
        // Update the request with tutor assignment
        await updateDoc(doc(db, 'requests', requestId), {
          tutor_id: offerData.tutor_id,
          tutor_price: offerData.price,
          tutor_accepted: '1',
          request_status: 'ONGOING',
          updated_at: new Date().toISOString()
        });
      }
      
      set({ loading: false });
      get().fetchTutorOffers(requestId); // Refresh offers
      get().fetchRequests(); // Refresh requests
    } catch (error: any) {
      console.error('Error accepting tutor offer:', error);
      set({ 
        error: error.message || 'Failed to accept tutor offer',
        loading: false 
      });
      throw error;
    }
  },

  rejectTutorOffer: async (offerId, requestId, reason) => {
    try {
      set({ loading: true, error: null });
      
      const updateData: any = {
        status: 'rejected',
        updated_at: new Date().toISOString()
      };
      
      if (reason) {
        updateData.cancel_reason = reason;
      }
      
      await updateDoc(doc(db, 'requests', requestId, 'tutor_offers', offerId), updateData);
      
      set({ loading: false });
      get().fetchTutorOffers(requestId); // Refresh offers
    } catch (error: any) {
      console.error('Error rejecting tutor offer:', error);
      set({ 
        error: error.message || 'Failed to reject tutor offer',
        loading: false 
      });
      throw error;
    }
  },

  // Utility actions
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setSelectedRequest: (request) => set({ selectedRequest: request }),
  clearRequests: () => set({ requests: [], tutorOffers: [], selectedRequest: null }),
}));
