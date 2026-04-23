-- Position-based specialization + CV recommendation support
-- Run in Supabase SQL editor

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Specialization keywords per position
CREATE TABLE IF NOT EXISTS position_specializations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  position_id UUID NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'ADMIN_MANUAL',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (position_id, keyword)
);

CREATE INDEX IF NOT EXISTS idx_position_specializations_position_id
  ON position_specializations(position_id);

CREATE INDEX IF NOT EXISTS idx_position_specializations_keyword
  ON position_specializations USING GIN (to_tsvector('simple', keyword));

-- 2) Recommendation runs/results for a position
CREATE TABLE IF NOT EXISTS position_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL,
  position_id UUID NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
  application_id INTEGER NOT NULL REFERENCES faculty_applications(id) ON DELETE CASCADE,
  rank INTEGER NOT NULL,
  final_score NUMERIC(6,2) NOT NULL,
  candidate_name TEXT,
  score_breakdown JSONB NOT NULL,
  reason_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_position_recommendations_position_id
  ON position_recommendations(position_id);

CREATE INDEX IF NOT EXISTS idx_position_recommendations_run_id
  ON position_recommendations(run_id);

CREATE INDEX IF NOT EXISTS idx_position_recommendations_created_at
  ON position_recommendations(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_position_recommendations_score
  ON position_recommendations(position_id, final_score DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_position_recommendations_run_rank
  ON position_recommendations(run_id, rank);

-- Optional strict check (run only after cleaning old data if needed):
-- ALTER TABLE positions
--   ADD CONSTRAINT chk_positions_branch_mandatory_for_teaching
--   CHECK (
--     (type = 'TEACHING' AND branch_id IS NOT NULL)
--     OR
--     (type = 'NON_TEACHING' AND branch_id IS NULL)
--   );
