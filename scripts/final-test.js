// Final comprehensive test
const BASE_URL = 'http://localhost:3000/api';

async function finalTest() {
  console.log('🦞 Running final comprehensive test...\n');

  const ts = Date.now();
  const userA = `final_a_${ts}`;
  const userB = `final_b_${ts}`;

  // Create profiles
  console.log('1. Creating profiles...');
  const profileA = await fetch(`${BASE_URL}/profile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-id': userA },
    body: JSON.stringify({
      display_name: 'Sophie',
      age: 24,
      gender: 'female',
      bio: 'Dancer and travel enthusiast',
      interests: ['dance', 'travel', 'yoga'],
      values: ['adventure', 'growth'],
      location: 'NYC',
      looking_for: 'dating'
    })
  }).then(r => r.json());

  const profileB = await fetch(`${BASE_URL}/profile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-id': userB },
    body: JSON.stringify({
      display_name: 'Jordan',
      age: 26,
      gender: 'male',
      bio: 'Photographer who loves adventure',
      interests: ['photography', 'travel', 'hiking'],
      values: ['creativity', 'exploration'],
      location: 'NYC',
      looking_for: 'dating'
    })
  }).then(r => r.json());

  console.log(`   ✓ Sophie (${profileA.profile.id.substring(0, 8)}...)`);
  console.log(`   ✓ Jordan (${profileB.profile.id.substring(0, 8)}...)\n`);

  // Set preferences
  console.log('2. Setting preferences...');
  await fetch(`${BASE_URL}/preferences`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-id': userA },
    body: JSON.stringify({ age_min: 23, age_max: 30, gender_preference: ['male'], privacy_level: 'public' })
  });
  await fetch(`${BASE_URL}/preferences`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-id': userB },
    body: JSON.stringify({ age_min: 22, age_max: 28, gender_preference: ['female'], privacy_level: 'public' })
  });
  console.log('   ✓ Preferences set\n');

  // Create match
  console.log('3. Creating match...');
  let matchData;
  for (let i = 0; i < 5; i++) {
    const resp = await fetch(`${BASE_URL}/match`, {
      method: 'POST',
      headers: { 'x-user-id': userA }
    });
    const data = await resp.json();
    if (data.match &&
        ((data.match.profile_a_id === profileA.profile.id && data.match.profile_b_id === profileB.profile.id) ||
         (data.match.profile_a_id === profileB.profile.id && data.match.profile_b_id === profileA.profile.id))) {
      matchData = data;
      break;
    }
  }

  if (!matchData) {
    console.log('   ⚠️  Could not create match between Sophie and Jordan');
    return;
  }

  console.log(`   ✓ Match created (${matchData.match.compatibility_score}% compatible)\n`);

  // Send messages
  console.log('4. Sending messages...');
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const msg1 = await fetch(`${BASE_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-id': userA },
    body: JSON.stringify({
      match_id: matchData.match.id,
      message: 'Hey! I love that we both enjoy travel. What\'s your favorite place you\'ve visited?'
    })
  }).then(r => r.json());

  console.log(`   ✓ Sophie: "${msg1.chat.messages[0].message.substring(0, 50)}..."`);
  await sleep(500);

  const msg2 = await fetch(`${BASE_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-id': userB },
    body: JSON.stringify({
      match_id: matchData.match.id,
      message: 'Hi Sophie! Japan was incredible - amazing for photography. Where are you hoping to go next?'
    })
  }).then(r => r.json());

  console.log(`   ✓ Jordan: "${msg2.chat.messages[1].message.substring(0, 50)}..."`);
  await sleep(500);

  await fetch(`${BASE_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-id': userA },
    body: JSON.stringify({
      match_id: matchData.match.id,
      message: 'Japan is on my list! I\'m planning a dance retreat in Bali soon. Would love to see your photos!'
    })
  });

  console.log(`   ✓ Sophie: "Japan is on my list! I'm planning a dance retreat..."`);
  await sleep(500);

  await fetch(`${BASE_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-id': userB },
    body: JSON.stringify({
      match_id: matchData.match.id,
      message: 'Bali sounds amazing! I\'d love to show you my travel photography over coffee sometime?'
    })
  });

  console.log(`   ✓ Jordan: "Bali sounds amazing! I'd love to show you my trav..."\n`);

  // Approve match
  console.log('5. Approving match...');
  await fetch(`${BASE_URL}/match/${matchData.match.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-user-id': userA },
    body: JSON.stringify({ action: 'approve' })
  });
  await fetch(`${BASE_URL}/match/${matchData.match.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-user-id': userB },
    body: JSON.stringify({ action: 'approve' })
  });
  console.log('   ✓ Both approved\n');

  // Make public
  console.log('6. Making chat public...');
  await fetch(`${BASE_URL}/chat/${msg1.chat.id}/visibility`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-user-id': userA },
    body: JSON.stringify({ is_public: true })
  });
  console.log('   ✓ Chat is public\n');

  // Verify
  console.log('7. Verifying conversation...');
  const finalChat = await fetch(`${BASE_URL}/chat/${matchData.match.id}`, {
    headers: { 'x-user-id': userA }
  }).then(r => r.json());

  console.log(`   ✓ ${finalChat.messages.length} messages stored`);
  console.log(`   ✓ Messages from both users:\n`);

  finalChat.messages.forEach((msg, i) => {
    const isSophie = msg.sender_profile_id === profileA.profile.id;
    const sender = isSophie ? 'Sophie' : 'Jordan';
    console.log(`      ${i + 1}. [${sender}] ${msg.message}`);
  });

  console.log(`\n✅ Test complete! View at: http://localhost:3000/chats/${msg1.chat.id}`);
}

finalTest().catch(console.error);
