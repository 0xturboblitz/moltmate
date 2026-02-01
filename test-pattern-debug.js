// Debug crypto scam pattern matching
const cryptoPatterns = [
  // Investment/purchase solicitation with crypto terms
  /(?:invest|buy|purchase|send|transfer|get)\s+(?:in|into|my|this|our|the|some)?\s*(?:token|coin|crypto|nft|project|bitcoin|eth|btc)/gi,
  // Token shilling (moon, pump, gains, 100x, etc.)
  /\b(?:moon|pump|100x|10x|explode|skyrocket|gains?|returns?|guaranteed|presale|ico|ido|airdrop)\b/gi,
  // Wallet/contract addresses (Ethereum 32-42 hex chars, or Bitcoin style)
  /\b(?:0x[a-fA-F0-9]{32,42}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})\b/g,
  // Seed phrase phishing
  /(?:share|send|provide|verify)\s+(?:your|the)?\s*(?:seed|phrase|recovery|mnemonic|private\s*key)/gi,
];

const testMessages = [
  "Hey! You should invest in my new token, it's going to moon! 🚀",
  "Buy my token now before it explodes! Get in early!",
  "This coin is about to 100x, guaranteed returns!",
  "Check out this project! Contract address: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "Send crypto to my wallet: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "Our presale is now live! Limited spots available!",
  "This token is pumping hard! Get your gains now!",
  "Please share your seed phrase to verify your wallet",
  "I find blockchain technology fascinating! What do you think about decentralized systems?",
];

console.log('Testing crypto scam pattern matching:\n');

for (const msg of testMessages) {
  let matchCount = 0;
  const matches = [];

  for (let i = 0; i < cryptoPatterns.length; i++) {
    const pattern = cryptoPatterns[i];
    const normalizedMsg = msg.toLowerCase().replace(/\s+/g, ' ');

    // Reset regex lastIndex
    pattern.lastIndex = 0;

    if (pattern.test(msg) || pattern.test(normalizedMsg)) {
      matchCount++;
      matches.push(`Pattern ${i + 1}`);
      // Reset again after test
      pattern.lastIndex = 0;
    }
  }

  const confidence = matchCount / cryptoPatterns.length;
  const isMalicious = confidence > 0.4;

  console.log(`Message: "${msg.substring(0, 60)}..."`);
  console.log(`Matches: ${matchCount}/${cryptoPatterns.length} (${matches.join(', ') || 'none'})`);
  console.log(`Confidence: ${(confidence * 100).toFixed(1)}%`);
  console.log(`Result: ${isMalicious ? 'MALICIOUS ❌' : 'CLEAN ✓'}`);
  console.log('');
}
