"use client";

import { useState, useEffect, useCallback } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LoadingOverlay, LoadingButton } from "@/components/ui/loading-spinner";
import { StatusBadge, NotificationBadge } from "@/components/ui/status-badge";
import { EnhancedTutorDialog } from "@/components/enhanced-tutor-dialog";
import { PaginationAdvanced } from "@/components/pagination.advanced";
import { 
  GraduationCap, 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Mail, 
  Phone, 
  Calendar, 
  MapPin, 
  Upload,
  MessageSquare,
  User,
  Apple,
  UserCircle,
  Globe,
  MessageCircle,
  FileText,
  CheckCircle,
  XCircle,
  Bell,
  BellOff,
  Ban,
  BookOpen,
  Award,
  Languages,
  RotateCcw,
  Eye
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { useTutorManagementStore } from "@/stores/tutor-management-store";
import { useFirebaseAuthStore } from "@/stores/firebase-auth-store";
import { useResourcesManagementStore } from "@/stores/resources-management-store";
import { Tutor, TutorFilters } from "@/types/tutor";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getImageUrl } from "@/lib/file-upload";

export default function TutorsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [emailTerm, setEmailTerm] = useState("");
  const [nicknameTerm, setNicknameTerm] = useState("");
  const [phoneTerm, setPhoneTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [debouncedEmailTerm, setDebouncedEmailTerm] = useState("");
  const [debouncedNicknameTerm, setDebouncedNicknameTerm] = useState("");
  const [debouncedPhoneTerm, setDebouncedPhoneTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [selectedTutor, setSelectedTutor] = useState<Tutor | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<TutorFilters>({});
  const [activeTab, setActiveTab] = useState<'all' | 'verified' | 'not_verified' | 'deleted' | 'cancelled'>('all');
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filterOptions, setFilterOptions] = useState({
    countries: new Set<string>(),
    nationalities: new Set<string>()
  });

  const { 
    tutors, 
    loading, 
    error, 
    totalCount,
    totalPages,
    hasMore,
    currentPage,
    perPage,
    fetchTutors, 
    createTutor, 
    updateTutor, 
    deleteTutor,
    restoreTutor,
    importTutors,
    resetPagination,
    toggleVerification,
    toggleNotifications,
    toggleCancelled,
    setCurrentPage,
    setPerPage
  } = useTutorManagementStore();

  const { hasPermission } = useFirebaseAuthStore();
  const { subjects, languages, fetchAllResources } = useResourcesManagementStore();

  useEffect(() => {
    fetchTutors();
    fetchAllResources(); // Load subjects and languages for display
  }, []);

  // Extract unique filter options from tutors data
  useEffect(() => {
    if (tutors.length > 0) {
      const newFilterOptions = {
        countries: new Set<string>(),
        nationalities: new Set<string>()
      };

      tutors.forEach(tutor => {
        if (tutor.country) {
          newFilterOptions.countries.add(tutor.country);
        }
        if (tutor.nationality) {
          newFilterOptions.nationalities.add(tutor.nationality);
        }
      });

      setFilterOptions(newFilterOptions);
    }
  }, [tutors]);

  // Handle page change
  const handlePageChange = (newPage: number) => {
    if (newPage === currentPage) return;
    setCurrentPage(newPage);
    fetchTutors(filters, newPage);
  };

  // Handle per page change
  const handlePerPageChange = (newPerPage: number) => {
    setPerPage(newPerPage);
    const searchFilters: TutorFilters = {
      search: debouncedSearchTerm || undefined,
      email: debouncedEmailTerm || undefined,
      nickname: debouncedNicknameTerm || undefined,
      phone: debouncedPhoneTerm || undefined,
      ...filters
    };
    resetPagination();
    fetchTutors(searchFilters, 1, 'first');
  };

  // Debounce search term (500ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Debounce email term (500ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedEmailTerm(emailTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [emailTerm]);

  // Debounce nickname term (500ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedNicknameTerm(nicknameTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [nicknameTerm]);

  // Debounce phone term (500ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedPhoneTerm(phoneTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [phoneTerm]);

  useEffect(() => {
    const searchFilters: TutorFilters = {
      search: debouncedSearchTerm || undefined,
      email: debouncedEmailTerm || undefined,
      nickname: debouncedNicknameTerm || undefined,
      phone: debouncedPhoneTerm || undefined,
      ...filters
    };
    resetPagination();
    fetchTutors(searchFilters, 1, 'first');
  }, [debouncedSearchTerm, debouncedEmailTerm, debouncedNicknameTerm, debouncedPhoneTerm, filters]);

  const handleTabChange = (tab: 'all' | 'verified' | 'not_verified' | 'deleted' | 'cancelled') => {
    setActiveTab(tab);
    // Reset related filters, then set tab-specific ones
    const base = { ...filters, verified: undefined, deleted: undefined, cancelled: undefined } as TutorFilters;
    if (tab === 'verified') setFilters({ ...base, verified: true });
    else if (tab === 'not_verified') setFilters({ ...base, verified: false });
    else if (tab === 'deleted') setFilters({ ...base, deleted: true });
    else if (tab === 'cancelled') setFilters({ ...base, cancelled: true });
    else setFilters(base);
  };

  const handleClearFilters = () => {
    setFilters({});
    setSearchTerm('');
    setEmailTerm('');
    setNicknameTerm('');
    setPhoneTerm('');
    setDebouncedSearchTerm('');
    setDebouncedEmailTerm('');
    setDebouncedNicknameTerm('');
    setDebouncedPhoneTerm('');
    setActiveTab('all');
  };

  const handleCreateTutor = useCallback(async (tutorData: any) => {
    await createTutor(tutorData);
    const currentFilters: TutorFilters = {
      search: debouncedSearchTerm || undefined,
      email: debouncedEmailTerm || undefined,
      nickname: debouncedNicknameTerm || undefined,
      phone: debouncedPhoneTerm || undefined,
      ...filters,
    };
    fetchTutors(currentFilters, currentPage);
  }, [createTutor, fetchTutors, filters, debouncedSearchTerm, debouncedEmailTerm, debouncedNicknameTerm, debouncedPhoneTerm, currentPage]);

  const handleUpdateTutor = useCallback(async (tutorData: any) => {
    if (!selectedTutor) return;
    await updateTutor(selectedTutor.id, tutorData);
    const currentFilters: TutorFilters = {
      search: debouncedSearchTerm || undefined,
      email: debouncedEmailTerm || undefined,
      nickname: debouncedNicknameTerm || undefined,
      phone: debouncedPhoneTerm || undefined,
      ...filters,
    };
    fetchTutors(currentFilters, currentPage);
  }, [selectedTutor, updateTutor, fetchTutors, filters, debouncedSearchTerm, debouncedEmailTerm, debouncedNicknameTerm, debouncedPhoneTerm, currentPage]);

  const handleDeleteTutor = useCallback(async (tutorId: string) => {
    if (confirm('Are you sure you want to delete this tutor?')) {
      await deleteTutor(tutorId);
      const currentFilters: TutorFilters = {
        search: debouncedSearchTerm || undefined,
        email: debouncedEmailTerm || undefined,
        nickname: debouncedNicknameTerm || undefined,
        phone: debouncedPhoneTerm || undefined,
        ...filters,
      };
      fetchTutors(currentFilters, currentPage);
    }
  }, [deleteTutor, fetchTutors, filters, debouncedSearchTerm, debouncedEmailTerm, debouncedNicknameTerm, debouncedPhoneTerm, currentPage]);

  const handleRestoreTutor = useCallback(async (tutorId: string) => {
    try {
      setActionLoading(tutorId + '_restore');
      await restoreTutor(tutorId);
      const currentFilters: TutorFilters = {
        search: debouncedSearchTerm || undefined,
        email: debouncedEmailTerm || undefined,
        nickname: debouncedNicknameTerm || undefined,
        phone: debouncedPhoneTerm || undefined,
        ...filters,
      };
      fetchTutors(currentFilters, currentPage);
    } catch (error: any) {
      alert(`Failed to restore tutor: ${error.message || 'Unknown error'}`);
    } finally {
      setActionLoading(null);
    }
  }, [restoreTutor, fetchTutors, filters, debouncedSearchTerm, debouncedEmailTerm, debouncedNicknameTerm, debouncedPhoneTerm, currentPage]);

  const openCreateDialog = useCallback(() => {
    setDialogMode('create');
    setSelectedTutor(null);
    setIsCreateDialogOpen(true);
  }, []);

  const openEditDialog = useCallback((tutor: Tutor) => {
    setDialogMode('edit');
    setSelectedTutor(tutor);
    setIsEditDialogOpen(true);
  }, []);


  const handleImportTutors = async () => {
    try {
      // This would typically read from a file or API
      const response = await fetch('/tutors.json');
      const tutorsData = await response.json();
      await importTutors(tutorsData);
      setIsImportDialogOpen(false);
    } catch (error) {
      console.error('Failed to import tutors:', error);
    }
  };

  const handleToggleVerification = async (tutorId: string, currentStatus: string) => {
    try {
      setActionLoading(tutorId + '_verify');
      const newStatus = currentStatus === '2' ? false : true;
      await toggleVerification(tutorId, newStatus);
      const currentFilters: TutorFilters = {
        search: debouncedSearchTerm || undefined,
        email: debouncedEmailTerm || undefined,
        nickname: debouncedNicknameTerm || undefined,
        phone: debouncedPhoneTerm || undefined,
        ...filters,
      };
      fetchTutors(currentFilters, currentPage);
    } catch (error) {
      console.error('Failed to toggle verification:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleNotifications = async (tutorId: string, currentStatus: string) => {
    try {
      setActionLoading(tutorId + '_notif');
      const newStatus = currentStatus === '1' ? false : true;
      await toggleNotifications(tutorId, newStatus);
      const currentFilters: TutorFilters = {
        search: debouncedSearchTerm || undefined,
        email: debouncedEmailTerm || undefined,
        nickname: debouncedNicknameTerm || undefined,
        phone: debouncedPhoneTerm || undefined,
        ...filters,
      };
      fetchTutors(currentFilters, currentPage);
    } catch (error) {
      console.error('Failed to toggle notifications:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleCancelled = async (tutorId: string, currentStatus: string) => {
    try {
      setActionLoading(tutorId + '_cancel');
      const newStatus = currentStatus === '1' ? false : true;
      await toggleCancelled(tutorId, newStatus);
      const currentFilters: TutorFilters = {
        search: debouncedSearchTerm || undefined,
        email: debouncedEmailTerm || undefined,
        nickname: debouncedNicknameTerm || undefined,
        phone: debouncedPhoneTerm || undefined,
        ...filters,
      };
      fetchTutors(currentFilters, currentPage);
    } catch (error) {
      console.error('Failed to toggle cancelled status:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadges = (tutor: Tutor) => {
    const badges = [];
    
    // Cancelled status takes priority
    if (tutor.cancelled === '1') {
      badges.push(
        <Badge key="cancelled" variant="destructive" className="bg-red-100 text-red-700 border-red-300">
          ❌ Cancelled
        </Badge>
      );
    } else if (tutor.deleted_at) {
      badges.push(<StatusBadge key="deleted" status="inactive" />);
    } else if (tutor.verified === '2') {
      badges.push(<StatusBadge key="verified" status="verified" />);
    } else {
      badges.push(<StatusBadge key="pending" status="pending" />);
    }
    
    badges.push(
      <NotificationBadge 
        key="notifications" 
        enabled={tutor.send_notifications === '1'} 
      />
    );
    
    return badges;
  };

  const getGenderIcon = (gender?: string) => {
    if (gender?.toLowerCase() === 'male') return '👨';
    if (gender?.toLowerCase() === 'female') return '👩';
    return '👤';
  };

  const formatDate = (value: any): string => {
    if (value === undefined || value === null) return 'Not set';
    
    // If it's already a string that's not a valid date format, return it as-is
    if (typeof value === 'string' && value.trim() !== '') {
      const trimmed = value.trim();
      // If it's not a numeric or date-like string, return it as-is
      if (!/^\d/.test(trimmed) && !trimmed.includes('-') && !trimmed.includes('/')) {
        return trimmed;
      }
    }
    
    try {
      let date: Date | null = null;

      // Firestore Timestamp instance with toDate()
      if (value && typeof value.toDate === 'function') {
        date = value.toDate();
      }
      // Firestore-like object with seconds/_seconds and optional nanoseconds
      else if (value && typeof value === 'object' && (
          ('seconds' in value) || ('_seconds' in value)
        )) {
        const seconds = (value.seconds ?? value._seconds) as number;
        const nanos = (value.nanoseconds ?? value._nanoseconds ?? 0) as number;
        if (typeof seconds === 'number') {
          date = new Date(seconds * 1000 + Math.floor(nanos / 1e6));
        }
      }
      // Native Date
      else if (value instanceof Date) {
        date = value;
      }
      // Numeric epoch (ms or seconds)
      else if (typeof value === 'number') {
        // Heuristic: < 1e12 => seconds, else milliseconds
        const ms = value < 1e12 ? value * 1000 : value;
        date = new Date(ms);
      }
      // String input (ISO, RFC, or numeric string)
      else if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed === '') return 'Not set';
        // If purely numeric (or numeric with decimal), treat as epoch
        if (/^[-+]?\d+(?:\.\d+)?$/.test(trimmed)) {
          const num = parseFloat(trimmed);
          const ms = num < 1e12 ? num * 1000 : num;
          date = new Date(ms);
        } else {
          date = new Date(trimmed);
        }
      }

      if (!date || isNaN(date.getTime())) {
        // If date parsing failed and it's a string, return the string as-is
        if (typeof value === 'string') {
          return value;
        }
        return 'Invalid date';
      }
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      // If parsing fails and it's a string, return the string as-is
      if (typeof value === 'string') {
        return value;
      }
      return 'Invalid date';
    }
  };

  return (
    <AuthGuard requiredPermission={{ resource: 'tutors', action: 'read' }}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Tutors</h1>
            <p className="text-muted-foreground mt-2">Manage tutor accounts and information</p>
            <p className="text-sm text-muted-foreground mt-1">
              {tutors.length > 0 ? (
                <>Showing {tutors.length} of {totalCount} tutor{totalCount !== 1 ? 's' : ''}</>
              ) : (
                <>Total: {totalCount} tutor{totalCount !== 1 ? 's' : ''}</>
              )}
            </p>
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              className="flex items-center gap-2"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4" />
              Filters
            </Button>
            
            {hasPermission('tutors', 'write') && (
              <>
                <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      Import
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Import Tutors</DialogTitle>
                      <DialogDescription>
                        Import tutors from the JSON file.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        This will import all tutors from the tutors.json file.
                      </p>
                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleImportTutors} disabled={loading}>
                          Import Tutors
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                <LoadingButton
                  onClick={openCreateDialog}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Tutor
                </LoadingButton>
              </>
            )}
          </div>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Filters</CardTitle>
              {(searchTerm || emailTerm || nicknameTerm || phoneTerm || Object.keys(filters).length > 0 || activeTab !== 'all') && (
                <Button variant="outline" size="sm" onClick={handleClearFilters}>
                  Clear Filters
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Status Tabs */}
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'all', label: 'All' },
                  { key: 'verified', label: 'Verified' },
                  { key: 'not_verified', label: 'Not Verified' },
                  { key: 'deleted', label: 'Deleted' },
                  { key: 'cancelled', label: 'Cancelled' },
                ].map((tab) => (
                  <Button
                    key={tab.key}
                    variant={activeTab === (tab.key as any) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleTabChange(tab.key as any)}
                    className="whitespace-nowrap"
                  >
                    {tab.label}
                  </Button>
                ))}
              </div>

              <div className="flex flex-col md:flex-row md:items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search by name, country, etc..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="relative flex-1">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search by email..."
                    value={emailTerm}
                    onChange={(e) => setEmailTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="relative flex-1">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search by phone..."
                    value={phoneTerm}
                    onChange={(e) => setPhoneTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pagination Controls - Top */}
        {!loading && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label htmlFor="per-page-select">Show per page:</Label>
              <Select value={perPage.toString()} onValueChange={(value) => handlePerPageChange(parseInt(value))}>
                <SelectTrigger id="per-page-select" className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">
                Showing {tutors.length > 0 ? ((currentPage - 1) * perPage + 1) : 0} - {Math.min(currentPage * perPage, totalCount)} of {totalCount}
              </span>
            </div>
            {totalPages > 1 && (
              <PaginationAdvanced 
                currentPage={currentPage} 
                totalPages={totalPages} 
                onPageChange={handlePageChange} 
              />
            )}
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Tutors Grid - Single Column with 4-Column Internal Layout */}
        <LoadingOverlay loading={loading}>
          <div className="grid gap-4">
            {tutors.map((tutor) => (
              <Card key={tutor.id} className="transition-all duration-200 hover:shadow-md">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {tutor.profile_image ? (
                          <div className="relative w-12 h-12">
                            <img
                              src={getImageUrl(tutor.profile_image)}
                              alt={tutor.full_name}
                              className="w-12 h-12 rounded-full object-cover border-2 border-purple-200"
                              onError={(e) => {
                                // Fallback to gender icon container if image fails to load
                                const parent = (e.target as HTMLElement).parentElement;
                                if (parent) {
                                  parent.innerHTML = `<div class="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center text-white text-xl">${getGenderIcon(tutor.gender)}</div>`;
                                }
                              }}
                            />
                          </div>
                        ) : (
                          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center text-white text-xl">
                            {getGenderIcon(tutor.gender)}
                          </div>
                        )}
                        <div className="flex-1">
                          <CardTitle className="flex items-center gap-2 mb-1">
                            <GraduationCap className="h-5 w-5" />
                            {tutor.full_name || 'No Name'}
                          </CardTitle>
                          {tutor.nickname && tutor.nickname !== tutor.full_name && (
                            <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                              <UserCircle className="h-3 w-3" />
                              @{tutor.nickname}
                            </p>
                          )}
                          <CardDescription className="flex items-center gap-4 mt-1 text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Mail className="h-4 w-4" />
                              {tutor.email}
                            </span>
                            {tutor.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-4 w-4" />
                                {tutor.phone_country_code}{tutor.phone}
                              </span>
                            )}
                          </CardDescription>
                        </div>
                      </div>
                      
                      {/* Status Badges */}
                      <div className="flex flex-wrap gap-2 mb-3">
                        {getStatusBadges(tutor)}
                      </div>
                    </div>
                    
                    <div className="flex gap-2 flex-wrap">
                      {/* View Button */}
                      <Link href={`/dashboard/tutors/${tutor.id}`}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="hover:bg-purple-50 hover:border-purple-200 hover:text-purple-600"
                          title="View tutor details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>

                      {/* Quick Actions */}
                      {hasPermission('tutors', 'write') && (
                        <>
                          {/* Verification Toggle */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleVerification(tutor.id, tutor.verified)}
                            disabled={actionLoading === tutor.id + '_verify'}
                            className={
                              tutor.verified === '2'
                                ? "hover:bg-green-50 hover:border-green-200 text-green-600 border-green-300"
                                : "hover:bg-muted"
                            }
                            title={tutor.verified === '2' ? 'Unverify tutor' : 'Verify tutor'}
                          >
                            {actionLoading === tutor.id + '_verify' ? (
                              <span className="h-4 w-4 animate-spin">⟳</span>
                            ) : tutor.verified === '2' ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : (
                              <XCircle className="h-4 w-4" />
                            )}
                          </Button>

                          {/* Notifications Toggle */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleNotifications(tutor.id, tutor.send_notifications)}
                            disabled={actionLoading === tutor.id + '_notif'}
                            className={
                              tutor.send_notifications === '1'
                                ? "hover:bg-blue-50 hover:border-blue-200 text-blue-600 border-blue-300"
                                : "hover:bg-muted"
                            }
                            title={tutor.send_notifications === '1' ? 'Disable notifications' : 'Enable notifications'}
                          >
                            {actionLoading === tutor.id + '_notif' ? (
                              <span className="h-4 w-4 animate-spin">⟳</span>
                            ) : tutor.send_notifications === '1' ? (
                              <Bell className="h-4 w-4" />
                            ) : (
                              <BellOff className="h-4 w-4" />
                            )}
                          </Button>

                          {/* Cancel/Activate Toggle */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleCancelled(tutor.id, tutor.cancelled)}
                            disabled={actionLoading === tutor.id + '_cancel'}
                            className={
                              tutor.cancelled === '1'
                                ? "hover:bg-red-50 hover:border-red-200 text-red-600 border-red-300"
                                : "hover:bg-muted"
                            }
                            title={tutor.cancelled === '1' ? 'Activate tutor' : 'Cancel tutor'}
                          >
                            {actionLoading === tutor.id + '_cancel' ? (
                              <span className="h-4 w-4 animate-spin">⟳</span>
                            ) : tutor.cancelled === '1' ? (
                              <Ban className="h-4 w-4" />
                            ) : (
                              <CheckCircle className="h-4 w-4" />
                            )}
                          </Button>

                          {/* Edit Button */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(tutor)}
                            className="hover:bg-blue-50 hover:border-blue-200"
                            title="Edit tutor"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      
                      {hasPermission('tutors', 'delete') && !tutor.deleted_at && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteTutor(tutor.id)}
                          className="hover:bg-red-50 hover:border-red-200 hover:text-red-600"
                          title="Delete tutor"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                      
                      {hasPermission('tutors', 'write') && tutor.deleted_at && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRestoreTutor(tutor.id)}
                          disabled={actionLoading === tutor.id + '_restore'}
                          className="hover:bg-green-50 hover:border-green-200 hover:text-green-600"
                          title="Restore tutor"
                        >
                          {actionLoading === tutor.id + '_restore' ? (
                            <span className="h-4 w-4 animate-spin">⟳</span>
                          ) : (
                            <RotateCcw className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
              
              <CardContent>
                {/* Main Info Grid - 4 Columns */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  {/* Column 1: Contact Info */}
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-1 mb-1">
                        <Mail className="h-3 w-3" />
                        Email
                      </h4>
                      <p className="text-sm font-medium truncate">{tutor.email}</p>
                    </div>
                    {tutor.phone && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-1 mb-1">
                          <Phone className="h-3 w-3" />
                          Phone
                        </h4>
                        <p className="text-sm font-medium">{tutor.phone_country_code}{tutor.phone}</p>
                      </div>
                    )}
                    {tutor.whatsapp_phone && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-1 mb-1">
                          <MessageCircle className="h-3 w-3" />
                          WhatsApp
                        </h4>
                        <p className="text-sm font-medium">{tutor.whatsapp_country_code}{tutor.whatsapp_phone}</p>
                      </div>
                    )}
                  </div>

                  {/* Column 2: Location Info */}
                  <div className="space-y-3">
                    {tutor.country && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-1 mb-1">
                          <MapPin className="h-3 w-3" />
                          Location
                        </h4>
                        <p className="text-sm font-medium">
                          {tutor.city ? `${tutor.city}, ${tutor.country}` : tutor.country}
                        </p>
                      </div>
                    )}
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-1 mb-1">
                        <MessageSquare className="h-3 w-3" />
                        Requests
                      </h4>
                      <p className="text-sm font-medium">{tutor.request_count || 0}</p>
                    </div>
                  </div>

                  {/* Column 3: Personal Info */}
                  <div className="space-y-3">
                    {tutor.nationality && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-1 mb-1">
                          <User className="h-3 w-3" />
                          Nationality
                        </h4>
                        <p className="text-sm font-medium">{tutor.nationality}</p>
                      </div>
                    )}
                    {tutor.gender && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-1 mb-1">
                          <UserCircle className="h-3 w-3" />
                          Gender
                        </h4>
                        <p className="text-sm font-medium">{tutor.gender}</p>
                      </div>
                    )}
                    {tutor.date_of_birth && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-1 mb-1">
                          <Calendar className="h-3 w-3" />
                          Date of Birth
                        </h4>
                        <p className="text-sm font-medium">
                          {formatDate(tutor.date_of_birth)}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Column 4: Academic & Experience */}
                  <div className="space-y-3">
                    {tutor.experience_years !== null && tutor.experience_years !== undefined && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-1 mb-1">
                          <Award className="h-3 w-3" />
                          Experience
                        </h4>
                        <p className="text-sm font-medium">{tutor.experience_years} years</p>
                      </div>
                    )}

                    {tutor.languages && tutor.languages.length > 0 && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-1 mb-1">
                          <Languages className="h-3 w-3" />
                          Languages
                        </h4>
                        <div className="flex flex-wrap gap-1">
                          {tutor.languages.map((langId) => {
                            const language = languages.find(l => l.id === langId.toString());
                            return (
                              <Badge key={langId} variant="secondary" className="text-xs bg-indigo-100 text-indigo-800">
                                {language?.language_name || `Lang ${langId}`}
                              </Badge>
                            );
                          })}
                          
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Skills & Subjects Section - Compact */}
                {(tutor.skills?.length || tutor.subjects?.length || (Array.isArray(tutor.majorId) && tutor.majorId.length > 0) || tutor.major) && (
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-1 mb-2">
                      <BookOpen className="h-3 w-3" />
                      Skills & Subjects
                    </h4>
                    <div className="space-y-2">
                      {/* Skills */}
                      {tutor.skills && tutor.skills.length > 0 && (
                        <div>
                          <h5 className="text-xs font-medium text-muted-foreground mb-1">Skills</h5>
                          <div className="flex flex-wrap gap-1">
                            {tutor.skills.map((skillId) => {
                              const subject = subjects.find(s => s.id === skillId.toString());
                              return (
                                <Badge key={skillId} variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                                  {subject?.label || `Skill ${skillId}`}
                                </Badge>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Subjects */}
                      {tutor.subjects && tutor.subjects.length > 0 && (
                        <div>
                          <h5 className="text-xs font-medium text-muted-foreground mb-1">Teaching Subjects</h5>
                          <div className="flex flex-wrap gap-1">
                            {tutor.subjects.map((subjectId) => {
                              const subject = subjects.find(s => s.id === subjectId.toString());
                              return (
                                <Badge key={subjectId} variant="secondary" className="text-xs bg-green-100 text-green-800">
                                  {subject?.label || `Subject ${subjectId}`}
                                </Badge>
                              );
                            })}
                            
                          </div>
                        </div>
                      )}

                      {/* Majors */}
                      {((Array.isArray(tutor.majorId) && tutor.majorId.length > 0) || tutor.major) && (
                        <div>
                          <h5 className="text-xs font-medium text-muted-foreground mb-1">Majors</h5>
                          <div className="flex flex-wrap gap-1">
                            {Array.isArray(tutor.majorId) && tutor.majorId.length > 0 ? (
                              tutor.majorId.map((majorId) => {
                                const subject = subjects.find(s => s.id == majorId.toString());
                                return (
                                  <Badge key={majorId} variant="secondary" className="text-xs bg-purple-100 text-purple-800">
                                    {subject?.label || `Major ${majorId}`}
                                  </Badge>
                                );
                              })
                            ) : tutor.major ? (
                              <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-800">
                                {tutor.major}
                              </Badge>
                            ) : null}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Bio Section - Compact */}
                {tutor.bio && (
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-1 mb-2">
                      <FileText className="h-3 w-3" />
                      Bio
                    </h4>
                    <div className="text-sm text-foreground whitespace-pre-wrap bio-text max-w-full max-h-20 overflow-hidden">
                      {tutor.bio.length > 150 ? `${tutor.bio}` : tutor.bio}
                    </div>
                  </div>
                )}

                {/* Education/Degrees Section */}
                {tutor.degree && tutor.degree.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-1 mb-3">
                      <GraduationCap className="h-3 w-3" />
                      Education & Certifications
                    </h4>
                    <div className="space-y-3">
                      {Array.isArray(tutor.degree) && tutor.degree.length > 0 ? (
                        tutor.degree.map((degree, index) => (
                          <div key={index} className="bg-muted p-3 rounded-lg border">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                                    {degree}
                                  </Badge>
                                </div>
                                {Array.isArray(tutor.university) && tutor.university[index] && (
                                  <p className="text-sm font-medium text-foreground mt-1">
                                    {tutor.university[index]}
                                  </p>
                                )}
                                {Array.isArray(tutor.certification_file_link) && tutor.certification_file_link[index] && (
                                  <div className="mt-2">
                                    <a
                                      href={getImageUrl(tutor.certification_file_link[index])}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                                    >
                                      <FileText className="h-3 w-3" />
                                      View Certificate
                                    </a>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : null}
                    </div>
                  </div>
                )}

                {Array.isArray(tutor.id_file_link) && tutor.id_file_link.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-1 mb-3">
                      <FileText className="h-3 w-3" />
                      ID Documents
                    </h4>
                    <div className="space-y-3">
                      {tutor.id_file_link.map((link, idx) => (
                        <div key={idx} className="bg-muted p-3 rounded-lg border">
                          <div className="flex items-center gap-2">
                            <a
                              href={getImageUrl(link)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              <FileText className="h-3 w-3" />
                              {`ID File ${idx + 1}`}
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>
                        Joined{' '}
                        {formatDate(tutor.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
              </Card>
            ))}
          </div>
        </LoadingOverlay>

        {/* Pagination Controls - Top */}
        {!loading && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label htmlFor="per-page-select">Show per page:</Label>
              <Select value={perPage.toString()} onValueChange={(value) => handlePerPageChange(parseInt(value))}>
                <SelectTrigger id="per-page-select" className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">
                Showing {tutors.length > 0 ? ((currentPage - 1) * perPage + 1) : 0} - {Math.min(currentPage * perPage, totalCount)} of {totalCount}
              </span>
            </div>
            {totalPages > 1 && (
              <PaginationAdvanced 
                currentPage={currentPage} 
                totalPages={totalPages} 
                onPageChange={handlePageChange} 
              />
            )}
          </div>
        )}

        {tutors.length === 0 && !loading && (
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="text-center">
                <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No tutors found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm || Object.keys(filters).length > 0 
                    ? 'No tutors match your search criteria.' 
                    : 'Tutors will appear here once they are added to the system.'
                  }
                </p>
                {hasPermission('tutors', 'write') && !searchTerm && Object.keys(filters).length === 0 && (
                  <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Tutor
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Enhanced Tutor Dialog */}
        <EnhancedTutorDialog
          open={isCreateDialogOpen || isEditDialogOpen}
          onOpenChange={(open: boolean) => {
            if (!open) {
              setIsCreateDialogOpen(false);
              setIsEditDialogOpen(false);
              setSelectedTutor(null);
            }
          }}
          tutor={selectedTutor}
          mode={dialogMode}
          onSave={dialogMode === 'create' ? handleCreateTutor : handleUpdateTutor}
          loading={loading}
          error={error}
        />
      </div>
    </AuthGuard>
  );
}

