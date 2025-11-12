export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/config/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * API Route for admin joining a room
 * POST /api/support/admin/join-room
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { room_id, admin_id } = body;

    if (!room_id || !admin_id) {
      return NextResponse.json(
        { success: false, error: 'Room ID and admin ID are required' },
        { status: 400 }
      );
    }

    // Get room
    const roomDoc = await adminDb.collection('support_rooms').doc(room_id).get();
    
    if (!roomDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Room not found' },
        { status: 404 }
      );
    }

    // Update room with admin_id and set with_agent to true
    await adminDb.collection('support_rooms').doc(room_id).update({
      admin_id: admin_id,
      with_agent: true,
      updated_at: FieldValue.serverTimestamp()
    });

    // Get updated room with all related data
    const updatedRoomDoc = await adminDb.collection('support_rooms').doc(room_id).get();
    const roomData = updatedRoomDoc.data();

    // Get admin data
    let admin = null;
    const adminDoc = await adminDb.collection('users').doc(admin_id).get();
    if (adminDoc.exists) {
      admin = { id: adminDoc.id, ...adminDoc.data() };
    }

    // Get student/tutor data
    let student = null;
    let tutor = null;

    if (roomData?.user_type === 'student' && roomData?.user_id) {
      const studentDoc = await adminDb.collection('students').doc(roomData.user_id).get();
      if (studentDoc.exists) {
        student = { id: studentDoc.id, ...studentDoc.data() };
      }
    }

    if (roomData?.user_type === 'tutor' && roomData?.user_id) {
      const tutorDoc = await adminDb.collection('tutors').doc(roomData.user_id).get();
      if (tutorDoc.exists) {
        tutor = { id: tutorDoc.id, ...tutorDoc.data() };
      }
    }

    // Get latest message
    let latestMessage = null;
    const latestMessageQuery = adminDb
      .collection('support_rooms')
      .doc(room_id)
      .collection('messages')
      .orderBy('created_at', 'desc')
      .limit(1);

    const latestMessageSnapshot = await latestMessageQuery.get();
    if (!latestMessageSnapshot.empty) {
      const latestMsgDoc = latestMessageSnapshot.docs[0];
      latestMessage = { id: latestMsgDoc.id, ...latestMsgDoc.data() };
    }

    const updatedRoom = {
      id: room_id,
      ...roomData,
      admin,
      student,
      tutor,
      latestMessage
    };

    return NextResponse.json({
      success: true,
      room: updatedRoom
    });

  } catch (error) {
    console.error('❌ Admin join room error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to join room' 
      },
      { status: 500 }
    );
  }
}
