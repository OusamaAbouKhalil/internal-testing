"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  TrendingDown,
  Eye,
  Users,
  Clock,
  Globe,
  Download,
  Calendar
} from "lucide-react";
import { AuthGuard } from "@/components/auth-guard";

const analyticsData = [
  {
    title: "Page Views",
    value: "12,543",
    change: "+15%",
    changeType: "increase" as const,
    icon: Eye,
    timeframe: "vs last month"
  },
  {
    title: "Unique Visitors",
    value: "8,234",
    change: "+8%",
    changeType: "increase" as const,
    icon: Users,
    timeframe: "vs last month"
  },
  {
    title: "Avg. Session Duration",
    value: "3m 42s",
    change: "-5%",
    changeType: "decrease" as const,
    icon: Clock,
    timeframe: "vs last month"
  },
  {
    title: "Bounce Rate",
    value: "34.5%",
    change: "-12%",
    changeType: "increase" as const,
    icon: Globe,
    timeframe: "vs last month"
  },
];

const topPages = [
  { page: "/dashboard", views: "2,543", percentage: "20.3%" },
  { page: "/login", views: "1,876", percentage: "15.0%" },
  { page: "/users", views: "1,432", percentage: "11.4%" },
  { page: "/analytics", views: "987", percentage: "7.9%" },
  { page: "/settings", views: "654", percentage: "5.2%" },
];

export default function AnalyticsPage() {
  return (
    <AuthGuard requiredPermission={{ resource: 'analytics', action: 'read' }}>
      <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground mt-2">Track your website performance and user behavior</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Last 30 days
          </Button>
          <Button className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {analyticsData.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="hover:shadow-lg transition-shadow duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                <div className="flex items-center text-sm mt-1">
                  {stat.changeType === "increase" ? (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  )}
                  <span
                    className={
                      (stat.changeType === "increase" && stat.title !== "Bounce Rate") ||
                      (stat.changeType === "decrease" && stat.title === "Bounce Rate")
                        ? "text-green-600 ml-1"
                        : "text-red-600 ml-1"
                    }
                  >
                    {stat.change}
                  </span>
                  <span className="text-muted-foreground ml-1">{stat.timeframe}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Traffic Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Traffic Overview</CardTitle>
            <CardDescription>Daily page views and unique visitors</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80 bg-gradient-to-r from-blue-50 to-indigo-100 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <TrendingUp className="h-12 w-12 text-blue-500 mx-auto mb-2" />
                <p className="text-muted-foreground font-medium">Line Chart</p>
                <p className="text-sm text-muted-foreground">Traffic trends over time</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Pages */}
        <Card>
          <CardHeader>
            <CardTitle>Top Pages</CardTitle>
            <CardDescription>Most visited pages this month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topPages.map((page, index) => (
                <div key={page.page} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-600 rounded text-sm font-medium">
                      {index + 1}
                    </div>
                    <span className="font-mono text-sm text-foreground">{page.page}</span>
                  </div>
                  <div className="flex items-center space-x-4 text-sm">
                    <span className="text-muted-foreground">{page.views} views</span>
                    <span className="font-medium text-foreground">{page.percentage}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Device Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Device Types</CardTitle>
            <CardDescription>Traffic by device category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-48 bg-gradient-to-r from-green-50 to-emerald-100 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <Globe className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">Pie Chart</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Browser Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Browsers</CardTitle>
            <CardDescription>Most used browsers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-48 bg-gradient-to-r from-purple-50 to-violet-100 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <Globe className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">Bar Chart</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Geographic Data */}
        <Card>
          <CardHeader>
            <CardTitle>Locations</CardTitle>
            <CardDescription>Visitors by country</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-48 bg-gradient-to-r from-orange-50 to-amber-100 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <Globe className="h-8 w-8 text-orange-500 mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">World Map</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    </AuthGuard>
  );
} 