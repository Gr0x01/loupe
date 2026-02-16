-- Add trial_ends_at to profiles for 14-day Pro trial on signup
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;

-- Index for efficient trial expiry queries
CREATE INDEX IF NOT EXISTS idx_profiles_trial_ends_at ON profiles (trial_ends_at) WHERE trial_ends_at IS NOT NULL;
