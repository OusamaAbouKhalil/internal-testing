import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/config/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

// PUT /api/admin-notifications/[id] - Update a notification
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await request.json();

    const updateData = {
      ...data,
      updatedAt: FieldValue.serverTimestamp(),
    };

    await adminDb.collection('admin_notifications').doc(id).update(updateData);
    
    return NextResponse.json({ message: 'Notification updated successfully' });
  } catch (error) {
    console.error('Error updating admin notification:', error);
    return NextResponse.json(
      { error: 'Failed to update admin notification' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin-notifications/[id] - Delete a notification
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    await adminDb.collection('admin_notifications').doc(id).delete();
    
    return NextResponse.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Error deleting admin notification:', error);
    return NextResponse.json(
      { error: 'Failed to delete admin notification' },
      { status: 500 }
    );
  }
}
