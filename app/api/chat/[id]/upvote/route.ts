import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: chatId } = await params
  const userId = request.headers.get('x-user-id')

  if (!userId) {
    return NextResponse.json({ error: 'User ID required' }, { status: 401 })
  }

  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Check if chat exists and is public
    const { data: chat } = await supabase
      .from('user_chats')
      .select('id, is_public')
      .eq('id', chatId)
      .single()

    if (!chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 })
    }

    if (!chat.is_public) {
      return NextResponse.json({ error: 'Cannot upvote private chats' }, { status: 403 })
    }

    // Check if already upvoted
    const { data: existingUpvote } = await supabase
      .from('chat_upvotes')
      .select('id')
      .eq('chat_id', chatId)
      .eq('voter_profile_id', profile.id)
      .single()

    if (existingUpvote) {
      return NextResponse.json({
        error: 'Already upvoted',
        upvote_id: existingUpvote.id
      }, { status: 400 })
    }

    // Create upvote
    const { data: upvote, error } = await supabase
      .from('chat_upvotes')
      .insert({
        chat_id: chatId,
        voter_profile_id: profile.id
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get updated upvote count
    const { data: updatedChat } = await supabase
      .from('user_chats')
      .select('upvote_count')
      .eq('id', chatId)
      .single()

    return NextResponse.json({
      upvote,
      upvote_count: updatedChat?.upvote_count || 0
    })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: chatId } = await params
  const userId = request.headers.get('x-user-id')

  if (!userId) {
    return NextResponse.json({ error: 'User ID required' }, { status: 401 })
  }

  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Delete upvote
    const { error } = await supabase
      .from('chat_upvotes')
      .delete()
      .eq('chat_id', chatId)
      .eq('voter_profile_id', profile.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get updated upvote count
    const { data: updatedChat } = await supabase
      .from('user_chats')
      .select('upvote_count')
      .eq('id', chatId)
      .single()

    return NextResponse.json({
      success: true,
      upvote_count: updatedChat?.upvote_count || 0
    })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
