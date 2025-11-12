export interface Tutor {
  id: string;
  google_id?: string | null;
  another_university?: string | null;
  version: string;
  send_notifications: string;
  major?: number | null;
  majorId?: number[] | number | null;
  platform?: string;
  test_user: string;
  deleted_at?: string | null;
  cover_letter?: string | null;
  cms_attributes?: any;
  email: string;
  country_id?: string | null;
  skills?: number[];
  profile_image?: string | null;
  subjects?: number[];
  experience_years?: number | null;
  whatsapp_country_code?: string;
  field_id?: number | null;
  full_name: string;
  another_degree?: string | null;
  nationality?: string;
  city?: string;
  cancelled: string;
  whatsapp_phone?: string;
  country?: string;
  locked: string;
  token: string;
  facebook_id?: string | null;
  device_token?: string | null;
  created_at: string | { _seconds: number; _nanoseconds: number };
  phone_country_code?: string;
  phone?: string;
  verified: string;
  date_of_birth?: string;
  nickname?: string;
  bio?: string;
  gender?: string; // MALE, FEMALE, OTHER
  university?: string[];
  degree?: string[]; // HIGHSCHOOL, UNIVERSITY, MASTER, PHD
  id_file_link?: string[];
  password: string;
  languages?: number[];
  certification_file_link?: string[];
  updated_at: string | { _seconds: number; _nanoseconds: number };
  request_count?: number;
  rating?: number;
}

// Enums for tutor attributes
export enum TutorGenderEnum {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

export enum TutorDegreeEnum {
  HIGHSCHOOL = 'HIGHSCHOOL',
  UNIVERSITY = 'UNIVERSITY',
  MASTER = 'MASTER',
  PHD = 'PHD',
}

export enum TutorAuthMethodEnum {
  MANUAL = 'manual',
  GOOGLE = 'google',
  FACEBOOK = 'facebook',
  APPLE = 'apple',
}

// Label helpers
export const TutorGenderLabel: Record<TutorGenderEnum, string> = {
  [TutorGenderEnum.MALE]: 'Male',
  [TutorGenderEnum.FEMALE]: 'Female',
  [TutorGenderEnum.OTHER]: 'Other',
};

export const TutorDegreeLabel: Record<TutorDegreeEnum, string> = {
  [TutorDegreeEnum.HIGHSCHOOL]: 'High School',
  [TutorDegreeEnum.UNIVERSITY]: 'University',
  [TutorDegreeEnum.MASTER]: "Master's Degree",
  [TutorDegreeEnum.PHD]: 'PhD',
};

export const TutorAuthMethodLabel: Record<TutorAuthMethodEnum, string> = {
  [TutorAuthMethodEnum.MANUAL]: 'Manual',
  [TutorAuthMethodEnum.GOOGLE]: 'Google',
  [TutorAuthMethodEnum.FACEBOOK]: 'Facebook',
  [TutorAuthMethodEnum.APPLE]: 'Apple',
};

export interface CreateTutorData {
  email: string;
  password: string;
  full_name: string;
  nickname?: string;
  bio?: string;
  phone?: string;
  phone_country_code?: string;
  whatsapp_phone?: string;
  whatsapp_country_code?: string;
  country?: string;
  address?: string;
  profile_image?: string;
  platform?: string;
}

export interface UpdateTutorData {
  full_name?: string;
  nickname?: string;
  email?: string;
  password?: string;
  bio?: string;
  phone?: string;
  phone_country_code?: string;
  whatsapp_phone?: string;
  whatsapp_country_code?: string;
  country?: string;
  address?: string;
  profile_image?: string;
  verified?: string;
  locked?: string;
  cancelled?: string;
  send_notifications?: string;
}

export interface TutorFilters {
  search?: string;
  email?: string;
  nickname?: string;
  phone?: string;
  whatsapp_phone?: string;
  verified?: boolean;
  cancelled?: boolean;
  deleted?: boolean;
  country?: string;
  gender?: string;
  has_requests?: boolean;
  sign_in_method?: 'manual' | 'facebook' | 'google' | 'apple';
  degree?: string;
}

