'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useRequestManagementStore } from '@/stores/request-management-store';
import { Request } from '@/types/request';
import { getRequestTypeLabel } from '@/types/request';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ChatDialog } from '@/components/chat-dialog';
import { 
  ArrowLeft,
  MessageCircle,
  AlertCircle,
  User,
  GraduationCap
} from 'lucide-react';
import { RequestDetails } from '@/components/request-details';
import { StatusManagement } from '@/components/status-management';
import { AssignmentManagement } from '@/components/assignment-management';
import { TutorOffersManagement } from '@/components/tutor-offers-management';

export default function RequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const requestId = params.id as string;
  
  const {
    requests,
    loading,
    error,
    fetchRequests,
    changeRequestStatus,
    assignTutor,
    setTutorPrice,
    setStudentPrice,
    fetchTutorOffers,
    tutorOffers
  } = useRequestManagementStore();

  const [request, setRequest] = useState<Request | null>(null);
  const [selectedTab, setSelectedTab] = useState('details');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [studentInfo, setStudentInfo] = useState<{ email: string; nickname: string } | null>(null);
  const [tutorInfo, setTutorInfo] = useState<{ email: string; nickname: string } | null>(null);
  const [loadingUserInfo, setLoadingUserInfo] = useState(false);

  // Find the request from the store
  useEffect(() => {
    if (requestId && requests.length > 0) {
      const foundRequest = requests.find(req => req.id === requestId);
      if (foundRequest) {
        setRequest(foundRequest);
      }
    }
  }, [requestId, requests]);

  // Load requests if not already loaded
  useEffect(() => {
    if (requests.length === 0 && !loading) {
      fetchRequests({});
    }
  }, [requests.length, loading, fetchRequests]);

  // Load user information when request is found
  useEffect(() => {
    if (request && !studentInfo && !tutorInfo && !loadingUserInfo) {
      setLoadingUserInfo(true);
      
      const fetchUserInfo = async () => {
        try {
          const promises = [];
          
          if (request.student_id) {
            promises.push(
              fetch(`/api/students/${request.student_id}`)
                .then(res => res.json())
                .then(data => data.success ? data.student : null)
            );
          } else {
            promises.push(Promise.resolve(null));
          }
          
          if (request.tutor_id) {
            promises.push(
              fetch(`/api/tutors/${request.tutor_id}`)
                .then(res => res.json())
                .then(data => data.success ? data.tutor : null)
            );
          } else {
            promises.push(Promise.resolve(null));
          }
          
          const [student, tutor] = await Promise.all(promises);
          
          if (student) {
            setStudentInfo({
              email: student.email || 'N/A',
              nickname: student.nickname || 'N/A'
            });
          }
          
          if (tutor) {
            setTutorInfo({
              email: tutor.email || 'N/A',
              nickname: tutor.nickname || 'N/A'
            });
          }
        } catch (error) {
          console.error('Error fetching user info:', error);
        } finally {
          setLoadingUserInfo(false);
        }
      };
      
      fetchUserInfo();
    }
  }, [request, studentInfo, tutorInfo, loadingUserInfo]);

  // Load tutor offers when component mounts
  useEffect(() => {
    if (request) {
      fetchTutorOffers(request.id);
    }
  }, [request, fetchTutorOffers]);

  const handleStatusChange = async (status: string, reason?: string) => {
    if (!request) return;
    
    try {
      await changeRequestStatus(request.id, status, reason);
      // Refresh the request data
      fetchRequests({});
    } catch (error) {
      console.error('Error changing status:', error);
    }
  };

  const handleAssignTutor = async (tutorId: string, tutorPrice: string) => {
    if (!request) return;
    
    try {
      await assignTutor(request.id, tutorId, tutorPrice);
      // Refresh the request data
      fetchRequests({});
    } catch (error) {
      console.error('Error assigning tutor:', error);
    }
  };

  const handleSetPrices = async (tutorPrice?: string, studentPrice?: string) => {
    if (!request) return;
    
    try {
      await setTutorPrice(request.id, tutorPrice ? tutorPrice : '');
      await setStudentPrice(request.id, studentPrice ? studentPrice : '');
      // Refresh the request data
      fetchRequests({});
    } catch (error) {
      console.error('Error setting prices:', error);
    }
  };

  const getRequestStatusColor = (status: string): string => {
    switch (status?.toLowerCase()) {
      case 'new':
      case 'pending':
        return 'bg-muted text-foreground';
      case 'pending_payment':
        return 'bg-blue-100 text-blue-800';
      case 'ongoing':
        return 'bg-purple-100 text-purple-800';
      case 'tutor_completed':
        return 'bg-cyan-100 text-cyan-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-muted text-foreground';
    }
  };

  const getRequestStatusLabel = (status: string): string => {
    switch (status?.toLowerCase()) {
      case 'new':
        return 'Waiting for Bids';
      case 'pending':
        return 'Waiting for Bids';
      case 'pending_payment':
        return 'Pending Payment';
      case 'ongoing':
        return 'Ongoing';
      case 'tutor_completed':
        return 'Tutor Completed';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  if (loading && !request) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="space-y-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Request not found</AlertDescription>
        </Alert>
        <Button onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{request.label}</h1>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="text-xs">
                {getRequestTypeLabel(request.assistance_type)}
              </Badge>
              <Badge className={`text-xs ${getRequestStatusColor(request.request_status)}`}>
                {getRequestStatusLabel(request.request_status)}
              </Badge>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* User Info Display */}
          {loadingUserInfo ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <LoadingSpinner size="sm" />
              Loading user info...
            </div>
          ) : (
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {studentInfo && (
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  <span>Student: {studentInfo.nickname}</span>
                </div>
              )}
              {tutorInfo && (
                <div className="flex items-center gap-1">
                  <GraduationCap className="h-4 w-4" />
                  <span>Tutor: {tutorInfo.nickname}</span>
                </div>
              )}
            </div>
          )}
          
          <Button onClick={() => setIsChatOpen(true)}>
            <MessageCircle className="h-4 w-4 mr-2" />
            Open Chat
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <Card>
        <CardContent className="p-6">
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="status">Status</TabsTrigger>
              <TabsTrigger value="assignment">Assignment</TabsTrigger>
              <TabsTrigger value="offers">Tutor Offers</TabsTrigger>
            </TabsList>
            
            <TabsContent value="details" className="space-y-4 mt-6">
              <RequestDetails request={request} />
            </TabsContent>
            
            <TabsContent value="status" className="space-y-4 mt-6">
              <StatusManagement 
                request={request} 
                onStatusChange={handleStatusChange}
                loading={loading}
              />
            </TabsContent>
            
            <TabsContent value="assignment" className="space-y-4 mt-6">
              <AssignmentManagement 
                request={request}
                onAssignTutor={handleAssignTutor}
                onSetPrices={handleSetPrices}
                loading={loading}
              />
            </TabsContent>
            
            <TabsContent value="offers" className="space-y-4 mt-6">
              <TutorOffersManagement 
                request={request}
                offers={tutorOffers}
                loading={loading}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Chat Dialog */}
      <ChatDialog
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        requestId={request.id}
        requestTitle={request.label}
        studentInfo={studentInfo || undefined}
        tutorInfo={tutorInfo || undefined}
      />
    </div>
  );
}
