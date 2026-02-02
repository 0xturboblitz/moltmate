import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
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

  const { data: matches, error } = await supabaseAdmin
    .from('matches')
    .select(`
      *,
      profile_a:profiles!matches_profile_a_id_fkey(id, display_name, age, bio, interests),
      profile_b:profiles!matches_profile_b_id_fkey(id, display_name, age, bio, interests)
    `)
    .or(`profile_a_id.eq.${profile.id},profile_b_id.eq.${profile.id}`)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ matches })
}

export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id')

  if (!userId) {
    return NextResponse.json({ error: 'User ID required' }, { status: 401 })
  }

  const { data: myProfile } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (!myProfile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  // Get all existing matches for this user to exclude
  const { data: existingMatches } = await supabaseAdmin
    .from('matches')
    .select('profile_a_id, profile_b_id')
    .or(`profile_a_id.eq.${myProfile.id},profile_b_id.eq.${myProfile.id}`)

  const matchedProfileIds = new Set(
    (existingMatches || []).flatMap(m => [m.profile_a_id, m.profile_b_id])
  )
  matchedProfileIds.delete(myProfile.id)

  const { data: allCandidates } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .neq('id', myProfile.id)
    .eq('is_active', true)
    .gte('age', myProfile.age_min || 18)
    .lte('age', myProfile.age_max || 99)

  // Filter candidates by:
  // 1. Not already matched
  // 2. Gender preference (mutual - they want my gender, I want theirs)
  const candidates = (allCandidates || []).filter(c => {
    if (matchedProfileIds.has(c.id)) return false

    // Check mutual gender compatibility
    const theyWantMyGender = c.gender_preference?.length === 0 || c.gender_preference?.includes(myProfile.gender)
    const iWantTheirGender = myProfile.gender_preference?.length === 0 || myProfile.gender_preference?.includes(c.gender)
    const myAgeInTheirRange = myProfile.age >= (c.age_min || 18) && myProfile.age <= (c.age_max || 99)

    return theyWantMyGender && iWantTheirGender && myAgeInTheirRange
  })

  if (candidates.length === 0) {
    return NextResponse.json({ message: 'No candidates available' }, { status: 200 })
  }

  const randomCandidate = candidates[Math.floor(Math.random() * candidates.length)]

  const compatibilityScore = Math.floor(Math.random() * 40) + 60

  const { data: newMatch, error } = await supabaseAdmin
    .from('matches')
    .insert({
      profile_a_id: myProfile.id,
      profile_b_id: randomCandidate.id,
      compatibility_score: compatibilityScore,
      match_status: 'pending',
      suggested_ice_breakers: [
        `Ask them about their favorite ${myProfile.interests?.[0] || 'hobby'}`,
        `Discuss your shared interest in ${randomCandidate.interests?.[0] || 'life'}`,
        `Talk about what ${myProfile.values?.[0] || 'authenticity'} means to you`
      ]
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ match: newMatch })
}
