"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LoadingOverlay, LoadingButton } from "@/components/ui/loading-spinner";
import { StatusBadge } from "@/components/ui/status-badge";
import { 
  Bell, 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Calendar,
  User,
  MessageSquare,
  Settings,
  Shield
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNotificationStore } from "@/stores/notification-management-store";
import { useFirebaseAuthStore } from "@/stores/firebase-auth-store";
import { AuthGuard } from "@/components/auth-guard";
import { 
  Notification, 
  NotificationFilters, 
  UserType, 
  NotificationType, 
  RequestType,
  NOTIFICATION_TYPE_LABELS,
  USER_TYPE_LABELS,
  REQUEST_TYPE_LABELS
} from "@/types/notification";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DataTable, TableColumn } from "@/components/ui/data-table";

export default function NotificationsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<NotificationFilters>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const {
    notifications,
    loading,
    error,
    total,
    fetchNotifications,
    createNotification,
    updateNotification,
    deleteNotification,
    setFilters: setStoreFilters,
    clearFilters,
  } = useNotificationStore();

  const { hasPermission } = useFirebaseAuthStore();

  // Fetch notifications on component mount and when filters change
  useEffect(() => {
    const searchFilters = {
      ...filters,
      search: searchTerm || undefined,
    };
    setStoreFilters(searchFilters);
    fetchNotifications(searchFilters, currentPage, pageSize);
  }, [filters, searchTerm, currentPage, pageSize, fetchNotifications, setStoreFilters]);

  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
    setCurrentPage(1); // Reset to first page when searching
  }, []);

  const handleFilterChange = (key: keyof NotificationFilters, value: string | undefined) => {
    const newFilters = {
      ...filters,
      [key]: value === "all" ? undefined : value || undefined,
    };
    setFilters(newFilters);
    setCurrentPage(1); // Reset to first page when filtering
  };

  const handleClearFilters = () => {
    setFilters({});
    setSearchTerm("");
    clearFilters();
    setCurrentPage(1);
  };

  const handleCreateNotification = async (data: any) => {
    try {
      await createNotification(data);
      setIsCreateDialogOpen(false);
      // Refresh the list
      fetchNotifications(filters, currentPage, pageSize);
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  };

  const handleUpdateNotification = async (id: string, data: any) => {
    try {
      await updateNotification(id, data);
      setIsEditDialogOpen(false);
      setSelectedNotification(null);
      // Refresh the list
      fetchNotifications(filters, currentPage, pageSize);
    } catch (error) {
      console.error('Error updating notification:', error);
    }
  };

  const handleDeleteNotification = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this notification?')) {
      try {
        await deleteNotification(id);
        // Refresh the list
        fetchNotifications(filters, currentPage, pageSize);
      } catch (error) {
        console.error('Error deleting notification:', error);
      }
    }
  };

  const handleEditClick = (notification: Notification) => {
    setSelectedNotification(notification);
    setIsEditDialogOpen(true);
  };

  // Define columns for the data table
  const columns: TableColumn<Notification>[] = [
    {
      key: "title",
      title: "Title",
      render: (value, row) => (
        <div className="font-medium">{value}</div>
      ),
    },
    {
      key: "body",
      title: "Body",
      render: (value, row) => (
        <div className="max-w-xs truncate">{value}</div>
      ),
    },
    {
      key: "userType",
      title: "User Type",
      render: (value, row) => {
        const userType = value as UserType;
        return (
          <Badge variant={userType === "STUDENT" ? "default" : "secondary"}>
            {USER_TYPE_LABELS[userType]}
          </Badge>
        );
      },
    },
    {
      key: "type",
      title: "Type",
      render: (value, row) => {
        const type = value as NotificationType;
        return (
          <Badge variant="outline">
            {NOTIFICATION_TYPE_LABELS[type]}
          </Badge>
        );
      },
    },
    {
      key: "requestType",
      title: "Request Type",
      render: (value, row) => {
        const requestType = value as RequestType;
        return (
          <Badge variant="outline">
            {REQUEST_TYPE_LABELS[requestType]}
          </Badge>
        );
      },
    },
    {
      key: "createdAt",
      title: "Created At",
      render: (value, row) => {
        const date = new Date(value as string);
        return (
          <div className="text-sm text-muted-foreground">
            {date.toLocaleDateString()} {date.toLocaleTimeString()}
          </div>
        );
      },
    },
  ];

  // Define actions for the data table
  const actions = [
    ...(hasPermission('notifications', 'write') ? [{
      label: "Edit",
      icon: Edit,
      onClick: (notification: Notification) => handleEditClick(notification),
      variant: "outline" as const,
    }] : []),
    ...(hasPermission('notifications', 'delete') ? [{
      label: "Delete",
      icon: Trash2,
      onClick: (notification: Notification) => handleDeleteNotification(notification.id),
      variant: "outline" as const,
    }] : []),
  ];

  return (
    <AuthGuard requiredPermission={{ resource: 'notifications', action: 'read' }}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
            <p className="text-muted-foreground">
            Manage notification templates for students and tutors
          </p>
        </div>
        {hasPermission('notifications', 'write') && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Notification
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Notification</DialogTitle>
              <DialogDescription>
                Create a new notification template for students or tutors.
              </DialogDescription>
            </DialogHeader>
            <NotificationForm
              onSubmit={handleCreateNotification}
              onCancel={() => setIsCreateDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
        )}
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search & Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search notifications..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="mr-2 h-4 w-4" />
              Filters
            </Button>
            <Button variant="outline" onClick={handleClearFilters}>
              Clear
            </Button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
              <div>
                <Label htmlFor="userType">User Type</Label>
                <Select
                  value={filters.userType || "all"}
                  onValueChange={(value) => handleFilterChange("userType", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All User Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All User Types</SelectItem>
                    <SelectItem value="STUDENT">Student</SelectItem>
                    <SelectItem value="TUTOR">Tutor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="type">Notification Type</Label>
                <Select
                  value={filters.type || "all"}
                  onValueChange={(value) => handleFilterChange("type", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {Object.entries(NOTIFICATION_TYPE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="requestType">Request Type</Label>
                <Select
                  value={filters.requestType || "all"}
                  onValueChange={(value) => handleFilterChange("requestType", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Request Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Request Types</SelectItem>
                    {Object.entries(REQUEST_TYPE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications ({total})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LoadingOverlay loading={loading}>
            <DataTable
              columns={columns}
              data={notifications}
              actions={actions}
              pagination={{
                currentPage,
                totalPages: Math.ceil(total / pageSize),
                totalItems: total,
                itemsPerPage: pageSize,
              }}
              onPageChange={setCurrentPage}
            />
          </LoadingOverlay>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      {hasPermission('notifications', 'write') && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Notification</DialogTitle>
              <DialogDescription>
                Update the notification template.
              </DialogDescription>
            </DialogHeader>
            {selectedNotification && (
              <NotificationForm
                initialData={selectedNotification}
                onSubmit={(data) => handleUpdateNotification(selectedNotification.id, data)}
                onCancel={() => {
                  setIsEditDialogOpen(false);
                  setSelectedNotification(null);
                }}
              />
            )}
          </DialogContent>
        </Dialog>
      )}
      </div>
    </AuthGuard>
  );
}

// Notification Form Component
interface NotificationFormProps {
  initialData?: Notification;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

function NotificationForm({ initialData, onSubmit, onCancel }: NotificationFormProps) {
  const [formData, setFormData] = useState({
    title: initialData?.title || "",
    body: initialData?.body || "",
    type: initialData?.type || "",
    userType: initialData?.userType || "",
    requestType: initialData?.requestType || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => handleChange("title", e.target.value)}
          required
        />
      </div>

      <div>
        <Label htmlFor="body">Body</Label>
        <Textarea
          id="body"
          value={formData.body}
          onChange={(e) => handleChange("body", e.target.value)}
          required
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="userType">User Type</Label>
          <Select
            value={formData.userType}
            onValueChange={(value) => handleChange("userType", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select user type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="STUDENT">Student</SelectItem>
              <SelectItem value="TUTOR">Tutor</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="type">Notification Type</Label>
          <Select
            value={formData.type}
            onValueChange={(value) => handleChange("type", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select notification type" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(NOTIFICATION_TYPE_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="requestType">Request Type</Label>
        <Select
          value={formData.requestType}
          onValueChange={(value) => handleChange("requestType", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select request type" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(REQUEST_TYPE_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {initialData ? "Update" : "Create"}
        </Button>
      </div>
    </form>
  );
}
