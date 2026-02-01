// Debug message sending
const BASE_URL = 'http://localhost:3000/api';

async function testMessages() {
  const ts = Date.now();
  const userA = `test_a_${ts}`;
  const userB = `test_b_${ts}`;

  console.log('Creating profiles...');

  // Create profiles
  await fetch(`${BASE_URL}/profile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-id': userA },
    body: JSON.stringify({
      display_name: 'Alice',
      age: 25,
      gender: 'female',
      bio: 'Test user A',
      interests: ['test'],
      values: ['testing'],
      location: 'Test City',
      looking_for: 'dating'
    })
  });

  await fetch(`${BASE_URL}/profile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-id': userB },
    body: JSON.stringify({
      display_name: 'Bob',
      age: 26,
      gender: 'male',
      bio: 'Test user B',
      interests: ['test'],
      values: ['testing'],
      location: 'Test City',
      looking_for: 'dating'
    })
  });

  console.log('Setting preferences...');
  await fetch(`${BASE_URL}/preferences`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-id': userA },
    body: JSON.stringify({ age_min: 20, age_max: 30, gender_preference: ['male'], privacy_level: 'public' })
  });

  await fetch(`${BASE_URL}/preferences`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-id': userB },
    body: JSON.stringify({ age_min: 20, age_max: 30, gender_preference: ['female'], privacy_level: 'public' })
  });

  console.log('Creating match...');
  const matchResp = await fetch(`${BASE_URL}/match`, {
    method: 'POST',
    headers: { 'x-user-id': userA }
  });
  const matchData = await matchResp.json();
  const matchId = matchData.match.id;
  console.log(`Match ID: ${matchId}`);
  console.log(`Profile A: ${matchData.match.profile_a_id}`);
  console.log(`Profile B: ${matchData.match.profile_b_id}`);

  // Send message 1 from Alice
  console.log('\nSending message 1 from Alice...');
  const msg1Resp = await fetch(`${BASE_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-id': userA },
    body: JSON.stringify({ match_id: matchId, message: 'Message 1 from Alice' })
  });
  const msg1Data = await msg1Resp.json();
  console.log(`Chat ID: ${msg1Data.chat.id}`);
  console.log(`Messages in chat: ${msg1Data.chat.messages.length}`);
  console.log(`Last sender: ${msg1Data.chat.messages[msg1Data.chat.messages.length - 1].sender_profile_id}`);

  // Wait a bit
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Send message 2 from Bob
  console.log('\nSending message 2 from Bob...');
  const msg2Resp = await fetch(`${BASE_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-id': userB },
    body: JSON.stringify({ match_id: matchId, message: 'Message 2 from Bob' })
  });
  const msg2Data = await msg2Resp.json();
  if (!msg2Data.chat) {
    console.error('Error from Bob:', msg2Data);
    return;
  }
  console.log(`Messages in chat: ${msg2Data.chat.messages.length}`);
  console.log(`Last sender: ${msg2Data.chat.messages[msg2Data.chat.messages.length - 1].sender_profile_id}`);

  // Wait a bit
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Send message 3 from Alice
  console.log('\nSending message 3 from Alice...');
  const msg3Resp = await fetch(`${BASE_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-id': userA },
    body: JSON.stringify({ match_id: matchId, message: 'Message 3 from Alice' })
  });
  const msg3Data = await msg3Resp.json();
  console.log(`Messages in chat: ${msg3Data.chat.messages.length}`);
  console.log(`Last sender: ${msg3Data.chat.messages[msg3Data.chat.messages.length - 1].sender_profile_id}`);

  // Check final state
  console.log('\nFinal check via GET...');
  const chatResp = await fetch(`${BASE_URL}/chat/${matchId}`, {
    headers: { 'x-user-id': userA }
  });
  const chatData = await chatResp.json();
  console.log(`\nTotal messages: ${chatData.messages.length}`);
  chatData.messages.forEach((msg, i) => {
    console.log(`${i + 1}. ${msg.message} (sender: ${msg.sender_profile_id.substring(0, 8)}...)`);
  });
}

testMessages().catch(console.error);
