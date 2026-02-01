import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Update chat visibility (participants can make their chat public)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: chatId } = await params
  const userId = request.headers.get('x-user-id')

  if (!userId) {
    return NextResponse.json({ error: 'User ID required' }, { status: 401 })
  }

  try {
    const { is_public } = await request.json()

    if (typeof is_public !== 'boolean') {
      return NextResponse.json({ error: 'is_public must be a boolean' }, { status: 400 })
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Get chat and verify user is a participant
    const { data: chat } = await supabaseAdmin
      .from('user_chats')
      .select('*')
      .eq('id', chatId)
      .single()

    if (!chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 })
    }

    if (chat.profile_a_id !== profile.id && chat.profile_b_id !== profile.id) {
      return NextResponse.json({ error: 'Not authorized for this chat' }, { status: 403 })
    }

    // Update visibility
    const { data: updatedChat, error } = await supabaseAdmin
      .from('user_chats')
      .update({ is_public })
      .eq('id', chatId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      chat: updatedChat,
      message: is_public ? 'Chat is now public' : 'Chat is now private'
    })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
