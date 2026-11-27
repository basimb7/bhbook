-- Seed: one property. Edit the name/slug to suit, then run once.
insert into public.properties (slug, name, description, address)
values ('main', 'BH Holiday Home', 'Our cosy holiday home.', 'Update address in Supabase')
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------
-- Create the admin login:
--   1. Supabase Dashboard → Authentication → Users → "Add user"
--      (email + password, tick "Auto confirm user").
--   2. Then link a username to that user (replace the email below):
--
-- insert into public.profiles (id, username, full_name, role)
-- select id, 'admin', 'Property Owner', 'admin'
-- from auth.users where email = 'owner@example.com';
-- ---------------------------------------------------------------------
