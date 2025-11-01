"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { 
  Home, 
  Users, 
  BarChart3, 
  Settings, 
  FileText, 
  ShoppingCart, 
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Shield,
  GraduationCap,
  Database,
  UserCog,
  Bell,
  Ticket,
  MessageCircle,
  Headphones,
  BookOpen,
  Hash,
  HelpCircle,
  Smartphone,
  Key
} from "lucide-react";
import Image from 'next/image';
import { useFirebaseAuthStore } from "@/stores/firebase-auth-store";

interface SidebarProps {
  className?: string;
}

const getNavigationItems = (hasPermission: (resource: string, action: string) => boolean) => [
  { name: "Dashboard", href: "/dashboard", icon: Home, permission: null },
  { 
    name: "Customer Support", 
    href: "/dashboard/support", 
    icon: Headphones, 
    permission: null // Temporarily remove permission check for testing
  },
  { 
    name: "Requests", 
    href: "/dashboard/requests", 
    icon: FileText, 
    permission: { resource: 'tutors', action: 'read' } 
  },
  { 
    name: "Students", 
    href: "/dashboard/students", 
    icon: GraduationCap, 
    permission: { resource: 'students', action: 'read' } 
  },
  { 
    name: "Tutors", 
    href: "/dashboard/tutors", 
    icon: UserCog, 
    permission: { resource: 'tutors', action: 'read' } 
  },
  { 
    name: "Notifications", 
    href: "/dashboard/notifications", 
    icon: Bell, 
    permission: { resource: 'notifications', action: 'read' } 
  },
  { 
    name: "Subjects", 
    href: "/dashboard/subjects", 
    icon: BookOpen, 
    permission: { resource: 'subjects', action: 'read' } 
  },
  { 
    name: "Promo Codes", 
    href: "/dashboard/promo-codes", 
    icon: Hash, 
    permission: { resource: 'promo_codes', action: 'read' } 
  },
  { 
    name: "FAQ's", 
    href: "/dashboard/faqs", 
    icon: HelpCircle, 
    permission: { resource: 'faqs', action: 'read' } 
  },
  { 
    name: "Social Media", 
    href: "/dashboard/social-media", 
    icon: Smartphone, 
    permission: { resource: 'social_media', action: 'read' } 
  },
  { 
    name: "Users", 
    href: "/dashboard/users", 
    icon: Users, 
    permission: { resource: 'users', action: 'read' } 
  },
  { 
    name: "Resources", 
    href: "/dashboard/resources", 
    icon: Database, 
    permission: { resource: 'resources', action: 'read' } 
  },
  { 
    name: "Roles & Permissions", 
    href: "/dashboard/roles", 
    icon: Key, 
    permission: { resource: 'roles', action: 'read' } 
  },
  { name: "Logout", href: "/dashboard/logout", icon: LogOut, permission: null },
];

export function Sidebar({ className }: SidebarProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { user, logout, hasPermission } = useFirebaseAuthStore();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await logout();
      // Use replace to prevent back navigation to dashboard
      router.replace("/login");
    } catch (error) {
      console.error("Logout failed:", error);
      // Still redirect even if logout fails
      router.replace("/login");
    }
  };

  const handleNavigation = (href: string) => {
    router.push(href);
    setIsMobileOpen(false); // Close mobile menu after navigation
  };

  // No need for CSS custom property since we're using flexbox layout

  // Get navigation items based on user permissions
  const navigation = getNavigationItems(hasPermission);

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="bg-sidebar border-sidebar-border text-sidebar-foreground shadow-md hover:bg-sidebar-accent"
        >
          {isMobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div 
          className="lg:hidden fixed inset-0 z-40 bg-black bg-opacity-50"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "flex flex-col bg-sidebar transition-all duration-300 ease-in-out",
          // Card effect with shadow and rounded corners
          "shadow-2xl rounded-r-3xl",
          // Curved from top-right to bottom-right
          "rounded-tr-3xl rounded-br-3xl",
          // Mobile styles - fixed positioning for mobile
          "fixed inset-y-0 left-0 z-50 lg:relative lg:translate-x-0",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          // Desktop width based on expansion
          isExpanded ? "w-64" : "w-16",
          className
        )}  
      >
        {/* Header */}
        <div className="flex items-center justify-center p-4 border-b border-border bg-gradient-to-b from-background to-card rounded-tr-3xl">
          <div 
            className="flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <Image
              src="/logo.png"
              alt="Logo"
              width={isExpanded ? 80 : 40}
              height={isExpanded ? 40 : 20}
              className={`transition-all duration-300 ${isExpanded ? 'h-10 w-auto' : 'h-5 w-auto'} dark:brightness-0 dark:invert brightness-0`}
              priority
            />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
          {navigation.filter(item => 
            !item.permission || hasPermission(item.permission.resource, item.permission.action)
          ).map((item) => {
            const Icon = item.icon;
            const isLogout = item.name === "Logout";
            const isActive = typeof window !== 'undefined' && window.location.pathname === item.href;
            const isCustomerSupport = item.name === "Customer Support";
            
            return (
              <button
                key={item.name}
                onClick={() => isLogout ? handleLogout() : handleNavigation(item.href)}
                className={cn(
                  "group flex items-center px-3 py-3 text-sm font-medium rounded-xl transition-all duration-200 w-full text-left relative",
                  isActive 
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg" 
                    : isLogout 
                      ? "text-red-400 hover:text-red-300 hover:bg-red-500/20"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50",
                  "focus:outline-none focus:ring-2 focus:ring-blue-500/50",
                  "cursor-pointer"
                )}
              >
                {/* Active indicator line */}
                {isActive && (
                  <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-sidebar-primary rounded-r-full" />
                )}
                
                <div className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-lg transition-colors",
                  isActive 
                    ? "bg-transparent" 
                    : "bg-sidebar-accent"
                )}>
                  <Icon 
                    className={cn(
                      "flex-shrink-0 h-5 w-5 transition-colors duration-200",
                      isActive 
                        ? "text-sidebar-primary-foreground" 
                        : isLogout 
                          ? "text-red-500"
                          : "text-sidebar-foreground"
                    )} 
                  />
                </div>
                
                <span
                  className={cn(
                    "ml-3 transition-all duration-300 font-medium",
                    isExpanded ? "opacity-100 translate-x-0" : "opacity-0 translate-x-2 lg:opacity-0"
                  )}
                >
                  {item.name}
                </span>
              </button>
            );
          })}
        </nav>

      </div>
    </>
  );
} 