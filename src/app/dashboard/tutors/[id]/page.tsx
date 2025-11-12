'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Tutor } from '@/types/tutor';
import { TutorGenderLabel, TutorDegreeLabel } from '@/types/tutor';
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
  Star,
  UserCircle,
  CheckCircle,
  XCircle,
  Award,
  Briefcase,
  FileText,
  MessageCircle
} from 'lucide-react';
import { getImageUrl } from '@/lib/file-upload';
import Link from 'next/link';
import { useResourcesManagementStore } from '@/stores/resources-management-store';

export default function TutorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tutorId = params.id as string;

  const [tutor, setTutor] = useState<Tutor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { languages, subjects, fetchAllResources } = useResourcesManagementStore();

  // Fetch resources
  useEffect(() => {
    fetchAllResources();
  }, [fetchAllResources]);

  // Fetch the specific tutor directly by ID
  useEffect(() => {
    if (!tutorId) return;

    const fetchTutor = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/tutors/${tutorId}`);
        const data = await response.json();
        
        if (response.ok && data.success && data.tutor) {
          // Convert Firestore timestamps if needed
          const convertedTutor = {
            ...data.tutor,
            created_at: data.tutor.created_at?._seconds 
              ? new Date(data.tutor.created_at._seconds * 1000).toISOString()
              : data.tutor.created_at,
            updated_at: data.tutor.updated_at?._seconds
              ? new Date(data.tutor.updated_at._seconds * 1000).toISOString()
              : data.tutor.updated_at,
            deleted_at: data.tutor.deleted_at?._seconds
              ? new Date(data.tutor.deleted_at._seconds * 1000).toISOString()
              : data.tutor.deleted_at,
          };
          setTutor(convertedTutor as Tutor);
        } else {
          setError(data.error || 'Tutor not found');
        }
      } catch (error) {
        console.error('Error fetching tutor:', error);
        setError('Failed to fetch tutor');
      } finally {
        setLoading(false);
      }
    };

    fetchTutor();
  }, [tutorId]);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !tutor) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || 'Tutor not found'}</AlertDescription>
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
                src={getImageUrl(tutor.profile_image || '')} 
                alt={tutor.full_name || 'Tutor'} 
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
              <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl hidden">
                <GraduationCap className="h-8 w-8" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold">{tutor.full_name || 'No Name'}</h1>
              {tutor.nickname && tutor.nickname !== tutor.full_name && (
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                  <UserCircle className="h-4 w-4" />
                  @{tutor.nickname}
                </p>
              )}
              <div className="flex items-center gap-2 mt-2">
                {tutor.verified === '2' ? (
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
                {tutor.cancelled === '1' && (
                  <Badge variant="destructive">Cancelled</Badge>
                )}
                {tutor.deleted_at && (
                  <Badge variant="secondary">Deleted</Badge>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/requests?tutor_id=${tutor.id}`}>
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
                  <p className="text-sm font-medium mt-1">{tutor.email || 'Not set'}</p>
                </div>
                {(tutor.phone_country_code || tutor.phone) && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                      <Phone className="h-4 w-4" />
                      Phone
                    </label>
                    <p className="text-sm font-medium mt-1">
                      {tutor.phone_country_code || ''}{tutor.phone || ''}
                    </p>
                  </div>
                )}
                {(tutor.whatsapp_country_code || tutor.whatsapp_phone) && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                      <MessageCircle className="h-4 w-4" />
                      WhatsApp
                    </label>
                    <p className="text-sm font-medium mt-1">
                      {tutor.whatsapp_country_code || ''}{tutor.whatsapp_phone || ''}
                    </p>
                  </div>
                )}
                {tutor.gender && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                      <User className="h-4 w-4" />
                      Gender
                    </label>
                    <p className="text-sm font-medium mt-1">
                      {TutorGenderLabel[tutor.gender as keyof typeof TutorGenderLabel] || tutor.gender}
                    </p>
                  </div>
                )}
                {tutor.nationality && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                      <Globe className="h-4 w-4" />
                      Nationality
                    </label>
                    <p className="text-sm font-medium mt-1">{tutor.nationality}</p>
                  </div>
                )}
                {(tutor.country || tutor.city) && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      Location
                    </label>
                    <p className="text-sm font-medium mt-1">
                      {tutor.city ? `${tutor.city}, ${tutor.country || ''}` : (tutor.country || 'Not set')}
                    </p>
                  </div>
                )}
                {tutor.date_of_birth && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Date of Birth
                    </label>
                    <p className="text-sm font-medium mt-1">{formatDate(tutor.date_of_birth)}</p>
                  </div>
                )}
              </div>
              {tutor.bio && (
                <div className="mt-4">
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    Bio
                  </label>
                  <p className="text-sm mt-1 whitespace-pre-wrap">{tutor.bio}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Academic & Professional Information */}
          <Card>
            <CardHeader>
              <CardTitle>Academic & Professional Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tutor.degree && tutor.degree.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                      <Award className="h-4 w-4" />
                      Degrees
                    </label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {tutor.degree.map((deg, idx) => (
                        <Badge key={idx} variant="outline">
                          {TutorDegreeLabel[deg as keyof typeof TutorDegreeLabel] || deg}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {tutor.university && tutor.university.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                      <GraduationCap className="h-4 w-4" />
                      Universities
                    </label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {tutor.university.map((uni, idx) => (
                        <Badge key={idx} variant="outline">{uni}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {tutor.another_university && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                      <GraduationCap className="h-4 w-4" />
                      Other University
                    </label>
                    <p className="text-sm font-medium mt-1">{tutor.another_university}</p>
                  </div>
                )}
                {tutor.another_degree && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                      <Award className="h-4 w-4" />
                      Other Degree
                    </label>
                    <p className="text-sm font-medium mt-1">{tutor.another_degree}</p>
                  </div>
                )}
                {tutor.experience_years !== undefined && tutor.experience_years !== null && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                      <Briefcase className="h-4 w-4" />
                      Experience Years
                    </label>
                    <p className="text-sm font-medium mt-1">{tutor.experience_years} years</p>
                  </div>
                )}
              </div>
              {tutor.cover_letter && (
                <div className="mt-4">
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    Cover Letter
                  </label>
                  <p className="text-sm mt-1 whitespace-pre-wrap">{tutor.cover_letter}</p>
                </div>
              )}
              {/* Languages Section */}
              {tutor.languages && tutor.languages.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-1 mb-2">
                    <Languages className="h-4 w-4" />
                    Languages
                  </label>
                  <div className="flex flex-wrap gap-2">
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
            </CardContent>
          </Card>

          {/* Skills & Subjects */}
          {(tutor.skills?.length || tutor.subjects?.length || (Array.isArray(tutor.majorId) && tutor.majorId.length > 0) || tutor.major) && (
            <Card>
              <CardHeader>
                <CardTitle>Skills & Subjects</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Skills */}
                  {tutor.skills && tutor.skills.length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground flex items-center gap-1 mb-2">
                        <Award className="h-4 w-4" />
                        Skills
                      </label>
                      <div className="flex flex-wrap gap-2">
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
                      <label className="text-sm font-medium text-muted-foreground flex items-center gap-1 mb-2">
                        <BookOpen className="h-4 w-4" />
                        Teaching Subjects
                      </label>
                      <div className="flex flex-wrap gap-2">
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
                      <label className="text-sm font-medium text-muted-foreground flex items-center gap-1 mb-2">
                        <GraduationCap className="h-4 w-4" />
                        Majors
                      </label>
                      <div className="flex flex-wrap gap-2">
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
              </CardContent>
            </Card>
          )}

          {/* Education & Certifications */}
          {tutor.degree && tutor.degree.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Education & Certifications</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {tutor.degree.map((degree, index) => (
                    <div key={index} className="bg-muted p-4 rounded-lg border">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                              {TutorDegreeLabel[degree as keyof typeof TutorDegreeLabel] || degree}
                            </Badge>
                          </div>
                          {Array.isArray(tutor.university) && tutor.university[index] && (
                            <p className="text-sm font-medium text-foreground mb-2">
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
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ID Documents */}
          {Array.isArray(tutor.id_file_link) && tutor.id_file_link.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>ID Documents</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {tutor.id_file_link.map((link, idx) => (
                    <div key={idx} className="bg-muted p-3 rounded-lg border">
                      <div className="flex items-center gap-2">
                        <a
                          href={getImageUrl(link)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          <FileText className="h-4 w-4" />
                          {`ID File ${idx + 1}`}
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <BookOpen className="h-4 w-4" />
                    Total Requests
                  </label>
                  <p className="text-2xl font-bold mt-1">{tutor.request_count || 0}</p>
                </div>
                {tutor.rating !== undefined && tutor.rating > 0 && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                      <Star className="h-4 w-4" />
                      Rating
                    </label>
                    <p className="text-2xl font-bold text-yellow-600 mt-1 flex items-center gap-1">
                      {tutor.rating.toFixed(1)} ⭐
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
                <p className="text-sm font-medium mt-1">{formatDate(tutor.created_at as string)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Updated At
                </label>
                <p className="text-sm font-medium mt-1">{formatDate(tutor.updated_at as string)}</p>
              </div>
              {tutor.deleted_at && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Deleted At
                  </label>
                  <p className="text-sm font-medium mt-1">{formatDate(tutor.deleted_at)}</p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-muted-foreground">Tutor ID</label>
                <p className="text-xs font-mono bg-muted p-2 rounded mt-1 break-all">{tutor.id}</p>
              </div>
              {tutor.platform && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Platform</label>
                  <p className="text-sm font-medium mt-1 capitalize">{tutor.platform}</p>
                </div>
              )}
              {tutor.send_notifications === '1' && (
                <div>
                  <Badge className="bg-blue-100 text-blue-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Notifications Enabled
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

