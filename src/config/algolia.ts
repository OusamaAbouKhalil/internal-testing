// lib/algolia.ts
import { algoliasearch } from 'algoliasearch'; // ✅ v5 default export

const ALGOLIA_APP_ID = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID ?? '';
const ALGOLIA_ADMIN_API_KEY =
  process.env.ALGOLIA_ADMIN_API_KEY ?? process.env.NEXT_PUBLIC_ALGOLIA_API_KEY ?? '';
const ALGOLIA_STUDENTS_INDEX = process.env.NEXT_PUBLIC_ALGOLIA_STUDENTS_INDEX ?? 'students';
const ALGOLIA_TUTORS_INDEX = process.env.NEXT_PUBLIC_ALGOLIA_TUTORS_INDEX ?? 'tutors';
const ALGOLIA_REQUESTS_INDEX = process.env.NEXT_PUBLIC_ALGOLIA_REQUESTS_INDEX ?? 'requests';

/**
 * Creates an Algolia client (admin-safe, server-side only)
 */
export function getAlgoliaClient() {
  if (!ALGOLIA_APP_ID || !ALGOLIA_ADMIN_API_KEY) {
    throw new Error('Algolia credentials are missing (ALGOLIA_APP_ID / ALGOLIA_ADMIN_API_KEY).');
  }
  return algoliasearch(ALGOLIA_APP_ID, ALGOLIA_ADMIN_API_KEY);
}

/**
 * Returns the students index name
 */
export function getStudentsIndexName() {
  return ALGOLIA_STUDENTS_INDEX;
}

/**
 * Returns the tutors index name
 */
export function getTutorsIndexName() {
  return ALGOLIA_TUTORS_INDEX;
}

/**
 * Returns the requests index name
 */
export function getRequestsIndexName() {
  return ALGOLIA_REQUESTS_INDEX;
}