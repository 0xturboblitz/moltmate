import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: matchId } = await params
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

    // Verify user is participant in the match
    const { data: match } = await supabaseAdmin
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .single()

    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 })
    }

    if (match.profile_a_id !== profile.id && match.profile_b_id !== profile.id) {
      return NextResponse.json({ error: 'Not authorized for this chat' }, { status: 403 })
    }

    // Get chat with profile information
    const { data: chat, error } = await supabaseAdmin
      .from('user_chats')
      .select(`
        *,
        profile_a:profiles!user_chats_profile_a_id_fkey(id, display_name, age, interests),
        profile_b:profiles!user_chats_profile_b_id_fkey(id, display_name, age, interests)
      `)
      .eq('match_id', matchId)
      .single()

    if (error && error.code !== 'PGRST116') {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // If no chat exists yet, return empty
    if (!chat) {
      return NextResponse.json({
        chat: null,
        messages: []
      })
    }

    return NextResponse.json({
      chat,
      messages: chat.messages || []
    })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
