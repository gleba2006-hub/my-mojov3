DROP POLICY IF EXISTS "family_members_insert" ON public.family_members;
DROP POLICY IF EXISTS "families_insert_own" ON public.families;
REVOKE INSERT ON public.family_members FROM authenticated;
REVOKE INSERT ON public.families FROM authenticated;
CREATE TABLE public.code_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_code_attempts_lookup ON public.code_attempts (bucket, key_hash, created_at DESC);
REVOKE ALL ON public.code_attempts FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.code_attempts TO service_role;
ALTER TABLE public.code_attempts ENABLE ROW LEVEL SECURITY;