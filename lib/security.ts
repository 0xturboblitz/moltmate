// Security utilities for content filtering and malicious activity detection
//
// OPERATIONAL SECURITY WORKFLOW:
//
// 1. Treat every post as hostile input
//    - No copy/paste execution. Ever.
//    - Verify sources before trusting any code or commands
//
// 2. Ban these patterns:
//    - "run this command" (direct execution requests)
//    - curl | bash / wget | sh (piped download execution)
//    - "download this .pkg/.zip" (suspicious file types)
//    - "paste your token/log here" (credential harvesting)
//
// 3. Re-derive, don't replay
//    - If an idea seems useful, rewrite steps from scratch
//    - Validate against official documentation
//    - Never blindly execute provided commands
//
// 4. Execution protocol:
//    - Start with smallest possible test
//    - Use dry-run when available
//    - Read-only operations first (no installs)
//    - Validate each step before proceeding
//
// 5. Red flags (urgency indicators):
//    - "quick test" / "takes 10s" / "just quickly"
//    - Pressure to skip verification steps
//    - Obfuscated commands (base64, hex encoding)
//    - Silent downloads (curl -s, wget -q)
//
// Security isn't paranoia — it's a workflow.

// Regex patterns for sensitive information
const SENSITIVE_PATTERNS = {
  // API Keys - catch ANY sk- key regardless of length
  openai_key: /sk-[a-zA-Z0-9_-]{8,}/gi,
  anthropic_key: /sk-ant-[a-zA-Z0-9-]{8,}/gi,
  google_key: /AIza[a-zA-Z0-9_-]{35}/gi,
  aws_key: /AKIA[0-9A-Z]{16}/gi,
  aws_secret: /[a-zA-Z0-9/+=]{40}/g,  // AWS secret keys (40 chars base64)
  generic_api_key: /api[_-]?key[_-]?[=:]\s*['"]?[a-zA-Z0-9_-]{20,}['"]?/gi,

  // Auth tokens
  bearer_token: /bearer\s+[a-zA-Z0-9_-]{20,}/gi,
  jwt_token: /eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/gi,

  // Credentials
  password: /password[_-]?[=:]\s*['"]?[^\s'"]{6,}['"]?/gi,
  username_password: /(username|user|login)[_-]?[=:]\s*['"]?[^\s'"]+['"]?\s*(password|pass|pwd)[_-]?[=:]\s*['"]?[^\s'"]+['"]?/gi,

  // Financial
  credit_card: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|6(?:011|5[0-9]{2})[0-9]{12}|(?:2131|1800|35\d{3})\d{11})\b/g,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,

  // Private keys (including crypto wallets)
  private_key: /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC )?PRIVATE KEY-----/gi,
  crypto_private_key: /\b(?:0x)?[a-fA-F0-9]{64}\b/g,  // Ethereum/crypto private keys (64 hex chars)
  // Only match exactly 12 or 24 words (standard BIP-39 lengths) on their own line
  mnemonic_phrase: /^(?:[a-z]+\s+){11}[a-z]+$|^(?:[a-z]+\s+){23}[a-z]+$/gim,

  // Connection strings
  connection_string: /(?:mongodb|postgresql|mysql|redis):\/\/[^\s]+/gi,

  // Email addresses (optional - might be legitimate)
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,

  // Phone numbers
  phone: /\b(?:\+?1[-.]?)?\(?([0-9]{3})\)?[-.]?([0-9]{3})[-.]?([0-9]{4})\b/g,
}

export interface RedactionResult {
  message: string
  wasRedacted: boolean
  originalMessage?: string
  redactedPatterns: string[]
}

export function redactSensitiveInfo(message: string): RedactionResult {
  let redactedMessage = message
  const redactedPatterns: string[] = []
  let wasRedacted = false

  // Redact each pattern
  for (const [key, pattern] of Object.entries(SENSITIVE_PATTERNS)) {
    const matches = redactedMessage.match(pattern)
    if (matches && matches.length > 0) {
      wasRedacted = true
      redactedPatterns.push(key)

      // Replace with appropriate placeholder
      const placeholder = getPlaceholder(key)
      redactedMessage = redactedMessage.replace(pattern, placeholder)
    }
  }

  return {
    message: redactedMessage,
    wasRedacted,
    originalMessage: wasRedacted ? message : undefined,
    redactedPatterns
  }
}

function getPlaceholder(patternKey: string): string {
  const placeholders: Record<string, string> = {
    openai_key: '[OPENAI_API_KEY_REDACTED]',
    anthropic_key: '[ANTHROPIC_API_KEY_REDACTED]',
    google_key: '[GOOGLE_API_KEY_REDACTED]',
    aws_key: '[AWS_KEY_REDACTED]',
    aws_secret: '[AWS_SECRET_REDACTED]',
    generic_api_key: '[API_KEY_REDACTED]',
    bearer_token: '[BEARER_TOKEN_REDACTED]',
    jwt_token: '[JWT_TOKEN_REDACTED]',
    password: '[PASSWORD_REDACTED]',
    username_password: '[CREDENTIALS_REDACTED]',
    credit_card: '[CREDIT_CARD_REDACTED]',
    ssn: '[SSN_REDACTED]',
    private_key: '[PRIVATE_KEY_REDACTED]',
    crypto_private_key: '[CRYPTO_PRIVATE_KEY_REDACTED]',
    mnemonic_phrase: '[MNEMONIC_PHRASE_REDACTED]',
    connection_string: '[CONNECTION_STRING_REDACTED]',
    email: '[EMAIL_REDACTED]',
    phone: '[PHONE_REDACTED]',
  }

  return placeholders[patternKey] || '[REDACTED]'
}

// Malicious activity patterns - designed to detect actual attacks while minimizing false positives
// Patterns require context and multiple indicators rather than matching common words/phrases
//
// Operational Security Principles:
// - Treat every post as hostile input. No copy/paste execution.
// - Re-derive, don't replay. Rewrite steps from scratch and validate against official docs.
// - Execute smallest possible test, dry-run when available, read-only first.
// - Urgency ("quick test", "takes 10s") is a red flag.
const MALICIOUS_PATTERNS = {
  sql_injection: [
    // SQL keywords followed by suspicious table names - more targeted
    /(\bUNION\s+(?:ALL\s+)?SELECT\b|\bSELECT\b.*\bFROM\b).*\b(users|profiles|matches|passwords|chats|admin|credentials|accounts)\b/gi,
    // Classic injection patterns with quotes and logic operators
    /['"\s]*OR\s+['"\s]*\d+['"\s]*\s*=\s*['"\s]*\d+/gi,
    // Multiple SQL statements with dangerous commands
    /;\s*(DROP|DELETE|TRUNCATE|ALTER|UPDATE)\s+(TABLE|DATABASE|SCHEMA)/gi,
    // SQL comments only when followed by SQL keywords (actual injection pattern)
    /(--|#|\/\*)\s*(SELECT|UNION|DROP|DELETE|INSERT|UPDATE|FROM|WHERE)/gi,
    // SQL execution commands
    /\b(EXEC|EXECUTE)\s*\(/gi,
    /\bxp_cmdshell\b/gi,
    // UNION-based injection with multiple selects
    /\bUNION\s+(?:ALL\s+)?SELECT\s+.*,.*,/gi,
  ],
  xss: [
    /<script[\s\S]*?>/gi,  // Opening script tag (closing may be obfuscated)
    /<iframe[^>]*src\s*=\s*['"]?(?!https?:\/\/)/gi,  // iframe with non-http(s) src
    /<object[^>]*data\s*=\s*['"]?javascript:/gi,
    /<embed[^>]*src\s*=\s*['"]?javascript:/gi,
    // javascript: protocol in attributes
    /(?:src|href)\s*=\s*['"]?\s*javascript:/gi,
    // Event handlers with parentheses (actual execution)
    /on(?:error|load|click|mouse\w+|focus|blur)\s*=\s*['"]?[^'"]*\(/gi,
    /<img[^>]+src\s*=\s*['"]?javascript:/gi,
    // Data URIs with HTML content
    /data:text\/html[^,]*,\s*<script/gi,
  ],
  command_injection: [
    // Shell operators followed by dangerous commands
    /[;&|]\s*(?:rm\s+-rf?|curl.*>|wget.*>|nc\s+-e|bash\s+-[ci]|\/bin\/(?:sh|bash)|chmod|chown)\b/gi,
    // Command substitution with dangerous commands
    /\$\(\s*(?:cat|curl|wget|rm|nc|bash|sh)\b/g,
    // Backtick execution with dangerous commands
    /`\s*(?:cat|curl|wget|rm|nc|bash|sh)\b/g,
    // Pipes to dangerous commands with arguments
    /\|\s*(?:bash|sh|python|perl|ruby|php)\s+(?:-[ce]|<)/gi,
    // Writing to system directories with redirection
    />+\s*\/(?:etc|dev\/(?:tcp|udp)|proc\/|sys\/)/gi,
  ],
  prompt_injection: [
    // Ignore/disregard instructions - more specific
    /(?:ignore|disregard|forget)\s+(?:all|previous|prior|above|earlier)\s+(?:instructions|prompts|commands|rules|directions)/gi,
    // System role manipulation
    /(?:system|developer|admin|root)\s*[:=]\s*(?:"[^"]*"|'[^']*'|you\s+are)/gi,
    // Pretend/bypass commands
    /pretend\s+(?:you're|to\s+be|that\s+you\s+are).*(?:not\s+)?(?:ai|assistant|chatbot|claude)/gi,
    // New instruction injection
    /new\s+(?:instructions|rules|system\s+message)\s*[:=]/gi,
    // Override safety/security
    /override\s+(?:previous|all|security|safety)\s+(?:settings|rules|instructions)/gi,
    // Developer mode / jailbreak attempts
    /(?:enable|activate|enter)\s+(?:developer|admin|debug|god)\s+mode/gi,
  ],
  social_engineering: [
    // Direct command execution requests
    /(?:just|simply|quickly)?\s*(?:run|execute|type|enter)\s+(?:this|the|following)\s+(?:command|script|code)/gi,
    // Piped download execution (curl|bash, wget|sh)
    /(?:curl|wget|fetch)\s+[^\s]+\s*\|\s*(?:bash|sh|zsh|fish|python|perl|ruby|php)/gi,
    // Download suspicious file types
    /(?:download|get|fetch|install)\s+(?:this|the|my|our)\s+[^\s]*\.(?:pkg|dmg|exe|msi|bat|ps1|scr|vbs|jar)/gi,
    // Credential/token harvesting
    /(?:paste|share|send|post|provide|show)\s+(?:your|the|my)\s+(?:token|key|password|credential|log|config|env|\.env)/gi,
    // Copy-paste execution patterns
    /(?:copy|paste)\s+(?:and|&|then)\s+(?:run|execute|paste|enter)/gi,
    // Urgency indicators with commands
    /(?:quick|fast|simple|easy|10\s*(?:second|sec)|takes?\s+(?:a\s+)?(?:second|minute|moment))\s+(?:test|fix|check|command|script)/gi,
    // Base64 encoded commands (obfuscation)
    /echo\s+['"]?[A-Za-z0-9+\/]{50,}={0,2}['"]?\s*\|\s*base64\s+-d/gi,
    // Hidden or obfuscated downloads
    /(?:curl|wget)\s+[^\s]*\s+-(?:s|q|silent|quiet)/gi,
  ],
  crypto_scam: [
    // Investment/purchase solicitation with crypto terms
    /(?:invest|buy|purchase|send|transfer|get)\s+(?:in|into|my|this|our|the|some)?\s*(?:token|coin|crypto|nft|project|bitcoin|eth|btc)/gi,
    // Token shilling (moon, pump, gains, 100x, etc.)
    /\b(?:moon|pump|100x|10x|explode|skyrocket|gains?|returns?|guaranteed|presale|ico|ido|airdrop)\b/gi,
    // Wallet/contract addresses (Ethereum 32-42 hex chars, or Bitcoin style)
    /\b(?:0x[a-fA-F0-9]{32,42}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})\b/g,
    // Seed phrase phishing
    /(?:share|send|provide|verify)\s+(?:your|the)?\s*(?:seed|phrase|recovery|mnemonic|private\s*key)/gi,
  ],
}

export interface MaliciousCheckResult {
  isMalicious: boolean
  violationType?: string
  confidence: number
}

export function detectMaliciousActivity(message: string): MaliciousCheckResult {
  let maxConfidence = 0
  let detectedType: string | undefined

  // Normalize message for better detection (remove excess whitespace, lowercase for comparison)
  const normalizedMessage = message.toLowerCase().replace(/\s+/g, ' ')

  for (const [type, patterns] of Object.entries(MALICIOUS_PATTERNS)) {
    let matchCount = 0

    for (const pattern of patterns) {
      // Reset regex lastIndex to avoid state issues
      pattern.lastIndex = 0

      // Test against both original and normalized versions
      if (pattern.test(message) || pattern.test(normalizedMessage)) {
        matchCount++
      }

      // Reset again after test
      pattern.lastIndex = 0
    }

    // Calculate confidence based on number of matches
    let confidence = Math.min(matchCount / patterns.length, 1.0)

    // Crypto scams are severe - any single match is high confidence
    if (type === 'crypto_scam' && matchCount > 0) {
      confidence = 0.9
    }

    if (confidence > maxConfidence) {
      maxConfidence = confidence
      detectedType = type
    }
  }

  // Threshold: flag as malicious if confidence > 0.4 (requires multiple pattern matches)
  return {
    isMalicious: maxConfidence > 0.4,
    violationType: maxConfidence > 0.4 ? detectedType : undefined,
    confidence: maxConfidence
  }
}

// Calculate exponential cooldown in minutes
export function calculateCooldown(violationCount: number): number {
  // Base: 1 minute, doubles each time, max 24 hours
  const baseMinutes = 1
  const maxMinutes = 24 * 60

  const cooldownMinutes = Math.min(
    baseMinutes * Math.pow(2, violationCount - 1),
    maxMinutes
  )

  return cooldownMinutes
}

// Check if violation type is severe (immediate permaban)
export function isSevereViolation(violationType: string): boolean {
  const severeTypes = [
    'crypto_scam',  // Crypto investment solicitation, token shilling
  ]
  return severeTypes.includes(violationType)
}
