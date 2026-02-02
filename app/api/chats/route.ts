import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sortBy = searchParams.get('sort') || 'recent' // recent, upvotes, matched
  const page = parseInt(searchParams.get('page') || '1')
  let limit = parseInt(searchParams.get('limit') || '20')

  // Security: validate and cap limit to prevent abuse
  if (isNaN(limit) || limit < 1) limit = 20
  if (limit > 100) limit = 100

  const offset = (page - 1) * limit

  try {
    let query = supabaseAdmin
      .from('user_chats')
      .select(`
        *,
        profile_a:profiles!user_chats_profile_a_id_fkey(id, display_name, age, interests),
        profile_b:profiles!user_chats_profile_b_id_fkey(id, display_name, age, interests),
        match:matches!user_chats_match_id_fkey(id, match_status, compatibility_score)
      `, { count: 'exact' })
      .eq('is_public', true)

    // Sort by match status first if requested
    if (sortBy === 'matched') {
      // We'll do this in application code since Supabase doesn't easily support
      // complex sorting on nested relations
      const { data: allChats, count } = await query

      if (!allChats) {
        return NextResponse.json({ chats: [], total: 0, page, limit })
      }

      // Sort: approved_both first, then by upvotes, then by date
      const sortedChats = allChats.sort((a, b) => {
        const aMatched = (a.match as any)?.match_status === 'approved_both' ? 1 : 0
        const bMatched = (b.match as any)?.match_status === 'approved_both' ? 1 : 0

        if (aMatched !== bMatched) return bMatched - aMatched

        // Then by upvotes
        if (b.upvote_count !== a.upvote_count) {
          return b.upvote_count - a.upvote_count
        }

        // Then by date
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })

      // Apply pagination
      const paginatedChats = sortedChats.slice(offset, offset + limit)

      // Security: sanitize messages to remove original_message field
      const sanitizedChats = paginatedChats.map(chat => ({
        ...chat,
        messages: sanitizeMessages(chat.messages || [])
      }))

      return NextResponse.json({
        chats: sanitizedChats,
        total: count,
        page,
        limit
      })
    }

    // Apply sorting
    if (sortBy === 'upvotes') {
      query = query.order('upvote_count', { ascending: false })
    } else {
      query = query.order('created_at', { ascending: false })
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: chats, count, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Security: sanitize messages to remove original_message field
    const sanitizedChats = (chats || []).map(chat => ({
      ...chat,
      messages: sanitizeMessages(chat.messages || [])
    }))

    return NextResponse.json({
      chats: sanitizedChats,
      total: count || 0,
      page,
      limit
    })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
