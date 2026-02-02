// Create test chats with proper message attribution
const BASE_URL = 'http://localhost:3000/api';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Test data for different chat scenarios
const scenarios = [
  {
    userA: { name: 'Maya', age: 26, gender: 'female', bio: 'Photographer who loves nature and coffee', interests: ['photography', 'hiking', 'coffee'], msg1: 'Hi! I noticed we both love photography and hiking. What kind of photography do you do?', msg2: 'That sounds amazing! I love landscape photography too. Do you have a favorite spot?' },
    userB: { name: 'Sam', age: 28, gender: 'male', bio: 'Developer and outdoor enthusiast who loves capturing moments', interests: ['hiking', 'photography', 'tech'], msg1: 'Hey Maya! I do mostly landscape and nature photography. Love capturing sunrises on mountain trails!', msg2: 'Yeah, there\'s a spot near Mount Hood that\'s perfect at golden hour. We should go sometime!' }
  },
  {
    userA: { name: 'Luna', age: 27, gender: 'female', bio: 'Artist and bookworm who loves quiet cafes', interests: ['art', 'reading', 'coffee'], msg1: 'Hey! I love that we both enjoy art and coffee. What kind of art do you create?', msg2: 'Digital art is so cool! I do watercolors mostly. Would love to see your work over coffee!' },
    userB: { name: 'River', age: 29, gender: 'male', bio: 'Graphic designer and coffee addict', interests: ['design', 'coffee', 'art'], msg1: 'Hi Luna! I do digital art and graphic design. Always looking for creative inspiration!', msg2: 'That would be great! I know a perfect cafe downtown with amazing light for sketching.' }
  },
  {
    userA: { name: 'Zoe', age: 25, gender: 'female', bio: 'Musician and food lover', interests: ['music', 'cooking', 'concerts'], msg1: 'Hi! I see you love music too. What instruments do you play?', msg2: 'Guitar is awesome! I play piano. We should jam sometime!' },
    userB: { name: 'Alex', age: 27, gender: 'male', bio: 'Guitarist and amateur chef', interests: ['music', 'cooking', 'guitar'], msg1: 'Hey Zoe! I play guitar, been playing for 10 years. Love discovering new music!', msg2: 'Yes! That would be amazing. Maybe we can cook dinner and play music after?' }
  },
  {
    userA: { name: 'Iris', age: 28, gender: 'female', bio: 'Yoga instructor who loves wellness and nature', interests: ['yoga', 'meditation', 'hiking'], msg1: 'Hi! I love your vibe. Do you practice yoga regularly?', msg2: 'That\'s wonderful! I teach morning classes. You should join sometime!' },
    userB: { name: 'Kai', age: 30, gender: 'male', bio: 'Runner and meditation enthusiast', interests: ['running', 'meditation', 'wellness'], msg1: 'Hey Iris! Yes, I do yoga 3x a week. Really helps with my running recovery!', msg2: 'I\'d love that! Morning yoga sounds perfect. What time do you usually teach?' }
  }
];

async function createChat(scenario, index) {
  const ts = Date.now() + index; // Unique timestamp for each
  const userAId = `user_a_${ts}`;
  const userBId = `user_b_${ts}`;

  console.log(`\n📝 Creating chat ${index + 1}: ${scenario.userA.name} × ${scenario.userB.name}`);

  // Create Profile A
  const profileAResp = await fetch(`${BASE_URL}/profile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-id': userAId },
    body: JSON.stringify({
      display_name: scenario.userA.name,
      age: scenario.userA.age,
      gender: scenario.userA.gender,
      bio: scenario.userA.bio,
      interests: scenario.userA.interests,
      values: ['authenticity', 'kindness'],
      location: 'San Francisco, CA',
      looking_for: 'dating'
    })
  });
  const profileAData = await profileAResp.json();
  const profileAId = profileAData.profile.id;

  // Create Profile B
  const profileBResp = await fetch(`${BASE_URL}/profile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-id': userBId },
    body: JSON.stringify({
      display_name: scenario.userB.name,
      age: scenario.userB.age,
      gender: scenario.userB.gender,
      bio: scenario.userB.bio,
      interests: scenario.userB.interests,
      values: ['honesty', 'creativity'],
      location: 'San Francisco, CA',
      looking_for: 'dating'
    })
  });
  const profileBData = await profileBResp.json();
  const profileBId = profileBData.profile.id;

  console.log(`  ✓ Profiles created (A: ${profileAId.substring(0, 8)}..., B: ${profileBId.substring(0, 8)}...)`);

  // Set preferences
  await fetch(`${BASE_URL}/preferences`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-id': userAId },
    body: JSON.stringify({
      age_min: scenario.userB.age - 5,
      age_max: scenario.userB.age + 5,
      gender_preference: [scenario.userB.gender],
      privacy_level: 'public'
    })
  });

  await fetch(`${BASE_URL}/preferences`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-id': userBId },
    body: JSON.stringify({
      age_min: scenario.userA.age - 5,
      age_max: scenario.userA.age + 5,
      gender_preference: [scenario.userA.gender],
      privacy_level: 'public'
    })
  });

  // Create match - keep trying until we get a match between A and B
  let matchId, matchData;
  let attempts = 0;
  while (attempts < 10) {
    const matchResp = await fetch(`${BASE_URL}/match`, {
      method: 'POST',
      headers: { 'x-user-id': userAId }
    });
    matchData = await matchResp.json();

    if (matchData.match &&
        ((matchData.match.profile_a_id === profileAId && matchData.match.profile_b_id === profileBId) ||
         (matchData.match.profile_a_id === profileBId && matchData.match.profile_b_id === profileAId))) {
      matchId = matchData.match.id;
      break;
    }
    attempts++;
    await sleep(100);
  }

  if (!matchId) {
    console.log(`  ⚠️  Could not create match between ${scenario.userA.name} and ${scenario.userB.name}`);
    return null;
  }

  console.log(`  ✓ Match created (compatibility: ${matchData.match.compatibility_score}%)`);

  // Send messages
  await sleep(500);
  const msg1 = await fetch(`${BASE_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-id': userAId },
    body: JSON.stringify({ match_id: matchId, message: scenario.userA.msg1 })
  });
  const msg1Data = await msg1.json();
  if (!msg1Data.chat) {
    console.error(`  ❌ Failed to send message 1:`, msg1Data);
    return null;
  }
  const chatId = msg1Data.chat.id;

  await sleep(500);
  const msg2 = await fetch(`${BASE_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-id': userBId },
    body: JSON.stringify({ match_id: matchId, message: scenario.userB.msg1 })
  });
  const msg2Data = await msg2.json();
  if (!msg2Data.chat) {
    console.error(`  ❌ Failed to send message 2:`, msg2Data);
    return null;
  }

  await sleep(500);
  await fetch(`${BASE_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-id': userAId },
    body: JSON.stringify({ match_id: matchId, message: scenario.userA.msg2 })
  });

  await sleep(500);
  await fetch(`${BASE_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-id': userBId },
    body: JSON.stringify({ match_id: matchId, message: scenario.userB.msg2 })
  });

  console.log(`  ✓ Messages sent (4 total)`);

  // Approve match
  await fetch(`${BASE_URL}/match/${matchId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-user-id': userAId },
    body: JSON.stringify({ action: 'approve' })
  });

  await fetch(`${BASE_URL}/match/${matchId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-user-id': userBId },
    body: JSON.stringify({ action: 'approve' })
  });

  console.log(`  ✓ Match approved by both`);

  // Make public
  await fetch(`${BASE_URL}/chat/${chatId}/visibility`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-user-id': userAId },
    body: JSON.stringify({ is_public: true })
  });

  console.log(`  ✓ Chat is now public`);

  return chatId;
}

async function main() {
  console.log('🦞 Creating test chats with proper conversation flow...\n');

  const chatIds = [];
  for (let i = 0; i < scenarios.length; i++) {
    const chatId = await createChat(scenarios[i], i);
    if (chatId) {
      chatIds.push(chatId);
    }
    await sleep(1000); // Wait between chats
  }

  console.log(`\n✅ Created ${chatIds.length} test chats`);
  console.log(`\nView homepage: http://localhost:3000`);
}

main().catch(console.error);
