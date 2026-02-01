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

-- Disable RLS for API access (agents will use service role key)
-- RLS would require setting app.user_id context which is complex with simple API calls
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE preferences DISABLE ROW LEVEL SECURITY;
ALTER TABLE matches DISABLE ROW LEVEL SECURITY;
ALTER TABLE bot_conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE compatibility_scores DISABLE ROW LEVEL SECURITY;

-- RLS policies removed - using DISABLE ROW LEVEL SECURITY instead
-- Agents will authenticate via x-user-id header at API level
-- Service role key will be used for all database operations
