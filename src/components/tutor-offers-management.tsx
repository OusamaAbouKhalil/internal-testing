'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Request } from '@/types/request';
import { useRequestManagementStore } from '@/stores/request-management-store';

interface TutorOffersManagementProps {
  request: Request;
  offers: any[];
  loading: boolean;
}

export function TutorOffersManagement({ 
  request, 
  offers, 
  loading 
}: TutorOffersManagementProps) {
  const { acceptTutorOffer, rejectTutorOffer } = useRequestManagementStore();
  const [tutorDetails, setTutorDetails] = useState<{[key: string]: {email: string; nickname: string}}>({});
  const [loadingTutors, setLoadingTutors] = useState<{[key: string]: boolean}>({});

  const handleAcceptOffer = async (offerId: string) => {
    try {
      await acceptTutorOffer(offerId, request.id);
    } catch (error) {
      console.error('Error accepting offer:', error);
    }
  };

  const handleRejectOffer = async (offerId: string) => {
    try {
      await rejectTutorOffer(offerId, request.id);
    } catch (error) {
      console.error('Error rejecting offer:', error);
    }
  };

  const getRequestStatusColor = (status: string): string => {
    switch (status?.toLowerCase()) {
      case 'new':
      case 'pending':
        return 'bg-muted text-foreground';
      case 'pending_payment':
        return 'bg-blue-100 text-blue-800';
      case 'ongoing':
        return 'bg-purple-100 text-purple-800';
      case 'tutor_completed':
        return 'bg-cyan-100 text-cyan-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-muted text-foreground';
    }
  };

  // Fetch tutor details for each offer
  useEffect(() => {
    const fetchTutorDetails = async () => {
      const tutorIds = offers.map(offer => offer.tutor_id).filter(Boolean);
      const uniqueTutorIds = [...new Set(tutorIds)];
      
      for (const tutorId of uniqueTutorIds) {
        if (!tutorDetails[tutorId] && !loadingTutors[tutorId]) {
          setLoadingTutors(prev => ({ ...prev, [tutorId]: true }));
          
          try {
            const response = await fetch(`/api/tutors/${tutorId}`);
            const data = await response.json();
            
            if (data.success) {
              setTutorDetails(prev => ({
                ...prev,
                [tutorId]: {
                  email: data.tutor.email || 'N/A',
                  nickname: data.tutor.nickname || 'N/A'
                }
              }));
            }
          } catch (error) {
            console.error(`Error fetching tutor ${tutorId}:`, error);
          } finally {
            setLoadingTutors(prev => ({ ...prev, [tutorId]: false }));
          }
        }
      }
    };

    if (offers.length > 0) {
      fetchTutorDetails();
    }
  }, [offers, tutorDetails, loadingTutors]);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Tutor Offers</h3>
        <Badge variant="outline">{offers.length} offers</Badge>
      </div>
      
      {offers.length === 0 ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No tutor offers available for this request.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-2">
          {offers.map((offer) => {
            const tutorInfo = tutorDetails[offer.tutor_id];
            const isLoadingTutor = loadingTutors[offer.tutor_id];
            
            return (
              <Card key={offer.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      {isLoadingTutor ? (
                        <div className="flex items-center gap-2">
                          <LoadingSpinner size="sm" />
                          <span>Loading tutor info...</span>
                        </div>
                      ) : tutorInfo ? (
                        <div>
                          <div className="font-medium">{tutorInfo.nickname}</div>
                          <div className="text-sm text-muted-foreground">{tutorInfo.email}</div>
                        </div>
                      ) : (
                        <div className="font-medium">Tutor ID: {offer.tutor_id}</div>
                      )}
                      <div className="text-sm text-muted-foreground mt-1">Price: ${offer.price}</div>
                      <Badge className={getRequestStatusColor(offer.status)}>
                        {offer.status}
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleAcceptOffer(offer.id)}
                        disabled={loading || offer.status === 'ACCEPTED'}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleRejectOffer(offer.id)}
                        disabled={loading || offer.status === 'rejected'}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
