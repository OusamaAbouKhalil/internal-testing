"use client";

import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, 
  X, 
  File, 
  Loader2, 
  ExternalLink, 
  Download, 
  Trash2,
  Plus,
  Edit
} from "lucide-react";
import { getFullUrlFromStoragePath } from "@/lib/file-upload";
import { fetchWithProgress } from "@/lib/api-progress";

interface RequestFile {
  link: string;
  name: string;
}

interface RequestFileManagementProps {
  fileLinks: string[];
  fileNames: string[];
  onUpdate: (fileLinks: string[], fileNames: string[]) => void;
  label?: string;
  maxFiles?: number;
  disabled?: boolean;
  acceptedTypes?: string[];
}

export function RequestFileManagement({
  fileLinks = [],
  fileNames = [],
  onUpdate,
  label = "Request Files",
  maxFiles = 10,
  disabled = false,
  acceptedTypes = ['.pdf', '.doc', '.docx', '.txt', '.jpg', '.jpeg', '.png', '.gif', '.zip', '.rar']
}: RequestFileManagementProps) {
  
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingName, setEditingName] = useState<string>("");
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Combine fileLinks and fileNames into RequestFile objects
  const files: RequestFile[] = fileLinks.map((link, index) => ({
    link,
    name: fileNames[index] || `File ${index + 1}`
  }));

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
      case 'zip':
      case 'rar':
        return '📦';
      default:
        return '📎';
    }
  };

  const getFileUrl = (link: string) => {
    if (link.startsWith('http')) {
      return link;
    }
    return getFullUrlFromStoragePath(link);
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    setUploading(true);
    setError(null);

    try {
      // Validate file size (10MB max)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (selectedFile.size > maxSize) {
        throw new Error('File size must be less than 10MB');
      }

      // Validate file type
      const fileExtension = '.' + selectedFile.name.split('.').pop()?.toLowerCase();
      if (!acceptedTypes.includes(fileExtension)) {
        throw new Error(`File type ${fileExtension} is not supported`);
      }

      // Check if we've reached max files
      if (files.length >= maxFiles) {
        throw new Error(`Maximum ${maxFiles} files allowed`);
      }

      // Upload file
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetchWithProgress('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const data = await response.json();
      
      if (data.success) {
        // Add new file to the arrays
        const newFileLinks = [...fileLinks, data.storagePath];
        const newFileNames = [...fileNames, selectedFile.name];
        
        onUpdate(newFileLinks, newFileNames);
      } else {
        throw new Error(data.error || 'Upload failed');
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      setError(error.message || 'Upload failed');
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleDeleteFile = async (index: number) => {
    const fileToDelete = files[index];
    if (!fileToDelete) return;

    setDeletingIndex(index);
    setError(null);

    try {
      // Delete from bucket first
      const response = await fetch('/api/delete-file', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storagePath: fileToDelete.link
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete file from storage');
      }

      const data = await response.json();
      
      if (data.success) {
        // Remove from arrays after successful deletion
        const newFileLinks = fileLinks.filter((_, i) => i !== index);
        const newFileNames = fileNames.filter((_, i) => i !== index);
        onUpdate(newFileLinks, newFileNames);
      } else {
        throw new Error(data.error || 'Failed to delete file');
      }
    } catch (error: any) {
      console.error('Error deleting file:', error);
      setError(error.message || 'Failed to delete file');
    } finally {
      setDeletingIndex(null);
    }
  };

  const handleEditName = (index: number) => {
    setEditingIndex(index);
    setEditingName(fileNames[index] || '');
  };

  const handleSaveName = () => {
    if (editingIndex !== null && editingName.trim()) {
      const newFileNames = [...fileNames];
      newFileNames[editingIndex] = editingName.trim();
      onUpdate(fileLinks, newFileNames);
    }
    setEditingIndex(null);
    setEditingName("");
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditingName("");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-medium">{label}</Label>
        <Badge variant="outline">{files.length}/{maxFiles}</Badge>
      </div>

      {/* Upload Section */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-2">
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
              disabled={disabled || uploading || files.length >= maxFiles}
              className="flex items-center gap-2"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Add File
                </>
              )}
            </Button>
          </div>

          {/* Error Message */}
          {error && (
            <Alert variant="destructive" className="mt-2">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Info */}
          <p className="text-xs text-muted-foreground mt-2">
            Max file size: 10MB. Supported formats: {acceptedTypes.join(', ')}
          </p>
        </CardContent>
      </Card>

      {/* Files List */}
      {files.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Uploaded Files ({files.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {files.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="text-lg">{getFileIcon(file.name)}</span>
                  
                  {editingIndex === index ? (
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="flex-1"
                        placeholder="Enter file name"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveName();
                          if (e.key === 'Escape') handleCancelEdit();
                        }}
                        autoFocus
                      />
                      <Button size="sm" onClick={handleSaveName}>
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{file.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{file.link}</div>
                    </div>
                  )}
                </div>

                {editingIndex !== index && (
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => window.open(getFileUrl(file.link), '_blank')}
                      title="View file"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEditName(index)}
                      title="Edit name"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteFile(index)}
                      title="Delete file"
                      className="text-red-600 hover:text-red-700"
                      disabled={deletingIndex === index}
                    >
                      {deletingIndex === index ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {files.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <File className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No files uploaded yet</p>
            <p className="text-sm text-muted-foreground">Click "Add File" to upload files for this request</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
