export type EmploymentType = 'Full Time' | 'Contract' | 'Internship' | 'Part Time';

export interface Job {
  id: string;
  title: string;
  company: string;
  company_logo: string | null;
  location: string;
  description: string;
  skills: string[];
  external_apply_link: string;
  is_published: boolean;
  is_reviewing: boolean;
  salary_range: string | null;
  employment_type: EmploymentType;
  experience_years: string | null;
  posted_date: Date;
  created_at: Date;
  updated_at: Date;
  is_archived?: boolean;
  deleted_at?: string | null;
  created_by_user_id?: string | null;
  employer_id?: string | null;
  description_enriched?: boolean;
  description_source?: string | null;
}

export interface Application {
  id: string;
  user_id: string;
  job_id: string;
  status: 'clicked' | 'applied' | 'in_review' | 'interview' | 'offer' | 'rejected' | 'withdrawn';
  applied_at: Date;
  updated_at: Date;
  job?: Job;
}

export interface SavedJob {
  id: string;
  user_id: string;
  job_id: string;
  saved_at: Date;
  folder: string;
  job?: Job;
}

export interface Profile {
  id: string;
  user_id: string;
  email: string;
  country: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: 'user' | 'admin';
  created_at: Date;
}

export interface JobCounts {
  total_count: number;
  today_count: number;
  yesterday_count: number;
  week_count: number;
}

export type TabFilter = 'all' | 'today' | 'yesterday' | 'week';
