-- Persist "post applied for" so committee/admin portals can show the exact post selected in Step 1.
-- Safe to run multiple times.

ALTER TABLE public.faculty_applications
ADD COLUMN IF NOT EXISTS post_applied_for TEXT;

-- Backfill from teaching experiences for existing rows where post is missing.
WITH latest_teaching_post AS (
  SELECT DISTINCT ON (application_id)
    application_id,
    NULLIF(TRIM(post), '') AS post
  FROM public.teaching_experiences
  WHERE NULLIF(TRIM(post), '') IS NOT NULL
  ORDER BY application_id, start_date DESC NULLS LAST, post DESC
)
UPDATE public.faculty_applications fa
SET post_applied_for = latest_teaching_post.post
FROM latest_teaching_post
WHERE fa.id = latest_teaching_post.application_id
  AND NULLIF(TRIM(fa.post_applied_for), '') IS NULL;

-- If older backend fallback stored teaching post in previous_positions, migrate it now.
UPDATE public.faculty_applications
SET post_applied_for = NULLIF(TRIM(previous_positions), '')
WHERE position = 'teaching'
  AND NULLIF(TRIM(post_applied_for), '') IS NULL
  AND LOWER(NULLIF(TRIM(previous_positions), '')) IN (
    'assistant professor',
    'associate professor',
    'professor',
    'professor of practice',
    'lecturer'
  );

-- Keep semantics strict: this column stores teaching post applied for only.
UPDATE public.faculty_applications
SET post_applied_for = NULL
WHERE position = 'non-teaching';

CREATE INDEX IF NOT EXISTS idx_faculty_applications_post_applied_for
ON public.faculty_applications (post_applied_for);
