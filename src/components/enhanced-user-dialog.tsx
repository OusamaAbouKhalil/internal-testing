"use client";

import React, { useState, useCallback, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { LoadingButton, LoadingSpinner } from "@/components/ui/loading-spinner";
import { StatusBadge, NotificationBadge, VerificationBadge } from "@/components/ui/status-badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  User, 
  Mail, 
  Phone, 
  Shield, 
  Bell, 
  BellOff, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Eye,
  EyeOff 
} from "lucide-react";
import { User as UserType } from "@/types/auth";
import { useFirebaseAuthStore } from "@/stores/firebase-auth-store";

interface EnhancedUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserType | null;
  mode: 'create' | 'edit';
  onSave: (userData: any) => Promise<void>;
  loading?: boolean;
  error?: string | null;
}

interface UserFormData {
  email: string;
  password: string;
  displayName: string;
  roles: string[];
  // Enhanced fields
  emailVerified: boolean;
  isActive: boolean;
  sendNotifications: boolean;
  // Additional profile fields
  phoneNumber?: string;
  photoURL?: string;
}

export function EnhancedUserDialog({
  open,
  onOpenChange,
  user,
  mode,
  onSave,
  loading = false,
  error = null
}: EnhancedUserDialogProps) {
  const { roles, hasPermission } = useFirebaseAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<UserFormData>({
    email: '',
    password: '',
    displayName: '',
    roles: [],
    emailVerified: false,
    isActive: true,
    sendNotifications: true,
    phoneNumber: '',
    photoURL: ''
  });

  // Memoized form validation
  const isFormValid = useMemo(() => {
    if (mode === 'create') {
      return formData.email && formData.password && formData.displayName;
    }
    return formData.email && formData.displayName;
  }, [formData, mode]);

  // Initialize form data when user changes
  React.useEffect(() => {
    if (user && mode === 'edit') {
      setFormData({
        email: user.email,
        password: '',
        displayName: user.displayName || '',
        roles: user.roles.map(role => role.roleId),
        emailVerified: user.emailVerified,
        isActive: true, // You might want to add this field to your User type
        sendNotifications: true, // You might want to add this field to your User type
        phoneNumber: '', // You might want to add this field to your User type
        photoURL: user.photoURL || ''
      });
    } else if (mode === 'create') {
      setFormData({
        email: '',
        password: '',
        displayName: '',
        roles: [],
        emailVerified: false,
        isActive: true,
        sendNotifications: true,
        phoneNumber: '',
        photoURL: ''
      });
    }
  }, [user, mode, open]);

  const handleFieldChange = useCallback((field: keyof UserFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleSave = useCallback(async () => {
    if (!isFormValid) return;
    
    console.log('🔍 Form data being saved:', formData);
    console.log('🔍 Password in formData:', formData.password);
    
    try {
      await onSave(formData);
      onOpenChange(false);
    } catch (err) {
      console.error('Failed to save user:', err);
    }
  }, [formData, isFormValid, onSave, onOpenChange]);

  const handleCancel = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  // Memoized role options
  const roleOptions = useMemo(() => 
    roles.map(role => ({ value: role.id, label: role.name })),
    [roles]
  );

  const getUserRoleNames = useMemo(() => {
    if (!user) return [];
    return user.roles.map(userRole => {
      const role = roles.find(r => r.id === userRole.roleId);
      return role?.name || 'Unknown Role';
    });
  }, [user, roles]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {mode === 'create' ? 'Create New User' : 'Edit User'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create' 
              ? 'Create a new user account with roles and permissions.' 
              : 'Update user information, roles, and settings.'
            }
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" className="mx-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex-1 overflow-y-auto px-6">
          <div className="space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleFieldChange('email', e.target.value)}
                      placeholder="user@example.com"
                      disabled={mode === 'edit'}
                      className={mode === 'edit' ? 'bg-gray-50' : ''}
                    />
                  </div>

                  <div>
                    <Label htmlFor="displayName">Display Name *</Label>
                    <Input
                      id="displayName"
                      value={formData.displayName}
                      onChange={(e) => handleFieldChange('displayName', e.target.value)}
                      placeholder="John Doe"
                    />
                  </div>
                </div>

                {mode === 'create' && (
                  <div>
                    <Label htmlFor="password">Password *</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={(e) => handleFieldChange('password', e.target.value)}
                        placeholder="Enter password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                <div>
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  <Input
                    id="phoneNumber"
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(e) => handleFieldChange('phoneNumber', e.target.value)}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Account Status */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Account Status & Permissions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {mode === 'edit' && user && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    <VerificationBadge 
                      verified={formData.emailVerified} 
                      emailVerified={user.emailVerified} 
                    />
                    <StatusBadge status={formData.isActive ? 'active' : 'inactive'} />
                    <NotificationBadge enabled={formData.sendNotifications} />
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {hasPermission('users', 'manage') && (
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <Label htmlFor="emailVerified" className="text-sm font-medium">
                          Email Verified
                        </Label>
                        <p className="text-xs text-muted-foreground">Mark email as verified</p>
                      </div>
                      <Switch
                        id="emailVerified"
                        checked={formData.emailVerified}
                        onCheckedChange={(checked) => handleFieldChange('emailVerified', checked)}
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <Label htmlFor="isActive" className="text-sm font-medium">
                        Account Active
                      </Label>
                      <p className="text-xs text-muted-foreground">Enable/disable account</p>
                    </div>
                    <Switch
                      id="isActive"
                      checked={formData.isActive}
                      onCheckedChange={(checked) => handleFieldChange('isActive', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <Label htmlFor="sendNotifications" className="text-sm font-medium">
                        Notifications
                      </Label>
                      <p className="text-xs text-muted-foreground">Send email notifications</p>
                    </div>
                    <Switch
                      id="sendNotifications"
                      checked={formData.sendNotifications}
                      onCheckedChange={(checked) => handleFieldChange('sendNotifications', checked)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Roles & Permissions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Roles & Permissions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {mode === 'edit' && user && getUserRoleNames.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium">Current Roles</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {getUserRoleNames.map((roleName) => (
                        <Badge key={roleName} variant="secondary">
                          {roleName}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <Label>Assign Role</Label>
                  <Select
                    value={formData.roles[0] || ''}
                    onValueChange={(value) => handleFieldChange('roles', [value])}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      {roleOptions.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex-shrink-0 flex justify-end space-x-2 p-6 border-t">
          <Button variant="outline" onClick={handleCancel} disabled={loading}>
            Cancel
          </Button>
          <LoadingButton
            loading={loading}
            onClick={handleSave}
            disabled={!isFormValid}
            className="min-w-[100px]"
          >
            {mode === 'create' ? 'Create User' : 'Update User'}
          </LoadingButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
