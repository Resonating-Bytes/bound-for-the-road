-- Allow teens to mark their own submissions superseded (withdraw before approval).

CREATE POLICY submissions_teen_update ON public.submissions
  FOR UPDATE TO authenticated
  USING (submitted_by_user_id = auth.uid())
  WITH CHECK (submitted_by_user_id = auth.uid());
