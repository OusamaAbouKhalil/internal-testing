'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
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
  const formatDate = (value: any) => {
    if (!value) return 'Not set';
    
    try {
      let date: Date;
      if (value.toDate && typeof value.toDate === 'function') {
        date = value.toDate();
      } else if (typeof value === 'string' || typeof value === 'number') {
        date = new Date(value);
      } else {
        return 'Invalid date';
      }
      
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
      
      return format(date, 'MMM dd, yyyy');
    } catch (error) {
      console.error('Error formatting date:', error, value);
      return 'Invalid date';
    }
  };

  const formatDeadline = (request: Request) => {
    try {
      // If we have both date and time, combine them
      if (request.date && request.deadline) {
        const combinedDate = combineDateAndTime(request.date, request.deadline);
        // Use timezone if available, otherwise use local formatting
        if (request.timezone) {
          return formatDateWithTimezone(combinedDate, 'MMM dd, yyyy HH:mm', request.timezone);
        }
        return format(combinedDate, 'MMM dd, yyyy HH:mm');
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
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <div className="flex justify-between text-sm gap-2">
            <span className="text-muted-foreground flex-shrink-0">Subject:</span>
            <span className="font-medium text-right truncate">{request.subject}</span>
          </div>
          <div className="flex justify-between text-sm gap-2">
            <span className="text-muted-foreground flex-shrink-0">Sub Subject:</span>
            <span className="font-medium text-right truncate">{request.sub_subject}</span>
          </div>
          <div className="flex justify-between text-sm gap-2">
            <span className="text-muted-foreground flex-shrink-0">Language:</span>
            <span className="font-medium text-right truncate">{request.language}</span>
          </div>
          <div className="flex justify-between text-sm gap-2">
            <span className="text-muted-foreground flex-shrink-0">Country:</span>
            <span className="font-medium text-right truncate">{request.country}</span>
          </div>
        </div>
        
        <div className="border-t pt-3">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Student Price:</span>
              <div className="font-semibold text-green-600">${request.student_price}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Tutor Price:</span>
              <div className="font-semibold text-blue-600">${request.tutor_price}</div>
            </div>
          </div>
        </div>
        
        <div className="border-t pt-3">
          <div className="space-y-1 text-sm">
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
    loading
  } = useRequestManagementStore();

  const handleStatusChange = async (status: string, reason?: string) => {
    try {
      await changeRequestStatus(request.id, status, reason);
      setIsOpen(false);
    } catch (error) {
      console.error('Error changing status:', error);
    }
  };

  const handleAssignTutor = async (tutorId: string, tutorPrice: string) => {
    try {
      await assignTutor(request.id, tutorId, tutorPrice);
      setIsOpen(false);
    } catch (error) {
      console.error('Error assigning tutor:', error);
    }
  };

  const handleSetPrices = async (tutorPrice?: string, studentPrice?: string) => {
    try {
      await setTutorPrice(request.id, tutorPrice ? tutorPrice : '');
      await setStudentPrice(request.id, studentPrice ? studentPrice : '');
      setIsOpen(false);
    } catch (error) {
      console.error('Error setting prices:', error);
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
              onSetPrices={handleSetPrices}
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
    hasPreviousPage
  } = useRequestManagementStore();

  const [filters, setFilters] = useState<RequestFilters>({});
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [columnsCount, setColumnsCount] = useState(3);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Create dynamic request type options from RequestType enum
  const requestTypeOptions = Object.values(RequestType).map(type => ({
    value: type,
    label: getRequestTypeLabel(type)
  }));

  useEffect(() => {
    // Don't trigger on initial load (empty filters)
    if (!isInitialLoad) {
      // Reset to page 1 and clear cache when filters change
      setPageSize(pageSize); // This clears the cache
      fetchRequests(filters, { page: 1, pageSize });
    }
  }, [filters]);

  useEffect(() => {
    // Initial load
    if (isInitialLoad) {
      fetchRequests({}, { page: 1, pageSize });
      setIsInitialLoad(false);
    }
  }, []);

  const handleFilterChange = (key: keyof RequestFilters, value: string) => {
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
    
    // Always show first 3 pages
    const firstPages = [1, 2, 3];
    
    // If current page is in the first 5 pages, show them all
    if (currentPage <= 5) {
      const maxPage = Math.max(currentPage + (hasNextPage ? 2 : 1), 5);
      for (let i = 1; i <= maxPage; i++) {
        pages.push(i);
      }
      
      // Add ellipsis if there are more pages ahead
      if (hasNextPage && currentPage >= 3) {
        pages.push('...');
      }
    } else {
      // Show first 3 pages
      pages.push(1, 2, 3);
      
      // Add ellipsis after first 3 if current page is far
      if (currentPage > 5) {
        pages.push('...');
      }
      
      // Show pages around current page (current - 1, current, current + 1)
      const start = Math.max(4, currentPage - 1);
      const end = currentPage + 1;
      
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) {
          pages.push(i);
        }
      }
      
      // Add ellipsis if there are more pages ahead
      if (hasNextPage) {
        pages.push('...');
      }
    }
    
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
                value={filters.search || ''}
                onChange={(e) => handleFilterChange('search', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={filters.assistance_type || 'all'}
                onValueChange={(value) => handleFilterChange('assistance_type', value === 'all' ? '' : value)}
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
                value={filters.request_status || 'all'}
                onValueChange={(value) => handleFilterChange('request_status', value === 'all' ? '' : value)}
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
              <Label>Country</Label>
              <Input
                placeholder="Country"
                value={filters.country || ''}
                onChange={(e) => handleFilterChange('country', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {/* Header with Pagination Controls */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-xl font-semibold">Requests ({requests.length})</h2>
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
                    Showing {requests.length} {requests.length === 1 ? 'request' : 'requests'}
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

