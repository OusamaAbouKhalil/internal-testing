export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/config/firebase-admin';
import { enrichStudentWithOtpPhone } from '@/lib/otp-phone-lookup';

/**
 * API Route for fetching a student by ID
 * GET /api/students/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const studentId = id;

    if (!studentId) {
      return NextResponse.json(
        { success: false, error: 'Student ID is required' },
        { status: 400 }
      );
    }

    // Fetch student by ID
    const studentDoc = await adminDb.collection('students').doc(studentId).get();

    if (!studentDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Student not found' },
        { status: 404 }
      );
    }

    let student = {
      id: studentDoc.id,
      ...studentDoc.data()
    };

    // Enrich with phone number from OTP verifications if missing
    student = await enrichStudentWithOtpPhone(student);

    return NextResponse.json({
      success: true,
      student
    });

  } catch (error) {
    console.error('❌ Student fetch error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch student' 
      },
      { status: 500 }
    );
  }
}
