"use client";

import { useState, useEffect } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Award,
  AlertTriangle,
  Eye,
  GraduationCap,
  UserCheck,
  Calendar,
  MessageSquare,
  Star,
  Download
} from "lucide-react";
import { getRequestTypeLabel } from "@/types/request";
import { format } from "date-fns";

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetchReports();
  }, [year]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/reports/dashboard?year=${year}`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch reports');
      }

      setData(result.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load reports');
      console.error('Error fetching reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateValue: any) => {
    if (!dateValue) return 'N/A';
    try {
      let date: Date;
      if (dateValue._seconds) {
        date = new Date(dateValue._seconds * 1000);
      } else if (dateValue.toDate) {
        date = dateValue.toDate();
      } else {
        date = new Date(dateValue);
      }
      return format(date, 'MMM dd, yyyy');
    } catch {
      return 'N/A';
    }
  };

  if (loading && !data) {
    return (
      <AuthGuard>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner />
        </div>
      </AuthGuard>
    );
  }

  if (error && !data) {
    return (
      <AuthGuard>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </AuthGuard>
    );
  }

  const profitChange = data?.profit?.lastYear 
    ? ((data.profit.thisYear - data.profit.lastYear) / data.profit.lastYear) * 100 
    : 0;

  return (
    <AuthGuard>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Reports Dashboard</h1>
            <p className="text-muted-foreground mt-2">Analytics and insights for your platform</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="px-3 py-2 border rounded-md"
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <Button variant="outline" onClick={fetchReports} disabled={loading}>
              <Download className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Profit Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-green-200 bg-green-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700">
                <DollarSign className="h-5 w-5" />
                This Year ({year})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-700">
                {formatCurrency(data?.profit?.thisYear || 0)}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Total profit from completed requests
              </p>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-blue-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-700">
                <DollarSign className="h-5 w-5" />
                Last Year ({year - 1})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-700">
                {formatCurrency(data?.profit?.lastYear || 0)}
              </div>
              <div className="flex items-center gap-2 mt-2">
                {profitChange > 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                ) : profitChange < 0 ? (
                  <TrendingDown className="h-4 w-4 text-red-600" />
                ) : null}
                <span className={`text-sm font-medium ${
                  profitChange > 0 ? 'text-green-600' : profitChange < 0 ? 'text-red-600' : 'text-muted-foreground'
                }`}>
                  {profitChange > 0 ? '+' : ''}{profitChange.toFixed(1)}% vs last year
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Visitors */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Visitors
            </CardTitle>
            <CardDescription>Visitor statistics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Today</p>
                <p className="text-2xl font-bold">{data?.visitors?.today || 0}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">This Week</p>
                <p className="text-2xl font-bold">{data?.visitors?.thisWeek || 0}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">This Month</p>
                <p className="text-2xl font-bold">{data?.visitors?.thisMonth || 0}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{data?.visitors?.total || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Tutors */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Top Tutors
            </CardTitle>
            <CardDescription>Top tutors by completed requests</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : data?.topTutors?.length > 0 ? (
              <div className="space-y-4">
                {data.topTutors.map((tutor: any, index: number) => (
                  <div key={tutor.tutorId} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-sm">
                            #{index + 1}
                          </Badge>
                          <h3 className="font-semibold">{tutor.tutorName}</h3>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          ID: {tutor.tutorId}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Completed Requests</p>
                        <p className="text-2xl font-bold text-blue-600">{tutor.completedCount}</p>
                        <p className="text-sm text-muted-foreground mt-1">Profit Generated</p>
                        <p className="text-lg font-semibold text-green-600">
                          {formatCurrency(tutor.totalProfit)}
                        </p>
                      </div>
                    </div>

                    {/* Request Types */}
                    <div className="mb-3">
                      <p className="text-sm font-medium mb-2">Request Types:</p>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(tutor.requestTypes || {}).map(([type, count]: [string, any]) => (
                          <Badge key={type} variant="secondary">
                            {getRequestTypeLabel(type as any)}: {count}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Recent Requests */}
                    {tutor.requests?.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2">Recent Requests:</p>
                        <div className="space-y-2">
                          {tutor.requests.slice(0, 3).map((req: any) => (
                            <div key={req.id} className="text-sm bg-muted p-2 rounded">
                              <div className="flex justify-between items-start">
                                <span className="font-medium">{req.label || 'Untitled Request'}</span>
                                <Badge variant="outline" className="ml-2">
                                  {getRequestTypeLabel(req.assistance_type)}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                {formatDate(req.created_at)}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">No tutors found</p>
            )}
          </CardContent>
        </Card>

        {/* Top Students */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Top Students
            </CardTitle>
            <CardDescription>Students with most requests created</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : data?.topStudents?.length > 0 ? (
              <div className="space-y-4">
                {data.topStudents.map((student: any, index: number) => (
                  <div key={student.studentId} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-sm">
                            #{index + 1}
                          </Badge>
                          <h3 className="font-semibold">{student.studentName}</h3>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          ID: {student.studentId}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Total Requests</p>
                        <p className="text-2xl font-bold text-purple-600">{student.requestCount}</p>
                      </div>
                    </div>

                    {/* Recent Requests */}
                    {student.requests?.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2">Recent Requests:</p>
                        <div className="space-y-2">
                          {student.requests.slice(0, 5).map((req: any) => (
                            <div key={req.id} className="text-sm bg-muted p-2 rounded">
                              <div className="flex justify-between items-start">
                                <span className="font-medium">{req.label || 'Untitled Request'}</span>
                                <div className="flex gap-2">
                                  <Badge variant="outline">
                                    {getRequestTypeLabel(req.assistance_type)}
                                  </Badge>
                                  <Badge variant={req.request_status === 'completed' ? 'default' : 'secondary'}>
                                    {req.request_status}
                                  </Badge>
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                {formatDate(req.created_at)}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">No students found</p>
            )}
          </CardContent>
        </Card>

        {/* Student Complaints */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Student Complaints & Bad Feedback
            </CardTitle>
            <CardDescription>Reports about students with complaints and bad feedback</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : data?.complaints?.length > 0 ? (
              <div className="space-y-4">
                {data.complaints.map((complaint: any) => (
                  <div key={complaint.id} className="border border-red-200 rounded-lg p-4 bg-red-50/50">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{complaint.studentName}</h3>
                          {complaint.rating && (
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                              <span className="text-sm font-medium">{complaint.rating}/5</span>
                            </div>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Student ID: {complaint.studentId}
                        </p>
                        <p className="text-sm font-medium mt-1">
                          Request: {complaint.requestLabel || 'Untitled Request'}
                        </p>
                      </div>
                      <Badge variant="destructive">{complaint.issue}</Badge>
                    </div>
                    {complaint.feedback && (
                      <div className="mt-3 p-3 bg-white rounded border">
                        <p className="text-sm font-medium mb-1">Feedback:</p>
                        <p className="text-sm text-muted-foreground">{complaint.feedback}</p>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      <Calendar className="h-3 w-3 inline mr-1" />
                      {formatDate(complaint.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">No complaints found</p>
            )}
          </CardContent>
        </Card>
      </div>
    </AuthGuard>
  );
}

