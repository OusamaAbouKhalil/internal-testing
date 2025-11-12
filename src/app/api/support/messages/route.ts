export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/config/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * API Route for sending messages
 * POST /api/support/messages
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      sender_id,
      user_type,
      room_id,
      message,
      message_type = 'text',
      url = null
    } = body;

    if (!sender_id || !user_type || !room_id || !message) {
      return NextResponse.json(
        { success: false, error: 'Required fields missing' },
        { status: 400 }
      );
    }

    // Get room data
    const roomDoc = await adminDb.collection('support_rooms').doc(room_id).get();
    
    if (!roomDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Room not found' },
        { status: 404 }
      );
    }

    const roomData = roomDoc.data();

    // Get room participants
    let student = null;
    let tutor = null;
    let admin = null;

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

    if (roomData?.admin_id) {
      const adminDoc = await adminDb.collection('users').doc(roomData.admin_id).get();
      if (adminDoc.exists) {
        admin = { id: adminDoc.id, ...adminDoc.data() };
      }
    }

    // Create message
    const messageData = {
      sender_id,
      user_type,
      message: message_type === 'text' ? message : (url || message || ''),
      message_type,
      file_name: message_type !== 'text' ? url : null,
      seen: false,
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp()
    };

    const messageRef = await adminDb.collection('support_rooms').doc(room_id).collection('messages').add(messageData);
    const savedMessage = { id: messageRef.id, ...messageData };

    // Handle Firebase notifications (simplified - you may need to implement actual Firebase messaging)
    if (user_type !== 'admin') {
      // Send notification to admin users
      console.log('📱 Sending notification to admin users:', {
        title: user_type === 'student' ? (student as any)?.nickname : (tutor as any)?.nickname,
        body: savedMessage.message,
        room_id,
        sender_id,
        user_type,
        type: 'customer_chat'
      });

      // Send email notification (simplified)
      if (student) {
        console.log('📧 Sending email notification:', {
          name: (student as any).full_name,
          email: (student as any).email,
          phone: (student as any).phone_number,
          message: message_type === 'file' ? 'File' : savedMessage.message
        });
      }
    } else {
      // Send notification to student/tutor
      const targetUser = roomData?.user_type === 'student' ? student : tutor;
      if ((targetUser as any)?.device_token) {
        console.log('📱 Sending notification to user:', {
          title: 'Customer Support',
          body: savedMessage.message,
          device_token: (targetUser as any).device_token,
          platform: (targetUser as any).platform
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: savedMessage
    }, { status: 201 });

  } catch (error) {
    console.error('❌ Send message error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to send message' 
      },
      { status: 500 }
    );
  }
}
