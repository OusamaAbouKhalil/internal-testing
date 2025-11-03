import { NextResponse } from 'next/server';
import { getAlgoliaClient, getStudentsIndexName } from '@/config/algolia';

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
  };
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SearchBody;
    const page = Math.max(1, body.page || 1);
    const perPage = Math.max(1, Math.min(100, body.perPage || 10));

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
        filtersParts.push(`is_deleted:0`);
    }
    if (f.is_banned !== undefined) {
    filtersParts.push(`is_banned:"${f.is_banned === '1' ? '1' : '0'}"`);
    }
    if (f.deleted === true) {
      filtersParts.push(`is_deleted:1`);
    }
    if (f.sign_in_method) {
      if (f.sign_in_method === 'manual') {
        filtersParts.push(`has_google_id=0 AND has_facebook_id=0 AND has_apple_id=0`);
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


