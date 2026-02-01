import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseKey)

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

export type Preference = {
  id: string
  profile_id: string
  age_min: number
  age_max: number
  max_distance?: number
  deal_breakers: string[]
  must_haves: string[]
  privacy_level: 'public' | 'selective' | 'private'
  created_at: string
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

export type BotConversation = {
  id: string
  match_id: string
  messages: Array<{
    bot: 'a' | 'b'
    message: string
    timestamp: string
  }>
  insights: string[]
  created_at: string
}

export type CompatibilityScore = {
  id: string
  match_id: string
  overall_score: number
  values_score: number
  lifestyle_score: number
  communication_score: number
  interests_score: number
  why_compatible: string[]
  potential_challenges: string[]
  created_at: string
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
  violation_type: 'sql_injection' | 'xss' | 'command_injection' | 'prompt_injection' | 'rate_limit' | 'content_filter'
  violation_count: number
  last_violation_at: string
  cooldown_until: string
  metadata: Record<string, any>
  created_at: string
  updated_at: string
}
