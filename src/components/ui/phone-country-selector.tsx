"use client";

import React, { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

// Common country codes
const COUNTRY_CODES = [
  { code: "+1", country: "US/CA", flag: "🇺🇸" },
  { code: "+20", country: "Egypt", flag: "🇪🇬" },
  { code: "+44", country: "UK", flag: "🇬🇧" },
  { code: "+49", country: "Germany", flag: "🇩🇪" },
  { code: "+61", country: "Australia", flag: "🇦🇺" },
  { code: "+86", country: "China", flag: "🇨🇳" },
  { code: "+90", country: "Turkey", flag: "🇹🇷" },
  { code: "+91", country: "India", flag: "🇮🇳" },
  { code: "+92", country: "Pakistan", flag: "🇵🇰" },
  { code: "+93", country: "Afghanistan", flag: "🇦🇫" },
  { code: "+94", country: "Sri Lanka", flag: "🇱🇰" },
  { code: "+95", country: "Myanmar", flag: "🇲🇲" },
  { code: "+98", country: "Iran", flag: "🇮🇷" },
  { code: "+212", country: "Morocco", flag: "🇲🇦" },
  { code: "+213", country: "Algeria", flag: "🇩🇿" },
  { code: "+216", country: "Tunisia", flag: "🇹🇳" },
  { code: "+218", country: "Libya", flag: "🇱🇾" },
  { code: "+220", country: "Gambia", flag: "🇬🇲" },
  { code: "+221", country: "Senegal", flag: "🇸🇳" },
  { code: "+222", country: "Mauritania", flag: "🇲🇷" },
  { code: "+223", country: "Mali", flag: "🇲🇱" },
  { code: "+224", country: "Guinea", flag: "🇬🇳" },
  { code: "+225", country: "Ivory Coast", flag: "🇨🇮" },
  { code: "+226", country: "Burkina Faso", flag: "🇧🇫" },
  { code: "+227", country: "Niger", flag: "🇳🇪" },
  { code: "+228", country: "Togo", flag: "🇹🇬" },
  { code: "+229", country: "Benin", flag: "🇧🇯" },
  { code: "+230", country: "Mauritius", flag: "🇲🇺" },
  { code: "+231", country: "Liberia", flag: "🇱🇷" },
  { code: "+232", country: "Sierra Leone", flag: "🇸🇱" },
  { code: "+233", country: "Ghana", flag: "🇬🇭" },
  { code: "+234", country: "Nigeria", flag: "🇳🇬" },
  { code: "+235", country: "Chad", flag: "🇹🇩" },
  { code: "+236", country: "CAR", flag: "🇨🇫" },
  { code: "+237", country: "Cameroon", flag: "🇨🇲" },
  { code: "+238", country: "Cape Verde", flag: "🇨🇻" },
  { code: "+239", country: "Sao Tome", flag: "🇸🇹" },
  { code: "+240", country: "Eq. Guinea", flag: "🇬🇶" },
  { code: "+241", country: "Gabon", flag: "🇬🇦" },
  { code: "+242", country: "Congo", flag: "🇨🇬" },
  { code: "+243", country: "DR Congo", flag: "🇨🇩" },
  { code: "+244", country: "Angola", flag: "🇦🇴" },
  { code: "+245", country: "Guinea-Bissau", flag: "🇬🇼" },
  { code: "+246", country: "Diego Garcia", flag: "🇮🇴" },
  { code: "+248", country: "Seychelles", flag: "🇸🇨" },
  { code: "+249", country: "Sudan", flag: "🇸🇩" },
  { code: "+250", country: "Rwanda", flag: "🇷🇼" },
  { code: "+251", country: "Ethiopia", flag: "🇪🇹" },
  { code: "+252", country: "Somalia", flag: "🇸🇴" },
  { code: "+253", country: "Djibouti", flag: "🇩🇯" },
  { code: "+254", country: "Kenya", flag: "🇰🇪" },
  { code: "+255", country: "Tanzania", flag: "🇹🇿" },
  { code: "+256", country: "Uganda", flag: "🇺🇬" },
  { code: "+257", country: "Burundi", flag: "🇧🇮" },
  { code: "+258", country: "Mozambique", flag: "🇲🇿" },
  { code: "+260", country: "Zambia", flag: "🇿🇲" },
  { code: "+261", country: "Madagascar", flag: "🇲🇬" },
  { code: "+262", country: "Reunion", flag: "🇷🇪" },
  { code: "+263", country: "Zimbabwe", flag: "🇿🇼" },
  { code: "+264", country: "Namibia", flag: "🇳🇦" },
  { code: "+265", country: "Malawi", flag: "🇲🇼" },
  { code: "+266", country: "Lesotho", flag: "🇱🇸" },
  { code: "+267", country: "Botswana", flag: "🇧🇼" },
  { code: "+268", country: "Eswatini", flag: "🇸🇿" },
  { code: "+269", country: "Comoros", flag: "🇰🇲" },
  { code: "+290", country: "St Helena", flag: "🇸🇭" },
  { code: "+291", country: "Eritrea", flag: "🇪🇷" },
  { code: "+297", country: "Aruba", flag: "🇦🇼" },
  { code: "+298", country: "Faroe Islands", flag: "🇫🇴" },
  { code: "+299", country: "Greenland", flag: "🇬🇱" },
  { code: "+350", country: "Gibraltar", flag: "🇬🇮" },
  { code: "+351", country: "Portugal", flag: "🇵🇹" },
  { code: "+352", country: "Luxembourg", flag: "🇱🇺" },
  { code: "+353", country: "Ireland", flag: "🇮🇪" },
  { code: "+354", country: "Iceland", flag: "🇮🇸" },
  { code: "+355", country: "Albania", flag: "🇦🇱" },
  { code: "+356", country: "Malta", flag: "🇲🇹" },
  { code: "+357", country: "Cyprus", flag: "🇨🇾" },
  { code: "+358", country: "Finland", flag: "🇫🇮" },
  { code: "+359", country: "Bulgaria", flag: "🇧🇬" },
  { code: "+370", country: "Lithuania", flag: "🇱🇹" },
  { code: "+371", country: "Latvia", flag: "🇱🇻" },
  { code: "+372", country: "Estonia", flag: "🇪🇪" },
  { code: "+373", country: "Moldova", flag: "🇲🇩" },
  { code: "+374", country: "Armenia", flag: "🇦🇲" },
  { code: "+375", country: "Belarus", flag: "🇧🇾" },
  { code: "+376", country: "Andorra", flag: "🇦🇩" },
  { code: "+377", country: "Monaco", flag: "🇲🇨" },
  { code: "+378", country: "San Marino", flag: "🇸🇲" },
  { code: "+380", country: "Ukraine", flag: "🇺🇦" },
  { code: "+381", country: "Serbia", flag: "🇷🇸" },
  { code: "+382", country: "Montenegro", flag: "🇲🇪" },
  { code: "+383", country: "Kosovo", flag: "🇽🇰" },
  { code: "+385", country: "Croatia", flag: "🇭🇷" },
  { code: "+386", country: "Slovenia", flag: "🇸🇮" },
  { code: "+387", country: "Bosnia", flag: "🇧🇦" },
  { code: "+389", country: "North Macedonia", flag: "🇲🇰" },
  { code: "+420", country: "Czech Rep.", flag: "🇨🇿" },
  { code: "+421", country: "Slovakia", flag: "🇸🇰" },
  { code: "+423", country: "Liechtenstein", flag: "🇱🇮" },
  { code: "+852", country: "Hong Kong", flag: "🇭🇰" },
  { code: "+853", country: "Macau", flag: "🇲🇴" },
  { code: "+855", country: "Cambodia", flag: "🇰🇭" },
  { code: "+856", country: "Laos", flag: "🇱🇦" },
  { code: "+880", country: "Bangladesh", flag: "🇧🇩" },
  { code: "+886", country: "Taiwan", flag: "🇹🇼" },
  { code: "+960", country: "Maldives", flag: "🇲🇻" },
  { code: "+961", country: "Lebanon", flag: "🇱🇧" },
  { code: "+962", country: "Jordan", flag: "🇯🇴" },
  { code: "+963", country: "Syria", flag: "🇸🇾" },
  { code: "+964", country: "Iraq", flag: "🇮🇶" },
  { code: "+965", country: "Kuwait", flag: "🇰🇼" },
  { code: "+966", country: "Saudi Arabia", flag: "🇸🇦" },
  { code: "+967", country: "Yemen", flag: "🇾🇪" },
  { code: "+968", country: "Oman", flag: "🇴🇲" },
  { code: "+970", country: "Palestine", flag: "🇵🇸" },
  { code: "+971", country: "UAE", flag: "🇦🇪" },
  { code: "+972", country: "Israel", flag: "🇮🇱" },
  { code: "+973", country: "Bahrain", flag: "🇧🇭" },
  { code: "+974", country: "Qatar", flag: "🇶🇦" },
  { code: "+975", country: "Bhutan", flag: "🇧🇹" },
  { code: "+976", country: "Mongolia", flag: "🇲🇳" },
  { code: "+977", country: "Nepal", flag: "🇳🇵" },
  { code: "+992", country: "Tajikistan", flag: "🇹🇯" },
  { code: "+993", country: "Turkmenistan", flag: "🇹🇲" },
  { code: "+994", country: "Azerbaijan", flag: "🇦🇿" },
  { code: "+995", country: "Georgia", flag: "🇬🇪" },
  { code: "+996", country: "Kyrgyzstan", flag: "🇰🇬" },
  { code: "+998", country: "Uzbekistan", flag: "🇺🇿" },
];

interface PhoneCountrySelectorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  showSearch?: boolean;
}

export function PhoneCountrySelector({ 
  value, 
  onChange, 
  placeholder = "Select code",
  showSearch = true 
}: PhoneCountrySelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredCodes = COUNTRY_CODES.filter(item =>
    item.code.includes(searchTerm) ||
    item.country.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[140px]">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {showSearch && (
          <div className="p-2 border-b">
            <Input
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8"
            />
          </div>
        )}
        <div className="max-h-[300px] overflow-y-auto">
          {filteredCodes.map((item) => (
            <SelectItem key={item.code} value={item.code}>
              <span className="flex items-center gap-2">
                <span>{item.flag}</span>
                <span className="font-mono">{item.code}</span>
                <span className="text-xs text-muted-foreground">{item.country}</span>
              </span>
            </SelectItem>
          ))}
        </div>
      </SelectContent>
    </Select>
  );
}

