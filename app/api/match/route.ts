import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id')

  if (!userId) {
    return NextResponse.json({ error: 'User ID required' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', userId)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  const { data: matches, error } = await supabase
    .from('matches')
    .select(`
      *,
      profile_a:profiles!matches_profile_a_id_fkey(id, display_name, age, bio, interests),
      profile_b:profiles!matches_profile_b_id_fkey(id, display_name, age, bio, interests),
      compatibility_scores(*)
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

  const { data: myProfile } = await supabase
    .from('profiles')
    .select('*, preferences(*)')
    .eq('user_id', userId)
    .single()

  if (!myProfile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  const prefs = myProfile.preferences

  const { data: candidates } = await supabase
    .from('profiles')
    .select('*')
    .neq('id', myProfile.id)
    .eq('is_active', true)
    .gte('age', prefs?.age_min || 18)
    .lte('age', prefs?.age_max || 99)

  if (!candidates || candidates.length === 0) {
    return NextResponse.json({ message: 'No candidates available' }, { status: 200 })
  }

  const randomCandidate = candidates[Math.floor(Math.random() * candidates.length)]

  const existingMatch = await supabase
    .from('matches')
    .select('id')
    .or(`and(profile_a_id.eq.${myProfile.id},profile_b_id.eq.${randomCandidate.id}),and(profile_a_id.eq.${randomCandidate.id},profile_b_id.eq.${myProfile.id})`)
    .single()

  if (existingMatch.data) {
    return NextResponse.json({ message: 'Match already exists', match: existingMatch.data })
  }

  const compatibilityScore = Math.floor(Math.random() * 40) + 60

  const { data: newMatch, error } = await supabase
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

  await supabase.from('compatibility_scores').insert({
    match_id: newMatch.id,
    overall_score: compatibilityScore,
    values_score: Math.floor(Math.random() * 40) + 60,
    lifestyle_score: Math.floor(Math.random() * 40) + 60,
    communication_score: Math.floor(Math.random() * 40) + 60,
    interests_score: Math.floor(Math.random() * 40) + 60,
    why_compatible: [
      'Both value authentic communication',
      'Similar life goals and aspirations',
      'Compatible communication styles'
    ],
    potential_challenges: [
      'Different approaches to planning',
      'May need to align on long-term expectations'
    ]
  })

  return NextResponse.json({ match: newMatch })
}
