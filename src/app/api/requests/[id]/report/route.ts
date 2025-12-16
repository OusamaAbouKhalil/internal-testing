import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/config/firebase-admin';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const requestId = id;

    if (!requestId) {
      return NextResponse.json(
        { error: 'Request ID is required' },
        { status: 400 }
      );
    }

    // Fetch the request document
    const requestDoc = await adminDb.collection('requests').doc(requestId).get();

    if (!requestDoc.exists) {
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      );
    }

    const requestData = requestDoc.data();

    // Check if issue is reported
    if (requestData?.issue_reported !== '1') {
      return NextResponse.json(
        { error: 'No issue reported for this request' },
        { status: 404 }
      );
    }

    // Get the report data
    const report = requestData.report || null;

    return NextResponse.json({
      success: true,
      report: report
    });
  } catch (error: any) {
    console.error('Error fetching report details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch report details' },
      { status: 500 }
    );
  }
}

