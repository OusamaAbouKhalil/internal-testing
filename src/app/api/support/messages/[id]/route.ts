export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/config/firebase-admin';

/**
 * API Route for editing messages
 * PUT /api/support/messages/[id]
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const messageId = id;
    const body = await request.json();
    const { message, room_id, user_type, message_type = 'text' } = body;

    if (!messageId || !message || !room_id || !user_type) {
      return NextResponse.json(
        { success: false, error: 'Required fields missing' },
        { status: 400 }
      );
    }

    // Get message
    const messageDoc = await adminDb.collection('customer_support_chats').doc(messageId).get();
    
    if (!messageDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Message not found' },
        { status: 404 }
      );
    }

    // Get room data
    const roomDoc = await adminDb.collection('customer_support_rooms').doc(room_id).get();
    
    if (!roomDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Room not found' },
        { status: 404 }
      );
    }

    const roomData = roomDoc.data();

    // Update message
    await adminDb.collection('customer_support_chats').doc(messageId).update({
      message,
      message_type,
      updated_at: new Date().toISOString()
    });

    // Get updated message
    const updatedMessageDoc = await adminDb.collection('customer_support_chats').doc(messageId).get();
    const updatedMessage: any = { id: updatedMessageDoc.id, ...updatedMessageDoc.data() };

    // Handle Firebase notifications
    if (user_type !== 'admin') {
      // Send notification to admin users
      console.log('📱 Sending edit notification to admin users:', {
        title: 'Message Edited',
        body: message,
        room_id,
        message_id: messageId,
        sender_id: updatedMessage?.sender_id,
        user_type,
        type: 'edit_message_support'
      });
    } else {
      // Send notification to student/tutor
      let targetUser: any = null;
      
      if (roomData?.user_type === 'student' && roomData?.user_id) {
        const studentDoc = await adminDb.collection('students').doc(roomData.user_id).get();
        if (studentDoc.exists) {
          targetUser = { id: studentDoc.id, ...studentDoc.data() };
        }
      } else if (roomData?.user_type === 'tutor' && roomData?.user_id) {
        const tutorDoc = await adminDb.collection('tutors').doc(roomData.user_id).get();
        if (tutorDoc.exists) {
          targetUser = { id: tutorDoc.id, ...tutorDoc.data() };
        }
      }

      if (targetUser?.device_token) {
        console.log('📱 Sending edit notification to user:', {
          title: 'Customer Support',
          body: message,
          device_token: targetUser.device_token,
          platform: targetUser.platform,
          message_id: messageId,
          type: 'edit_message_support'
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: updatedMessage
    }, { status: 201 });

  } catch (error) {
    console.error('❌ Edit message error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to edit message' 
      },
      { status: 500 }
    );
  }
}
