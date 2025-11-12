'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Request } from '@/types/request';
import { Tutor } from '@/types/tutor';
import { UserPlus, AlertCircle } from 'lucide-react';
import { calculateStudentPrice, calculateTutorOfferPrice, getEffectiveStudentPrice } from '@/lib/pricing-utils';

interface AssignmentManagementProps {
  request: Request;
  onAssignTutor: (tutorId: string, tutorPrice: string, studentPrice?: string, minPrice?: string) => void;
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
  loading 
}: AssignmentManagementProps) {
  const [selectedTutor, setSelectedTutor] = useState<Tutor | null>(null);
  const [tutorPrice, setTutorPrice] = useState(request.tutor_price || '');
  const [studentPrice, setStudentPrice] = useState(request.student_price || '');
  const [minPrice, setMinPrice] = useState(request.min_price || '');

  // Calculate effective student price for display
  const effectivePrice = getEffectiveStudentPrice({
    student_price: studentPrice || request.student_price,
    tutor_price: tutorPrice || request.tutor_price,
    country: request.country,
    min_price: minPrice || request.min_price
  });

  // Calculate preview price when tutor price changes
  const previewPrice = tutorPrice 
    ? calculateStudentPrice({
        student_price: studentPrice || null, // Use manual override if set
        tutor_price: tutorPrice,
        country: request.country,
        min_price: minPrice || request.min_price || null
      })
    : effectivePrice.price;

  const handleTutorSelect = (tutor: Tutor) => {
    setSelectedTutor(tutor);
  };

  const handleUpdatePrices = () => {
    if (selectedTutor && tutorPrice) {
      // Calculate student_price when assigning tutor (if not manually overridden)
      const calculatedStudentPrice = studentPrice 
        ? studentPrice 
        : calculateStudentPrice({
            student_price: null,
            tutor_price: tutorPrice,
            country: request.country,
            min_price: minPrice || null
          });
      
      // Pass tutor_price, student_price, and min_price all at once
      onAssignTutor(
        selectedTutor.id, 
        tutorPrice, 
        calculatedStudentPrice || undefined,
        minPrice || undefined
      );
    } else if (tutorPrice) {
      // If no tutor selected, just update prices for existing tutor
      const calculatedStudentPrice = studentPrice 
        ? studentPrice 
        : calculateStudentPrice({
            student_price: null,
            tutor_price: tutorPrice,
            country: request.country,
            min_price: minPrice || null
          });
      
      onAssignTutor(
        request.tutor_id || '', 
        tutorPrice, 
        calculatedStudentPrice || undefined,
        minPrice || undefined
      );
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
        
        <div className="space-y-4 border-t pt-4">
          <div className="space-y-2">
            <Label>Tutor Price (What tutor receives)</Label>
            <Input
              placeholder="Enter tutor price..."
              value={tutorPrice}
              onChange={(e) => setTutorPrice(e.target.value)}
              type="number"
              step="0.01"
              min="0"
            />
            {tutorPrice && (
              <div className="text-sm text-muted-foreground">
                Calculated student price: <span className="font-semibold text-green-600">${previewPrice}</span>
                {request.country && (
                  <span className="ml-2 text-xs">
                    (Multiplier: {request.country.toUpperCase() === 'LEBANON' ? '×2' : '×3'})
                  </span>
                )}
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <Label>Student Price (Optional - Leave empty for auto-calculation)</Label>
            <Input
              placeholder="Leave empty for auto-calculation"
              value={studentPrice}
              onChange={(e) => setStudentPrice(e.target.value)}
              type="number"
              step="0.01"
              min="0"
            />
            <p className="text-xs text-muted-foreground">
              Setting this will override all calculations. Leave empty to use calculated price.
            </p>
          </div>
          
          <div className="space-y-2">
            <Label>Minimum Price (Optional)</Label>
            <Input
              placeholder="Enter minimum price..."
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              type="number"
              step="0.01"
              min="0"
            />
            <p className="text-xs text-muted-foreground">
              Minimum price that will be enforced for student price calculation.
            </p>
          </div>
          
          <div>
            <Label className="text-sm text-muted-foreground">Current Effective Student Price</Label>
            <div className="p-2 bg-gray-50 rounded-md">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-lg">${effectivePrice.price}</span>
                {effectivePrice.isOverride && (
                  <Badge variant="outline" className="text-xs">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Override
                  </Badge>
                )}
                {effectivePrice.isCalculated && (
                  <Badge variant="secondary" className="text-xs">
                    Calculated
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
        
        <Button
          onClick={handleUpdatePrices}
          disabled={loading || (!selectedTutor && !request.tutor_id) || !tutorPrice}
          className="w-full"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          {selectedTutor || request.tutor_id ? 'Update Prices & Assign Tutor' : 'Update Prices'}
        </Button>
      </div>
    </div>
  );
}
