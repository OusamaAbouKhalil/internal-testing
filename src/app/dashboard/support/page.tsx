'use client';

import { CustomerSupportUI } from '@/components/customer-support-ui';
import { useFirebaseAuthStore } from '@/stores/firebase-auth-store';

export default function SupportPage() {
  const { user } = useFirebaseAuthStore();

  console.log('Support page user:', user);

  return (
    <div className="h-full rounded-lg">
      <CustomerSupportUI 
        currentUserType="admin"
        currentUserId={user?.uid || 'default-admin'}
      />
    </div>
  );
}
