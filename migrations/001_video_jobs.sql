-- ─────────────────────────────────────────────────────────────────
-- 001_video_jobs.sql
-- Video Production Hub — job tracking table
-- Run this in the Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS video_jobs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  video_type      text NOT NULL CHECK (video_type IN ('listing_reel','market_update','neighbourhood_guide','open_house')),
  job_name        text NOT NULL,
  input_data      jsonb NOT NULL DEFAULT '{}',
  script          text,
  voice_text      text,                  -- extracted avatar lines for TTS
  broll_prompts   jsonb DEFAULT '[]',    -- [{ cue, prompt }]
  edit_guide      text,
  phase           text NOT NULL DEFAULT 'script' CHECK (phase IN ('script','voice','broll','edit','complete')),
  status          text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','in_progress','complete'))
);

ALTER TABLE video_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_full_access" ON video_jobs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Allow service role (used by Express) to bypass RLS
-- (service role bypasses RLS automatically — no policy needed)
