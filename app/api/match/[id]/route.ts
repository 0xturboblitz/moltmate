import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const userId = request.headers.get('x-user-id')

  if (!userId) {
    return NextResponse.json({ error: 'User ID required' }, { status: 401 })
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('user_id', userId)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  const { action } = await request.json()

  const { data: match } = await supabaseAdmin
    .from('matches')
    .select('*')
    .eq('id', id)
    .single()

  if (!match) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 })
  }

  const isProfileA = match.profile_a_id === profile.id

  let newStatus = match.match_status

  if (action === 'approve') {
    if (isProfileA) {
      newStatus = match.match_status === 'approved_b' ? 'approved_both' : 'approved_a'
    } else {
      newStatus = match.match_status === 'approved_a' ? 'approved_both' : 'approved_b'
    }
  } else if (action === 'pass') {
    newStatus = isProfileA ? 'passed_a' : 'passed_b'
  }

  const { data: updatedMatch, error } = await supabaseAdmin
    .from('matches')
    .update({ match_status: newStatus })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ match: updatedMatch })
}
