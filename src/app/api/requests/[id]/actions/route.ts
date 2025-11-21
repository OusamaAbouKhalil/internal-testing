import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/config/firebase-admin';
import { randomUUID } from 'crypto';
// Removed pricing-utils import - no longer using multiplier calculations

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const requestId = id;
    const body = await request.json();
    const { action, ...data } = body;
    console.log('data', data);
    console.log('action', action);
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
      case 'set_min_price':
        await setMinPrice(requestId, data.minPrice);
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

  console.log('updateData', updateData);
  console.log('normalizedStatus', normalizedStatus);
  
  // Handle specific status changes
  if (normalizedStatus === 'cancelled') {
    updateData.cancelled = '1';
    updateData.cancel_reason = reason || 'Cancelled by admin';
  } else if (normalizedStatus === 'completed') {
    updateData.completed = '1';
    updateData.accepted = '1';
  } else if (normalizedStatus === 'ongoing') {
    updateData.accepted = '1';
    updateData.is_paid = '1';
    
    // Get request document to access tutor_id and set invoice fields
    const requestDoc = await adminDb.collection('requests').doc(requestId).get();
    if (requestDoc.exists) {
      const requestData = requestDoc.data();
      const studentId = requestData?.student_id;
      const tutorId = requestData?.tutor_id;
      
      // Get invoice amount from tutor_offers
      if (tutorId) {
        const tutorOfferDoc = await adminDb
          .collection('requests')
          .doc(requestId)
          .collection('tutor_offers')
          .doc(tutorId)
          .get();
        
        if (tutorOfferDoc.exists) {
          const tutorOfferData = tutorOfferDoc.data();
          const invoiceAmount = tutorOfferData?.price || tutorOfferData?.tutor_price || null;
          
          // Set invoice fields
          const now = new Date();
          updateData.invoice_amount = invoiceAmount;
          updateData.invoice_id = randomUUID();
          updateData.invoice_created_at = now;
          updateData.invoice_updated_at = now;
        } else {
          // If no tutor offer found, set invoice fields to null
          updateData.invoice_amount = null;
          updateData.invoice_id = null;
          updateData.invoice_created_at = null;
          updateData.invoice_updated_at = null;
        }
      }
      
      // Add "studentongoing" message to chat when status changes to ongoing
      if (studentId && tutorId) {
        await addOngoingMessageToChat(requestId, studentId, tutorId);
      }
    }
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
  
  // Determine final student_price
  // If studentPrice is provided, use it; otherwise keep existing or use tutorPrice
  let finalStudentPrice: string;
  if (studentPrice !== undefined && studentPrice !== '' && studentPrice !== null) {
    // Use provided studentPrice
    finalStudentPrice = studentPrice;
  } else if (currentStudentPrice && currentStudentPrice !== '' && currentStudentPrice !== '0') {
    // Keep existing student_price if it exists
    finalStudentPrice = currentStudentPrice;
  } else {
    // Use tutorPrice as fallback (no multiplier calculation)
    finalStudentPrice = tutorPrice;
  }
  
  // Price in tutor_offers should be the same as student_price
  const offerPrice = finalStudentPrice;
  
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
  
  // Flag request if tutor is assigned, tutor price is set, or min_price is set (not cleared)
  const isAssigningTutor = tutorId && tutorId.trim() !== '';
  const isSettingTutorPrice = tutorPrice && tutorPrice.trim() !== '';
  const isSettingMinPrice = minPrice !== undefined && minPrice !== null && minPrice !== '';
  if (isAssigningTutor || isSettingTutorPrice || isSettingMinPrice) {
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

    // Create or update chat room and add bid message
    if (tutorIdToUse && tutorIdToUse.trim() !== '' && requestData?.student_id) {
      await createOrUpdateChatAndAddBidMessage(
        requestId,
        requestData.student_id,
        tutorIdToUse,
        tutorPrice,
        tutorOfferDoc.exists // isExistingOffer - determines if it's a new bid or edited bid
      );
    }
  }
}

async function createOrUpdateChatAndAddBidMessage(
  requestId: string,
  studentId: string,
  tutorId: string,
  tutorPrice: string,
  isExistingOffer: boolean
) {
  const now = new Date();
  
  // Check if chat already exists for this request and tutor
  const existingChatQuery = await adminDb
    .collection('request_chats')
    .where('request_id', '==', requestId)
    .where('tutor_id', '==', tutorId)
    .limit(1)
    .get();
  
  let chatId: string;
  let chatDocRef: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
  
  if (!existingChatQuery.empty) {
    // Chat exists, use existing chat
    const existingChat = existingChatQuery.docs[0];
    const existingChatData = existingChat.data();
    // Use chat_id field if it exists, otherwise use document ID
    chatId = existingChatData?.chat_id || existingChat.id;
    chatDocRef = existingChat.ref;
    
    // Update chat document
    await chatDocRef.update({
      updated_at: now
    });
  } else {
    // Create new chat with UUID as chat_id and document ID
    chatId = randomUUID();
    chatDocRef = adminDb.collection('request_chats').doc(chatId);
    
    // Create new chat document
    await chatDocRef.set({
      chat_id: chatId,
      request_id: requestId,
      student_id: studentId,
      tutor_id: tutorId,
      created_at: now,
      updated_at: now,
      last_message: `Bid: $${tutorPrice}`,
      last_message_at: now,
      last_message_type: isExistingOffer ? 'tutoreditbid' : 'tutorbid',
      unread_count_student: 0,
      unread_count_tutor: 0,
      notes: null
    });
  }
  
  // Determine message type: 'tutorbid' for new bid, 'tutoreditbid' for edited bid
  const messageType = isExistingOffer ? 'tutoreditbid' : 'tutorbid';
  const messageText = `Bid: $${tutorPrice}`;
  
  // Add bid message to messages subcollection
  const bidMessageRef = chatDocRef.collection('messages').doc();
  const bidMessageTime = new Date();
  await bidMessageRef.set({
    message: messageText,
    message_type: messageType,
    sender_id: tutorId,
    sender_type: 'tutor',
    created_at: bidMessageTime,
    updated_at: bidMessageTime,
    seen: false
  });
  
  // Update chat document with bid message info
  await chatDocRef.update({
    last_message: messageText,
    last_message_type: messageType,
    last_message_at: bidMessageTime,
    updated_at: bidMessageTime
  });
  
  // Delay before adding student acceptance message (2 seconds delay)
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Add student acceptance message to messages subcollection (after delay)
  const acceptMessageRef = chatDocRef.collection('messages').doc();
  const acceptMessageTime = new Date();
  await acceptMessageRef.set({
    message: 'Bid accepted by student',
    message_type: 'studentaccept',
    sender_id: studentId,
    sender_type: 'student',
    created_at: acceptMessageTime,
    updated_at: acceptMessageTime,
    seen: false
  });
  
  // Update chat document with last message info (student acceptance is the last message)
  await chatDocRef.update({
    last_message: 'Bid accepted by student',
    last_message_type: 'studentaccept',
    last_message_at: acceptMessageTime,
    updated_at: acceptMessageTime
  });
}

async function addOngoingMessageToChat(
  requestId: string,
  studentId: string,
  tutorId: string
) {
  // Check if chat already exists for this request and tutor
  const existingChatQuery = await adminDb
    .collection('request_chats')
    .where('request_id', '==', requestId)
    .where('tutor_id', '==', tutorId)
    .limit(1)
    .get();
  
  let chatDocRef: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
  
  if (!existingChatQuery.empty) {
    // Chat exists, use existing chat
    const existingChat = existingChatQuery.docs[0];
    chatDocRef = existingChat.ref;
  } else {
    // Chat doesn't exist, create new one
    const chatId = randomUUID();
    chatDocRef = adminDb.collection('request_chats').doc(chatId);
    const now = new Date();
    
    await chatDocRef.set({
      chat_id: chatId,
      request_id: requestId,
      student_id: studentId,
      tutor_id: tutorId,
      created_at: now,
      updated_at: now,
      last_message: 'Payment completed successfully',
      last_message_at: now,
      last_message_type: 'studentpaid',
      unread_count_student: 0,
      unread_count_tutor: 0,
      notes: null
    });
  }
  
  // Add payment completed message first
  const paidMessageRef = chatDocRef.collection('messages').doc();
  const paidMessageTime = new Date();
  await paidMessageRef.set({
    message: 'Payment completed successfully',
    message_type: 'studentpaid',
    sender_id: studentId,
    sender_type: 'student',
    created_at: paidMessageTime,
    updated_at: paidMessageTime,
    seen: true
  });
  
  // Update chat document with payment message info
  await chatDocRef.update({
    last_message: 'Payment completed successfully',
    last_message_type: 'studentpaid',
    last_message_at: paidMessageTime,
    updated_at: paidMessageTime
  });
  
  // Delay before adding ongoing message (2 seconds delay)
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Add ongoing message after delay
  const ongoingMessageRef = chatDocRef.collection('messages').doc();
  const ongoingMessageTime = new Date();
  await ongoingMessageRef.set({
    message: 'Request is now ongoing',
    message_type: 'studentongoing',
    sender_id: studentId,
    sender_type: 'student',
    created_at: ongoingMessageTime,
    updated_at: ongoingMessageTime,
    seen: false
  });
  
  // Update chat document with last message info (ongoing is the last message)
  await chatDocRef.update({
    last_message: 'Request is now ongoing',
    last_message_type: 'studentongoing',
    last_message_at: ongoingMessageTime,
    updated_at: ongoingMessageTime
  });
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
  const updateData: any = {
    tutor_price: tutorPrice,
    updated_at: new Date(),
    had_fixed_price_before_payment: true // Flag when tutor price is set
  };
  
  await adminDb.collection('requests').doc(requestId).update(updateData);
}

async function setStudentPrice(requestId: string, studentPrice: string) {
  const updateData: any = {
    student_price: studentPrice,
    updated_at: new Date(),
    had_fixed_price_before_payment: true // Flag when student price is set
  };
  
  await adminDb.collection('requests').doc(requestId).update(updateData);
}

async function setMinPrice(requestId: string, minPrice: string) {
  const updateData: any = {
    min_price: minPrice || null,
    updated_at: new Date(),
    had_fixed_price_before_payment: true // Flag when min price is set
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
