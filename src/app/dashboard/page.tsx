"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  ShoppingCart, 
  TrendingUp, 
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Bell
} from "lucide-react";

// Test notification function
const createTestNotification = async () => {
  try {
    const response = await fetch('/api/admin-notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'message',
        requestId: 'test-request-123',
        chatId: 'test-chat-456',
        senderType: 'student',
        senderId: 'student-789',
        senderName: 'John Doe',
        senderNickname: 'Johnny',
        message: 'Hello, I need help with my math homework!',
        content: 'Johnny sent a message: "Hello, I need help with my math homework!"'
      }),
    });

    if (response.ok) {
      console.log('Test notification created successfully');
    } else {
      console.error('Failed to create test notification');
    }
  } catch (error) {
    console.error('Error creating test notification:', error);
  }
};

// Create a test request first, then notification
const createTestRequestAndNotification = async () => {
  try {
    // First create a test request
    const requestResponse = await fetch('/api/requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        student_id: 'test-student-123',
        subject: 'Mathematics',
        sub_subject: 'Algebra',
        assistance_type: 'HOMEWORK',
        language: 'English',
        country: 'United States',
        description: 'Need help with quadratic equations',
        budget: '50',
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
      }),
    });

    if (requestResponse.ok) {
      const requestData = await requestResponse.json();
      const requestId = requestData.request.id;
      
      // Then create notification with the real request ID
      const notificationResponse = await fetch('/api/admin-notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'message',
          requestId: requestId,
          chatId: 'test-chat-456',
          senderType: 'student',
          senderId: 'student-789',
          senderName: 'John Doe',
          senderNickname: 'Johnny',
          message: 'Hello, I need help with my math homework!',
          content: 'Johnny sent a message: "Hello, I need help with my math homework!"'
        }),
      });

      if (notificationResponse.ok) {
        console.log('Test request and notification created successfully');
      } else {
        console.error('Failed to create test notification');
      }
    } else {
      console.error('Failed to create test request');
    }
  } catch (error) {
    console.error('Error creating test request and notification:', error);
  }
};

const stats = [
  {
    title: "Total Users",
    value: "2,543",
    change: "+12%",
    changeType: "increase" as const,
    icon: Users,
  },
  {
    title: "Orders",
    value: "1,423",
    change: "+8%",
    changeType: "increase" as const,
    icon: ShoppingCart,
  },
  {
    title: "Revenue",
    value: "$43,210",
    change: "+15%",
    changeType: "increase" as const,
    icon: TrendingUp,
  },
  {
    title: "Active Sessions",
    value: "573",
    change: "-3%",
    changeType: "decrease" as const,
    icon: Activity,
  },
];

const recentActivities = [
  {
    id: 1,
    user: "John Doe",
    action: "Created new order",
    time: "2 minutes ago",
  },
  {
    id: 2,
    user: "Jane Smith",
    action: "Updated profile",
    time: "5 minutes ago",
  },
  {
    id: 3,
    user: "Mike Johnson",
    action: "Completed payment",
    time: "10 minutes ago",
  },
  {
    id: 4,
    user: "Sarah Wilson",
    action: "Joined the platform",
    time: "15 minutes ago",
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-2">Welcome back! Here's what's happening today.</p>
        
        {/* Test Dialog Buttons */}
        <div className="mt-4 flex gap-2 flex-wrap">
          <Button 
            onClick={createTestNotification}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Bell className="h-4 w-4" />
            Test Notification
          </Button>
          <Button 
            onClick={createTestRequestAndNotification}
            variant="default"
            className="flex items-center gap-2"
          >
            <Bell className="h-4 w-4" />
            Test Request + Notification
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="hover:shadow-lg transition-shadow duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="flex items-center text-sm mt-1">
                  {stat.changeType === "increase" ? (
                    <ArrowUpRight className="h-4 w-4 text-green-500" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 text-red-500" />
                  )}
                  <span
                    className={
                      stat.changeType === "increase"
                        ? "text-green-600 ml-1"
                        : "text-red-600 ml-1"
                    }
                  >
                    {stat.change}
                  </span>
                  <span className="text-muted-foreground ml-1">from last month</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest actions from your users</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg border"
                >
                  <div>
                    <p className="font-medium">{activity.user}</p>
                    <p className="text-sm text-muted-foreground">{activity.action}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{activity.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks you might want to perform</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start" variant="outline">
              <Users className="mr-2 h-4 w-4" />
              Manage Users
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <ShoppingCart className="mr-2 h-4 w-4" />
              View Orders
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <TrendingUp className="mr-2 h-4 w-4" />
              Analytics Report
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Activity className="mr-2 h-4 w-4" />
              System Status
            </Button>
          </CardContent>
        </Card>
      </div>

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