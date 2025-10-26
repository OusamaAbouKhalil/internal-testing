export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/config/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * API Route for admin leaving a room
 * POST /api/support/admin/leave-room
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

    const roomData = roomDoc.data();

    // Check if the admin is actually connected to this room
    if (roomData?.admin_id !== admin_id) {
      return NextResponse.json(
        { success: false, error: 'Admin is not connected to this room' },
        { status: 400 }
      );
    }

    // Update room to remove admin and set with_agent to false
    await adminDb.collection('support_rooms').doc(room_id).update({
      admin_id: null,
      with_agent: false,
      updated_at: FieldValue.serverTimestamp()
    });

    return NextResponse.json({
      success: true,
      message: 'Successfully left the room'
    });

  } catch (error) {
    console.error('❌ Admin leave room error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to leave room' 
      },
      { status: 500 }
    );
  }
}
