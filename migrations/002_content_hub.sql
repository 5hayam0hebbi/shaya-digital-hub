-- ─────────────────────────────────────────────────────────────────
-- 002_content_hub.sql
-- Content Library — topic tracking + generated content storage
-- Run this in the Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sd_topics (
  id          text PRIMARY KEY,          -- deterministic hash from title
  title       text NOT NULL,
  hook        text,
  audience    text,
  pillar      text,
  stage       text NOT NULL DEFAULT 'not_started'
                CHECK (stage IN ('not_started','script_written','teleprompter_ready','heygen_done','broll_done','recorded','edited','posted')),
  format      text NOT NULL DEFAULT 'short' CHECK (format IN ('short','long')),
  category    text NOT NULL,
  notes       text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sd_generated_content (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id     text NOT NULL REFERENCES sd_topics(id) ON DELETE CASCADE,
  format       text NOT NULL,           -- 'short' | 'long'
  section_key  text NOT NULL,           -- e.g. 'hook', 'master', 'elevenlabs', 'heygen'
  content      text NOT NULL,
  el_version   integer,                 -- ElevenLabs voice version tracker
  version      integer NOT NULL DEFAULT 1,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now(),
  UNIQUE (topic_id, format, section_key)
);

CREATE TABLE IF NOT EXISTS sd_instructions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content     text NOT NULL,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- RLS: allow all operations for authenticated users
ALTER TABLE sd_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE sd_generated_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE sd_instructions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_full_access" ON sd_topics
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_full_access" ON sd_generated_content
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_full_access" ON sd_instructions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Also allow anon access (the hub has no user auth)
CREATE POLICY "anon_full_access" ON sd_topics
  FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_full_access" ON sd_generated_content
  FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_full_access" ON sd_instructions
  FOR ALL TO anon USING (true) WITH CHECK (true);
