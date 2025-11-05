'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Student } from '@/types/student';
import { StudentEducationLevelLabel, StudentGenderLabel } from '@/types/student';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ArrowLeft,
  AlertCircle,
  User,
  GraduationCap,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Globe,
  Languages,
  BookOpen,
  DollarSign,
  Star,
  UserCircle,
  CheckCircle,
  XCircle,
  Edit,
  Apple
} from 'lucide-react';
import { getStudentProfileImageUrl } from '@/lib/file-upload';
import Link from 'next/link';
import { useResourcesManagementStore } from '@/stores/resources-management-store';

export default function StudentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params.id as string;

  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { languages, subjects, fetchLanguages, fetchSubjects } = useResourcesManagementStore();

  // Fetch languages and subjects
  useEffect(() => {
    fetchLanguages();
    fetchSubjects();
  }, [fetchLanguages, fetchSubjects]);

  // Fetch the specific student directly by ID
  useEffect(() => {
    if (!studentId) return;

    const fetchStudent = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/students/${studentId}`);
        const data = await response.json();
        
        if (response.ok && data.success && data.student) {
          // Convert Firestore timestamps if needed
          const convertedStudent = {
            ...data.student,
            created_at: data.student.created_at?._seconds 
              ? new Date(data.student.created_at._seconds * 1000).toISOString()
              : data.student.created_at,
            updated_at: data.student.updated_at?._seconds
              ? new Date(data.student.updated_at._seconds * 1000).toISOString()
              : data.student.updated_at,
            deleted_at: data.student.deleted_at?._seconds
              ? new Date(data.student.deleted_at._seconds * 1000).toISOString()
              : data.student.deleted_at,
          };
          setStudent(convertedStudent as Student);
        } else {
          setError(data.error || 'Student not found');
        }
      } catch (error) {
        console.error('Error fetching student:', error);
        setError('Failed to fetch student');
      } finally {
        setLoading(false);
      }
    };

    fetchStudent();
  }, [studentId]);

  // Helper functions
  const getStudentLanguages = (student: Student) => {
    if (!student.languages || !Array.isArray(student.languages)) return [];
    
    return student.languages.map((langId: any) => {
      const id = typeof langId === 'number' ? langId : parseInt(langId.id || langId);
      const language = languages.find(lang => parseInt(lang.id) === id);
      return language?.language_name || null;
    }).filter(Boolean);
  };

  const getMajorName = (majorId: number | null | undefined): string | null => {
    if (!majorId) return null;
    const subject = subjects.find(subj => parseInt(subj.id) === majorId);
    return subject?.label || null;
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

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Not set';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const getGenderIcon = (gender?: string) => {
    if (gender === 'FEMALE') return '♀';
    if (gender === 'MALE') return '♂';
    return '⚧';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || 'Student not found'}</AlertDescription>
        </Alert>
        <Button onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full overflow-hidden bg-muted flex items-center justify-center">
              <img 
                src={getStudentProfileImageUrl(student)} 
                alt={student.full_name || 'Student'} 
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const fallbackDiv = target.nextElementSibling as HTMLElement;
                  if (fallbackDiv) {
                    fallbackDiv.style.display = 'flex';
                  }
                }}
              />
              <div className="w-full h-full bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center text-white text-2xl hidden">
                {getGenderIcon(student.gender)}
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold">{student.full_name || 'No Name'}</h1>
              {student.nickname && student.nickname !== student.full_name && (
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                  <UserCircle className="h-4 w-4" />
                  @{student.nickname}
                </p>
              )}
              <div className="flex items-center gap-2 mt-2">
                {student.verified === '1' ? (
                  <Badge className="bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Verified
                  </Badge>
                ) : (
                  <Badge variant="outline">
                    <XCircle className="h-3 w-3 mr-1" />
                    Not Verified
                  </Badge>
                )}
                {student.is_banned === '1' && (
                  <Badge variant="destructive">Banned</Badge>
                )}
                {student.deleted_at && (
                  <Badge variant="secondary">Deleted</Badge>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/requests?student_id=${student.id}`}>
            <Button variant="outline">
              View Requests
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <Mail className="h-4 w-4" />
                    Email
                  </label>
                  <p className="text-sm font-medium mt-1">{student.email || 'Not set'}</p>
                </div>
                {(student.country_code || student.phone_number) && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                      <Phone className="h-4 w-4" />
                      Phone
                    </label>
                    <p className="text-sm font-medium mt-1">
                      {student.country_code || ''}{student.phone_number || ''}
                    </p>
                  </div>
                )}
                {student.gender && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                      <User className="h-4 w-4" />
                      Gender
                    </label>
                    <p className="text-sm font-medium mt-1">
                      {StudentGenderLabel[student.gender as keyof typeof StudentGenderLabel] || student.gender}
                    </p>
                  </div>
                )}
                {student.nationality && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                      <Globe className="h-4 w-4" />
                      Nationality
                    </label>
                    <p className="text-sm font-medium mt-1">{student.nationality}</p>
                  </div>
                )}
                {(student.country || student.city) && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      Location
                    </label>
                    <p className="text-sm font-medium mt-1">
                      {student.city ? `${student.city}, ${student.country || ''}` : (student.country || 'Not set')}
                    </p>
                  </div>
                )}
                {student.sign_in_method && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                      <UserCircle className="h-4 w-4" />
                      Sign-in Method
                    </label>
                    <p className="text-sm font-medium mt-1 capitalize">{student.sign_in_method}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Academic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Academic Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {student.student_level && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                      <BookOpen className="h-4 w-4" />
                      Education Level
                    </label>
                    <p className="text-sm font-medium mt-1">
                      {StudentEducationLevelLabel[student.student_level as keyof typeof StudentEducationLevelLabel] || student.student_level}
                    </p>
                  </div>
                )}
                {(student.majorId || student.otherMajor) && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                      <GraduationCap className="h-4 w-4" />
                      Major
                    </label>
                    <p className="text-sm font-medium mt-1">
                      {student.otherMajor || getMajorName(student.majorId) || `Major ID: ${student.majorId}`}
                    </p>
                  </div>
                )}
              </div>
              {/* Languages Section */}
              {getStudentLanguages(student).length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-1 mb-2">
                    <Languages className="h-4 w-4" />
                    Languages
                  </label>
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
              {/* Sign-in Methods */}
              {student.sign_in_methods && student.sign_in_methods.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-1 mb-2">
                    <UserCircle className="h-4 w-4" />
                    Sign-in Methods
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {student.sign_in_methods.map((method, index) => (
                      <Badge key={index} variant="outline" className="flex items-center gap-1">
                        {getSignInMethodIcon(method)}
                        {getSignInMethodLabel(method)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <BookOpen className="h-4 w-4" />
                    Total Requests
                  </label>
                  <p className="text-2xl font-bold mt-1">{student.request_count || 0}</p>
                </div>
                {student.spend_amount !== undefined && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                      <DollarSign className="h-4 w-4" />
                      Total Spent
                    </label>
                    <p className="text-2xl font-bold text-green-600 mt-1">
                      ${(student.spend_amount || 0).toFixed(2)}
                    </p>
                  </div>
                )}
                {student.rating !== undefined && student.rating > 0 && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                      <Star className="h-4 w-4" />
                      Rating
                    </label>
                    <p className="text-2xl font-bold text-yellow-600 mt-1 flex items-center gap-1">
                      {student.rating.toFixed(1)} ⭐
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Metadata */}
        <div className="space-y-6">
          {/* Account Information */}
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Created At
                </label>
                <p className="text-sm font-medium mt-1">{formatDate(student.created_at)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Updated At
                </label>
                <p className="text-sm font-medium mt-1">{formatDate(student.updated_at)}</p>
              </div>
              {student.deleted_at && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Deleted At
                  </label>
                  <p className="text-sm font-medium mt-1">{formatDate(student.deleted_at)}</p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-muted-foreground">Student ID</label>
                <p className="text-xs font-mono bg-muted p-2 rounded mt-1 break-all">{student.id}</p>
              </div>
              {student.platform && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Platform</label>
                  <p className="text-sm font-medium mt-1 capitalize">{student.platform}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

