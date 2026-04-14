export type UserRole = 'student' | 'admin';

export interface CreateDepartmentInput {
  name: string;
  slug: string;
  description?: string;
}

export interface CreateSemesterInput {
  department_id: string;
  number: number;
  title: string;
}

export interface CreateModuleInput {
  subject_id: string;
  title: string;
  description?: string;
  order: number;
}

export type UpdateModuleInput = Partial<Omit<CreateModuleInput, 'subject_id'>>;

export interface CreateDocumentInput {
  subject_id: string;
  module_id: string;
  type: SubjectDocumentType;
  title: string;
  content?: string;
  file_url?: string;
  metadata?: Record<string, unknown>;
}

export type UpdateDocumentInput = Partial<Omit<CreateDocumentInput, 'subject_id'>>;

export type SubjectDocumentType =
  | 'notes'
  | 'important-question'
  | 'pyq'
  | 'solved-answer'
  | 'textbook'
  | 'syllabus';

interface TimestampedRecord {
  created_at: string;
}

interface NamedRecord extends TimestampedRecord {
  id: string;
  name: string;
}

interface SubjectFields {
  department_id: string;
  semester_id: string;
  name: string;
  code?: string;
  description?: string;
  published: boolean;
}

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface SignupInput {
  full_name: string;
  email: string;
  password: string;
}

export interface CreateSubjectInput extends Omit<SubjectFields, 'published'> {
  published?: boolean;
}

export interface UpdateSubjectInput extends Partial<Omit<SubjectFields, 'department_id' | 'semester_id'>> {}

export interface Profile extends TimestampedRecord {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url?: string;
}

export interface Department extends NamedRecord {
  slug: string;
  description?: string;
}

export interface Semester extends TimestampedRecord {
  id: string;
  department_id: string;
  number: number;
  title: string;
}

export interface Subject extends SubjectFields, TimestampedRecord {
  id: string;
}

export interface Module extends TimestampedRecord {
  id: string;
  subject_id: string;
  title: string;
  description?: string;
  order: number;
}

export interface Document extends TimestampedRecord {
  id: string;
  subject_id: string;
  module_id: string;
  type: SubjectDocumentType;
  title: string;
  content?: string;
  file_url?: string;
  metadata?: Record<string, unknown>;
  updated_at: string;
}

export interface Bookmark extends TimestampedRecord {
  id: string;
  user_id: string;
  subject_id?: string;
  document_id?: string;
  item_type: 'document' | 'pyq' | 'generated_note' | 'generated_answer';
  metadata?: Record<string, unknown>;
}

export interface BookmarkAnalytics {
  totalBookmarks: number;
  uniqueStudents: number;
  recentBookmarks7d: number;
  topSubjects: Array<{
    subject_id: string;
    subject_name: string;
    count: number;
  }>;
  topDocuments: Array<{
    document_id: string;
    subject_id: string;
    subject_name: string;
    document_title: string;
    count: number;
  }>;
  lowEngagementSubjects: Array<{
    subject_id: string;
    subject_name: string;
    count: number;
  }>;
  fallback: boolean;
}

export interface AdminActivityLog extends TimestampedRecord {
  id: string;
  user_id: string;
  subject_id: string;
  action: string;
  details: string;
  metadata?: Record<string, unknown> & {
    admin_name?: string;
    admin_email?: string;
  };
}
