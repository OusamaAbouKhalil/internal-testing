// Request Types and Interfaces

export interface Request {
  id: string;
  accepted: string; // "0" or "1"
  answer_files: string[] | null; // files uploaded by the tutor
  answer_text: string | null;
  assistance_type: string; // ENUM: project, exam, homework, thesis, q&a, one-on-one, online
  cancel_reason: string | null;
  cancelled: string; // "0" or "1"
  cms_attributes: string; // "0" or other JSON
  comments: string | null;
  completed: string; // "0" or "1"
  country: string;
  created_at: string | { _seconds: number; _nanoseconds: number };
  date: string;
  deadline: string;
  deleted_at: string | null;
  description: string | null;
  description_type: string | null;
  discount: string; // numeric, e.g. "100"
  duration: number | null; // in minutes
  exam_type: string;
  feedback: string | null;
  field: string | null;
  field_id: string | null; // numeric stored as text
  file_links: string; // JSON-encoded array of paths
  file_names: string; // JSON-encoded array of names
  grade: string | null;
  is_paid: string; // "0" or "1"
  tutor_paid: string; // "0" or "1"
  issue_reported: string; // "0" or "1"
  label: string; // title
  language: string;
  locked: string; // "0" or "1"
  meeting_id: string | null;
  meeting_password: string | null;
  meeting_record_url: string | null;
  min_price: string | null; // numeric
  notes: string;
  omt_info: string | null; // string/object
  paid: string; // "0" or "1"
  promo_id: string; // numeric stored as text
  rating: string | null; // numeric stored as text
  receipt_submitted: string; // "0" or "1"
  request_status: string;
  saved_by: string | null;
  state: string | null;
  student_id: string; // numeric stored as text
  student_meeting_url: string | null;
  student_nickname: string | null;
  student_price: string; // numeric stored as text
  sub_subject: string | null;
  subject: string;
  subject_id: string; // numeric stored as text
  syllabus_link: string | null;
  time: string;
  timezone: string;
  tutor_accepted: string; // "0" or "1"
  tutor_id: string; // text
  tutor_meeting_url: string | null;
  tutor_nickname: string | null;
  tutor_price: string; // numeric stored as text
  updated_at: string | { _seconds: number; _nanoseconds: number };
  version: string; // numeric stored as text
  zoom_information: string | null; // string/object
  zoom_user_id: string | null;
}

export interface TutorOffer {
  id: string;
  cancel_reason: string | null;
  created_at: string | { _seconds: number; _nanoseconds: number };
  price: string; // numeric stored as text
  request_id: string;
  status: string;
  tutor_id: string;
  updated_at: string | { _seconds: number; _nanoseconds: number };
}

// Enums
export enum RequestType {
  EXAM = 'EXAM',
  HOMEWORK = 'HOMEWORK',
  PROJECT = 'PROJECT',
  THESIS = 'THESIS',
  ONLINE = 'ONLINE',
  SOS = 'SOS'
}

export enum RequestStatus {
  NEW = 'NEW',
  PENDING = 'PENDING',
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  ONGOING = 'ONGOING',
  TUTOR_COMPLETED = 'TUTOR_COMPLETED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export enum RequestExamType {
  MCQ = 'MCQ',
  SHORTANSWER = 'SHORTANSWER',
  PROBLEMSOLVING = 'PROBLEMSOLVING',
  ESSAY = 'ESSAY',
  MIX = 'MIX',
  OTHER = 'OTHER'
}

export enum RequestHomeworkType {
  PRACTICEPROBLEMS = 'PRACTICEPROBLEMS',
  ESSAYWRITING = 'ESSAYWRITING',
  RESEARCHBASED = 'RESEARCHBASED',
  PRESENTATION = 'PRESENTATION',
  OTHER = 'OTHER'
}

export enum RequestProjectType {
  RESEARCH = 'RESEARCH',
  DESIGN = 'DESIGN',
  CASESTUDY = 'CASESTUDY',
  PRESENTATION = 'PRESENTATION',
  EXPERIMENT = 'EXPERIMENT',
  PROBLEMSOLVING = 'PROBLEMSOLVING',
  OTHER = 'OTHER'
}

export enum RequestThesisType {
  LITERATUREREVIEW = 'LITERATUREREVIEW',
  RESEARCH = 'RESEARCH',
  DATAANALYSIS = 'DATAANALYSIS',
  WRITINGSUPPORT = 'WRITINGSUPPORT',
  PROOFREADING = 'PROOFREADING',
  PARTIALREVIEW = 'PARTIALREVIEW',
  FULLREVIEW = 'FULLREVIEW',
  PLAGIARISMCHECK = 'PLAGIARISMCHECK',
  PRESENTATION = 'PRESENTATION',
  OTHER = 'OTHER'
}

export enum BidStatus {
  INVITED = 'INVITED',
  INVITEREJECTED = 'INVITEREJECTED',
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED'
}

// Helper functions for enums
export const getRequestTypeLabel = (type: string): string => {
  switch (type.toLowerCase()) {
    case 'exam':
      return 'Premium Exam Assistance';
    case 'homework':
      return 'Homework';
    case 'project':
      return 'Project';
    case 'thesis':
      return 'Thesis';
    case 'online':
      return 'Online Class';
    case 'q&a':
      return 'Q&A';
    case 'one-on-one':
      return 'One-on-One';
    default:
      return type;
  }
};

export const getRequestStatusLabel = (status: string): string => {
  switch (status) {
    case 'NEW':
      return 'Waiting for Bids';
    case 'PENDING':
      return 'Waiting for Bids';
    case 'PENDING_PAYMENT':
      return 'Pending Payment';
    case 'ONGOING':
      return 'Ongoing';
    case 'TUTOR_COMPLETED':
      return 'Tutor Completed';
    case 'COMPLETED':
      return 'Completed';
    case 'CANCELLED':
      return 'Cancelled';
    default:
      return status;
  }
};

export const getRequestStatusColor = (status: string): string => {
  switch (status) {
    case 'NEW':
    case 'PENDING':
      return 'bg-muted text-foreground';
    case 'PENDING_PAYMENT':
      return 'bg-blue-100 text-blue-800';
    case 'ONGOING':
      return 'bg-purple-100 text-purple-800';
    case 'TUTOR_COMPLETED':
      return 'bg-cyan-100 text-cyan-800';
    case 'COMPLETED':
      return 'bg-green-100 text-green-800';
    case 'CANCELLED':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-muted text-foreground';
  }
};

// Create/Update Data Types
export interface CreateRequestData {
  assistance_type: string;
  label: string;
  subject: string;
  subject_id: string;
  sub_subject?: string;
  language: string;
  country: string;
  date: string;
  time: string;
  timezone: string;
  deadline: string;
  duration?: number;
  description?: string;
  file_links?: string[];
  file_names?: string[];
  student_id: string;
  student_price: string;
  exam_type?: string;
  grade?: string;
  notes?: string;
}

export interface UpdateRequestData {
  assistance_type?: string;
  label?: string;
  subject?: string;
  subject_id?: string;
  sub_subject?: string;
  language?: string;
  country?: string;
  date?: string;
  time?: string;
  timezone?: string;
  deadline?: string;
  duration?: number;
  description?: string;
  file_links?: string[];
  file_names?: string[];
  student_price?: string;
  exam_type?: string;
  grade?: string;
  notes?: string;
  request_status?: string;
  accepted?: string;
  cancelled?: string;
  completed?: string;
}

// Filter Types
export interface RequestFilters {
  search?: string;
  assistance_type?: string;
  request_status?: string;
  country?: string;
  language?: string;
  subject?: string;
  date_from?: string;
  date_to?: string;
  student_id?: string;
  tutor_id?: string;
}

// Pagination Types
export interface PaginationParams {
  page?: number;
  pageSize?: number;
  lastVisible?: any; // Firestore document snapshot
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    currentPage: number;
    pageSize: number;
    totalItems?: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    lastVisible?: any;
  };
}

// Field configurations for different assistance types
export interface RequestFieldConfig {
  fields: string[];
  requiredFields: string[];
  optionalFields: string[];
}

export const getRequestFieldConfig = (assistanceType: string): RequestFieldConfig => {
  switch (assistanceType.toLowerCase()) {
    case 'project':
      return {
        fields: ['due_date', 'time', 'duration', 'instructions', 'materials', 'language', 'subject', 'title', 'sub_subject', 'type'],
        requiredFields: ['due_date', 'time', 'instructions', 'language', 'subject', 'title'],
        optionalFields: ['duration', 'materials', 'sub_subject', 'type']
      };
    case 'exam':
      return {
        fields: ['title', 'subject', 'date', 'time', 'duration', 'instructions', 'sub_subject', 'language', 'materials', 'type'],
        requiredFields: ['title', 'subject', 'date', 'time', 'instructions', 'language'],
        optionalFields: ['duration', 'sub_subject', 'materials', 'type']
      };
    case 'homework':
      return {
        fields: ['due_date', 'time', 'instructions', 'materials', 'language', 'title', 'subject', 'type', 'sub_subject'],
        requiredFields: ['due_date', 'time', 'instructions', 'language', 'title', 'subject'],
        optionalFields: ['materials', 'type', 'sub_subject']
      };
    case 'thesis':
      return {
        fields: ['due_date', 'time', 'instructions', 'materials', 'language', 'title', 'subject', 'sub_subject', 'type'],
        requiredFields: ['due_date', 'time', 'instructions', 'language', 'title', 'subject'],
        optionalFields: ['materials', 'sub_subject', 'type']
      };
    case 'q&a':
      return {
        fields: ['due_date', 'time', 'question', 'course', 'language', 'subject', 'title', 'sub_subject', 'type'],
        requiredFields: ['due_date', 'time', 'question', 'language', 'subject', 'title'],
        optionalFields: ['course', 'sub_subject', 'type']
      };
    case 'one-on-one':
      return {
        fields: ['date', 'time', 'duration', 'instructions', 'materials', 'language', 'subject', 'sub_subject'],
        requiredFields: ['date', 'time', 'instructions', 'language', 'subject'],
        optionalFields: ['duration', 'materials', 'sub_subject']
      };
    case 'online':
      return {
        fields: ['date', 'time', 'duration', 'materials', 'language', 'subject', 'title', 'sub_subject', 'covered_topics', 'private_or_public', 'number_of_participants'],
        requiredFields: ['date', 'time', 'language', 'subject', 'title'],
        optionalFields: ['duration', 'materials', 'sub_subject', 'covered_topics', 'private_or_public', 'number_of_participants']
      };
    default:
      return {
        fields: ['date', 'time', 'instructions', 'language', 'subject', 'title'],
        requiredFields: ['date', 'time', 'language', 'subject', 'title'],
        optionalFields: ['instructions']
      };
  }
};
