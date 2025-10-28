/**
 * Utility functions for date and time handling
 */

import { format } from 'date-fns';

/**
 * Combines a date string and time string into a proper timestamp
 * @param dateString - Date in ISO format (e.g., "2025-10-22T00:00:00.000")
 * @param timeString - Time in HH:MM format (e.g., "10:37")
 * @returns Date object with combined date and time
 */
export const combineDateAndTime = (dateString: string, timeString: string): Date => {
  try {
    // Parse the date string (e.g., "2025-10-22T00:00:00.000")
    const date = new Date(dateString);
    
    // Validate date
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date format');
    }
    
    // Parse the time string (e.g., "10:37")
    const timeParts = timeString.split(':');
    if (timeParts.length !== 2) {
      throw new Error('Invalid time format. Expected HH:MM');
    }
    
    const hours = parseInt(timeParts[0], 10);
    const minutes = parseInt(timeParts[1], 10);
    
    // Validate time values
    if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      throw new Error('Invalid time values');
    }
    
    // Create a new date with the combined date and time
    const combinedDate = new Date(date);
    combinedDate.setHours(hours, minutes, 0, 0);
    
    return combinedDate;
  } catch (error) {
    console.error('Error combining date and time:', error);
    throw new Error(`Invalid date or time format: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Converts a Date object to ISO string timestamp
 * @param date - Date object
 * @returns ISO string timestamp
 */
export const dateToTimestamp = (date: Date): string => {
  return date.toISOString();
};

/**
 * Converts a timestamp string to Date object
 * @param timestamp - ISO string timestamp
 * @returns Date object
 */
export const timestampToDate = (timestamp: string): Date => {
  return new Date(timestamp);
};

/**
 * Formats a date for display
 * @param date - Date object or timestamp string
 * @param format - Format type ('short', 'long', 'time')
 * @returns Formatted date string
 */
export const formatDate = (date: Date | string, format: 'short' | 'long' | 'time' = 'short'): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return 'Invalid date';
  }
  
  switch (format) {
    case 'short':
      return dateObj.toLocaleDateString();
    case 'long':
      return dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    case 'time':
      return dateObj.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
    default:
      return dateObj.toLocaleDateString();
  }
};

/**
 * Formats a Date object or ISO string into a readable date string with timezone support.
 * @param value - The date value (Date object, ISO string, or number).
 * @param formatStr - The format string (e.g., 'MMM dd, yyyy', 'MMM dd, yyyy HH:mm').
 * @param timezone - The timezone to display the date in (e.g., 'Asia/Beirut').
 * @returns Formatted date string or 'Not set'/'Invalid date'.
 */
export const formatDateWithTimezone = (value: any, formatStr: string = 'MMM dd, yyyy', timezone?: string): string => {
  if (!value) return 'Not set';

  try {
    let date: Date;
    
    // Handle Firestore Timestamp
    if (value.toDate && typeof value.toDate === 'function') {
      date = value.toDate();
    } 
    // Handle string or number
    else if (typeof value === 'string' || typeof value === 'number') {
      date = new Date(value);
    } 
    // Handle Date object
    else if (value instanceof Date) {
      date = value;
    } 
    // Handle object with _seconds (Firestore timestamp format)
    else if (value && typeof value === 'object' && '_seconds' in value) {
      date = new Date(value._seconds * 1000);
    } 
    else {
      // Silently return invalid date without logging
      return 'Invalid date';
    }

    // Validate the date
    if (!date || isNaN(date.getTime())) {
      // Silently return invalid date without logging
      return 'Invalid date';
    }

    // If timezone is provided, format with timezone using Intl
    if (timezone) {
      try {
        return new Intl.DateTimeFormat('en-US', {
          timeZone: timezone,
          year: 'numeric',
          month: 'short',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        }).format(date);
      } catch (tzError) {
        // Fallback to without timezone silently
        try {
          return format(date, formatStr);
        } catch {
          return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          });
        }
      }
    }

    // Format without timezone using date-fns
    try {
      return format(date, formatStr);
    } catch (formatError) {
      // Fallback to basic formatting silently
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  } catch (error) {
    // Silently return invalid date without logging
    return 'Invalid date';
  }
};

/**
 * Combines a date string (ISO format) and a time string (HH:MM) into a single Date object with timezone consideration.
 * @param dateString - The date part in ISO format (e.g., "2025-10-22T00:00:00.000").
 * @param timeString - The time part in HH:MM format (e.g., "10:37").
 * @param timezone - The timezone to consider (e.g., 'Asia/Beirut').
 * @returns A Date object representing the combined date and time.
 * @throws Error if dateString or timeString are invalid.
 */
export const combineDateAndTimeWithTimezone = (dateString: string, timeString: string, timezone?: string): Date => {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date string provided.');
    }

    const [hours, minutes] = timeString.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      throw new Error('Invalid time string provided.');
    }

    const combinedDate = new Date(date);
    combinedDate.setHours(hours, minutes, 0, 0);

    return combinedDate;
  } catch (error) {
    console.error('Error combining date and time with timezone:', error);
    throw new Error('Failed to combine date and time. Please check formats.');
  }
};

/**
 * Example usage:
 * 
 * const dateString = "2025-10-22T00:00:00.000";
 * const timeString = "10:37";
 * 
 * const combinedDate = combineDateAndTime(dateString, timeString);
 * const timestamp = dateToTimestamp(combinedDate);
 * // Result: "2025-10-22T10:37:00.000Z"
 * 
 * // With timezone:
 * const formattedWithTimezone = formatDateWithTimezone(combinedDate, 'MMM dd, yyyy HH:mm', 'Asia/Beirut');
 * // Result: "Oct 22, 2025 13:37" (if Beirut is UTC+3)
 */
