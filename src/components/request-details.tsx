'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { RequestFileManagement } from '@/components/ui/request-file-management';
import { Request } from '@/types/request';
import { getRequestTypeLabel } from '@/types/request';
import { useRequestManagementStore } from '@/stores/request-management-store';
import { combineDateAndTime, formatDateWithTimezone } from '@/lib/date-utils';
import { format } from 'date-fns';

interface RequestDetailsProps {
  request: Request;
}

export function RequestDetails({ request }: RequestDetailsProps) {
  const [tutorInfo, setTutorInfo] = useState<{ email: string; nickname: string } | null>(null);
  const [studentInfo, setStudentInfo] = useState<{ email: string; nickname: string } | null>(null);
  const [loadingTutor, setLoadingTutor] = useState(false);
  const [loadingStudent, setLoadingStudent] = useState(false);

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
      
      return format(date, 'MMM dd, yyyy HH:mm');
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

  const { updateRequestFiles, loading, updateTutorPaid } = useRequestManagementStore();

  // Parse file arrays from JSON strings
  const fileLinks = request.file_links ? 
    (typeof request.file_links === 'string' ? JSON.parse(request.file_links) : request.file_links) : [];
  const fileNames = request.file_names ? 
    (typeof request.file_names === 'string' ? JSON.parse(request.file_names) : request.file_names) : [];

  const handleFileUpdate = async (newFileLinks: string[], newFileNames: string[]) => {
    try {
      await updateRequestFiles(request.id, newFileLinks, newFileNames);
    } catch (error) {
      console.error('Error updating files:', error);
    }
  };

  const handleTutorPaymentToggle = async () => {
    try {
      const newStatus = request.tutor_paid === '1' ? '0' : '1';
      await updateTutorPaid(request.id, newStatus);
    } catch (error) {
      console.error('Error updating tutor payment status:', error);
    }
  };

  // Fetch tutor information
  useEffect(() => {
    if (request.tutor_id) {
      setLoadingTutor(true);
      fetch(`/api/tutors/${request.tutor_id}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setTutorInfo({
              email: data.tutor.email || 'N/A',
              nickname: data.tutor.nickname || 'N/A'
            });
          }
        })
        .catch(error => {
          console.error('Error fetching tutor:', error);
        })
        .finally(() => {
          setLoadingTutor(false);
        });
    }
  }, [request.tutor_id]);

  // Fetch student information
  useEffect(() => {
    if (request.student_id) {
      setLoadingStudent(true);
      fetch(`/api/students/${request.student_id}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setStudentInfo({
              email: data.student.email || 'N/A',
              nickname: data.student.nickname || 'N/A'
            });
          }
        })
        .catch(error => {
          console.error('Error fetching student:', error);
        })
        .finally(() => {
          setLoadingStudent(false);
        });
    }
  }, [request.student_id]);

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Title</Label>
          <div className="p-2 bg-muted rounded">{request.label}</div>
        </div>
        <div className="space-y-2">
          <Label>Type</Label>
          <div className="p-2 bg-muted rounded">{getRequestTypeLabel(request.assistance_type)}</div>
        </div>
        <div className="space-y-2">
          <Label>Subject</Label>
          <div className="p-2 bg-muted rounded">{request.subject}</div>
        </div>
        <div className="space-y-2">
          <Label>Language</Label>
          <div className="p-2 bg-muted rounded">{request.language}</div>
        </div>
        <div className="space-y-2">
          <Label>Country</Label>
          <div className="p-2 bg-muted rounded">{request.country}</div>
        </div>

        <div className="space-y-2">
          <Label>Student</Label>
          <div className="p-2 bg-muted rounded">
            {loadingStudent ? (
              <div className="flex items-center gap-2">
                <LoadingSpinner size="sm" />
                <span>Loading...</span>
              </div>
            ) : studentInfo ? (
              <div>
                <div className="font-medium">{studentInfo.nickname}</div>
                <div className="text-sm text-muted-foreground">{studentInfo.email}</div>
              </div>
            ) : (
              'Not assigned'
            )}
          </div>
        </div>
        <div className="space-y-2">
          <Label>Tutor</Label>
          <div className="p-2 bg-muted rounded">
            {loadingTutor ? (
              <div className="flex items-center gap-2">
                <LoadingSpinner size="sm" />
                <span>Loading...</span>
              </div>
            ) : tutorInfo ? (
              <div>
                <div className="font-medium">{tutorInfo.nickname}</div>
                <div className="text-sm text-muted-foreground">{tutorInfo.email}</div>
              </div>
            ) : (
              'Not assigned'
            )}
          </div>
        </div>
        <div className="space-y-2">
          <Label>Created At</Label>
          <div className="p-2 bg-muted rounded">{formatDate(request.created_at)}</div>
        </div>
        <div className="space-y-2">
          <Label>Deadline</Label>
          <div className="p-2 bg-muted rounded">
            {request.timezone ? (
              <>
                <div>
                  <span className="font-medium">Requester Timezone ({request.timezone}):</span>{' '}
                  {formatDeadline(request)}
                </div>
                <div>
                  <span className="font-medium">Your Local Time:</span>{' '}
                  {(() => {
                    try {
                      if (request.date && request.deadline) {
                        const combined = combineDateAndTime(request.date, request.deadline);
                        return format(combined, 'MMM dd, yyyy HH:mm');
                      }
                      return 'Not set';
                    } catch {
                      return 'Invalid date';
                    }
                  })()}
                </div>
              </>
            ) : (
              <>{formatDeadline(request)}</>
            )}
          </div>
        </div>
        <div className="space-y-2">
          <Label>Updated At</Label>
          <div className="p-2 bg-muted rounded">{formatDate(request.updated_at)}</div>
        </div>
      </div>

      {/* Payment Status */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Payment Status</Label>
          <Button
            onClick={handleTutorPaymentToggle}
            disabled={loading}
            variant={request.tutor_paid === '1' ? 'destructive' : 'default'}
            size="sm"
            className="text-xs"
          >
            {loading ? (
              <LoadingSpinner size="sm" />
            ) : request.tutor_paid === '1' ? (
              'Mark as Unpaid'
            ) : (
              'Mark as Paid'
            )}
          </Button>
        </div>
        <div className={`p-4 rounded-lg border ${
          request.tutor_paid === '1' 
            ? 'bg-green-50 border-green-200' 
            : 'bg-orange-50 border-orange-200'
        }`}>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${
              request.tutor_paid === '1' 
                ? 'bg-green-500' 
                : 'bg-orange-500'
            }`}></div>
            <span className={`font-medium ${
              request.tutor_paid === '1' 
                ? 'text-green-900' 
                : 'text-orange-900'
            }`}>
              {request.tutor_paid === '1'  ? '💰 Tutor Payment Received' : '⏳ Payment Pending'}
            </span>
          </div>
          <div className={`text-sm mt-1 ${
            request.tutor_paid === '1' 
              ? 'text-green-700' 
              : 'text-orange-700'
          }`}>
            {request.tutor_paid === '1' 
              ? 'The tutor has completed payment for this request' 
              : 'Waiting for tutor payment to be processed'}
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label>Description</Label>
        <div className="p-2 bg-muted rounded min-h-[100px]">
          {request.description || 'No description'}
        </div>
      </div>

      {/* File Management */}
      <RequestFileManagement
        fileLinks={fileLinks}
        fileNames={fileNames}
        onUpdate={handleFileUpdate}
        label="Request Files"
        disabled={loading}
      />
    </div>
  );
}
