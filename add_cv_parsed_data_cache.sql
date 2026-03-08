-- Add cv_parsed_data column to cache CV parsing results
-- This avoids hitting Groq API rate limits by storing parsed data

ALTER TABLE faculty_applications 
ADD COLUMN IF NOT EXISTS cv_parsed_data JSONB;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_faculty_applications_cv_parsed_data 
ON faculty_applications USING GIN (cv_parsed_data);

-- Add comment
COMMENT ON COLUMN faculty_applications.cv_parsed_data IS 'Cached CV parsing results from Groq AI to avoid rate limit issues';
