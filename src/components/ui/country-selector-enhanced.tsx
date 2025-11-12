"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Country {
  label: string;
  value: string;
  icon: string;
  countryCode: string;
  iso: string;
  capital: string;
}

interface CountrySelectorEnhancedProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  showSearch?: boolean;
  disabled?: boolean;
}

export function CountrySelectorEnhanced({
  value,
  onChange,
  label = "Country",
  placeholder = "Select country",
  showSearch = true,
  disabled = false,
}: CountrySelectorEnhancedProps) {
  const [countries, setCountries] = useState<Country[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load countries from JSON file
    fetch('/countries.json')
      .then(response => response.json())
      .then(data => {
        setCountries(data);
        setLoading(false);
      })
      .catch(error => {
        console.error('Failed to load countries:', error);
        setLoading(false);
      });
  }, []);

  const filteredCountries = useMemo(() => {
    if (!searchTerm) return countries;
    
    const term = searchTerm.toLowerCase();
    return countries.filter(country =>
      country.label.toLowerCase().includes(term) ||
      country.countryCode.includes(term) ||
      country.iso.toLowerCase().includes(term)
    );
  }, [countries, searchTerm]);

  if (loading) {
    return (
      <div>
        {label && <Label>{label}</Label>}
        <Select disabled>
          <SelectTrigger>
            <SelectValue placeholder="Loading countries..." />
          </SelectTrigger>
        </Select>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {showSearch && (
            <div className="p-2 border-b sticky top-0 bg-white z-10">
              <Input
                placeholder="Search countries..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-8"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}
          <div className="max-h-[300px] overflow-y-auto">
            {filteredCountries.length > 0 ? (
              filteredCountries.map((country) => (
                <SelectItem key={country.iso} value={country.value}>
                  <div className="flex items-center gap-2">
                    <img 
                      src={country.icon} 
                      alt={country.label}
                      className="w-5 h-4 object-cover rounded"
                      onError={(e) => {
                        // Hide broken images
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    <span>{country.label}</span>
                    <span className="text-xs text-muted-foreground">({country.countryCode})</span>
                  </div>
                </SelectItem>
              ))
            ) : (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No countries found
              </div>
            )}
          </div>
        </SelectContent>
      </Select>
    </div>
  );
}

