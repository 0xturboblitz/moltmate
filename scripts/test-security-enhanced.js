// Enhanced security test including crypto keys and short API keys
const BASE_URL = 'http://localhost:3000/api';

const enhancedTests = [
  {
    name: 'Short OpenAI Key (sk-abc123)',
    message: 'My key is sk-abc123def456',
    shouldNotContain: 'sk-abc123def456',
    expectRedacted: true
  },
  {
    name: 'Crypto Private Key (64 hex)',
    message: 'Private key: 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    shouldNotContain: '1234567890abcdef1234567890abcdef',
    expectRedacted: true
  },
  {
    name: 'Crypto Private Key (no 0x prefix)',
    message: 'My wallet key: abcd1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab',
    shouldNotContain: 'abcd1234567890abcdef',
    expectRedacted: true
  },
  {
    name: '12-word Mnemonic',
    message: 'Seed phrase: witch collapse practice feed shame open despair creek road again ice least',
    shouldNotContain: 'witch collapse practice',
    expectRedacted: true
  },
  {
    name: 'AWS Secret Key',
    message: 'Secret: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
    shouldNotContain: 'wJalrXUtnFEMI/K7MDENG',
    expectRedacted: true
  },
  {
    name: 'Clean Crypto Discussion',
    message: 'I love discussing crypto and blockchain technology!',
    shouldContain: 'crypto',
    expectRedacted: false
  }
];

async function testEnhancedSecurity() {
  console.log('🔐 Enhanced Security Test (Crypto + Short Keys)\n');
  console.log('='.repeat(60));

  const ts = Date.now();
  const userA = `enh_a_${ts}`;
  const userB = `enh_b_${ts}`;

  console.log('\nSetting up test environment...');

  await fetch(`${BASE_URL}/profile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-id': userA },
    body: JSON.stringify({
      display_name: 'TestA',
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
      display_name: 'TestB',
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

  const matchResp = await fetch(`${BASE_URL}/match`, {
    method: 'POST',
    headers: { 'x-user-id': userA }
  });
  const match = await matchResp.json();

  if (!match.match) {
    console.log('❌ Could not create match');
    return;
  }

  console.log('✓ Ready\n');
  console.log('='.repeat(60));

  let passed = 0;
  let failed = 0;

  for (const test of enhancedTests) {
    console.log(`\n🧪 ${test.name}`);
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
          console.log(`   🛡️  BLOCKED`);
          console.log(`   ✅ PASS`);
          passed++;
        } else {
          console.log(`   ❌ FAIL - ${result.error}`);
          failed++;
        }
        continue;
      }

      const stored = result.chat.messages[result.chat.messages.length - 1].message;
      const wasRedacted = result.was_redacted;

      console.log(`   Redacted: ${wasRedacted ? 'YES' : 'NO'}`);
      console.log(`   Output: "${stored.substring(0, 50)}${stored.length > 50 ? '...' : ''}"`);

      if (test.expectRedacted) {
        const leaked = test.shouldNotContain && stored.includes(test.shouldNotContain);
        if (!leaked && wasRedacted) {
          console.log(`   ✅ PASS - Sensitive data removed`);
          passed++;
        } else if (leaked) {
          console.log(`   ❌ FAIL - Data still present: "${test.shouldNotContain}"`);
          failed++;
        } else {
          console.log(`   ⚠️  PARTIAL - Data removed but not marked redacted`);
          passed++;
        }
      } else {
        if (!wasRedacted && stored.includes(test.shouldContain)) {
          console.log(`   ✅ PASS - Clean message preserved`);
          passed++;
        } else {
          console.log(`   ❌ FAIL - False positive`);
          failed++;
        }
      }

      await new Promise(r => setTimeout(r, 300));

    } catch (error) {
      console.log(`   ❌ FAIL - ${error.message}`);
      failed++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Results:');
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   Success: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

  if (failed === 0) {
    console.log('\n🎉 All enhanced security tests passed!\n');
  } else {
    console.log(`\n⚠️  ${failed} test(s) failed\n`);
  }
}

testEnhancedSecurity().catch(console.error);
