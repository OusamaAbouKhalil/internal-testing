import { NextResponse } from 'next/server';
import { getAlgoliaClient, getRequestsIndexName } from '@/config/algolia';
import { adminDb } from '@/config/firebase-admin';

type SearchBody = {
  query?: string;
  page?: number; // 1-based
  perPage?: number;
  filters?: {
    assistance_type?: string;
    request_status?: string;
    country?: string;
    language?: string;
    subject?: string;
    student_id?: string;
    tutor_id?: string;
    max_rating?: string; // Maximum rating (e.g., "2" for 2 stars or less)
  };
};

export async function POST(request: Request) {
  const body = (await request.json()) as SearchBody;
  const page = Math.max(1, body.page || 1);
  const perPage = Math.max(1, Math.min(100, body.perPage || 20));
  
  try {

    const combinedQuery = body.query || '';

    const filtersParts: string[] = [];
    const f = body.filters || {};

    if (f.assistance_type) filtersParts.push(`assistance_type:"${f.assistance_type}"`);
    
    // If rating filter is applied, ensure status is completed
    if (f.max_rating !== undefined && f.max_rating !== '') {
      // Filter by rating (less than or equal to max_rating)
      // Rating is stored as string/numeric, Algolia supports numeric filters
      const maxRating = parseFloat(f.max_rating);
      if (!isNaN(maxRating)) {
        // Filter for ratings <= maxRating (e.g., "2" means 1 or 2 stars)
        filtersParts.push(`rating <= ${maxRating}`);
      }
      // Automatically filter for completed requests when rating is filtered
      filtersParts.push(`(request_status:"completed" OR request_status:"tutor_completed")`);
    } else if (f.request_status) {
      filtersParts.push(`request_status:"${f.request_status}"`);
    }
    
    if (f.country) filtersParts.push(`country:"${f.country}"`);
    if (f.language) filtersParts.push(`language:"${f.language}"`);
    if (f.subject) filtersParts.push(`subject:"${f.subject}"`);
    if (f.student_id) filtersParts.push(`student_id:"${f.student_id}"`);
    if (f.tutor_id) filtersParts.push(`tutor_id:"${f.tutor_id}"`);
    console.log("filtersParts" ,filtersParts)
    const filtersString = filtersParts.join(' AND ');

    const client = getAlgoliaClient();
    const indexName = getRequestsIndexName();
    
    console.log('[Requests Search] Request params:', {
      query: combinedQuery,
      page: page - 1,
      perPage,
      filters: filtersString || 'none',
      indexName,
    });
    
    const res = await client.searchSingleIndex({
      indexName,
      searchParams: {
        query: combinedQuery,
        page: page - 1, // Algolia is 0-based
        hitsPerPage: perPage,
        filters: filtersString || undefined,
        attributesToRetrieve: [
          'objectID',
          'id',
          'label',
          'description',
          'assistance_type',
          'request_status',
          'subject',
          'sub_subject',
          'language',
          'country',
          'student_price',
          'tutor_price',
          'min_price',
          'deadline',
          'timezone',
          'created_at',
          'updated_at',
          'student_id',
          'tutor_id',
          'date',
          'time',
          'duration',
          'exam_type',
          'feedback',
          'file_links',
          'file_names',
          'invoice_amount',
          'invoice_created_at',
          'invoice_id',
          'invoice_updated_at',
          'is_paid',
          'issue_reported',
          'locked',
          'notes',
          'paid',
          'rating',
          'receipt_submitted',
          'saved_by',
          'state',
          'version',
          'zoom_information',
          'zoom_user_id',
          'tutor_completed_at',
          'tutor_paid',
          'tutor_accepted',
          'tutor_meeting_url',
          'cancel_reason',
        ],
      },
    });

    // Sort by created_at desc for consistency
    const sortedHits = [...res.hits].sort((a: any, b: any) => {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return timeB - timeA;
    });

    console.log('[Requests Search] Response:', {
      hitsCount: sortedHits.length,
      total: res.nbHits,
      page: res.page !== undefined ? res.page + 1 : 1,
      totalPages: res.nbPages,
      firstHitId: (sortedHits[0] as any)?.id || sortedHits[0]?.objectID || 'none',
    });

    // Fallback to Firestore if Algolia index is empty
    if (res.nbHits === 0) {
      console.log('[Requests Search] Algolia index is empty, falling back to Firestore...');
      return await fallbackToFirestore(body, page, perPage);
    }

    return NextResponse.json({
      success: true,
      hits: sortedHits,
      total: res.nbHits,
      page: res.page !== undefined ? res.page + 1 : 1,
      totalPages: res.nbPages,
      perPage,
    });
  } catch (err: any) {
    console.error('Algolia requests search error:', err);
    // Fallback to Firestore on error
    console.log('[Requests Search] Algolia error, falling back to Firestore...');
    try {
      return await fallbackToFirestore(body, 1, body.perPage || 20);
    } catch (fallbackErr: any) {
      console.error('Firestore fallback error:', fallbackErr);
      return NextResponse.json({ success: false, error: err?.message || 'Search failed' }, { status: 500 });
    }
  }
}

// Fallback function to query Firestore directly
async function fallbackToFirestore(
  body: SearchBody,
  page: number,
  perPage: number
) {
  try {
    const f = body.filters || {};
    let query = adminDb.collection('requests').orderBy('created_at', 'desc');

    // Apply Firestore filters
    if (f.assistance_type) {
      query = query.where('assistance_type', '==', f.assistance_type);
    }
    if (f.request_status) {
      query = query.where('request_status', '==', f.request_status.toLowerCase());
    }
    if (f.country) {
      query = query.where('country', '==', f.country);
    }
    if (f.language) {
      query = query.where('language', '==', f.language);
    }
    if (f.subject) {
      query = query.where('subject', '==', f.subject);
    }
    if (f.student_id) {
      query = query.where('student_id', '==', f.student_id);
    }
    if (f.tutor_id) {
      query = query.where('tutor_id', '==', f.tutor_id);
    }

    // Calculate pagination - Firestore doesn't support offset, so we use startAfter
    // For page 1, no startAfter needed. For subsequent pages, we'd need the last doc from previous page
    // For simplicity, we'll fetch all and paginate in memory (not ideal for large datasets)
    // TODO: Implement proper cursor-based pagination
    query = query.limit(perPage + 1); // Fetch one extra to check for next page

    const snapshot = await query.get();
    const docs = snapshot.docs;
    const hasNextPage = docs.length > perPage;
    const requestDocs = hasNextPage ? docs.slice(0, perPage) : docs;

    let requests = requestDocs.map((doc: any) => {
      const data = doc.data();
      return {
        objectID: doc.id,
        id: doc.id,
        ...data,
        // Convert Firestore timestamps to ISO strings
        created_at: data.created_at?.toDate?.()?.toISOString() || data.created_at,
        updated_at: data.updated_at?.toDate?.()?.toISOString() || data.updated_at,
        date: data.date?.toDate?.()?.toISOString() || data.date,
        deadline: data.deadline?.toDate?.()?.toISOString() || data.deadline,
      };
    });

    // Apply text search if query is provided
    if (body.query) {
      const searchTerm = body.query.toLowerCase();
      requests = requests.filter((request: any) =>
        request.label?.toLowerCase().includes(searchTerm) ||
        request.description?.toLowerCase().includes(searchTerm) ||
        request.subject?.toLowerCase().includes(searchTerm) ||
        request.language?.toLowerCase().includes(searchTerm)
      );
    }

    // Apply rating filter if provided
    if (f.max_rating !== undefined && f.max_rating !== '') {
      const maxRating = parseFloat(f.max_rating);
      if (!isNaN(maxRating)) {
        requests = requests.filter((request: any) => {
          const rating = parseFloat(request.rating || '0');
          return rating <= maxRating && 
            (request.request_status === 'completed' || request.request_status === 'tutor_completed');
        });
      }
    }

    // Get total count (approximate for performance)
    const totalSnapshot = await adminDb.collection('requests').count().get();
    const total = totalSnapshot.data().count || requests.length;

    console.log('[Requests Search] Firestore fallback:', {
      hitsCount: requests.length,
      total,
      page,
      totalPages: Math.ceil(total / perPage),
    });

    return NextResponse.json({
      success: true,
      hits: requests,
      total,
      page,
      totalPages: Math.ceil(total / perPage),
      perPage,
    });
  } catch (err: any) {
    console.error('Firestore fallback error:', err);
    throw err;
  }
}


