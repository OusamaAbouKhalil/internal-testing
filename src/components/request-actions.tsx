'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MoreHorizontal, ExternalLink } from 'lucide-react';
import { Request } from '@/types/request';
import { useRequestManagementStore } from '@/stores/request-management-store';

interface RequestActionsProps {
  request: Request;
  trigger?: React.ReactNode;
  onClose?: () => void;
  showFullActions?: boolean; // If false, shows simplified view
}

export function RequestActions({ request, trigger, onClose, showFullActions = true }: RequestActionsProps) {
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
      onClose?.();
    } catch (error) {
      console.error('Error changing status:', error);
    }
  };

  const handleAssignTutor = async (tutorId: string, tutorPrice: string) => {
    try {
      await assignTutor(request.id, tutorId, tutorPrice);
      setIsOpen(false);
      onClose?.();
    } catch (error) {
      console.error('Error assigning tutor:', error);
    }
  };

  const handleSetPrices = async (tutorPrice?: string, studentPrice?: string) => {
    try {
      await setTutorPrice(request.id, tutorPrice ? tutorPrice : '');
      await setStudentPrice(request.id, studentPrice ? studentPrice : '');
      setIsOpen(false);
      onClose?.();
    } catch (error) {
      console.error('Error setting prices:', error);
    }
  };

  useEffect(() => {
    if (isOpen && showFullActions) {
      fetchTutorOffers(request.id);
    }
  }, [isOpen, request.id, fetchTutorOffers, showFullActions]);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      onClose?.();
    }
  };

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
      
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch (error) {
      return 'Invalid date';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'new':
        return 'bg-muted text-foreground';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'ongoing':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-muted text-foreground';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'HOMEWORK':
        return 'bg-blue-100 text-blue-800';
      case 'EXAM':
        return 'bg-red-100 text-red-800';
      case 'PROJECT':
        return 'bg-green-100 text-green-800';
      case 'THESIS':
        return 'bg-purple-100 text-purple-800';
      case 'ONLINE':
        return 'bg-orange-100 text-orange-800';
      case 'SOS':
        return 'bg-pink-100 text-pink-800';
      default:
        return 'bg-muted text-foreground';
    }
  };

  // Simplified view for notifications
  if (!showFullActions) {
    return (
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          {trigger || (
            <Button variant="outline" size="sm" className="flex items-center gap-1">
              <ExternalLink className="h-4 w-4" />
              View Details
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Request Details: {request.label}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`/dashboard/requests/${request.id}`, '_blank')}
                className="flex items-center gap-1"
              >
                <ExternalLink className="h-4 w-4" />
                Open in Requests
              </Button>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Header Information */}
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-2">{request.label}</h3>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.request_status)}`}>
                      {request.request_status}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(request.assistance_type)}`}>
                      {request.assistance_type}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">Student ID:</span>
                    <span>{request.student_id || 'Not assigned'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">Tutor ID:</span>
                    <span>{request.tutor_id || 'Not assigned'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">Country:</span>
                    <span>{request.country || 'Not specified'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">Language:</span>
                    <span>{request.language || 'Not specified'}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">Budget:</span>
                    <span>${request.min_price || 'Not set'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">Created:</span>
                    <span>{formatDate(request.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">Deadline:</span>
                    <span>{formatDate(request.deadline)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            {request.description && (
              <div className="p-4 bg-white border rounded-lg">
                <h4 className="font-medium mb-2">Description</h4>
                <p className="text-foreground whitespace-pre-wrap">
                  {request.description}
                </p>
              </div>
            )}

            {/* Additional Information */}
            <div className="p-4 bg-white border rounded-lg">
              <h4 className="font-medium mb-3">Additional Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">Subject:</span>
                    <span>{request.subject || 'Not specified'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">Sub Subject:</span>
                    <span>{request.sub_subject || 'Not specified'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">Timezone:</span>
                    <span>{request.timezone || 'Not specified'}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">Student Price:</span>
                    <span>${request.student_price || 'Not set'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">Tutor Price:</span>
                    <span>${request.tutor_price || 'Not set'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">Updated:</span>
                    <span>{formatDate(request.updated_at)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Full actions view (for request page)
  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="w-[100vw] md:w-[80vw] lg:w-[80vw] sm:max-w-[80vw] max-w-none max-h-[98vh] overflow-x-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Manage Request: {request.label}</DialogTitle>
        </DialogHeader>
        
        <div className="text-center py-8">
          <p className="text-muted-foreground">Full request management interface</p>
          <p className="text-sm text-muted-foreground mt-2">
            This would include the full tabs interface with Details, Status, Assignment, and Tutor Offers
          </p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => window.open(`/dashboard/requests/${request.id}`, '_blank')}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Open Full Management
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
