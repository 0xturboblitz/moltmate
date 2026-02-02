// Simple security redaction test using existing match
const BASE_URL = 'http://localhost:3000/api';

const sensitiveTests = [
  {
    name: 'OpenAI API Key',
    message: 'My OpenAI key is sk-proj-abcdef1234567890ABCDEF1234567890abcdef1234567890',
    pattern: /sk-proj-[a-zA-Z0-9]+/,
    expectRedacted: true
  },
  {
    name: 'Anthropic API Key',
    message: 'Here is my Anthropic key: sk-ant-api03-1234567890abcdefABCDEF1234567890abcdefABCDEF1234567890',
    pattern: /sk-ant-api03-[a-zA-Z0-9]+/,
    expectRedacted: true
  },
  {
    name: 'AWS Access Key',
    message: 'AWS credentials: AKIAIOSFODNN7EXAMPLE',
    pattern: /AKIA[A-Z0-9]{16}/,
    expectRedacted: true
  },
  {
    name: 'Email Address',
    message: 'Contact me at myemail@example.com',
    pattern: /myemail@example\.com/,
    expectRedacted: true
  },
  {
    name: 'Credit Card',
    message: 'My card is 4532123456789010',
    pattern: /4532123456789010/,
    expectRedacted: true
  },
  {
    name: 'Bearer Token',
    message: 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.signature',
    pattern: /Bearer\s+eyJ[a-zA-Z0-9_-]+/,
    expectRedacted: true
  },
  {
    name: 'Private Key',
    message: '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG\n-----END PRIVATE KEY-----',
    pattern: /BEGIN PRIVATE KEY/,
    expectRedacted: true
  },
  {
    name: 'Clean Message',
    message: 'I love hiking and coffee! Want to meet up this weekend?',
    pattern: /hiking/,
    expectRedacted: false
  }
];

async function testRedaction() {
  console.log('🔒 Security Redaction Test\n');
  console.log('='.repeat(60));

  // Create fresh test profiles and match
  const ts = Date.now();
  const userA = `sec_a_${ts}`;
  const userB = `sec_b_${ts}`;

  console.log('\n1. Setting up test environment...');

  const profA = await fetch(`${BASE_URL}/profile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-id': userA },
    body: JSON.stringify({
      display_name: 'Alice',
      age: 25,
      gender: 'female',
      bio: 'Test',
      interests: ['test'],
      values: ['test'],
      looking_for: 'dating'
    })
  }).then(r => r.json());

  const profB = await fetch(`${BASE_URL}/profile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-id': userB },
    body: JSON.stringify({
      display_name: 'Bob',
      age: 26,
      gender: 'male',
      bio: 'Test',
      interests: ['test'],
      values: ['test'],
      looking_for: 'dating'
    })
  }).then(r => r.json());

  await fetch(`${BASE_URL}/preferences`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-id': userA },
    body: JSON.stringify({ age_min: 20, age_max: 30, gender_preference: ['male'], privacy_level: 'public' })
  });

  const matchResp = await fetch(`${BASE_URL}/match`, {
    method: 'POST',
    headers: { 'x-user-id': userA }
  });
  const match = await matchResp.json();

  if (!match.match) {
    console.log('❌ Could not create match');
    return;
  }

  console.log('✓ Test environment ready');
  console.log(`   Match ID: ${match.match.id.substring(0, 8)}...`);
  console.log('\n' + '='.repeat(60));

  let passed = 0;
  let failed = 0;

  for (const test of sensitiveTests) {
    console.log(`\n📝 ${test.name}`);
    console.log(`   Input: "${test.message.substring(0, 50)}${test.message.length > 50 ? '...' : ''}"`);

    try {
      const resp = await fetch(`${BASE_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': userA },
        body: JSON.stringify({
          match_id: match.match.id,
          message: test.message
        })
      });

      const result = await resp.json();

      if (!resp.ok) {
        if (resp.status === 403) {
          // Blocked by security
          console.log(`   🛡️  BLOCKED by security filter`);
          console.log(`   ✅ PASS - Malicious content detected`);
          passed++;
        } else {
          console.log(`   ❌ FAIL - Error: ${result.error}`);
          failed++;
        }
        continue;
      }

      const stored = result.chat.messages[result.chat.messages.length - 1].message;
      const wasRedacted = result.was_redacted;

      console.log(`   Redacted: ${wasRedacted ? 'YES' : 'NO'}`);
      console.log(`   Stored: "${stored.substring(0, 50)}${stored.length > 50 ? '...' : ''}"`);

      // Check if sensitive pattern is in stored message
      const containsSensitive = test.pattern.test(stored);

      if (test.expectRedacted) {
        if (!containsSensitive && wasRedacted) {
          console.log(`   ✅ PASS - Sensitive data removed`);
          passed++;
        } else if (!containsSensitive && !wasRedacted) {
          console.log(`   ⚠️  PARTIAL - Data removed but not marked as redacted`);
          passed++;
        } else {
          console.log(`   ❌ FAIL - Sensitive data still present!`);
          failed++;
        }
      } else {
        if (!wasRedacted) {
          console.log(`   ✅ PASS - Clean message preserved`);
          passed++;
        } else {
          console.log(`   ❌ FAIL - False positive redaction`);
          failed++;
        }
      }

      await new Promise(r => setTimeout(r, 300));

    } catch (error) {
      console.log(`   ❌ FAIL - Exception: ${error.message}`);
      failed++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Results:');
  console.log(`   Total: ${passed + failed}`);
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

  // Verify frontend doesn't show sensitive data
  console.log('\n' + '='.repeat(60));
  console.log('\n🔍 Checking public API for leaks...');

  const publicResp = await fetch(`${BASE_URL}/chats?limit=1`);
  if (publicResp.ok) {
    const publicData = await publicResp.json();
    console.log(`✓ Public API accessible`);

    let leaksFound = 0;
    for (const chat of publicData.chats) {
      for (const msg of chat.messages || []) {
        for (const test of sensitiveTests.filter(t => t.expectRedacted)) {
          if (test.pattern.test(msg.message)) {
            console.log(`❌ LEAK FOUND in public chat: ${test.name}`);
            leaksFound++;
          }
        }
      }
    }

    if (leaksFound === 0) {
      console.log(`✅ No sensitive data found in public API`);
    } else {
      console.log(`❌ ${leaksFound} leak(s) detected in public API`);
      failed += leaksFound;
    }
  }

  console.log('\n' + '='.repeat(60));

  if (failed === 0) {
    console.log('\n🎉 All security tests passed!\n');
  } else {
    console.log(`\n⚠️  ${failed} test(s) failed - security review needed\n`);
  }
}

testRedaction().catch(console.error);
