-- Add confirmation_response column to faculty_applications table
-- This column tracks the candidate's response to the interview confirmation email
-- Values: NULL (not sent), 'ACCEPTED', 'REJECTED'

ALTER TABLE faculty_applications 
ADD COLUMN IF NOT EXISTS confirmation_response TEXT DEFAULT NULL;

-- Add interview_scheduled_date for tracking scheduled interview dates
ALTER TABLE faculty_applications 
ADD COLUMN IF NOT EXISTS interview_scheduled_date TIMESTAMPTZ DEFAULT NULL;

-- Add confirmation_email_sent_at to track when email was sent
ALTER TABLE faculty_applications 
ADD COLUMN IF NOT EXISTS confirmation_email_sent_at TIMESTAMPTZ DEFAULT NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_faculty_applications_confirmation_response 
ON faculty_applications(confirmation_response);

-- Create index for faster queries by confirmation email sent status
CREATE INDEX IF NOT EXISTS idx_faculty_applications_confirmation_email_sent 
ON faculty_applications(confirmation_email_sent_at);
