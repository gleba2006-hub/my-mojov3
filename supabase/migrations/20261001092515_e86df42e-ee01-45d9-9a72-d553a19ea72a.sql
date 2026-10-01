INSERT INTO public.education_methods (id, name, tagline, description, sort_order)
VALUES
  ('tracks', 'מסלולי אקשן', 'מסלול משימות לכל מתנה', 'רק משימות אקשן מקדמות את המתנה. משימות בית נותנות נקודות ניסיון.', 1),
  ('classic', 'כל משימה נחשבת', 'כל משימה מקרבת למטרה', 'בית ואקשן באותו מסלול. כל משימה מקדמת את המתנה.', 2),
  ('pocket_money', 'דמי כיס', 'חיסכון אמיתי בשקלים', 'סכום בסיס ומשימות מזכות שקלים. בלי יתרה שלילית.', 3)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, tagline = EXCLUDED.tagline, description = EXCLUDED.description;

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS goal_id UUID REFERENCES public.goals(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS repeat_target INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS repeat_done INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS advances_goal BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.content_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS public.reward_tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  kind public.task_kind NOT NULL
);
CREATE TABLE IF NOT EXISTS public.reward_price_ranges (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  min_ils NUMERIC(10,2) NOT NULL,
  max_ils NUMERIC(10,2),
  task_count INT NOT NULL,
  sort_order INT NOT NULL
);
CREATE TABLE IF NOT EXISTS public.reward_paths (
  id TEXT PRIMARY KEY,
  range_id TEXT NOT NULL REFERENCES public.reward_price_ranges(id) ON DELETE CASCADE,
  path_index INT NOT NULL,
  name TEXT NOT NULL,
  UNIQUE (range_id, path_index)
);
CREATE TABLE IF NOT EXISTS public.reward_path_tasks (
  path_id TEXT NOT NULL REFERENCES public.reward_paths(id) ON DELETE CASCADE,
  task_id TEXT NOT NULL REFERENCES public.reward_tasks(id) ON DELETE CASCADE,
  sort_order INT NOT NULL,
  PRIMARY KEY (path_id, task_id)
);
CREATE TABLE IF NOT EXISTS public.child_allowances (
  child_id UUID PRIMARY KEY REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  period TEXT NOT NULL DEFAULT 'weekly',
  base_amount NUMERIC(10,2) NOT NULL DEFAULT 20,
  payout_day INT NOT NULL DEFAULT 1,
  home_amount NUMERIC(10,2) NOT NULL DEFAULT 2,
  action_amount NUMERIC(10,2) NOT NULL DEFAULT 5,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.content_categories, public.reward_tasks, public.reward_price_ranges, public.reward_paths, public.reward_path_tasks TO anon, authenticated;
GRANT ALL ON public.content_categories, public.reward_tasks, public.reward_price_ranges, public.reward_paths, public.reward_path_tasks, public.child_allowances TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.child_allowances TO authenticated;
ALTER TABLE public.content_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_price_ranges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_path_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.child_allowances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cat_read ON public.content_categories;
DROP POLICY IF EXISTS rt_read ON public.reward_tasks;
DROP POLICY IF EXISTS rr_read ON public.reward_price_ranges;
DROP POLICY IF EXISTS rp_read ON public.reward_paths;
DROP POLICY IF EXISTS rpt_read ON public.reward_path_tasks;
DROP POLICY IF EXISTS allow_read ON public.child_allowances;
DROP POLICY IF EXISTS allow_write ON public.child_allowances;
CREATE POLICY cat_read ON public.content_categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY rt_read ON public.reward_tasks FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY rr_read ON public.reward_price_ranges FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY rp_read ON public.reward_paths FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY rpt_read ON public.reward_path_tasks FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY allow_read ON public.child_allowances FOR SELECT TO authenticated
  USING (app_private.can_access_child(auth.uid(), child_id));
CREATE POLICY allow_write ON public.child_allowances FOR ALL TO authenticated
  USING (app_private.can_manage_child(auth.uid(), child_id))
  WITH CHECK (app_private.can_manage_child(auth.uid(), child_id));