export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/config/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * API Route for getting messages by room ID
 * GET /api/support/rooms/[id]/messages
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const roomId = id;

    if (!roomId) {
      return NextResponse.json(
        { success: false, error: 'Room ID is required' },
        { status: 400 }
      );
    }

    // Mark all messages in this room as seen
    const messagesSnapshot = await adminDb
      .collection('support_rooms')
      .doc(roomId)
      .collection('messages')
      .get();

    const batch = adminDb.batch();
    messagesSnapshot.docs.forEach(doc => {
      batch.update(doc.ref, { seen: true });
    });
    await batch.commit();

    // Get room with all related data
    const roomDoc = await adminDb.collection('support_rooms').doc(roomId).get();
    
    if (!roomDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Room not found' },
        { status: 404 }
      );
    }

    const roomData = roomDoc.data();
    const roomId_doc = roomDoc.id;

    // Get admin data if exists
    let admin = null;
    if (roomData?.admin_id) {
      const adminDoc = await adminDb.collection('users').doc(roomData.admin_id).get();
      if (adminDoc.exists) {
        admin = { id: adminDoc.id, ...adminDoc.data() };
      }
    }

    // Get student data if exists
    let student = null;
    if (roomData?.user_type === 'student' && roomData?.user_id) {
      const studentDoc = await adminDb.collection('students').doc(roomData.user_id).get();
      if (studentDoc.exists) {
        student = { id: studentDoc.id, ...studentDoc.data() };
      }
    }

    // Get tutor data if exists
    let tutor = null;
    if (roomData?.user_type === 'tutor' && roomData?.user_id) {
      const tutorDoc = await adminDb.collection('tutors').doc(roomData.user_id).get();
      if (tutorDoc.exists) {
        tutor = { id: tutorDoc.id, ...tutorDoc.data() };
      }
    }

    // Get all messages for this room
    const messagesQuery = adminDb
      .collection('support_rooms')
      .doc(roomId)
      .collection('messages')
      .orderBy('created_at', 'asc');

    const messagesSnapshot2 = await messagesQuery.get();
    const messages = messagesSnapshot2.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Get latest message
    let latestMessage = null;
    if (messages.length > 0) {
      latestMessage = messages[messages.length - 1];
    }

    const room = {
      id: roomId_doc,
      ...roomData,
      admin,
      student,
      tutor,
      latestMessage,
      messages
    };

    return NextResponse.json({
      success: true,
      messages: room
    });

  } catch (error) {
    console.error('❌ Messages by room error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get messages by room' 
      },
      { status: 500 }
    );
  }
}
