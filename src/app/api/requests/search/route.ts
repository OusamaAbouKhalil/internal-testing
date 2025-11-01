import { NextResponse } from 'next/server';
import { getAlgoliaClient, getRequestsIndexName } from '@/config/algolia';

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
  };
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SearchBody;
    const page = Math.max(1, body.page || 1);
    const perPage = Math.max(1, Math.min(100, body.perPage || 20));

    const combinedQuery = body.query || '';

    const filtersParts: string[] = [];
    const f = body.filters || {};

    if (f.assistance_type) filtersParts.push(`assistance_type:"${f.assistance_type}"`);
    if (f.request_status) filtersParts.push(`request_status:"${f.request_status}"`);
    if (f.country) filtersParts.push(`country:"${f.country}"`);
    if (f.language) filtersParts.push(`language:"${f.language}"`);
    if (f.subject) filtersParts.push(`subject:"${f.subject}"`);
    if (f.student_id) filtersParts.push(`student_id:"${f.student_id}"`);
    if (f.tutor_id) filtersParts.push(`tutor_id:"${f.tutor_id}"`);

    const filtersString = filtersParts.join(' AND ');

    const client = getAlgoliaClient();
    const indexName = getRequestsIndexName();
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
        ],
      },
    });

    // Sort by created_at desc for consistency
    const sortedHits = [...res.hits].sort((a: any, b: any) => {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return timeB - timeA;
    });

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
    return NextResponse.json({ success: false, error: err?.message || 'Search failed' }, { status: 500 });
  }
}


