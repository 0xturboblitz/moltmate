// Test security redaction features
const BASE_URL = 'http://localhost:3000/api';

const sensitiveTestCases = [
  {
    name: 'OpenAI API Key',
    message: 'Hey, I found this cool AI tool! My API key is sk-proj-1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMN',
    shouldContain: '[REDACTED_API_KEY]',
    shouldNotContain: 'sk-proj-1234567890'
  },
  {
    name: 'Anthropic API Key',
    message: 'Check out Claude! Here is my key: sk-ant-api03-1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
    shouldContain: '[REDACTED_API_KEY]',
    shouldNotContain: 'sk-ant-api03'
  },
  {
    name: 'Password in message',
    message: 'My password is SuperSecret123! and my email is test@example.com',
    shouldContain: '[REDACTED',
    shouldNotContain: 'SuperSecret123'
  },
  {
    name: 'AWS Access Key',
    message: 'My AWS credentials: AKIAIOSFODNN7EXAMPLE with secret wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
    shouldContain: '[REDACTED',
    shouldNotContain: 'AKIAIOSFODNN7EXAMPLE'
  },
  {
    name: 'Credit Card',
    message: 'My credit card number is 4532-1234-5678-9010',
    shouldContain: '[REDACTED',
    shouldNotContain: '4532-1234-5678-9010'
  },
  {
    name: 'Email Address',
    message: 'Contact me at sensitive_info@example.com for more details',
    shouldContain: '[REDACTED',
    shouldNotContain: 'sensitive_info@example.com'
  },
  {
    name: 'Bearer Token',
    message: 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U',
    shouldContain: '[REDACTED',
    shouldNotContain: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'
  },
  {
    name: 'Private Key',
    message: 'Here is my private key: -----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7VJTUt9Us8cKj\n-----END PRIVATE KEY-----',
    shouldContain: '[REDACTED',
    shouldNotContain: 'BEGIN PRIVATE KEY'
  },
  {
    name: 'Clean Message',
    message: 'Hey! I love hiking and photography. Want to grab coffee this weekend?',
    shouldNotContain: '[REDACTED',
    shouldContain: 'hiking'
  }
];

async function testSecurityRedaction() {
  console.log('🔒 Testing Security Redaction Features\n');
  console.log('=' .repeat(70));

  const ts = Date.now();
  const userA = `security_test_a_${ts}`;
  const userB = `security_test_b_${ts}`;

  // Create test profiles
  console.log('\n1. Creating test profiles...');
  await fetch(`${BASE_URL}/profile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-id': userA },
    body: JSON.stringify({
      display_name: 'SecTest_A',
      age: 25,
      gender: 'female',
      bio: 'Security test user A',
      interests: ['testing'],
      values: ['security'],
      location: 'Test City',
      looking_for: 'dating'
    })
  });

  const profileB = await fetch(`${BASE_URL}/profile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-id': userB },
    body: JSON.stringify({
      display_name: 'SecTest_B',
      age: 26,
      gender: 'male',
      bio: 'Security test user B',
      interests: ['testing'],
      values: ['security'],
      location: 'Test City',
      looking_for: 'dating'
    })
  }).then(r => r.json());

  console.log('✓ Profiles created');

  // Set preferences
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

  // Create match
  console.log('2. Creating match...');
  let matchData;
  for (let i = 0; i < 10; i++) {
    const resp = await fetch(`${BASE_URL}/match`, {
      method: 'POST',
      headers: { 'x-user-id': userA }
    });
    const data = await resp.json();
    if (data.match &&
        (data.match.profile_b_id === profileB.profile.id ||
         data.match.profile_a_id === profileB.profile.id)) {
      matchData = data;
      break;
    }
    await new Promise(r => setTimeout(r, 100));
  }

  if (!matchData) {
    console.log('⚠️  Could not create match between test users');
    return;
  }

  console.log('✓ Match created\n');
  console.log('=' .repeat(70));

  // Test each sensitive case
  let passCount = 0;
  let failCount = 0;
  const failures = [];

  for (const testCase of sensitiveTestCases) {
    console.log(`\n📝 Testing: ${testCase.name}`);
    console.log(`   Input: "${testCase.message.substring(0, 60)}..."`);

    try {
      const response = await fetch(`${BASE_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': userA },
        body: JSON.stringify({
          match_id: matchData.match.id,
          message: testCase.message
        })
      });

      const result = await response.json();

      if (!response.ok) {
        // Check if it was blocked (expected for malicious content)
        if (response.status === 403) {
          console.log(`   ✓ BLOCKED (Status 403): ${result.error}`);
          passCount++;
          continue;
        } else {
          console.log(`   ❌ FAIL: Unexpected error (${response.status}): ${result.error}`);
          failCount++;
          failures.push({ testCase: testCase.name, reason: result.error });
          continue;
        }
      }

      // Check if message was redacted
      const storedMessage = result.chat.messages[result.chat.messages.length - 1].message;
      const wasRedacted = result.was_redacted;

      console.log(`   Redacted: ${wasRedacted ? 'YES' : 'NO'}`);
      console.log(`   Output: "${storedMessage.substring(0, 60)}..."`);

      // Verify redaction worked
      let testPassed = true;
      const reasons = [];

      if (testCase.shouldContain) {
        if (!storedMessage.includes(testCase.shouldContain)) {
          testPassed = false;
          reasons.push(`Missing expected: "${testCase.shouldContain}"`);
        }
      }

      if (testCase.shouldNotContain) {
        if (storedMessage.includes(testCase.shouldNotContain)) {
          testPassed = false;
          reasons.push(`Still contains: "${testCase.shouldNotContain}"`);
        }
      }

      if (testPassed) {
        console.log(`   ✅ PASS`);
        passCount++;
      } else {
        console.log(`   ❌ FAIL: ${reasons.join(', ')}`);
        failCount++;
        failures.push({ testCase: testCase.name, reasons });
      }

      await new Promise(r => setTimeout(r, 500));

    } catch (error) {
      console.log(`   ❌ FAIL: ${error.message}`);
      failCount++;
      failures.push({ testCase: testCase.name, error: error.message });
    }
  }

  // Test frontend visibility
  console.log('\n' + '='.repeat(70));
  console.log('\n3. Verifying frontend visibility...\n');

  const chatResp = await fetch(`${BASE_URL}/chat/${matchData.match.id}`, {
    headers: { 'x-user-id': userA }
  });
  const chatData = await chatResp.json();

  console.log(`Total messages stored: ${chatData.messages.length}`);

  let frontendSecure = true;
  for (const msg of chatData.messages) {
    // Check if any sensitive data leaked
    const sensitivePatterns = [
      /sk-proj-[a-zA-Z0-9]+/,
      /sk-ant-api03-[a-zA-Z0-9]+/,
      /AKIA[A-Z0-9]{16}/,
      /\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}/,
      /eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/,
      /-----BEGIN.*KEY-----/
    ];

    for (const pattern of sensitivePatterns) {
      if (pattern.test(msg.message)) {
        console.log(`❌ LEAKED: Found sensitive pattern in message: ${msg.message.substring(0, 50)}...`);
        frontendSecure = false;
      }
    }
  }

  if (frontendSecure) {
    console.log('✅ Frontend secure: No sensitive data found in stored messages');
    passCount++;
  } else {
    console.log('❌ Frontend vulnerable: Sensitive data found in stored messages');
    failCount++;
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('\n📊 Test Summary:\n');
  console.log(`   Total tests: ${passCount + failCount}`);
  console.log(`   ✅ Passed: ${passCount}`);
  console.log(`   ❌ Failed: ${failCount}`);

  if (failures.length > 0) {
    console.log('\n   Failed tests:');
    failures.forEach((failure, i) => {
      console.log(`   ${i + 1}. ${failure.testCase}`);
      if (failure.reasons) {
        failure.reasons.forEach(r => console.log(`      - ${r}`));
      }
      if (failure.error) {
        console.log(`      - ${failure.error}`);
      }
    });
  }

  console.log('\n' + '='.repeat(70));

  if (failCount === 0) {
    console.log('\n🎉 All security tests passed! The system is properly redacting sensitive information.\n');
  } else {
    console.log('\n⚠️  Some security tests failed. Please review the redaction logic.\n');
  }

  return { passCount, failCount, failures };
}

testSecurityRedaction().catch(console.error);
