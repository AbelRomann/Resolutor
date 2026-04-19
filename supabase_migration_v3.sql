-- =====================================================
-- Resolutor v3 — Workspaces & Solved For
-- Run in: Supabase Dashboard > SQL Editor > New Query
-- =====================================================

-- 1. Create Workspaces table
CREATE TABLE IF NOT EXISTS workspaces (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create Workspace Members table
CREATE TABLE IF NOT EXISTS workspace_members (
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member', -- 'owner' or 'member'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (workspace_id, user_id)
);

-- 3. Update Cases table ensuring user_id exists first (fallback for old schema)
ALTER TABLE cases ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE cases ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS solved_for TEXT;

-- =====================================================
-- MIGRATION OF EXISTING DATA
-- =====================================================
DO $$
DECLARE
    u RECORD;
    new_ws_id UUID;
BEGIN
    -- Loop through all unique users who have cases
    FOR u IN SELECT DISTINCT user_id FROM cases WHERE user_id IS NOT NULL LOOP
        -- Generate new workspace ID
        new_ws_id := gen_random_uuid();
        
        -- Create a personal workspace for them
        INSERT INTO workspaces (id, name, owner_id) 
        VALUES (new_ws_id, 'Mi Workspace', u.user_id);
        
        -- Add them as owner
        INSERT INTO workspace_members (workspace_id, user_id, role)
        VALUES (new_ws_id, u.user_id, 'owner');
        
        -- Migrate all their cases to this workspace
        UPDATE cases SET workspace_id = new_ws_id WHERE user_id = u.user_id;
    END LOOP;
END $$;

-- =====================================================
-- SECURING TABLES (RLS)
-- =====================================================

-- Enable RLS
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

-- Drop any previous conflicting policies
DROP POLICY IF EXISTS "Users can view workspaces they are members of" ON workspaces;
DROP POLICY IF EXISTS "Users can view workspaces they own or are members of" ON workspaces;
DROP POLICY IF EXISTS "Owners can update workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can create workspaces" ON workspaces;
DROP POLICY IF EXISTS "Owners can delete workspaces" ON workspaces;
DROP POLICY IF EXISTS "Members can view other members" ON workspace_members;
DROP POLICY IF EXISTS "Owners can manage members" ON workspace_members;
DROP POLICY IF EXISTS "Users can add themselves to a workspace they create" ON workspace_members;
DROP POLICY IF EXISTS "Users can view their own memberships" ON workspace_members;
DROP POLICY IF EXISTS "Members can CRUD workspace cases" ON cases;

-- Workspaces Policies
CREATE POLICY "Users can view workspaces they own or are members of" ON workspaces
  FOR SELECT USING (
    owner_id = auth.uid() OR
    EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = workspaces.id AND user_id = auth.uid())
  );

CREATE POLICY "Owners can update workspaces" ON workspaces
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Users can create workspaces" ON workspaces
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can delete workspaces" ON workspaces
  FOR DELETE USING (owner_id = auth.uid());

-- Workspace Members Policies
-- FIX: Breaking the infinite recursion by preventing queries on workspaces inside this SELECT policy
CREATE POLICY "Users can view their own memberships" ON workspace_members
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Owners can insert members" ON workspace_members
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM workspaces WHERE id = workspace_members.workspace_id AND owner_id = auth.uid())
  );

CREATE POLICY "Owners can update members" ON workspace_members
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM workspaces WHERE id = workspace_members.workspace_id AND owner_id = auth.uid())
  );

CREATE POLICY "Owners can delete members" ON workspace_members
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM workspaces WHERE id = workspace_members.workspace_id AND owner_id = auth.uid())
  );

CREATE POLICY "Users can add themselves to a workspace they create" ON workspace_members
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Update Cases Policies
DROP POLICY IF EXISTS "Users CRUD own cases" ON cases;

CREATE POLICY "Members can CRUD workspace cases" ON cases
  FOR ALL
  USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = cases.workspace_id AND user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = cases.workspace_id AND user_id = auth.uid()));

-- =====================================================
-- AUTO-CREATE WORKSPACE TRIGGER FOR NEW USERS
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
  ws_id UUID;
BEGIN
  ws_id := gen_random_uuid();
  -- Create personal workspace
  INSERT INTO public.workspaces (id, name, owner_id)
  VALUES (ws_id, 'Mi Workspace', NEW.id);
  
  -- Add user as owner
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (ws_id, NEW.id, 'owner');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger whenever a user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- =====================================================
-- RPC: Lookup User ID by Email (for invitations)
-- =====================================================
CREATE OR REPLACE FUNCTION public.lookup_user_by_email(lookup_email TEXT)
RETURNS UUID AS $$
DECLARE
  found_id UUID;
BEGIN
  found_id := (SELECT id FROM auth.users WHERE email = lookup_email LIMIT 1);
  RETURN found_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: In older Supabase projects, auth.users modifications might require elevated privileges. 
-- If the trigger fails during signup, you can always handle workspace creation from the frontend!
