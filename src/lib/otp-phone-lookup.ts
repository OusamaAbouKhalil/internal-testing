import { adminDb } from '@/config/firebase-admin';

/**
 * Look up phone number from otp_verifications collection by email
 * @param email - The email address to search for
 * @returns Object with phoneNumber and countryCode, or null if not found
 */
export async function getPhoneFromOtpVerifications(email: string): Promise<{
  phoneNumber: string;
  countryCode: string;
} | null> {
  if (!email) return null;

  try {
    // Query otp_verifications collection where email matches
    const snapshot = await adminDb
      .collection('otp_verifications')
      .where('email', '==', email)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    // Get the first matching document
    const doc = snapshot.docs[0];
    const data = doc.data();
    
    // The document ID is the full phone number (e.g., "+96181238670")
    const fullPhone = doc.id;
    
    // First, try to use the fields from the document (countryCode and phoneNumber)
    const countryCode = data.countryCode || '';
    const phoneNumber = data.phoneNumber || '';
    
    // If we have both fields, return them
    if (countryCode && phoneNumber) {
      return {
        phoneNumber: phoneNumber.toString(),
        countryCode: countryCode.toString()
      };
    }
    
    // Otherwise, try to parse from the document ID
    // Document ID format: "+96181238670" or similar
    if (fullPhone && typeof fullPhone === 'string' && fullPhone.startsWith('+')) {
      // Try to extract country code (usually 1-4 digits after +)
      // Common patterns: +1, +44, +961, etc.
      const match = fullPhone.match(/^(\+\d{1,4})(\d+)$/);
      if (match && match[1] && match[2]) {
        return {
          countryCode: match[1],
          phoneNumber: match[2]
        };
      }
      
      // If parsing fails, try a more flexible approach
      // For Lebanon (+961), country code is 3 digits, phone is usually 8 digits
      // For US (+1), country code is 1 digit, phone is 10 digits
      // Try common patterns
      const patterns = [
        /^(\+\d{3})(\d{8})$/,  // +961XXXXXXXX (Lebanon)
        /^(\+\d{2})(\d{9,10})$/, // +44XXXXXXXXX (UK)
        /^(\+\d{1})(\d{10})$/,   // +1XXXXXXXXXX (US/Canada)
      ];
      
      for (const pattern of patterns) {
        const patternMatch = fullPhone.match(pattern);
        if (patternMatch && patternMatch[1] && patternMatch[2]) {
          return {
            countryCode: patternMatch[1],
            phoneNumber: patternMatch[2]
          };
        }
      }
      
      // Last resort: split at a reasonable point (assume country code is 1-4 digits)
      // This is a fallback for edge cases
      const splitPoint = Math.min(5, fullPhone.length - 7); // Leave at least 7 digits for phone
      return {
        countryCode: fullPhone.substring(0, splitPoint),
        phoneNumber: fullPhone.substring(splitPoint)
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error looking up phone from OTP verifications:', error);
    return null;
  }
}

/**
 * Enrich a student object with phone number from OTP verifications if missing
 * @param student - The student object
 * @returns Student object with enriched phone number if found
 */
export async function enrichStudentWithOtpPhone(student: any): Promise<any> {
  // Only enrich if student doesn't have a phone number but has an email
  if (!student.phone_number && student.email) {
    const otpPhone = await getPhoneFromOtpVerifications(student.email);
    if (otpPhone) {
      return {
        ...student,
        phone_number: otpPhone.phoneNumber,
        country_code: otpPhone.countryCode,
        phone_from_otp: true // Flag to indicate this came from OTP verifications
      };
    }
  }
  return student;
}

/**
 * Enrich multiple students with phone numbers from OTP verifications
 * @param students - Array of student objects
 * @returns Array of enriched student objects
 */
export async function enrichStudentsWithOtpPhone(students: any[]): Promise<any[]> {
  // Process in parallel for better performance
  const enrichedStudents = await Promise.all(
    students.map(student => enrichStudentWithOtpPhone(student))
  );
  return enrichedStudents;
}

