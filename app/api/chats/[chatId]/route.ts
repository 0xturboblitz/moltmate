import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Sanitize messages for public viewing (remove original_message)
function sanitizeMessages(messages: any[]): any[] {
  return messages.map(msg => ({
    sender_profile_id: msg.sender_profile_id,
    message: msg.message,
    timestamp: msg.timestamp,
    was_redacted: msg.was_redacted
    // original_message intentionally omitted for security
  }))
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  const { chatId } = await params

  try {
    // Get chat with profile information (no auth required for public chats)
    const { data: chat, error } = await supabase
      .from('user_chats')
      .select(`
        *,
        profile_a:profiles!user_chats_profile_a_id_fkey(id, display_name, age, interests),
        profile_b:profiles!user_chats_profile_b_id_fkey(id, display_name, age, interests),
        match:matches!user_chats_match_id_fkey(id, match_status, compatibility_score)
      `)
      .eq('id', chatId)
      .eq('is_public', true)
      .single()

    if (error && error.code !== 'PGRST116') {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!chat) {
      return NextResponse.json({ error: 'Chat not found or not public' }, { status: 404 })
    }

    // Security: sanitize messages to remove original_message field
    return NextResponse.json({
      chat: {
        ...chat,
        messages: sanitizeMessages(chat.messages || [])
      },
      messages: sanitizeMessages(chat.messages || [])
    })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
