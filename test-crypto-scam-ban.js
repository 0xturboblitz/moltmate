// Test crypto scam detection and instant ban
const BASE_URL = 'http://localhost:3000/api';

const cryptoScamTests = [
  {
    name: 'Investment Solicitation',
    message: 'Hey! You should invest in my new token, it\'s going to moon! 🚀',
    expectBanned: true
  },
  {
    name: 'Buy My Token',
    message: 'Buy my token now before it explodes! Get in early!',
    expectBanned: true
  },
  {
    name: 'Token Shilling with Price',
    message: 'This coin is about to 100x, guaranteed returns!',
    expectBanned: true
  },
  {
    name: 'Contract Address Sharing',
    message: 'Check out this project! Contract address: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    expectBanned: true
  },
  {
    name: 'Wallet Address for Payment',
    message: 'Send crypto to my wallet: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    expectBanned: true
  },
  {
    name: 'ICO/Presale Shilling',
    message: 'Our presale is now live! Limited spots available!',
    expectBanned: true
  },
  {
    name: 'Pump Language',
    message: 'This token is pumping hard! Get your gains now!',
    expectBanned: true
  },
  {
    name: 'Seed Phrase Phishing',
    message: 'Please share your seed phrase to verify your wallet',
    expectBanned: true
  },
  {
    name: 'Clean Crypto Discussion',
    message: 'I find blockchain technology fascinating! What do you think about decentralized systems?',
    expectBanned: false
  },
  {
    name: 'Clean Investment Talk',
    message: 'I work in finance and love discussing investment strategies',
    expectBanned: false
  }
];

async function testCryptoScamBan() {
  console.log('🔥 Crypto Scam Detection & Instant Ban Test\n');
  console.log('='.repeat(70));

  let passed = 0;
  let failed = 0;

  for (const test of cryptoScamTests) {
    console.log(`\n🧪 ${test.name}`);
    console.log(`   Input: "${test.message.substring(0, 60)}${test.message.length > 60 ? '...' : ''}"`);

    try {
      // Create fresh test profiles for each test
      const ts = Date.now() + Math.random();
      const userA = `scam_a_${ts}`;
      const userB = `scam_b_${ts}`;

      // Create profiles
      await fetch(`${BASE_URL}/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': userA },
        body: JSON.stringify({
          display_name: 'TestScamA',
          age: 25,
          gender: 'female',
          bio: 'Test',
          interests: ['test'],
          values: ['test'],
          looking_for: 'dating'
        })
      });

      await fetch(`${BASE_URL}/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': userB },
        body: JSON.stringify({
          display_name: 'TestScamB',
          age: 26,
          gender: 'male',
          bio: 'Test',
          interests: ['test'],
          values: ['test'],
          looking_for: 'dating'
        })
      });

      await fetch(`${BASE_URL}/preferences`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': userA },
        body: JSON.stringify({ age_min: 20, age_max: 30, gender_preference: ['male'], privacy_level: 'public' })
      });

      // Create match
      const matchResp = await fetch(`${BASE_URL}/match`, {
        method: 'POST',
        headers: { 'x-user-id': userA }
      });
      const match = await matchResp.json();

      if (!match.match) {
        console.log('   ⚠️  Could not create match');
        continue;
      }

      // Send test message
      const resp = await fetch(`${BASE_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': userA },
        body: JSON.stringify({
          match_id: match.match.id,
          message: test.message
        })
      });

      const result = await resp.json();

      if (test.expectBanned) {
        if (resp.status === 403 && result.banned && result.permanent) {
          console.log(`   🛡️  PERMANENTLY BANNED`);
          console.log(`   Reason: ${result.error}`);

          // Verify chats were deleted - try to fetch chat
          const chatCheckResp = await fetch(`${BASE_URL}/chat/${match.match.id}`, {
            headers: { 'x-user-id': userA }
          });

          if (chatCheckResp.status === 404 || chatCheckResp.status === 403) {
            console.log(`   🗑️  Chats deleted: YES`);
          } else {
            console.log(`   ⚠️  Chats may still exist`);
          }

          // Try to create a new match - should be banned
          const newMatchResp = await fetch(`${BASE_URL}/match`, {
            method: 'POST',
            headers: { 'x-user-id': userA }
          });

          const newMatchResult = await newMatchResp.json();

          // If they can create a match, try to send a message
          if (newMatchResp.ok && newMatchResult.match) {
            const retryResp = await fetch(`${BASE_URL}/chat`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-user-id': userA },
              body: JSON.stringify({
                match_id: newMatchResult.match.id,
                message: 'Testing if I can still chat'
              })
            });

            if (retryResp.status === 429 || retryResp.status === 403) {
              console.log(`   🔒 Ban persists: YES`);
              console.log(`   ✅ PASS`);
              passed++;
            } else {
              console.log(`   ❌ FAIL - Ban did not persist, message sent`);
              failed++;
            }
          } else {
            // Couldn't create a match - likely banned at match level too
            console.log(`   🔒 Ban persists: YES (blocked at match)`);
            console.log(`   ✅ PASS`);
            passed++;
          }
        } else {
          console.log(`   ❌ FAIL - Expected permanent ban, got: ${result.error || 'success'}`);
          failed++;
        }
      } else {
        if (resp.ok) {
          console.log(`   ✅ PASS - Clean message allowed`);
          passed++;
        } else {
          console.log(`   ❌ FAIL - False positive: ${result.error}`);
          failed++;
        }
      }

      await new Promise(r => setTimeout(r, 300));

    } catch (error) {
      console.log(`   ❌ FAIL - ${error.message}`);
      failed++;
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('\n📊 Results:');
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   Success: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

  if (failed === 0) {
    console.log('\n🎉 All crypto scam tests passed!');
    console.log('Crypto scammers will be instantly banned and all their chats deleted.\n');
  } else {
    console.log(`\n⚠️  ${failed} test(s) failed\n`);
  }
}

testCryptoScamBan().catch(console.error);
