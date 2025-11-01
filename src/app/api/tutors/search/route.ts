import { NextResponse } from 'next/server';
import { getAlgoliaClient, getTutorsIndexName } from '@/config/algolia';

type SearchBody = {
  query?: string;
  email?: string;
  nickname?: string;
  phone?: string;
  whatsapp_phone?: string;
  page?: number; // 1-based
  perPage?: number;
  filters?: {
    verified?: boolean;
    cancelled?: boolean;
    deleted?: boolean;
    sign_in_method?: 'manual' | 'facebook' | 'google' | 'apple';
    country?: string;
    nationality?: string;
    gender?: string;
    has_requests?: boolean;
  };
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SearchBody;
    const page = Math.max(1, body.page || 1);
    const perPage = Math.max(1, Math.min(100, body.perPage || 10));

    // Combine all search queries (search, email, nickname, phone, whatsapp_phone) into one query
    const searchQueries: string[] = [];
    if (body.query) searchQueries.push(body.query);
    if (body.email) searchQueries.push(body.email);
    if (body.nickname) searchQueries.push(body.nickname);
    if (body.phone) searchQueries.push(body.phone);
    if (body.whatsapp_phone) searchQueries.push(body.whatsapp_phone);
    const combinedQuery = searchQueries.join(' ');

    const filtersParts: string[] = [];

    const f = body.filters || {};

    if (f.verified !== undefined) {
      filtersParts.push(`verified:"${f.verified ? '2' : '0'}"`);
      if(!f.verified) {
        filtersParts.push(`cancelled:"0"`);
        filtersParts.push(`is_deleted:"0"`);
      }
    }
    if (f.cancelled !== undefined) {
      filtersParts.push(`cancelled:"${f.cancelled ? '1' : '0'}"`);
    }
    if (f.deleted === true) {
      filtersParts.push(`cancelled:"0"`);
      filtersParts.push(`is_deleted:1`);
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
    const filtersString = filtersParts.join(' AND ');
    console.log('filtersString:', filtersString);
    
    const client = getAlgoliaClient();
    const indexName = getTutorsIndexName();
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
          'phone',
          'phone_country_code',
          'whatsapp_phone',
          'whatsapp_country_code',
          'created_at',
          'updated_at',
          'deleted_at',
          'verified',
          'cancelled',
          'facebook_id',
          'google_id',
          'apple_id',
          'nationality',
          'country',
          'city',
          'major',
          'languages',
          'subjects',
          'skills',
          'experience_years',
          'rating',
          'gender',
          'send_notifications',
          'bio',
          'profile_image',
          'degree',
          'university',
          'date_of_birth',
        ],
      },
    });

    // Sort hits by created_at descending (newest first) since Algolia ranking may not handle this
    const sortedHits = [...res.hits].sort((a: any, b: any) => {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return timeB - timeA; // Descending order
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
    console.error('Algolia search error:', err);
    return NextResponse.json({ success: false, error: err?.message || 'Search failed' }, { status: 500 });
  }
}
