export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/config/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * API Route for restoring deleted tutors
 * Checks for email/phone conflicts before restoring
 * POST /api/tutors/restore
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tutorId } = body;

    if (!tutorId) {
      return NextResponse.json(
        { success: false, error: 'Tutor ID is required' },
        { status: 400 }
      );
    }

    const tutorRef = adminDb.collection('tutors').doc(tutorId);
    const tutorDoc = await tutorRef.get();

    if (!tutorDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Tutor not found' },
        { status: 404 }
      );
    }

    const tutorData = tutorDoc.data();

    // Check if tutor is actually deleted
    if (!tutorData?.deleted_at) {
      return NextResponse.json(
        { success: false, error: 'Tutor is not deleted' },
        { status: 400 }
      );
    }

    // Check for email conflict
    if (tutorData.email) {
      const emailQuery = await adminDb
        .collection('tutors')
        .where('email', '==', tutorData.email)
        .where('deleted_at', '==', null)
        .limit(1)
        .get();

      if (!emailQuery.empty) {
        const conflictingTutor = emailQuery.docs[0].data();
        return NextResponse.json(
          { 
            success: false, 
            error: `Email already exists for another active tutor (${conflictingTutor.full_name || conflictingTutor.email})`,
            conflictType: 'email'
          },
          { status: 409 }
        );
      }
    }

    // Check for phone conflict (check both phone and phone_country_code)
    if (tutorData.phone) {
      // Build query for phone matching
      // Need to check phone with matching country code if present
      let phoneQuery;
      
      if (tutorData.phone_country_code) {
        // Check phone with country code
        phoneQuery = await adminDb
          .collection('tutors')
          .where('phone', '==', tutorData.phone)
          .where('phone_country_code', '==', tutorData.phone_country_code)
          .where('deleted_at', '==', null)
          .limit(1)
          .get();
      } else {
        // Check phone without country code
        phoneQuery = await adminDb
          .collection('tutors')
          .where('phone', '==', tutorData.phone)
          .where('deleted_at', '==', null)
          .limit(1)
          .get();
      }

      if (!phoneQuery.empty) {
        const conflictingTutor = phoneQuery.docs[0].data();
        return NextResponse.json(
          { 
            success: false, 
            error: `Phone number already exists for another active tutor (${conflictingTutor.full_name || conflictingTutor.email})`,
            conflictType: 'phone'
          },
          { status: 409 }
        );
      }
    }

    // No conflicts found - restore the tutor by removing deleted_at
    await tutorRef.update({
      deleted_at: null,
      updated_at: FieldValue.serverTimestamp(),
    });

    console.log('✅ Tutor restored:', tutorId);

    return NextResponse.json({
      success: true,
      tutorId,
      message: 'Tutor restored successfully',
    });
  } catch (error) {
    console.error('❌ Restore tutor error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to restore tutor' 
      },
      { status: 500 }
    );
  }
}

