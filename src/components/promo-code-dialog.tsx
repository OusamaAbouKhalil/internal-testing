"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LoadingButton } from "@/components/ui/loading-spinner";
import { PromoCode, PromoCodeTypeEnum, PromoCodeTypeLabel, CreatePromoCodeData, UpdatePromoCodeData } from "@/types/promo-code";
import { Ticket } from "lucide-react";

interface PromoCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  promoCode?: PromoCode | null;
  mode: 'create' | 'edit';
  onSave: (data: CreatePromoCodeData | UpdatePromoCodeData) => Promise<void>;
  loading?: boolean;
  error?: string | null;
}

export function PromoCodeDialog({
  open,
  onOpenChange,
  promoCode,
  mode,
  onSave,
  loading = false,
  error = null,
}: PromoCodeDialogProps) {
  const [formData, setFormData] = useState<CreatePromoCodeData>({
    code: '',
    description: '',
    type: PromoCodeTypeEnum.INFLUENCER,
    discount: 0,
    max_usage_times: 0,
    max_usage_per_user: 0,
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (mode === 'edit' && promoCode) {
      setFormData({
        code: promoCode.code,
        description: promoCode.description,
        type: promoCode.type,
        discount: promoCode.discount,
        max_usage_times: promoCode.max_usage_times,
        max_usage_per_user: promoCode.max_usage_per_user,
      });
    } else {
      setFormData({
        code: '',
        description: '',
        type: PromoCodeTypeEnum.INFLUENCER,
        discount: 0,
        max_usage_times: 0,
        max_usage_per_user: 0,
      });
    }
    setValidationErrors({});
  }, [mode, promoCode, open]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.code.trim()) {
      errors.code = 'Code is required';
    } else if (formData.code.length < 3) {
      errors.code = 'Code must be at least 3 characters';
    }

    if (!formData.description.trim()) {
      errors.description = 'Description is required';
    }

    if (formData.discount <= 0) {
      errors.discount = 'Discount must be greater than 0';
    }

    if (formData.discount > 100) {
      errors.discount = 'Discount cannot exceed 100%';
    }

    if (formData.max_usage_times < 1) {
      errors.max_usage_times = 'Max usage times must be at least 1';
    }

    if (formData.max_usage_per_user < 1) {
      errors.max_usage_per_user = 'Max usage per user must be at least 1';
    }

    if (formData.max_usage_per_user > formData.max_usage_times) {
      errors.max_usage_per_user = 'Cannot exceed total max usage times';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await onSave(formData);
      onOpenChange(false);
    } catch (err) {
      console.error('Error saving promo code:', err);
    }
  };

  const handleInputChange = (field: keyof CreatePromoCodeData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5" />
            {mode === 'create' ? 'Create Promo Code' : 'Edit Promo Code'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create' 
              ? 'Create a new promotional code for discounts'
              : 'Update promo code details'
            }
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="code">
                  Code <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => handleInputChange('code', e.target.value.toUpperCase())}
                  placeholder="SUMMER2025"
                  className={validationErrors.code ? 'border-red-500' : ''}
                />
                {validationErrors.code && (
                  <p className="text-sm text-red-500 mt-1">{validationErrors.code}</p>
                )}
              </div>

              <div>
                <Label htmlFor="type">
                  Type <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => handleInputChange('type', value as PromoCodeTypeEnum)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(PromoCodeTypeEnum).map((type) => (
                      <SelectItem key={type} value={type}>
                        {PromoCodeTypeLabel[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="description">
                Description <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Summer discount for all courses"
                rows={3}
                className={validationErrors.description ? 'border-red-500' : ''}
              />
              {validationErrors.description && (
                <p className="text-sm text-red-500 mt-1">{validationErrors.description}</p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="discount">
                  Discount (%) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="discount"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.discount}
                  onChange={(e) => handleInputChange('discount', parseFloat(e.target.value) || 0)}
                  placeholder="10.00"
                  className={validationErrors.discount ? 'border-red-500' : ''}
                />
                {validationErrors.discount && (
                  <p className="text-sm text-red-500 mt-1">{validationErrors.discount}</p>
                )}
              </div>

              <div>
                <Label htmlFor="max_usage_times">
                  Max Usage Times <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="max_usage_times"
                  type="number"
                  min="1"
                  value={formData.max_usage_times}
                  onChange={(e) => handleInputChange('max_usage_times', parseInt(e.target.value) || 0)}
                  placeholder="100"
                  className={validationErrors.max_usage_times ? 'border-red-500' : ''}
                />
                {validationErrors.max_usage_times && (
                  <p className="text-sm text-red-500 mt-1">{validationErrors.max_usage_times}</p>
                )}
              </div>

              <div>
                <Label htmlFor="max_usage_per_user">
                  Max Usage Per User <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="max_usage_per_user"
                  type="number"
                  min="1"
                  value={formData.max_usage_per_user}
                  onChange={(e) => handleInputChange('max_usage_per_user', parseInt(e.target.value) || 0)}
                  placeholder="1"
                  className={validationErrors.max_usage_per_user ? 'border-red-500' : ''}
                />
                {validationErrors.max_usage_per_user && (
                  <p className="text-sm text-red-500 mt-1">{validationErrors.max_usage_per_user}</p>
                )}
              </div>
            </div>

            {mode === 'edit' && promoCode && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Current Usage:</strong> {promoCode.current_usage} / {promoCode.max_usage_times}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>Status:</strong>{' '}
                  {promoCode.is_active === '1' ? (
                    <span className="text-green-600">Active</span>
                  ) : (
                    <span className="text-red-600">Inactive</span>
                  )}
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <LoadingButton type="submit" loading={loading}>
              {mode === 'create' ? 'Create Promo Code' : 'Update Promo Code'}
            </LoadingButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

