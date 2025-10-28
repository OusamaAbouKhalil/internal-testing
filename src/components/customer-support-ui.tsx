'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Search,
  Send,
  Phone,
  Mail,
  MessageCircle,
  User,
  GraduationCap,
  AlertCircle,
  ArrowLeft,
  MoreVertical,
  PhoneOff,
  Image,
  Mic,
  Video,
  File,
  UserPlus,
  UserMinus,
  XCircle,
  CheckCircle,
  Headphones
} from 'lucide-react';
import { format } from 'date-fns';
import { db } from '@/config/firebase';
import { collection, query, orderBy, onSnapshot, where, limit, getDocs, Timestamp } from 'firebase/firestore';

// Message type enums matching the app side
enum CustomerSupportMessageSenderType {
  USER = 'user',
  AGENT = 'agent'
}

enum CustomerSupportMessageType {
  TEXT = 'text',
  IMAGE = 'image',
  AUDIO = 'audio',
  VIDEO = 'video',
  FILE = 'file',
  CONNECTAGENT = 'connectagent',
  CONNECTAGENTFAILED = 'connectagentfailed',
  CONNECTEDAGENT = 'connectedagent',
  AGENTLEFT = 'agentleft',
  ANYTHINGELSE = 'anythingelse'
}

interface SupportMessage {
  id: string;
  message: string;
  message_type: string;
  sender_id: string;
  user_type: 'student' | 'tutor' | 'admin';
  room_id: string;
  seen: boolean;
  created_at: Timestamp | string; // Support both Firebase Timestamp and string
  updated_at: Timestamp | string;
  url?: string; // For file/image/audio/video messages
  file_name?: string;
}

interface SupportRoom {
  id: string;
  user_id: string;
  user_type: 'student' | 'tutor';
  created_at: Timestamp | string; // Support both Firebase Timestamp and string
  updated_at: Timestamp | string;
  admin_id?: string;
  assistant_thread_id?: string;
  rating?: number;
  with_agent?: boolean;
  admin?: {
    id: string;
    name?: string;
    email?: string;
  };
  student?: {
    id: string;
    nickname?: string;
    full_name?: string;
    email?: string;
    phone_number?: string;
  };
  tutor?: {
    id: string;
    nickname?: string;
    full_name?: string;
    email?: string;
    phone_number?: string;
  };
  latestMessage?: SupportMessage;
  unread_messages: number;
}

interface CustomerSupportUIProps {
  currentUserType?: 'admin' | 'student' | 'tutor';
  currentUserId?: string;
}

export function CustomerSupportUI({ 
  currentUserType = 'admin', 
  currentUserId 
}: CustomerSupportUIProps) {
  const [rooms, setRooms] = useState<SupportRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<SupportRoom | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'Student' | 'Tutor'>('Student');
  const [isAgentConnected, setIsAgentConnected] = useState(false);
  const [joiningChat, setJoiningChat] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Load all support rooms
  const loadRooms = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/support/admin/rooms-copy');
      const data = await response.json();
      
      if (data.success) {
        setRooms(data.rooms);
      } else {
        setError(data.error || 'Failed to load conversations');
      }
    } catch (err) {
      console.error('Error loading rooms:', err);
      setError('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  // Load messages for selected room (optimized)
  const loadMessages = async (roomId: string) => {
    // Don't reload if already selected
    if (selectedRoom?.id === roomId) return;
    
    try {
      setError(null);
      setLoadingMessages(true);
      // Reset agent connection status first
      setIsAgentConnected(false);
      
      // Find the room data from existing rooms to avoid extra API call
      const roomData = rooms.find(room => room.id === roomId);
      if (roomData) {
        setSelectedRoom(roomData);
        // Check if agent is connected based on current user being the admin
        const isConnected = roomData.admin_id === currentUserId;
        setIsAgentConnected(isConnected);
      }
      
      const response = await fetch(`/api/support/rooms/${roomId}/messages`);
      const data = await response.json();
      
      if (data.success) {
        const messages = data.messages.messages || [];
        // Ensure messages are sorted by created_at
        const sortedMessages = messages.sort((a: SupportMessage, b: SupportMessage) => {
          const timeA = a.created_at instanceof Timestamp ? a.created_at.toMillis() : new Date(a.created_at).getTime();
          const timeB = b.created_at instanceof Timestamp ? b.created_at.toMillis() : new Date(b.created_at).getTime();
          return timeA - timeB;
        });
        
        setMessages(sortedMessages);
        if (!roomData) {
          setSelectedRoom(data.messages);
          const isConnected = data.messages.admin_id === currentUserId;
          setIsAgentConnected(isConnected);
        }
      } else {
        setError(data.error || 'Failed to load messages');
      }
    } catch (err) {
      console.error('Error loading messages:', err);
      setError('Failed to load messages');
    } finally {
      setLoadingMessages(false);
    }
  };

  // Join chat as agent
  const joinChat = async (roomId: string) => {
    try {
      setJoiningChat(true);
      setError(null);
      
      console.log('Joining chat with:', { room_id: roomId, admin_id: currentUserId });
      console.log('Current agent connected status:', isAgentConnected);
      
      // First, join the room (update admin_id)
      const joinResponse = await fetch('/api/support/admin/join-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id: roomId,
          admin_id: currentUserId || 'admin-user'
        }),
      });
      
      const joinData = await joinResponse.json();
      
      if (joinData.success) {
        // Send agent connected message
        const messageResponse = await fetch('/api/support/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sender_id: currentUserId || 'admin-user',
              user_type: 'admin',
              room_id: roomId,
              message: 'Agent connected to chat',
              message_type: CustomerSupportMessageType.CONNECTEDAGENT,
              url: null
            }),
        });
        
        const messageData = await messageResponse.json();
        
        if (messageData.success) {
          setIsAgentConnected(true);
          // Real-time listener will automatically update messages
        } else {
          setError(messageData.error || 'Failed to send connection message');
        }
      } else {
        setError(joinData.error || 'Failed to join chat');
      }
    } catch (err) {
      console.error('Error joining chat:', err);
      setError('Failed to join chat');
    } finally {
      setJoiningChat(false);
    }
  };

  // Send "anything else" message
  const sendAnythingElseMessage = async () => {
    if (!selectedRoom) return;
    
    try {
      setError(null);
      
      const response = await fetch('/api/support/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_id: currentUserId || 'admin-user',
          user_type: 'admin',
          room_id: selectedRoom.id,
          message: 'Can I help you with anything else?',
          message_type: CustomerSupportMessageType.ANYTHINGELSE,
          url: null
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Real-time listener will automatically update messages
        scrollToBottom();
      } else {
        setError(data.error || 'Failed to send message');
      }
    } catch (err) {
      console.error('Error sending anything else message:', err);
      setError('Failed to send message');
    }
  };

  // Leave chat as agent
  const leaveChat = async () => {
    if (!selectedRoom) return;
    
    try {
      setError(null);
      
      // Send agent left message
      const response = await fetch('/api/support/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_id: currentUserId || 'admin-user',
          user_type: 'admin',
          room_id: selectedRoom.id,
          message: 'Agent has left the chat',
          message_type: CustomerSupportMessageType.AGENTLEFT,
          url: null
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setIsAgentConnected(false);
        // Real-time listener will automatically update messages
      } else {
        setError(data.error || 'Failed to leave chat');
      }
    } catch (err) {
      console.error('Error leaving chat:', err);
      setError('Failed to leave chat');
    }
  };

  // Send message
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedRoom || sending) return;

    try {
      setSending(true);
      setError(null);
      
      const response = await fetch('/api/support/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_id: currentUserId || 'admin-user',
          user_type: 'admin',
          room_id: selectedRoom.id,
          message: newMessage.trim(),
          message_type: 'text',
          url: null
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setNewMessage('');
        // Real-time listener will automatically update messages
        scrollToBottom();
      } else {
        setError(data.error || 'Failed to send message');
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  // Filter rooms based on search and tab
  const filteredRooms = rooms.filter(room => {
    const matchesSearch = !searchQuery || 
      room.student?.nickname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      room.tutor?.nickname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      room.student?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      room.tutor?.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesTab = activeTab === 'Student' ? room.user_type === 'student' : room.user_type === 'tutor';
    
    return matchesSearch && matchesTab;
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatMessageTime = (timestamp: Timestamp | string) => {
    try {
      const date = timestamp instanceof Timestamp ? timestamp.toDate() : new Date(timestamp);
      return format(date, 'HH:mm');
    } catch {
      return 'Invalid time';
    }
  };

  const formatRoomTime = (timestamp: Timestamp | string) => {
    try {
      const date = timestamp instanceof Timestamp ? timestamp.toDate() : new Date(timestamp);
      return format(date, 'MMMM dd, yyyy \'at\' h:mm:ss a \'UTC\'xxx');
    } catch {
      return 'Invalid date';
    }
  };

  const formatFullTime = (timestamp: Timestamp | string) => {
    try {
      const date = timestamp instanceof Timestamp ? timestamp.toDate() : new Date(timestamp);
      return format(date, 'MMMM dd, yyyy \'at\' h:mm:ss a \'UTC\'xxx');
    } catch {
      return 'Invalid date';
    }
  };

  const getUserDisplayName = (room: SupportRoom) => {
    if (room.user_type === 'student') {
      return room.student?.nickname || room.student?.full_name || 'Student';
    } else {
      return room.tutor?.nickname || room.tutor?.full_name || 'Tutor';
    }
  };

  const getUserDisplayMessage = (room: SupportRoom) => {
    if (room.latestMessage) {
      // Handle special message types
      switch (room.latestMessage.message_type) {
        case CustomerSupportMessageType.CONNECTAGENT:
          return 'Requested agent connection';
        case CustomerSupportMessageType.CONNECTAGENTFAILED:
          return 'Agent connection failed';
        case CustomerSupportMessageType.CONNECTEDAGENT:
          return 'Agent connected';
        case CustomerSupportMessageType.AGENTLEFT:
          return 'Agent left the chat';
        case CustomerSupportMessageType.ANYTHINGELSE:
          return 'Can I help you with anything else?';
        case CustomerSupportMessageType.IMAGE:
          return '📷 Image';
        case CustomerSupportMessageType.AUDIO:
          return '🎵 Audio message';
        case CustomerSupportMessageType.VIDEO:
          return '🎥 Video message';
        case CustomerSupportMessageType.FILE:
          return '📎 File attachment';
        default:
          return room.latestMessage.message;
      }
    }
    return 'No messages yet';
  };

  // Render message content based on type
  const renderMessageContent = (message: SupportMessage) => {
    switch (message.message_type) {
      case CustomerSupportMessageType.IMAGE:
        return (
          <div>
            <img 
              src={message.url || message.message} 
              alt="Shared image" 
              className="max-w-full rounded-lg cursor-pointer" 
              onClick={() => window.open(message.url || message.message, '_blank')} 
            />
            {message.message && message.message !== message.url && !message.message.startsWith('http') && (
              <p className="text-sm mt-2">{message.message}</p>
            )}
          </div>
        );
      
      case CustomerSupportMessageType.AUDIO:
        return (
          <div>
            <audio controls className="w-full">
              <source src={message.url || message.message} type="audio/mpeg" />
              Your browser does not support the audio element.
            </audio>
            {message.message && message.message !== message.url && !message.message.startsWith('http') && (
              <p className="text-sm mt-2">{message.message}</p>
            )}
          </div>
        );
      
      case CustomerSupportMessageType.VIDEO:
        return (
          <div>
            <video controls className="max-w-full rounded-lg">
              <source src={message.url || message.message} type="video/mp4" />
              Your browser does not support the video element.
            </video>
            {message.message && message.message !== message.url && !message.message.startsWith('http') && (
              <p className="text-sm mt-2">{message.message}</p>
            )}
          </div>
        );
      
      case CustomerSupportMessageType.FILE:
        return (
          <div className="flex items-center space-x-2">
            <File className="h-4 w-4" />
            <span className="text-sm">
              {message.file_name || 'File attachment'}
            </span>
            {message.message && message.message !== message.url && !message.message.startsWith('http') && (
              <p className="text-sm mt-2">{message.message}</p>
            )}
          </div>
        );
      
      case CustomerSupportMessageType.CONNECTAGENT:
        return (
          <div className="flex items-center space-x-2 text-blue-400">
            <UserPlus className="h-4 w-4" />
            <span>User requested agent connection</span>
          </div>
        );
      
      case CustomerSupportMessageType.CONNECTAGENTFAILED:
        return (
          <div className="flex items-center space-x-2 text-red-400">
            <XCircle className="h-4 w-4" />
            <span>Agent connection failed</span>
          </div>
        );
      
      case CustomerSupportMessageType.CONNECTEDAGENT:
        return (
          <div className="flex items-center space-x-2 text-green-400">
            <CheckCircle className="h-4 w-4" />
            <span>Agent connected to chat</span>
          </div>
        );
      
      case CustomerSupportMessageType.AGENTLEFT:
        return (
          <div className="flex items-center space-x-2 text-yellow-400">
            <UserMinus className="h-4 w-4" />
            <span>Agent has left the chat</span>
          </div>
        );
      
      case CustomerSupportMessageType.ANYTHINGELSE:
        return (
          <div className="flex items-center space-x-2 text-blue-400">
            <MessageCircle className="h-4 w-4" />
            <span>Can I help you with anything else?</span>
          </div>
        );
      
      default:
        return <p className="text-sm whitespace-pre-wrap">{message.message}</p>;
    }
  };

  // Load rooms on component mount
  useEffect(() => {
    loadRooms();
  }, []);

  // Real-time listener for messages in selected room (optimized)
  useEffect(() => {
    if (!selectedRoom) {
      setMessages([]);
      return;
    }

    const messagesRef = collection(db, 'support_rooms', selectedRoom.id, 'messages');
    const q = query(messagesRef, orderBy('created_at', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Only update if we have changes
      const newMessages = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
        } as SupportMessage;
      });

      // Ensure messages are sorted by created_at
      const sortedMessages = newMessages.sort((a, b) => {
        const timeA = a.created_at instanceof Timestamp ? a.created_at.toMillis() : new Date(a.created_at).getTime();
        const timeB = b.created_at instanceof Timestamp ? b.created_at.toMillis() : new Date(b.created_at).getTime();
        return timeA - timeB;
      });
      
      // Only update state if messages actually changed
      setMessages(prevMessages => {
        if (prevMessages.length !== sortedMessages.length) {
          return sortedMessages;
        }
        
        // Check if any message content changed
        const hasChanges = sortedMessages.some((newMsg, index) => {
          const prevMsg = prevMessages[index];
          return !prevMsg || newMsg.id !== prevMsg.id || newMsg.message !== prevMsg.message;
        });
        
        return hasChanges ? sortedMessages : prevMessages;
      });
    }, (error) => {
      console.error('Real-time listener error:', error);
      setError('Failed to listen for new messages');
    });

    return () => unsubscribe();
  }, [selectedRoom?.id]); // Only depend on room ID, not the entire room object

  // Real-time listener for rooms (to update conversation list)
  useEffect(() => {
    const roomsRef = collection(db, 'support_rooms');
    const q = query(roomsRef, orderBy('updated_at', 'desc'));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const updatedRooms = [];
      
      for (const roomDoc of snapshot.docs) {
        const roomData = roomDoc.data();
        const roomId = roomDoc.id;

        // Get student/tutor data
        let student = null;
        let tutor = null;
        
        if (roomData.user_type === 'student' && roomData.user_id) {
          try {
            const studentResponse = await fetch(`/api/students/${roomData.user_id}`);
            const studentData = await studentResponse.json();
            if (studentData.success) {
              student = { id: studentData.student.id, ...studentData.student };
            }
          } catch (err) {
            console.error('Error fetching student:', err);
          }
        }

        if (roomData.user_type === 'tutor' && roomData.user_id) {
          try {
            const tutorResponse = await fetch(`/api/tutors/${roomData.user_id}`);
            const tutorData = await tutorResponse.json();
            if (tutorData.success) {
              tutor = { id: tutorData.tutor.id, ...tutorData.tutor };
            }
          } catch (err) {
            console.error('Error fetching tutor:', err);
          }
        }

        // Get latest message
        let latestMessage = null;
        const latestMessageQuery = query(
          collection(db, 'support_rooms', roomId, 'messages'),
          orderBy('created_at', 'desc'),
          limit(1)
        );

        try {
          const latestSnapshot = await getDocs(latestMessageQuery);
          if (!latestSnapshot.empty) {
            const latestDoc = latestSnapshot.docs[0];
            latestMessage = { id: latestDoc.id, ...latestDoc.data() };
          }
        } catch (err) {
          console.error('Error fetching latest message:', err);
        }

        // Get unread count
        let unreadCount = 0;
        const unreadQuery = query(
          collection(db, 'support_rooms', roomId, 'messages'),
          where('seen', '==', false),
          where('user_type', '!=', 'admin')
        );

        try {
          const unreadSnapshot = await getDocs(unreadQuery);
          unreadCount = unreadSnapshot.size;
        } catch (err) {
          console.error('Error fetching unread count:', err);
        }

        updatedRooms.push({
          id: roomId,
          user_id: roomData.user_id,
          user_type: roomData.user_type,
          created_at: roomData.created_at, // Firebase Timestamp
          updated_at: roomData.updated_at, // Firebase Timestamp
          admin_id: roomData.admin_id,
          assistant_thread_id: roomData.assistant_thread_id,
          rating: roomData.rating,
          with_agent: roomData.with_agent,
          student,
          tutor,
          latestMessage: latestMessage as SupportMessage | undefined,
          unread_messages: unreadCount
        });
      }

      setRooms(updatedRooms);
      
      // Update agent connection status for selected room
      if (selectedRoom) {
        const selectedRoomData = updatedRooms.find(room => room.id === selectedRoom.id);
        if (selectedRoomData) {
          setIsAgentConnected(selectedRoomData.admin_id === currentUserId);
        }
      }
    }, (error) => {
      console.error('Real-time rooms listener error:', error);
    });

    return () => unsubscribe();
  }, [selectedRoom, currentUserId]);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="flex h-[calc(100vh-12rem)] bg-background overflow-hidden rounded-lg">
      {/* Left Panel - Conversation List */}
      <div className="w-1/3 border-r border-border bg-card flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold mb-4">Student Support</h2>
          
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-background border-input placeholder-muted-foreground"
            />
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-700">
          <div className="flex">
            <button
              onClick={() => setActiveTab('Student')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors duration-200 ${
                activeTab === 'Student' 
                  ? 'text-purple-400 border-b-2 border-purple-400 bg-purple-50/10' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-gray-50/5'
              }`}
            >
              Student
            </button>
            <button
              onClick={() => setActiveTab('Tutor')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors duration-200 ${
                activeTab === 'Tutor' 
                  ? 'text-purple-400 border-b-2 border-purple-400 bg-purple-50/10' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-gray-50/5'
              }`}
            >
              Tutor
            </button>
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <LoadingSpinner />
            </div>
          ) : error ? (
            <div className="p-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </div>
          ) : filteredRooms.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              No {activeTab.toLowerCase()} conversations found
            </div>
          ) : (
            <div className="space-y-1">
              {filteredRooms.map((room) => (
                <div
                  key={room.id}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!loadingMessages) {
                      loadMessages(room.id);
                    }
                  }}
                  className={`p-4 cursor-pointer hover:bg-accent transition-colors ${
                    selectedRoom?.id === room.id ? 'bg-purple-900 text-purple-100' : ''
                  } ${loadingMessages ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  <div className="flex items-start space-x-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-muted">
                        {room.user_type === 'student' ? (
                          <User className="h-5 w-5" />
                        ) : (
                          <GraduationCap className="h-5 w-5" />
                        )}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium truncate">
                          {getUserDisplayName(room)}
                        </p>
                        {room.unread_messages > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {room.unread_messages}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {getUserDisplayMessage(room)}
                      </p>
                      <p 
                        className="text-xs text-muted-foreground cursor-help" 
                        title={room.latestMessage ? formatFullTime(room.latestMessage.created_at) : 'No messages'}
                      >
                        {room.latestMessage ? formatRoomTime(room.latestMessage.created_at) : 'No messages'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Chat Window */}
      <div className="flex-1 flex flex-col">
        {selectedRoom ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-border bg-card">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-muted">
                        {selectedRoom.user_type === 'student' ? (
                          <User className="h-5 w-5" />
                        ) : (
                          <GraduationCap className="h-5 w-5" />
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-medium">{getUserDisplayName(selectedRoom)}</h3>
                      <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                        {selectedRoom.user_type === 'student' && selectedRoom.student?.email && (
                          <div className="flex items-center space-x-1">
                            <Mail className="h-3 w-3" />
                            <span>{selectedRoom.student.email}</span>
                          </div>
                        )}
                        {selectedRoom.user_type === 'tutor' && selectedRoom.tutor?.email && (
                          <div className="flex items-center space-x-1">
                            <Mail className="h-3 w-3" />
                            <span>{selectedRoom.tutor.email}</span>
                          </div>
                        )}
                        {isAgentConnected ? (
                          <div className="flex items-center space-x-1 text-green-400">
                            <Headphones className="h-3 w-3" />
                            <span>Agent Online</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-1 text-yellow-400">
                            <UserMinus className="h-3 w-3" />
                            <span>No Agent</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {!isAgentConnected ? (
                      <Button 
                        onClick={() => joinChat(selectedRoom.id)}
                        disabled={joiningChat}
                        variant="outline" 
                        size="sm"
                        className="bg-green-600 border-green-500 hover:bg-green-700 text-white"
                      >
                        {joiningChat ? (
                          <LoadingSpinner size="sm" />
                        ) : (
                          <>
                            <UserPlus className="h-4 w-4 mr-2" />
                            Join Chat
                          </>
                        )}
                      </Button>
                    ) : (
                      <Button 
                        onClick={leaveChat}
                        variant="outline" 
                        size="sm"
                        className="bg-red-600 border-red-500 hover:bg-red-700 text-white"
                      >
                        <UserMinus className="h-4 w-4 mr-2" />
                        Leave Chat
                      </Button>
                    )}
                    {isAgentConnected && (
                      <Button 
                        onClick={sendAnythingElseMessage}
                        variant="outline" 
                        size="sm"
                        className="bg-blue-600 border-blue-500 hover:bg-blue-700 text-white"
                      >
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Anything Else?
                      </Button>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="bg-purple-600 border-purple-500 hover:bg-purple-700 text-white"
                    >
                      <PhoneOff className="h-4 w-4 mr-2" />
                      End Chat
                    </Button>
                  </div>
                </div>
            </div>

            {/* Messages */}
            <div 
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto p-4 space-y-4"
            >
              {loadingMessages ? (
                <div className="flex items-center justify-center py-8">
                  <LoadingSpinner />
                  <span className="ml-2 text-muted-foreground">Loading messages...</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No messages yet. Start the conversation!
                </div>
              ) : (
                messages.map((message) => {
                  // Handle special system messages
                  if ([
                    CustomerSupportMessageType.CONNECTAGENT,
                    CustomerSupportMessageType.CONNECTAGENTFAILED,
                    CustomerSupportMessageType.CONNECTEDAGENT,
                    CustomerSupportMessageType.AGENTLEFT,
                    CustomerSupportMessageType.ANYTHINGELSE
                  ].includes(message.message_type as CustomerSupportMessageType)) {
                    return (
                      <div key={message.id} className="flex justify-center">
                        <div className="bg-card border border-border rounded-lg p-3 max-w-[80%]">
                          {renderMessageContent(message)}
                          <p 
                            className="text-xs text-muted-foreground mt-1 text-center cursor-help" 
                            title={formatFullTime(message.created_at)}
                          >
                            {formatMessageTime(message.created_at)}
                          </p>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={message.id}
                      className={`flex ${message.user_type === 'admin' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[70%] ${message.user_type === 'admin' ? 'order-2' : 'order-1'}`}>
                        <div className={`rounded-lg p-3 ${
                          message.user_type === 'admin' 
                            ? 'bg-purple-600 text-white' 
                            : 'bg-muted'
                        }`}>
                          {renderMessageContent(message)}
                          <p 
                            className={`text-xs mt-1 cursor-help ${
                              message.user_type === 'admin' 
                                ? 'text-purple-200' 
                                : 'text-muted-foreground'
                            }`}
                            title={formatFullTime(message.created_at)}
                          >
                            {formatMessageTime(message.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-border bg-card">
              <div className="flex space-x-2">
                <Textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={isAgentConnected ? "Type your message..." : "Join the chat to start messaging"}
                  className="flex-1 bg-background border-input placeholder-muted-foreground resize-none"
                  rows={1}
                  disabled={!isAgentConnected}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && isAgentConnected) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                />
                <Button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || sending || !isAgentConnected}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4"
                >
                  {sending ? <LoadingSpinner size="sm" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
              {!isAgentConnected && (
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Join the chat to start messaging with the user
                </p>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg">Select a conversation to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
