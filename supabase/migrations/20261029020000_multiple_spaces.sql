-- Let a user belong to several spaces.
-- RLS and the tasks foreign key are already keyed by (couple_id, user_id), so tasks stay
-- separated per space; only the one-space-per-user restrictions need to go.

alter table public.couple_members
  drop constraint if exists couple_members_user_id_key;

-- Create a space and its owner membership atomically.
create or replace function public.create_couple(p_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Sign in required';
  end if;

  insert into public.couples(name)
  values (coalesce(nullif(trim(p_name), ''), 'Our space'))
  returning id into v_id;

  insert into public.couple_members(couple_id, user_id, role)
  values (v_id, v_user, 'owner');

  return v_id;
end;
$$;

-- Join an existing space by invitation code.
create or replace function public.join_couple(p_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Sign in required';
  end if;

  -- Row lock serializes concurrent joins so the size check is reliable.
  select id into v_id
  from public.couples
  where invite_code = trim(p_code)
  for update;

  if v_id is null then
    raise exception 'Invalid invitation code';
  end if;

  if exists (
    select 1 from public.couple_members
    where couple_id = v_id and user_id = v_user
  ) then
    raise exception 'You are already in this space';
  end if;

  if (
    select count(*) from public.couple_members
    where couple_id = v_id
  ) >= 2 then
    raise exception 'Space is full';
  end if;

  insert into public.couple_members(couple_id, user_id)
  values (v_id, v_user);

  return v_id;
end;
$$;

-- create or replace keeps existing grants, but state them so this file stands alone.
revoke all on function public.create_couple(text) from public, anon;
revoke all on function public.join_couple(text) from public, anon;
grant execute on function public.create_couple(text) to authenticated;
grant execute on function public.join_couple(text) to authenticated;
