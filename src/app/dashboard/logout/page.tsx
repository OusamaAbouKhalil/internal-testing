"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useFirebaseAuthStore } from "@/stores/firebase-auth-store";

export default function LogoutPage() {
  const router = useRouter();
  const { logout } = useFirebaseAuthStore();

  useEffect(() => {
    const performLogout = async () => {
      try {
        await logout();
      } catch (error) {
        console.error('Logout error:', error);
      } finally {
        // Always redirect to login page, even if logout API call fails
        router.replace("/login");
      }
    };

    performLogout();
  }, [logout, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <LogOut className="h-12 w-12 mx-auto mb-4 animate-pulse text-muted-foreground" />
        <h1 className="text-xl font-semibold text-foreground">Logging out...</h1>
        <p className="text-muted-foreground mt-2">Please wait while we sign you out.</p>
      </div>
    </div>
  );
}
