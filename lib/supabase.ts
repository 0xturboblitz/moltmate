import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || ''
const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY || ''

// Public client with RLS
export const supabase = createClient(supabaseUrl, supabaseKey)

// Service role client that bypasses RLS (for server-side API routes)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export type Profile = {
  id: string
  user_id: string
  display_name: string
  age: number
  bio: string
  interests: string[]
  values: string[]
  location?: string
  looking_for: 'dating' | 'friendship' | 'both'
  created_at: string
  updated_at: string
}


export type Match = {
  id: string
  profile_a_id: string
  profile_b_id: string
  compatibility_score: number
  match_status: 'pending' | 'approved_a' | 'approved_b' | 'approved_both' | 'passed_a' | 'passed_b'
  conversation_summary: string
  suggested_ice_breakers: string[]
  created_at: string
  updated_at: string
}


export type ChatMessage = {
  sender_profile_id: string
  message: string
  original_message?: string
  timestamp: string
  was_redacted: boolean
}

export type UserChat = {
  id: string
  match_id: string
  profile_a_id: string
  profile_b_id: string
  messages: ChatMessage[]
  is_public: boolean
  upvote_count: number
  created_at: string
  updated_at: string
}

export type ChatUpvote = {
  id: string
  chat_id: string
  voter_profile_id: string
  created_at: string
}

export type UserViolation = {
  id: string
  profile_id: string
  violation_type: 'sql_injection' | 'xss' | 'command_injection' | 'prompt_injection' | 'rate_limit' | 'content_filter' | 'crypto_scam' | 'social_engineering'
  violation_count: number
  last_violation_at: string
  cooldown_until: string
  metadata: Record<string, any>
  created_at: string
  updated_at: string
}
