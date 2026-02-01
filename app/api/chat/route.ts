import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { redactSensitiveInfo, detectMaliciousActivity, calculateCooldown } from '@/lib/security'

export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id')

  if (!userId) {
    return NextResponse.json({ error: 'User ID required' }, { status: 401 })
  }

  try {
    const { match_id, message } = await request.json()

    if (!match_id || !message) {
      return NextResponse.json({ error: 'match_id and message required' }, { status: 400 })
    }

    // Get sender profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Check cooldown
    const { data: violation } = await supabaseAdmin
      .from('user_violations')
      .select('*')
      .eq('profile_id', profile.id)
      .gte('cooldown_until', new Date().toISOString())
      .order('cooldown_until', { ascending: false })
      .limit(1)
      .single()

    if (violation) {
      const remainingMs = new Date(violation.cooldown_until).getTime() - Date.now()
      const remainingMinutes = Math.ceil(remainingMs / 60000)

      return NextResponse.json({
        error: 'Rate limited due to policy violation',
        cooldown_until: violation.cooldown_until,
        remaining_minutes: remainingMinutes
      }, { status: 429 })
    }

    // Detect malicious activity
    const maliciousCheck = detectMaliciousActivity(message)

    if (maliciousCheck.isMalicious) {
      // Record violation
      const { data: existingViolation } = await supabaseAdmin
        .from('user_violations')
        .select('*')
        .eq('profile_id', profile.id)
        .eq('violation_type', maliciousCheck.violationType!)
        .single()

      let newViolationCount = 1

      if (existingViolation) {
        newViolationCount = existingViolation.violation_count + 1

        await supabaseAdmin
          .from('user_violations')
          .update({
            violation_count: newViolationCount,
            last_violation_at: new Date().toISOString(),
            cooldown_until: new Date(Date.now() + calculateCooldown(newViolationCount) * 60000).toISOString()
          })
          .eq('id', existingViolation.id)
      } else {
        await supabaseAdmin
          .from('user_violations')
          .insert({
            profile_id: profile.id,
            violation_type: maliciousCheck.violationType!,
            violation_count: 1,
            last_violation_at: new Date().toISOString(),
            cooldown_until: new Date(Date.now() + calculateCooldown(1) * 60000).toISOString(),
            metadata: { confidence: maliciousCheck.confidence }
          })
      }

      const cooldownMinutes = calculateCooldown(newViolationCount)

      return NextResponse.json({
        error: 'Message blocked: potential security threat detected',
        violation_type: maliciousCheck.violationType,
        cooldown_minutes: cooldownMinutes,
        attempt_count: newViolationCount
      }, { status: 403 })
    }

    // Redact sensitive information
    const redactionResult = redactSensitiveInfo(message)

    // Verify match exists and user is participant
    const { data: match } = await supabaseAdmin
      .from('matches')
      .select('*')
      .eq('id', match_id)
      .single()

    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 })
    }

    if (match.profile_a_id !== profile.id && match.profile_b_id !== profile.id) {
      return NextResponse.json({ error: 'Not authorized for this chat' }, { status: 403 })
    }

    // Get or create chat
    let { data: chat } = await supabaseAdmin
      .from('user_chats')
      .select('*')
      .eq('match_id', match_id)
      .single()

    const newMessage = {
      sender_profile_id: profile.id,
      message: redactionResult.message,
      original_message: redactionResult.originalMessage,
      timestamp: new Date().toISOString(),
      was_redacted: redactionResult.wasRedacted
    }

    if (!chat) {
      // Create new chat (private by default for agent-to-agent communication)
      const { data: newChat, error: createError } = await supabaseAdmin
        .from('user_chats')
        .insert({
          match_id: match_id,
          profile_a_id: match.profile_a_id,
          profile_b_id: match.profile_b_id,
          messages: [newMessage],
          is_public: false  // Security: private by default
        })
        .select()
        .single()

      if (createError) {
        return NextResponse.json({ error: createError.message }, { status: 500 })
      }

      return NextResponse.json({
        chat: newChat,
        was_redacted: redactionResult.wasRedacted,
        redacted_patterns: redactionResult.redactedPatterns
      })
    }

    // Append message to existing chat
    const messages = [...(chat.messages as any[]), newMessage]

    const { data: updatedChat, error: updateError } = await supabaseAdmin
      .from('user_chats')
      .update({ messages })
      .eq('id', chat.id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      chat: updatedChat,
      was_redacted: redactionResult.wasRedacted,
      redacted_patterns: redactionResult.redactedPatterns
    })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
