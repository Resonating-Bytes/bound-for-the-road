-- Allow authenticated users to create their own profile row when missing
-- (e.g. auth user exists but public.users was deleted during dev reset).

CREATE POLICY users_insert_own ON public.users
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());
