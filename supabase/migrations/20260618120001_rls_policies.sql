-- Row-level security — see docs/BACKEND.md

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.link_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

-- Helpers (SECURITY DEFINER — run as owner, not caller)
CREATE OR REPLACE FUNCTION public.is_linked_to_teen(p_teen_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.links
    WHERE teen_user_id = p_teen_user_id
      AND adult_user_id = auth.uid()
      AND status = 'active'
  );
$$;

-- users
CREATE POLICY users_select_own ON public.users
  FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY users_update_own ON public.users
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- links
CREATE POLICY links_select_participant ON public.links
  FOR SELECT TO authenticated
  USING (teen_user_id = auth.uid() OR adult_user_id = auth.uid());

CREATE POLICY links_insert_teen ON public.links
  FOR INSERT TO authenticated
  WITH CHECK (teen_user_id = auth.uid());

CREATE POLICY links_insert_adult ON public.links
  FOR INSERT TO authenticated
  WITH CHECK (adult_user_id = auth.uid());

CREATE POLICY links_delete_participant ON public.links
  FOR DELETE TO authenticated
  USING (teen_user_id = auth.uid() OR adult_user_id = auth.uid());

-- link_invites (teen creates; adult reads active codes when accepting)
CREATE POLICY link_invites_teen_all ON public.link_invites
  FOR ALL TO authenticated
  USING (teen_user_id = auth.uid())
  WITH CHECK (teen_user_id = auth.uid());

-- Adult code lookup will use a SECURITY DEFINER RPC in a later migration.

-- sessions
CREATE POLICY sessions_teen_all ON public.sessions
  FOR ALL TO authenticated
  USING (teen_user_id = auth.uid())
  WITH CHECK (teen_user_id = auth.uid());

CREATE POLICY sessions_adult_select ON public.sessions
  FOR SELECT TO authenticated
  USING (public.is_linked_to_teen(teen_user_id));

-- submissions
CREATE POLICY submissions_teen_insert ON public.submissions
  FOR INSERT TO authenticated
  WITH CHECK (submitted_by_user_id = auth.uid());

CREATE POLICY submissions_teen_select ON public.submissions
  FOR SELECT TO authenticated
  USING (submitted_by_user_id = auth.uid());

CREATE POLICY submissions_adult_select ON public.submissions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.sessions s
      WHERE s.id = session_id
        AND public.is_linked_to_teen(s.teen_user_id)
    )
  );

-- approvals
CREATE POLICY approvals_adult_insert ON public.approvals
  FOR INSERT TO authenticated
  WITH CHECK (approved_by_user_id = auth.uid());

CREATE POLICY approvals_adult_select ON public.approvals
  FOR SELECT TO authenticated
  USING (approved_by_user_id = auth.uid());

CREATE POLICY approvals_teen_select ON public.approvals
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.sessions s
      WHERE s.id = session_id
        AND s.teen_user_id = auth.uid()
    )
  );

-- push_tokens
CREATE POLICY push_tokens_own ON public.push_tokens
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
