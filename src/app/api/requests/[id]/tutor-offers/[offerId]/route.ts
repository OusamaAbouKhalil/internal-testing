import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/config/firebase-admin';
// Removed pricing-utils import - no longer using multiplier calculations

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
  // Get the offer to get tutor info
  const offerDoc = await adminDb
    .collection('requests')
    .doc(requestId)
    .collection('tutor_offers')
    .doc(offerId)
    .get();
  
  const offerData = offerDoc.data();
  
  if (!offerData) {
    throw new Error('Offer data not found');
  }
  
  // Get request document
  const requestDoc = await adminDb.collection('requests').doc(requestId).get();
  if (!requestDoc.exists) {
    throw new Error('Request not found');
  }
  
  const requestData = requestDoc.data();
  const currentStudentPrice = requestData?.student_price || null;
  
  // Use tutor_price from offer (what tutor will receive)
  const tutorPrice = offerData.tutor_price || offerData.price; // Fallback to price for legacy offers
  
  // Use existing student_price if it exists, otherwise use tutor_price (no multiplier calculation)
  const finalStudentPrice = currentStudentPrice && currentStudentPrice !== '' && currentStudentPrice !== '0'
    ? currentStudentPrice
    : tutorPrice;
  
  // Update the offer status
  await adminDb
    .collection('requests')
    .doc(requestId)
    .collection('tutor_offers')
    .doc(offerId)
    .update({
      status: 'accepted',
      updated_at: new Date()
    });
  
  // Update the request with tutor assignment
  const updateData: any = {
    tutor_id: offerData.tutor_id,
    tutor_price: tutorPrice,
    tutor_accepted: '1',
    request_status: 'pending_payment', // Changed from 'ONGOING' to 'pending_payment' per spec
    accepted: '1',
    updated_at: new Date(),
    had_fixed_price_before_payment: true // Flag when tutor is assigned via offer acceptance
  };
  
  // Update student_price
  updateData.student_price = finalStudentPrice;
  
  await adminDb.collection('requests').doc(requestId).update(updateData);
  
  // Reject other pending offers
  const otherOffersSnapshot = await adminDb
    .collection('requests')
    .doc(requestId)
    .collection('tutor_offers')
    .where('tutor_id', '!=', offerData.tutor_id)
    .where('status', '==', 'pending')
    .get();
  
  const now = new Date();
  const rejectPromises = otherOffersSnapshot.docs.map(doc =>
    doc.ref.update({
      status: 'rejected',
      cancel_reason: 'Another tutor was selected',
      updated_at: now
    })
  );
  
  await Promise.all(rejectPromises);
}

async function rejectTutorOffer(requestId: string, offerId: string, reason?: string) {
  const updateData: any = {
    status: 'rejected',
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
