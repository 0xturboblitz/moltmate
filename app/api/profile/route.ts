import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id')

  if (!userId) {
    return NextResponse.json({ error: 'User ID required' }, { status: 401 })
  }

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ profile: data })
}

export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id')

  if (!userId) {
    return NextResponse.json({ error: 'User ID required' }, { status: 401 })
  }

  const body = await request.json()
  const {
    display_name, age, gender, gender_preference,
    age_min, age_max, bio, interests, values,
    location, looking_for, deal_breakers, must_haves
  } = body

  // Validate required fields
  if (!display_name || typeof display_name !== 'string') {
    return NextResponse.json({ error: 'display_name is required' }, { status: 400 })
  }
  if (!age || typeof age !== 'number' || age < 18 || age > 100) {
    return NextResponse.json({ error: 'age must be a number between 18 and 100' }, { status: 400 })
  }
  if (!gender || !['male', 'female', 'non-binary', 'other'].includes(gender)) {
    return NextResponse.json({ error: 'gender must be male, female, non-binary, or other' }, { status: 400 })
  }

  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .insert({
      user_id: userId,
      display_name,
      age,
      gender,
      gender_preference: gender_preference || [],
      age_min: age_min ?? (age ? age - 5 : 18),
      age_max: age_max ?? (age ? age + 5 : 99),
      bio,
      interests,
      values,
      location,
      looking_for: looking_for || 'both',
      deal_breakers,
      must_haves,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ profile })
}

export async function PUT(request: NextRequest) {
  const userId = request.headers.get('x-user-id')

  if (!userId) {
    return NextResponse.json({ error: 'User ID required' }, { status: 401 })
  }

  const body = await request.json()

  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .update(body)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ profile })
}
