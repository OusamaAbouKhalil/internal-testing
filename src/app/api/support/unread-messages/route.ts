export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/config/firebase-admin';

/**
 * API Route for getting unread messages count for a room
 * GET /api/support/unread-messages?roomId={roomId}
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');

    if (!roomId) {
      return NextResponse.json(
        { success: false, error: 'Room ID is required' },
        { status: 400 }
      );
    }

    // Query unread messages (seen=false and user_type != 'admin')
    const unreadQuery = adminDb
      .collection('support_rooms')
      .doc(roomId)
      .collection('messages')
      .where('seen', '==', false)
      .where('user_type', '!=', 'admin');

    const snapshot = await unreadQuery.get();
    const count = snapshot.size;

    return NextResponse.json({
      success: true,
      count,
      roomId
    });

  } catch (error) {
    console.error('❌ Unread messages count error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get unread messages count' 
      },
      { status: 500 }
    );
  }
}
