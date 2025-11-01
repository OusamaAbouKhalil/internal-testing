"use client";

import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, X, File, Loader2, ExternalLink, Download } from "lucide-react";
import { getFullUrlFromStoragePath } from "@/lib/file-upload";
import { fetchWithProgress } from "@/lib/api-progress";

interface FileUploadProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  maxSizeMB?: number;
  disabled?: boolean;
  acceptedTypes?: string[];
  placeholder?: string;
}

export function FileUpload({
  value,
  onChange,
  label = "File",
  maxSizeMB = 10,
  disabled = false,
  acceptedTypes = ['.pdf', '.doc', '.docx', '.txt', '.jpg', '.jpeg', '.png', '.gif'],
  placeholder = "https://example.com/file.pdf"
}: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");

  // Update preview when value changes
  React.useEffect(() => {
    if (value) {
      // If it's a full URL, use it directly
      if (value.startsWith('http')) {
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

  const getFileIcon = (filename: string) => {
    const extension = filename.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return '📄';
      case 'doc':
      case 'docx':
        return '📝';
      case 'txt':
        return '📃';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return '🖼️';
      default:
        return '📎';
    }
  };

  const getFileName = (path: string) => {
    if (path.startsWith('http')) {
      return path.split('/').pop() || 'File';
    }
    return path.split('/').pop() || 'File';
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);

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
        // Store DB path in database: /storage/uploads/file.pdf
        onChange(result.storagePath);
        
        // Set full CDN URL for preview: https://bucket.endpoint/test/storage/uploads/file.pdf
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
      setError(err instanceof Error ? err.message : 'Failed to upload file');
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    // If there's a file to delete from storage, delete it first
    if (value && !value.startsWith('http')) {
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

  const handleDownload = () => {
    if (previewUrl) {
      window.open(previewUrl, '_blank');
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      
      <div className="space-y-3">
        {/* File Preview */}
        {previewUrl && (
          <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
            <div className="text-2xl">
              {getFileIcon(getFileName(value))}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {getFileName(value)}
              </p>
              <p className="text-xs text-muted-foreground">
                {value.startsWith('http') ? 'External URL' : 'Uploaded file'}
              </p>
            </div>
            <div className="flex gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleDownload}
                title="Download/View file"
                disabled={disabled || uploading}
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => window.open(previewUrl, '_blank')}
                title="Open in new tab"
                disabled={disabled || uploading}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="icon"
                onClick={handleRemove}
                disabled={disabled || uploading}
                title="Remove file"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Upload Button or URL Input */}
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept={acceptedTypes.join(',')}
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
                  Choose File
                </>
              )}
            </Button>
          </div>

          <div className="text-xs text-muted-foreground">
            Or paste file URL:
          </div>
          <Input
            type="url"
            placeholder={placeholder}
            value={value && value.startsWith('http') ? value : ''}
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
          Max file size: {maxSizeMB}MB. Supported formats: {acceptedTypes.join(', ')}
        </p>
      </div>
    </div>
  );
}
