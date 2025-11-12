export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/config/firebase-admin';

/**
 * API Route for dashboard reports
 * GET /api/reports/dashboard
 *
 * NOTE: Now all queries require deleted_at to be null (not soft-deleted).
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());

    // Calculate date ranges
    const thisYearStart = new Date(year, 0, 1);
    const thisYearEnd = new Date(year, 11, 31, 23, 59, 59);
    const lastYearStart = new Date(year - 1, 0, 1);
    const lastYearEnd = new Date(year - 1, 11, 31, 23, 59, 59);

    // Helper to filter docs with deleted_at == null
    function filterNotDeleted(docs: FirebaseFirestore.QueryDocumentSnapshot[]): FirebaseFirestore.QueryDocumentSnapshot[] {
      return docs.filter((doc) => {
        const data = doc.data();
        // Accept both undefined and explicitly null as not deleted.
        return data.deleted_at === undefined || data.deleted_at === null;
      });
    }

    // --- 1. Requests queries ---
    // Get all completed requests with no deleted_at (we'll filter by date in memory)
    const allCompletedRequestsSnapshot = await adminDb
      .collection('requests')
      .where('request_status', 'in', ['completed', 'tutor_completed'])
      .get();
    const validCompletedRequestDocs = filterNotDeleted(allCompletedRequestsSnapshot.docs);

    // Filter by date in memory
    const thisYearRequests = validCompletedRequestDocs.filter((doc) => {
      const data = doc.data();
      const createdAt = data.created_at;
      if (!createdAt) return false;
      let date: Date;
      if (createdAt._seconds) {
        date = new Date(createdAt._seconds * 1000);
      } else if (createdAt.toDate) {
        date = createdAt.toDate();
      } else {
        date = new Date(createdAt);
      }
      return date >= thisYearStart && date <= thisYearEnd;
    });

    const lastYearRequests = validCompletedRequestDocs.filter((doc) => {
      const data = doc.data();
      const createdAt = data.created_at;
      if (!createdAt) return false;
      let date: Date;
      if (createdAt._seconds) {
        date = new Date(createdAt._seconds * 1000);
      } else if (createdAt.toDate) {
        date = createdAt.toDate();
      } else {
        date = new Date(createdAt);
      }
      return date >= lastYearStart && date <= lastYearEnd;
    });

    // Calculate profits
    let thisYearProfit = 0;
    let lastYearProfit = 0;

    thisYearRequests.forEach((doc) => {
      const data = doc.data();
      const studentPrice = parseFloat(data.student_price || '0');
      const tutorPrice = parseFloat(data.tutor_price || '0');
      thisYearProfit += studentPrice - tutorPrice;
    });

    lastYearRequests.forEach((doc) => {
      const data = doc.data();
      const studentPrice = parseFloat(data.student_price || '0');
      const tutorPrice = parseFloat(data.tutor_price || '0');
      lastYearProfit += studentPrice - tutorPrice;
    });

    // Use the same completed requests for top tutors
    const allCompletedRequests = { docs: validCompletedRequestDocs };

    // --- 2. Top tutors ---
    const tutorStats: Record<string, {
      tutorId: string;
      tutorName: string;
      completedCount: number;
      totalProfit: number;
      requestTypes: Record<string, number>;
      requests: any[];
    }> = {};

    for (const doc of allCompletedRequests.docs) {
      const data = doc.data();
      if (!data.tutor_id) continue;
      const tutorId = data.tutor_id;
      if (!tutorStats[tutorId]) {
        // Fetch tutor name (skip if tutor is deleted)
        try {
          const tutorDoc = await adminDb.collection('tutors').doc(tutorId).get();
          const tutorData = tutorDoc.exists ? tutorDoc.data() : null;
          if (tutorData && (tutorData.deleted_at === undefined || tutorData.deleted_at === null)) {
            tutorStats[tutorId] = {
              tutorId,
              tutorName: tutorData.full_name || 'Unknown',
              completedCount: 0,
              totalProfit: 0,
              requestTypes: {},
              requests: [],
            };
          } else {
            tutorStats[tutorId] = {
              tutorId,
              tutorName: 'Unknown',
              completedCount: 0,
              totalProfit: 0,
              requestTypes: {},
              requests: [],
            };
          }
        } catch {
          tutorStats[tutorId] = {
            tutorId,
            tutorName: 'Unknown',
            completedCount: 0,
            totalProfit: 0,
            requestTypes: {},
            requests: [],
          };
        }
      }
      tutorStats[tutorId].completedCount++;
      const studentPrice = parseFloat(data.student_price || '0');
      const tutorPrice = parseFloat(data.tutor_price || '0');
      tutorStats[tutorId].totalProfit += studentPrice - tutorPrice;
      const requestType = data.assistance_type || 'unknown';
      tutorStats[tutorId].requestTypes[requestType] = (tutorStats[tutorId].requestTypes[requestType] || 0) + 1;
      tutorStats[tutorId].requests.push({
        id: doc.id,
        ...data
      });
    }

    const topTutors = Object.values(tutorStats)
      .sort((a, b) => b.completedCount - a.completedCount)
      .slice(0, 10)
      .map(tutor => ({
        tutorId: tutor.tutorId,
        tutorName: tutor.tutorName,
        completedCount: tutor.completedCount,
        totalProfit: tutor.totalProfit,
        requestTypes: tutor.requestTypes,
        requests: tutor.requests.slice(0, 5) // Top 5 requests for details
      }));

    // --- 3. Top students ---
    const studentStats: Record<string, {
      studentId: string;
      studentName: string;
      requestCount: number;
      requests: any[];
    }> = {};

    // Get all non-deleted requests for all student statistics
    const allRequestsSnapshot = await adminDb.collection('requests').get();
    const validAllRequestDocs = filterNotDeleted(allRequestsSnapshot.docs);

    for (const doc of validAllRequestDocs) {
      const data = doc.data();
      if (!data.student_id) continue;
      const studentId = data.student_id;
      if (!studentStats[studentId]) {
        // Fetch student name, skip deleted
        try {
          const studentDoc = await adminDb.collection('students').doc(studentId).get();
          const studentData = studentDoc.exists ? studentDoc.data() : null;
          if (studentData && (studentData.deleted_at === undefined || studentData.deleted_at === null)) {
            studentStats[studentId] = {
              studentId,
              studentName: studentData.full_name || 'Unknown',
              requestCount: 0,
              requests: []
            };
          } else {
            studentStats[studentId] = {
              studentId,
              studentName: 'Unknown',
              requestCount: 0,
              requests: []
            };
          }
        } catch {
          studentStats[studentId] = {
            studentId,
            studentName: 'Unknown',
            requestCount: 0,
            requests: []
          };
        }
      }
      studentStats[studentId].requestCount++;
      studentStats[studentId].requests.push({
        id: doc.id,
        label: data.label,
        assistance_type: data.assistance_type,
        created_at: data.created_at,
        request_status: data.request_status
      });
    }

    const topStudents = Object.values(studentStats)
      .sort((a, b) => b.requestCount - a.requestCount)
      .slice(0, 10)
      .map(student => ({
        studentId: student.studentId,
        studentName: student.studentName,
        requestCount: student.requestCount,
        requests: student.requests.slice(0, 5) // Recent 5 requests
      }));

    // --- 4. Visitors - unchanged stub ---
    const visitors = {
      today: 0,
      thisWeek: 0,
      thisMonth: 0,
      total: 0
    };

    // Parse Firestore date utility (unchanged)
    const parseFirestoreDate = (timestamp: any): Date => {
      if (!timestamp) return new Date(0);
      if (timestamp._seconds) {
        return new Date(timestamp._seconds * 1000);
      } else if (timestamp.toDate) {
        return timestamp.toDate();
      } else {
        return new Date(timestamp);
      }
    };

    // Calculate date ranges for daily/monthly
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    // --- 5. All students (no deleted) ---
    const allStudentsSnapshot = await adminDb.collection('students').get();
    const validStudentDocs = filterNotDeleted(allStudentsSnapshot.docs);

    // Filter students by registration date
    let dailyNewStudents = 0;
    let monthlyNewStudents = 0;
    let lastMonthNewStudents = 0;

    validStudentDocs.forEach((doc) => {
      const data = doc.data();
      const createdAt = parseFirestoreDate(data.created_at);
      if (createdAt >= todayStart && createdAt <= todayEnd) {
        dailyNewStudents++;
      }
      if (createdAt >= thisMonthStart && createdAt <= thisMonthEnd) {
        monthlyNewStudents++;
      }
      if (createdAt >= lastMonthStart && createdAt <= lastMonthEnd) {
        lastMonthNewStudents++;
      }
    });

    // --- 6. Active students (requests of not deleted only) ---
    const dailyActiveStudents = new Set<string>();
    const monthlyActiveStudents = new Set<string>();
    const lastMonthActiveStudents = new Set<string>();
    validAllRequestDocs.forEach((doc) => {
      const data = doc.data();
      const studentId = data.student_id;
      if (!studentId) return;
      const createdAt = parseFirestoreDate(data.created_at);
      if (createdAt >= todayStart && createdAt <= todayEnd) {
        dailyActiveStudents.add(studentId);
      }
      if (createdAt >= thisMonthStart && createdAt <= thisMonthEnd) {
        monthlyActiveStudents.add(studentId);
      }
      if (createdAt >= lastMonthStart && createdAt <= lastMonthEnd) {
        lastMonthActiveStudents.add(studentId);
      }
    });

    // --- 7. Students with pending payment ---
    const pendingPaymentRequests = await adminDb
      .collection('requests')
      .where('request_status', '==', 'pending_payment')
      .get();
    const validPendingPaymentRequestDocs = filterNotDeleted(pendingPaymentRequests.docs);

    const pendingPaymentStudentsMap = new Map<string, {
      studentId: string;
      studentName: string;
      email: string;
      requestCount: number;
      totalAmount: number;
      requests: Array<{
        id: string;
        label: string;
        student_price: string;
        created_at: any;
      }>;
    }>();

    for (const doc of validPendingPaymentRequestDocs) {
      const data = doc.data();
      const studentId = data.student_id;
      if (!studentId) continue;

      if (!pendingPaymentStudentsMap.has(studentId)) {
        try {
          const studentDoc = await adminDb.collection('students').doc(studentId).get();
          const studentData = studentDoc.exists ? studentDoc.data() : null;
          if (studentData && (studentData.deleted_at === undefined || studentData.deleted_at === null)) {
            pendingPaymentStudentsMap.set(studentId, {
              studentId,
              studentName: studentData.full_name || 'Unknown',
              email: studentData.email || 'N/A',
              requestCount: 0,
              totalAmount: 0,
              requests: []
            });
          } else {
            pendingPaymentStudentsMap.set(studentId, {
              studentId,
              studentName: 'Unknown',
              email: 'N/A',
              requestCount: 0,
              totalAmount: 0,
              requests: []
            });
          }
        } catch {
          pendingPaymentStudentsMap.set(studentId, {
            studentId,
            studentName: 'Unknown',
            email: 'N/A',
            requestCount: 0,
            totalAmount: 0,
            requests: []
          });
        }
      }

      const studentInfo = pendingPaymentStudentsMap.get(studentId)!;
      studentInfo.requestCount++;
      const studentPrice = parseFloat(data.student_price || '0');
      studentInfo.totalAmount += studentPrice;
      studentInfo.requests.push({
        id: doc.id,
        label: data.label || 'Untitled Request',
        student_price: data.student_price || '0',
        created_at: data.created_at
      });
    }

    const pendingPaymentStudents = Array.from(pendingPaymentStudentsMap.values())
      .sort((a, b) => b.totalAmount - a.totalAmount);

    // --- 8. Students with NEW requests but no bids ---
    const newRequestsWithoutBids = await adminDb
      .collection('requests')
      .where('request_status', 'in', ['new', 'pending'])
      .get();
    const validNewRequestsNoBidDocs = filterNotDeleted(newRequestsWithoutBids.docs);

    const studentsWithoutBidsMap = new Map<string, {
      studentId: string;
      studentName: string;
      email: string;
      requestCount: number;
      requests: Array<{
        id: string;
        label: string;
        created_at: any;
      }>;
    }>();

    for (const doc of validNewRequestsNoBidDocs) {
      const data = doc.data();
      const requestId = doc.id;
      const studentId = data.student_id;
      if (!studentId) continue;

      // Check if request has any tutor offers (bids)
      const offersSnapshot = await adminDb
        .collection('requests')
        .doc(requestId)
        .collection('tutor_offers')
        .limit(1)
        .get();

      // If no offers, this is a request without bids
      if (offersSnapshot.empty) {
        if (!studentsWithoutBidsMap.has(studentId)) {
          try {
            const studentDoc = await adminDb.collection('students').doc(studentId).get();
            const studentData = studentDoc.exists ? studentDoc.data() : null;
            if (studentData && (studentData.deleted_at === undefined || studentData.deleted_at === null)) {
              studentsWithoutBidsMap.set(studentId, {
                studentId,
                studentName: studentData.full_name || 'Unknown',
                email: studentData.email || 'N/A',
                requestCount: 0,
                requests: []
              });
            } else {
              studentsWithoutBidsMap.set(studentId, {
                studentId,
                studentName: 'Unknown',
                email: 'N/A',
                requestCount: 0,
                requests: []
              });
            }
          } catch {
            studentsWithoutBidsMap.set(studentId, {
              studentId,
              studentName: 'Unknown',
              email: 'N/A',
              requestCount: 0,
              requests: []
            });
          }
        }
        const studentInfo = studentsWithoutBidsMap.get(studentId)!;
        studentInfo.requestCount++;
        studentInfo.requests.push({
          id: requestId,
          label: data.label || 'Untitled Request',
          created_at: data.created_at
        });
      }
    }

    const studentsWithoutBids = Array.from(studentsWithoutBidsMap.values()).sort((a, b) => b.requestCount - a.requestCount);

    // --- 9. Repeat students (with more than 2 valid requests) ---
    const repeatStudentsMap = new Map<string, {
      studentId: string;
      studentName: string;
      email: string;
      requestCount: number;
      totalSpent: number;
    }>();

    for (const doc of validAllRequestDocs) {
      const data = doc.data();
      const studentId = data.student_id;
      if (!studentId) continue;
      if (!repeatStudentsMap.has(studentId)) {
        try {
          const studentDoc = await adminDb.collection('students').doc(studentId).get();
          const studentData = studentDoc.exists ? studentDoc.data() : null;
          if (studentData && (studentData.deleted_at === undefined || studentData.deleted_at === null)) {
            repeatStudentsMap.set(studentId, {
              studentId,
              studentName: studentData.full_name || 'Unknown',
              email: studentData.email || 'N/A',
              requestCount: 0,
              totalSpent: 0
            });
          } else {
            repeatStudentsMap.set(studentId, {
              studentId,
              studentName: 'Unknown',
              email: 'N/A',
              requestCount: 0,
              totalSpent: 0
            });
          }
        } catch {
          repeatStudentsMap.set(studentId, {
            studentId,
            studentName: 'Unknown',
            email: 'N/A',
            requestCount: 0,
            totalSpent: 0
          });
        }
      }
      const studentInfo = repeatStudentsMap.get(studentId)!;
      studentInfo.requestCount++;
      // Only count completed/paid requests for total spent
      if (data.request_status === 'completed' || data.is_paid === '1') {
        const studentPrice = parseFloat(data.student_price || '0');
        studentInfo.totalSpent += studentPrice;
      }
    }
    const repeatStudents = Array.from(repeatStudentsMap.values())
      .filter(student => student.requestCount > 2)
      .sort((a, b) => b.requestCount - a.requestCount);

    // --- 10. Top subjects, only for valid requests ---
    const subjectStats: Record<string, {
      daily: number;
      monthly: number;
      lastMonth: number;
    }> = {};

    validAllRequestDocs.forEach((doc) => {
      const data = doc.data();
      const subject = data.subject || 'Unknown';
      const createdAt = parseFirestoreDate(data.created_at);

      if (!subjectStats[subject]) {
        subjectStats[subject] = {
          daily: 0,
          monthly: 0,
          lastMonth: 0
        };
      }

      if (createdAt >= todayStart && createdAt <= todayEnd) {
        subjectStats[subject].daily++;
      }
      if (createdAt >= thisMonthStart && createdAt <= thisMonthEnd) {
        subjectStats[subject].monthly++;
      }
      if (createdAt >= lastMonthStart && createdAt <= lastMonthEnd) {
        subjectStats[subject].lastMonth++;
      }
    });

    const topSubjects = Object.entries(subjectStats)
      .map(([subject, stats]) => ({
        subject,
        ...stats
      }))
      .sort((a, b) => b.monthly - a.monthly)
      .slice(0, 10);

    // --- 11. Tutors tracking ---
    const allTutorsSnapshot = await adminDb.collection('tutors').get();
    const validTutorDocs = filterNotDeleted(allTutorsSnapshot.docs);

    let dailyNewTutors = 0;
    let monthlyNewTutors = 0;
    let lastMonthNewTutors = 0;

    validTutorDocs.forEach((doc) => {
      const data = doc.data();
      const createdAt = parseFirestoreDate(data.created_at);
      if (createdAt >= todayStart && createdAt <= todayEnd) {
        dailyNewTutors++;
      }
      if (createdAt >= thisMonthStart && createdAt <= thisMonthEnd) {
        monthlyNewTutors++;
      }
      if (createdAt >= lastMonthStart && createdAt <= lastMonthEnd) {
        lastMonthNewTutors++;
      }
    });

    // Active tutors (based on requests - only not-deleted)
    const dailyActiveTutors = new Set<string>();
    const monthlyActiveTutors = new Set<string>();
    const lastMonthActiveTutors = new Set<string>();
    validAllRequestDocs.forEach((doc) => {
      const data = doc.data();
      const tutorId = data.tutor_id;
      if (!tutorId) return;
      const createdAt = parseFirestoreDate(data.created_at);

      if (createdAt >= todayStart && createdAt <= todayEnd) {
        dailyActiveTutors.add(tutorId);
      }
      if (createdAt >= thisMonthStart && createdAt <= thisMonthEnd) {
        monthlyActiveTutors.add(tutorId);
      }
      if (createdAt >= lastMonthStart && createdAt <= lastMonthEnd) {
        lastMonthActiveTutors.add(tutorId);
      }
    });

    // --- Tutor acceptance rates ---
    const tutorAcceptanceStats = new Map<string, {
      tutorId: string;
      tutorName: string;
      totalOffers: number;
      acceptedOffers: number;
      acceptanceRate: number;
    }>();

    const acceptedRequests = validAllRequestDocs.filter((doc) => {
      const data = doc.data();
      return data.tutor_accepted === '1' && data.tutor_id;
    });

    for (const doc of acceptedRequests) {
      const data = doc.data();
      const tutorId = data.tutor_id;
      if (!tutorId) continue;

      if (!tutorAcceptanceStats.has(tutorId)) {
        try {
          const tutorDoc = await adminDb.collection('tutors').doc(tutorId).get();
          const tutorData = tutorDoc.exists ? tutorDoc.data() : null;
          if (tutorData && (tutorData.deleted_at === undefined || tutorData.deleted_at === null)) {
            tutorAcceptanceStats.set(tutorId, {
              tutorId,
              tutorName: tutorData.full_name || 'Unknown',
              totalOffers: 0,
              acceptedOffers: 0,
              acceptanceRate: 0
            });
          } else {
            tutorAcceptanceStats.set(tutorId, {
              tutorId,
              tutorName: 'Unknown',
              totalOffers: 0,
              acceptedOffers: 0,
              acceptanceRate: 0
            });
          }
        } catch {
          tutorAcceptanceStats.set(tutorId, {
            tutorId,
            tutorName: 'Unknown',
            totalOffers: 0,
            acceptedOffers: 0,
            acceptanceRate: 0
          });
        }
      }
      const stats = tutorAcceptanceStats.get(tutorId)!;
      stats.acceptedOffers++;
    }

    // Count total offers for tutors (from non-deleted requests as proxy)
    const requestsWithTutors = validAllRequestDocs.filter((doc) => {
      const data = doc.data();
      return data.tutor_id;
    });

    for (const doc of requestsWithTutors) {
      const data = doc.data();
      const tutorId = data.tutor_id;
      if (!tutorId) continue;

      if (!tutorAcceptanceStats.has(tutorId)) {
        try {
          const tutorDoc = await adminDb.collection('tutors').doc(tutorId).get();
          const tutorData = tutorDoc.exists ? tutorDoc.data() : null;
          if (tutorData && (tutorData.deleted_at === undefined || tutorData.deleted_at === null)) {
            tutorAcceptanceStats.set(tutorId, {
              tutorId,
              tutorName: tutorData.full_name || 'Unknown',
              totalOffers: 0,
              acceptedOffers: 0,
              acceptanceRate: 0
            });
          } else {
            tutorAcceptanceStats.set(tutorId, {
              tutorId,
              tutorName: 'Unknown',
              totalOffers: 0,
              acceptedOffers: 0,
              acceptanceRate: 0
            });
          }
        } catch {
          tutorAcceptanceStats.set(tutorId, {
            tutorId,
            tutorName: 'Unknown',
            totalOffers: 0,
            acceptedOffers: 0,
            acceptanceRate: 0
          });
        }
      }
      const stats = tutorAcceptanceStats.get(tutorId)!;
      stats.totalOffers++;
    }

    const tutorsWithAcceptanceRate = Array.from(tutorAcceptanceStats.values())
      .map((stats) => ({
        ...stats,
        acceptanceRate: stats.totalOffers > 0
          ? Math.round((stats.acceptedOffers / stats.totalOffers) * 100)
          : 0
      }))
      .filter((stats) => stats.totalOffers > 0)
      .sort((a, b) => b.acceptanceRate - a.acceptanceRate);

    // --- Top rated tutors (not deleted only) ---
    const tutorsWithRatings: Array<{
      tutorId: string;
      tutorName: string;
      rating: number;
      requestCount: number;
    }> = [];

    for (const doc of validTutorDocs) {
      const data = doc.data();
      const tutorId = doc.id;
      const rating = parseFloat(data.rating || '0');
      if (rating > 0) {
        // Count completed requests for this tutor
        const tutorRequestCount = validAllRequestDocs.filter((reqDoc) => {
          const reqData = reqDoc.data();
          return reqData.tutor_id === tutorId && (
            reqData.request_status === 'completed' ||
            reqData.request_status === 'tutor_completed'
          );
        }).length;

        try {
          tutorsWithRatings.push({
            tutorId,
            tutorName: data.full_name || 'Unknown',
            rating,
            requestCount: tutorRequestCount
          });
        } catch {
          tutorsWithRatings.push({
            tutorId,
            tutorName: 'Unknown',
            rating,
            requestCount: tutorRequestCount
          });
        }
      }
    }

    const topRatedTutors = tutorsWithRatings
      .sort((a, b) => {
        if (b.rating !== a.rating) {
          return b.rating - a.rating;
        }
        return b.requestCount - a.requestCount;
      })
      .slice(0, 10);

    // --- REQUESTS & SESSIONS SECTION (only not deleted requests) ---
    let pendingRequests = 0;
    let ongoingRequests = 0;
    let completedRequests = 0;
    let cancelledRequests = 0;
    let waitingForPayment = 0;

    const unmatchedRequestsList: Array<{
      id: string;
      label: string;
      studentId: string;
      studentName: string;
      subject: string;
      created_at: any;
      request_status: string;
    }> = [];

    const canceledRequestsList: Array<{
      id: string;
      label: string;
      studentId: string;
      studentName: string;
      cancelReason: string | null;
      created_at: any;
      cancelled_at: any;
    }> = [];

    for (const doc of validAllRequestDocs) {
      const data = doc.data();
      const status = (data.request_status || '').toUpperCase();

      // Count by status
      if (status === 'PENDING' || status === 'NEW') {
        pendingRequests++;
      } else if (status === 'ONGOING') {
        ongoingRequests++;
      } else if (status === 'COMPLETED' || status === 'TUTOR_COMPLETED') {
        completedRequests++;
      } else if (status === 'CANCELLED') {
        cancelledRequests++;
        // Collect canceled request details
        try {
          const studentDoc = await adminDb.collection('students').doc(data.student_id).get();
          const studentData = studentDoc.exists ? studentDoc.data() : null;
          let studentName = 'Unknown';
          if (studentData && (studentData.deleted_at === undefined || studentData.deleted_at === null)) {
            studentName = studentData.full_name || 'Unknown';
          }
          canceledRequestsList.push({
            id: doc.id,
            label: data.label || 'Untitled Request',
            studentId: data.student_id,
            studentName: studentName,
            cancelReason: data.cancel_reason || 'No reason provided',
            created_at: data.created_at,
            cancelled_at: data.updated_at || data.created_at
          });
        } catch {
          canceledRequestsList.push({
            id: doc.id,
            label: data.label || 'Untitled Request',
            studentId: data.student_id,
            studentName: 'Unknown',
            cancelReason: data.cancel_reason || 'No reason provided',
            created_at: data.created_at,
            cancelled_at: data.updated_at || data.created_at
          });
        }
      } else if (status === 'PENDING_PAYMENT') {
        waitingForPayment++;
      }

      // Check for unmatched requests (NEW/PENDING with no bids)
      if ((status === 'NEW' || status === 'PENDING') && !data.tutor_id) {
        // Check if request has any tutor offers
        const offersSnapshot = await adminDb
          .collection('requests')
          .doc(doc.id)
          .collection('tutor_offers')
          .limit(1)
          .get();

        if (offersSnapshot.empty) {
          try {
            const studentDoc = await adminDb.collection('students').doc(data.student_id).get();
            const studentData = studentDoc.exists ? studentDoc.data() : null;
            let studentName = 'Unknown';
            if (studentData && (studentData.deleted_at === undefined || studentData.deleted_at === null)) {
              studentName = studentData.full_name || 'Unknown';
            }
            unmatchedRequestsList.push({
              id: doc.id,
              label: data.label || 'Untitled Request',
              studentId: data.student_id,
              studentName: studentName,
              subject: data.subject || 'Unknown',
              created_at: data.created_at,
              request_status: status
            });
          } catch {
            unmatchedRequestsList.push({
              id: doc.id,
              label: data.label || 'Untitled Request',
              studentId: data.student_id,
              studentName: 'Unknown',
              subject: data.subject || 'Unknown',
              created_at: data.created_at,
              request_status: status
            });
          }
        }
      }
    }

    // Sort canceled requests by cancellation date (newest first)
    canceledRequestsList.sort((a, b) => {
      const dateA = a.cancelled_at?._seconds ? a.cancelled_at._seconds * 1000 : new Date(a.cancelled_at).getTime();
      const dateB = b.cancelled_at?._seconds ? b.cancelled_at._seconds * 1000 : new Date(b.cancelled_at).getTime();
      return dateB - dateA;
    });

    // Sort unmatched requests by creation date (newest first)
    unmatchedRequestsList.sort((a, b) => {
      const dateA = a.created_at?._seconds ? a.created_at._seconds * 1000 : new Date(a.created_at).getTime();
      const dateB = b.created_at?._seconds ? b.created_at._seconds * 1000 : new Date(b.created_at).getTime();
      return dateB - dateA;
    });

    // Calculate completion rate
    const totalRequests = validAllRequestDocs.length;
    const completionRate = totalRequests > 0 
      ? Math.round((completedRequests / totalRequests) * 100)
      : 0;

    // Group cancel reasons for summary
    const cancelReasons: Record<string, number> = {};
    canceledRequestsList.forEach((req) => {
      const reason = req.cancelReason || 'No reason provided';
      cancelReasons[reason] = (cancelReasons[reason] || 0) + 1;
    });

    const cancelReasonsSummary = Object.entries(cancelReasons)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 reasons

    return NextResponse.json({
      success: true,
      data: {
        profit: {
          thisYear: thisYearProfit,
          lastYear: lastYearProfit,
          year
        },
        visitors,
        topTutors,
        topStudents,
        studentTracking: {
          newRegistrations: {
            daily: dailyNewStudents,
            monthly: monthlyNewStudents,
            lastMonth: lastMonthNewStudents
          },
          activeStudents: {
            daily: dailyActiveStudents.size,
            monthly: monthlyActiveStudents.size,
            lastMonth: lastMonthActiveStudents.size
          },
          pendingPayment: {
            count: pendingPaymentStudents.length,
            students: pendingPaymentStudents.slice(0, 50) // Limit to 50 students
          },
          noBids: {
            count: studentsWithoutBids.length,
            students: studentsWithoutBids.slice(0, 50) // Limit to 50 students
          },
          repeatStudents: {
            count: repeatStudents.length,
            students: repeatStudents.slice(0, 50) // Limit to 50 students
          },
          topSubjects: topSubjects,
          tutorTracking: {
            newRegistrations: {
              daily: dailyNewTutors,
              monthly: monthlyNewTutors,
              lastMonth: lastMonthNewTutors
            },
            activeTutors: {
              daily: dailyActiveTutors.size,
              monthly: monthlyActiveTutors.size,
              lastMonth: lastMonthActiveTutors.size
            },
            acceptanceRates: tutorsWithAcceptanceRate.slice(0, 20), // Top 20 by acceptance rate
            topRated: topRatedTutors
          },
          requestsAndSessions: {
            totalByStatus: {
              pending: pendingRequests,
              ongoing: ongoingRequests,
              completed: completedRequests,
              cancelled: cancelledRequests
            },
            unmatchedRequests: {
              count: unmatchedRequestsList.length,
              requests: unmatchedRequestsList.slice(0, 50) // Limit to 50
            },
            waitingForPayment: waitingForPayment,
            completionRate: completionRate,
            canceledSessions: {
              count: cancelledRequests,
              requests: canceledRequestsList.slice(0, 50), // Limit to 50
              reasons: cancelReasonsSummary
            }
          }
        }
      }
    });

  } catch (error) {
    console.error('❌ Dashboard reports error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch dashboard reports'
      },
      { status: 500 }
    );
  }
}
