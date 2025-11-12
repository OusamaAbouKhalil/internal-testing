/**
 * Pricing Calculation Utility
 * 
 * Implements the pricing priority system:
 * 1. student_price (absolute override) - if exists and not "0", use it
 * 2. Calculated price (tutor_price × multiplier) - if student_price is "0" or not set
 * 3. min_price enforcement - ensures calculated price is at least min_price
 */

/**
 * Get country multiplier
 * @param country - Student's country
 * @returns Multiplier (2 for Lebanon, 3 for others)
 */
export function getCountryMultiplier(country: string | null | undefined): number {
  if (!country) return 3; // Default to 3 if country is not set
  
  const normalizedCountry = country.toUpperCase().trim();
  return normalizedCountry === 'LEBANON' ? 2 : 3;
}

/**
 * Calculate student price based on pricing priority rules
 * 
 * Priority 1: If student_price exists and is not "0", return it (absolute override)
 * Priority 2: Calculate from tutor_price × multiplier
 * Priority 3: Enforce min_price if calculated price is lower
 * 
 * @param params - Pricing parameters
 * @returns Calculated student price as string
 */
export function calculateStudentPrice(params: {
  student_price?: string | null;
  tutor_price?: string | null;
  country?: string | null;
  min_price?: string | null;
}): string {
  const { student_price, tutor_price, country, min_price } = params;
  
  // Priority 1: student_price override (absolute)
  if (student_price && student_price !== '0' && student_price !== '' && student_price !== null) {
    const overridePrice = parseFloat(student_price);
    if (!isNaN(overridePrice) && overridePrice > 0) {
      return overridePrice.toFixed(2);
    }
  }
  
  // Priority 2: Calculate from tutor_price
  if (tutor_price && tutor_price !== '0' && tutor_price !== '' && tutor_price !== null) {
    const tutorPriceNum = parseFloat(tutor_price);
    if (!isNaN(tutorPriceNum) && tutorPriceNum > 0) {
      const multiplier = getCountryMultiplier(country);
      const calculated = tutorPriceNum * multiplier;
      
      // Priority 3: Enforce min_price
      if (min_price && min_price !== '0' && min_price !== '' && min_price !== null) {
        const minPriceNum = parseFloat(min_price);
        if (!isNaN(minPriceNum) && minPriceNum > 0) {
          return Math.max(calculated, minPriceNum).toFixed(2);
        }
      }
      
      return calculated.toFixed(2);
    }
  }
  
  // Fallback: return "0" if no valid calculation
  return '0';
}

/**
 * Calculate price for tutor offer (tutor_price × multiplier)
 * This is the price shown to students for each tutor's bid
 * 
 * @param tutorPrice - What tutor will receive
 * @param country - Student's country
 * @returns Calculated price as string
 */
export function calculateTutorOfferPrice(
  tutorPrice: string | number | null | undefined,
  country?: string | null
): string {
  if (!tutorPrice || tutorPrice === '0' || tutorPrice === '') {
    return '0';
  }
  
  const tutorPriceNum = typeof tutorPrice === 'string' ? parseFloat(tutorPrice) : tutorPrice;
  if (isNaN(tutorPriceNum) || tutorPriceNum <= 0) {
    return '0';
  }
  
  const multiplier = getCountryMultiplier(country);
  return (tutorPriceNum * multiplier).toFixed(2);
}

/**
 * Check if student_price is an override (not calculated)
 * 
 * @param student_price - Student price value
 * @returns true if student_price is an override
 */
export function isStudentPriceOverride(student_price?: string | null): boolean {
  return !!(student_price && student_price !== '0' && student_price !== '' && student_price !== null);
}

/**
 * Get the effective student price for display
 * This combines the calculation logic with override detection
 * 
 * @param params - Pricing parameters
 * @returns Object with calculated price and override flag
 */
export function getEffectiveStudentPrice(params: {
  student_price?: string | null;
  tutor_price?: string | null;
  country?: string | null;
  min_price?: string | null;
}): {
  price: string;
  isOverride: boolean;
  isCalculated: boolean;
} {
  const { student_price } = params;
  const isOverride = isStudentPriceOverride(student_price);
  
  if (isOverride) {
    return {
      price: student_price!,
      isOverride: true,
      isCalculated: false
    };
  }
  
  const calculated = calculateStudentPrice(params);
  return {
    price: calculated,
    isOverride: false,
    isCalculated: true
  };
}


