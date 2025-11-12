"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Search, MapPin, Phone } from "lucide-react";

interface Country {
  label: string;
  value: string;
  icon: string;
  countryCode: string;
  iso: string;
  capital: string;
}

interface CountrySelectorProps {
  value?: string;
  onChange: (country: Country | null) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  className?: string;
}

export function CountrySelector({
  value,
  onChange,
  placeholder = "Search and select a country...",
  label = "Country",
  required = false,
  className = ""
}: CountrySelectorProps) {
  const [countries, setCountries] = useState<Country[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load countries data
  useEffect(() => {
    const loadCountries = async () => {
      try {
        const response = await fetch('/countries.json');
        const data = await response.json();
        setCountries(data);
        setLoading(false);
      } catch (error) {
        console.error('Error loading countries:', error);
        setLoading(false);
      }
    };

    loadCountries();
  }, []);

  // Find selected country
  const selectedCountry = countries.find(country => country.value === value);

  // Filter countries based on search term
  const filteredCountries = countries.filter(country =>
    country.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    country.iso.toLowerCase().includes(searchTerm.toLowerCase()) ||
    country.capital.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle country selection
  const handleCountrySelect = (country: Country) => {
    onChange(country);
    setIsDropdownOpen(false);
    setSearchTerm('');
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Clear selection
  const handleClear = () => {
    onChange(null);
    setSearchTerm('');
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <Label htmlFor="country-selector">{label}</Label>
      <div className="relative" ref={dropdownRef}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="country-selector"
            value={selectedCountry ? selectedCountry.label : searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setIsDropdownOpen(true);
              if (!e.target.value) {
                onChange(null);
              }
            }}
            onFocus={() => setIsDropdownOpen(true)}
            placeholder={placeholder}
            required={required}
            className="pl-10 pr-10"
          />
          {selectedCountry && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
              onClick={handleClear}
            >
              ×
            </Button>
          )}
        </div>
        
        {isDropdownOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
            {loading ? (
              <div className="px-4 py-2 text-muted-foreground text-sm">Loading countries...</div>
            ) : filteredCountries.length > 0 ? (
              filteredCountries.map((country) => (
                <button
                  key={country.iso}
                  type="button"
                  className="w-full px-4 py-3 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none border-b border-gray-100 last:border-b-0"
                  onClick={() => handleCountrySelect(country)}
                >
                  <div className="flex items-center space-x-3">
                    <img
                      src={country.icon}
                      alt={country.label}
                      className="w-6 h-4 object-cover rounded-sm"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-foreground truncate">
                          {country.label}
                        </span>
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                          <span className="flex items-center">
                            <Phone className="h-3 w-3 mr-1" />
                            {country.countryCode}
                          </span>
                          <span className="flex items-center">
                            <MapPin className="h-3 w-3 mr-1" />
                            {country.iso}
                          </span>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground truncate">
                        Capital: {country.capital}
                      </div>
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div className="px-4 py-2 text-muted-foreground text-sm">
                No countries found
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Display selected country details */}
      {selectedCountry && (
        <div className="mt-2 p-3 bg-gray-50 rounded-md">
          <div className="flex items-center space-x-3">
            <img
              src={selectedCountry.icon}
              alt={selectedCountry.label}
              className="w-8 h-6 object-cover rounded-sm"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <div className="flex-1">
              <div className="font-medium text-foreground">{selectedCountry.label}</div>
              <div className="text-sm text-muted-foreground">
                {selectedCountry.capital} • {selectedCountry.countryCode} • {selectedCountry.iso}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper function to get country by value
export const getCountryByValue = (countries: Country[], value: string): Country | undefined => {
  return countries.find(country => country.value === value);
};

// Helper function to get country by ISO code
export const getCountryByISO = (countries: Country[], iso: string): Country | undefined => {
  return countries.find(country => country.iso.toLowerCase() === iso.toLowerCase());
};

// Helper function to get country by country code
export const getCountryByCountryCode = (countries: Country[], countryCode: string): Country | undefined => {
  return countries.find(country => country.countryCode === countryCode);
};
