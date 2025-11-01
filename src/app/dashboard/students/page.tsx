"use client";

import { useState, useEffect, useCallback } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LoadingOverlay, LoadingButton } from "@/components/ui/loading-spinner";
import { StatusBadge, NotificationBadge } from "@/components/ui/status-badge";
import { EnhancedStudentDialog } from "@/components/enhanced-student-dialog";
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
  DollarSign,
  Star,
  UserCircle,
  BookOpen,
  Globe,
  Languages,
  CheckCircle,
  XCircle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useStudentManagementStore } from "@/stores/student-management-store";
import { useFirebaseAuthStore } from "@/stores/firebase-auth-store";
import { useResourcesManagementStore } from "@/stores/resources-management-store";
import { Student, StudentFilters } from "@/types/student";
import { getStudentProfileImageUrl } from "@/lib/file-upload";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function StudentsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<StudentFilters>({});
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filterOptions, setFilterOptions] = useState({
    studentLevels: new Set<string>(),
    majors: new Set<string>(),
    countries: new Set<string>(),
    nationalities: new Set<string>()
  });

  const { 
    students, 
    loading, 
    error, 
    totalCount,
    hasMore,
    fetchStudents, 
    createStudent, 
    updateStudent, 
    deleteStudent,
    toggleVerification,
    importStudents,
    resetPagination
  } = useStudentManagementStore();

  const { hasPermission } = useFirebaseAuthStore();
  
  const { languages, subjects, fetchLanguages, fetchSubjects } = useResourcesManagementStore();

  useEffect(() => {
    fetchStudents();
    fetchLanguages();
    fetchSubjects();
  }, []);

  // Helper function to get language names for a student
  const getStudentLanguages = useCallback((student: Student) => {
    if (!student.languages || !Array.isArray(student.languages)) return [];
    
    return student.languages.map((langId: any) => {
      const id = typeof langId === 'number' ? langId : parseInt(langId.id || langId);
      const language = languages.find(lang => parseInt(lang.id) === id);
      return language?.language_name || null;
    }).filter(Boolean);
  }, [languages]);

  // Helper function to get major name by ID
  const getMajorName = useCallback((majorId: number | null | undefined): string | null => {
    if (!majorId) return null;
    const subject = subjects.find(subj => parseInt(subj.id) === majorId);
    return subject?.label || null;
  }, [subjects]);

  // Extract unique filter options from students data
  useEffect(() => {
    if (students.length > 0) {
      const newFilterOptions = {
        studentLevels: new Set<string>(),
        majors: new Set<string>(),
        countries: new Set<string>(),
        nationalities: new Set<string>()
      };

      students.forEach(student => {
        if (student.student_level) {
          newFilterOptions.studentLevels.add(student.student_level);
        }
        if (student.majorId) {
          newFilterOptions.majors.add(student.majorId.toString());
        }
        if (student.country) {
          newFilterOptions.countries.add(student.country);
        }
        if (student.nationality) {
          newFilterOptions.nationalities.add(student.nationality);
        }
      });

      setFilterOptions(newFilterOptions);
    }
  }, [students]);

  useEffect(() => {
    const searchFilters: StudentFilters = {
      search: searchTerm || undefined,
      ...filters
    };
    resetPagination();
    fetchStudents(searchFilters);
  }, [searchTerm, filters]);

  const handleCreateStudent = useCallback(async (studentData: any) => {
    await createStudent(studentData);
  }, [createStudent]);

  const handleUpdateStudent = useCallback(async (studentData: any) => {
    if (!selectedStudent) return;
    await updateStudent(selectedStudent.id, studentData);
  }, [selectedStudent, updateStudent]);

  const handleDeleteStudent = useCallback(async (studentId: string) => {
    if (confirm('Are you sure you want to delete this student?')) {
      await deleteStudent(studentId);
    }
  }, [deleteStudent]);

  const handleToggleVerification = async (studentId: string, currentStatus: string) => {
    try {
      setActionLoading(studentId + '_verify');
      const newStatus = currentStatus === '1' ? false : true;
      await toggleVerification(studentId, newStatus);
    } catch (error) {
      console.error('Failed to toggle verification:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const openCreateDialog = useCallback(() => {
    setDialogMode('create');
    setSelectedStudent(null);
    setIsCreateDialogOpen(true);
  }, []);

  const openEditDialog = useCallback((student: Student) => {
    setDialogMode('edit');
    setSelectedStudent(student);
    setIsEditDialogOpen(true);
  }, []);

  const handleLoadMore = () => {
    fetchStudents(filters, true);
  };

  const handleImportStudents = async () => {
    try {
      // This would typically read from a file or API
      // For now, we'll use the students.json data
      const response = await fetch('/students.json');
      const studentsData = await response.json();
      await importStudents(studentsData);
      setIsImportDialogOpen(false);
    } catch (error) {
      console.error('Failed to import students:', error);
    }
  };

  const getStatusBadges = (student: Student) => {
    const badges = [];
    
    if (student.deleted_at) {
      badges.push(<StatusBadge key="deleted" status="inactive" />);
    } else if (student.is_banned === '1') {
      badges.push(<StatusBadge key="banned" status="banned" />);
    } else if (student.verified === '1') {
      badges.push(<StatusBadge key="verified" status="verified" />);
    } else {
      badges.push(<StatusBadge key="pending" status="pending" />);
    }
    
    badges.push(
      <NotificationBadge 
        key="notifications" 
        enabled={student.send_notifications === '1'} 
      />
    );
    
    return badges;
  };

  const getGenderIcon = (gender?: string) => {
    if (gender?.toLowerCase() === 'male') return '👨';
    if (gender?.toLowerCase() === 'female') return '👩';
    return '👤';
  };

  const getSignInMethodIcon = (signInMethod?: string) => {
    switch (signInMethod) {
      case 'facebook':
        return <User className="h-4 w-4 text-blue-600" />;
      case 'google':
        return <Globe className="h-4 w-4 text-red-500" />;
      case 'apple':
        return <Apple className="h-4 w-4 text-foreground" />;
      default:
        return <User className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getSignInMethodLabel = (signInMethod?: string) => {
    switch (signInMethod) {
      case 'facebook':
        return 'Facebook';
      case 'google':
        return 'Google';
      case 'apple':
        return 'Apple';
      default:
        return 'Manual';
    }
  };

  return (
    <AuthGuard requiredPermission={{ resource: 'students', action: 'read' }}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Students</h1>
            <p className="text-muted-foreground mt-2">Manage student accounts and information</p>
            <p className="text-sm text-muted-foreground mt-1">Total: {totalCount} students</p>
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
            
            {hasPermission('students', 'write') && (
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
                      <DialogTitle>Import Students</DialogTitle>
                      <DialogDescription>
                        Import students from the JSON file.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        This will import all students from the students.json file.
                      </p>
                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleImportStudents} disabled={loading}>
                          Import Students
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
                  Add Student
                </LoadingButton>
              </>
            )}
          </div>
        </div>

        {/* Search and Filters */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search by name, email, phone, major, country, requests, sign-in method, spend amount, etc..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" onClick={() => setShowFilters((v) => !v)} className="whitespace-nowrap">
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </Button>
          </div>

          {showFilters && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Filters</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Verification Status</Label>
                    <Select
                      value={filters.verified?.toString() || undefined}
                      onValueChange={(value) => setFilters({ ...filters, verified: value === 'all' ? undefined : value === 'true' })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="All Statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="true">Verified</SelectItem>
                        <SelectItem value="false">Not Verified</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium">Ban Status</Label>
                    <Select
                      value={filters.is_banned?.toString() || undefined}
                      onValueChange={(value) => setFilters({ ...filters, is_banned: value === 'all' ? undefined : value === 'true' })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="All Statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="false">Active</SelectItem>
                        <SelectItem value="true">Banned</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium">Student Level</Label>
                    <Select
                      value={filters.student_level || undefined}
                      onValueChange={(value) => setFilters({ ...filters, student_level: value === 'all' ? undefined : value })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="All Levels" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Levels</SelectItem>
                        {Array.from(filterOptions.studentLevels).sort((a, b) => a.localeCompare(b)).map((level) => (
                          <SelectItem key={level} value={level}>
                            {level}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium">Major</Label>
                    <Select
                      value={filters.majorId?.toString() || undefined}
                      onValueChange={(value) => setFilters({ ...filters, majorId: value === 'all' ? undefined : parseInt(value) })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="All Majors" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Majors</SelectItem>
                        {Array.from(filterOptions.majors).sort((a, b) => parseInt(a) - parseInt(b)).map((majorId) => {
                          const majorName = getMajorName(parseInt(majorId));
                          return (
                            <SelectItem key={majorId} value={majorId}>
                              {majorName || `Major ID: ${majorId}`}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium">Country</Label>
                    <Select
                      value={filters.country || undefined}
                      onValueChange={(value) => setFilters({ ...filters, country: value === 'all' ? undefined : value })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="All Countries" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Countries</SelectItem>
                        {Array.from(filterOptions.countries).sort((a, b) => a.localeCompare(b)).map((country) => (
                          <SelectItem key={country} value={country}>
                            {country}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium">Nationality</Label>
                    <Select
                      value={filters.nationality || undefined}
                      onValueChange={(value) => setFilters({ ...filters, nationality: value === 'all' ? undefined : value })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="All Nationalities" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Nationalities</SelectItem>
                        {Array.from(filterOptions.nationalities).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })).map((nationality) => (
                          <SelectItem key={nationality} value={nationality}>
                            {nationality}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Has Requests</Label>
                    <Select
                      value={filters.has_requests?.toString() || undefined}
                      onValueChange={(value) => setFilters({ ...filters, has_requests: value === 'all' ? undefined : value === 'true' })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="true">With Requests</SelectItem>
                        <SelectItem value="false">No Requests</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium">Sign-in Method</Label>
                    <Select
                      value={filters.sign_in_method || undefined}
                      onValueChange={(value) => setFilters({ ...filters, sign_in_method: value === 'all' ? undefined : value as any })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="manual">Manual</SelectItem>
                        <SelectItem value="facebook">Facebook</SelectItem>
                        <SelectItem value="google">Google</SelectItem>
                        <SelectItem value="apple">Apple</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium">Min Spend Amount</Label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={filters.min_spend || ''}
                      onChange={(e) => setFilters({ ...filters, min_spend: e.target.value ? parseFloat(e.target.value) : undefined })}
                    />
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium">Max Spend Amount</Label>
                    <Input
                      type="number"
                      placeholder="1000.00"
                      value={filters.max_spend || ''}
                      onChange={(e) => setFilters({ ...filters, max_spend: e.target.value ? parseFloat(e.target.value) : undefined })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Students Grid */}
        <LoadingOverlay loading={loading}>
          <div className="grid gap-4">
            {students.map((student) => (
              <Card key={student.id} className="transition-all duration-200 hover:shadow-md">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-muted flex items-center justify-center">
                          <img 
                            src={getStudentProfileImageUrl(student)} 
                            alt={student.full_name || 'Student'} 
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // Fallback to gender icon if image fails to load
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const fallbackDiv = target.nextElementSibling as HTMLElement;
                              if (fallbackDiv) {
                                fallbackDiv.style.display = 'flex';
                              }
                            }}
                          />
                          <div className="w-full h-full bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center text-white text-xl hidden">
                            {getGenderIcon(student.gender)}
                          </div>
                        </div>
                        <div className="flex-1">
                          <CardTitle className="flex items-center gap-2 mb-1">
                            <GraduationCap className="h-5 w-5" />
                            {student.full_name || 'No Name'}
                          </CardTitle>
                          {student.nickname && student.nickname !== student.full_name && (
                            <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                              <UserCircle className="h-3 w-3" />
                              @{student.nickname}
                            </p>
                          )}
                          <CardDescription className="flex items-center gap-4 mt-1 text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Mail className="h-4 w-4" />
                              {student.email}
                            </span>
                            {student.phone_number && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-4 w-4" />
                                {student.country_code}{student.phone_number}
                              </span>
                            )}
                          </CardDescription>
                        </div>
                      </div>
                      
                      {/* Status Badges */}
                      <div className="flex flex-wrap gap-2 mb-3">
                        {getStatusBadges(student)}
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      {hasPermission('students', 'write') && (
                        <>
                          {/* Verification Toggle */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleVerification(student.id, student.verified)}
                            disabled={actionLoading === student.id + '_verify'}
                            className={
                              student.verified === '1'
                                ? "hover:bg-green-50 hover:border-green-200 text-green-600 border-green-300"
                                : "hover:bg-muted"
                            }
                            title={student.verified === '1' ? 'Unverify student' : 'Verify student'}
                          >
                            {actionLoading === student.id + '_verify' ? (
                              <span className="h-4 w-4 animate-spin">⟳</span>
                            ) : student.verified === '1' ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : (
                              <XCircle className="h-4 w-4" />
                            )}
                          </Button>

                          {/* Edit Button */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(student)}
                            className="hover:bg-blue-50 hover:border-blue-200"
                            title="Edit student"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      
                      {hasPermission('students', 'delete') && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteStudent(student.id)}
                          className="hover:bg-red-50 hover:border-red-200 hover:text-red-600"
                          title="Delete student"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
              
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
                  {student.student_level && (
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-1">
                        <BookOpen className="h-3 w-3" />
                        Level
                      </h4>
                      <p className="text-sm font-medium">{student.student_level}</p>
                    </div>
                  )}
                  
                  {(student.majorId || student.otherMajor) && (
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-1">
                        <GraduationCap className="h-3 w-3" />
                        Major
                      </h4>
                      <p className="text-sm font-medium">
                        {student.otherMajor || getMajorName(student.majorId) || `Major ID: ${student.majorId}`}
                      </p>
                    </div>
                  )}
                  
                  {student.country && (
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        Location
                      </h4>
                      <p className="text-sm font-medium">
                        {student.city ? `${student.city}, ${student.country}` : student.country}
                      </p>
                    </div>
                  )}
                  
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      Requests
                    </h4>
                    <p className="text-sm font-medium">{student.request_count || 0}</p>
                  </div>
                  
                  {student.spend_amount !== undefined && student.spend_amount > 0 && (
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        Spent
                      </h4>
                      <p className="text-sm font-medium text-green-600">
                        ${student.spend_amount.toFixed(2)}
                      </p>
                    </div>
                  )}
                  
                  {student.rating !== undefined && student.rating > 0 && (
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-1">
                        <Star className="h-3 w-3" />
                        Rating
                      </h4>
                      <p className="text-sm font-medium text-yellow-600">
                        {student.rating.toFixed(1)} ⭐
                      </p>
                    </div>
                  )}
                  
                  {student.nationality && (
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-1">
                        <User className="h-3 w-3" />
                        Nationality
                      </h4>
                      <p className="text-sm font-medium">{student.nationality}</p>
                    </div>
                  )}
                  
                  {student.gender && (
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-1">
                        <UserCircle className="h-3 w-3" />
                        Gender
                      </h4>
                      <p className="text-sm font-medium">{student.gender}</p>
                    </div>
                  )}
                </div>

                {/* Languages Section - Full Width */}
                {getStudentLanguages(student).length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-1 mb-2">
                      <Languages className="h-3 w-3" />
                      Languages
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {getStudentLanguages(student).map((languageName, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="text-xs"
                        >
                          {languageName}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>Joined {new Date(student.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      {getSignInMethodIcon(student.sign_in_method)}
                      <span>{getSignInMethodLabel(student.sign_in_method)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
              </Card>
            ))}
          </div>
        </LoadingOverlay>

        {/* Load More Button */}
        {hasMore && (
          <div className="flex justify-center">
            <Button variant="outline" onClick={handleLoadMore} disabled={loading}>
              Load More Students
            </Button>
          </div>
        )}

        {students.length === 0 && !loading && (
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="text-center">
                <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No students found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm || Object.keys(filters).length > 0 
                    ? 'No students match your search criteria.' 
                    : 'Students will appear here once they are added to the system.'
                  }
                </p>
                {hasPermission('students', 'write') && !searchTerm && Object.keys(filters).length === 0 && (
                  <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Student
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Enhanced Student Dialog */}
        <EnhancedStudentDialog
          open={isCreateDialogOpen || isEditDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              setIsCreateDialogOpen(false);
              setIsEditDialogOpen(false);
              setSelectedStudent(null);
            }
          }}
          student={selectedStudent}
          mode={dialogMode}
          onSave={dialogMode === 'create' ? handleCreateStudent : handleUpdateStudent}
          loading={loading}
          error={error}
        />
      </div>
    </AuthGuard>
  );
}