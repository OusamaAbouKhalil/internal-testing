"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Bell, Shield, Ban, Lock, X } from "lucide-react";
import { TutorFormData } from "../enhanced-tutor-dialog";

interface TutorAccountSettingsSectionProps {
  formData: TutorFormData;
  onFieldChange: (field: keyof TutorFormData, value: any) => void;
}

export default function TutorAccountSettingsSection({
  formData,
  onFieldChange
}: Readonly<TutorAccountSettingsSectionProps>) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Bell className="h-4 w-4" />
          Tutor Account Settings
        </CardTitle>
        <CardDescription className="text-xs">Tutor account controls and preferences.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <Label htmlFor="verified" className="text-sm font-medium flex items-center gap-2">
                <Shield className="h-4 w-4 text-green-600" />
                Verified
              </Label>
              <p className="text-xs text-muted-foreground">Tutor verification status</p>
            </div>
            <Switch
              id="verified"
              checked={formData.verified === '2'}
              onCheckedChange={(checked) => onFieldChange('verified', checked ? '2' : '0')}
            />
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <Label htmlFor="send_notifications" className="text-sm font-medium flex items-center gap-2">
                <Bell className="h-4 w-4 text-blue-600" />
                Notifications
              </Label>
              <p className="text-xs text-muted-foreground">Send push notifications to tutor</p>
            </div>
            <Switch
              id="send_notifications"
              checked={formData.send_notifications === '1'}
              onCheckedChange={(checked) => onFieldChange('send_notifications', checked ? '1' : '0')}
            />
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <Label htmlFor="locked" className="text-sm font-medium flex items-center gap-2">
                <Lock className="h-4 w-4 text-orange-600" />
                Locked
              </Label>
              <p className="text-xs text-muted-foreground">Temporarily lock tutor account</p>
            </div>
            <Switch
              id="locked"
              checked={formData.locked === '1'}
              onCheckedChange={(checked) => onFieldChange('locked', checked ? '1' : '0')}
            />
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <Label htmlFor="cancelled" className="text-sm font-medium flex items-center gap-2">
                <X className="h-4 w-4 text-muted-foreground" />
                Cancelled
              </Label>
              <p className="text-xs text-muted-foreground">Mark tutor account as cancelled</p>
            </div>
            <Switch
              id="cancelled"
              checked={formData.cancelled === '1'}
              onCheckedChange={(checked) => onFieldChange('cancelled', checked ? '1' : '0')}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
