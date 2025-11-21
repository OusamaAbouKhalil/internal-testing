import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/config/firebase-admin';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; offerId: string }> }
) {
  try {
    const { id, offerId } = await params;
    const requestId = id;
    const body = await request.json();
    const { action, ...data } = body;

    switch (action) {
      case 'update':
        await updateTutorOffer(requestId, offerId, data.status, data.price);
        break;
      case 'accept':
        await acceptTutorOffer(requestId, offerId);
        break;
      case 'reject':
        await rejectTutorOffer(requestId, offerId, data.reason);
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    return NextResponse.json({ message: 'Action completed successfully' });
  } catch (error: any) {
    console.error('Error performing tutor offer action:', error);
    return NextResponse.json(
      { error: 'Failed to perform action' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; offerId: string }> }
) {
  try {
    const { id, offerId } = await params;
    const requestId = id;
    
    await adminDb
      .collection('requests')
      .doc(requestId)
      .collection('tutor_offers')
      .doc(offerId)
      .delete();
    
    return NextResponse.json({ message: 'Tutor offer deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting tutor offer:', error);
    return NextResponse.json(
      { error: 'Failed to delete tutor offer' },
      { status: 500 }
    );
  }
}

async function updateTutorOffer(requestId: string, offerId: string, status?: string, price?: string) {
  const updateData: any = {
    updated_at: new Date()
  };
  
  if (status) {
    updateData.status = status;
  }
  
  if (price) {
    updateData.price = price;
  }
  
  await adminDb
    .collection('requests')
    .doc(requestId)
    .collection('tutor_offers')
    .doc(offerId)
    .update(updateData);
}

async function acceptTutorOffer(requestId: string, offerId: string) {
  // Update the offer status
  await adminDb
    .collection('requests')
    .doc(requestId)
    .collection('tutor_offers')
    .doc(offerId)
    .update({
      status: 'ACCEPTED',
      updated_at: new Date()
    });
  
  // Get the offer to get tutor info
  const offerDoc = await adminDb
    .collection('requests')
    .doc(requestId)
    .collection('tutor_offers')
    .doc(offerId)
    .get();
  
  const offerData = offerDoc.data();
  
  if (offerData) {
    // Update the request with tutor assignment
    await adminDb.collection('requests').doc(requestId).update({
      tutor_id: offerData.tutor_id,
      tutor_price: offerData.price,
      tutor_accepted: '1',
      request_status: 'pending_payment',
      accepted: '1',
      updated_at: new Date(),
      had_fixed_price_before_payment: true // Flag when tutor is assigned via offer acceptance
    });
  }
}

async function rejectTutorOffer(requestId: string, offerId: string, reason?: string) {
  const updateData: any = {
    status: 'REJECTED',
    updated_at: new Date()
  };
  
  if (reason) {
    updateData.cancel_reason = reason;
  }
  
  await adminDb
    .collection('requests')
    .doc(requestId)
    .collection('tutor_offers')
    .doc(offerId)
    .update(updateData);
}
