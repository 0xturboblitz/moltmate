-- Add missing user_chats and related tables

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User chats table (agent-to-agent conversations within matches)
CREATE TABLE IF NOT EXISTS user_chats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  profile_a_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  profile_b_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  messages JSONB DEFAULT '[]'::jsonb,
  is_public BOOLEAN DEFAULT false,
  upvote_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(match_id)
);

-- Chat upvotes table
CREATE TABLE IF NOT EXISTS chat_upvotes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id UUID NOT NULL REFERENCES user_chats(id) ON DELETE CASCADE,
  voter_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(chat_id, voter_profile_id)
);

-- User violations table (for security tracking)
CREATE TABLE IF NOT EXISTS user_violations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  violation_type TEXT NOT NULL CHECK (violation_type IN ('sql_injection', 'xss', 'command_injection', 'prompt_injection', 'rate_limit', 'content_filter')),
  violation_count INTEGER DEFAULT 1,
  last_violation_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  cooldown_until TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for chat tables
CREATE INDEX IF NOT EXISTS idx_user_chats_match_id ON user_chats(match_id);
CREATE INDEX IF NOT EXISTS idx_user_chats_profile_a ON user_chats(profile_a_id);
CREATE INDEX IF NOT EXISTS idx_user_chats_profile_b ON user_chats(profile_b_id);
CREATE INDEX IF NOT EXISTS idx_user_chats_public ON user_chats(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_user_chats_upvotes ON user_chats(upvote_count DESC);
CREATE INDEX IF NOT EXISTS idx_user_chats_created_at ON user_chats(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_upvotes_chat_id ON chat_upvotes(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_upvotes_voter ON chat_upvotes(voter_profile_id);

CREATE INDEX IF NOT EXISTS idx_violations_profile ON user_violations(profile_id);
CREATE INDEX IF NOT EXISTS idx_violations_cooldown ON user_violations(cooldown_until);

-- Apply updated_at triggers to new tables
DROP TRIGGER IF EXISTS update_user_chats_updated_at ON user_chats;
CREATE TRIGGER update_user_chats_updated_at BEFORE UPDATE ON user_chats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_violations_updated_at ON user_violations;
CREATE TRIGGER update_violations_updated_at BEFORE UPDATE ON user_violations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update upvote_count automatically
CREATE OR REPLACE FUNCTION update_chat_upvote_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE user_chats SET upvote_count = upvote_count + 1 WHERE id = NEW.chat_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE user_chats SET upvote_count = upvote_count - 1 WHERE id = OLD.chat_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS chat_upvote_count_trigger ON chat_upvotes;
CREATE TRIGGER chat_upvote_count_trigger
AFTER INSERT OR DELETE ON chat_upvotes
FOR EACH ROW EXECUTE FUNCTION update_chat_upvote_count();

-- RLS policies for chat tables
ALTER TABLE user_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_upvotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_violations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view public chats" ON user_chats;
DROP POLICY IF EXISTS "Users can view their own chats" ON user_chats;
DROP POLICY IF EXISTS "Users can insert messages to their chats" ON user_chats;
DROP POLICY IF EXISTS "Users can update their own chats" ON user_chats;
DROP POLICY IF EXISTS "Anyone can view upvotes" ON chat_upvotes;
DROP POLICY IF EXISTS "Users can upvote chats" ON chat_upvotes;
DROP POLICY IF EXISTS "Users can remove their own upvotes" ON chat_upvotes;
DROP POLICY IF EXISTS "Users can view their own violations" ON user_violations;
DROP POLICY IF EXISTS "System can insert violations" ON user_violations;
DROP POLICY IF EXISTS "System can update violations" ON user_violations;

-- User chats: public chats can be viewed by anyone
CREATE POLICY "Anyone can view public chats" ON user_chats
  FOR SELECT USING (is_public = true);

-- User chats: participants can view their own chats (including private)
CREATE POLICY "Users can view their own chats" ON user_chats
  FOR SELECT USING (
    profile_a_id IN (SELECT id FROM profiles WHERE user_id = current_setting('app.user_id', true))
    OR profile_b_id IN (SELECT id FROM profiles WHERE user_id = current_setting('app.user_id', true))
  );

-- User chats: participants can insert messages to their chats
CREATE POLICY "Users can insert messages to their chats" ON user_chats
  FOR INSERT WITH CHECK (
    profile_a_id IN (SELECT id FROM profiles WHERE user_id = current_setting('app.user_id', true))
    OR profile_b_id IN (SELECT id FROM profiles WHERE user_id = current_setting('app.user_id', true))
  );

-- User chats: participants can update their own chats
CREATE POLICY "Users can update their own chats" ON user_chats
  FOR UPDATE USING (
    profile_a_id IN (SELECT id FROM profiles WHERE user_id = current_setting('app.user_id', true))
    OR profile_b_id IN (SELECT id FROM profiles WHERE user_id = current_setting('app.user_id', true))
  );

-- Chat upvotes: anyone can view upvotes for public chats
CREATE POLICY "Anyone can view upvotes" ON chat_upvotes
  FOR SELECT USING (
    chat_id IN (SELECT id FROM user_chats WHERE is_public = true)
  );

-- Chat upvotes: authenticated users can upvote
CREATE POLICY "Users can upvote chats" ON chat_upvotes
  FOR INSERT WITH CHECK (
    voter_profile_id IN (SELECT id FROM profiles WHERE user_id = current_setting('app.user_id', true))
  );

-- Chat upvotes: users can remove their own upvotes
CREATE POLICY "Users can remove their own upvotes" ON chat_upvotes
  FOR DELETE USING (
    voter_profile_id IN (SELECT id FROM profiles WHERE user_id = current_setting('app.user_id', true))
  );

-- User violations: users can only view their own violations
CREATE POLICY "Users can view their own violations" ON user_violations
  FOR SELECT USING (
    profile_id IN (SELECT id FROM profiles WHERE user_id = current_setting('app.user_id', true))
  );

-- User violations: system can insert violations (service role)
CREATE POLICY "System can insert violations" ON user_violations
  FOR INSERT WITH CHECK (true);

-- User violations: system can update violations (service role)
CREATE POLICY "System can update violations" ON user_violations
  FOR UPDATE USING (true);
