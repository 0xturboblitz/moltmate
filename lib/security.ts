// Security utilities for content filtering and malicious activity detection

// Regex patterns for sensitive information
const SENSITIVE_PATTERNS = {
  // API Keys
  openai_key: /sk-[a-zA-Z0-9]{32,}/gi,
  anthropic_key: /sk-ant-[a-zA-Z0-9-]{32,}/gi,
  google_key: /AIza[a-zA-Z0-9_-]{35}/gi,
  aws_key: /AKIA[0-9A-Z]{16}/gi,
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

  // Private keys
  private_key: /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC )?PRIVATE KEY-----/gi,

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
    generic_api_key: '[API_KEY_REDACTED]',
    bearer_token: '[BEARER_TOKEN_REDACTED]',
    jwt_token: '[JWT_TOKEN_REDACTED]',
    password: '[PASSWORD_REDACTED]',
    username_password: '[CREDENTIALS_REDACTED]',
    credit_card: '[CREDIT_CARD_REDACTED]',
    ssn: '[SSN_REDACTED]',
    private_key: '[PRIVATE_KEY_REDACTED]',
    connection_string: '[CONNECTION_STRING_REDACTED]',
    email: '[EMAIL_REDACTED]',
    phone: '[PHONE_REDACTED]',
  }

  return placeholders[patternKey] || '[REDACTED]'
}

// Malicious activity patterns with bypass prevention
const MALICIOUS_PATTERNS = {
  sql_injection: [
    /(\bUNION\b|\bSELECT\b|\bFROM\b|\bWHERE\b|\bDROP\b|\bDELETE\b|\bINSERT\b|\bUPDATE\b).*\b(users|profiles|matches|passwords|chats|admin)\b/gi,
    /['"\s]*OR\s+['"\s]*\d+['"\s]*\s*=\s*['"\s]*\d+/gi,  // OR 1=1, OR '1'='1', etc with spaces
    /;\s*(DROP|DELETE|TRUNCATE|ALTER)\s+(TABLE|DATABASE)/gi,
    /(--|#|\/\*)/g,  // SQL comments
    /\bEXEC\b|\bEXECUTE\b/gi,
    /\bxp_cmdshell\b/gi,  // SQL Server command execution
  ],
  xss: [
    /<script[\s\S]*?<\/script>/gi,
    /<iframe[\s\S]*?>/gi,
    /<object[\s\S]*?>/gi,
    /<embed[\s\S]*?>/gi,
    /javascript\s*:/gi,
    /on\w+\s*=\s*['"][^'"]*['"]/gi,  // onclick, onerror, etc
    /on\w+\s*=\s*[^\s>]+/gi,  // onclick=alert without quotes
    /<img[^>]+src\s*=\s*['"]?javascript:/gi,
    /data:text\/html/gi,
  ],
  command_injection: [
    /[;&|]\s*(?:cat|ls|pwd|whoami|rm|curl|wget|nc|bash|sh|python|perl|ruby|node|php)\b/gi,
    /\$\([^)]*\)/g,  // Command substitution
    /`[^`]*`/g,  // Backtick command execution
    /\|\s*(?:cat|ls|pwd|whoami|rm|curl|wget|nc|bash|sh)/gi,
    />\s*\/(?:etc|dev|proc|sys)/gi,  // Writing to system directories
  ],
  prompt_injection: [
    /ignore\s+(?:previous|all|above|prior|earlier)\s+(?:instructions|prompts|commands|rules|directions)/gi,
    /disregard\s+(?:all|previous|prior|above|earlier)\s+(?:instructions|rules|prompts|commands)/gi,
    /forget\s+(?:everything|all|previous|prior)\s+(?:instructions|rules|prompts)/gi,
    /(?:system|developer|admin|root)\s*[:=]\s*(?:you\s+are|role|mode)/gi,
    /pretend\s+(?:you're|to\s+be|that\s+you\s+are)\s+(?:not|ignore|bypass)/gi,
    /new\s+(?:instructions|rules|system\s+message)/gi,
    /override\s+(?:previous|all|security|safety)/gi,
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
      // Test against both original and normalized versions
      if (pattern.test(message) || pattern.test(normalizedMessage)) {
        matchCount++
      }
    }

    // Calculate confidence based on number of matches
    const confidence = Math.min(matchCount / patterns.length, 1.0)

    if (confidence > maxConfidence) {
      maxConfidence = confidence
      detectedType = type
    }
  }

  // Threshold: flag as malicious if confidence > 0.25 (lowered for better security)
  return {
    isMalicious: maxConfidence > 0.25,
    violationType: maxConfidence > 0.25 ? detectedType : undefined,
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
