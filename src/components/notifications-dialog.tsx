'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Bell, 
  X, 
  MessageCircle, 
  User, 
  GraduationCap,
  Clock,
  Check,
  CheckCheck,
  FileText,
  ExternalLink,
  Settings
} from 'lucide-react';
import { format } from 'date-fns';
import { useRealtimeNotificationStore } from '@/stores/realtime-notification-store';
import { useRequestManagementStore } from '@/stores/request-management-store';
import { SoundSettings } from '@/components/sound-settings';

interface NotificationsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationsDialog({ isOpen, onClose }: NotificationsDialogProps) {
  const router = useRouter();
  const { 
    notifications, 
    unseenCount, 
    isLoading, 
    error, 
    markAsSeen, 
    markAllAsSeen 
  } = useRealtimeNotificationStore();

  const { fetchRequestById, requests } = useRequestManagementStore();

  const [requestData, setRequestData] = useState<Record<string, any>>({});
  const [loadingRequests, setLoadingRequests] = useState<Set<string>>(new Set());
  const [isMarkingAllAsSeen, setIsMarkingAllAsSeen] = useState(false);
  const [isSoundSettingsOpen, setIsSoundSettingsOpen] = useState(false);

  // Fetch request data using the request management store
  const fetchRequestData = async (requestId: string) => {
    if (requestData[requestId] || loadingRequests.has(requestId)) return;
    
    setLoadingRequests(prev => new Set(prev).add(requestId));
    
    try {
      const request = await fetchRequestById(requestId);
      if (request) {
        setRequestData(prev => ({
          ...prev,
          [requestId]: request
        }));
      }
    } catch (error) {
      console.error('Error fetching request data:', error);
    } finally {
      setLoadingRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
    }
  };

  // Fetch request data when notifications change
  useEffect(() => {
    notifications.forEach(notification => {
      if (notification.requestId && !requestData[notification.requestId]) {
        fetchRequestData(notification.requestId);
      }
    });
  }, [notifications, requestData]);

  const handleNotificationClick = async (notification: any) => {
    // Mark as seen first
    if (!notification.seen) {
      await markAsSeen(notification.id);
    }

    // Open request detail page in new tab if it exists
    if (notification.requestId) {
      window.open(`/dashboard/requests/${notification.requestId}`, '_blank');
      onClose();
    }
  };

  const handleMarkAllAsSeen = async () => {
    setIsMarkingAllAsSeen(true);
    try {
      await markAllAsSeen();
    } catch (error) {
      console.error('Error marking all as seen:', error);
    } finally {
      setIsMarkingAllAsSeen(false);
    }
  };

  const formatNotificationTime = (timestamp: any) => {
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

  const getSenderIcon = (senderType: string) => {
    switch (senderType) {
      case 'student':
        return <User className="h-4 w-4" />;
      case 'tutor':
        return <GraduationCap className="h-4 w-4" />;
      case 'admin':
        return <MessageCircle className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const getSenderColor = (senderType: string) => {
    switch (senderType) {
      case 'student':
        return 'bg-blue-100 text-blue-800';
      case 'tutor':
        return 'bg-green-100 text-green-800';
      case 'admin':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-muted text-foreground';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[90vw] md:w-[500px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
              {unseenCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {unseenCount}
                </Badge>
              )}
            </DialogTitle>
            {unseenCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllAsSeen}
                disabled={isMarkingAllAsSeen}
                className="flex items-center gap-1"
              >
                {isMarkingAllAsSeen ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    Marking...
                  </>
                ) : (
                  <>
                    <CheckCheck className="h-4 w-4" />
                    Mark all as seen
                  </>
                )}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSoundSettingsOpen(true)}
              className="flex items-center gap-1"
            >
              <Settings className="h-4 w-4" />
              Sound
            </Button>
          </div>
        </DialogHeader>

        {error && (
          <div className="text-red-600 text-sm p-2 bg-red-50 rounded">
            {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto pr-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No notifications yet.
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => {
                const request = notification.requestId ? requestData[notification.requestId] : null;
                const isLoadingRequest = notification.requestId ? loadingRequests.has(notification.requestId) : false;
                
                return (
                  <div
                    key={notification.id}
                    className={`p-3 rounded-lg border transition-colors cursor-pointer hover:shadow-md ${
                      notification.seen 
                        ? 'bg-muted border-border hover:bg-muted/80' 
                        : 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-full ${getSenderColor(notification.senderType)}`}>
                        {getSenderIcon(notification.senderType)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className={`text-xs ${getSenderColor(notification.senderType)}`}>
                            {notification.senderNickname || notification.senderName}
                          </Badge>
                          {!notification.seen && (
                            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                          )}
                        </div>
                        
                        <p className="text-sm text-foreground mb-2">
                          {notification.content}
                        </p>

                        {/* Request Information */}
                        {notification.requestId && (
                          <div className="mb-2 p-2 bg-muted rounded-md">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <FileText className="h-3 w-3" />
                                <span className="font-medium">Request:</span>
                                {isLoadingRequest ? (
                                  <span className="text-muted-foreground">Loading...</span>
                                ) : request ? (
                                  <span className="text-foreground">
                                    {request.subject || request.title || `Request #${notification.requestId.slice(-8)}`}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">Request #{notification.requestId.slice(-8)}</span>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation(); // Prevent triggering the main click handler
                                  window.open(`/dashboard/requests/${notification.requestId}`, '_blank');
                                }}
                              >
                                <ExternalLink className="h-3 w-3 mr-1" />
                                View
                              </Button>
                            </div>
                            {request && (
                              <div className="mt-1 text-xs text-muted-foreground">
                                {request.assistance_type && (
                                  <span className="mr-2">Type: {request.assistance_type}</span>
                                )}
                                {request.country && (
                                  <span>Country: {request.country}</span>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{formatNotificationTime(notification.timestamp || notification.createdAt)}</span>
                          {notification.seen && (
                            <Check className="h-3 w-3 text-green-600" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
      
      {/* Sound Settings Modal */}
      <SoundSettings 
        isOpen={isSoundSettingsOpen} 
        onClose={() => setIsSoundSettingsOpen(false)} 
      />
    </Dialog>
  );
}
