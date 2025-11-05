"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  ShoppingCart, 
  TrendingUp, 
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Bell,
  UserPlus,
  UserCheck,
  CreditCard,
  AlertCircle,
  GraduationCap,
  FileText,
  AlertTriangle,
  DollarSign,
  MessageSquare,
  Settings,
  UserX,
  Repeat,
  BookOpen,
  Award,
  Clock,
  CheckCircle,
  XCircle,
  Hourglass,
  AlertCircle as AlertIcon,
  ListChecks,
  ChevronDown,
  ChevronUp,
  ChevronsDownUp,
  ChevronsUpDown
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface StudentTrackingData {
  tutorTracking: TutorTrackingData;
  requestsAndSessions: RequestsAndSessionsData;
  newRegistrations: {
    daily: number;
    monthly: number;
    lastMonth: number;
  };
  activeStudents: {
    daily: number;
    monthly: number;
    lastMonth: number;
  };
  pendingPayment: {
    count: number;
    students: Array<{
      studentId: string;
      studentName: string;
      email: string;
      requestCount: number;
      totalAmount: number;
      requests: Array<{
        id: string;
        label: string;
        student_price: string;
        created_at: any;
      }>;
    }>;
  };
  noBids: {
    count: number;
    students: Array<{
      studentId: string;
      studentName: string;
      email: string;
      requestCount: number;
      requests: Array<{
        id: string;
        label: string;
        created_at: any;
      }>;
    }>;
  };
  repeatStudents: {
    count: number;
    students: Array<{
      studentId: string;
      studentName: string;
      email: string;
      requestCount: number;
      totalSpent: number;
    }>;
  };
  topSubjects: Array<{
    subject: string;
    daily: number;
    monthly: number;
    lastMonth: number;
  }>;
}

interface TutorTrackingData {
  newRegistrations: {
    daily: number;
    monthly: number;
    lastMonth: number;
  };
  activeTutors: {
    daily: number;
    monthly: number;
    lastMonth: number;
  };
  acceptanceRates: Array<{
    tutorId: string;
    tutorName: string;
    totalOffers: number;
    acceptedOffers: number;
    acceptanceRate: number;
  }>;
  topRated: Array<{
    tutorId: string;
    tutorName: string;
    rating: number;
    requestCount: number;
  }>;
}

interface RequestsAndSessionsData {
  totalByStatus: {
    pending: number;
    ongoing: number;
    completed: number;
    cancelled: number;
  };
  unmatchedRequests: {
    count: number;
    requests: Array<{
      id: string;
      label: string;
      studentId: string;
      studentName: string;
      subject: string;
      created_at: any;
      request_status: string;
    }>;
  };
  waitingForPayment: number;
  completionRate: number;
  canceledSessions: {
    count: number;
    requests: Array<{
      id: string;
      label: string;
      studentId: string;
      studentName: string;
      cancelReason: string | null;
      created_at: any;
      cancelled_at: any;
    }>;
    reasons: Array<{
      reason: string;
      count: number;
    }>;
  };
}

interface DashboardData {
  profit: {
    thisYear: number;
    lastYear: number;
    year: number;
  };
  topTutors: Array<{
    tutorId: string;
    tutorName: string;
    completedCount: number;
    totalProfit: number;
    requestTypes: Record<string, number>;
  }>;
  topStudents: Array<{
    studentId: string;
    studentName: string;
    requestCount: number;
  }>;
  complaints: Array<{
    id: string;
    studentId: string;
    studentName: string;
    requestLabel: string;
    issue: string | null;
    feedback: string | null;
    rating: string | null;
    createdAt: any;
  }>;
  studentTracking: StudentTrackingData;
  
  
}

export default function DashboardPage() {
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [registrationPeriod, setRegistrationPeriod] = useState<'daily' | 'monthly'>('daily');
  const [activePeriod, setActivePeriod] = useState<'daily' | 'monthly'>('daily');
  const [subjectPeriod, setSubjectPeriod] = useState<'daily' | 'monthly'>('monthly');
  const [tutorRegistrationPeriod, setTutorRegistrationPeriod] = useState<'daily' | 'monthly'>('daily');
  const [tutorActivePeriod, setTutorActivePeriod] = useState<'daily' | 'monthly'>('daily');
  
  // Collapsible sections state - first section (overview) open by default
  const [sectionsOpen, setSectionsOpen] = useState({
    overview: true,
    contentGrid: false,
    quickActions: false,
    studentTracking: false,
    tutorTracking: false,
    requestsAndSessions: false,
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await fetch('/api/reports/dashboard');
        const result = await response.json();
        
        if (result.success && result.data) {
          setDashboardData(result.data);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const studentTracking = dashboardData?.studentTracking || null;
  const tutorTracking = dashboardData?.studentTracking?.tutorTracking || null;
  const requestsAndSessions = dashboardData?.studentTracking?.requestsAndSessions || null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    let date: Date;
    if (timestamp._seconds) {
      date = new Date(timestamp._seconds * 1000);
    } else if (timestamp.toDate) {
      date = timestamp.toDate();
    } else {
      date = new Date(timestamp);
    }
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  const getRegistrationChange = () => {
    if (!studentTracking) return { value: 0, type: 'increase' as const };
    const current = registrationPeriod === 'daily' 
      ? studentTracking.newRegistrations.daily 
      : studentTracking.newRegistrations.monthly;
    const previous = registrationPeriod === 'daily'
      ? 0 // No previous day comparison in API
      : studentTracking.newRegistrations.lastMonth;
    const change = calculateChange(current, previous);
    return { 
      value: Math.abs(change), 
      type: change >= 0 ? 'increase' as const : 'decrease' as const 
    };
  };

  const getActiveChange = () => {
    if (!studentTracking) return { value: 0, type: 'increase' as const };
    const current = activePeriod === 'daily'
      ? studentTracking.activeStudents.daily
      : studentTracking.activeStudents.monthly;
    const previous = activePeriod === 'daily'
      ? 0 // No previous day comparison in API
      : studentTracking.activeStudents.lastMonth;
    const change = calculateChange(current, previous);
    return { 
      value: Math.abs(change), 
      type: change >= 0 ? 'increase' as const : 'decrease' as const 
    };
  };

  const getProfitChange = () => {
    if (!dashboardData) return { value: 0, type: 'increase' as const };
    const change = calculateChange(dashboardData.profit.thisYear, dashboardData.profit.lastYear);
    return { 
      value: Math.abs(change), 
      type: change >= 0 ? 'increase' as const : 'decrease' as const 
    };
  };

  const getTutorRegistrationChange = () => {
    if (!tutorTracking) return { value: 0, type: 'increase' as const };
    const current = tutorRegistrationPeriod === 'daily' 
      ? tutorTracking.newRegistrations.daily 
      : tutorTracking.newRegistrations.monthly;
    const previous = tutorRegistrationPeriod === 'daily'
      ? 0
      : tutorTracking.newRegistrations.lastMonth;
    const change = calculateChange(current, previous);
    return { 
      value: Math.abs(change), 
      type: change >= 0 ? 'increase' as const : 'decrease' as const 
    };
  };

  const getTutorActiveChange = () => {
    if (!tutorTracking) return { value: 0, type: 'increase' as const };
    const current = tutorActivePeriod === 'daily'
      ? tutorTracking.activeTutors.daily
      : tutorTracking.activeTutors.monthly;
    const previous = tutorActivePeriod === 'daily'
      ? 0
      : tutorTracking.activeTutors.lastMonth;
    const change = calculateChange(current, previous);
    return { 
      value: Math.abs(change), 
      type: change >= 0 ? 'increase' as const : 'decrease' as const 
    };
  };

  const formatDateForComplaint = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    let date: Date;
    if (timestamp._seconds) {
      date = new Date(timestamp._seconds * 1000);
    } else if (timestamp.toDate) {
      date = timestamp.toDate();
    } else {
      date = new Date(timestamp);
    }
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
    if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    if (diffDays < 7) return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
    return formatDate(timestamp);
  };

  const toggleSection = (section: keyof typeof sectionsOpen) => {
    setSectionsOpen(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const openAllSections = () => {
    setSectionsOpen({
      overview: true,
      contentGrid: true,
      quickActions: true,
      studentTracking: true,
      tutorTracking: true,
      requestsAndSessions: true,
    });
  };

  const closeAllSections = () => {
    setSectionsOpen({
      overview: false,
      contentGrid: false,
      quickActions: false,
      studentTracking: false,
      tutorTracking: false,
      requestsAndSessions: false,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-2">Welcome back! Here's what's happening today.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={openAllSections}>
            <ChevronsDownUp className="h-4 w-4 mr-2" />
            Open All
          </Button>
          <Button variant="outline" size="sm" onClick={closeAllSections}>
            <ChevronsUpDown className="h-4 w-4 mr-2" />
            Close All
          </Button>
        </div>
      </div>

      {/* Overview Stats Grid */}
      <Card>
        <CardHeader 
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => toggleSection('overview')}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">Overview</CardTitle>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              {sectionsOpen.overview ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        {sectionsOpen.overview && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '...' : formatCurrency(dashboardData?.profit.thisYear || 0)}
            </div>
            <div className="flex items-center text-sm mt-1">
              {getProfitChange().type === "increase" ? (
                <ArrowUpRight className="h-4 w-4 text-green-500" />
              ) : (
                <ArrowDownRight className="h-4 w-4 text-red-500" />
              )}
              <span
                className={
                  getProfitChange().type === "increase"
                    ? "text-green-600 ml-1"
                    : "text-red-600 ml-1"
                }
              >
                {getProfitChange().value}%
              </span>
              <span className="text-muted-foreground ml-1">vs last year</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Year {dashboardData?.profit.year || new Date().getFullYear()}</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Tutors</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '...' : dashboardData?.topTutors.length || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Active top performers</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '...' : dashboardData?.topStudents.length || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Most active students</p>
          </CardContent>
        </Card>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Content Grid */}
      <Card>
        <CardHeader 
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => toggleSection('contentGrid')}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">Top Performers</CardTitle>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              {sectionsOpen.contentGrid ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        {sectionsOpen.contentGrid && (
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Tutors */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Top Tutors
            </CardTitle>
            <CardDescription>Most successful tutors this year</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : dashboardData?.topTutors.length ? (
                dashboardData.topTutors.slice(0, 5).map((tutor, index) => (
                  <div
                    key={tutor.tutorId}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <Link
                          href={`/dashboard/tutors/${tutor.tutorId}`}
                          className="font-medium hover:underline text-blue-600"
                        >
                          {tutor.tutorName || 'Unknown'}
                        </Link>
                        <p className="text-sm text-muted-foreground">
                          {tutor.completedCount} {tutor.completedCount === 1 ? 'request' : 'requests'} completed
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">{formatCurrency(tutor.totalProfit)}</p>
                      <p className="text-xs text-muted-foreground">Profit</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">No tutors found</div>
              )}
              {dashboardData && dashboardData.topTutors.length > 5 && (
                <div className="text-center pt-2">
                  <Link href="/dashboard/tutors">
                    <Button variant="outline">View All Tutors</Button>
                  </Link>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Students */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Top Students
            </CardTitle>
            <CardDescription>Students with most requests</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : dashboardData?.topStudents.length ? (
                dashboardData.topStudents.slice(0, 5).map((student, index) => (
                  <div
                    key={student.studentId}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <Link
                          href={`/dashboard/students/${student.studentId}`}
                          className="font-medium hover:underline text-blue-600"
                        >
                          {student.studentName || 'Unknown'}
                        </Link>
                        <p className="text-sm text-muted-foreground">
                          {student.requestCount} {student.requestCount === 1 ? 'request' : 'requests'} total
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">No students found</div>
              )}
              {dashboardData && dashboardData.topStudents.length > 5 && (
                <div className="text-center pt-2">
                  <Link href="/dashboard/students">
                    <Button variant="outline">View All Students</Button>
                  </Link>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader 
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => toggleSection('quickActions')}
        >
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Quick Actions
              </CardTitle>
              <CardDescription>Common tasks you might want to perform</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              {sectionsOpen.quickActions ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        {sectionsOpen.quickActions && (
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <Link href="/dashboard/students">
            <Button className="w-full justify-start" variant="outline">
              <Users className="mr-2 h-4 w-4" />
              Manage Students
            </Button>
          </Link>
          <Link href="/dashboard/tutors">
            <Button className="w-full justify-start" variant="outline">
              <GraduationCap className="mr-2 h-4 w-4" />
              Manage Tutors
            </Button>
          </Link>
          <Link href="/dashboard/requests">
            <Button className="w-full justify-start" variant="outline">
              <FileText className="mr-2 h-4 w-4" />
              View Requests
            </Button>
          </Link>
          <Link href="/dashboard/notifications">
            <Button className="w-full justify-start" variant="outline">
              <Bell className="mr-2 h-4 w-4" />
              Notifications
            </Button>
          </Link>
          </CardContent>
        )}
      </Card>

      {/* Student Tracking Section */}
      <Card>
        <CardHeader 
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => toggleSection('studentTracking')}
        >
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Student Tracking</CardTitle>
              <CardDescription className="mt-1">Monitor student registrations, activity, and payment status</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              {sectionsOpen.studentTracking ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        {sectionsOpen.studentTracking && (
          <CardContent>
            <div className="space-y-6">

        {/* Student Tracking Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* New Student Registrations */}
          <Card className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                New Student Registrations
              </CardTitle>
              <UserPlus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                <div className="text-2xl font-bold">
                  {loading ? '...' : (
                    registrationPeriod === 'daily'
                      ? studentTracking?.newRegistrations.daily || 0
                      : studentTracking?.newRegistrations.monthly || 0
                  )}
                </div>
                <div className="flex gap-1">
                  <Button
                    variant={registrationPeriod === 'daily' ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setRegistrationPeriod('daily')}
                  >
                    Daily
                  </Button>
                  <Button
                    variant={registrationPeriod === 'monthly' ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setRegistrationPeriod('monthly')}
                  >
                    Monthly
                  </Button>
                </div>
              </div>
              {registrationPeriod === 'monthly' && studentTracking && (
                <div className="flex items-center text-sm mt-1">
                  {getRegistrationChange().type === "increase" ? (
                    <ArrowUpRight className="h-4 w-4 text-green-500" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 text-red-500" />
                  )}
                  <span
                    className={
                      getRegistrationChange().type === "increase"
                        ? "text-green-600 ml-1"
                        : "text-red-600 ml-1"
                    }
                  >
                    {getRegistrationChange().value}%
                  </span>
                  <span className="text-muted-foreground ml-1">vs last month</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Active Students */}
          <Card className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Students
              </CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                <div className="text-2xl font-bold">
                  {loading ? '...' : (
                    activePeriod === 'daily'
                      ? studentTracking?.activeStudents.daily || 0
                      : studentTracking?.activeStudents.monthly || 0
                  )}
                </div>
                <div className="flex gap-1">
                  <Button
                    variant={activePeriod === 'daily' ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setActivePeriod('daily')}
                  >
                    Daily
                  </Button>
                  <Button
                    variant={activePeriod === 'monthly' ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setActivePeriod('monthly')}
                  >
                    Monthly
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Students who made requests
              </p>
              {activePeriod === 'monthly' && studentTracking && (
                <div className="flex items-center text-sm mt-1">
                  {getActiveChange().type === "increase" ? (
                    <ArrowUpRight className="h-4 w-4 text-green-500" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 text-red-500" />
                  )}
                  <span
                    className={
                      getActiveChange().type === "increase"
                        ? "text-green-600 ml-1"
                        : "text-red-600 ml-1"
                    }
                  >
                    {getActiveChange().value}%
                  </span>
                  <span className="text-muted-foreground ml-1">vs last month</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pending Payment Count */}
          <Card className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Pending Payment
              </CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? '...' : studentTracking?.pendingPayment.count || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Students who confirmed but didn't pay
              </p>
            </CardContent>
          </Card>

          {/* No Bids Count */}
          <Card className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                No Tutor Bids
              </CardTitle>
              <UserX className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? '...' : studentTracking?.noBids.count || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Students with requests without bids
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Pending Payment Students List */}
        {studentTracking && studentTracking.pendingPayment.count > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-500" />
                Students with Pending Payments
              </CardTitle>
              <CardDescription>
                Students who have confirmed requests but haven't completed payment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {studentTracking.pendingPayment.students.slice(0, 10).map((student) => (
                  <div
                    key={student.studentId}
                    className="flex items-center justify-between p-4 bg-muted rounded-lg border border-orange-200"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/dashboard/students/${student.studentId}`}
                          className="font-medium hover:underline text-blue-600"
                        >
                          {student.studentName || 'Unknown'}
                        </Link>
                        <span className="text-xs text-muted-foreground">
                          ({student.email})
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span>
                          {student.requestCount} {student.requestCount === 1 ? 'request' : 'requests'}
                        </span>
                        <span className="font-semibold text-orange-600">
                          Total: {formatCurrency(student.totalAmount)}
                        </span>
                      </div>
                      <div className="mt-2 space-y-1">
                        {student.requests.slice(0, 2).map((request) => (
                          <div key={request.id} className="text-xs text-muted-foreground flex items-center gap-2">
                            <Link
                              href={`/dashboard/requests/${request.id}`}
                              className="hover:underline text-blue-600"
                            >
                              {request.label}
                            </Link>
                            <span>•</span>
                            <span>{formatCurrency(parseFloat(request.student_price || '0'))}</span>
                            <span>•</span>
                            <span>{formatDate(request.created_at)}</span>
                          </div>
                        ))}
                        {student.requests.length > 2 && (
                          <p className="text-xs text-muted-foreground">
                            +{student.requests.length - 2} more {student.requests.length - 2 === 1 ? 'request' : 'requests'}
                          </p>
                        )}
                      </div>
                    </div>
                    <Link href={`/dashboard/requests?student_id=${student.studentId}&request_status=pending_payment`}>
                      <Button variant="outline" size="sm">
                        View Requests
                      </Button>
                    </Link>
                  </div>
                ))}
                {studentTracking.pendingPayment.students.length > 10 && (
                  <div className="text-center pt-2">
                    <Link href="/dashboard/requests?request_status=pending_payment">
                      <Button variant="outline">
                        View All {studentTracking.pendingPayment.count} Students
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Students Without Bids List */}
        {studentTracking && studentTracking.noBids.count > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserX className="h-5 w-5 text-orange-500" />
                Students with Requests Without Tutor Bids
              </CardTitle>
              <CardDescription>
                Students who created requests but haven't received any tutor bids yet
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {studentTracking.noBids.students.slice(0, 10).map((student) => (
                  <div
                    key={student.studentId}
                    className="flex items-center justify-between p-4 bg-muted rounded-lg border border-orange-200"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/dashboard/students/${student.studentId}`}
                          className="font-medium hover:underline text-blue-600"
                        >
                          {student.studentName || 'Unknown'}
                        </Link>
                        <span className="text-xs text-muted-foreground">
                          ({student.email})
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span>
                          {student.requestCount} {student.requestCount === 1 ? 'request' : 'requests'} without bids
                        </span>
                      </div>
                      <div className="mt-2 space-y-1">
                        {student.requests.slice(0, 2).map((request) => (
                          <div key={request.id} className="text-xs text-muted-foreground flex items-center gap-2">
                            <Link
                              href={`/dashboard/requests/${request.id}`}
                              className="hover:underline text-blue-600"
                            >
                              {request.label}
                            </Link>
                            <span>•</span>
                            <span>{formatDate(request.created_at)}</span>
                          </div>
                        ))}
                        {student.requests.length > 2 && (
                          <p className="text-xs text-muted-foreground">
                            +{student.requests.length - 2} more {student.requests.length - 2 === 1 ? 'request' : 'requests'}
                          </p>
                        )}
                      </div>
                    </div>
                    <Link href={`/dashboard/requests?student_id=${student.studentId}&request_status=new`}>
                      <Button variant="outline" size="sm">
                        View Requests
                      </Button>
                    </Link>
                  </div>
                ))}
                {studentTracking.noBids.students.length > 10 && (
                  <div className="text-center pt-2">
                    <Link href="/dashboard/requests?request_status=new">
                      <Button variant="outline">
                        View All {studentTracking.noBids.count} Students
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Repeat Students (Loyalty Metric) */}
        {studentTracking && studentTracking.repeatStudents.count > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Repeat className="h-5 w-5 text-green-500" />
                Repeat Students (Loyalty Metric)
              </CardTitle>
              <CardDescription>
                Students who have made more than 2 requests - your loyal customers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {studentTracking.repeatStudents.students.slice(0, 10).map((student, index) => (
                  <div
                    key={student.studentId}
                    className="flex items-center justify-between p-4 bg-muted rounded-lg border border-green-200"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-700 font-bold text-sm">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/dashboard/students/${student.studentId}`}
                            className="font-medium hover:underline text-blue-600"
                          >
                            {student.studentName || 'Unknown'}
                          </Link>
                          <span className="text-xs text-muted-foreground">
                            ({student.email})
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span>
                            {student.requestCount} {student.requestCount === 1 ? 'request' : 'requests'} total
                          </span>
                          {student.totalSpent > 0 && (
                            <span className="font-semibold text-green-600">
                              Spent: {formatCurrency(student.totalSpent)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Link href={`/dashboard/students/${student.studentId}`}>
                      <Button variant="outline" size="sm">
                        View Profile
                      </Button>
                    </Link>
                  </div>
                ))}
                {studentTracking.repeatStudents.students.length > 10 && (
                  <div className="text-center pt-2">
                    <Link href="/dashboard/students">
                      <Button variant="outline">
                        View All {studentTracking.repeatStudents.count} Repeat Students
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Top Subjects */}
        {studentTracking && studentTracking.topSubjects.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Top Subjects
              </CardTitle>
              <CardDescription>
                Most requested subjects in all requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-end mb-4">
                <div className="flex gap-1">
                  <Button
                    variant={subjectPeriod === 'daily' ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setSubjectPeriod('daily')}
                  >
                    Daily
                  </Button>
                  <Button
                    variant={subjectPeriod === 'monthly' ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setSubjectPeriod('monthly')}
                  >
                    Monthly
                  </Button>
                </div>
              </div>
              <div className="space-y-4">
                {studentTracking.topSubjects.slice(0, 10).map((subject, index) => {
                  const currentCount = subjectPeriod === 'daily' ? subject.daily : subject.monthly;
                  const previousCount = subjectPeriod === 'daily' ? 0 : subject.lastMonth;
                  const change = calculateChange(currentCount, previousCount);
                  
                  return (
                    <div
                      key={subject.subject}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{subject.subject}</p>
                          <p className="text-sm text-muted-foreground">
                            {currentCount} {currentCount === 1 ? 'request' : 'requests'}
                          </p>
                        </div>
                      </div>
                      {subjectPeriod === 'monthly' && previousCount > 0 && (
                        <div className="flex items-center text-sm">
                          {change >= 0 ? (
                            <ArrowUpRight className="h-4 w-4 text-green-500" />
                          ) : (
                            <ArrowDownRight className="h-4 w-4 text-red-500" />
                          )}
                          <span
                            className={
                              change >= 0
                                ? "text-green-600 ml-1"
                                : "text-red-600 ml-1"
                            }
                          >
                            {Math.abs(change)}%
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Tutor Tracking Section */}
      <Card>
        <CardHeader 
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => toggleSection('tutorTracking')}
        >
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Tutor Tracking</CardTitle>
              <CardDescription className="mt-1">Monitor tutor registrations, activity, acceptance rates, and ratings</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              {sectionsOpen.tutorTracking ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        {sectionsOpen.tutorTracking && (
          <CardContent>
            <div className="space-y-6">

        {/* Tutor Tracking Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* New Tutor Registrations */}
          <Card className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                New Tutor Registrations
              </CardTitle>
              <UserPlus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                <div className="text-2xl font-bold">
                  {loading ? '...' : (
                    tutorRegistrationPeriod === 'daily'
                      ? tutorTracking?.newRegistrations.daily || 0
                      : tutorTracking?.newRegistrations.monthly || 0
                  )}
                </div>
                <div className="flex gap-1">
                  <Button
                    variant={tutorRegistrationPeriod === 'daily' ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setTutorRegistrationPeriod('daily')}
                  >
                    Daily
                  </Button>
                  <Button
                    variant={tutorRegistrationPeriod === 'monthly' ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setTutorRegistrationPeriod('monthly')}
                  >
                    Monthly
                  </Button>
                </div>
              </div>
              {tutorRegistrationPeriod === 'monthly' && tutorTracking && (
                <div className="flex items-center text-sm mt-1">
                  {getTutorRegistrationChange().type === "increase" ? (
                    <ArrowUpRight className="h-4 w-4 text-green-500" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 text-red-500" />
                  )}
                  <span
                    className={
                      getTutorRegistrationChange().type === "increase"
                        ? "text-green-600 ml-1"
                        : "text-red-600 ml-1"
                    }
                  >
                    {getTutorRegistrationChange().value}%
                  </span>
                  <span className="text-muted-foreground ml-1">vs last month</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Active Tutors */}
          <Card className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Tutors
              </CardTitle>
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                <div className="text-2xl font-bold">
                  {loading ? '...' : (
                    tutorActivePeriod === 'daily'
                      ? tutorTracking?.activeTutors.daily || 0
                      : tutorTracking?.activeTutors.monthly || 0
                  )}
                </div>
                <div className="flex gap-1">
                  <Button
                    variant={tutorActivePeriod === 'daily' ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setTutorActivePeriod('daily')}
                  >
                    Daily
                  </Button>
                  <Button
                    variant={tutorActivePeriod === 'monthly' ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setTutorActivePeriod('monthly')}
                  >
                    Monthly
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Tutors with assigned requests
              </p>
              {tutorActivePeriod === 'monthly' && tutorTracking && (
                <div className="flex items-center text-sm mt-1">
                  {getTutorActiveChange().type === "increase" ? (
                    <ArrowUpRight className="h-4 w-4 text-green-500" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 text-red-500" />
                  )}
                  <span
                    className={
                      getTutorActiveChange().type === "increase"
                        ? "text-green-600 ml-1"
                        : "text-red-600 ml-1"
                    }
                  >
                    {getTutorActiveChange().value}%
                  </span>
                  <span className="text-muted-foreground ml-1">vs last month</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tutor Acceptance Rate Average */}
          <Card className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Avg Acceptance Rate
              </CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? '...' : tutorTracking && tutorTracking.acceptanceRates.length > 0
                  ? `${Math.round(
                      tutorTracking.acceptanceRates.reduce((sum, tutor) => sum + tutor.acceptanceRate, 0) /
                      tutorTracking.acceptanceRates.length
                    )}%`
                  : '0%'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Average student acceptance rate
              </p>
            </CardContent>
          </Card>

          {/* Top Rated Tutors Count */}
          <Card className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Top Rated Tutors
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? '...' : tutorTracking?.topRated.length || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Tutors with ratings
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tutor Acceptance Rates */}
        {tutorTracking && tutorTracking.acceptanceRates.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-blue-500" />
                Tutor Acceptance Rates
              </CardTitle>
              <CardDescription>
                Percentage of student acceptances for each tutor's offers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {tutorTracking.acceptanceRates.slice(0, 10).map((tutor, index) => (
                  <div
                    key={tutor.tutorId}
                    className="flex items-center justify-between p-4 bg-muted rounded-lg border"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-sm">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <Link
                          href={`/dashboard/tutors/${tutor.tutorId}`}
                          className="font-medium hover:underline text-blue-600"
                        >
                          {tutor.tutorName || 'Unknown'}
                        </Link>
                        <p className="text-sm text-muted-foreground mt-1">
                          {tutor.acceptedOffers} accepted out of {tutor.totalOffers} offers
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        <div className="text-2xl font-bold text-blue-600">
                          {tutor.acceptanceRate}%
                        </div>
                        <div className="w-16 h-16 relative">
                          <svg className="w-16 h-16 transform -rotate-90">
                            <circle
                              cx="32"
                              cy="32"
                              r="28"
                              stroke="currentColor"
                              strokeWidth="6"
                              fill="none"
                              className="text-gray-200"
                            />
                            <circle
                              cx="32"
                              cy="32"
                              r="28"
                              stroke="currentColor"
                              strokeWidth="6"
                              fill="none"
                              strokeDasharray={`${2 * Math.PI * 28}`}
                              strokeDashoffset={`${2 * Math.PI * 28 * (1 - tutor.acceptanceRate / 100)}`}
                              className="text-blue-600"
                              strokeLinecap="round"
                            />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {tutorTracking.acceptanceRates.length > 10 && (
                  <div className="text-center pt-2">
                    <Link href="/dashboard/tutors">
                      <Button variant="outline">
                        View All {tutorTracking.acceptanceRates.length} Tutors
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Top Rated Tutors */}
        {tutorTracking && tutorTracking.topRated.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-yellow-500" />
                Top Rated Tutors
              </CardTitle>
              <CardDescription>
                Tutors with the highest ratings and completed requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {tutorTracking.topRated.slice(0, 10).map((tutor, index) => (
                  <div
                    key={tutor.tutorId}
                    className="flex items-center justify-between p-4 bg-muted rounded-lg border border-yellow-200"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-yellow-100 text-yellow-700 font-bold text-sm">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <Link
                          href={`/dashboard/tutors/${tutor.tutorId}`}
                          className="font-medium hover:underline text-blue-600"
                        >
                          {tutor.tutorName || 'Unknown'}
                        </Link>
                        <p className="text-sm text-muted-foreground mt-1">
                          {tutor.requestCount} {tutor.requestCount === 1 ? 'request' : 'requests'} completed
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div className="text-2xl font-bold text-yellow-600">
                          {tutor.rating.toFixed(1)}
                        </div>
                        <div className="flex items-center gap-1 text-yellow-500">
                          {[...Array(5)].map((_, i) => (
                            <span key={i}>
                              {i < Math.floor(tutor.rating) ? '★' : '☆'}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {tutorTracking.topRated.length > 10 && (
                  <div className="text-center pt-2">
                    <Link href="/dashboard/tutors">
                      <Button variant="outline">
                        View All {tutorTracking.topRated.length} Rated Tutors
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Requests & Sessions Section */}
      <Card>
        <CardHeader 
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => toggleSection('requestsAndSessions')}
        >
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Requests & Sessions</CardTitle>
              <CardDescription className="mt-1">Monitor request status, unmatched requests, and session completion rates</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              {sectionsOpen.requestsAndSessions ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        {sectionsOpen.requestsAndSessions && (
          <CardContent>
            <div className="space-y-6">

        {/* Requests & Sessions Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {/* Pending Requests */}
          <Card className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? '...' : requestsAndSessions?.totalByStatus.pending || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Waiting for bids</p>
            </CardContent>
          </Card>

          {/* Ongoing Requests */}
          <Card className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ongoing</CardTitle>
              <Hourglass className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? '...' : requestsAndSessions?.totalByStatus.ongoing || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">In progress</p>
            </CardContent>
          </Card>

          {/* Completed Requests */}
          <Card className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? '...' : requestsAndSessions?.totalByStatus.completed || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Finished</p>
            </CardContent>
          </Card>

          {/* Waiting for Payment */}
          <Card className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Waiting Payment</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? '...' : requestsAndSessions?.waitingForPayment || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Pending confirmation</p>
            </CardContent>
          </Card>

          {/* Completion Rate */}
          <Card className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
              <ListChecks className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? '...' : `${requestsAndSessions?.completionRate || 0}%`}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Session completion</p>
            </CardContent>
          </Card>
        </div>

        {/* Unmatched Requests */}
        {requestsAndSessions && requestsAndSessions.unmatchedRequests.count > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertIcon className="h-5 w-5 text-orange-500" />
                Unmatched Requests (No Tutor Found)
                <Badge variant="destructive" className="ml-2">
                  {requestsAndSessions.unmatchedRequests.count}
                </Badge>
              </CardTitle>
              <CardDescription>
                Requests without any tutor bids - flag for support follow-up
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {requestsAndSessions.unmatchedRequests.requests.slice(0, 10).map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-4 bg-muted rounded-lg border border-orange-200"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Link
                          href={`/dashboard/requests/${request.id}`}
                          className="font-medium hover:underline text-blue-600"
                        >
                          {request.label || 'Untitled Request'}
                        </Link>
                        <Badge variant="outline" className="text-xs">
                          {request.request_status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <Link
                          href={`/dashboard/students/${request.studentId}`}
                          className="hover:underline text-blue-600"
                        >
                          {request.studentName || 'Unknown'}
                        </Link>
                        <span>•</span>
                        <span>{request.subject || 'Unknown Subject'}</span>
                        <span>•</span>
                        <span>{formatDate(request.created_at)}</span>
                      </div>
                    </div>
                    <Link href={`/dashboard/requests/${request.id}`}>
                      <Button variant="outline" size="sm">
                        View Request
                      </Button>
                    </Link>
                  </div>
                ))}
                {requestsAndSessions.unmatchedRequests.requests.length > 10 && (
                  <div className="text-center pt-2">
                    <Link href="/dashboard/requests?request_status=new">
                      <Button variant="outline">
                        View All {requestsAndSessions.unmatchedRequests.count} Unmatched Requests
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Canceled Sessions */}
        {requestsAndSessions && requestsAndSessions.canceledSessions.count > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-500" />
                Canceled Sessions & Reasons
                <Badge variant="destructive" className="ml-2">
                  {requestsAndSessions.canceledSessions.count}
                </Badge>
              </CardTitle>
              <CardDescription>
                Canceled requests with their cancellation reasons
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Cancel Reasons Summary */}
              {requestsAndSessions.canceledSessions.reasons.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-semibold mb-3">Top Cancellation Reasons</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {requestsAndSessions.canceledSessions.reasons.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-muted rounded-lg border"
                      >
                        <div className="flex-1">
                          <p className="text-sm font-medium line-clamp-2">{item.reason}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {item.count} {item.count === 1 ? 'request' : 'requests'}
                          </p>
                        </div>
                        <div className="text-2xl font-bold text-red-600 ml-3">
                          {item.count}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Canceled Requests List */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold mb-3">Recent Canceled Requests</h4>
                {requestsAndSessions.canceledSessions.requests.slice(0, 10).map((request) => (
                  <div
                    key={request.id}
                    className="flex items-start justify-between p-4 bg-muted rounded-lg border border-red-200"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Link
                          href={`/dashboard/requests/${request.id}`}
                          className="font-medium hover:underline text-blue-600"
                        >
                          {request.label || 'Untitled Request'}
                        </Link>
                        <Badge variant="destructive" className="text-xs">
                          CANCELLED
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                        <Link
                          href={`/dashboard/students/${request.studentId}`}
                          className="hover:underline text-blue-600"
                        >
                          {request.studentName || 'Unknown'}
                        </Link>
                        <span>•</span>
                        <span>{formatDate(request.cancelled_at)}</span>
                      </div>
                      <div className="mt-2 p-2 bg-red-50 rounded border border-red-200">
                        <p className="text-xs font-semibold text-red-900 mb-1">Cancellation Reason:</p>
                        <p className="text-sm text-red-800">{request.cancelReason || 'No reason provided'}</p>
                      </div>
                    </div>
                    <Link href={`/dashboard/requests/${request.id}`}>
                      <Button variant="outline" size="sm">
                        View Request
                      </Button>
                    </Link>
                  </div>
                ))}
                {requestsAndSessions.canceledSessions.requests.length > 10 && (
                  <div className="text-center pt-2">
                    <Link href="/dashboard/requests?request_status=cancelled">
                      <Button variant="outline">
                        View All {requestsAndSessions.canceledSessions.count} Canceled Requests
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Chart Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Analytics Overview</CardTitle>
          <CardDescription>Revenue and user growth over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80 bg-muted rounded-lg flex items-center justify-center border">
            <div className="text-center">
              <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
              <p>Chart component would go here</p>
              <p className="text-sm text-muted-foreground">Connect your analytics library of choice</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 