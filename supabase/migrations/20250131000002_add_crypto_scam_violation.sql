-- Add crypto_scam to violation_type check constraint
-- Drop the old constraint and create a new one

ALTER TABLE user_violations
DROP CONSTRAINT IF EXISTS user_violations_violation_type_check;

ALTER TABLE user_violations
ADD CONSTRAINT user_violations_violation_type_check
CHECK (violation_type IN (
  'sql_injection',
  'xss',
  'command_injection',
  'prompt_injection',
  'social_engineering',
  'crypto_scam',
  'rate_limit',
  'content_filter'
));

-- Add unique constraint for profile_id + violation_type to support upsert
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_violations_profile_violation_unique'
  ) THEN
    ALTER TABLE user_violations
    ADD CONSTRAINT user_violations_profile_violation_unique
    UNIQUE (profile_id, violation_type);
  END IF;
END $$;
