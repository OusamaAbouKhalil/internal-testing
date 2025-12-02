import { NextResponse } from 'next/server';
import { getAlgoliaClient, getStudentsIndexName } from '@/config/algolia';
import { enrichStudentsWithOtpPhone } from '@/lib/otp-phone-lookup';
import { adminDb } from '@/config/firebase-admin';

type SearchBody = {
  query?: string;
  email?: string;
  nickname?: string;
  phone_number?: string;
  page?: number; // 1-based
  perPage?: number;
  filters?: {
    verified?: string;
    is_banned?: string;
    deleted?: boolean;
    sign_in_method?: 'manual' | 'facebook' | 'google' | 'apple';
    country?: string;
    nationality?: string;
    gender?: string;
    created_at_from?: string; // Filter by created_at from date (ISO string or YYYY-MM-DD)
    created_at_to?: string; // Filter by created_at to date (ISO string or YYYY-MM-DD)
  };
};

export async function POST(request: Request) {
  const body = (await request.json()) as SearchBody;
  const page = Math.max(1, body.page || 1);
  const perPage = Math.max(1, Math.min(100, body.perPage || 10));
  
  try {

    // Combine all search queries (search, email, nickname, phone_number) into one query
    const searchQueries: string[] = [];
    if (body.query) searchQueries.push(body.query);
    if (body.email) searchQueries.push(body.email);
    if (body.nickname) searchQueries.push(body.nickname);
    if (body.phone_number) searchQueries.push(body.phone_number);
    const combinedQuery = searchQueries.join(' ');

    const filtersParts: string[] = [];

    const f = body.filters || {};

    if (f.verified !== undefined) {
        filtersParts.push(`verified:"${f.verified === '1' ? '1' : '0'}"`);
        filtersParts.push(`is_deleted:-1`);
    }
    if (f.is_banned !== undefined) {
    filtersParts.push(`is_banned:"${f.is_banned === '1' ? '1' : '0'}"`);
    }
    if (f.deleted === true) {
      filtersParts.push(`is_deleted:1`);
    }
    
    if (f.sign_in_method) {
      if (f.sign_in_method === 'manual') {
        filtersParts.push(`has_google_id=-1 AND has_facebook_id=-1 AND has_apple_id=-1`);
      } else if (f.sign_in_method === 'google') {
        filtersParts.push(`has_google_id=1`);
      } else if (f.sign_in_method === 'facebook') {
        filtersParts.push(`has_facebook_id=1`);
      } else if (f.sign_in_method === 'apple') {
        filtersParts.push(`has_apple_id=1`);
      }
    }
    if (f.country) {
      filtersParts.push(`country:"${f.country}"`);
    }
    if (f.nationality) {
      filtersParts.push(`nationality:"${f.nationality}"`);
    }
    if (f.gender) {
      filtersParts.push(`gender:"${f.gender}"`);
    }
    
    // Filter by created_at date range (from/to dates)
    if (f.created_at_from || f.created_at_to) {
      let fromTimestamp: number | null = null;
      let toTimestamp: number | null = null;
      
      if (f.created_at_from) {
        const fromDate = new Date(f.created_at_from);
        fromDate.setHours(0, 0, 0, 0);
        fromTimestamp = fromDate.getTime();
      }
      
      if (f.created_at_to) {
        const toDate = new Date(f.created_at_to);
        toDate.setHours(23, 59, 59, 999);
        toTimestamp = toDate.getTime();
      }
      
      // Build the date range filter
      if (fromTimestamp !== null && toTimestamp !== null) {
        filtersParts.push(`created_at >= ${fromTimestamp} AND created_at <= ${toTimestamp}`);
      } else if (fromTimestamp !== null) {
        filtersParts.push(`created_at >= ${fromTimestamp}`);
      } else if (toTimestamp !== null) {
        filtersParts.push(`created_at <= ${toTimestamp}`);
      }
    }
    
    const filtersString = filtersParts.join(' AND ');
    console.log('filtersString:', filtersString);
    const client = getAlgoliaClient();
    const indexName = getStudentsIndexName();
    const res = await client.searchSingleIndex({
        indexName,
        searchParams: {
          query: combinedQuery || '',
          page: page - 1, // Algolia pages are 0-based
          hitsPerPage: perPage,
          filters: filtersString || undefined,
          attributesToRetrieve: [
            'objectID',
            'id',
            'full_name',
            'nickname',
            'email',
            'country_code',
            'phone_number',
            'created_at',
            'updated_at',
            'deleted_at',
            'verified',
            'is_banned',
            'facebook_id',
            'google_id',
            'apple_id',
            'student_level',
            'nationality',
            'country',
            'city',
            'majorId',
            'otherMajor',
            'languages',
            'rating',
            'spend_amount',
            'gender',
            'send_notifications',
          ],
        },
      });

    // Sort hits by created_at descending (newest first) since Algolia ranking may not handle this
    const sortedHits = [...res.hits].sort((a: any, b: any) => {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return timeB - timeA; // Descending order
    });

    // Enrich students with phone numbers from OTP verifications if missing
    const enrichedHits = await enrichStudentsWithOtpPhone(sortedHits);

    // Fallback to Firestore if Algolia index is empty
    if (res.nbHits === 0) {
      console.log('[Students Search] Algolia index is empty, falling back to Firestore...');
      return await fallbackToFirestore(body, page, perPage);
    }

    return NextResponse.json({
      success: true,
      hits: enrichedHits,
      total: res.nbHits,
      page: res.page !== undefined ? res.page + 1 : 1,
      totalPages: res.nbPages,
      perPage,
    });
  } catch (err: any) {
    console.error('Algolia search error:', err);
    // Fallback to Firestore on error
    console.log('[Students Search] Algolia error, falling back to Firestore...');
    try {
      return await fallbackToFirestore(body, page, perPage);
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
    let query = adminDb.collection('students').orderBy('created_at', 'desc');

    // Apply Firestore filters
    if (f.verified !== undefined) {
      query = query.where('verified', '==', f.verified === '1' ? '1' : '0');
    }
    if (f.is_banned !== undefined) {
      query = query.where('is_banned', '==', f.is_banned === '1' ? '1' : '0');
    }
    if (f.deleted === true) {
      query = query.where('deleted_at', '!=', null);
    } else if (f.deleted === false) {
      query = query.where('deleted_at', '==', null);
    }
    if (f.country) {
      query = query.where('country', '==', f.country);
    }
    if (f.nationality) {
      query = query.where('nationality', '==', f.nationality);
    }
    if (f.gender) {
      query = query.where('gender', '==', f.gender);
    }

    // Note: sign_in_method filter will be applied client-side after fetching
    // because Firestore doesn't support multiple where clauses on different fields without composite indexes

    query = query.limit(perPage + 1);

    const snapshot = await query.get();
    const docs = snapshot.docs;
    const hasNextPage = docs.length > perPage;
    const studentDocs = hasNextPage ? docs.slice(0, perPage) : docs;

    let students = studentDocs.map((doc: any) => {
      const data = doc.data();
      return {
        objectID: doc.id,
        id: doc.id,
        ...data,
        // Convert Firestore timestamps to ISO strings
        created_at: data.created_at?.toDate?.()?.toISOString() || data.created_at,
        updated_at: data.updated_at?.toDate?.()?.toISOString() || data.updated_at,
        deleted_at: data.deleted_at?.toDate?.()?.toISOString() || data.deleted_at,
      };
    });

    // Apply text search if query is provided
    if (body.query || body.email || body.nickname || body.phone_number) {
      const searchTerms = [
        body.query,
        body.email,
        body.nickname,
        body.phone_number,
      ].filter(Boolean).map(term => term!.toLowerCase());

      students = students.filter((student: any) => {
        const fullName = (student.full_name || '').toLowerCase();
        const email = (student.email || '').toLowerCase();
        const nickname = (student.nickname || '').toLowerCase();
        const phone = (student.phone_number || '').toLowerCase();

        return searchTerms.some(term =>
          fullName.includes(term) ||
          email.includes(term) ||
          nickname.includes(term) ||
          phone.includes(term)
        );
      });
    }

    // Apply sign_in_method filter (client-side)
    if (f.sign_in_method) {
      students = students.filter((student: any) => {
        if (f.sign_in_method === 'manual') {
          return !student.google_id && !student.facebook_id && !student.apple_id;
        } else if (f.sign_in_method === 'google') {
          return !!student.google_id;
        } else if (f.sign_in_method === 'facebook') {
          return !!student.facebook_id;
        } else if (f.sign_in_method === 'apple') {
          return !!student.apple_id;
        }
        return true;
      });
    }

    // Apply date range filter
    if (f.created_at_from || f.created_at_to) {
      students = students.filter((student: any) => {
        const createdAt = student.created_at ? new Date(student.created_at).getTime() : 0;
        if (f.created_at_from) {
          const fromDate = new Date(f.created_at_from);
          fromDate.setHours(0, 0, 0, 0);
          if (createdAt < fromDate.getTime()) return false;
        }
        if (f.created_at_to) {
          const toDate = new Date(f.created_at_to);
          toDate.setHours(23, 59, 59, 999);
          if (createdAt > toDate.getTime()) return false;
        }
        return true;
      });
    }

    // Get total count
    const totalSnapshot = await adminDb.collection('students').count().get();
    const total = totalSnapshot.data().count || students.length;

    // Enrich with phone numbers
    const enrichedStudents = await enrichStudentsWithOtpPhone(students);

    console.log('[Students Search] Firestore fallback:', {
      hitsCount: enrichedStudents.length,
      total,
      page,
      totalPages: Math.ceil(total / perPage),
    });

    return NextResponse.json({
      success: true,
      hits: enrichedStudents,
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


