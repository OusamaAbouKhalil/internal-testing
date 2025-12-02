/**
 * Backfill script — update all Firestore tutors in Algolia (v5)
 * Adds or updates only existing records with normalized fields.
 *
 * Run:
 *   npx ts-node functions/backfill-update-tutors.ts
 */

import * as admin from "firebase-admin";
import * as path from "path";

// 🧩 Initialize Firebase Admin with service account
admin.initializeApp({
  credential: admin.credential.cert(
    path.join(__dirname, "serviceAccountKey.json")
  ),
});

(async () => {
  try {
    const db = admin.firestore();
    const snapshot = await db.collection("tutors").get();
    console.log(`📚 Found ${snapshot.docs.length} tutors in Firestore`);
    if (snapshot.docs.length === 0) {
      console.log("⚠️ No tutors found to backfill.");
      process.exit(0);
    }
    const BATCH_SIZE = 500; // Firestore batch write limit
    let batch = db.batch();
    let batchCount = 0;
    let totalUpdated = 0;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const updatedFields: any = {
        has_apple_id: data.apple_id ? 1 : -1,
        has_facebook_id: data.facebook_id ? 1 : -1,
        has_google_id: data.google_id ? 1 : -1,
        is_deleted: data.deleted_at ? 1 : -1,
      };

      const docRef = db.collection("tutors").doc(doc.id);
      batch.update(docRef, updatedFields);
      batchCount++;
      totalUpdated++;

      // Firestore batches have a limit of 500 operations
      if (batchCount >= BATCH_SIZE) {
        await batch.commit();
        batch = db.batch();
        batchCount = 0;
        console.log(`✅ Updated ${totalUpdated} tutors...`);
      }
    }

    // Commit any remaining operations
    if (batchCount > 0) {
      await batch.commit();
      console.log(`✅ Updated ${totalUpdated} tutors...`);
    }

    console.log(`🎉 Backfill update completed successfully! Total updated: ${totalUpdated}`);
    process.exit(0);
  } catch (err: any) {
    console.error("❌ Backfill failed:", err.message);
    process.exit(1);
  }
})();
