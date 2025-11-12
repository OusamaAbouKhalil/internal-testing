"use client";

import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, X, Image as ImageIcon, Loader2, ExternalLink } from "lucide-react";
import { getFullUrlFromStoragePath } from "@/lib/file-upload";
import { fetchWithProgress } from "@/lib/api-progress";

interface ImageUploadProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  maxSizeMB?: number;
  disabled?: boolean;
}

export function ImageUpload({
  value,
  onChange,
  label = "Image",
  maxSizeMB = 5,
  disabled = false,
}: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");

  // Update preview when value changes
  React.useEffect(() => {
    if (value) {
      // If it's a base64 data URL, use it directly
      if (value.startsWith('data:')) {
        setPreviewUrl(value);
      }
      // If it's a full URL, use it directly
      else if (value.startsWith('http')) {
        setPreviewUrl(value);
      } 
      // Otherwise, convert storage path to full URL
      else {
        setPreviewUrl(getFullUrlFromStoragePath(value));
      }
    } else {
      setPreviewUrl("");
    }
  }, [value]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (JPG, PNG, GIF, WebP)');
      return;
    }

    // Validate file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSizeMB) {
      setError(`File size must be less than ${maxSizeMB}MB. Current size: ${fileSizeMB.toFixed(2)}MB`);
      return;
    }

    setUploading(true);

    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', file);

      // Upload to DigitalOcean Spaces via API route
      const response = await fetchWithProgress('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Upload failed');
      }

      const result = await response.json();

      if (result.success) {
        // Store DB path in database: /storage/uploads/image.jpg
        onChange(result.storagePath);
        
        // Set full CDN URL for preview: https://bucket.endpoint/test/storage/uploads/image.jpg
        setPreviewUrl(result.url);
        
        console.log('✅ Upload successful:', {
          storagePath: result.storagePath,
          url: result.url,
        });
      } else {
        throw new Error(result.error || 'Upload failed');
      }

      setUploading(false);
    } catch (err) {
      console.error('❌ Upload error:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload image');
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    // If there's a file to delete from storage, delete it first
    if (value && !value.startsWith('data:') && !value.startsWith('http')) {
      try {
        const response = await fetchWithProgress('/api/delete-file', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ storagePath: value }),
        });

        if (!response.ok) {
          console.warn('Failed to delete file from storage:', await response.text());
        } else {
          console.log('✅ File deleted from storage successfully');
        }
      } catch (error) {
        console.warn('Error deleting file from storage:', error);
      }
    }

    // Clear the form field
    onChange('');
    setPreviewUrl('');
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      
      <div className="space-y-3">
        {/* Preview */}
        {previewUrl && (
          <div className="relative inline-block">
            <div className="relative w-32 h-32 border-2 border-gray-200 rounded-lg overflow-hidden bg-gray-50">
              <img
                src={previewUrl}
                alt="Preview"
                className="w-full h-full object-cover"
              />
            </div>
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
              onClick={handleRemove}
              disabled={disabled || uploading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Upload Button or URL Input */}
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*"
              className="hidden"
              disabled={disabled || uploading}
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleButtonClick}
              disabled={disabled || uploading}
              className="flex items-center gap-2"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Choose Image
                </>
              )}
            </Button>
            
            {previewUrl && !previewUrl.startsWith('data:') && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => window.open(previewUrl, '_blank')}
                title="View full image"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="text-xs text-muted-foreground">
            Or paste image URL:
          </div>
          <Input
            type="url"
            placeholder="https://example.com/image.jpg"
            value={value && !value.startsWith('data:') ? value : ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled || uploading}
          />
        </div>

        {/* Error Message */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Info */}
        <p className="text-xs text-muted-foreground">
          Max file size: {maxSizeMB}MB. Supported formats: JPG, PNG, GIF, WebP
        </p>
      </div>
    </div>
  );
}

