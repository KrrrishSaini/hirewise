-- Migration: Add interview scheduling columns to faculty_applications
-- Run this migration in Supabase SQL Editor

-- Add interview scheduling fields to faculty_applications table
ALTER TABLE faculty_applications 
ADD COLUMN IF NOT EXISTS interview_date DATE,
ADD COLUMN IF NOT EXISTS interview_time TIME,
ADD COLUMN IF NOT EXISTS interview_timezone VARCHAR(100),
ADD COLUMN IF NOT EXISTS candidate_response_message TEXT,
ADD COLUMN IF NOT EXISTS communication_history JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS negotiation_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS google_calendar_event_id VARCHAR(255);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_faculty_applications_interview_date 
ON faculty_applications(interview_date);

CREATE INDEX IF NOT EXISTS idx_faculty_applications_calendar_event 
ON faculty_applications(google_calendar_event_id);

-- Add comments for documentation
COMMENT ON COLUMN faculty_applications.interview_date IS 'Scheduled interview date selected by admin';
COMMENT ON COLUMN faculty_applications.interview_time IS 'Scheduled interview time selected by admin';
COMMENT ON COLUMN faculty_applications.interview_timezone IS 'Timezone for the interview (e.g., Asia/Kolkata)';
COMMENT ON COLUMN faculty_applications.candidate_response_message IS 'Latest message from candidate when preferring another time';
COMMENT ON COLUMN faculty_applications.communication_history IS 'JSON array storing all candidate-admin messages';
COMMENT ON COLUMN faculty_applications.negotiation_count IS 'Number of back-and-forth negotiations (max 2)';
COMMENT ON COLUMN faculty_applications.google_calendar_event_id IS 'Google Calendar event ID for tracking';
