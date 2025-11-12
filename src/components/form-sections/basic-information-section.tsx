"use client";

import React, { useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, Eye, EyeOff, Languages } from "lucide-react";
import { StudentFormData } from "../enhanced-student-dialog";
import { StudentGenderEnum, StudentGenderLabel } from "@/types/student";
import { useResourcesManagementStore } from "@/stores/resources-management-store";

const GENDERS: { key: StudentGenderEnum; label: string }[] = [
  { key: StudentGenderEnum.MALE, label: StudentGenderLabel[StudentGenderEnum.MALE] },
  { key: StudentGenderEnum.FEMALE, label: StudentGenderLabel[StudentGenderEnum.FEMALE] },
  { key: StudentGenderEnum.OTHER, label: StudentGenderLabel[StudentGenderEnum.OTHER] }
];

interface BasicInformationSectionProps {
  readonly formData: StudentFormData;
  readonly mode: 'create' | 'edit';
  readonly showPassword: boolean;
  readonly showConfirmPassword: boolean;
  readonly passwordError: string;
  readonly onFieldChange: (field: keyof StudentFormData, value: any) => void;
  readonly onTogglePassword: () => void;
  readonly onToggleConfirmPassword: () => void;
  readonly emailError?: string;
  readonly phoneError?: string;
  readonly isValidatingEmail?: boolean;
  readonly isValidatingPhone?: boolean;
  readonly validateEmail?: (email: string) => void;
}

export default function BasicInformationSection({
  formData,
  mode,
  showPassword,
  showConfirmPassword,
  passwordError,
  onFieldChange,
  onTogglePassword,
  onToggleConfirmPassword,
  emailError = '',
  phoneError = '',
  isValidatingEmail = false,
  isValidatingPhone = false,
}: Readonly<BasicInformationSectionProps>) {
  const { languages, fetchLanguages } = useResourcesManagementStore();

  useEffect(() => {
    fetchLanguages();
  }, [fetchLanguages]);

  const selectedLanguages = useMemo(() => {
    const languageIds = formData.languages || [];
    return languages.filter(lang => languageIds.includes(parseInt(lang.id)));
  }, [languages, formData.languages]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <User className="h-4 w-4" />
          Basic Information
        </CardTitle>
        <CardDescription className="text-xs">Primary identity and contact details.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="email" className="text-sm font-medium">Email Address *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => onFieldChange('email', e.target.value)}
              placeholder="student@example.com"
              className={` ${emailError ? 'border-red-500' : ''}`}
            />
            {isValidatingEmail && (
              <p className="text-sm text-muted-foreground mt-1">Checking email...</p>
            )}
            {emailError && (
              <p className="text-sm text-red-500 mt-1">{emailError}</p>
            )}
            {!emailError && !isValidatingEmail && (
              <p className="mt-1 text-xs text-muted-foreground">We'll never share the email with anyone else.</p>
            )}
          </div>

          <div>
            <Label htmlFor="password" className="text-sm font-medium">
              Password {mode === 'create' && '*'}
              {mode === 'edit' && <span className="text-xs text-muted-foreground ml-1">(leave empty to keep current)</span>}
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => onFieldChange('password', e.target.value)}
                placeholder={mode === 'create' ? 'Enter password' : 'Enter new password'}
                className={passwordError && formData.password ? 'border-red-500' : ''}
                required={mode === 'create'}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={onTogglePassword}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {mode === 'create' ? 'Use at least 6 characters' : 'Use at least 6 characters (optional)'}
            </p>
          </div>

          <div>
            <Label htmlFor="confirmPassword" className="text-sm font-medium">
              Confirm Password {mode === 'create' && '*'}
            </Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={(e) => onFieldChange('confirmPassword', e.target.value)}
                placeholder="Confirm password"
                className={passwordError ? 'border-red-500' : ''}
                required={mode === 'create'}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={onToggleConfirmPassword}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {passwordError && (
              <p className="text-sm text-red-500 mt-1">{passwordError}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="full_name" className="text-sm font-medium">Full Name *</Label>
            <Input
              id="full_name"
              value={formData.full_name}
              onChange={(e) => onFieldChange('full_name', e.target.value)}
              placeholder="John Doe"
            />
          </div>

          <div>
            <Label htmlFor="nickname" className="text-sm font-medium">Nickname</Label>
            <Input
              id="nickname"
              value={formData.nickname}
              onChange={(e) => onFieldChange('nickname', e.target.value)}
              placeholder="Johnny"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="phone_number" className="text-sm font-medium">Phone Number</Label>
            <Input
              id="phone_number"
              value={formData.phone_number}
              onChange={(e) => onFieldChange('phone_number', e.target.value)}
              placeholder="(555) 123-4567"
              className={phoneError ? 'border-red-500' : ''}
            />
            {isValidatingPhone && (
              <p className="text-sm text-muted-foreground mt-1">Checking phone number...</p>
            )}
            {phoneError && (
              <p className="text-sm text-red-500 mt-1">{phoneError}</p>
            )}
            {!phoneError && !isValidatingPhone && Boolean((formData as any).country_code) && (
              <p className="mt-1 text-xs text-muted-foreground">Country code: {(formData as any).country_code}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="gender" className="text-sm font-medium">Gender</Label>
            <Select
              value={formData.gender || undefined}
              onValueChange={(value) => onFieldChange('gender', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                {GENDERS.map(({ key, label }) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-medium flex items-center gap-2">
              <Languages className="h-4 w-4" />
              Selected Languages
            </Label>
            <div className="border rounded-md p-2 min-h-[40px] bg-gray-50">
              {selectedLanguages.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {selectedLanguages.map((language) => (
                    <Badge
                      key={language.id}
                      variant="secondary"
                      className="text-xs"
                    >
                      {language.language_name}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No languages selected</p>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Add languages in Academic Information section below
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
