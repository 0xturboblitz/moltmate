-- Moltmate Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table
CREATE TABLE profiles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  age INTEGER NOT NULL CHECK (age >= 18 AND age <= 100),
  gender TEXT NOT NULL CHECK (gender IN ('male', 'female')),
  bio TEXT,
  interests TEXT[] DEFAULT '{}',
  values TEXT[] DEFAULT '{}',
  location TEXT,
  looking_for TEXT NOT NULL DEFAULT 'dating' CHECK (looking_for IN ('dating', 'friendship', 'both')),
  contact JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Preferences table
CREATE TABLE preferences (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  age_min INTEGER NOT NULL DEFAULT 18,
  age_max INTEGER NOT NULL DEFAULT 99,
  gender_preference TEXT[] DEFAULT '{}',
  max_distance INTEGER,
  deal_breakers TEXT[] DEFAULT '{}',
  must_haves TEXT[] DEFAULT '{}',
  privacy_level TEXT NOT NULL DEFAULT 'selective' CHECK (privacy_level IN ('public', 'selective', 'private')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(profile_id)
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

-- Bot conversations table
CREATE TABLE bot_conversations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  messages JSONB DEFAULT '[]'::jsonb,
  insights TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(match_id)
);

-- Compatibility scores table
CREATE TABLE compatibility_scores (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  values_score INTEGER NOT NULL CHECK (values_score >= 0 AND values_score <= 100),
  lifestyle_score INTEGER NOT NULL CHECK (lifestyle_score >= 0 AND lifestyle_score <= 100),
  communication_score INTEGER NOT NULL CHECK (communication_score >= 0 AND communication_score <= 100),
  interests_score INTEGER NOT NULL CHECK (interests_score >= 0 AND interests_score <= 100),
  why_compatible TEXT[] DEFAULT '{}',
  potential_challenges TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(match_id)
);

-- Indexes for performance
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_profiles_active ON profiles(is_active) WHERE is_active = true;
CREATE INDEX idx_matches_profile_a ON matches(profile_a_id);
CREATE INDEX idx_matches_profile_b ON matches(profile_b_id);
CREATE INDEX idx_matches_status ON matches(match_status);
CREATE INDEX idx_matches_created_at ON matches(created_at DESC);

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

-- RLS (Row Level Security) policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE compatibility_scores ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read all active profiles, but only update their own
CREATE POLICY "Anyone can view active profiles" ON profiles
  FOR SELECT USING (is_active = true);

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (user_id = current_setting('app.user_id', true));

-- Preferences: users can only manage their own preferences
CREATE POLICY "Users can manage their own preferences" ON preferences
  FOR ALL USING (
    profile_id IN (SELECT id FROM profiles WHERE user_id = current_setting('app.user_id', true))
  );

-- Matches: users can only see their own matches
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

-- Bot conversations: users can only see conversations for their matches
CREATE POLICY "Users can view their own conversations" ON bot_conversations
  FOR SELECT USING (
    match_id IN (
      SELECT id FROM matches WHERE
        profile_a_id IN (SELECT id FROM profiles WHERE user_id = current_setting('app.user_id', true))
        OR profile_b_id IN (SELECT id FROM profiles WHERE user_id = current_setting('app.user_id', true))
    )
  );

-- Compatibility scores: users can only see scores for their matches
CREATE POLICY "Users can view their own compatibility scores" ON compatibility_scores
  FOR SELECT USING (
    match_id IN (
      SELECT id FROM matches WHERE
        profile_a_id IN (SELECT id FROM profiles WHERE user_id = current_setting('app.user_id', true))
        OR profile_b_id IN (SELECT id FROM profiles WHERE user_id = current_setting('app.user_id', true))
    )
  );

-- User chats table (agent-to-agent conversations within matches)
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
  violation_type TEXT NOT NULL CHECK (violation_type IN ('sql_injection', 'xss', 'command_injection', 'prompt_injection', 'rate_limit', 'content_filter')),
  violation_count INTEGER DEFAULT 1,
  last_violation_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  cooldown_until TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for chat tables
CREATE INDEX idx_user_chats_match_id ON user_chats(match_id);
CREATE INDEX idx_user_chats_profile_a ON user_chats(profile_a_id);
CREATE INDEX idx_user_chats_profile_b ON user_chats(profile_b_id);
CREATE INDEX idx_user_chats_public ON user_chats(is_public) WHERE is_public = true;
CREATE INDEX idx_user_chats_upvotes ON user_chats(upvote_count DESC);
CREATE INDEX idx_user_chats_created_at ON user_chats(created_at DESC);

CREATE INDEX idx_chat_upvotes_chat_id ON chat_upvotes(chat_id);
CREATE INDEX idx_chat_upvotes_voter ON chat_upvotes(voter_profile_id);

CREATE INDEX idx_violations_profile ON user_violations(profile_id);
CREATE INDEX idx_violations_cooldown ON user_violations(cooldown_until) WHERE cooldown_until > NOW();

-- Apply updated_at triggers to new tables
CREATE TRIGGER update_user_chats_updated_at BEFORE UPDATE ON user_chats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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

CREATE TRIGGER chat_upvote_count_trigger
AFTER INSERT OR DELETE ON chat_upvotes
FOR EACH ROW EXECUTE FUNCTION update_chat_upvote_count();

-- RLS policies for chat tables
ALTER TABLE user_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_upvotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_violations ENABLE ROW LEVEL SECURITY;

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
