import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/config/firebase-admin';
import { calculateTutorOfferPrice } from '@/lib/pricing-utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const requestId = id;
    
    const snapshot = await adminDb
      .collection('requests')
      .doc(requestId)
      .collection('tutor_offers')
      .orderBy('created_at', 'desc')
      .get();
    
    const offers = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json({ offers });
  } catch (error: any) {
    console.error('Error fetching tutor offers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tutor offers' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const requestId = id;
    const body = await request.json();
    // Accept either tutor_price (preferred) or price (legacy)
    const { tutorId, tutor_price, price } = body;
    
    if (!tutorId) {
      return NextResponse.json(
        { error: 'Tutor ID is required' },
        { status: 400 }
      );
    }
    
    // Use tutor_price if provided, otherwise fall back to price (legacy)
    const tutorPriceValue = tutor_price || price;
    if (!tutorPriceValue) {
      return NextResponse.json(
        { error: 'Tutor price is required' },
        { status: 400 }
      );
    }
    
    // Get request document to get country for price calculation
    const requestDoc = await adminDb.collection('requests').doc(requestId).get();
    if (!requestDoc.exists) {
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      );
    }
    
    const requestData = requestDoc.data();
    const country = requestData?.country || null;
    
    // Calculate price (tutor_price × multiplier)
    const calculatedPrice = calculateTutorOfferPrice(tutorPriceValue, country);
    
    const now = new Date();
    
    const newOffer = {
      tutor_id: tutorId,
      tutor_price: tutorPriceValue, // What tutor will receive
      price: calculatedPrice, // Calculated price (tutor_price × multiplier)
      request_id: requestId,
      status: 'pending',
      cancel_reason: null,
      created_at: now,
      updated_at: now
    };
    
    // Use tutor_id as the document ID (not auto-generated)
    const tutorOfferRef = adminDb
      .collection('requests')
      .doc(requestId)
      .collection('tutor_offers')
      .doc(tutorId);
    
    // Check if offer already exists
    const existingOffer = await tutorOfferRef.get();
    
    if (existingOffer.exists) {
      // Update existing offer
      await tutorOfferRef.update({
        tutor_price: tutorPriceValue,
        price: calculatedPrice,
        status: 'pending',
        updated_at: now
      });
    } else {
      // Create new offer with tutor_id as document ID
      await tutorOfferRef.set(newOffer);
    }
    
    return NextResponse.json({ 
      id: tutorId, // Return tutor_id as the document ID
      message: 'Tutor offer created successfully' 
    });
  } catch (error: any) {
    console.error('Error creating tutor offer:', error);
    return NextResponse.json(
      { error: 'Failed to create tutor offer' },
      { status: 500 }
    );
  }
}
