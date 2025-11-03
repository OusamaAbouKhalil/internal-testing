export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/config/firebase-admin';

/**
 * API Route for dashboard reports
 * GET /api/reports/dashboard
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

    // Get all completed requests (we'll filter by date in memory)
    const allCompletedRequestsSnapshot = await adminDb
      .collection('requests')
      .where('request_status', 'in', ['completed', 'tutor_completed'])
      .get();

    // Filter by date in memory
    const thisYearRequests = allCompletedRequestsSnapshot.docs.filter((doc) => {
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

    const lastYearRequests = allCompletedRequestsSnapshot.docs.filter((doc) => {
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
    const allCompletedRequests = allCompletedRequestsSnapshot;

    // Calculate top tutors
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
        // Fetch tutor name
        try {
          const tutorDoc = await adminDb.collection('tutors').doc(tutorId).get();
          tutorStats[tutorId] = {
            tutorId,
            tutorName: tutorDoc.exists ? (tutorDoc.data()?.full_name || 'Unknown') : 'Unknown',
            completedCount: 0,
            totalProfit: 0,
            requestTypes: {},
            requests: []
          };
        } catch {
          tutorStats[tutorId] = {
            tutorId,
            tutorName: 'Unknown',
            completedCount: 0,
            totalProfit: 0,
            requestTypes: {},
            requests: []
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

    // Calculate top students
    const studentStats: Record<string, {
      studentId: string;
      studentName: string;
      requestCount: number;
      requests: any[];
    }> = {};

    const allRequests = await adminDb
      .collection('requests')
      .get();

    for (const doc of allRequests.docs) {
      const data = doc.data();
      if (!data.student_id) continue;

      const studentId = data.student_id;
      if (!studentStats[studentId]) {
        // Fetch student name
        try {
          const studentDoc = await adminDb.collection('students').doc(studentId).get();
          studentStats[studentId] = {
            studentId,
            studentName: studentDoc.exists ? (studentDoc.data()?.full_name || 'Unknown') : 'Unknown',
            requestCount: 0,
            requests: []
          };
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

    // Get complaints/bad feedback
    const complaintsRequests = await adminDb
      .collection('requests')
      .where('issue_reported', '==', '1')
      .get();

    const complaintsWithFeedback = await adminDb
      .collection('requests')
      .where('rating', '!=', null)
      .get();

    const complaints: any[] = [];

    // Add issue reported complaints
    complaintsRequests.forEach((doc) => {
      const data = doc.data();
      complaints.push({
        id: doc.id,
        studentId: data.student_id,
        studentName: 'Unknown', // Will be filled below
        requestLabel: data.label,
        issue: data.issue_reported === '1' ? 'Issue Reported' : null,
        feedback: data.feedback || null,
        rating: data.rating || null,
        createdAt: data.created_at
      });
    });

    // Add bad ratings (<= 3)
    complaintsWithFeedback.forEach((doc) => {
      const data = doc.data();
      const rating = parseFloat(data.rating || '0');
      if (rating <= 3 && rating > 0) {
        // Check if already added
        const exists = complaints.find(c => c.id === doc.id);
        if (!exists) {
          complaints.push({
            id: doc.id,
            studentId: data.student_id,
            studentName: 'Unknown',
            requestLabel: data.label,
            issue: rating <= 3 ? 'Bad Rating' : null,
            feedback: data.feedback || null,
            rating: data.rating || null,
            createdAt: data.created_at
          });
        }
      }
    });

    // Fetch student names for complaints
    for (const complaint of complaints) {
      if (complaint.studentId) {
        try {
          const studentDoc = await adminDb.collection('students').doc(complaint.studentId).get();
          if (studentDoc.exists) {
            complaint.studentName = studentDoc.data()?.full_name || 'Unknown';
          }
        } catch {
          // Keep Unknown
        }
      }
    }

    // Sort complaints by date (newest first)
    complaints.sort((a, b) => {
      const dateA = a.createdAt?._seconds ? a.createdAt._seconds * 1000 : new Date(a.createdAt).getTime();
      const dateB = b.createdAt?._seconds ? b.createdAt._seconds * 1000 : new Date(b.createdAt).getTime();
      return dateB - dateA;
    });

    // Get visitor stats (placeholder - you might want to add actual visitor tracking)
    const visitors = {
      today: 0,
      thisWeek: 0,
      thisMonth: 0,
      total: 0
    };

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
        complaints: complaints.slice(0, 50) // Limit to 50 most recent
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

