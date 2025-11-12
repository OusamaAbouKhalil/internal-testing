'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useRequestManagementStore } from '@/stores/request-management-store';
import { Request, RequestFilters, RequestStatus, RequestType } from '@/types/request';
import { getRequestTypeLabel } from '@/types/request';
import { Tutor } from '@/types/tutor';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { RequestFileManagement } from '@/components/ui/request-file-management';
import { ChatDialog } from '@/components/chat-dialog';
import { RequestDetails } from '@/components/request-details';
import { StatusManagement } from '@/components/status-management';
import { AssignmentManagement } from '@/components/assignment-management';
import { TutorOffersManagement } from '@/components/tutor-offers-management';
import { combineDateAndTime, formatDate as formatDateUtil, formatDateWithTimezone } from '@/lib/date-utils';
import { getEffectiveStudentPrice } from '@/lib/pricing-utils';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  UserPlus, 
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Grid3X3,
  Grid2X2,
  Columns3,
  Columns4,
  MessageCircle,
  ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';
import { useFirebaseAuthStore } from '@/stores/firebase-auth-store';

function StudentInfoButton({ studentId }: { studentId?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [student, setStudent] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const { hasPermission } = useFirebaseAuthStore();
  useEffect(() => {
    if (isOpen && studentId && !student && !loading) {
      setLoading(true);
      fetch(`/api/students/${studentId}`)
        .then(res => res.json())
        .then(data => {
          if (data?.success) setStudent(data.student);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [isOpen, studentId, student, loading]);

  if (!studentId) return null;

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="h-8 px-2"
        title="View student details"
      >
        <UserPlus className="h-4 w-4 mr-1" />
        Student
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Student Details</DialogTitle>
          </DialogHeader>
          {loading ? (
            <div className="py-6"><LoadingSpinner /></div>
          ) : student ? (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Full name:</span><span className="font-medium">{student.full_name || 'N/A'}</span></div>
              {student.nickname && (
                <div className="flex justify-between"><span className="text-muted-foreground">Nickname:</span><span className="font-medium">@{student.nickname}</span></div>
              )}
              <div className="flex justify-between"><span className="text-muted-foreground">Email:</span><span className="font-medium break-all">{student.email || 'N/A'}</span></div>
              {(student.country_code || student.phone_number) && (
                <div className="flex justify-between"><span className="text-muted-foreground">Phone:</span><span className="font-medium">{(student.country_code || '')}{(student.phone_number || '')}</span></div>
              )}
              {(student.country || student.city) && (
                <div className="flex justify-between"><span className="text-muted-foreground">Location:</span><span className="font-medium">{student.city ? `${student.city}, ${student.country || ''}` : (student.country || 'N/A')}</span></div>
              )}
            </div>
          ) : (
            <div className="py-4 text-sm text-muted-foreground">No student found.</div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function ChatButton({ request }: { request: Request }) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [studentInfo, setStudentInfo] = useState<{ email: string; nickname: string } | null>(null);
  const [tutorInfo, setTutorInfo] = useState<{ email: string; nickname: string } | null>(null);
  const [loadingInfo, setLoadingInfo] = useState(false);

  // Fetch student and tutor info when chat opens
  useEffect(() => {
    if (isChatOpen && !studentInfo && !tutorInfo && !loadingInfo) {
      setLoadingInfo(true);
      
      const fetchInfo = async () => {
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
          setLoadingInfo(false);
        } catch (error) {
          console.error('Error fetching user info:', error);
        } finally {
          console.log("access here")
          setLoadingInfo(false);
        }
      };
      
      fetchInfo();
    }
  }, [isChatOpen, request.student_id, request.tutor_id, studentInfo, tutorInfo, loadingInfo]);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsChatOpen(true)}
        className="h-8 w-8 p-0"
        title="Open chat"
      >
        <MessageCircle className="h-4 w-4" />
      </Button>
      
      <ChatDialog
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        requestId={request.id}
        requestTitle={request.label}
        studentInfo={studentInfo || undefined}
        tutorInfo={tutorInfo || undefined}
      />
    </>
  );
}

function RequestCard({ request }: { request: Request }) {
  const { hasPermission } = useFirebaseAuthStore();
	const formatDate = (value: any) => {
    console.log("date is: " + value)
		if (value === undefined || value === null) return 'Not set';
		try {
			let date: Date | null = null;

			// Firestore Timestamp instance with toDate()
			if (value && typeof value.toDate === 'function') {
				date = value.toDate();
			}
			// Firestore-like object with seconds/_seconds and optional nanoseconds
			else if (value && typeof value === 'object' && (
					('seconds' in value) || ('_seconds' in value)
				)) {
				const seconds = (value.seconds ?? value._seconds) as number;
				const nanos = (value.nanoseconds ?? value._nanoseconds ?? 0) as number;
				if (typeof seconds === 'number') {
					date = new Date(seconds * 1000 + Math.floor(nanos / 1e6));
				}
			}
			// Native Date
			else if (value instanceof Date) {
				date = value;
			}
			// Numeric epoch (ms or seconds)
			else if (typeof value === 'number') {
				// Heuristic: < 1e12 => seconds, else milliseconds
				const ms = value < 1e12 ? value * 1000 : value;
				date = new Date(ms);
			}
			// String input (ISO, RFC, or numeric string)
			else if (typeof value === 'string') {
				const trimmed = value.trim();
				if (trimmed === '') return 'Not set';
				// If purely numeric (or numeric with decimal), treat as epoch
				if (/^[-+]?\d+(?:\.\d+)?$/.test(trimmed)) {
					const num = parseFloat(trimmed);
					const ms = num < 1e12 ? num * 1000 : num;
					date = new Date(ms);
				} else {
					date = new Date(trimmed);
				}
			}

			if (!date || isNaN(date.getTime())) return 'Invalid date';
			return format(date, 'MMM dd, yyyy');
		} catch {
			return 'Invalid date';
		}
	};

  const formatDeadline = (request: Request) => {
    try {
      if (request.deadline) {
        const rawDeadline: any = request.deadline;
        const trimmedDeadline = typeof rawDeadline === 'string' ? rawDeadline.trim() : rawDeadline;

        // Case 1: deadline is time-only like "HH:MM" → combine with request.date
        if (typeof trimmedDeadline === 'string' && /^\d{1,2}:\d{2}$/.test(trimmedDeadline)) {
          const dateString = request.date;
          console.log("date string is: " + dateString)
          if (dateString && typeof dateString === 'string') {
            const combined = combineDateAndTime(dateString, trimmedDeadline);
            if (request.timezone) {
              return formatDateWithTimezone(combined, 'MMM dd, yyyy HH:mm', request.timezone);
            }
            return format(combined, 'MMM dd, yyyy HH:mm');
          } else {
            console.log("date string is not: " + dateString)
          }
          // No valid date to combine with → just show time
          return trimmedDeadline;
        }

        // Else: parse deadline as a date/time value
        let parsed: Date | null = null;
        if (typeof rawDeadline === 'string') {
          // numeric epoch string
          if (/^[-+]?\d+(?:\.\d+)?$/.test(trimmedDeadline)) {
            const num = parseFloat(trimmedDeadline);
            const ms = num < 1e12 ? num * 1000 : num;
            parsed = new Date(ms);
          } else {
            parsed = new Date(trimmedDeadline);
          }
        } else if (typeof rawDeadline === 'number') {
          const ms = rawDeadline < 1e12 ? rawDeadline * 1000 : rawDeadline;
          parsed = new Date(ms);
        } else if (rawDeadline && typeof rawDeadline.toDate === 'function') {
          parsed = rawDeadline.toDate();
        } else if (rawDeadline instanceof Date) {
          parsed = rawDeadline;
        }

        if (!parsed || isNaN(parsed.getTime())) {
          return 'Invalid date';
        }

        // Case 2: deadline is a full date → display time only
        if (request.timezone) {
          // Use Intl for timezone, extracting time only (HH:mm 24h)
          const parts = new Intl.DateTimeFormat('en-US', {
            timeZone: request.timezone,
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          }).format(parsed);
          return parts;
        }
        return format(parsed, 'HH:mm');
      }
      return 'Not set';
    } catch (error) {
      console.error('Error formatting deadline:', error);
      return 'Invalid date';
    }
  };

  return (
    <Card 
      id={`request-${request.id}`}
      className="hover:shadow-md transition-shadow cursor-pointer min-w-0"
    >
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start gap-2">
          <CardTitle className="text-lg line-clamp-2 min-w-0 flex-1">
            <a 
              href={`/dashboard/requests/${request.id}`}
              className="hover:text-blue-600 transition-colors cursor-pointer"
              title="View request details"
            >
              {request.label}
            </a>
          </CardTitle>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(`/dashboard/requests/${request.id}`, '_blank')}
              className="h-8 w-8 p-0"
              title="Open in new tab"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
            <ChatButton request={request} />
            <RequestActions request={request} />
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Badge variant="outline" className="text-xs">
            {getRequestTypeLabel(request.assistance_type)}
          </Badge>
          <Badge className={`text-xs ${getRequestStatusColor(request.request_status)}`}>
            {getRequestStatusLabel(request.request_status)}
          </Badge>
          {/* Student quick view */}
          <StudentInfoButton studentId={request.student_id} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">

          {request.cancel_reason && (
            <div className="flex justify-between text-sm gap-2">
              <span className="text-muted-foreground flex-shrink-0">Cancel Reason:</span>
              <span className="font-medium text-right ">{request.cancel_reason}</span>
            </div>
          )}

          <div className="flex justify-between text-sm gap-2">
            <span className="text-muted-foreground flex-shrink-0">Type:</span>
            <span className="font-medium text-right ">
              {(request.exam_type && request.exam_type.toLowerCase() === 'sos') ? 'Q&A' : (request.exam_type || 'N/A')}
            </span>
          </div>
          <div className="flex justify-between text-sm gap-2">
            <span className="text-muted-foreground flex-shrink-0">Subject:</span>
            <span className="font-medium text-right ">{request.subject}</span>
          </div>
          <div className="flex justify-between text-sm gap-2">
            <span className="text-muted-foreground flex-shrink-0">Sub Subject:</span>
            <span className="font-medium text-right ">{request.sub_subject}</span>
          </div>
          <div className="flex justify-between text-sm gap-2">
            <span className="text-muted-foreground flex-shrink-0">Language:</span>
            <span className="font-medium text-right ">{request.language}</span>
          </div>
          <div className="flex justify-between text-sm gap-2">
            <span className="text-muted-foreground flex-shrink-0">Country:</span>
            <span className="font-medium text-right ">{request.country}</span>
          </div>
        </div>
        
        <div className="border-t pt-3">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              {/* Show Student Price only if user has 'requests:request_student_price' permission */}
              {hasPermission('requests', 'request_student_price') ? (() => {
                const effectivePrice = getEffectiveStudentPrice({
                  student_price: request.student_price,
                  tutor_price: request.tutor_price,
                  country: request.country,
                  min_price: request.min_price
                });
                return (
                  <>
                    <span className="text-muted-foreground">Student Price:</span>
                    <div className="font-semibold text-green-600">
                      ${effectivePrice.price}
                      {effectivePrice.isOverride && (
                        <span className="ml-1 text-xs text-muted-foreground">(override)</span>
                      )}
                    </div>
                  </>
                );
              })() : (
                <>
                  <span className="text-muted-foreground">Student Price:</span>
                  <div className="font-semibold text-green-600">Hidden</div>
                </>
              )}
            </div>
            <div>
              {/* Show Tutor Price only if user has 'requests:request_tutor_price' permission */}
              {hasPermission('requests', 'request_tutor_price') ? (
                <>
                  <span className="text-muted-foreground">Tutor Price:</span>
                  <div className="font-semibold text-blue-600">${request.tutor_price || '0'}</div>
                </>
              ) : (
                <>
                  <span className="text-muted-foreground">Tutor Price:</span>
                  <div className="font-semibold text-blue-600">Hidden</div>
                </>
              )}
            </div>
          </div>
        </div>
        
        <div className="border-t pt-3">
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Duration:</span>
              <span className="font-medium">{request.duration ? `${request.duration}` : 'N/A'}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-muted-foreground">Deadline:</span>
              <span className="font-medium">{formatDeadline(request)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created:</span>
              <span className="font-medium">{formatDate(request.created_at)}</span>
            </div>
          </div>
        </div>
        
        {request.description && (
          <div className="border-t pt-3">
            <div className="text-sm">
              <span className="text-muted-foreground">Description:</span>
              <p className="mt-1 text-sm line-clamp-2">{request.description}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RequestActions({ request }: { request: Request }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState('details');
  const [descriptionValue, setDescriptionValue] = useState<string>(request.description || '');
  
  const {
    changeRequestStatus,
    assignTutor,
    assignStudent,
    setTutorPrice,
    setStudentPrice,
    cancelRequest,
    completeRequest,
    fetchTutorOffers,
    tutorOffers,
    loading,
    updateRequest
  } = useRequestManagementStore();

  const handleStatusChange = async (status: string, reason?: string) => {
    try {
      await changeRequestStatus(request.id, status, reason);
      setIsOpen(false);
    } catch (error) {
      console.error('Error changing status:', error);
    }
  };

  const handleAssignTutor = async (tutorId: string, tutorPrice: string, studentPrice?: string, minPrice?: string) => {
    try {
      await assignTutor(request.id, tutorId, tutorPrice, studentPrice, minPrice);
      setIsOpen(false);
    } catch (error) {
      console.error('Error assigning tutor:', error);
    }
  };

  // Sync local description when request changes
  useEffect(() => {
    setDescriptionValue(request.description || '');
  }, [request.description]);

  const handleSaveDescription = async () => {
    try {
      await updateRequest(request.id, { description: descriptionValue });
    } catch (error) {
      console.error('Error updating description:', error);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchTutorOffers(request.id);
    }
  }, [isOpen, request.id, fetchTutorOffers]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm"
          data-request-id={request.id}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[100vw] md:w-[80vw] lg:w-[80vw] sm:max-w-[80vw] max-w-none max-h-[98vh] overflow-x-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Manage Request: {request.label}</DialogTitle>
        </DialogHeader>
        
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="status">Status</TabsTrigger>
            <TabsTrigger value="assignment">Assignment</TabsTrigger>
            <TabsTrigger value="offers">Tutor Offers</TabsTrigger>
          </TabsList>
          
          <TabsContent value="details" className="space-y-4">
            <RequestDetails request={request} />
            <div className="space-y-2">
              <Label className="text-sm">Edit Description</Label>
              <Textarea
                value={descriptionValue}
                onChange={(e) => setDescriptionValue(e.target.value)}
                rows={4}
                placeholder="Update request description"
              />
              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={handleSaveDescription}
                  disabled={loading || (descriptionValue || '') === (request.description || '')}
                >
                  Save Description
                </Button>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="status" className="space-y-4">
            <StatusManagement 
              request={request} 
              onStatusChange={handleStatusChange}
              loading={loading}
            />
          </TabsContent>
          
          <TabsContent value="assignment" className="space-y-4">
            <AssignmentManagement 
              request={request}
              onAssignTutor={handleAssignTutor}
              loading={loading}
            />
          </TabsContent>
          
          <TabsContent value="offers" className="space-y-4">
            <TutorOffersManagement 
              request={request}
              offers={tutorOffers}
              loading={loading}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}




function getRequestStatusLabel(status: string): string {
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
}

function getRequestStatusColor(status: string): string {
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
}

export default function RequestsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const {
    requests,
    loading,
    error,
    fetchRequests,
    createRequest,
    fetchNextPage,
    fetchPreviousPage,
    goToPage,
    setPageSize,
    currentPage,
    pageSize,
    hasNextPage,
    hasPreviousPage,
    totalPages,
    totalItems
  } = useRequestManagementStore();

  // Initialize filters from URL params
  const getInitialFilters = useCallback((): RequestFilters => {
    const initialFilters: RequestFilters = {};
    if (searchParams.get('request_status')) {
      initialFilters.request_status = searchParams.get('request_status') || undefined;
    }
    if (searchParams.get('student_id')) {
      initialFilters.student_id = searchParams.get('student_id') || undefined;
    }
    if (searchParams.get('max_rating')) {
      initialFilters.max_rating = searchParams.get('max_rating') || undefined;
    }
    return initialFilters;
  }, [searchParams]);

  const [filters, setFilters] = useState<RequestFilters>(getInitialFilters());
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [columnsCount, setColumnsCount] = useState(3);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const filterChangeSourceRef = useRef<'url' | 'manual'>('manual');

  // Create dynamic request type options from RequestType enum
  const requestTypeOptions = Object.values(RequestType).map(type => ({
    value: type === RequestType.SOS ? 'SOS' : type,
    label: getRequestTypeLabel(type)
  }));

  // Debounce search term (500ms)
  useEffect(() => {
    const t = setTimeout(() => {
      filterChangeSourceRef.current = 'manual';
      setFilters(prev => {
        const next = { ...prev } as any;
        if (debouncedSearchTerm) {
          next.search = debouncedSearchTerm;
        } else {
          delete next.search;
        }
        return next;
      });
    }, 500);
    return () => clearTimeout(t);
  }, [debouncedSearchTerm]);

  useEffect(() => {
    // Initial load - use filters from URL params
    if (isInitialLoad) {
      filterChangeSourceRef.current = 'url';
      const initialFilters = getInitialFilters();
      if (Object.keys(initialFilters).length > 0) {
        setFilters(initialFilters);
        fetchRequests(initialFilters, { page: 1, pageSize });
      } else {
        fetchRequests({}, { page: 1, pageSize });
      }
      setIsInitialLoad(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update filters when URL params change (but not when user manually changes filters)
  useEffect(() => {
    if (!isInitialLoad && filterChangeSourceRef.current !== 'manual') {
      filterChangeSourceRef.current = 'url';
      const urlFilters = getInitialFilters();
      const urlFiltersStr = JSON.stringify(urlFilters);
      const currentFiltersStr = JSON.stringify(filters);
      if (urlFiltersStr !== currentFiltersStr) {
        setFilters(urlFilters);
        setSearchTerm('');
        setDebouncedSearchTerm('');
        fetchRequests(urlFilters, { page: 1, pageSize });
      }
      // Reset ref after processing URL change
      setTimeout(() => {
        filterChangeSourceRef.current = 'manual';
      }, 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Fetch requests when filters change (only for manual changes)
  useEffect(() => {
    if (!isInitialLoad && filterChangeSourceRef.current === 'manual') {
      // Reset to page 1 and clear cache when filters change
      setPageSize(pageSize); // This clears the cache
      fetchRequests(filters, { page: 1, pageSize });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const handleFilterChange = (key: keyof RequestFilters, value: string) => {
    filterChangeSourceRef.current = 'manual';
    setFilters(prev => {
      const newFilters = { ...prev };
      if (value) {
        newFilters[key] = value;
      } else {
        delete newFilters[key];
      }
      return newFilters;
    });
  };

  const handleClearFilters = () => {
    setFilters({});
    setSearchTerm('');
    setDebouncedSearchTerm('');
    // Clear URL parameters
    router.push('/dashboard/requests');
  };

  const handleNextPage = () => {
    fetchNextPage(filters);
  };

  const handlePreviousPage = () => {
    fetchPreviousPage(filters);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    fetchRequests(filters);
  };

  const handleGoToPage = (page: number) => {
    goToPage(page, filters);
  };

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const total = totalPages || 0;
    if (total <= 0) return [1];
    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
      return pages;
    }
    // Always show first and last
    pages.push(1);
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(total - 1, currentPage + 1);
    if (start > 2) pages.push('...');
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < total - 1) pages.push('...');
    pages.push(total);
    return pages;
  };

  const handleCreateRequest = async (requestData: any) => {
    try {
      await createRequest(requestData);
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Error creating request:', error);
    }
  };

  const getGridClass = () => {
    switch (columnsCount) {
      case 2: return 'grid-cols-1 md:grid-cols-2';
      case 3: return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
      case 4: return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
      case 5: return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5';
      default: return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
    }
  };

  if (loading && requests.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Request Management</h1>
        <div className="flex items-center gap-2">
          {/* Column Count Selector */}
          <div className="flex items-center gap-1 border rounded-lg p-1">
            <Button
              variant={columnsCount === 2 ? "default" : "ghost"}
              size="sm"
              onClick={() => setColumnsCount(2)}
              className="h-8 w-8 p-0"
            >
              <Grid2X2 className="h-4 w-4" />
            </Button>
            <Button
              variant={columnsCount === 3 ? "default" : "ghost"}
              size="sm"
              onClick={() => setColumnsCount(3)}
              className="h-8 w-8 p-0"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={columnsCount === 4 ? "default" : "ghost"}
              size="sm"
              onClick={() => setColumnsCount(4)}
              className="h-8 w-8 p-0"
            >
              <Columns4 className="h-4 w-4" />
            </Button>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Request
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Filters</CardTitle>
            {Object.keys(filters).length > 0 && (
              <Button variant="outline" size="sm" onClick={handleClearFilters}>
                Clear Filters
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Search</Label>
              <Input
                placeholder="Search requests..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setDebouncedSearchTerm(e.target.value);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                key={`type-${filters.assistance_type || 'all'}`}
                value={filters.assistance_type || 'all'}
                onValueChange={(value) => {
                  handleFilterChange('assistance_type', value === 'all' ? '' : value);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {requestTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                key={`status-${filters.request_status || 'all'}`}
                value={filters.request_status || 'all'}
                onValueChange={(value) => {
                  handleFilterChange('request_status', value === 'all' ? '' : value);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="pending_payment">Pending Payment</SelectItem>
                  <SelectItem value="ongoing">Ongoing</SelectItem>
                  <SelectItem value="tutor_completed">Tutor Completed</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Rating (Stars)</Label>
              <Select
                key={`rating-${filters.max_rating || 'all'}`}
                value={filters.max_rating || 'all'}
                onValueChange={(value) => {
                  handleFilterChange('max_rating', value === 'all' ? '' : value);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All ratings" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All ratings</SelectItem>
                  <SelectItem value="1">1 star or less</SelectItem>
                  <SelectItem value="2">2 stars or less</SelectItem>
                  <SelectItem value="3">3 stars or less</SelectItem>
                  <SelectItem value="4">4 stars or less</SelectItem>
                  <SelectItem value="5">5 stars or less</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Country filter removed as requested */}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {/* Header with Pagination Controls */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full">
                <h2 className="text-xl font-semibold">
                  Requests
                  <span className="ml-2 text-sm text-muted-foreground font-normal">
                    Showing {requests.length > 0 ? ((currentPage - 1) * pageSize + 1) : 0} - {Math.min(currentPage * pageSize, totalItems || 0)} of {totalItems || 0}
                  </span>
                </h2>
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Items per page:</Label>
                  <Select
                    value={pageSize.toString()}
                    onValueChange={(value) => handlePageSizeChange(parseInt(value))}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="30">30</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Page Numbers */}
              <div className="flex items-center justify-center gap-1 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreviousPage}
                  disabled={!hasPreviousPage || loading}
                  className="mr-2"
                >
                  Previous
                </Button>
                
                {getPageNumbers().map((pageNum, index) => {
                  if (pageNum === '...') {
                    return (
                      <span key={`ellipsis-${index}`} className="px-2 text-muted-foreground">
                        ...
                      </span>
                    );
                  }
                  
                  const isCurrentPage = pageNum === currentPage;
                  return (
                    <Button
                      key={pageNum}
                      variant={isCurrentPage ? "default" : "outline"}
                      size="sm"
                      onClick={() => !isCurrentPage && handleGoToPage(pageNum as number)}
                      disabled={loading}
                      className={isCurrentPage ? "font-bold" : ""}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={!hasNextPage || loading}
                  className="ml-2"
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {requests.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">No requests found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="w-full overflow-hidden">
            <div className={`grid ${getGridClass()} gap-4 min-w-0`}>
              {requests.map((request) => (
                <RequestCard key={request.id} request={request} />
              ))}
            </div>
          </div>
        )}
        
        {/* Footer Pagination Controls */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    Showing {requests.length > 0 ? ((currentPage - 1) * pageSize + 1) : 0} - {Math.min(currentPage * pageSize, totalItems || 0)} of {totalItems || 0}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Items per page:</Label>
                  <Select
                    value={pageSize.toString()}
                    onValueChange={(value) => handlePageSizeChange(parseInt(value))}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="30">30</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Page Numbers */}
              <div className="flex items-center justify-center gap-1 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreviousPage}
                  disabled={!hasPreviousPage || loading}
                  className="mr-2"
                >
                  Previous
                </Button>
                
                {getPageNumbers().map((pageNum, index) => {
                  if (pageNum === '...') {
                    return (
                      <span key={`ellipsis-${index}`} className="px-2 text-muted-foreground">
                        ...
                      </span>
                    );
                  }
                  
                  const isCurrentPage = pageNum === currentPage;
                  return (
                    <Button
                      key={pageNum}
                      variant={isCurrentPage ? "default" : "outline"}
                      size="sm"
                      onClick={() => !isCurrentPage && handleGoToPage(pageNum as number)}
                      disabled={loading}
                      className={isCurrentPage ? "font-bold" : ""}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={!hasNextPage || loading}
                  className="ml-2"
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

