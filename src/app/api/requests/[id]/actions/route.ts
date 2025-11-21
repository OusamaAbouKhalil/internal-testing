import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/config/firebase-admin';
import { calculateStudentPrice, calculateTutorOfferPrice } from '@/lib/pricing-utils';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const requestId = id;
    const body = await request.json();
    const { action, ...data } = body;

    switch (action) {
      case 'change_status':
        await changeRequestStatus(requestId, data.status, data.reason);
        break;
      case 'assign_tutor':
        await assignTutor(requestId, data.tutorId, data.tutorPrice, data.studentPrice, data.minPrice);
        break;
      case 'assign_student':
        await assignStudent(requestId, data.studentId, data.studentPrice);
        break;
      case 'set_tutor_price':
        await setTutorPrice(requestId, data.tutorPrice);
        break;
      case 'set_student_price':
        await setStudentPrice(requestId, data.studentPrice);
        break;
      case 'cancel':
        await cancelRequest(requestId, data.reason);
        break;
      case 'complete':
        await completeRequest(requestId, data.feedback);
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    return NextResponse.json({ message: 'Action completed successfully' });
  } catch (error: any) {
    console.error('Error performing request action:', error);
    return NextResponse.json(
      { error: 'Failed to perform action' },
      { status: 500 }
    );
  }
}

async function changeRequestStatus(requestId: string, status: string, reason?: string) {
  const normalizedStatus = status.toLowerCase();
  const updateData: any = {
    request_status: normalizedStatus,
    updated_at: new Date()
  };
  
  if (reason) {
    updateData.cancel_reason = reason;
  }
  
  // Handle specific status changes
  if (normalizedStatus === 'cancelled') {
    updateData.cancelled = '1';
    updateData.cancel_reason = reason || 'Cancelled by admin';
  } else if (normalizedStatus === 'completed') {
    updateData.completed = '1';
    updateData.accepted = '1';
  } else if (normalizedStatus === 'ongoing') {
    updateData.accepted = '1';
  }
  
  await adminDb.collection('requests').doc(requestId).update(updateData);
}

async function assignTutor(
  requestId: string, 
  tutorId: string, 
  tutorPrice: string, 
  studentPrice?: string, 
  minPrice?: string
) {
  // Get request document to access country for price calculation
  const requestDoc = await adminDb.collection('requests').doc(requestId).get();
  if (!requestDoc.exists) {
    throw new Error('Request not found');
  }
  
  const requestData = requestDoc.data();
  const country = requestData?.country || null;
  const currentMinPrice = requestData?.min_price || null;
  const currentStudentPrice = requestData?.student_price || null;
  
  // Use provided minPrice or keep existing, or use null
  const finalMinPrice = minPrice !== undefined ? (minPrice || null) : currentMinPrice;
  
  // Calculate student_price based on pricing priority rules
  // If studentPrice is provided (even if empty string), use it or calculate if empty
  // If not provided (undefined), keep existing override or calculate
  let finalStudentPrice: string;
  if (studentPrice !== undefined) {
    // If studentPrice is provided but empty, calculate it
    if (studentPrice === '' || studentPrice === null) {
      finalStudentPrice = calculateStudentPrice({
        student_price: null,
        tutor_price: tutorPrice,
        country: country,
        min_price: finalMinPrice
      });
    } else {
      // Use provided studentPrice as override
      finalStudentPrice = studentPrice;
    }
  } else {
    // Not provided - keep existing override if exists, otherwise calculate
    finalStudentPrice = calculateStudentPrice({
      student_price: currentStudentPrice, // Keep override if exists
      tutor_price: tutorPrice,
      country: country,
      min_price: finalMinPrice
    });
  }
  
  // Calculate price for tutor offer (tutor_price × multiplier)
  const offerPrice = calculateTutorOfferPrice(tutorPrice, country);
  
  // Update main request document
  const updateData: any = {
    tutor_price: tutorPrice,
    updated_at: new Date()
  };
  
  // Only update tutor_id and related fields if tutorId is provided and not empty
  if (tutorId && tutorId.trim() !== '') {
    updateData.tutor_id = tutorId;
    updateData.tutor_accepted = '1';
    updateData.request_status = 'pending_payment';
    updateData.accepted = '1';
  }
  
  // Update student_price (use provided or calculated)
  updateData.student_price = finalStudentPrice;
  
  // Update min_price if provided
  if (minPrice !== undefined) {
    updateData.min_price = minPrice || null;
  }
  
  // Flag request if tutor is assigned or min_price is set (not cleared)
  const isAssigningTutor = tutorId && tutorId.trim() !== '';
  const isSettingMinPrice = minPrice !== undefined && minPrice !== null && minPrice !== '';
  if (isAssigningTutor || isSettingMinPrice) {
    updateData.had_fixed_price_before_payment = true;
  }
  
  await adminDb.collection('requests').doc(requestId).update(updateData);
  
  // Create/update tutor_offers if tutorId is provided, or if there's an existing tutor
  const tutorIdToUse = (tutorId && tutorId.trim() !== '') ? tutorId : requestData?.tutor_id;
  if (tutorIdToUse && tutorIdToUse.trim() !== '') {
    // Create or update tutor_offers entry (use tutor_id as document ID)
    const tutorOfferRef = adminDb
      .collection('requests')
      .doc(requestId)
      .collection('tutor_offers')
      .doc(tutorIdToUse);
    
    const tutorOfferDoc = await tutorOfferRef.get();
    const now = new Date();
    
    if (tutorOfferDoc.exists) {
      // Update existing offer
      await tutorOfferRef.update({
        tutor_price: tutorPrice,
        price: offerPrice,
        status: 'accepted',
        updated_at: now
      });
    } else {
      // Create new offer
      await tutorOfferRef.set({
        tutor_id: tutorIdToUse,
        request_id: requestId,
        tutor_price: tutorPrice,
        price: offerPrice,
        status: 'accepted',
        cancel_reason: null,
        created_at: now,
        updated_at: now
      });
    }
    
    // Reject other pending offers (only if assigning a new tutor)
    if (tutorId && tutorId.trim() !== '' && tutorId !== requestData?.tutor_id) {
      const otherOffersSnapshot = await adminDb
        .collection('requests')
        .doc(requestId)
        .collection('tutor_offers')
        .where('tutor_id', '!=', tutorIdToUse)
        .where('status', '==', 'pending')
        .get();
      
      const rejectPromises = otherOffersSnapshot.docs.map(doc =>
        doc.ref.update({
          status: 'rejected',
          cancel_reason: 'Another tutor was selected',
          updated_at: new Date()
        })
      );
      
      await Promise.all(rejectPromises);
    }
  }
}

async function assignStudent(requestId: string, studentId: string, studentPrice: string) {
  const updateData = {
    student_id: studentId,
    student_price: studentPrice,
    updated_at: new Date()
  };
  
  await adminDb.collection('requests').doc(requestId).update(updateData);
}

async function setTutorPrice(requestId: string, tutorPrice: string) {
  const updateData = {
    tutor_price: tutorPrice,
    updated_at: new Date()
  };
  
  await adminDb.collection('requests').doc(requestId).update(updateData);
}

async function setStudentPrice(requestId: string, studentPrice: string) {
  const updateData = {
    student_price: studentPrice,
    updated_at: new Date()
  };
  
  await adminDb.collection('requests').doc(requestId).update(updateData);
}

async function cancelRequest(requestId: string, reason: string) {
  const updateData = {
    request_status: 'cancelled',
    cancelled: '1',
    cancel_reason: reason,
    updated_at: new Date()
  };
  
  await adminDb.collection('requests').doc(requestId).update(updateData);
}

async function completeRequest(requestId: string, feedback?: string) {
  const updateData: any = {
    request_status: 'completed',
    completed: '1',
    accepted: '1',
    updated_at: new Date()
  };
  
  if (feedback) {
    updateData.feedback = feedback;
  }
  
  await adminDb.collection('requests').doc(requestId).update(updateData);
}
