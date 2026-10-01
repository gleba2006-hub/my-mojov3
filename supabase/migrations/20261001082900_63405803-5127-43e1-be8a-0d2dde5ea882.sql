-- drop policies that reference the public helper functions
DROP POLICY "profiles_select_self_or_admin" ON public.profiles;
DROP POLICY "profiles_update_self_or_admin" ON public.profiles;
DROP POLICY "user_roles_select_self_or_admin" ON public.user_roles;
DROP POLICY "families_select_member_or_admin" ON public.families;
DROP POLICY "families_update_parent_or_admin" ON public.families;
DROP POLICY "families_delete_admin" ON public.families;
DROP POLICY "family_members_select" ON public.family_members;
DROP POLICY "family_members_insert" ON public.family_members;
DROP POLICY "family_members_update" ON public.family_members;
DROP POLICY "family_members_delete" ON public.family_members;
DROP POLICY "child_profiles_select" ON public.child_profiles;
DROP POLICY "child_profiles_insert" ON public.child_profiles;
DROP POLICY "child_profiles_update" ON public.child_profiles;
DROP POLICY "child_profiles_delete" ON public.child_profiles;
DROP POLICY "link_codes_manage_parent" ON public.link_codes;
DROP POLICY "education_methods_select_enabled" ON public.education_methods;
DROP POLICY "education_methods_write_admin" ON public.education_methods;
DROP POLICY "tasks_select" ON public.tasks;
DROP POLICY "tasks_insert_parent" ON public.tasks;
DROP POLICY "tasks_update" ON public.tasks;
DROP POLICY "tasks_delete_parent" ON public.tasks;
DROP POLICY "sub_tasks_select" ON public.sub_tasks;
DROP POLICY "sub_tasks_insert_parent" ON public.sub_tasks;
DROP POLICY "sub_tasks_update" ON public.sub_tasks;
DROP POLICY "sub_tasks_delete_parent" ON public.sub_tasks;
DROP POLICY "goals_select" ON public.goals;
DROP POLICY "goals_write_parent" ON public.goals;
DROP POLICY "goal_progress_select" ON public.goal_progress;
DROP POLICY "goal_progress_write_parent" ON public.goal_progress;
DROP POLICY "messages_select" ON public.messages;
DROP POLICY "messages_insert" ON public.messages;
DROP POLICY "messages_update" ON public.messages;
DROP POLICY "notifications_select" ON public.notifications;
DROP POLICY "notifications_update_own" ON public.notifications;
DROP POLICY "notifications_insert" ON public.notifications;
DROP POLICY "achievements_select" ON public.achievements;
DROP POLICY "achievements_write_parent" ON public.achievements;
DROP POLICY "money_ledger_select" ON public.money_ledger;
DROP POLICY "money_ledger_write_parent" ON public.money_ledger;
DROP POLICY "subscriptions_select_member" ON public.subscriptions;
DROP POLICY "audit_log_select_admin" ON public.audit_log;

DROP FUNCTION public.has_role(UUID, public.app_role);
DROP FUNCTION public.is_family_member(UUID, UUID);
DROP FUNCTION public.is_family_parent(UUID, UUID);
DROP FUNCTION public.is_my_child_row(UUID, UUID);
DROP FUNCTION public.child_family_id(UUID);
DROP FUNCTION public.can_access_child(UUID, UUID);
DROP FUNCTION public.can_manage_child(UUID, UUID);
DROP FUNCTION public.task_family_id(UUID);
DROP FUNCTION public.task_child_id(UUID);
DROP FUNCTION public.goal_child_id(UUID);

-- internal (non API-exposed) schema for RLS helpers
CREATE SCHEMA IF NOT EXISTS app_private;
REVOKE ALL ON SCHEMA app_private FROM PUBLIC;
GRANT USAGE ON SCHEMA app_private TO authenticated, anon, service_role;

CREATE OR REPLACE FUNCTION app_private.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION app_private.is_family_member(_user_id UUID, _family_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.family_members WHERE user_id = _user_id AND family_id = _family_id AND approved);
$$;

CREATE OR REPLACE FUNCTION app_private.is_family_parent(_user_id UUID, _family_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.family_members WHERE user_id = _user_id AND family_id = _family_id AND approved AND role = 'parent');
$$;

CREATE OR REPLACE FUNCTION app_private.is_my_child_row(_user_id UUID, _child_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.child_profiles WHERE id = _child_id AND user_id = _user_id);
$$;

CREATE OR REPLACE FUNCTION app_private.child_family_id(_child_id UUID)
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT family_id FROM public.child_profiles WHERE id = _child_id;
$$;

CREATE OR REPLACE FUNCTION app_private.can_access_child(_user_id UUID, _child_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT app_private.is_my_child_row(_user_id, _child_id)
      OR app_private.is_family_member(_user_id, app_private.child_family_id(_child_id))
      OR app_private.has_role(_user_id, 'admin');
$$;

CREATE OR REPLACE FUNCTION app_private.can_manage_child(_user_id UUID, _child_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT app_private.is_family_parent(_user_id, app_private.child_family_id(_child_id))
      OR app_private.has_role(_user_id, 'admin');
$$;

CREATE OR REPLACE FUNCTION app_private.task_family_id(_task_id UUID)
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT family_id FROM public.tasks WHERE id = _task_id;
$$;

CREATE OR REPLACE FUNCTION app_private.task_child_id(_task_id UUID)
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT child_id FROM public.tasks WHERE id = _task_id;
$$;

CREATE OR REPLACE FUNCTION app_private.goal_child_id(_goal_id UUID)
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT child_id FROM public.goals WHERE id = _goal_id;
$$;

-- trigger functions are not meant to be called directly
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.award_xp_on_subtask_approval() FROM PUBLIC, anon, authenticated;

-- ===== recreate policies against app_private helpers =====
CREATE POLICY "profiles_select_self_or_admin" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR app_private.has_role(auth.uid(), 'admin'));
CREATE POLICY "profiles_update_self_or_admin" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR app_private.has_role(auth.uid(), 'admin'));

CREATE POLICY "user_roles_select_self_or_admin" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR app_private.has_role(auth.uid(), 'admin'));

CREATE POLICY "families_select_member_or_admin" ON public.families FOR SELECT TO authenticated
  USING (app_private.is_family_member(auth.uid(), id) OR app_private.has_role(auth.uid(), 'admin'));
CREATE POLICY "families_update_parent_or_admin" ON public.families FOR UPDATE TO authenticated
  USING (app_private.is_family_parent(auth.uid(), id) OR app_private.has_role(auth.uid(), 'admin'));
CREATE POLICY "families_delete_admin" ON public.families FOR DELETE TO authenticated
  USING (app_private.has_role(auth.uid(), 'admin'));

CREATE POLICY "family_members_select" ON public.family_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR app_private.is_family_member(auth.uid(), family_id) OR app_private.has_role(auth.uid(), 'admin'));
CREATE POLICY "family_members_insert" ON public.family_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR app_private.is_family_parent(auth.uid(), family_id) OR app_private.has_role(auth.uid(), 'admin'));
CREATE POLICY "family_members_update" ON public.family_members FOR UPDATE TO authenticated
  USING (app_private.is_family_parent(auth.uid(), family_id) OR app_private.has_role(auth.uid(), 'admin'));
CREATE POLICY "family_members_delete" ON public.family_members FOR DELETE TO authenticated
  USING (app_private.is_family_parent(auth.uid(), family_id) OR app_private.has_role(auth.uid(), 'admin'));

CREATE POLICY "child_profiles_select" ON public.child_profiles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR app_private.is_family_member(auth.uid(), family_id) OR app_private.has_role(auth.uid(), 'admin'));
CREATE POLICY "child_profiles_insert" ON public.child_profiles FOR INSERT TO authenticated
  WITH CHECK (app_private.is_family_parent(auth.uid(), family_id) OR app_private.has_role(auth.uid(), 'admin'));
CREATE POLICY "child_profiles_update" ON public.child_profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR app_private.is_family_parent(auth.uid(), family_id) OR app_private.has_role(auth.uid(), 'admin'));
CREATE POLICY "child_profiles_delete" ON public.child_profiles FOR DELETE TO authenticated
  USING (app_private.is_family_parent(auth.uid(), family_id) OR app_private.has_role(auth.uid(), 'admin'));

CREATE POLICY "link_codes_manage_parent" ON public.link_codes FOR ALL TO authenticated
  USING (app_private.can_manage_child(auth.uid(), child_id))
  WITH CHECK (app_private.can_manage_child(auth.uid(), child_id));

CREATE POLICY "education_methods_select_public" ON public.education_methods FOR SELECT TO anon
  USING (enabled);
CREATE POLICY "education_methods_select_auth" ON public.education_methods FOR SELECT TO authenticated
  USING (enabled OR app_private.has_role(auth.uid(), 'admin'));
CREATE POLICY "education_methods_write_admin" ON public.education_methods FOR ALL TO authenticated
  USING (app_private.has_role(auth.uid(), 'admin'))
  WITH CHECK (app_private.has_role(auth.uid(), 'admin'));

CREATE POLICY "tasks_select" ON public.tasks FOR SELECT TO authenticated
  USING (app_private.is_family_member(auth.uid(), family_id)
         OR (child_id IS NOT NULL AND app_private.is_my_child_row(auth.uid(), child_id))
         OR app_private.has_role(auth.uid(), 'admin'));
CREATE POLICY "tasks_insert_parent" ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (app_private.is_family_parent(auth.uid(), family_id) OR app_private.has_role(auth.uid(), 'admin'));
CREATE POLICY "tasks_update" ON public.tasks FOR UPDATE TO authenticated
  USING (app_private.is_family_parent(auth.uid(), family_id)
         OR (child_id IS NOT NULL AND app_private.is_my_child_row(auth.uid(), child_id))
         OR app_private.has_role(auth.uid(), 'admin'));
CREATE POLICY "tasks_delete_parent" ON public.tasks FOR DELETE TO authenticated
  USING (app_private.is_family_parent(auth.uid(), family_id) OR app_private.has_role(auth.uid(), 'admin'));

CREATE POLICY "sub_tasks_select" ON public.sub_tasks FOR SELECT TO authenticated
  USING (app_private.is_family_member(auth.uid(), app_private.task_family_id(task_id))
         OR app_private.is_my_child_row(auth.uid(), app_private.task_child_id(task_id))
         OR app_private.has_role(auth.uid(), 'admin'));
CREATE POLICY "sub_tasks_insert_parent" ON public.sub_tasks FOR INSERT TO authenticated
  WITH CHECK (app_private.is_family_parent(auth.uid(), app_private.task_family_id(task_id)) OR app_private.has_role(auth.uid(), 'admin'));
CREATE POLICY "sub_tasks_update" ON public.sub_tasks FOR UPDATE TO authenticated
  USING (app_private.is_family_parent(auth.uid(), app_private.task_family_id(task_id))
         OR app_private.is_my_child_row(auth.uid(), app_private.task_child_id(task_id))
         OR app_private.has_role(auth.uid(), 'admin'));
CREATE POLICY "sub_tasks_delete_parent" ON public.sub_tasks FOR DELETE TO authenticated
  USING (app_private.is_family_parent(auth.uid(), app_private.task_family_id(task_id)) OR app_private.has_role(auth.uid(), 'admin'));

CREATE POLICY "goals_select" ON public.goals FOR SELECT TO authenticated
  USING (app_private.can_access_child(auth.uid(), child_id));
CREATE POLICY "goals_write_parent" ON public.goals FOR ALL TO authenticated
  USING (app_private.can_manage_child(auth.uid(), child_id))
  WITH CHECK (app_private.can_manage_child(auth.uid(), child_id));

CREATE POLICY "goal_progress_select" ON public.goal_progress FOR SELECT TO authenticated
  USING (app_private.can_access_child(auth.uid(), app_private.goal_child_id(goal_id)));
CREATE POLICY "goal_progress_write_parent" ON public.goal_progress FOR ALL TO authenticated
  USING (app_private.can_manage_child(auth.uid(), app_private.goal_child_id(goal_id)))
  WITH CHECK (app_private.can_manage_child(auth.uid(), app_private.goal_child_id(goal_id)));

CREATE POLICY "messages_select" ON public.messages FOR SELECT TO authenticated
  USING (app_private.is_family_member(auth.uid(), family_id)
         OR (child_id IS NOT NULL AND app_private.is_my_child_row(auth.uid(), child_id))
         OR app_private.has_role(auth.uid(), 'admin'));
CREATE POLICY "messages_insert" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (sender_user_id = auth.uid()
              AND (app_private.is_family_member(auth.uid(), family_id)
                   OR (child_id IS NOT NULL AND app_private.is_my_child_row(auth.uid(), child_id))));
CREATE POLICY "messages_update" ON public.messages FOR UPDATE TO authenticated
  USING (app_private.is_family_member(auth.uid(), family_id)
         OR (child_id IS NOT NULL AND app_private.is_my_child_row(auth.uid(), child_id)));

CREATE POLICY "notifications_select" ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid()
         OR (child_id IS NOT NULL AND app_private.can_access_child(auth.uid(), child_id))
         OR app_private.has_role(auth.uid(), 'admin'));
CREATE POLICY "notifications_update_own" ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR (child_id IS NOT NULL AND app_private.can_access_child(auth.uid(), child_id)));
CREATE POLICY "notifications_insert" ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR (child_id IS NOT NULL AND app_private.can_manage_child(auth.uid(), child_id)));

CREATE POLICY "achievements_select" ON public.achievements FOR SELECT TO authenticated
  USING (app_private.can_access_child(auth.uid(), child_id));
CREATE POLICY "achievements_write_parent" ON public.achievements FOR ALL TO authenticated
  USING (app_private.can_manage_child(auth.uid(), child_id))
  WITH CHECK (app_private.can_manage_child(auth.uid(), child_id));

CREATE POLICY "money_ledger_select" ON public.money_ledger FOR SELECT TO authenticated
  USING (app_private.can_access_child(auth.uid(), child_id));
CREATE POLICY "money_ledger_write_parent" ON public.money_ledger FOR ALL TO authenticated
  USING (app_private.can_manage_child(auth.uid(), child_id))
  WITH CHECK (app_private.can_manage_child(auth.uid(), child_id));

CREATE POLICY "subscriptions_select_member" ON public.subscriptions FOR SELECT TO authenticated
  USING (app_private.is_family_member(auth.uid(), family_id) OR app_private.has_role(auth.uid(), 'admin'));

CREATE POLICY "audit_log_select_admin" ON public.audit_log FOR SELECT TO authenticated
  USING (app_private.has_role(auth.uid(), 'admin'));