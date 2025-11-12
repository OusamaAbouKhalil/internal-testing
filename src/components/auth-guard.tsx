"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFirebaseAuthStore } from "@/stores/firebase-auth-store";

interface AuthGuardProps {
  children: React.ReactNode;
  requiredPermission?: {
    resource: string;
    action: string;
  };
  requiredRole?: string;
}

export function AuthGuard({ children, requiredPermission, requiredRole }: AuthGuardProps) {
  const router = useRouter();
  const { 
    isAuthenticated, 
    loading, 
    user, 
    hasPermission, 
    hasRole,
    checkAuth 
  } = useFirebaseAuthStore();

  useEffect(() => {
    const isAuth = checkAuth();
    if (!isAuth && !loading) {
      router.push("/login");
    }
  }, [checkAuth, router, loading]);

  // Show loading while checking authentication
  if (loading || (!isAuthenticated && !user)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return null; // Will redirect via useEffect
  }

  // Check required permission
  if (requiredPermission && !hasPermission(requiredPermission.resource, requiredPermission.action)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">🚫</div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-4">
            You don't have permission to access this resource.
          </p>
          <p className="text-sm text-muted-foreground">
            Required: {requiredPermission.resource}:{requiredPermission.action}
          </p>
        </div>
      </div>
    );
  }

  // Check required role
  if (requiredRole && !hasRole(requiredRole)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">🚫</div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-4">
            You don't have the required role to access this resource.
          </p>
          <p className="text-sm text-muted-foreground">
            Required role: {requiredRole}
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
} 