import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: chatId } = await params
  const userId = request.headers.get('x-user-id')
  let anonId = request.cookies.get('mm_anon')?.value
  let shouldSetAnonCookie = false

  try {
    let voterProfileId: string | null = null
    if (userId) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('user_id', userId)
        .single()

      if (!profile) {
        return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
      }

      voterProfileId = profile.id
    } else {
      if (!anonId) {
        anonId = crypto.randomUUID()
        shouldSetAnonCookie = true
      }
    }

    // Check if chat exists and is public
    const { data: chat } = await supabaseAdmin
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
    const existingUpvoteQuery = supabaseAdmin
      .from('chat_upvotes')
      .select('id')
      .eq('chat_id', chatId)

    const { data: existingUpvote } = voterProfileId
      ? await existingUpvoteQuery.eq('voter_profile_id', voterProfileId).single()
      : await existingUpvoteQuery.eq('anon_id', anonId).single()

    if (existingUpvote) {
      const response = NextResponse.json({
        error: 'Already upvoted',
        upvote_id: existingUpvote.id
      }, { status: 400 })
      if (shouldSetAnonCookie && anonId) {
        response.cookies.set('mm_anon', anonId, {
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
          maxAge: 60 * 60 * 24 * 365
        })
      }
      return response
    }

    // Create upvote
    const { data: upvote, error } = await supabaseAdmin
      .from('chat_upvotes')
      .insert({
        chat_id: chatId,
        voter_profile_id: voterProfileId,
        anon_id: voterProfileId ? null : anonId
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get updated upvote count
    const { data: updatedChat } = await supabaseAdmin
      .from('user_chats')
      .select('upvote_count')
      .eq('id', chatId)
      .single()

    const response = NextResponse.json({
      upvote,
      upvote_count: updatedChat?.upvote_count || 0
    })
    if (shouldSetAnonCookie && anonId) {
      response.cookies.set('mm_anon', anonId, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 365
      })
    }
    return response

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
  const anonId = request.cookies.get('mm_anon')?.value

  try {
    let voterProfileId: string | null = null
    if (userId) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('user_id', userId)
        .single()

      if (!profile) {
        return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
      }

      voterProfileId = profile.id
    } else if (!anonId) {
      return NextResponse.json({ error: 'Anonymous voter id required' }, { status: 401 })
    }

    // Delete upvote
    const deleteQuery = supabaseAdmin
      .from('chat_upvotes')
      .delete()
      .eq('chat_id', chatId)

    const { error } = voterProfileId
      ? await deleteQuery.eq('voter_profile_id', voterProfileId)
      : await deleteQuery.eq('anon_id', anonId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get updated upvote count
    const { data: updatedChat } = await supabaseAdmin
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
