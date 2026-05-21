
-- Add INSERT policy for profiles table (defense-in-depth)
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Restrict user_subscriptions: only service role (via webhooks) should INSERT/UPDATE
-- Regular users should not be able to create or modify their own subscription records
CREATE POLICY "Users cannot insert subscriptions"
  ON public.user_subscriptions FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Users cannot update subscriptions"
  ON public.user_subscriptions FOR UPDATE
  USING (is_admin());
