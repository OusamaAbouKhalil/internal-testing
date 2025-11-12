export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/config/firebase-admin';

/**
 * API Route for getting all rooms for admin
 * GET /api/support/admin/rooms
 */
export async function GET(request: NextRequest) {
  try {
    // Get all rooms with their related data
    const roomsSnapshot = await adminDb.collection('support_rooms').get();
    const rooms = [];

    for (const roomDoc of roomsSnapshot.docs) {
      const roomData = roomDoc.data();
      const roomId = roomDoc.id;

      // Get admin data if exists
      let admin = null;
      if (roomData.admin_id) {
        const adminDoc = await adminDb.collection('users').doc(roomData.admin_id).get();
        if (adminDoc.exists) {
          admin = { id: adminDoc.id, ...adminDoc.data() };
        }
      }

      // Get student data if exists
      let student = null;
      if (roomData.user_type === 'student' && roomData.user_id) {
        const studentDoc = await adminDb.collection('students').doc(roomData.user_id).get();
        if (studentDoc.exists) {
          student = { id: studentDoc.id, ...studentDoc.data() };
        }
      }

      // Get tutor data if exists
      let tutor = null;
      if (roomData.user_type === 'tutor' && roomData.user_id) {
        const tutorDoc = await adminDb.collection('tutors').doc(roomData.user_id).get();
        if (tutorDoc.exists) {
          tutor = { id: tutorDoc.id, ...tutorDoc.data() };
        }
      }

      // Get latest message
      let latestMessage = null;
      const latestMessageQuery = adminDb
        .collection('support_rooms')
        .doc(roomId)
        .collection('messages')
        .orderBy('created_at', 'desc')
        .limit(1);

      const latestMessageSnapshot = await latestMessageQuery.get();
      if (!latestMessageSnapshot.empty) {
        const latestMsgDoc = latestMessageSnapshot.docs[0];
        latestMessage = { id: latestMsgDoc.id, ...latestMsgDoc.data() };
      }

      // Get unread messages count
      const unreadQuery = adminDb
        .collection('support_rooms')
        .doc(roomId)
        .collection('messages')
        .where('seen', '==', false)
        .where('user_type', '!=', 'admin');

      const unreadSnapshot = await unreadQuery.get();
      const unreadMessages = unreadSnapshot.size;

      rooms.push({
        id: roomId,
        ...roomData,
        admin,
        student,
        tutor,
        latestMessage,
        unread_messages: unreadMessages
      });
    }

    // Sort by latest message created_at
    rooms.sort((a, b) => {
      if (!a.latestMessage && !b.latestMessage) return 0;
      if (!a.latestMessage) return 1;
      if (!b.latestMessage) return -1;
      return new Date((b.latestMessage as any).created_at).getTime() - new Date((a.latestMessage as any).created_at).getTime();
    });

    return NextResponse.json({
      success: true,
      rooms
    });

  } catch (error) {
    console.error('❌ Admin rooms error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get admin rooms' 
      },
      { status: 500 }
    );
  }
}
