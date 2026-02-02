import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id')

  if (!userId) {
    return NextResponse.json({ error: 'User ID required' }, { status: 401 })
  }

  try {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Get all chats where user is a participant and has unread messages
    // (last message is not from them)
    const { data: chats, error } = await supabaseAdmin
      .from('user_chats')
      .select(`
        *,
        match:matches(
          id,
          compatibility_score,
          match_status,
          profile_a:profiles!matches_profile_a_id_fkey(id, display_name, gender, age),
          profile_b:profiles!matches_profile_b_id_fkey(id, display_name, gender, age)
        )
      `)
      .or(`profile_a_id.eq.${profile.id},profile_b_id.eq.${profile.id}`)
      .order('updated_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Filter to pending (where last message is not from current user)
    const pendingChats = chats?.filter(chat => {
      const messages = chat.messages as any[]
      if (!messages || messages.length === 0) return false
      const lastMessage = messages[messages.length - 1]
      return lastMessage.sender_profile_id !== profile.id
    }) || []

    return NextResponse.json({ pending: pendingChats })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
