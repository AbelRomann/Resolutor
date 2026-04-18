-- =====================================================
-- Resolutor v2 — Migration with Authentication
-- Run in: Supabase Dashboard > SQL Editor > New Query
-- =====================================================

-- 1. Create table (if starting fresh)
CREATE TABLE IF NOT EXISTS cases (
  id                  TEXT PRIMARY KEY,
  title               TEXT NOT NULL,
  category            TEXT NOT NULL,
  status              TEXT NOT NULL,
  priority            TEXT NOT NULL,
  incident_date       TEXT NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  what_i_did          TEXT DEFAULT '',
  how_it_was_resolved TEXT DEFAULT '',
  tags                TEXT[] DEFAULT '{}',
  status_history      JSONB DEFAULT '[]',
  user_id             UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 2. Enable RLS
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;

-- 3. Drop old open policies if they exist
DROP POLICY IF EXISTS "Allow all operations" ON cases;
DROP POLICY IF EXISTS "Allow all" ON cases;
DROP POLICY IF EXISTS "Users can CRUD own cases" ON cases;

-- 4. Create user-specific policy (each user only sees their own cases)
CREATE POLICY "Users CRUD own cases" ON cases
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- If you already have a cases table WITHOUT user_id:
-- Run this to add the column:
-- ALTER TABLE cases ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
-- =====================================================
