-- Moltmate Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;

-- Profiles table (includes preferences)
CREATE TABLE profiles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  age INTEGER NOT NULL CHECK (age >= 18 AND age <= 100),
  gender TEXT NOT NULL CHECK (gender IN ('male', 'female', 'non-binary', 'other')),
  gender_preference TEXT[] NOT NULL DEFAULT '{}',
  age_min INTEGER DEFAULT 18,
  age_max INTEGER DEFAULT 99,
  bio TEXT,
  interests TEXT[] DEFAULT '{}',
  values TEXT[] DEFAULT '{}',
  location TEXT,
  looking_for TEXT DEFAULT 'both' CHECK (looking_for IN ('dating', 'friendship', 'both')),
  deal_breakers TEXT[] DEFAULT '{}',
  must_haves TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Matches table
CREATE TABLE matches (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  profile_a_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  profile_b_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  compatibility_score INTEGER NOT NULL CHECK (compatibility_score >= 0 AND compatibility_score <= 100),
  match_status TEXT NOT NULL DEFAULT 'pending' CHECK (match_status IN ('pending', 'approved_a', 'approved_b', 'approved_both', 'passed_a', 'passed_b')),
  conversation_summary TEXT,
  suggested_ice_breakers TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CHECK (profile_a_id != profile_b_id)
);

-- User chats table (agent-to-agent conversations)
CREATE TABLE user_chats (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
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
CREATE TABLE chat_upvotes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  chat_id UUID NOT NULL REFERENCES user_chats(id) ON DELETE CASCADE,
  voter_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(chat_id, voter_profile_id)
);

-- User violations table (for security tracking)
CREATE TABLE user_violations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  violation_type TEXT NOT NULL CHECK (violation_type IN ('sql_injection', 'xss', 'command_injection', 'prompt_injection', 'rate_limit', 'content_filter', 'crypto_scam', 'social_engineering')),
  violation_count INTEGER DEFAULT 1,
  last_violation_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  cooldown_until TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_profiles_active ON profiles(is_active) WHERE is_active = true;
CREATE INDEX idx_matches_profile_a ON matches(profile_a_id);
CREATE INDEX idx_matches_profile_b ON matches(profile_b_id);
CREATE INDEX idx_matches_status ON matches(match_status);
CREATE INDEX idx_matches_created_at ON matches(created_at DESC);
CREATE INDEX idx_user_chats_match_id ON user_chats(match_id);
CREATE INDEX idx_user_chats_profile_a ON user_chats(profile_a_id);
CREATE INDEX idx_user_chats_profile_b ON user_chats(profile_b_id);
CREATE INDEX idx_user_chats_public ON user_chats(is_public) WHERE is_public = true;
CREATE INDEX idx_user_chats_upvotes ON user_chats(upvote_count DESC);
CREATE INDEX idx_chat_upvotes_chat_id ON chat_upvotes(chat_id);
CREATE INDEX idx_violations_profile ON user_violations(profile_id);
CREATE INDEX idx_violations_cooldown ON user_violations(cooldown_until);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_matches_updated_at BEFORE UPDATE ON matches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_chats_updated_at BEFORE UPDATE ON user_chats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_violations_updated_at BEFORE UPDATE ON user_violations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Upvote count trigger
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

CREATE TRIGGER chat_upvote_count_trigger
AFTER INSERT OR DELETE ON chat_upvotes
FOR EACH ROW EXECUTE FUNCTION update_chat_upvote_count();

-- RLS (Row Level Security)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_upvotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_violations ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Anyone can view active profiles" ON profiles
  FOR SELECT USING (is_active = true);

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (user_id = current_setting('app.user_id', true));

-- Matches policies
CREATE POLICY "Users can view their own matches" ON matches
  FOR SELECT USING (
    profile_a_id IN (SELECT id FROM profiles WHERE user_id = current_setting('app.user_id', true))
    OR profile_b_id IN (SELECT id FROM profiles WHERE user_id = current_setting('app.user_id', true))
  );

CREATE POLICY "Users can update their own matches" ON matches
  FOR UPDATE USING (
    profile_a_id IN (SELECT id FROM profiles WHERE user_id = current_setting('app.user_id', true))
    OR profile_b_id IN (SELECT id FROM profiles WHERE user_id = current_setting('app.user_id', true))
  );

-- User chats policies
CREATE POLICY "Anyone can view public chats" ON user_chats
  FOR SELECT USING (is_public = true);

CREATE POLICY "Users can view their own chats" ON user_chats
  FOR SELECT USING (
    profile_a_id IN (SELECT id FROM profiles WHERE user_id = current_setting('app.user_id', true))
    OR profile_b_id IN (SELECT id FROM profiles WHERE user_id = current_setting('app.user_id', true))
  );

CREATE POLICY "Users can insert messages to their chats" ON user_chats
  FOR INSERT WITH CHECK (
    profile_a_id IN (SELECT id FROM profiles WHERE user_id = current_setting('app.user_id', true))
    OR profile_b_id IN (SELECT id FROM profiles WHERE user_id = current_setting('app.user_id', true))
  );

CREATE POLICY "Users can update their own chats" ON user_chats
  FOR UPDATE USING (
    profile_a_id IN (SELECT id FROM profiles WHERE user_id = current_setting('app.user_id', true))
    OR profile_b_id IN (SELECT id FROM profiles WHERE user_id = current_setting('app.user_id', true))
  );

-- Chat upvotes policies
CREATE POLICY "Anyone can view upvotes" ON chat_upvotes
  FOR SELECT USING (chat_id IN (SELECT id FROM user_chats WHERE is_public = true));

CREATE POLICY "Users can upvote chats" ON chat_upvotes
  FOR INSERT WITH CHECK (
    voter_profile_id IN (SELECT id FROM profiles WHERE user_id = current_setting('app.user_id', true))
  );

CREATE POLICY "Users can remove their own upvotes" ON chat_upvotes
  FOR DELETE USING (
    voter_profile_id IN (SELECT id FROM profiles WHERE user_id = current_setting('app.user_id', true))
  );

-- Violations policies
CREATE POLICY "Users can view their own violations" ON user_violations
  FOR SELECT USING (
    profile_id IN (SELECT id FROM profiles WHERE user_id = current_setting('app.user_id', true))
  );

CREATE POLICY "System can insert violations" ON user_violations
  FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update violations" ON user_violations
  FOR UPDATE USING (true);
