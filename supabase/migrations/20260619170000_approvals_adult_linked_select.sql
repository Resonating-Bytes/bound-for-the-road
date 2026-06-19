-- Linked adults can view all approvals on their teens' sessions (not only their own).

CREATE POLICY approvals_adult_select_linked ON public.approvals
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.sessions s
      WHERE s.id = session_id
        AND public.is_linked_to_teen(s.teen_user_id)
    )
  );
