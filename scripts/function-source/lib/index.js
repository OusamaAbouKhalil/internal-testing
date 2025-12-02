"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tutorsToAlgolia = exports.studentsToAlgolia = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();
/**
 * Set once from project root:
 * firebase functions:config:set \
 *   algolia.app_id="YOUR_APP_ID" \
 *   algolia.api_key="YOUR_ADMIN_API_KEY" \
 *   algolia.index_students="students"
 */
// v5 client (no initIndex)
// Ensure nullable fie
/**
 * Firestore → Algolia (v5) sync
 * Triggers on create/update/delete of students/{id}
 */
exports.studentsToAlgolia = functions.firestore
    .document("students/{id}")
    .onWrite(async (change, context) => {
    var _a;
    const after = change.after;
    if (!after.exists) {
        return;
    }
    const data = (_a = after.data()) !== null && _a !== void 0 ? _a : {};
    const updatedFields = {
        has_apple_id: data.apple_id ? 1 : -1,
        has_facebook_id: data.facebook_id ? 1 : -1,
        has_google_id: data.google_id ? 1 : -1,
        is_deleted: data.deleted_at ? 1 : -1,
    };
    await after.ref.update(updatedFields);
    console.log(`✅ Updated google_id, facebook_id, apple_id in Firestore for student ${context.params.id}`);
});
exports.tutorsToAlgolia = functions.firestore
    .document("tutors/{id}")
    .onWrite(async (change, context) => {
    var _a;
    const after = change.after;
    if (!after.exists) {
        return;
    }
    const data = (_a = after.data()) !== null && _a !== void 0 ? _a : {};
    let is_deleted;
    if (data.deleted_at !== null && data.deleted_at !== undefined) {
        is_deleted = 1;
    }
    else {
        is_deleted = -1;
    }
    await after.ref.update({ is_deleted });
    console.log(`✅ Updated is_deleted=${is_deleted} in Firestore for tutor ${context.params.id}`);
});
//# sourceMappingURL=index.js.map