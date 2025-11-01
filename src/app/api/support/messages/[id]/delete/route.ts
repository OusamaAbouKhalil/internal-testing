export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/config/firebase-admin';

/**
 * API Route for deleting messages
 * DELETE /api/support/messages/[id]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const messageId = id;
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('room_id');
    const userType = searchParams.get('user_type');
    const message = searchParams.get('message') || 'Message deleted';

    if (!messageId || !roomId || !userType) {
      return NextResponse.json(
        { success: false, error: 'Message ID, room ID, and user type are required' },
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

    const messageData = messageDoc.data();

    // Get room data
    const roomDoc = await adminDb.collection('customer_support_rooms').doc(roomId).get();
    
    if (!roomDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Room not found' },
        { status: 404 }
      );
    }

    const roomData = roomDoc.data();

    // Handle Firebase notifications before deletion
    if (userType !== 'admin') {
      // Send notification to admin users
      console.log('📱 Sending delete notification to admin users:', {
        title: 'Message Deleted',
        body: message,
        room_id: roomId,
        message_id: messageId,
        sender_id: messageData?.sender_id,
        user_type: userType,
        type: 'delete_message_support'
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
        const notificationData = {
          title: targetUser.nickname || 'Customer Support',
          body: message,
          device_token: targetUser.device_token,
          platform: targetUser.platform,
          message_id: messageId,
          type: 'delete_message_support',
          sound: 'default'
        };

        console.log('📱 Sending delete notification to user:', notificationData);
      }
    }

    // Delete the message
    await adminDb.collection('customer_support_chats').doc(messageId).delete();

    return NextResponse.json({
      success: true,
      message: 'deleted'
    }, { status: 200 });

  } catch (error) {
    console.error('❌ Delete message error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to delete message' 
      },
      { status: 500 }
    );
  }
}
