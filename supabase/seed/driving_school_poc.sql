-- POC seed: Best Driving School
-- Run in Supabase SQL Editor after migrations.
-- Static 6-digit school code for test instructor onboarding: 847291

INSERT INTO public.driving_schools (
  name,
  owner_email,
  onboarding_link_id,
  phone,
  address,
  email,
  subscribed
)
VALUES (
  'Best Driving School',
  'owner@best-driving.example',
  '847291',
  '(555) 010-2000',
  '123 Main St, Savoy, IL',
  'info@best-driving.example',
  true
)
ON CONFLICT (onboarding_link_id) DO NOTHING;

-- Optional: affiliate an existing instructor user by email match
-- UPDATE public.driving_schools SET owner_email = '<instructor-auth-email>' WHERE onboarding_link_id = '847291';
