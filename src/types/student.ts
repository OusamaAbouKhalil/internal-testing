export interface Language {
  id: string;
  language_code: string;
  language_name: string;
  created_at: string;
  updated_at: string;
}

export interface Student {
    id: string;
    country_code?: string;
    phone_number?: string;
    created_at: string;
    updated_at: string;
    deleted_at?: string | null;
    delete_reason?: string;
    locked: string;
    cancelled: string;
    version: string;
    device_token?: string;
    platform?: string;
    user_identifier?: string;
    send_notifications: string;
    full_name?: string;
    nickname?: string;
    email: string;
    verified: string;
    is_banned: string;
    token: string;
    facebook_id?: string;
    google_id?: string;
    apple_id?: string;
    student_level?: string; // Changed from student_level_id - stores enum: HIGHSCHOOL, UNIVERSITY, MASTER, PHD
    password: string;
    test_user: string;
    cms_attributes?: any;
    gender?: string; // Stores enum: MALE, FEMALE, OTHER
    profile_image?: string;
    nationality?: string;
    country?: string;
    city?: string;
    majorId?: number | null; // Numeric ID referencing a major
    otherMajor?: string; // Custom major name if majorId is null
    languages?: number[] | Language[]; // Array of language IDs or language objects
    rating?: number;
    feedback?: string;
    request_count?: number;
    sign_in_method?: 'manual' | 'facebook' | 'google' | 'apple';
    sign_in_methods?: ('manual' | 'facebook' | 'google' | 'apple')[]; // Multiple sign-in methods supported
    spend_amount?: number;
  }
  
// Enums for student attributes
export enum StudentGenderEnum {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

export enum StudentEducationLevelEnum {
  HIGHSCHOOL = 'HIGHSCHOOL',
  UNIVERSITY = 'UNIVERSITY',
  MASTER = 'MASTER',
  PHD = 'PHD',
}

export enum StudentAuthMethodEnum {
  MANUAL = 'manual',
  GOOGLE = 'google',
  FACEBOOK = 'facebook',
  APPLE = 'apple',
}

// Label helpers mirroring the provided extensions
export const StudentEducationLevelLabel: Record<StudentEducationLevelEnum, string> = {
  [StudentEducationLevelEnum.HIGHSCHOOL]: 'High School',
  [StudentEducationLevelEnum.UNIVERSITY]: 'University',
  [StudentEducationLevelEnum.MASTER]: "Master's Degree",
  [StudentEducationLevelEnum.PHD]: 'PhD',
};

export const StudentEducationLevelName: Record<StudentEducationLevelEnum, string> = {
  [StudentEducationLevelEnum.HIGHSCHOOL]: 'High School',
  [StudentEducationLevelEnum.UNIVERSITY]: 'Undergraduate',
  [StudentEducationLevelEnum.MASTER]: "Master's Degree",
  [StudentEducationLevelEnum.PHD]: 'PhD',
};

export const StudentGenderLabel: Record<StudentGenderEnum, string> = {
  [StudentGenderEnum.MALE]: 'Male',
  [StudentGenderEnum.FEMALE]: 'Female',
  [StudentGenderEnum.OTHER]: 'Other',
};

export const StudentGenderAvatar: Record<StudentGenderEnum, string> = {
  [StudentGenderEnum.MALE]: 'assets/images/new/male_avatar.png',
  [StudentGenderEnum.FEMALE]: 'assets/images/new/female_avatar.png',
  [StudentGenderEnum.OTHER]: 'assets/images/new/male_avatar.png',
};

export const StudentAuthMethodLabel: Record<StudentAuthMethodEnum, string> = {
  [StudentAuthMethodEnum.MANUAL]: 'Manual',
  [StudentAuthMethodEnum.GOOGLE]: 'Google',
  [StudentAuthMethodEnum.FACEBOOK]: 'Facebook',
  [StudentAuthMethodEnum.APPLE]: 'Apple',
};

  export interface CreateStudentData {
    email: string;
    password: string;
    full_name?: string;
    nickname?: string;
    phone_number?: string;
    country_code?: string;
    student_level?: string; // Changed from student_level_id
    gender?: string; // Stores enum: MALE, FEMALE, OTHER
    nationality?: string;
    country?: string;
    city?: string;
    majorId?: number | null; // Changed from major
    otherMajor?: string | null; // Custom major if majorId is null
    languages?: number[]; // Array of language IDs
    platform?: string;
  }
  
  export interface UpdateStudentData {
    full_name?: string;
    nickname?: string;
    email?: string;
    password?: string;
    phone_number?: string;
    country_code?: string;
    student_level?: string; // Changed from student_level_id
    gender?: string; // Stores enum: MALE, FEMALE, OTHER
    nationality?: string;
    country?: string;
    city?: string;
    majorId?: number | null; // Numeric ID, must have value if otherMajor is null
    otherMajor?: string | null; // Custom major text, only used when majorId is 198 or majorId is null
    languages?: number[]; // Array of language IDs
    verified?: string;
    is_banned?: string;
    locked?: string;
    cancelled?: string;
    send_notifications?: string;
  }
  
export interface StudentFilters {
  search?: string;
  email?: string; // Search specifically by email or nickname only
  nickname?: string; // Search specifically by email or nickname only
  phone_number?: string; // Search specifically by phone number
  verified?: string;
  is_banned?: string;
  student_level?: string; // Filter by enum: HIGHSCHOOL, UNIVERSITY, MASTER, PHD
  majorId?: number; // Filter by major ID
  country?: string;
  deleted?: boolean;
  nationality?: string;
  gender?: string; // Filter by enum: MALE, FEMALE, OTHER
  has_requests?: string;
  sign_in_method?: 'manual' | 'facebook' | 'google' | 'apple';
  min_spend?: number;
  max_spend?: number;
  created_at_from?: string; // Filter by created_at from date (ISO string or YYYY-MM-DD)
  created_at_to?: string; // Filter by created_at to date (ISO string or YYYY-MM-DD)
  page?: number;
  limit?: number;
}