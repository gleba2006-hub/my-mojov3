-- Coins, streaks, and avatar catalog. Run in Lovable Cloud after pull.

CREATE TABLE IF NOT EXISTS public.coin_wallets (
  child_id UUID PRIMARY KEY REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.coin_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.streaks (
  child_id UUID PRIMARY KEY REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  current_count INTEGER NOT NULL DEFAULT 0,
  best_count INTEGER NOT NULL DEFAULT 0,
  last_active_date DATE,
  shield_count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.avatars (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  stage1_path TEXT NOT NULL
);

INSERT INTO public.avatars (id, name, stage1_path) VALUES
  ('tree', 'עץ', '/brand/boy-tree-1.png'),
  ('fury', 'אש', '/brand/boy-fury-1.png'),
  ('vulcano', 'הר', '/brand/boy-vulcano-1.png'),
  ('pinka', 'פינקה', '/brand/girl-pinka-1.png'),
  ('clauda', 'קלאודיה', '/brand/girl-clauda-1.png'),
  ('jelly', 'מדוזה', '/brand/girl-jelly-1.png')
ON CONFLICT (id) DO NOTHING;

GRANT SELECT ON public.coin_wallets, public.coin_ledger, public.streaks, public.avatars TO authenticated;
GRANT ALL ON public.coin_wallets, public.coin_ledger, public.streaks, public.avatars TO service_role;
GRANT SELECT ON public.avatars TO anon;

ALTER TABLE public.coin_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coin_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avatars ENABLE ROW LEVEL SECURITY;

CREATE POLICY coin_wallets_read ON public.coin_wallets FOR SELECT TO authenticated
  USING (app_private.can_access_child(auth.uid(), child_id));
CREATE POLICY coin_ledger_read ON public.coin_ledger FOR SELECT TO authenticated
  USING (app_private.can_access_child(auth.uid(), child_id));
CREATE POLICY streaks_read ON public.streaks FOR SELECT TO authenticated
  USING (app_private.can_access_child(auth.uid(), child_id));
CREATE POLICY avatars_read ON public.avatars FOR SELECT TO anon, authenticated USING (true);
