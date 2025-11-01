export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/config/firebase-admin';

/**
 * API Route for generating chatbot response
 * POST /api/support/chatbot-response
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, room_id, sender_id, user_type } = body;

    if (!message || !room_id || !sender_id || !user_type) {
      return NextResponse.json(
        { success: false, error: 'Required fields missing' },
        { status: 400 }
      );
    }

    // Get OpenAI API key from environment
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return NextResponse.json(
        { success: false, error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    // Prepare OpenAI request
    const openaiRequestData = {
      model: 'gpt-3.5-turbo', // You can use your fine-tuned model here
      max_tokens: 150,
      temperature: 0.3,
      messages: [
        {
          role: 'user',
          content: message
        }
      ]
    };

    // Call OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(openaiRequestData)
    });

    if (!openaiResponse.ok) {
      throw new Error(`OpenAI API error: ${openaiResponse.statusText}`);
    }

    const openaiData = await openaiResponse.json();
    const chatbotMessage = openaiData.choices[0].message.content;

    // Get room data
    const roomDoc = await adminDb.collection('customer_support_rooms').doc(room_id).get();
    
    if (!roomDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Room not found' },
        { status: 404 }
      );
    }

    const roomData = roomDoc.data();

    // Create chatbot message
    const messageData = {
      sender_id: sender_id,
      user_type: 'admin',
      room_id: room_id,
      message: chatbotMessage,
      message_type: 'text',
      seen: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const messageRef = await adminDb.collection('customer_support_chats').add(messageData);
    const chatbotResponse = { id: messageRef.id, ...messageData };

    // Get target user for notification
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

    // Send notification to target user
    if (targetUser?.device_token) {
      console.log('📱 Sending chatbot response notification:', {
        title: 'Customer Support',
        body: chatbotMessage,
        device_token: targetUser.device_token,
        platform: targetUser.platform,
        room_id: room_id,
        message_id: messageRef.id,
        type: 'customer_chat'
      });
    }

    return NextResponse.json({
      success: true,
      message: chatbotResponse
    }, { status: 201 });

  } catch (error) {
    console.error('❌ Chatbot response error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to generate chatbot response' 
      },
      { status: 500 }
    );
  }
}
