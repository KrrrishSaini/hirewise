-- Persist final submission timestamp for each faculty application.
-- Safe to run multiple times.

ALTER TABLE public.faculty_applications
ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;

-- Backfill existing submitted/progressed applications from created_at.
UPDATE public.faculty_applications
SET submitted_at = COALESCE(created_at, NOW())
WHERE submitted_at IS NULL
  AND COALESCE(status, '') <> 'draft';

CREATE INDEX IF NOT EXISTS idx_faculty_applications_submitted_at
ON public.faculty_applications (submitted_at DESC);
