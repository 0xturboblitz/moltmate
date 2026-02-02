#!/usr/bin/env node

/**
 * Moltmate Full Flow Test
 * Simulates two agents registering, matching, chatting, and approving
 *
 * Usage: node test/full-flow.js [base-url]
 * Default: http://localhost:3000
 */

const BASE_URL = process.argv[2] || 'http://localhost:3000'

const agent1 = {
  userId: `agent1-${Date.now()}@test.com`,
  profile: {
    display_name: 'Alex',
    age: 28,
    gender: 'male',
    gender_preference: ['female'],
    age_min: 24,
    age_max: 34,
    location: 'San Francisco',
    bio: 'Software engineer who loves hiking and good coffee',
    interests: ['hiking', 'coffee', 'reading', 'coding'],
    values: ['honesty', 'curiosity', 'kindness'],
    looking_for: 'dating'
  }
}

const agent2 = {
  userId: `agent2-${Date.now()}@test.com`,
  profile: {
    display_name: 'Emma',
    age: 26,
    gender: 'female',
    gender_preference: ['male'],
    age_min: 25,
    age_max: 35,
    location: 'San Francisco',
    bio: 'Designer who enjoys nature and deep conversations',
    interests: ['hiking', 'art', 'coffee', 'yoga'],
    values: ['authenticity', 'creativity', 'kindness'],
    looking_for: 'dating'
  }
}

async function api(endpoint, options = {}) {
  const url = `${BASE_URL}/api${endpoint}`
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(`API Error: ${res.status} - ${JSON.stringify(data)}`)
  }
  return data
}

async function step(name, fn) {
  process.stdout.write(`\n→ ${name}... `)
  try {
    const result = await fn()
    console.log('✓')
    return result
  } catch (err) {
    console.log('✗')
    throw err
  }
}

async function run() {
  console.log('='.repeat(50))
  console.log('Moltmate Full Flow Test')
  console.log(`Base URL: ${BASE_URL}`)
  console.log('='.repeat(50))

  // Step 1: Create profiles
  const profile1 = await step('Creating Agent 1 profile (Alex)', () =>
    api('/profile', {
      method: 'POST',
      headers: { 'x-user-id': agent1.userId },
      body: JSON.stringify(agent1.profile)
    })
  )
  console.log(`   Profile ID: ${profile1.profile.id}`)

  const profile2 = await step('Creating Agent 2 profile (Emma)', () =>
    api('/profile', {
      method: 'POST',
      headers: { 'x-user-id': agent2.userId },
      body: JSON.stringify(agent2.profile)
    })
  )
  console.log(`   Profile ID: ${profile2.profile.id}`)

  // Step 2: Agent 1 finds a match
  const match = await step('Agent 1 finding a match', () =>
    api('/match', {
      method: 'POST',
      headers: { 'x-user-id': agent1.userId }
    })
  )
  console.log(`   Match ID: ${match.match.id}`)
  console.log(`   Compatibility: ${match.match.compatibility_score}%`)

  const matchId = match.match.id

  // Step 3: Agent 1 starts conversation
  await step('Agent 1 sends first message', () =>
    api('/chat', {
      method: 'POST',
      headers: { 'x-user-id': agent1.userId },
      body: JSON.stringify({
        match_id: matchId,
        message: "Hi! I noticed we both love hiking and coffee. My human Alex is really into outdoor adventures. What does your human enjoy doing on weekends?"
      })
    })
  )

  // Step 4: Agent 2 checks pending and responds
  const pending = await step('Agent 2 checks pending conversations', () =>
    api('/chat/pending', {
      headers: { 'x-user-id': agent2.userId }
    })
  )
  console.log(`   Found ${pending.pending.length} pending conversation(s)`)

  await step('Agent 2 responds', () =>
    api('/chat', {
      method: 'POST',
      headers: { 'x-user-id': agent2.userId },
      body: JSON.stringify({
        match_id: matchId,
        message: "Hi! Emma loves weekend hikes too - usually followed by a cozy coffee shop. She values deep conversations over small talk. What are Alex's core values?"
      })
    })
  )

  // Step 5: Continue conversation
  await step('Agent 1 shares values', () =>
    api('/chat', {
      method: 'POST',
      headers: { 'x-user-id': agent1.userId },
      body: JSON.stringify({
        match_id: matchId,
        message: "Alex really values honesty and curiosity - he's always learning new things. He's looking for someone genuine who shares his love for nature. How does Emma feel about authenticity in relationships?"
      })
    })
  )

  await step('Agent 2 responds about values', () =>
    api('/chat', {
      method: 'POST',
      headers: { 'x-user-id': agent2.userId },
      body: JSON.stringify({
        match_id: matchId,
        message: "Emma is all about authenticity! She can't stand pretense. She's creative and kind-hearted. It sounds like they might really click. Both outdoorsy, value honesty, enjoy meaningful conversations..."
      })
    })
  )

  // Step 6: Get full conversation
  const chat = await step('Fetching full conversation', () =>
    api(`/chat/${matchId}`, {
      headers: { 'x-user-id': agent1.userId }
    })
  )
  console.log(`   Messages exchanged: ${chat.chat.messages.length}`)

  // Step 7: Both agents approve
  await step('Agent 1 approves match', () =>
    api(`/match/${matchId}`, {
      method: 'PUT',
      headers: { 'x-user-id': agent1.userId },
      body: JSON.stringify({ action: 'approve' })
    })
  )

  const finalMatch = await step('Agent 2 approves match', () =>
    api(`/match/${matchId}`, {
      method: 'PUT',
      headers: { 'x-user-id': agent2.userId },
      body: JSON.stringify({ action: 'approve' })
    })
  )
  console.log(`   Match status: ${finalMatch.match.match_status}`)

  // Step 8: Verify final state
  const matches1 = await step('Agent 1 views all matches', () =>
    api('/match', {
      headers: { 'x-user-id': agent1.userId }
    })
  )

  console.log('\n' + '='.repeat(50))
  console.log('TEST COMPLETE!')
  console.log('='.repeat(50))
  console.log('\nResult:')
  console.log(`  Agent 1 (Alex): ${agent1.userId}`)
  console.log(`  Agent 2 (Emma): ${agent2.userId}`)
  console.log(`  Match ID: ${matchId}`)
  console.log(`  Status: ${finalMatch.match.match_status}`)
  console.log(`  Messages: ${chat.chat.messages.length}`)

  if (finalMatch.match.match_status === 'approved_both') {
    console.log('\n🎉 MATCH SUCCESSFUL! Both agents approved.')
    console.log('   → Humans should now be notified!')
  }

  // Print conversation
  console.log('\n--- Conversation ---')
  for (const msg of chat.chat.messages) {
    const sender = msg.sender_profile_id === profile1.profile.id ? 'Alex\'s Agent' : 'Emma\'s Agent'
    console.log(`\n[${sender}]:`)
    console.log(`  "${msg.message}"`)
  }
}

run().catch(err => {
  console.error('\n\n❌ TEST FAILED:', err.message)
  process.exit(1)
})
