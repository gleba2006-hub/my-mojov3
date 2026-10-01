-- Stage 3-6: catalog, goal tasks, allowance. Methods stay plugins.

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

INSERT INTO public.reward_price_ranges (id, label, min_ils, max_ils, task_count, sort_order) VALUES ('r1', $mj$עד 300 ש״ח$mj$, 0, 300, 4, 1) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reward_paths (id, range_id, path_index, name) VALUES ('r1p1', 'r1', 1, $mj$צמיחה ויוזמה$mj$) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reward_paths (id, range_id, path_index, name) VALUES ('r1p2', 'r1', 2, $mj$נתינה ומנהיגות$mj$) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reward_paths (id, range_id, path_index, name) VALUES ('r1p3', 'r1', 3, $mj$בית וקשרים$mj$) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reward_price_ranges (id, label, min_ils, max_ils, task_count, sort_order) VALUES ('r2', $mj$300–600 ש״ח$mj$, 300, 600, 6, 2) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reward_paths (id, range_id, path_index, name) VALUES ('r2p1', 'r2', 1, $mj$צמיחה ויוזמה$mj$) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reward_paths (id, range_id, path_index, name) VALUES ('r2p2', 'r2', 2, $mj$נתינה ומנהיגות$mj$) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reward_paths (id, range_id, path_index, name) VALUES ('r2p3', 'r2', 3, $mj$בית וקשרים$mj$) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reward_price_ranges (id, label, min_ils, max_ils, task_count, sort_order) VALUES ('r3', $mj$600–1,000 ש״ח$mj$, 600, 1000, 8, 3) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reward_paths (id, range_id, path_index, name) VALUES ('r3p1', 'r3', 1, $mj$צמיחה ויוזמה$mj$) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reward_paths (id, range_id, path_index, name) VALUES ('r3p2', 'r3', 2, $mj$נתינה ומנהיגות$mj$) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reward_paths (id, range_id, path_index, name) VALUES ('r3p3', 'r3', 3, $mj$בית וקשרים$mj$) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reward_price_ranges (id, label, min_ils, max_ils, task_count, sort_order) VALUES ('r4', $mj$1,000–1,500 ש״ח$mj$, 1000, 1500, 15, 4) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reward_paths (id, range_id, path_index, name) VALUES ('r4p1', 'r4', 1, $mj$צמיחה ויוזמה$mj$) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reward_paths (id, range_id, path_index, name) VALUES ('r4p2', 'r4', 2, $mj$נתינה ומנהיגות$mj$) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reward_paths (id, range_id, path_index, name) VALUES ('r4p3', 'r4', 3, $mj$בית וקשרים$mj$) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reward_price_ranges (id, label, min_ils, max_ils, task_count, sort_order) VALUES ('r5', $mj$1,500–2,500 ש״ח$mj$, 1500, 2500, 20, 5) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reward_paths (id, range_id, path_index, name) VALUES ('r5p1', 'r5', 1, $mj$צמיחה ויוזמה$mj$) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reward_paths (id, range_id, path_index, name) VALUES ('r5p2', 'r5', 2, $mj$נתינה ומנהיגות$mj$) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reward_paths (id, range_id, path_index, name) VALUES ('r5p3', 'r5', 3, $mj$בית וקשרים$mj$) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reward_price_ranges (id, label, min_ils, max_ils, task_count, sort_order) VALUES ('r6', $mj$2,500–5,000 ש״ח$mj$, 2500, 5000, 24, 6) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reward_paths (id, range_id, path_index, name) VALUES ('r6p1', 'r6', 1, $mj$צמיחה ויוזמה$mj$) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reward_paths (id, range_id, path_index, name) VALUES ('r6p2', 'r6', 2, $mj$נתינה ומנהיגות$mj$) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reward_paths (id, range_id, path_index, name) VALUES ('r6p3', 'r6', 3, $mj$בית וקשרים$mj$) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reward_price_ranges (id, label, min_ils, max_ils, task_count, sort_order) VALUES ('r7', $mj$5,000–7,500 ש״ח$mj$, 5000, 7500, 32, 7) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reward_paths (id, range_id, path_index, name) VALUES ('r7p1', 'r7', 1, $mj$צמיחה ויוזמה$mj$) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reward_paths (id, range_id, path_index, name) VALUES ('r7p2', 'r7', 2, $mj$נתינה ומנהיגות$mj$) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reward_paths (id, range_id, path_index, name) VALUES ('r7p3', 'r7', 3, $mj$בית וקשרים$mj$) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reward_price_ranges (id, label, min_ils, max_ils, task_count, sort_order) VALUES ('r8', $mj$7,500–10,000 ש״ח$mj$, 7500, 10000, 36, 8) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reward_paths (id, range_id, path_index, name) VALUES ('r8p1', 'r8', 1, $mj$צמיחה ויוזמה$mj$) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reward_paths (id, range_id, path_index, name) VALUES ('r8p2', 'r8', 2, $mj$נתינה ומנהיגות$mj$) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reward_paths (id, range_id, path_index, name) VALUES ('r8p3', 'r8', 3, $mj$בית וקשרים$mj$) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reward_price_ranges (id, label, min_ils, max_ils, task_count, sort_order) VALUES ('r9', $mj$10,000 ש״ח ומעלה$mj$, 10000, NULL, 40, 9) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reward_paths (id, range_id, path_index, name) VALUES ('r9p1', 'r9', 1, $mj$צמיחה ויוזמה$mj$) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reward_paths (id, range_id, path_index, name) VALUES ('r9p2', 'r9', 2, $mj$נתינה ומנהיגות$mj$) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reward_paths (id, range_id, path_index, name) VALUES ('r9p3', 'r9', 3, $mj$בית וקשרים$mj$) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.content_categories (id, name, sort_order) VALUES ('c1', $mj$למידה, התפתחות ומיומנויות אישיות$mj$, 1) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.content_categories (id, name, sort_order) VALUES ('c2', $mj$גיבוש משפחתי ואחריות בבית$mj$, 2) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.content_categories (id, name, sort_order) VALUES ('c3', $mj$קהילה, התנדבות ונתינה$mj$, 3) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.content_categories (id, name, sort_order) VALUES ('c4', $mj$יוזמה, עסקים ומסחר$mj$, 4) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.content_categories (id, name, sort_order) VALUES ('c5', $mj$מנהיגות, הנחיה וחונכות$mj$, 5) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.content_categories (id, name, sort_order) VALUES ('c6', $mj$קשר בין־דורי וכבוד לגיל השלישי$mj$, 6) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.content_categories (id, name, sort_order) VALUES ('c7', $mj$אחריות סביבתית ובעלי חיים$mj$, 7) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reward_tasks (id, title, category, kind) VALUES ('t_b3269810e4', $mj$פותחים את הראש!$mj$, $mj$למידה, התפתחות ומיומנויות אישיות$mj$, 'action') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reward_tasks (id, title, category, kind) VALUES ('t_a157213497', $mj$אלופי התקציב!$mj$, $mj$גיבוש משפחתי ואחריות בבית$mj$, 'action') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reward_tasks (id, title, category, kind) VALUES ('t_c182c55caa', $mj$גיבורים למען הקהילה!$mj$, $mj$קהילה, התנדבות ונתינה$mj$, 'action') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reward_tasks (id, title, category, kind) VALUES ('t_08b7179c0f', $mj$עושים מהלימון לימונדה!$mj$, $mj$יוזמה, עסקים ומסחר$mj$, 'action') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reward_tasks (id, title, category, kind) VALUES ('t_c0e0a9e8c3', $mj$מושיטים יד!$mj$, $mj$קהילה, התנדבות ונתינה$mj$, 'action') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reward_tasks (id, title, category, kind) VALUES ('t_492ec611fe', $mj$מנחי סדנאות!$mj$, $mj$מנהיגות, הנחיה וחונכות$mj$, 'action') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reward_tasks (id, title, category, kind) VALUES ('t_6d6941bf5f', $mj$מתכון מהבית של סבתא!$mj$, $mj$קשר בין־דורי וכבוד לגיל השלישי$mj$, 'action') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reward_tasks (id, title, category, kind) VALUES ('t_6d8ad3dac6', $mj$אלופי ההרגל הטוב!$mj$, $mj$למידה, התפתחות ומיומנויות אישיות$mj$, 'action') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reward_tasks (id, title, category, kind) VALUES ('t_23379dee7c', $mj$מנהלי הלו״ז של סופ״ש!$mj$, $mj$גיבוש משפחתי ואחריות בבית$mj$, 'action') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reward_tasks (id, title, category, kind) VALUES ('t_3149473f1c', $mj$אל תשליכני לעת זקנה!$mj$, $mj$קשר בין־דורי וכבוד לגיל השלישי$mj$, 'action') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reward_tasks (id, title, category, kind) VALUES ('t_a2ed1c9aa1', $mj$תולעי ספרים!$mj$, $mj$למידה, התפתחות ומיומנויות אישיות$mj$, 'action') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reward_tasks (id, title, category, kind) VALUES ('t_a1e49c3bad', $mj$מעבירים את הטוב הלאה!$mj$, $mj$קהילה, התנדבות ונתינה$mj$, 'action') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reward_tasks (id, title, category, kind) VALUES ('t_6912dce8ed', $mj$הנדימן צעיר!$mj$, $mj$למידה, התפתחות ומיומנויות אישיות$mj$, 'action') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reward_tasks (id, title, category, kind) VALUES ('t_5d328d9a9f', $mj$מנהלי הבית התורנים!$mj$, $mj$גיבוש משפחתי ואחריות בבית$mj$, 'action') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reward_tasks (id, title, category, kind) VALUES ('t_0d0d0f636c', $mj$ביזנס־טיים!$mj$, $mj$יוזמה, עסקים ומסחר$mj$, 'action') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reward_tasks (id, title, category, kind) VALUES ('t_8f9f1777d7', $mj$תמיכה טכנית VIP!$mj$, $mj$קשר בין־דורי וכבוד לגיל השלישי$mj$, 'action') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reward_tasks (id, title, category, kind) VALUES ('t_4f6f3eb9dd', $mj$מדריכים צעירים!$mj$, $mj$מנהיגות, הנחיה וחונכות$mj$, 'action') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reward_tasks (id, title, category, kind) VALUES ('t_3ebb1e4ab2', $mj$יושבי ראש הישיבה המשפחתית!$mj$, $mj$מנהיגות, הנחיה וחונכות$mj$, 'action') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reward_tasks (id, title, category, kind) VALUES ('t_e62df589f9', $mj$חברים למרות ההפרש!$mj$, $mj$קשר בין־דורי וכבוד לגיל השלישי$mj$, 'action') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reward_tasks (id, title, category, kind) VALUES ('t_85a6fa4a01', $mj$הולכים על ארבע!$mj$, $mj$אחריות סביבתית ובעלי חיים$mj$, 'action') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reward_tasks (id, title, category, kind) VALUES ('t_00ffb0476f', $mj$משקיעים בעתיד!$mj$, $mj$למידה, התפתחות ומיומנויות אישיות$mj$, 'action') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reward_tasks (id, title, category, kind) VALUES ('t_bf1806c81b', $mj$קונדיטורים בהזמנה אישית!$mj$, $mj$יוזמה, עסקים ומסחר$mj$, 'action') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reward_tasks (id, title, category, kind) VALUES ('t_e9b8f2626d', $mj$סטייליסטים אישיים!$mj$, $mj$גיבוש משפחתי ואחריות בבית$mj$, 'action') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reward_tasks (id, title, category, kind) VALUES ('t_d073688e9c', $mj$שורשים וסיפורים!$mj$, $mj$קשר בין־דורי וכבוד לגיל השלישי$mj$, 'action') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reward_tasks (id, title, category, kind) VALUES ('t_d698d1bb61', $mj$סקיל חדש!$mj$, $mj$למידה, התפתחות ומיומנויות אישיות$mj$, 'action') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reward_tasks (id, title, category, kind) VALUES ('t_46ac5eb1c9', $mj$שגרירי חסד שבועיים!$mj$, $mj$קהילה, התנדבות ונתינה$mj$, 'action') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reward_tasks (id, title, category, kind) VALUES ('t_b3a451b600', $mj$אח גדול, מורה גדול!$mj$, $mj$מנהיגות, הנחיה וחונכות$mj$, 'action') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reward_tasks (id, title, category, kind) VALUES ('t_47b9a10e48', $mj$שומרי הפינה הירוקה!$mj$, $mj$אחריות סביבתית ובעלי חיים$mj$, 'action') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reward_tasks (id, title, category, kind) VALUES ('t_a35c1f4f17', $mj$יומן ההצלחות!$mj$, $mj$למידה, התפתחות ומיומנויות אישיות$mj$, 'action') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reward_tasks (id, title, category, kind) VALUES ('t_b78add04ac', $mj$אלבום הזיכרונות המשפחתי!$mj$, $mj$גיבוש משפחתי ואחריות בבית$mj$, 'action') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reward_tasks (id, title, category, kind) VALUES ('t_6deca4cb5c', $mj$עושים סדר, עושים כסף!$mj$, $mj$יוזמה, עסקים ומסחר$mj$, 'action') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reward_tasks (id, title, category, kind) VALUES ('t_498ca4be6f', $mj$דיגיטל לכל גיל!$mj$, $mj$קשר בין־דורי וכבוד לגיל השלישי$mj$, 'action') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reward_tasks (id, title, category, kind) VALUES ('t_735fd7aee1', $mj$ממחזרים ומרוויחים!$mj$, $mj$אחריות סביבתית ובעלי חיים$mj$, 'action') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reward_tasks (id, title, category, kind) VALUES ('t_8229128602', $mj$מומחים לנושא אחד!$mj$, $mj$למידה, התפתחות ומיומנויות אישיות$mj$, 'action') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reward_tasks (id, title, category, kind) VALUES ('t_9eb93eac2c', $mj$דוג־סיטר מקצועי!$mj$, $mj$אחריות סביבתית ובעלי חיים$mj$, 'action') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reward_tasks (id, title, category, kind) VALUES ('t_8d1d405dd9', $mj$מעצבים ומוכרים!$mj$, $mj$יוזמה, עסקים ומסחר$mj$, 'action') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reward_tasks (id, title, category, kind) VALUES ('t_e98e0b31a9', $mj$כתבים משפחתיים!$mj$, $mj$גיבוש משפחתי ואחריות בבית$mj$, 'action') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reward_tasks (id, title, category, kind) VALUES ('t_d0362bae5c', $mj$שכנות טובה משתלמת!$mj$, $mj$קשר בין־דורי וכבוד לגיל השלישי$mj$, 'action') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reward_tasks (id, title, category, kind) VALUES ('t_8646c211a3', $mj$אלופים בתנועה!$mj$, $mj$למידה, התפתחות ומיומנויות אישיות$mj$, 'action') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reward_tasks (id, title, category, kind) VALUES ('t_36944a11eb', $mj$מגייסי הטוב!$mj$, $mj$קהילה, התנדבות ונתינה$mj$, 'action') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reward_tasks (id, title, category, kind) VALUES ('t_ead695b703', $mj$מפיקי אירועים!$mj$, $mj$מנהיגות, הנחיה וחונכות$mj$, 'action') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reward_tasks (id, title, category, kind) VALUES ('t_af79802265', $mj$מפרידי האשפה המקצוענים!$mj$, $mj$אחריות סביבתית ובעלי חיים$mj$, 'action') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reward_tasks (id, title, category, kind) VALUES ('t_caa46b58fd', $mj$מנכ״לים בהקמה!$mj$, $mj$יוזמה, עסקים ומסחר$mj$, 'action') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reward_tasks (id, title, category, kind) VALUES ('t_28dcfa847e', $mj$כלכלני הבית הצעירים!$mj$, $mj$גיבוש משפחתי ואחריות בבית$mj$, 'action') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reward_tasks (id, title, category, kind) VALUES ('t_4cde197d65', $mj$יוצרים ומוכרים!$mj$, $mj$יוזמה, עסקים ומסחר$mj$, 'action') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reward_tasks (id, title, category, kind) VALUES ('t_9f195262d3', $mj$מפיקי פודקאסט משפחתי!$mj$, $mj$קשר בין־דורי וכבוד לגיל השלישי$mj$, 'action') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reward_tasks (id, title, category, kind) VALUES ('t_757999bfee', $mj$אמנות ממוחזרת!$mj$, $mj$אחריות סביבתית ובעלי חיים$mj$, 'action') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reward_tasks (id, title, category, kind) VALUES ('t_c8fd439a8a', $mj$זמן משפחה בהפקתכם!$mj$, $mj$גיבוש משפחתי ואחריות בבית$mj$, 'action') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reward_tasks (id, title, category, kind) VALUES ('t_bc857d3dbb', $mj$מבריקים בדרכים!$mj$, $mj$יוזמה, עסקים ומסחר$mj$, 'action') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reward_tasks (id, title, category, kind) VALUES ('t_6c5ff14824', $mj$משתלה ביתית!$mj$, $mj$אחריות סביבתית ובעלי חיים$mj$, 'action') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reward_tasks (id, title, category, kind) VALUES ('t_c07c096103', $mj$בייביסיטר של אחר הצהריים!$mj$, $mj$יוזמה, עסקים ומסחר$mj$, 'action') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reward_tasks (id, title, category, kind) VALUES ('t_915ee91832', $mj$ידידי בעלי הכנף!$mj$, $mj$אחריות סביבתית ובעלי חיים$mj$, 'action') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reward_tasks (id, title, category, kind) VALUES ('t_ee828534ba', $mj$לקוח מרוצה חוזר!$mj$, $mj$יוזמה, עסקים ומסחר$mj$, 'action') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reward_tasks (id, title, category, kind) VALUES ('t_739ca33861', $mj$יזמי הצילום!$mj$, $mj$יוזמה, עסקים ומסחר$mj$, 'action') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reward_tasks (id, title, category, kind) VALUES ('t_ca281ca1ad', $mj$מאסטר שף צעיר!$mj$, $mj$גיבוש משפחתי ואחריות בבית$mj$, 'action') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reward_tasks (id, title, category, kind) VALUES ('t_33bd662546', $mj$להתראות אשפה!$mj$, $mj$גיבוש משפחתי ואחריות בבית$mj$, 'home') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reward_tasks (id, title, category, kind) VALUES ('t_e1b409b28d', $mj$טיפול בחיית המחמד זה נחמד!$mj$, $mj$גיבוש משפחתי ואחריות בבית$mj$, 'home') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reward_tasks (id, title, category, kind) VALUES ('t_c320315275', $mj$הכביסה במנוסה!$mj$, $mj$גיבוש משפחתי ואחריות בבית$mj$, 'home') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reward_tasks (id, title, category, kind) VALUES ('t_db8fec55d3', $mj$הכיור מנצנץ!$mj$, $mj$גיבוש משפחתי ואחריות בבית$mj$, 'home') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reward_tasks (id, title, category, kind) VALUES ('t_7820d5f3c2', $mj$החדר טיפ-טופ!$mj$, $mj$גיבוש משפחתי ואחריות בבית$mj$, 'home') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reward_tasks (id, title, category, kind) VALUES ('t_24193a1eda', $mj$השומר הצעיר!$mj$, $mj$גיבוש משפחתי ואחריות בבית$mj$, 'home') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reward_tasks (id, title, category, kind) VALUES ('t_9210e33ec5', $mj$תקתוק של ארון הבגדים!$mj$, $mj$גיבוש משפחתי ואחריות בבית$mj$, 'home') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reward_tasks (id, title, category, kind) VALUES ('t_c4b3d5463e', $mj$כן שף!$mj$, $mj$גיבוש משפחתי ואחריות בבית$mj$, 'home') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.reward_tasks (id, title, category, kind) VALUES ('t_465b5cfacb', $mj$הבית דנדש!$mj$, $mj$גיבוש משפחתי ואחריות בבית$mj$, 'home') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.reward_path_tasks (path_id, task_id, sort_order)
SELECT p, 't_'||t, o::int FROM (VALUES
('r1p1','b3269810e4,a157213497,c182c55caa,08b7179c0f'),
('r1p2','c0e0a9e8c3,492ec611fe,6d6941bf5f,6d8ad3dac6'),
('r1p3','23379dee7c,3149473f1c,a2ed1c9aa1,a1e49c3bad'),
('r2p1','6912dce8ed,5d328d9a9f,a1e49c3bad,0d0d0f636c,8f9f1777d7,4f6f3eb9dd'),
('r2p2','c182c55caa,3ebb1e4ab2,e62df589f9,85a6fa4a01,00ffb0476f,bf1806c81b'),
('r2p3','e9b8f2626d,d073688e9c,d698d1bb61,46ac5eb1c9,b3a451b600,47b9a10e48'),
('r3p1','a35c1f4f17,b78add04ac,46ac5eb1c9,6deca4cb5c,498ca4be6f,b3a451b600,735fd7aee1,8229128602'),
('r3p2','a1e49c3bad,4f6f3eb9dd,3149473f1c,9eb93eac2c,a2ed1c9aa1,23379dee7c,8d1d405dd9,46ac5eb1c9'),
('r3p3','e98e0b31a9,d0362bae5c,8646c211a3,36944a11eb,ead695b703,af79802265,caa46b58fd,a157213497'),
('r4p1','8229128602,28dcfa847e,36944a11eb,4cde197d65,9f195262d3,ead695b703,757999bfee,6d8ad3dac6,c8fd439a8a,c0e0a9e8c3,bc857d3dbb,6d6941bf5f,492ec611fe,6c5ff14824,00ffb0476f'),
('r4p2','46ac5eb1c9,b3a451b600,d073688e9c,47b9a10e48,d698d1bb61,e9b8f2626d,c07c096103,36944a11eb,ead695b703,d0362bae5c,af79802265,8646c211a3,e98e0b31a9,caa46b58fd,c0e0a9e8c3'),
('r4p3','a157213497,8f9f1777d7,b3269810e4,c0e0a9e8c3,492ec611fe,915ee91832,ee828534ba,5d328d9a9f,498ca4be6f,6912dce8ed,c182c55caa,3ebb1e4ab2,735fd7aee1,739ca33861,b78add04ac'),
('r5p1','6d8ad3dac6,c8fd439a8a,c0e0a9e8c3,bc857d3dbb,6d6941bf5f,492ec611fe,6c5ff14824,00ffb0476f,ca281ca1ad,c182c55caa,bf1806c81b,e62df589f9,3ebb1e4ab2,85a6fa4a01,a2ed1c9aa1,23379dee7c,a1e49c3bad,8d1d405dd9,3149473f1c,4f6f3eb9dd'),
('r5p2','36944a11eb,ead695b703,d0362bae5c,af79802265,8646c211a3,e98e0b31a9,caa46b58fd,c0e0a9e8c3,492ec611fe,8f9f1777d7,915ee91832,b3269810e4,a157213497,ee828534ba,c182c55caa,3ebb1e4ab2,498ca4be6f,735fd7aee1,6912dce8ed,5d328d9a9f'),
('r5p3','5d328d9a9f,498ca4be6f,6912dce8ed,c182c55caa,3ebb1e4ab2,735fd7aee1,739ca33861,b78add04ac,9f195262d3,a35c1f4f17,a1e49c3bad,4f6f3eb9dd,757999bfee,08b7179c0f,28dcfa847e,6d6941bf5f,8229128602,46ac5eb1c9,b3a451b600,6c5ff14824'),
('r6p1','00ffb0476f,ca281ca1ad,c182c55caa,bf1806c81b,e62df589f9,3ebb1e4ab2,85a6fa4a01,a2ed1c9aa1,23379dee7c,a1e49c3bad,8d1d405dd9,3149473f1c,4f6f3eb9dd,9eb93eac2c,d698d1bb61,e9b8f2626d,46ac5eb1c9,c07c096103,d073688e9c,b3a451b600,47b9a10e48,8646c211a3,e98e0b31a9,36944a11eb'),
('r6p2','c0e0a9e8c3,492ec611fe,8f9f1777d7,915ee91832,b3269810e4,a157213497,ee828534ba,c182c55caa,3ebb1e4ab2,498ca4be6f,735fd7aee1,6912dce8ed,5d328d9a9f,739ca33861,a1e49c3bad,4f6f3eb9dd,9f195262d3,757999bfee,a35c1f4f17,b78add04ac,08b7179c0f,46ac5eb1c9,b3a451b600,6d6941bf5f'),
('r6p3','b78add04ac,9f195262d3,a35c1f4f17,a1e49c3bad,4f6f3eb9dd,757999bfee,08b7179c0f,28dcfa847e,6d6941bf5f,8229128602,46ac5eb1c9,b3a451b600,6c5ff14824,0d0d0f636c,c8fd439a8a,e62df589f9,6d8ad3dac6,36944a11eb,ead695b703,85a6fa4a01,6deca4cb5c,ca281ca1ad,3149473f1c,00ffb0476f'),
('r7p1','a2ed1c9aa1,23379dee7c,a1e49c3bad,8d1d405dd9,3149473f1c,4f6f3eb9dd,9eb93eac2c,d698d1bb61,e9b8f2626d,46ac5eb1c9,c07c096103,d073688e9c,b3a451b600,47b9a10e48,8646c211a3,e98e0b31a9,36944a11eb,caa46b58fd,d0362bae5c,ead695b703,af79802265,b3269810e4,a157213497,c0e0a9e8c3,ee828534ba,8f9f1777d7,492ec611fe,915ee91832,6912dce8ed,5d328d9a9f,c182c55caa,739ca33861'),
('r7p2','c182c55caa,3ebb1e4ab2,498ca4be6f,735fd7aee1,6912dce8ed,5d328d9a9f,739ca33861,a1e49c3bad,4f6f3eb9dd,9f195262d3,757999bfee,a35c1f4f17,b78add04ac,08b7179c0f,46ac5eb1c9,b3a451b600,6d6941bf5f,6c5ff14824,8229128602,28dcfa847e,0d0d0f636c,36944a11eb,ead695b703,e62df589f9,85a6fa4a01,6d8ad3dac6,c8fd439a8a,6deca4cb5c,c0e0a9e8c3,492ec611fe,3149473f1c,9eb93eac2c'),
('r7p3','28dcfa847e,6d6941bf5f,8229128602,46ac5eb1c9,b3a451b600,6c5ff14824,0d0d0f636c,c8fd439a8a,e62df589f9,6d8ad3dac6,36944a11eb,ead695b703,85a6fa4a01,6deca4cb5c,ca281ca1ad,3149473f1c,00ffb0476f,c0e0a9e8c3,492ec611fe,9eb93eac2c,4cde197d65,23379dee7c,d073688e9c,a2ed1c9aa1,c182c55caa,3ebb1e4ab2,47b9a10e48,bc857d3dbb,e9b8f2626d,d0362bae5c,d698d1bb61,a1e49c3bad'),
('r8p1','d698d1bb61,e9b8f2626d,46ac5eb1c9,c07c096103,d073688e9c,b3a451b600,47b9a10e48,8646c211a3,e98e0b31a9,36944a11eb,caa46b58fd,d0362bae5c,ead695b703,af79802265,b3269810e4,a157213497,c0e0a9e8c3,ee828534ba,8f9f1777d7,492ec611fe,915ee91832,6912dce8ed,5d328d9a9f,c182c55caa,739ca33861,498ca4be6f,3ebb1e4ab2,735fd7aee1,a35c1f4f17,b78add04ac,a1e49c3bad,08b7179c0f,9f195262d3,4f6f3eb9dd,757999bfee,8229128602'),
('r8p2','a1e49c3bad,4f6f3eb9dd,9f195262d3,757999bfee,a35c1f4f17,b78add04ac,08b7179c0f,46ac5eb1c9,b3a451b600,6d6941bf5f,6c5ff14824,8229128602,28dcfa847e,0d0d0f636c,36944a11eb,ead695b703,e62df589f9,85a6fa4a01,6d8ad3dac6,c8fd439a8a,6deca4cb5c,c0e0a9e8c3,492ec611fe,3149473f1c,9eb93eac2c,00ffb0476f,ca281ca1ad,4cde197d65,c182c55caa,3ebb1e4ab2,d073688e9c,47b9a10e48,a2ed1c9aa1,23379dee7c,bc857d3dbb,d0362bae5c'),
('r8p3','c8fd439a8a,e62df589f9,6d8ad3dac6,36944a11eb,ead695b703,85a6fa4a01,6deca4cb5c,ca281ca1ad,3149473f1c,00ffb0476f,c0e0a9e8c3,492ec611fe,9eb93eac2c,4cde197d65,23379dee7c,d073688e9c,a2ed1c9aa1,c182c55caa,3ebb1e4ab2,47b9a10e48,bc857d3dbb,e9b8f2626d,d0362bae5c,d698d1bb61,a1e49c3bad,4f6f3eb9dd,af79802265,bf1806c81b,e98e0b31a9,8f9f1777d7,8646c211a3,46ac5eb1c9,b3a451b600,915ee91832,8d1d405dd9,a157213497'),
('r9p1','8646c211a3,e98e0b31a9,36944a11eb,caa46b58fd,d0362bae5c,ead695b703,af79802265,b3269810e4,a157213497,c0e0a9e8c3,ee828534ba,8f9f1777d7,492ec611fe,915ee91832,6912dce8ed,5d328d9a9f,c182c55caa,739ca33861,498ca4be6f,3ebb1e4ab2,735fd7aee1,a35c1f4f17,b78add04ac,a1e49c3bad,08b7179c0f,9f195262d3,4f6f3eb9dd,757999bfee,8229128602,28dcfa847e,46ac5eb1c9,0d0d0f636c,6d6941bf5f,b3a451b600,6c5ff14824,6d8ad3dac6,c8fd439a8a,6deca4cb5c,e62df589f9,85a6fa4a01'),
('r9p2','46ac5eb1c9,b3a451b600,6d6941bf5f,6c5ff14824,8229128602,28dcfa847e,0d0d0f636c,36944a11eb,ead695b703,e62df589f9,85a6fa4a01,6d8ad3dac6,c8fd439a8a,6deca4cb5c,c0e0a9e8c3,492ec611fe,3149473f1c,9eb93eac2c,00ffb0476f,ca281ca1ad,4cde197d65,c182c55caa,3ebb1e4ab2,d073688e9c,47b9a10e48,a2ed1c9aa1,23379dee7c,bc857d3dbb,a1e49c3bad,4f6f3eb9dd,d0362bae5c,af79802265,d698d1bb61,e9b8f2626d,bf1806c81b,8f9f1777d7,915ee91832,8646c211a3,e98e0b31a9,8d1d405dd9'),
('r9p3','ca281ca1ad,3149473f1c,00ffb0476f,c0e0a9e8c3,492ec611fe,9eb93eac2c,4cde197d65,23379dee7c,d073688e9c,a2ed1c9aa1,c182c55caa,3ebb1e4ab2,47b9a10e48,bc857d3dbb,e9b8f2626d,d0362bae5c,d698d1bb61,a1e49c3bad,4f6f3eb9dd,af79802265,bf1806c81b,e98e0b31a9,8f9f1777d7,8646c211a3,46ac5eb1c9,b3a451b600,915ee91832,8d1d405dd9,a157213497,498ca4be6f,b3269810e4,36944a11eb,ead695b703,735fd7aee1,c07c096103,5d328d9a9f,9f195262d3,6912dce8ed,757999bfee,caa46b58fd')
) v(p,l), unnest(string_to_array(l, ',')) WITH ORDINALITY u(t,o)
ON CONFLICT DO NOTHING;
