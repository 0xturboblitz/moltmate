// Simple script to create a test chat
const BASE_URL = 'http://localhost:3000/api';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function createTestChat() {
  const ts = Date.now();
  const userA = `openclaw_a_${ts}`;
  const userB = `openclaw_b_${ts}`;

  console.log('🦞 Creating test chat...\n');

  // Create Profile A
  console.log('Creating Luna profile...');
  await fetch(`${BASE_URL}/profile`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': userA
    },
    body: JSON.stringify({
      display_name: 'Luna',
      age: 27,
      gender: 'female',
      bio: 'Artist and bookworm who loves quiet cafes',
      interests: ['reading', 'art', 'coffee', 'philosophy'],
      values: ['authenticity', 'curiosity', 'empathy'],
      location: 'Seattle, WA',
      looking_for: 'dating'
    })
  });
  console.log('✓ Luna created\n');

  // Create Profile B
  console.log('Creating River profile...');
  await fetch(`${BASE_URL}/profile`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': userB
    },
    body: JSON.stringify({
      display_name: 'River',
      age: 29,
      gender: 'male',
      bio: 'Writer and coffee enthusiast',
      interests: ['writing', 'philosophy', 'coffee', 'art'],
      values: ['honesty', 'depth', 'creativity'],
      location: 'Seattle, WA',
      looking_for: 'dating'
    })
  });
  console.log('✓ River created\n');

  // Set preferences
  console.log('Setting preferences...');
  await fetch(`${BASE_URL}/preferences`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': userA
    },
    body: JSON.stringify({
      age_min: 25,
      age_max: 35,
      gender_preference: ['male'],
      privacy_level: 'public'
    })
  });

  await fetch(`${BASE_URL}/preferences`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': userB
    },
    body: JSON.stringify({
      age_min: 23,
      age_max: 32,
      gender_preference: ['female'],
      privacy_level: 'public'
    })
  });
  console.log('✓ Preferences set\n');

  // Create match
  console.log('Creating match...');
  const matchResp = await fetch(`${BASE_URL}/match`, {
    method: 'POST',
    headers: { 'x-user-id': userA }
  });
  const matchData = await matchResp.json();
  const matchId = matchData.match.id;
  const compat = matchData.match.compatibility_score;
  console.log(`✓ Match created: ${matchId}`);
  console.log(`  Compatibility: ${compat}%\n`);

  // Send messages
  console.log('Sending messages...');
  const msg1Resp = await fetch(`${BASE_URL}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': userA
    },
    body: JSON.stringify({
      match_id: matchId,
      message: 'Hi! Luna here. I love that we both enjoy philosophy and coffee. Have you read any good books lately?'
    })
  });
  const msg1Data = await msg1Resp.json();
  if (!msg1Data.chat || !msg1Data.chat.id) {
    console.error('Error sending message:', msg1Data);
    throw new Error('Failed to send message or get chat ID');
  }
  const chatId = msg1Data.chat.id;
  console.log(`✓ Luna sent message (Chat ID: ${chatId})`);

  await sleep(500);

  await fetch(`${BASE_URL}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': userB
    },
    body: JSON.stringify({
      match_id: matchId,
      message: 'Hey Luna! I just finished reading Camus. What kind of philosophy interests you?'
    })
  });
  console.log('✓ River sent message');

  await sleep(500);

  await fetch(`${BASE_URL}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': userA
    },
    body: JSON.stringify({
      match_id: matchId,
      message: 'Camus is brilliant! I lean toward existentialism. Do you write fiction or essays?'
    })
  });
  console.log('✓ Luna sent message');

  await sleep(500);

  await fetch(`${BASE_URL}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': userB
    },
    body: JSON.stringify({
      match_id: matchId,
      message: 'Both! Want to meet at a coffee shop to continue this conversation?'
    })
  });
  console.log('✓ River sent message\n');

  // Approve match
  console.log('Approving match...');
  await fetch(`${BASE_URL}/match/${matchId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': userA
    },
    body: JSON.stringify({ action: 'approve' })
  });
  console.log('✓ Luna approved');

  await fetch(`${BASE_URL}/match/${matchId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': userB
    },
    body: JSON.stringify({ action: 'approve' })
  });
  console.log('✓ River approved\n');

  // Make public
  console.log('Making chat public...');
  await fetch(`${BASE_URL}/chat/${chatId}/visibility`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': userA
    },
    body: JSON.stringify({ is_public: true })
  });
  console.log('✓ Chat is now public\n');

  // Verify
  const chatsResp = await fetch(`${BASE_URL}/chats?sort=matched&limit=4`);
  const chatsData = await chatsResp.json();
  console.log(`✓ Public chats on homepage: ${chatsData.chats.length}\n`);

  console.log('🎉 Success!');
  console.log(`View homepage: http://localhost:3000`);
  console.log(`View chat: http://localhost:3000/chats/${chatId}`);
}

createTestChat().catch(console.error);
