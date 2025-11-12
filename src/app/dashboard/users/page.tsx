"use client";

import { useState, useEffect, useCallback } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LoadingOverlay, LoadingButton } from "@/components/ui/loading-spinner";
import { StatusBadge, VerificationBadge, NotificationBadge } from "@/components/ui/status-badge";
import { EnhancedUserDialog } from "@/components/enhanced-user-dialog";
import { Users, Plus, Search, Filter, Edit, Trash2, Shield, Mail, Calendar, UserCheck, UserX } from "lucide-react";
import { useUserManagementStore } from "@/stores/user-management-store";
import { useFirebaseAuthStore } from "@/stores/firebase-auth-store";
import { User } from "@/types/auth";

export default function UsersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');

  const { 
    users, 
    loading, 
    error, 
    fetchUsers, 
    createUser, 
    updateUser, 
    deleteUser
  } = useUserManagementStore();

  const { 
    roles, 
    hasPermission
  } = useFirebaseAuthStore();

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleCreateUser = useCallback(async (userData: any) => {
    await createUser(userData);
  }, [createUser]);

  const handleUpdateUser = useCallback(async (userData: any) => {
    if (!selectedUser) return;
    await updateUser(selectedUser.uid, userData);
  }, [selectedUser, updateUser]);

  const handleDeleteUser = useCallback(async (userId: string) => {
    if (confirm('Are you sure you want to delete this user?')) {
      await deleteUser(userId);
    }
  }, [deleteUser]);

  const openCreateDialog = useCallback(() => {
    setDialogMode('create');
    setSelectedUser(null);
    setIsCreateDialogOpen(true);
  }, []);

  const openEditDialog = useCallback((user: User) => {
    setDialogMode('edit');
    setSelectedUser(user);
    setIsEditDialogOpen(true);
  }, []);

  const filteredUsers = users.filter(user =>
    user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user?.displayName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getUserRoleNames = (user: User) => {
    return user.roles.map(userRole => {
      const role = roles.find(r => r.id === userRole.roleId);
      return role?.name || 'Unknown Role';
    });
  };

  return (
    <AuthGuard requiredPermission={{ resource: 'users', action: 'read' }}>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Users</h1>
            <p className="text-muted-foreground mt-2">Manage user accounts and permissions</p>
        </div>
          <div className="flex space-x-2">
            <Button variant="outline" className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filter
            </Button>
            {hasPermission('users', 'write') && (
              <LoadingButton
                onClick={openCreateDialog}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add User
              </LoadingButton>
            )}
          </div>
      </div>

        {/* Search Bar */}
        <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Users Grid */}
        <LoadingOverlay loading={loading}>
          <div className="grid gap-4">
            {filteredUsers.map((user) => (
              <Card key={user.uid} className="transition-all duration-200 hover:shadow-md">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                          {(user.displayName || user.email).charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            {user.displayName || 'No Name'}
                          </CardTitle>
                          <CardDescription className="flex items-center gap-2 mt-1">
                            <Mail className="h-4 w-4" />
                            {user.email}
                          </CardDescription>
                        </div>
                      </div>
                      
                      {/* Status Badges */}
                      <div className="flex flex-wrap gap-2 mb-3">
                        <VerificationBadge 
                          verified={true} // You might want to add this field to your User type
                          emailVerified={user.emailVerified} 
                        />
                        <StatusBadge status="active" />
                        <NotificationBadge enabled={true} />
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      {hasPermission('users', 'write') && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(user)}
                          className="hover:bg-blue-50 hover:border-blue-200"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      
                      {hasPermission('users', 'delete') && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteUser(user.uid)}
                          className="hover:bg-red-50 hover:border-red-200 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Roles:
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {getUserRoleNames(user).map((roleName) => (
                          <Badge key={roleName} variant="secondary" className="bg-blue-100 text-blue-800">
                            {roleName}
                          </Badge>
                        ))}
                        {getUserRoleNames(user).length === 0 && (
                          <Badge variant="outline">No roles assigned</Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>Created: {user.createdAt.toLocaleDateString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </LoadingOverlay>

        {filteredUsers.length === 0 && !loading && (
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No users found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm ? 'No users match your search criteria.' : 'Users will appear here once they are added to the system.'}
                </p>
                {hasPermission('users', 'write') && !searchTerm && (
                  <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First User
                  </Button>
                )}
          </div>
        </CardContent>
      </Card>
        )}

        {/* Enhanced User Dialog */}
        <EnhancedUserDialog
          open={isCreateDialogOpen || isEditDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              setIsCreateDialogOpen(false);
              setIsEditDialogOpen(false);
              setSelectedUser(null);
            }
          }}
          user={selectedUser}
          mode={dialogMode}
          onSave={dialogMode === 'create' ? handleCreateUser : handleUpdateUser}
          loading={loading}
          error={error}
        />
    </div>
    </AuthGuard>
  );
} 