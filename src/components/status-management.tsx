'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Request } from '@/types/request';

interface StatusManagementProps {
  request: Request;
  onStatusChange: (status: string, reason?: string) => void;
  loading: boolean;
}

export function StatusManagement({ 
  request, 
  onStatusChange, 
  loading 
}: StatusManagementProps) {
  const [reason, setReason] = useState('');

  const statusOptions = [
    { value: 'new', label: 'New' },
    { value: 'pending', label: 'Pending' },
    { value: 'pending_payment', label: 'Pending Payment' },
    { value: 'ongoing', label: 'Ongoing' },
    { value: 'tutor_completed', label: 'Tutor Completed' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

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

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Current Status</Label>
        <Badge className={getRequestStatusColor(request.request_status)}>
          {getRequestStatusLabel(request.request_status)}
        </Badge>
      </div>
      
      <div className="space-y-2">
        <Label>Change Status</Label>
        <div className="grid grid-cols-2 gap-2">
          {statusOptions.map((status) => (
            <Button
              key={status.value}
              variant={request.request_status === status.value ? "default" : "outline"}
              size="sm"
              onClick={() => onStatusChange(status.value)}
              disabled={loading}
            >
              {status.label}
            </Button>
          ))}
        </div>
      </div>
      
      <div className="space-y-2">
        <Label>Reason (for cancellation)</Label>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Enter reason for status change..."
        />
      </div>
    </div>
  );
}
