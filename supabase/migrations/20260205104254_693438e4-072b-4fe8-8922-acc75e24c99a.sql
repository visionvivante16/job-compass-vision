-- Add salary_range and employment_type columns to jobs table
ALTER TABLE public.jobs 
ADD COLUMN salary_range text,
ADD COLUMN employment_type text NOT NULL DEFAULT 'Full Time';