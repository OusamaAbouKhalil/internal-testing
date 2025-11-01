"use client";

import React, { useState, useCallback, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-spinner";
import { StatusBadge, NotificationBadge } from "@/components/ui/status-badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  GraduationCap, 
  CheckCircle, 
  AlertTriangle,
  Eye,
  EyeOff,
  User,
  Mail,
  Lock,
  Phone,
  MessageCircle,
  MapPin,
  FileText,
  Image as ImageIcon,
  Shield,
  Bell,
  Ban
} from "lucide-react";
import { Tutor, CreateTutorData } from "@/types/tutor";
import { PhoneCountrySelector } from "@/components/ui/phone-country-selector";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageUpload } from "@/components/ui/image-upload";
import { CountrySelectorEnhanced } from "@/components/ui/country-selector-enhanced";
import { Switch } from "@/components/ui/switch";
import TutorAccountSettingsSection from "./form-sections/tutor-account-settings-section";

interface EnhancedTutorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tutor: Tutor | null;
  mode: 'create' | 'edit';
  onSave: (tutorData: any) => Promise<void>;
  loading?: boolean;
  error?: string | null;
}

export interface TutorFormData {
  email: string;
  password: string;
  confirmPassword: string;
  full_name: string;
  nickname?: string;
  bio?: string;
  phone?: string;
  phone_country_code?: string;
  whatsapp_phone?: string;
  whatsapp_country_code?: string;
  country?: string;
  profile_image?: string;
  platform?: string;
  // Enhanced fields for editing
  verified: string;
  send_notifications: string;
  locked: string;
  cancelled: string;
}

export const EnhancedTutorDialog = React.memo(function EnhancedTutorDialog({
  open,
  onOpenChange,
  tutor,
  mode,
  onSave,
  loading = false,
  error = null
}: EnhancedTutorDialogProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [isValidatingEmail, setIsValidatingEmail] = useState(false);
  const [isValidatingPhone, setIsValidatingPhone] = useState(false);
  const [formData, setFormData] = useState<TutorFormData>({
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    nickname: '',
    bio: '',
    phone: '',
    phone_country_code: '+961',
    whatsapp_phone: '',
    whatsapp_country_code: '+961',
    country: '',
    profile_image: '',
    platform: 'web',
    // Enhanced fields
    verified: '0',
    send_notifications: '1',
    locked: '0',
    cancelled: '0'
  });

  // Password matching validation
  const passwordsMatch = useMemo(() => {
    // In edit mode, if both fields are empty, consider it valid (no password change)
    if (mode === 'edit' && !formData.password && !formData.confirmPassword) return true;
    return formData.password === formData.confirmPassword;
  }, [formData.password, formData.confirmPassword, mode]);

  const passwordError = useMemo(() => {
    // In edit mode, if both fields are empty, no error (no password change)
    if (mode === 'edit' && !formData.password && !formData.confirmPassword) return '';
    
    // Only validate if user has started entering password
    if (!formData.password && !formData.confirmPassword) return '';
    
    if (!passwordsMatch) return 'Passwords do not match';
    if (formData.password && formData.password.length < 6) return 'Password must be at least 6 characters';
    return '';
  }, [formData.password, formData.confirmPassword, passwordsMatch, mode]);

  // Memoized form validation
  const isFormValid = useMemo(() => {
    // Check for validation errors
    if (emailError || phoneError) return false;
    
    // Check basic required fields
    if (mode === 'create') {
      return formData.email && 
             formData.password && 
             formData.confirmPassword &&
             formData.full_name && 
             passwordsMatch &&
             formData.password.length >= 6;
    }
    
    // For edit mode - password is optional
    // If user enters password, both fields must be filled and match
    if (formData.password || formData.confirmPassword) {
      // If one field is filled, both must be filled
      if (!formData.password || !formData.confirmPassword) {
        return false;
      }
      
      return formData.email && 
             formData.full_name && 
             passwordsMatch &&
             formData.password.length >= 6;
    }
    
    // Edit mode without password change - just basic fields
    return formData.email && formData.full_name;
  }, [formData, mode, passwordsMatch, emailError, phoneError]);

  // Memoized status badges
  const statusBadges = useMemo(() => {
    const badges = [];
    
    if (formData.verified === '2') {
      badges.push(<StatusBadge key="verified" status="verified" />);
    } else {
      badges.push(<StatusBadge key="pending" status="pending" />);
    }
    
    if (formData.cancelled === '1') {
      badges.push(<Badge key="cancelled" variant="destructive">Cancelled</Badge>);
    }
    
    if (formData.locked === '1') {
      badges.push(<Badge key="locked" variant="outline">Locked</Badge>);
    }
    
    badges.push(
      <NotificationBadge 
        key="notifications" 
        enabled={formData.send_notifications === '1'} 
      />
    );
    
    return badges;
  }, [formData.verified, formData.cancelled, formData.locked, formData.send_notifications]);

  // Initialize form data when tutor changes
  React.useEffect(() => {
    if (tutor && mode === 'edit') {
      setFormData({
        email: tutor.email,
        password: '',
        confirmPassword: '',
        full_name: tutor.full_name || '',
        nickname: tutor.nickname || '',
        bio: tutor.bio || '',
        phone: tutor.phone || '',
        phone_country_code: tutor.phone_country_code || '+961',
        whatsapp_phone: tutor.whatsapp_phone || '',
        whatsapp_country_code: tutor.whatsapp_country_code || '+961',
        country: tutor.country || '',
        profile_image: tutor.profile_image || '',
        platform: tutor.platform || 'web',
        verified: tutor.verified || '0',
        send_notifications: tutor.send_notifications || '1',
        locked: tutor.locked || '0',
        cancelled: tutor.cancelled || '0'
      });
    } else if (mode === 'create') {
      setFormData({
        email: '',
        password: '',
        confirmPassword: '',
        full_name: '',
        nickname: '',
        bio: '',
        phone: '',
        phone_country_code: '+961',
        whatsapp_phone: '',
        whatsapp_country_code: '+961',
        country: '',
        profile_image: '',
        platform: 'web',
        verified: '0',
        send_notifications: '1',
        locked: '0',
        cancelled: '0'
      });
    }
  }, [tutor, mode, open]);

  const handleFieldChange = useCallback((field: keyof TutorFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear validation errors when user starts typing
    if (field === 'email') {
      setEmailError('');
    }
    if (field === 'phone') {
      setPhoneError('');
    }
  }, []);

  const handleSave = useCallback(async () => {
    if (!isFormValid) return;
    
    try {
      // Final validation before save
      setTimeout(async () => {
        if (emailError || phoneError) {
          console.error('Validation errors exist, cannot save');
          return;
        }

        // Remove confirmPassword and only include password if it's set
        const { confirmPassword, ...dataWithoutConfirm } = formData;
        const cleanedFormData = {
          ...dataWithoutConfirm,
          password: mode === 'edit' && !formData.password ? undefined : formData.password,
        };
        
        await onSave(cleanedFormData);
        onOpenChange(false);
      }, 100);
    } catch (err) {
      console.error('Failed to save tutor:', err);
    }
  }, [formData, isFormValid, mode, onSave, onOpenChange, emailError, phoneError]);

  const handleCancel = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[100vw] md:w-[80vw] lg:w-[70vw] sm:max-w-[70vw] max-w-none max-h-[98vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            {mode === 'create' ? 'Create New Tutor' : 'Edit Tutor'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create' 
              ? 'Create a new tutor account with contact information.' 
              : 'Update tutor information and account settings.'
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
            {/* Account Status - Only render when editing */}
            {mode === 'edit' && tutor && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Account Status & Permissions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Status Badges */}
                    <div>
                      <Label className="text-sm text-muted-foreground mb-2 block">Current Status</Label>
                      <div className="flex flex-wrap gap-2">
                        {statusBadges}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Account Settings */}
            <TutorAccountSettingsSection
              formData={formData}
              onFieldChange={handleFieldChange}
            />

            {/* Basic Information */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="full_name" className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      Full Name *
                    </Label>
                    <Input
                      id="full_name"
                      placeholder="Enter full name"
                      value={formData.full_name}
                      onChange={(e) => handleFieldChange('full_name', e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="nickname" className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      Nickname
                    </Label>
                    <Input
                      id="nickname"
                      placeholder="Enter nickname"
                      value={formData.nickname}
                      onChange={(e) => handleFieldChange('nickname', e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="email" className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      Email *
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter email address"
                      value={formData.email}
                      onChange={(e) => handleFieldChange('email', e.target.value)}
                      required
                      className={emailError ? 'border-red-500' : ''}
                    />
                    {isValidatingEmail && (
                      <p className="text-sm text-muted-foreground mt-1">Checking email...</p>
                    )}
                    {emailError && (
                      <p className="text-sm text-red-500 mt-1">{emailError}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="password" className="flex items-center gap-1">
                      <Lock className="h-3 w-3" />
                      Password {mode === 'create' && '*'}
                      {mode === 'edit' && <span className="text-xs text-muted-foreground ml-1">(leave empty to keep current)</span>}
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder={mode === 'create' ? 'Enter password' : 'Enter new password'}
                        value={formData.password}
                        onChange={(e) => handleFieldChange('password', e.target.value)}
                        required={mode === 'create'}
                        className={passwordError && formData.password ? 'border-red-500' : ''}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="confirmPassword" className="flex items-center gap-1">
                      <Lock className="h-3 w-3" />
                      Confirm Password {mode === 'create' && '*'}
                    </Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Confirm password"
                        value={formData.confirmPassword}
                        onChange={(e) => handleFieldChange('confirmPassword', e.target.value)}
                        required={mode === 'create'}
                        className={passwordError ? 'border-red-500' : ''}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    {passwordError && (
                      <p className="text-sm text-red-500 mt-1">{passwordError}</p>
                    )}
                  </div>

                </div>

                <div className="mt-4">
                  <ImageUpload
                    value={formData.profile_image || ''}
                    onChange={(value) => handleFieldChange('profile_image', value)}
                    label="Profile Picture"
                    maxSizeMB={5}
                  />
                </div>

                <div className="mt-4">
                  <Label htmlFor="bio" className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    Bio
                  </Label>
                  <Textarea
                    id="bio"
                    placeholder="Enter bio"
                    value={formData.bio}
                    onChange={(e) => handleFieldChange('bio', e.target.value)}
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone" className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      Phone Number
                    </Label>
                    <div className="flex gap-2">
                      <PhoneCountrySelector
                        value={formData.phone_country_code || '+961'}
                        onChange={(code) => handleFieldChange('phone_country_code', code)}
                        placeholder="Code"
                      />
                      <Input
                        id="phone"
                        placeholder="Phone number"
                        value={formData.phone || ''}
                        onChange={(e) => handleFieldChange('phone', e.target.value)}
                        className={`flex-1 ${phoneError ? 'border-red-500' : ''}`}
                      />
                    </div>
                    {isValidatingPhone && (
                      <p className="text-sm text-muted-foreground mt-1">Checking phone number...</p>
                    )}
                    {phoneError && (
                      <p className="text-sm text-red-500 mt-1">{phoneError}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="whatsapp_phone" className="flex items-center gap-1">
                      <MessageCircle className="h-3 w-3" />
                      WhatsApp Number
                    </Label>
                    <div className="flex gap-2">
                      <PhoneCountrySelector
                        value={formData.whatsapp_country_code || '+961'}
                        onChange={(code) => handleFieldChange('whatsapp_country_code', code)}
                        placeholder="Code"
                      />
                      <Input
                        id="whatsapp_phone"
                        placeholder="WhatsApp number"
                        value={formData.whatsapp_phone || ''}
                        onChange={(e) => handleFieldChange('whatsapp_phone', e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Location Information */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Location Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <CountrySelectorEnhanced
                      value={formData.country || ''}
                      onChange={(value) => handleFieldChange('country', value)}
                      label="Country"
                      placeholder="Select country"
                      showSearch={true}
                    />
                  </div>
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
            className="min-w-[120px]"
          >
            {mode === 'create' ? 'Create Tutor' : 'Update Tutor'}
          </LoadingButton>
        </div>
      </DialogContent>
    </Dialog>
  );
});

