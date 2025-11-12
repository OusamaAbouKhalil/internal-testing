import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/config/firebase-admin';
import { RequestFilters } from '@/types/request';
import { combineDateAndTime } from '@/lib/date-utils';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse filters from query parameters
    const filters: RequestFilters = {};
    
    if (searchParams.get('search')) filters.search = searchParams.get('search')!;
    if (searchParams.get('assistance_type')) filters.assistance_type = searchParams.get('assistance_type')!;
    if (searchParams.get('request_status')) filters.request_status = searchParams.get('request_status')!;
    if (searchParams.get('country')) filters.country = searchParams.get('country')!;
    if (searchParams.get('language')) filters.language = searchParams.get('language')!;
    if (searchParams.get('subject')) filters.subject = searchParams.get('subject')!;
    if (searchParams.get('date_from')) filters.date_from = searchParams.get('date_from')!;
    if (searchParams.get('date_to')) filters.date_to = searchParams.get('date_to')!;
    if (searchParams.get('student_id')) filters.student_id = searchParams.get('student_id')!;
    if (searchParams.get('tutor_id')) filters.tutor_id = searchParams.get('tutor_id')!;

    // Parse pagination parameters
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const lastVisibleId = searchParams.get('lastVisibleId');

    let query = adminDb.collection('requests').orderBy('created_at', 'desc');

    // Apply Firestore filters
    if (filters.assistance_type) {
      query = query.where('assistance_type', '==', filters.assistance_type);
    }
    if (filters.request_status) {
      query = query.where('request_status', '==', filters.request_status.toLowerCase());
    }
    if (filters.country) {
      query = query.where('country', '==', filters.country);
    }
    if (filters.language) {
      query = query.where('language', '==', filters.language);
    }
    if (filters.subject) {
      query = query.where('subject', '==', filters.subject);
    }
    if (filters.student_id) {
      query = query.where('student_id', '==', filters.student_id);
    }
    if (filters.tutor_id) {
      query = query.where('tutor_id', '==', filters.tutor_id);
    }

    // Apply pagination cursor if provided
    if (lastVisibleId) {
      const lastDoc = await adminDb.collection('requests').doc(lastVisibleId).get();
      if (lastDoc.exists) {
        query = query.startAfter(lastDoc);
      }
    }

    // Fetch one extra to check if there's a next page
    query = query.limit(pageSize + 1);

    const snapshot = await query.get();
    const docs = snapshot.docs;
    
    // Check if there's more data
    const hasNextPage = docs.length > pageSize;
    const requestDocs = hasNextPage ? docs.slice(0, pageSize) : docs;

    const requests = requestDocs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    }));

    // Apply client-side filters
    let filteredRequests = requests;

    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filteredRequests = filteredRequests.filter((request: any) => 
        request.label?.toLowerCase().includes(searchTerm) ||
        request.description?.toLowerCase().includes(searchTerm) ||
        request.subject?.toLowerCase().includes(searchTerm) ||
        request.language?.toLowerCase().includes(searchTerm)
      );
    }

    if (filters.date_from) {
      filteredRequests = filteredRequests.filter((request: any) => 
        new Date(request.date?.toDate?.() || request.date) >= new Date(filters.date_from!)
      );
    }

    if (filters.date_to) {
      filteredRequests = filteredRequests.filter((request: any) => 
        new Date(request.date?.toDate?.() || request.date) <= new Date(filters.date_to!)
      );
    }

    return NextResponse.json({ 
      requests: filteredRequests,
      pagination: {
        currentPage: page,
        pageSize: pageSize,
        hasNextPage: hasNextPage,
        hasPreviousPage: page > 1,
        lastVisibleId: requestDocs.length > 0 ? requestDocs[requestDocs.length - 1].id : null
      }
    });
  } catch (error: any) {
    console.error('Error fetching requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch requests' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const now = new Date();
    
    // Combine date and time for deadline if both are provided
    let deadlineTimestamp = body.deadline;
    if (body.date && body.time) {
      try {
        const combinedDeadline = combineDateAndTime(body.date, body.time);
        deadlineTimestamp = combinedDeadline;
      } catch (error) {
        console.warn('Failed to combine date and time, using original deadline:', error);
      }
    }
    
    const newRequest = {
      ...body,
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
      file_links: JSON.stringify(body.file_links || []),
      file_names: JSON.stringify(body.file_names || []),
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
      request_status: 'new',
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

    const docRef = await adminDb.collection('requests').add(newRequest);
    
    return NextResponse.json({ 
      id: docRef.id,
      message: 'Request created successfully' 
    });
  } catch (error: any) {
    console.error('Error creating request:', error);
    return NextResponse.json(
      { error: 'Failed to create request' },
      { status: 500 }
    );
  }
}
