-- Email the partner when someone marks the day done.
--
-- notified_at records that the email for this person and day has gone out, so marking,
-- undoing and marking again sends at most one email per day. Only the server-side function
-- (service role) sets it: column-level grants keep browsers from writing it, so nobody can
-- clear it to make the function email their partner again. Safe to run more than once.

alter table public.day_done
  add column if not exists notified_at timestamptz;

-- Browsers may write only these columns (the upsert also sets the key columns).
revoke insert, update on public.day_done from authenticated;
grant insert (user_id, day, done_at) on public.day_done to authenticated;
grant update (user_id, day, done_at) on public.day_done to authenticated;
