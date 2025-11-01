'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Request } from '@/types/request';
import { Tutor } from '@/types/tutor';
import { UserPlus, DollarSign } from 'lucide-react';

interface AssignmentManagementProps {
  request: Request;
  onAssignTutor: (tutorId: string, tutorPrice: string) => void;
  onSetPrices: (tutorPrice?: string, studentPrice?: string) => void;
  loading: boolean;
}

function TutorSearchComponent({ 
  onSelectTutor, 
  selectedTutorId,
  currentTutorId 
}: { 
  onSelectTutor: (tutor: Tutor) => void;
  selectedTutorId?: string;
  currentTutorId?: string;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Tutor[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [currentTutor, setCurrentTutor] = useState<Tutor | null>(null);
  const [loadingCurrentTutor, setLoadingCurrentTutor] = useState(false);

  // Fetch currently assigned tutor
  useEffect(() => {
    const fetchCurrentTutor = async () => {
      if (!currentTutorId) {
        setCurrentTutor(null);
        return;
      }

      setLoadingCurrentTutor(true);
      try {
        const response = await fetch(`/api/tutors/${currentTutorId}`);
        const data = await response.json();
        
        if (data.success) {
          setCurrentTutor(data.tutor);
        } else {
          setCurrentTutor(null);
        }
      } catch (error) {
        console.error('Error fetching current tutor:', error);
        setCurrentTutor(null);
      } finally {
        setLoadingCurrentTutor(false);
      }
    };

    fetchCurrentTutor();
  }, [currentTutorId]);

  const searchTutors = useCallback(async (email: string) => {
    if (!email || email.length < 3) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/tutors/search?email=${encodeURIComponent(email)}`);
      const data = await response.json();
      
      if (data.success) {
        setSearchResults(data.tutors);
        setShowResults(true);
      } else {
        setSearchResults([]);
        setShowResults(false);
      }
    } catch (error) {
      console.error('Error searching tutors:', error);
      setSearchResults([]);
      setShowResults(false);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchTutors(searchTerm);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, searchTutors]);

  const handleTutorSelect = (tutor: Tutor) => {
    onSelectTutor(tutor);
    setSearchTerm(tutor.email);
    setShowResults(false);
  };

  return (
    <div className="relative">
      <div className="space-y-2">
        <Label>Search Tutor by Email</Label>
        <div className="relative">
          <Input
            placeholder="Enter tutor email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => searchResults.length > 0 && setShowResults(true)}
          />
          {isSearching && (
            <div className="absolute right-3 top-3">
              <LoadingSpinner />
            </div>
          )}
        </div>
      </div>

      {/* Currently Assigned Tutor */}
      {currentTutor && (
        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-blue-800">Currently Assigned:</span>
                <Badge variant="default" className="bg-blue-100 text-blue-800">
                  Assigned
                </Badge>
              </div>
              <div className="font-medium mt-1">{currentTutor.full_name}</div>
              <div className="text-sm text-muted-foreground">{currentTutor.email}</div>
              {currentTutor.country && (
                <div className="text-xs text-muted-foreground">{currentTutor.country}</div>
              )}
            </div>
            <Badge variant={currentTutor.verified === '2' ? 'default' : 'secondary'}>
              {currentTutor.verified === '2' ? 'Verified' : 'Unverified'}
            </Badge>
          </div>
        </div>
      )}

      {loadingCurrentTutor && (
        <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-md">
          <div className="flex items-center gap-2">
            <LoadingSpinner />
            <span className="text-sm text-muted-foreground">Loading current tutor...</span>
          </div>
        </div>
      )}

      {showResults && searchResults.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {searchResults.map((tutor) => (
            <div
              key={tutor.id}
              className={`p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0 ${
                tutor.id === currentTutorId ? 'bg-blue-50 border-blue-200' : ''
              }`}
              onClick={() => handleTutorSelect(tutor)}
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="font-medium">{tutor.full_name}</div>
                    {tutor.id === currentTutorId && (
                      <Badge variant="default" className="bg-blue-100 text-blue-800 text-xs">
                        Current
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">{tutor.email}</div>
                  {tutor.country && (
                    <div className="text-xs text-muted-foreground">{tutor.country}</div>
                  )}
                </div>
                <Badge variant={tutor.verified === '2' ? 'default' : 'secondary'}>
                  {tutor.verified === '2' ? 'Verified' : 'Unverified'}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}

      {showResults && searchResults.length === 0 && searchTerm.length >= 3 && !isSearching && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg p-3">
          <div className="text-sm text-muted-foreground">No tutors found with that email</div>
        </div>
      )}
    </div>
  );
}

export function AssignmentManagement({ 
  request, 
  onAssignTutor, 
  onSetPrices, 
  loading 
}: AssignmentManagementProps) {
  const [selectedTutor, setSelectedTutor] = useState<Tutor | null>(null);
  const [tutorPrice, setTutorPrice] = useState(request.tutor_price || '');
  const [studentPrice, setStudentPrice] = useState(request.student_price || '');

  const handleTutorSelect = (tutor: Tutor) => {
    setSelectedTutor(tutor);
  };

  const handleAssignTutor = () => {
    if (selectedTutor && tutorPrice) {
      onAssignTutor(selectedTutor.id, tutorPrice);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        <TutorSearchComponent 
          onSelectTutor={handleTutorSelect}
          selectedTutorId={request.tutor_id}
          currentTutorId={request.tutor_id}
        />
        
        {selectedTutor && (
          <div className="p-3 bg-gray-50 rounded-md">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-medium">{selectedTutor.full_name}</div>
                <div className="text-sm text-muted-foreground">{selectedTutor.email}</div>
                {selectedTutor.country && (
                  <div className="text-xs text-muted-foreground">{selectedTutor.country}</div>
                )}
              </div>
              <Badge variant={selectedTutor.verified === '2' ? 'default' : 'secondary'}>
                {selectedTutor.verified === '2' ? 'Verified' : 'Unverified'}
              </Badge>
            </div>
          </div>
        )}
        
        <div className="flex gap-2">
          <Input
            placeholder="Tutor Price"
            value={tutorPrice}
            onChange={(e) => setTutorPrice(e.target.value)}
            type="number"
          />
          <Button
            onClick={handleAssignTutor}
            disabled={loading || !selectedTutor || !tutorPrice}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Assign Tutor
          </Button>
        </div>
      </div>
      
      <div className="space-y-2">
        <Label>Price Management</Label>
        <div className="flex gap-2">
          <Input
            placeholder="Student Price"
            value={studentPrice}
            onChange={(e) => setStudentPrice(e.target.value)}
            type="number"
          />
          <Button
            onClick={() => onSetPrices(tutorPrice, studentPrice)}
            disabled={loading}
          >
            <DollarSign className="h-4 w-4 mr-2" />
            Update Prices
          </Button>
        </div>
      </div>
    </div>
  );
}
