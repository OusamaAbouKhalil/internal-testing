'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell } from 'lucide-react';
import { NotificationsDialog } from '@/components/notifications-dialog';
import { useRealtimeNotificationStore, useRealtimeNotifications } from '@/stores/realtime-notification-store';
import { ThemeToggle } from '@/components/theme-toggle';
import Image from 'next/image';

export function Header() {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const { unseenCount } = useRealtimeNotificationStore();
  
  // Setup realtime listener
  useRealtimeNotifications();

  return (
    <>
      <header 
        className="fixed top-0 right-0 left-0 z-40 bg-card border-b border-border px-4 py-3 transition-all duration-300"
        style={{ left: 'var(--sidebar-width, 16rem)' }}
      >
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <Image
              src="/logo.png"
              alt="Logo"
              width={80}
              height={40}
              className="h-8 w-auto dark:brightness-0 dark:invert brightness-0"
              priority
            />
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsNotificationsOpen(true)}
              className="relative"
            >
              <Bell className="h-5 w-5" />
              {unseenCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs"
                >
                  {unseenCount > 99 ? '99+' : unseenCount}
                </Badge>
              )}
            </Button>
          </div>
        </div>
      </header>

      <NotificationsDialog 
        isOpen={isNotificationsOpen} 
        onClose={() => setIsNotificationsOpen(false)} 
      />
    </>
  );
}
