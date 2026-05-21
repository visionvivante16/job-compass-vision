-- Add status column to applications table
ALTER TABLE public.applications 
ADD COLUMN status text NOT NULL DEFAULT 'applied';

-- Add updated_at column
ALTER TABLE public.applications 
ADD COLUMN updated_at timestamp with time zone NOT NULL DEFAULT now();

-- Create index for efficient counting
CREATE INDEX idx_applications_user_status ON public.applications(user_id, status);