import React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, AlertCircle, Ban, Bell, BellOff } from 'lucide-react';

interface StatusBadgeProps {
  status: 'verified' | 'banned' | 'pending' | 'active' | 'inactive';
  className?: string;
}

const statusConfig = {
  verified: {
    label: 'Verified',
    icon: CheckCircle,
    className: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200'
  },
  banned: {
    label: 'Banned',
    icon: Ban,
    className: 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200'
  },
  pending: {
    label: 'Pending',
    icon: Clock,
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200'
  },
  active: {
    label: 'Active',
    icon: CheckCircle,
    className: 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200'
  },
  inactive: {
    label: 'Inactive',
    icon: XCircle,
    className: 'bg-muted text-foreground hover:bg-muted/80'
  }
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge 
      variant="outline" 
      className={cn(config.className, 'flex items-center gap-1', className)}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

interface NotificationBadgeProps {
  enabled: boolean;
  className?: string;
}

export function NotificationBadge({ enabled, className }: NotificationBadgeProps) {
  return (
    <Badge 
      variant="outline" 
      className={cn(
        'flex items-center gap-1',
        enabled 
          ? 'bg-green-100 text-green-800 border-green-200' 
          : 'bg-muted text-foreground',
        className
      )}
    >
      {enabled ? <Bell className="h-3 w-3" /> : <BellOff className="h-3 w-3" />}
      {enabled ? 'Notifications On' : 'Notifications Off'}
    </Badge>
  );
}

interface VerificationBadgeProps {
  verified: boolean;
  emailVerified?: boolean;
  className?: string;
}

export function VerificationBadge({ verified, emailVerified, className }: VerificationBadgeProps) {
  if (verified && emailVerified) {
    return (
      <Badge variant="outline" className={cn('bg-green-100 text-green-800 border-green-200 flex items-center gap-1', className)}>
        <CheckCircle className="h-3 w-3" />
        Fully Verified
      </Badge>
    );
  }
  
  if (verified) {
    return (
      <Badge variant="outline" className={cn('bg-blue-100 text-blue-800 border-blue-200 flex items-center gap-1', className)}>
        <CheckCircle className="h-3 w-3" />
        Account Verified
      </Badge>
    );
  }
  
  if (emailVerified) {
    return (
      <Badge variant="outline" className={cn('bg-yellow-100 text-yellow-800 border-yellow-200 flex items-center gap-1', className)}>
        <CheckCircle className="h-3 w-3" />
        Email Verified
      </Badge>
    );
  }
  
  return (
    <Badge variant="outline" className={cn('bg-muted text-foreground flex items-center gap-1', className)}>
      <AlertCircle className="h-3 w-3" />
      Unverified
    </Badge>
  );
}

interface CustomStatusBadgeProps {
  label: string;
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral';
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
}

export function CustomStatusBadge({ 
  label, 
  variant = 'neutral', 
  icon: Icon, 
  className 
}: CustomStatusBadgeProps) {
  const variantClasses = {
    success: 'bg-green-100 text-green-800 border-green-200',
    warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    error: 'bg-red-100 text-red-800 border-red-200',
    info: 'bg-blue-100 text-blue-800 border-blue-200',
    neutral: 'bg-muted text-foreground'
  };

  return (
    <Badge 
      variant="outline" 
      className={cn(
        variantClasses[variant], 
        'flex items-center gap-1',
        className
      )}
    >
      {Icon && <Icon className="h-3 w-3" />}
      {label}
    </Badge>
  );
}
