-- ===== enums =====
CREATE TYPE public.app_role AS ENUM ('parent', 'child', 'admin');
CREATE TYPE public.task_kind AS ENUM ('home', 'action');
CREATE TYPE public.task_status AS ENUM ('active', 'pending_approval', 'approved', 'archived');
CREATE TYPE public.goal_status AS ENUM ('draft', 'active', 'completed', 'cancelled');
CREATE TYPE public.ledger_type AS ENUM ('earn', 'deduct', 'payout');

-- ===== shared helpers =====
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ===== profiles =====
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  locale TEXT NOT NULL DEFAULT 'he',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ===== user_roles =====
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- ===== families =====
CREATE TABLE public.families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invite_code TEXT UNIQUE,
  invite_code_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.families TO authenticated;
GRANT ALL ON public.families TO service_role;
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'parent',
  approved BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (family_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.family_members TO authenticated;
GRANT ALL ON public.family_members TO service_role;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_family_member(_user_id UUID, _family_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.family_members
    WHERE user_id = _user_id AND family_id = _family_id AND approved
  );
$$;

CREATE OR REPLACE FUNCTION public.is_family_parent(_user_id UUID, _family_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.family_members
    WHERE user_id = _user_id AND family_id = _family_id AND approved AND role = 'parent'
  );
$$;

-- ===== child_profiles =====
CREATE TABLE public.child_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  gender TEXT,
  birth_year INT,
  avatar_id TEXT,
  pet_id TEXT,
  background_id TEXT,
  xp INT NOT NULL DEFAULT 0,
  level INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_child_profiles_family ON public.child_profiles(family_id);
CREATE INDEX idx_child_profiles_user ON public.child_profiles(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.child_profiles TO authenticated;
GRANT ALL ON public.child_profiles TO service_role;
ALTER TABLE public.child_profiles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_my_child_row(_user_id UUID, _child_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.child_profiles WHERE id = _child_id AND user_id = _user_id);
$$;

CREATE OR REPLACE FUNCTION public.child_family_id(_child_id UUID)
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT family_id FROM public.child_profiles WHERE id = _child_id;
$$;

CREATE OR REPLACE FUNCTION public.can_access_child(_user_id UUID, _child_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_my_child_row(_user_id, _child_id)
      OR public.is_family_member(_user_id, public.child_family_id(_child_id))
      OR public.has_role(_user_id, 'admin');
$$;

CREATE OR REPLACE FUNCTION public.can_manage_child(_user_id UUID, _child_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_family_parent(_user_id, public.child_family_id(_child_id))
      OR public.has_role(_user_id, 'admin');
$$;

-- ===== link codes =====
CREATE TABLE public.link_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  child_id UUID NOT NULL REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.link_codes TO authenticated;
GRANT ALL ON public.link_codes TO service_role;
ALTER TABLE public.link_codes ENABLE ROW LEVEL SECURITY;

-- ===== education methods =====
CREATE TABLE public.education_methods (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  tagline TEXT,
  description TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.education_methods TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.education_methods TO authenticated;
GRANT ALL ON public.education_methods TO service_role;
ALTER TABLE public.education_methods ENABLE ROW LEVEL SECURITY;

-- ===== tasks =====
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  child_id UUID REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  kind public.task_kind NOT NULL DEFAULT 'home',
  title TEXT NOT NULL,
  icon TEXT,
  xp_value INT NOT NULL DEFAULT 10,
  status public.task_status NOT NULL DEFAULT 'active',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tasks_family ON public.tasks(family_id);
CREATE INDEX idx_tasks_child ON public.tasks(child_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.task_family_id(_task_id UUID)
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT family_id FROM public.tasks WHERE id = _task_id;
$$;

CREATE OR REPLACE FUNCTION public.task_child_id(_task_id UUID)
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT child_id FROM public.tasks WHERE id = _task_id;
$$;

CREATE TABLE public.sub_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  needs_parent_approval BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sub_tasks_task ON public.sub_tasks(task_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sub_tasks TO authenticated;
GRANT ALL ON public.sub_tasks TO service_role;
ALTER TABLE public.sub_tasks ENABLE ROW LEVEL SECURITY;

-- ===== goals =====
CREATE TABLE public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  price_ils NUMERIC(10,2),
  method_id TEXT NOT NULL REFERENCES public.education_methods(id),
  method_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  status public.goal_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_goals_child ON public.goals(child_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.goals TO authenticated;
GRANT ALL ON public.goals TO service_role;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.goal_child_id(_goal_id UUID)
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT child_id FROM public.goals WHERE id = _goal_id;
$$;

CREATE TABLE public.goal_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  value NUMERIC(10,2) NOT NULL DEFAULT 0,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_goal_progress_goal ON public.goal_progress(goal_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.goal_progress TO authenticated;
GRANT ALL ON public.goal_progress TO service_role;
ALTER TABLE public.goal_progress ENABLE ROW LEVEL SECURITY;

-- ===== messages / notifications / achievements =====
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  child_id UUID REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  sender_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_messages_family ON public.messages(family_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id UUID REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  kind TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  icon TEXT,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_achievements_child ON public.achievements(child_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.achievements TO authenticated;
GRANT ALL ON public.achievements TO service_role;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

-- ===== money ledger (pocket money) =====
CREATE TABLE public.money_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  goal_id UUID REFERENCES public.goals(id) ON DELETE SET NULL,
  amount NUMERIC(10,2) NOT NULL,
  type public.ledger_type NOT NULL,
  reason TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_money_ledger_child ON public.money_ledger(child_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.money_ledger TO authenticated;
GRANT ALL ON public.money_ledger TO service_role;
ALTER TABLE public.money_ledger ENABLE ROW LEVEL SECURITY;

-- ===== subscriptions (future payments) =====
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'active',
  provider TEXT,
  provider_customer_id TEXT,
  provider_subscription_id TEXT,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (family_id)
);
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- ===== audit log =====
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity TEXT,
  entity_id UUID,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- ===== policies =====
CREATE POLICY "profiles_select_self_or_admin" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "profiles_insert_self" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_self_or_admin" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "user_roles_select_self_or_admin" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "families_select_member_or_admin" ON public.families FOR SELECT TO authenticated
  USING (public.is_family_member(auth.uid(), id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "families_insert_own" ON public.families FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "families_update_parent_or_admin" ON public.families FOR UPDATE TO authenticated
  USING (public.is_family_parent(auth.uid(), id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "families_delete_admin" ON public.families FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "family_members_select" ON public.family_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_family_member(auth.uid(), family_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "family_members_insert" ON public.family_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.is_family_parent(auth.uid(), family_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "family_members_update" ON public.family_members FOR UPDATE TO authenticated
  USING (public.is_family_parent(auth.uid(), family_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "family_members_delete" ON public.family_members FOR DELETE TO authenticated
  USING (public.is_family_parent(auth.uid(), family_id) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "child_profiles_select" ON public.child_profiles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_family_member(auth.uid(), family_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "child_profiles_insert" ON public.child_profiles FOR INSERT TO authenticated
  WITH CHECK (public.is_family_parent(auth.uid(), family_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "child_profiles_update" ON public.child_profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_family_parent(auth.uid(), family_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "child_profiles_delete" ON public.child_profiles FOR DELETE TO authenticated
  USING (public.is_family_parent(auth.uid(), family_id) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "link_codes_manage_parent" ON public.link_codes FOR ALL TO authenticated
  USING (public.can_manage_child(auth.uid(), child_id))
  WITH CHECK (public.can_manage_child(auth.uid(), child_id));

CREATE POLICY "education_methods_select_enabled" ON public.education_methods FOR SELECT TO anon, authenticated
  USING (enabled OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "education_methods_write_admin" ON public.education_methods FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "tasks_select" ON public.tasks FOR SELECT TO authenticated
  USING (public.is_family_member(auth.uid(), family_id)
         OR (child_id IS NOT NULL AND public.is_my_child_row(auth.uid(), child_id))
         OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "tasks_insert_parent" ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (public.is_family_parent(auth.uid(), family_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "tasks_update" ON public.tasks FOR UPDATE TO authenticated
  USING (public.is_family_parent(auth.uid(), family_id)
         OR (child_id IS NOT NULL AND public.is_my_child_row(auth.uid(), child_id))
         OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "tasks_delete_parent" ON public.tasks FOR DELETE TO authenticated
  USING (public.is_family_parent(auth.uid(), family_id) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "sub_tasks_select" ON public.sub_tasks FOR SELECT TO authenticated
  USING (public.is_family_member(auth.uid(), public.task_family_id(task_id))
         OR public.is_my_child_row(auth.uid(), public.task_child_id(task_id))
         OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "sub_tasks_insert_parent" ON public.sub_tasks FOR INSERT TO authenticated
  WITH CHECK (public.is_family_parent(auth.uid(), public.task_family_id(task_id)) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "sub_tasks_update" ON public.sub_tasks FOR UPDATE TO authenticated
  USING (public.is_family_parent(auth.uid(), public.task_family_id(task_id))
         OR public.is_my_child_row(auth.uid(), public.task_child_id(task_id))
         OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "sub_tasks_delete_parent" ON public.sub_tasks FOR DELETE TO authenticated
  USING (public.is_family_parent(auth.uid(), public.task_family_id(task_id)) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "goals_select" ON public.goals FOR SELECT TO authenticated
  USING (public.can_access_child(auth.uid(), child_id));
CREATE POLICY "goals_write_parent" ON public.goals FOR ALL TO authenticated
  USING (public.can_manage_child(auth.uid(), child_id))
  WITH CHECK (public.can_manage_child(auth.uid(), child_id));

CREATE POLICY "goal_progress_select" ON public.goal_progress FOR SELECT TO authenticated
  USING (public.can_access_child(auth.uid(), public.goal_child_id(goal_id)));
CREATE POLICY "goal_progress_write_parent" ON public.goal_progress FOR ALL TO authenticated
  USING (public.can_manage_child(auth.uid(), public.goal_child_id(goal_id)))
  WITH CHECK (public.can_manage_child(auth.uid(), public.goal_child_id(goal_id)));

CREATE POLICY "messages_select" ON public.messages FOR SELECT TO authenticated
  USING (public.is_family_member(auth.uid(), family_id)
         OR (child_id IS NOT NULL AND public.is_my_child_row(auth.uid(), child_id))
         OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "messages_insert" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (sender_user_id = auth.uid()
              AND (public.is_family_member(auth.uid(), family_id)
                   OR (child_id IS NOT NULL AND public.is_my_child_row(auth.uid(), child_id))));
CREATE POLICY "messages_update" ON public.messages FOR UPDATE TO authenticated
  USING (public.is_family_member(auth.uid(), family_id)
         OR (child_id IS NOT NULL AND public.is_my_child_row(auth.uid(), child_id)));

CREATE POLICY "notifications_select" ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid()
         OR (child_id IS NOT NULL AND public.can_access_child(auth.uid(), child_id))
         OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "notifications_update_own" ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR (child_id IS NOT NULL AND public.can_access_child(auth.uid(), child_id)));
CREATE POLICY "notifications_insert" ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR (child_id IS NOT NULL AND public.can_manage_child(auth.uid(), child_id)));

CREATE POLICY "achievements_select" ON public.achievements FOR SELECT TO authenticated
  USING (public.can_access_child(auth.uid(), child_id));
CREATE POLICY "achievements_write_parent" ON public.achievements FOR ALL TO authenticated
  USING (public.can_manage_child(auth.uid(), child_id))
  WITH CHECK (public.can_manage_child(auth.uid(), child_id));

CREATE POLICY "money_ledger_select" ON public.money_ledger FOR SELECT TO authenticated
  USING (public.can_access_child(auth.uid(), child_id));
CREATE POLICY "money_ledger_write_parent" ON public.money_ledger FOR ALL TO authenticated
  USING (public.can_manage_child(auth.uid(), child_id))
  WITH CHECK (public.can_manage_child(auth.uid(), child_id));

CREATE POLICY "subscriptions_select_member" ON public.subscriptions FOR SELECT TO authenticated
  USING (public.is_family_member(auth.uid(), family_id) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "audit_log_select_admin" ON public.audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ===== updated_at triggers =====
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_families_updated BEFORE UPDATE ON public.families FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_child_profiles_updated BEFORE UPDATE ON public.child_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_tasks_updated BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_sub_tasks_updated BEFORE UPDATE ON public.sub_tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_goals_updated BEFORE UPDATE ON public.goals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_education_methods_updated BEFORE UPDATE ON public.education_methods FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_subscriptions_updated BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== new user bootstrap =====
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'avatar_url')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===== XP rules: +10 XP per approved sub-task, level up every 100 XP =====
CREATE OR REPLACE FUNCTION public.award_xp_on_subtask_approval()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _child UUID;
  _xp INT;
BEGIN
  IF NEW.approved_at IS NOT NULL AND (OLD.approved_at IS NULL) THEN
    SELECT t.child_id, COALESCE(t.xp_value, 10) INTO _child, _xp
    FROM public.tasks t WHERE t.id = NEW.task_id;
    IF _child IS NOT NULL THEN
      UPDATE public.child_profiles
      SET xp = xp + COALESCE(_xp, 10),
          level = GREATEST(1, ((xp + COALESCE(_xp, 10)) / 100) + 1)
      WHERE id = _child;
    END IF;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_subtask_xp AFTER UPDATE ON public.sub_tasks
FOR EACH ROW EXECUTE FUNCTION public.award_xp_on_subtask_approval();