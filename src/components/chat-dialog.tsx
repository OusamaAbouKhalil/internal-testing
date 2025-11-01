'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Send,
  Edit2,
  Check,
  X,
  MessageCircle,
  User,
  GraduationCap,
  AlertCircle,
  ChevronUp,
  Trash2
} from 'lucide-react';
import { format } from 'date-fns';
import { getImageUrl } from '@/lib/file-upload';
import { db } from '@/config/firebase';
import { collection, query, orderBy, limit, onSnapshot, where, getDocs } from 'firebase/firestore';

enum MessageType {
  TEXT = 'text',
  VOICE = 'voice',
  IMAGE = 'image',
  FILE = 'file',
  REQUESTCREATED = 'requestcreated',
  BIDINVITE = 'bidinvite',
  BIDINVITEREJECTED = 'bidinviterejected',
  TUTORBID = 'tutorbid',
  TUTOREDITBID = 'tutoreditbid',
  STUDENTREJECT = 'studentreject',
  REQUESTTAKEN = 'requesttaken',
  STUDENTCHANGEMIND = 'studentchangemind',
  STUDENTACCEPT = 'studentaccept',
  STUDENTPAID = 'studentpaid',
  STUDENTONGOING = 'studentongoing',
  TUTORCOMPLETE = 'tutorcomplete',
  STUDENTACCEPTCOMPLETE = 'studentacceptcomplete',
  STUDENTREJECTCOMPLETE = 'studentrejectcomplete',
  STUDENTCANCELREQUEST = 'studentcancelrequest',
  TUTORDECLINEACCEPTED = 'tutordeclineaccepted',
  ZOOMCREATED = 'zoomcreated',
  ZOOMREADY = 'zoomready',
}

interface ChatMessage {
  id: string;
  message: string;
  message_type: string;
  sender_type: 'student' | 'tutor' | 'admin';
  sender_id: string;
  created_at: any;
  updated_at: any;
  seen: boolean;
  edited?: boolean;
  edited_by?: string;
}

interface ChatDialogProps {
  isOpen: boolean;
  onClose: () => void;
  requestId: string;
  requestTitle: string;
  studentInfo?: { email: string; nickname: string };
  tutorInfo?: { email: string; nickname: string };
}

interface ChatInfo {
  id: string;
  tutor_id: string;
  student_id: string;
  request_id: string;
  last_message: string;
  last_message_type: string;
  last_message_at: any;
  unread_count_student: number;
  unread_count_tutor: number;
}

export function ChatDialog({
  isOpen,
  onClose,
  requestId,
  requestTitle,
  studentInfo,
  tutorInfo
}: ChatDialogProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [chatDocId, setChatDocId] = useState<string | null>(null);
  const [chats, setChats] = useState<ChatInfo[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [lastLoadedMessageId, setLastLoadedMessageId] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [maxRetries] = useState(3);
  const [loadingUserInfo, setLoadingUserInfo] = useState(false);
  const [loadedStudentInfo, setLoadedStudentInfo] = useState<{ email: string; nickname: string } | null>(null);
  const [loadedTutorInfo, setLoadedTutorInfo] = useState<{ email: string; nickname: string } | null>(null);
  const [chatUserInfo, setChatUserInfo] = useState<Record<string, { student?: { email: string; nickname: string }; tutor?: { email: string; nickname: string } }>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  // 🔹 Load user information by ID for a specific chat
  const loadUserInfo = useCallback(async (chatId: string, studentId?: string, tutorId?: string) => {
    if (!studentId && !tutorId) return;
    
    setLoadingUserInfo(true);
    try {
      const promises = [];
      
      if (studentId) {
        promises.push(
          fetch(`/api/students/${studentId}`)
            .then(res => res.json())
            .then(data => data.success ? data.student : null)
            .catch(error => {
              console.error('Error fetching student:', error);
              return null;
            })
        );
      } else {
        promises.push(Promise.resolve(null));
      }
      
      if (tutorId) {
        promises.push(
          fetch(`/api/tutors/${tutorId}`)
            .then(res => res.json())
            .then(data => data.success ? data.tutor : null)
            .catch(error => {
              console.error('Error fetching tutor:', error);
              return null;
            })
        );
      } else {
        promises.push(Promise.resolve(null));
      }
      
      const [student, tutor] = await Promise.all(promises);
      
      // Store user info for this specific chat
      setChatUserInfo(prev => ({
        ...prev,
        [chatId]: {
          student: student ? {
            email: student.email || 'N/A',
            nickname: student.nickname || 'N/A'
          } : undefined,
          tutor: tutor ? {
            email: tutor.email || 'N/A',
            nickname: tutor.nickname || 'N/A'
          } : undefined
        }
      }));
      
      // Also update the current loaded info for backward compatibility
      if (student) {
        setLoadedStudentInfo({
          email: student.email || 'N/A',
          nickname: student.nickname || 'N/A'
        });
      }
      
      if (tutor) {
        setLoadedTutorInfo({
          email: tutor.email || 'N/A',
          nickname: tutor.nickname || 'N/A'
        });
      }
    } catch (error) {
      console.error('Error loading user info:', error);
    } finally {
      setLoadingUserInfo(false);
    }
  }, []);

  // 🔹 Find chat document ID
  const findChatDocId = useCallback(async () => {
    try {
      const chatQuery = query(
        collection(db, 'request_chats'),
        where('request_id', '==', requestId),
        limit(1)
      );
      const querySnapshot = await getDocs(chatQuery);
      if (!querySnapshot.empty) {
        return querySnapshot.docs[0].id;
      }
      return null;
    } catch (error) {
      console.error('Error finding chat document:', error);
      return null;
    }
  }, [requestId]);

  // 🔹 Load messages (API fallback) with retry mechanism
  const loadMessages = useCallback(async (lastMessageId?: string, chatId?: string, isInitialLoad = false, attempt = 1) => {
    let success = false;
    
    try {
      if (lastMessageId) setLoadingMore(true);
      else setLoading(true);

      const params = new URLSearchParams();
      if (lastMessageId) params.append('lastMessageId', lastMessageId);
      if (chatId) params.append('chatId', chatId);

      const url = `/api/requests/${requestId}/chat${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();

      if (data.success) {
        success = true;
        
        if (lastMessageId) {
          // Load older messages - prepend to existing messages
          setMessages(prev => [...data.messages, ...prev]);
          setLastLoadedMessageId(data.messages.length > 0 ? data.messages[0].id : null);
        } else {
          // Initial load or chat switch - replace messages
          setMessages(data.messages);
          setLastLoadedMessageId(data.messages.length > 0 ? data.messages[data.messages.length - 1].id : null);
        }
        setHasMore(data.hasMore);
        setError(null);
        setRetryCount(0); // Reset retry count on success
        
        // Update chats if provided
        if (data.chats) {
          setChats(data.chats);
          
          // Load user information for all chats if this is initial load
          if (data.chats.length > 0 && isInitialLoad) {
            // Load user info for all chats
            data.chats.forEach((chat: ChatInfo) => {
              loadUserInfo(chat.id, chat.student_id, chat.tutor_id);
            });
          }
        }
        
        // Mark as initialized after first successful load
        if (isInitialLoad) {
          setIsInitialized(true);
        }
      } else {
        const errorMsg = data.error || 'Failed to load messages';
        setError(errorMsg);
        
        // Retry logic for initial loads
        if (isInitialLoad && attempt < maxRetries) {
          console.log(`Retrying load messages (attempt ${attempt + 1}/${maxRetries})`);
          setTimeout(() => {
            setRetryCount(attempt);
            loadMessages(lastMessageId, chatId, isInitialLoad, attempt + 1);
          }, 1000 * attempt); // Exponential backoff
        }
      }
    } catch (err) {
      console.error('Load messages error:', err);
      const errorMsg = err instanceof Error ? err.message : 'Failed to load messages';
      setError(errorMsg);
      
      // Retry logic for network errors
      if (isInitialLoad && attempt < maxRetries) {
        console.log(`Retrying load messages due to network error (attempt ${attempt + 1}/${maxRetries})`);
        setTimeout(() => {
          setRetryCount(attempt);
          loadMessages(lastMessageId, chatId, isInitialLoad, attempt + 1);
        }, 1000 * attempt);
      }
    } finally {
      // Always clear loading states for successful responses or when retries are exhausted
      if (success || attempt >= maxRetries || !isInitialLoad) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [requestId, maxRetries]);

  // 🔹 Load more (pagination)
  const loadMoreMessages = useCallback(() => {
    if (hasMore && !loadingMore && messages.length > 0 && selectedChatId) {
      const oldest = messages[0];
      loadMessages(oldest.id, selectedChatId);
    }
  }, [hasMore, loadingMore, messages, loadMessages, selectedChatId]);

  // 🔹 Send message
  const sendMessage = async () => {
    if (!newMessage.trim() || sending || !selectedChatId) return;

    try {
      setSending(true);
      const response = await fetch(`/api/requests/${requestId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: newMessage.trim(),
          messageType: 'text',
          chatId: selectedChatId
        }),
      });
      const data = await response.json();

      if (data.success) {
        setNewMessage('');
        scrollToBottom();
      } else setError(data.error || 'Failed to send message');
    } catch (err) {
      console.error(err);
      setError('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  // 🔹 Edit message
  const editMessage = async (id: string) => {
    if (!editText.trim() || !selectedChatId) return;
    try {
      const response = await fetch(`/api/requests/${requestId}/chat/${id}?chatId=${selectedChatId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: editText.trim(), messageType: 'text' }),
      });
      const data = await response.json();
      if (data.success) {
        setMessages(prev => prev.map(m => m.id === id ? { ...m, ...data.message } : m));
        setEditingMessage(null);
        setEditText('');
      } else setError(data.error || 'Failed to edit message');
    } catch (err) {
      console.error(err);
      setError('Failed to edit message');
    }
  };

  const deleteMessage = async (id: string) => {
    if (!confirm('Are you sure you want to delete this message?') || !selectedChatId) return;
    try {
      const res = await fetch(`/api/requests/${requestId}/chat/${id}?chatId=${selectedChatId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) setMessages(prev => prev.filter(m => m.id !== id));
      else setError(data.error || 'Failed to delete message');
    } catch (err) {
      console.error(err);
      setError('Failed to delete message');
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Handle chat selection
  const handleChatSelect = async (chatId: string) => {
    setSelectedChatId(chatId);
    setChatDocId(chatId);
    setMessages([]); // Clear current messages
    setHasMore(true); // Reset pagination state
    setLastLoadedMessageId(null); // Reset pagination tracking
    setError(null); // Clear any errors
    
    // Load user info for the selected chat
    const selectedChat = chats.find(chat => chat.id === chatId);
    if (selectedChat) {
      loadUserInfo(selectedChat.id, selectedChat.student_id, selectedChat.tutor_id);
    }
    
    await loadMessages(undefined, chatId, false); // Load messages for selected chat
  };

  const handleScroll = useCallback(() => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      setIsAtBottom(scrollHeight - scrollTop - clientHeight < 100);
    }
  }, []);

  // ✅ Initialize chats when dialog opens
  useEffect(() => {
    if (!isOpen) {
      // Reset state when dialog closes
      setIsInitialized(false);
      setMessages([]);
      setChats([]);
      setSelectedChatId(null);
      setChatDocId(null);
      setHasMore(true);
      setLastLoadedMessageId(null);
      setError(null);
      setLoadedStudentInfo(null);
      setLoadedTutorInfo(null);
      setLoadingUserInfo(false);
      setChatUserInfo({});
      return;
    }

    const initializeChats = async () => {
      try {
        setLoading(true);
        await loadMessages(undefined, undefined, true);
      } catch (error) {
        console.error('Failed to initialize chats:', error);
        setError('Failed to load chats');
      }
    };

    initializeChats();
  }, [isOpen, loadMessages]);

  // ✅ Auto-select first chat when chats are loaded
  useEffect(() => {
    if (chats.length > 0 && !selectedChatId && isInitialized) {
      const firstChat = chats[0];
      setSelectedChatId(firstChat.id);
      setChatDocId(firstChat.id);
      // Load messages for the first chat
      loadMessages(undefined, firstChat.id, false);
    }
  }, [chats, selectedChatId, isInitialized, loadMessages]);

  // ✅ Setup realtime listener for new messages only (not for pagination)
  useEffect(() => {
    if (!isOpen || !chatDocId || !isInitialized) return;

    const messagesRef = collection(db, 'request_chats', chatDocId, 'messages');
    // Only listen for the most recent messages to avoid conflicts with pagination
    const q = query(messagesRef, orderBy('created_at', 'desc'), limit(10));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as ChatMessage[];
      
      // Only update if these are truly new messages (not from pagination)
      setMessages(prev => {
        const existingIds = new Set(prev.map(m => m.id));
        const trulyNewMessages = newMessages.filter(msg => !existingIds.has(msg.id));
        
        if (trulyNewMessages.length > 0) {
          // Add new messages to the end and sort by created_at
          const combined = [...prev, ...trulyNewMessages];
          return combined.sort((a, b) => {
            const aTime = a.created_at?.toDate ? a.created_at.toDate() : new Date(a.created_at);
            const bTime = b.created_at?.toDate ? b.created_at.toDate() : new Date(b.created_at);
            return aTime.getTime() - bTime.getTime();
          });
        }
        
        return prev;
      });
    }, (err) => {
      console.error('Realtime listener error:', err);
      setError('Failed to listen for new messages');
    });

    return () => unsubscribe();
  }, [chatDocId, isOpen, isInitialized]);

  // ✅ Auto scroll on new messages
  useEffect(() => {
    if (isAtBottom) scrollToBottom();
  }, [messages, isAtBottom]);

  const formatMessageTime = (timestamp: any) => {
    try {
      let date: Date;
      if (timestamp?.toDate) date = timestamp.toDate();
      else if (timestamp?._seconds) date = new Date(timestamp._seconds * 1000);
      else date = new Date(timestamp);
      return isNaN(date.getTime()) ? 'Invalid date' : format(date, 'MMM dd, HH:mm');
    } catch {
      return 'Invalid date';
    }
  };

  const getSenderInfo = (msg: ChatMessage) => {
    // Use chat-specific user info if available, otherwise fall back to props
    const currentChatInfo = selectedChatId ? chatUserInfo[selectedChatId] : null;
    const currentStudentInfo = currentChatInfo?.student || loadedStudentInfo || studentInfo;
    const currentTutorInfo = currentChatInfo?.tutor || loadedTutorInfo || tutorInfo;
    
    console.log("studentInfo: ", currentStudentInfo);
    console.log("tutorInfo: ", currentTutorInfo);
    
    switch (msg.sender_type) {
      case 'student':
        return { 
          name: currentStudentInfo?.nickname || 'Student', 
          icon: <User className="h-4 w-4" />, 
          color: 'bg-blue-100 text-blue-800' 
        };
      case 'tutor':
        return { 
          name: currentTutorInfo?.nickname || 'Tutor', 
          icon: <GraduationCap className="h-4 w-4" />, 
          color: 'bg-green-100 text-green-800' 
        };
      case 'admin':
        return { name: 'Admin', icon: <MessageCircle className="h-4 w-4" />, color: 'bg-purple-100 text-purple-800' };
      default:
        return { name: 'Unknown', icon: <User className="h-4 w-4" />, color: 'bg-muted text-foreground' };
    }
  };

  const renderMessageContent = (msg: ChatMessage) => {
    const type = msg.message_type?.toLowerCase();
    switch (type) {
      case MessageType.IMAGE:
        return <img src={getImageUrl(msg.message)} alt="img" className="max-w-full rounded-lg cursor-pointer" onClick={() => window.open(getImageUrl(msg.message), '_blank')} />;
      case MessageType.FILE:
        return <a href={getImageUrl(msg.message)} target="_blank" rel="noreferrer" className="text-blue-600 underline">Download File</a>;
      case MessageType.VOICE:
        return <audio controls className="w-full" src={getImageUrl(msg.message)} />;
      default:
        return <p className="text-sm whitespace-pre-wrap">{msg.message}</p>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[100vw] md:w-[80vw] lg:w-[80vw] sm:max-w-[80vw] max-w-none max-h-[98vh] overflow-x-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Chat: {requestTitle}
          </DialogTitle>
          {/* Show participant info when available */}
          {selectedChatId && chatUserInfo[selectedChatId] && (
            <div className="flex gap-4 text-sm text-muted-foreground">
              {chatUserInfo[selectedChatId].student && (
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <span>Student: {chatUserInfo[selectedChatId].student!.nickname}</span>
                </div>
              )}
              {chatUserInfo[selectedChatId].tutor && (
                <div className="flex items-center gap-1">
                  <GraduationCap className="h-3 w-3" />
                  <span>Tutor: {chatUserInfo[selectedChatId].tutor!.nickname}</span>
                </div>
              )}
            </div>
          )}
        </DialogHeader>

        {/* Chat Tabs */}
        {chats.length > 1 && (
          <div className="border-b">
            <div className="flex gap-2 p-2 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              {chats.map((chat) => (
                <Button
                  key={chat.id}
                  variant={selectedChatId === chat.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleChatSelect(chat.id)}
                  className="flex items-center gap-2 whitespace-nowrap flex-shrink-0"
                  disabled={loadingUserInfo}
                >
                  <User className="h-4 w-4" />
                  {loadingUserInfo && selectedChatId === chat.id ? (
                    <>
                      <LoadingSpinner size="sm" />
                      Loading...
                    </>
                  ) : (
                    <>
                      {chatUserInfo[chat.id]?.tutor?.nickname || `Tutor ${chat.tutor_id.slice(0, 8)}...`}
                      {chat.unread_count_tutor > 0 && (
                        <Badge variant="destructive" className="ml-1 text-xs">
                          {chat.unread_count_tutor}
                        </Badge>
                      )}
                    </>
                  )}
                </Button>
              ))}
            </div>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              {retryCount > 0 && retryCount < maxRetries && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    setError(null);
                    loadMessages(undefined, selectedChatId || undefined, true, 1);
                  }}
                  className="ml-2"
                >
                  Retry ({retryCount}/{maxRetries})
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}

        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto space-y-4 p-4 border rounded-lg" onScroll={handleScroll}>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-center">
                <LoadingSpinner />
                <p className="text-sm text-muted-foreground mt-2">
                  {retryCount > 0 ? `Retrying... (${retryCount}/${maxRetries})` : 'Loading messages...'}
                </p>
              </div>
            </div>
          ) : (
            <>
              {hasMore && (
                <div className="flex justify-center">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={loadMoreMessages} 
                    disabled={loadingMore || !selectedChatId}
                    className="flex items-center gap-2"
                  >
                    {loadingMore ? (
                      <>
                        <LoadingSpinner size="sm" />
                        Loading older messages...
                      </>
                    ) : (
                      <>
                        <ChevronUp className="h-4 w-4" />
                        Load older messages
                      </>
                    )}
                  </Button>
                </div>
              )}

              {messages.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">No messages yet.</div>
              ) : (
                messages.map((m) => {
                  const s = getSenderInfo(m);
                  return (
                    <div key={m.id} className={`flex ${m.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] ${m.sender_type === 'admin' ? 'order-2' : 'order-1'}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className={`text-xs ${s.color}`}>{s.icon}{s.name}</Badge>
                          <span className="text-xs text-muted-foreground">{formatMessageTime(m.created_at)}</span>
                        </div>
                        <div className={`rounded-lg p-3 ${m.sender_type === 'admin' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                          {editingMessage === m.id ? (
                            <div className="space-y-2">
                              <Textarea value={editText} onChange={(e) => setEditText(e.target.value)} className="min-h-[60px]" />
                              <div className="flex gap-2">
                                <Button size="sm" onClick={() => editMessage(m.id)}><Check className="h-4 w-4" /></Button>
                                <Button size="sm" variant="outline" onClick={() => { setEditingMessage(null); setEditText(''); }}><X className="h-4 w-4" /></Button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2 group">
                              {renderMessageContent(m)}
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button size="sm" variant="ghost" onClick={() => { setEditingMessage(m.id); setEditText(m.message); }} className="h-6 w-6 p-0"><Edit2 className="h-3 w-3" /></Button>
                                <Button size="sm" variant="ghost" onClick={() => deleteMessage(m.id)} className="h-6 w-6 p-0 text-red-600"><Trash2 className="h-3 w-3" /></Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        <div className="flex gap-2 p-4 border-t">
          <Textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 min-h-[60px]"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
          />
          <Button onClick={sendMessage} disabled={!newMessage.trim() || sending} className="self-end">
            {sending ? <LoadingSpinner size="sm" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
