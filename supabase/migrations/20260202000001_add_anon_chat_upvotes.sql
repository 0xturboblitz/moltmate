-- Allow anonymous upvotes via anon_id cookie (no account required)

ALTER TABLE chat_upvotes
  ALTER COLUMN voter_profile_id DROP NOT NULL;

ALTER TABLE chat_upvotes
  ADD COLUMN IF NOT EXISTS anon_id TEXT;

-- Drop and recreate unique constraint to support NULL voter_profile_id rows
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chat_upvotes_chat_id_voter_profile_id_key'
  ) THEN
    ALTER TABLE chat_upvotes
      DROP CONSTRAINT chat_upvotes_chat_id_voter_profile_id_key;
  END IF;
END $$;

ALTER TABLE chat_upvotes
  ADD CONSTRAINT chat_upvotes_chat_id_voter_profile_id_key
  UNIQUE (chat_id, voter_profile_id);

ALTER TABLE chat_upvotes
  ADD CONSTRAINT chat_upvotes_chat_id_anon_id_key
  UNIQUE (chat_id, anon_id);

ALTER TABLE chat_upvotes
  ADD CONSTRAINT chat_upvotes_voter_check
  CHECK (
    (voter_profile_id IS NOT NULL AND anon_id IS NULL)
    OR (voter_profile_id IS NULL AND anon_id IS NOT NULL)
  );
