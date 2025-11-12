"use client";

import { useState, useEffect, useRef } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LoadingOverlay, LoadingButton } from "@/components/ui/loading-spinner";
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  HelpCircle,
  Globe,
  Share2,
  BookOpen,
  GraduationCap,
  Calendar,
  ExternalLink,
  User,
  File,
  Download
} from "lucide-react";
import { useResourcesManagementStore } from "@/stores/resources-management-store";
import { useFirebaseAuthStore } from "@/stores/firebase-auth-store";
import { 
  FAQ, 
  Language, 
  Social, 
  SubSubject, 
  Subject,
  ResourceType,
  FAQFilters,
  LanguageFilters,
  SocialFilters,
  SubSubjectFilters,
  SubjectFilters
} from "@/types/resources";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileUpload } from "@/components/ui/file-upload";

export default function ResourcesPage() {
  const [activeTab, setActiveTab] = useState<ResourceType>('faqs');
  const [searchTerm, setSearchTerm] = useState("");
  const [faqUserTypeFilter, setFaqUserTypeFilter] = useState<'student' | 'tutor' | 'all'>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');

  const { 
    faqs,
    languages,
    socials,
    subSubjects,
    subjects,
    loading, 
    error, 
    fetchFAQs,
    fetchLanguages,
    fetchSocials,
    fetchSubSubjects,
    fetchSubjects,
    createFAQ,
    updateFAQ,
    deleteFAQ,
    createLanguage,
    updateLanguage,
    deleteLanguage,
    createSocial,
    updateSocial,
    deleteSocial,
    createSubSubject,
    updateSubSubject,
    deleteSubSubject,
    createSubject,
    updateSubject,
    deleteSubject,
    fetchAllResources
  } = useResourcesManagementStore();

  const { hasPermission } = useFirebaseAuthStore();

  useEffect(() => {
    fetchAllResources();
  }, []);

  useEffect(() => {
    let filters: any = { search: searchTerm || undefined };
    
    switch (activeTab) {
      case 'faqs':
        // Add user type filter for FAQs
        if (faqUserTypeFilter !== 'all') {
          filters.user_type = faqUserTypeFilter;
        }
        fetchFAQs(filters as FAQFilters);
        break;
      case 'languages':
        fetchLanguages(filters as LanguageFilters);
        break;
      case 'socials':
        fetchSocials(filters as SocialFilters);
        break;
      case 'sub_subjects':
        fetchSubSubjects(filters as SubSubjectFilters);
        break;
      case 'subjects':
        fetchSubjects(filters as SubjectFilters);
        break;
    }
  }, [searchTerm, activeTab, faqUserTypeFilter]);

  const handleCreate = async (data: any) => {
    try {
      switch (activeTab) {
        case 'faqs':
          await createFAQ(data);
          break;
        case 'languages':
          await createLanguage(data);
          break;
        case 'socials':
          await createSocial(data);
          break;
        case 'sub_subjects':
          await createSubSubject(data);
          break;
        case 'subjects':
          await createSubject(data);
          break;
      }
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Error creating item:', error);
    }
  };

  const handleUpdate = async (data: any) => {
    if (!selectedItem) return;
    
    try {
      switch (activeTab) {
        case 'faqs':
          await updateFAQ(selectedItem.id, data);
          break;
        case 'languages':
          await updateLanguage(selectedItem.id, data);
          break;
        case 'socials':
          await updateSocial(selectedItem.id, data);
          break;
        case 'sub_subjects':
          await updateSubSubject(selectedItem.id, data);
          break;
        case 'subjects':
          await updateSubject(selectedItem.id, data);
          break;
      }
      setIsEditDialogOpen(false);
      setSelectedItem(null);
    } catch (error) {
      console.error('Error updating item:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this item?')) {
      try {
        switch (activeTab) {
          case 'faqs':
            await deleteFAQ(id);
            break;
          case 'languages':
            await deleteLanguage(id);
            break;
          case 'socials':
            await deleteSocial(id);
            break;
          case 'sub_subjects':
            await deleteSubSubject(id);
            break;
          case 'subjects':
            await deleteSubject(id);
            break;
        }
      } catch (error) {
        console.error('Error deleting item:', error);
      }
    }
  };

  const openCreateDialog = () => {
    setDialogMode('create');
    setSelectedItem(null);
    setIsCreateDialogOpen(true);
  };

  const openEditDialog = (item: any) => {
    setDialogMode('edit');
    setSelectedItem(item);
    setIsEditDialogOpen(true);
  };

  const getCurrentItems = () => {
    switch (activeTab) {
      case 'faqs': return faqs;
      case 'languages': return languages;
      case 'socials': return socials;
      case 'sub_subjects': return subSubjects;
      case 'subjects': return subjects;
      default: return [];
    }
  };

  const getTabIcon = (tab: ResourceType) => {
    switch (tab) {
      case 'faqs': return <HelpCircle className="h-4 w-4" />;
      case 'languages': return <Globe className="h-4 w-4" />;
      case 'socials': return <Share2 className="h-4 w-4" />;
      case 'sub_subjects': return <BookOpen className="h-4 w-4" />;
      case 'subjects': return <GraduationCap className="h-4 w-4" />;
    }
  };

  const getTabLabel = (tab: ResourceType) => {
    switch (tab) {
      case 'faqs': return 'FAQs';
      case 'languages': return 'Languages';
      case 'socials': return 'Socials';
      case 'sub_subjects': return 'Sub Subjects';
      case 'subjects': return 'Subjects';
    }
  };

  const renderFAQCard = (faq: FAQ) => (
    <Card key={faq.id} className="transition-all duration-200 hover:shadow-md">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2 mb-2">
              <HelpCircle className="h-5 w-5" />
              {faq.question}
            </CardTitle>
            {faq.title && (
              <CardDescription className="mb-2">{faq.title}</CardDescription>
            )}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {faq.user_type}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {faq.created_at && (
                  <span>
                    {new Date(faq.created_at).toLocaleString()}
                  </span>
                )}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            {hasPermission('resources', 'write') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => openEditDialog(faq)}
                className="hover:bg-blue-50 hover:border-blue-200"
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
            {hasPermission('resources', 'delete') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDelete(faq.id)}
                className="hover:bg-red-50 hover:border-red-200 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div 
          className="text-sm text-foreground"
          dangerouslySetInnerHTML={{ __html: faq.answer }}
        />
      </CardContent>
    </Card>
  );

  const renderLanguageCard = (language: Language) => (
    <Card key={language.id} className="transition-all duration-200 hover:shadow-md">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2 mb-2">
              <Globe className="h-5 w-5" />
              {language.language_name}
            </CardTitle>
            <CardDescription className="mb-2">
              Code: {language.language_code}
            </CardDescription>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {new Date(language.created_at).toLocaleDateString()}
            </div>
          </div>
          <div className="flex gap-2">
            {hasPermission('resources', 'write') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => openEditDialog(language)}
                className="hover:bg-blue-50 hover:border-blue-200"
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
            {hasPermission('resources', 'delete') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDelete(language.id)}
                className="hover:bg-red-50 hover:border-red-200 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
    </Card>
  );

  const renderSocialCard = (social: Social) => (
    <Card key={social.id} className="transition-all duration-200 hover:shadow-md">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2 mb-2">
              <Share2 className="h-5 w-5" />
              {social.title}
            </CardTitle>
            <CardDescription className="mb-2 flex items-center gap-1">
              <ExternalLink className="h-3 w-3" />
              <a href={social.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                {social.link}
              </a>
            </CardDescription>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {new Date(social.created_at).toLocaleDateString()}
            </div>
          </div>
          <div className="flex gap-2">
            {hasPermission('resources', 'write') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => openEditDialog(social)}
                className="hover:bg-blue-50 hover:border-blue-200"
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
            {hasPermission('resources', 'delete') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDelete(social.id)}
                className="hover:bg-red-50 hover:border-red-200 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* File Attachment */}
        {social.file && (
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border">
            <File className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {social.file.split('/').pop() || 'Attached file'}
              </p>
              <p className="text-xs text-muted-foreground">
                {social.file.startsWith('http') ? 'External file' : 'Uploaded file'}
              </p>
            </div>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const url = social.file?.startsWith('http') 
                    ? social.file 
                    : `${process.env.NEXT_PUBLIC_FILE_URL}${social.file}`;
                  window.open(url, '_blank');
                }}
                className="h-8 px-2"
              >
                <Download className="h-3 w-3 mr-1" />
                Download
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const url = social.file?.startsWith('http') 
                    ? social.file 
                    : `https://oureasygamestoreage.nyc3.digitaloceanspaces.com/test${social.file}`;
                  window.open(url, '_blank');
                }}
                className="h-8 px-2"
              >
                <ExternalLink className="h-3 w-3" />
              </Button>
              {hasPermission('resources', 'delete') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    if (confirm('Are you sure you want to delete this file?')) {
                      try {
                        // Delete file from storage if it's not an external URL
                        if (social.file && !social.file.startsWith('http')) {
                          const response = await fetch('/api/delete-file', {
                            method: 'DELETE',
                            headers: {
                              'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ storagePath: social.file }),
                          });

                          if (!response.ok) {
                            console.warn('Failed to delete file from storage');
                          }
                        }

                        // Update the social to remove the file
                        await updateSocial(social.id, { file: '' });
                      } catch (error) {
                        console.error('Error deleting file:', error);
                      }
                    }
                  }}
                  className="h-8 px-2 hover:bg-red-50 hover:border-red-200 hover:text-red-600"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderSubSubjectCard = (subSubject: SubSubject) => (
    <Card key={subSubject.id} className="transition-all duration-200 hover:shadow-md">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2 mb-2">
              <BookOpen className="h-5 w-5" />
              {subSubject.label}
            </CardTitle>
            <CardDescription className="mb-2">
              Subject ID: {subSubject.subject_id}
            </CardDescription>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {new Date(subSubject.created_at).toLocaleDateString()}
            </div>
          </div>
          <div className="flex gap-2">
            {hasPermission('resources', 'write') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => openEditDialog(subSubject)}
                className="hover:bg-blue-50 hover:border-blue-200"
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
            {hasPermission('resources', 'delete') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDelete(subSubject.id)}
                className="hover:bg-red-50 hover:border-red-200 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
    </Card>
  );

  const renderSubjectCard = (subject: Subject) => (
    <Card key={subject.id} className="transition-all duration-200 hover:shadow-md">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2 mb-2">
              <GraduationCap className="h-5 w-5" />
              {subject.label}
            </CardTitle>
            <CardDescription className="mb-2">
              Icon: {subject.icon} | Version: {subject.version}
            </CardDescription>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className={`px-2 py-1 rounded text-xs ${subject.cancelled === '1' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                {subject.cancelled === '1' ? 'Cancelled' : 'Active'}
              </span>
              <span className={`px-2 py-1 rounded text-xs ${subject.locked === '1' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'}`}>
                {subject.locked === '1' ? 'Locked' : 'Unlocked'}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(subject.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            {hasPermission('resources', 'write') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => openEditDialog(subject)}
                className="hover:bg-blue-50 hover:border-blue-200"
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
            {hasPermission('resources', 'delete') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDelete(subject.id)}
                className="hover:bg-red-50 hover:border-red-200 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
    </Card>
  );

  const renderCards = () => {
    const items = getCurrentItems();
    
    if (items.length === 0) {
      return (
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              {getTabIcon(activeTab)}
              <h3 className="text-lg font-medium text-foreground mb-2">No {getTabLabel(activeTab).toLowerCase()} found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm 
                  ? `No ${getTabLabel(activeTab).toLowerCase()} match your search criteria.` 
                  : `${getTabLabel(activeTab)} will appear here once they are added to the system.`
                }
              </p>
              {hasPermission('resources', 'write') && !searchTerm && (
                <Button onClick={openCreateDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First {getTabLabel(activeTab).slice(0, -1)}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      );
    }

    switch (activeTab) {
      case 'faqs':
        return faqs.map(renderFAQCard);
      case 'languages':
        return languages.map(renderLanguageCard);
      case 'socials':
        return socials.map(renderSocialCard);
      case 'sub_subjects':
        return subSubjects.map(renderSubSubjectCard);
      case 'subjects':
        return subjects.map(renderSubjectCard);
      default:
        return null;
    }
  };

  return (
    <AuthGuard requiredPermission={{ resource: 'resources', action: 'read' }}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Resources</h1>
            <p className="text-muted-foreground mt-2">Manage FAQs, languages, socials, subjects, and sub-subjects</p>
          </div>
        
          {hasPermission('resources', 'write') && (
            <LoadingButton
              onClick={openCreateDialog}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add {getTabLabel(activeTab).slice(0, -1)}
            </LoadingButton>
          )}
        </div>

        {/* Search and Filters */}
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder={`Search ${getTabLabel(activeTab).toLowerCase()}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {/* FAQ User Type Filter */}
          {activeTab === 'faqs' && (
            <div className="w-48">
              <Select
                value={faqUserTypeFilter}
                onValueChange={(value) => setFaqUserTypeFilter(value as 'student' | 'tutor' | 'all')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by user type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="student">Students</SelectItem>
                  <SelectItem value="tutor">Tutors</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ResourceType)}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="faqs" className="flex items-center gap-2">
              {getTabIcon('faqs')}
              FAQs
            </TabsTrigger>
            <TabsTrigger value="languages" className="flex items-center gap-2">
              {getTabIcon('languages')}
              Languages
            </TabsTrigger>
            <TabsTrigger value="socials" className="flex items-center gap-2">
              {getTabIcon('socials')}
              Socials
            </TabsTrigger>
            <TabsTrigger value="sub_subjects" className="flex items-center gap-2">
              {getTabIcon('sub_subjects')}
              Sub Subjects
            </TabsTrigger>
            <TabsTrigger value="subjects" className="flex items-center gap-2">
              {getTabIcon('subjects')}
              Subjects
            </TabsTrigger>
          </TabsList>

          <TabsContent value="faqs" className="space-y-4">
            <LoadingOverlay loading={loading}>
              <div className="grid gap-4">
                {renderCards()}
              </div>
            </LoadingOverlay>
          </TabsContent>

          <TabsContent value="languages" className="space-y-4">
            <LoadingOverlay loading={loading}>
              <div className="grid gap-4">
                {renderCards()}
              </div>
            </LoadingOverlay>
          </TabsContent>

          <TabsContent value="socials" className="space-y-4">
            <LoadingOverlay loading={loading}>
              <div className="grid gap-4">
                {renderCards()}
              </div>
            </LoadingOverlay>
          </TabsContent>

          <TabsContent value="sub_subjects" className="space-y-4">
            <LoadingOverlay loading={loading}>
              <div className="grid gap-4">
                {renderCards()}
              </div>
            </LoadingOverlay>
          </TabsContent>

          <TabsContent value="subjects" className="space-y-4">
            <LoadingOverlay loading={loading}>
              <div className="grid gap-4">
                {renderCards()}
              </div>
            </LoadingOverlay>
          </TabsContent>
        </Tabs>

        {/* Create/Edit Dialog */}
        <Dialog open={isCreateDialogOpen || isEditDialogOpen} onOpenChange={(open) => {
          if (!open) {
            setIsCreateDialogOpen(false);
            setIsEditDialogOpen(false);
            setSelectedItem(null);
          }
        }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {dialogMode === 'create' ? `Create ${getTabLabel(activeTab).slice(0, -1)}` : `Edit ${getTabLabel(activeTab).slice(0, -1)}`}
              </DialogTitle>
              <DialogDescription>
                {dialogMode === 'create' 
                  ? `Add a new ${getTabLabel(activeTab).slice(0, -1).toLowerCase()} to the system.`
                  : `Update the ${getTabLabel(activeTab).slice(0, -1).toLowerCase()} information.`
                }
              </DialogDescription>
            </DialogHeader>
            
            <ResourceForm
              activeTab={activeTab}
              selectedItem={selectedItem}
              onSubmit={dialogMode === 'create' ? handleCreate : handleUpdate}
              loading={loading}
              onCancel={() => {
                setIsCreateDialogOpen(false);
                setIsEditDialogOpen(false);
                setSelectedItem(null);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>
    </AuthGuard>
  );
}

// Resource Form Component
function ResourceForm({ activeTab, selectedItem, onSubmit, loading, onCancel }: {
  activeTab: ResourceType;
  selectedItem: any;
  onSubmit: (data: any) => void;
  loading: boolean;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState<any>({});
  const [subjectSearchTerm, setSubjectSearchTerm] = useState('');
  const [isSubjectDropdownOpen, setIsSubjectDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const { subjects, fetchSubjects } = useResourcesManagementStore();

  useEffect(() => {
    if (selectedItem) {
      setFormData(selectedItem);
    } else {
      setFormData({});
    }
  }, [selectedItem]);

  // Fetch subjects when creating/editing sub_subjects
  useEffect(() => {
    if (activeTab === 'sub_subjects') {
      fetchSubjects();
    }
  }, [activeTab, fetchSubjects]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsSubjectDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  // Helper functions for subject selection
  const filteredSubjects = subjects.filter(subject =>
    subject.label.toLowerCase().includes(subjectSearchTerm.toLowerCase())
  );

  const selectedSubject = subjects.find(subject => subject.id === formData.subject_id);

  const handleSubjectSelect = (subjectId: string) => {
    setFormData({ ...formData, subject_id: subjectId });
    setIsSubjectDropdownOpen(false);
    setSubjectSearchTerm('');
  };

  const renderFAQForm = () => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="question">Question</Label>
        <Input
          id="question"
          value={formData.question || ''}
          onChange={(e) => setFormData({ ...formData, question: e.target.value })}
          placeholder="Enter the question"
          required
        />
      </div>
      
      <div>
        <Label htmlFor="title">Title (Optional)</Label>
        <Input
          id="title"
          value={formData.title || ''}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Enter a title"
        />
      </div>
      
      <div>
        <Label htmlFor="answer">Answer</Label>
        <Textarea
          id="answer"
          value={formData.answer || ''}
          onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
          placeholder="Enter the answer"
          rows={4}
          required
        />
      </div>
      
      <div>
        <Label htmlFor="user_type">User Type</Label>
        <Select
          value={formData.user_type || 'student'}
          onValueChange={(value) => setFormData({ ...formData, user_type: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select user type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="student">Student</SelectItem>
            <SelectItem value="tutor">Tutor</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  const renderLanguageForm = () => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="language_name">Language Name</Label>
        <Input
          id="language_name"
          value={formData.language_name || ''}
          onChange={(e) => setFormData({ ...formData, language_name: e.target.value })}
          placeholder="e.g., English"
          required
        />
      </div>
      
      <div>
        <Label htmlFor="language_code">Language Code</Label>
        <Input
          id="language_code"
          value={formData.language_code || ''}
          onChange={(e) => setFormData({ ...formData, language_code: e.target.value })}
          placeholder="e.g., en"
          required
        />
      </div>
    </div>
  );

  const renderSocialForm = () => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={formData.title || ''}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="e.g., Facebook"
          required
        />
      </div>
      
      <div>
        <Label htmlFor="link">Link</Label>
        <Input
          id="link"
          value={formData.link || ''}
          onChange={(e) => setFormData({ ...formData, link: e.target.value })}
          placeholder="https://www.facebook.com/yourpage"
          required
        />
      </div>
      
      <div>
        <Label htmlFor="image">Image Path</Label>
        <Input
          id="image"
          value={formData.image || ''}
          onChange={(e) => setFormData({ ...formData, image: e.target.value })}
          placeholder="upload/image.png"
          required
        />
      </div>
      
      <div>
        <FileUpload
          value={formData.file || ''}
          onChange={(value) => setFormData({ ...formData, file: value })}
          label="Social File (Optional)"
          maxSizeMB={10}
          acceptedTypes={['.pdf', '.doc', '.docx', '.txt', '.jpg', '.jpeg', '.png', '.gif', '.mp4', '.mp3']}
          placeholder="https://example.com/social-document.pdf"
        />
      </div>
    </div>
  );

  const renderSubSubjectForm = () => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="label">Label</Label>
        <Input
          id="label"
          value={formData.label || ''}
          onChange={(e) => setFormData({ ...formData, label: e.target.value })}
          placeholder="e.g., English"
          required
        />
      </div>
      
      <div>
        <Label htmlFor="subject_id">Subject</Label>
        <div className="relative" ref={dropdownRef}>
          <Input
            id="subject_id"
            value={selectedSubject ? selectedSubject.label : subjectSearchTerm}
            onChange={(e) => {
              setSubjectSearchTerm(e.target.value);
              setIsSubjectDropdownOpen(true);
              if (!e.target.value) {
                setFormData({ ...formData, subject_id: '' });
              }
            }}
            onFocus={() => setIsSubjectDropdownOpen(true)}
            placeholder="Search and select a subject..."
            required
          />
          
          {isSubjectDropdownOpen && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
              {filteredSubjects.length > 0 ? (
                filteredSubjects.map((subject) => (
                  <button
                    key={subject.id}
                    type="button"
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                    onClick={() => handleSubjectSelect(subject.id)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{subject.label}</span>
                      <span className="text-sm text-muted-foreground">ID: {subject.id}</span>
                    </div>
                  </button>
                ))
              ) : (
                <div className="px-4 py-2 text-muted-foreground text-sm">
                  No subjects found
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderSubjectForm = () => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="label">Label</Label>
        <Input
          id="label"
          value={formData.label || ''}
          onChange={(e) => setFormData({ ...formData, label: e.target.value })}
          placeholder="e.g., Arts"
          required
        />
      </div>
      
      <div>
        <Label htmlFor="icon">Icon</Label>
        <Input
          id="icon"
          value={formData.icon || ''}
          onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
          placeholder="e.g., 0x4fbb"
          required
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="cancelled">Cancelled</Label>
          <Select
            value={formData.cancelled || '0'}
            onValueChange={(value) => setFormData({ ...formData, cancelled: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">No</SelectItem>
              <SelectItem value="1">Yes</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label htmlFor="locked">Locked</Label>
          <Select
            value={formData.locked || '0'}
            onValueChange={(value) => setFormData({ ...formData, locked: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">No</SelectItem>
              <SelectItem value="1">Yes</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );

  const renderForm = () => {
    switch (activeTab) {
      case 'faqs':
        return renderFAQForm();
      case 'languages':
        return renderLanguageForm();
      case 'socials':
        return renderSocialForm();
      case 'sub_subjects':
        return renderSubSubjectForm();
      case 'subjects':
        return renderSubjectForm();
      default:
        return null;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {renderForm()}
      
      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </form>
  );
}
