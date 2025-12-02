"use strict";
var _a, _b, _c, _d;
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStudentsIndexName = exports.getAlgoliaClient = void 0;
// functions/src/lib/algolia.ts
const algoliasearch_1 = require("algoliasearch"); // ✅ Algolia v5 ESM import
const ALGOLIA_APP_ID = (_a = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID) !== null && _a !== void 0 ? _a : '';
const ALGOLIA_ADMIN_API_KEY = (_c = (_b = process.env.ALGOLIA_ADMIN_API_KEY) !== null && _b !== void 0 ? _b : process.env.NEXT_PUBLIC_ALGOLIA_API_KEY) !== null && _c !== void 0 ? _c : '';
const ALGOLIA_STUDENTS_INDEX = (_d = process.env.NEXT_PUBLIC_ALGOLIA_STUDENTS_INDEX) !== null && _d !== void 0 ? _d : 'students';
/**
 * Creates an Algolia client (admin-safe, server-side only)
 */
function getAlgoliaClient() {
    if (!ALGOLIA_APP_ID || !ALGOLIA_ADMIN_API_KEY) {
        throw new Error('Algolia credentials are missing (ALGOLIA_APP_ID / ALGOLIA_ADMIN_API_KEY).');
    }
    return (0, algoliasearch_1.algoliasearch)(ALGOLIA_APP_ID, ALGOLIA_ADMIN_API_KEY);
}
exports.getAlgoliaClient = getAlgoliaClient;
/**
 * Returns the students index name
 */
function getStudentsIndexName() {
    return ALGOLIA_STUDENTS_INDEX;
}
exports.getStudentsIndexName = getStudentsIndexName;
//# sourceMappingURL=algolia.js.map