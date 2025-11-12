"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GraduationCap, X, Languages } from "lucide-react";
import { StudentFormData } from "../enhanced-student-dialog";
import { StudentEducationLevelEnum, StudentEducationLevelLabel } from "@/types/student";
import { useResourcesManagementStore } from "@/stores/resources-management-store";

const STUDENT_LEVELS: { key: StudentEducationLevelEnum; label: string }[] = [
  { key: StudentEducationLevelEnum.HIGHSCHOOL, label: StudentEducationLevelLabel[StudentEducationLevelEnum.HIGHSCHOOL] },
  { key: StudentEducationLevelEnum.UNIVERSITY, label: StudentEducationLevelLabel[StudentEducationLevelEnum.UNIVERSITY] },
  { key: StudentEducationLevelEnum.MASTER, label: StudentEducationLevelLabel[StudentEducationLevelEnum.MASTER] },
  { key: StudentEducationLevelEnum.PHD, label: StudentEducationLevelLabel[StudentEducationLevelEnum.PHD] },
];

interface AcademicInformationSectionProps {
  readonly formData: StudentFormData;
  readonly onFieldChange: (field: keyof StudentFormData, value: any) => void;
}

export default function AcademicInformationSection({
  formData,
  onFieldChange
}: Readonly<AcademicInformationSectionProps>) {
  const { subjects, languages, fetchSubjects, fetchLanguages } = useResourcesManagementStore();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);
  const [languageSearchTerm, setLanguageSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const languageDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchSubjects();
    fetchLanguages();
  }, [fetchSubjects, fetchLanguages]);

  const filteredSubjects = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return (subjects || []).filter((s) => s.label?.toLowerCase().includes(term));
  }, [subjects, searchTerm]);

  const filteredLanguages = useMemo(() => {
    const term = languageSearchTerm.toLowerCase();
    return (languages || []).filter((lang) => 
      lang.language_name?.toLowerCase().includes(term) ||
      lang.language_code?.toLowerCase().includes(term)
    );
  }, [languages, languageSearchTerm]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (languageDropdownRef.current && !languageDropdownRef.current.contains(event.target as Node)) {
        setIsLanguageDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedSubject = useMemo(() => {
    if (!formData.majorId && formData.majorId != 0) return null;
    // Convert subject id (string) to number for comparison with majorId (number)
    return subjects.find((s) => parseInt(s.id) === formData.majorId) || null;
  }, [subjects, formData.majorId]);

  const handleSelectSubject = (subjectIdStr: string, subjectLabel: string) => {
    const subjectId = parseInt(subjectIdStr);
    onFieldChange('majorId', subjectId);
    // Check if the label is "other" or "others" (case-insensitive)
    const normalizedLabel = subjectLabel.toLowerCase().trim();
    if (normalizedLabel === 'other' || normalizedLabel === 'others') {
      // Keep current otherMajor value or set to empty string for user input
      if (!formData.otherMajor) {
        onFieldChange('otherMajor', '');
      }
    } else {
      // Clear otherMajor when a specific major is selected
      onFieldChange('otherMajor', null);
    }
    setIsDropdownOpen(false);
    setSearchTerm("");
  };

  const handleToggleLanguage = (languageId: number) => {
    const currentLanguages = formData.languages || [];
    if (currentLanguages.includes(languageId)) {
      // Remove language
      onFieldChange('languages', currentLanguages.filter(id => id !== languageId));
    } else {
      // Add language
      onFieldChange('languages', [...currentLanguages, languageId]);
    }
  };

  const handleRemoveLanguage = (languageId: number) => {
    const currentLanguages = formData.languages || [];
    onFieldChange('languages', currentLanguages.filter(id => id !== languageId));
  };

  const selectedLanguages = useMemo(() => {
    const languageIds = formData.languages || [];
    return languages.filter(lang => languageIds.includes(parseInt(lang.id)));
  }, [languages, formData.languages]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <GraduationCap className="h-4 w-4" />
          Academic Information
        </CardTitle>
        <CardDescription className="text-xs">Level and field of study.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="student_level" className="text-sm font-medium">Student Level</Label>
            <Select
              value={formData.student_level || undefined}
              onValueChange={(value) => onFieldChange('student_level', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select level" />
              </SelectTrigger>
              <SelectContent>
                {STUDENT_LEVELS.map(({ key, label }) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="majorId" className="text-sm font-medium">Major (Subject)</Label>
            <div className="relative" ref={dropdownRef}>
              <Input
                id="majorId"
                value={selectedSubject ? selectedSubject.label : searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setIsDropdownOpen(true);
                  // Clear both fields when input is cleared
                  if (!e.target.value) {
                    onFieldChange('majorId', null);
                    onFieldChange('otherMajor', null);
                  }
                }}
                onFocus={() => setIsDropdownOpen(true)}
                placeholder="Search and select subject..."
              />
              {isDropdownOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                  {filteredSubjects.length > 0 ? (
                    filteredSubjects.map((subject) => (
                      <button
                        key={subject.id}
                        type="button"
                        className="w-full px-4 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                        onClick={() => handleSelectSubject(subject.id, subject.label)}
                      >
                        {subject.label}
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-2 text-muted-foreground text-sm">No subjects found</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Show custom major input if selected major label is "other" or "others" */}
        {selectedSubject && (selectedSubject.label.toLowerCase().trim() === 'other' || selectedSubject.label.toLowerCase().trim() === 'others') && (
          <div>
            <Label htmlFor="otherMajor" className="text-sm font-medium">
              Specify Other Major *
            </Label>
            <Input
              id="otherMajor"
              value={formData.otherMajor || ''}
              onChange={(e) => onFieldChange('otherMajor', e.target.value || null)}
              placeholder="Enter custom major..."
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Required when "Other" major is selected
            </p>
          </div>
        )}

        {/* Languages Selection */}
        <div>
          <Label htmlFor="languages" className="text-sm font-medium flex items-center gap-2">
            <Languages className="h-4 w-4" />
            Languages
          </Label>
          <div className="relative" ref={languageDropdownRef}>
            <Input
              id="languages"
              value={languageSearchTerm}
              onChange={(e) => {
                setLanguageSearchTerm(e.target.value);
                setIsLanguageDropdownOpen(true);
              }}
              onFocus={() => setIsLanguageDropdownOpen(true)}
              placeholder="Search and select languages..."
            />
            {isLanguageDropdownOpen && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                {filteredLanguages.length > 0 ? (
                  filteredLanguages.map((language) => {
                    const isSelected = (formData.languages || []).includes(parseInt(language.id));
                    return (
                      <button
                        key={language.id}
                        type="button"
                        className={`w-full px-4 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none flex items-center justify-between ${
                          isSelected ? 'bg-blue-50' : ''
                        }`}
                        onClick={() => {
                          handleToggleLanguage(parseInt(language.id));
                          setLanguageSearchTerm("");
                        }}
                      >
                        <span>{language.language_name} ({language.language_code})</span>
                        {isSelected && <span className="text-blue-600">✓</span>}
                      </button>
                    );
                  })
                ) : (
                  <div className="px-4 py-2 text-muted-foreground text-sm">No languages found</div>
                )}
              </div>
            )}
          </div>
          
          {/* Selected Languages */}
          {selectedLanguages.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {selectedLanguages.map((language) => (
                <Badge
                  key={language.id}
                  variant="secondary"
                  className="flex items-center gap-1"
                >
                  {language.language_name}
                  <button
                    type="button"
                    onClick={() => handleRemoveLanguage(parseInt(language.id))}
                    className="ml-1 hover:text-red-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
