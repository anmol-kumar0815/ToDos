-- Admin overview: signups, spaces, and the tasks in any space.
--
-- Admins are listed by user id, not checked by email at request time, so nobody can become an
-- admin later by signing up or changing their address to a matching email. The list lives in
-- a table the API cannot read; every admin function checks it on the server before returning
-- anything, so hiding the page in the browser is not what protects the data.

create table if not exists public.app_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

alter table public.app_admins enable row level security;
-- No policies and no grants: the browser can neither read nor change this table.
revoke all on public.app_admins from public, anon, authenticated;

insert into public.app_admins (user_id)
select id from auth.users where lower(email) = 'anmolshrivastav.08@gmail.com'
on conflict do nothing;

do $$
begin
  if not exists (select 1 from public.app_admins) then
    raise warning 'No account found for the admin email; sign up with it, then run this file again.';
  end if;
end;
$$;

create or replace function public.is_app_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.app_admins a where a.user_id = (select auth.uid())
  );
$$;

create or replace function public.admin_signups()
returns table (
  email text,
  signed_up_at timestamptz,
  email_confirmed boolean,
  last_sign_in_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  if not public.is_app_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  return query
    select u.email::text, u.created_at, u.email_confirmed_at is not null, u.last_sign_in_at
    from auth.users u
    order by u.created_at;
end;
$$;

create or replace function public.admin_spaces()
returns table (
  id uuid,
  name text,
  created_at timestamptz,
  members bigint,
  people text,
  tasks bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  if not public.is_app_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  -- Invite codes are deliberately left out.
  return query
    select
      c.id,
      c.name,
      c.created_at,
      count(m.user_id),
      string_agg(u.email::text || ' (' || m.role || ')', ', ' order by m.joined_at),
      (select count(*) from public.tasks t where t.couple_id = c.id)
    from public.couples c
    left join public.couple_members m on m.couple_id = c.id
    left join auth.users u on u.id = m.user_id
    group by c.id
    order by c.created_at;
end;
$$;

create or replace function public.admin_space_tasks(p_couple_id uuid)
returns table (
  id uuid,
  task_date date,
  owner text,
  title text,
  priority smallint,
  duration_minutes integer,
  done boolean,
  synced boolean,
  notes text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  if not public.is_app_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  return query
    select
      t.id,
      t.task_date,
      u.email::text,
      t.title,
      t.priority,
      t.duration_minutes,
      t.completed_at is not null,
      t.link_id is not null,
      t.notes
    from public.tasks t
    join auth.users u on u.id = t.user_id
    where t.couple_id = p_couple_id
    order by t.task_date desc, t.created_at desc;
end;
$$;

revoke all on function public.is_app_admin() from public, anon;
revoke all on function public.admin_signups() from public, anon;
revoke all on function public.admin_spaces() from public, anon;
revoke all on function public.admin_space_tasks(uuid) from public, anon;

grant execute on function public.is_app_admin() to authenticated;
grant execute on function public.admin_signups() to authenticated;
grant execute on function public.admin_spaces() to authenticated;
grant execute on function public.admin_space_tasks(uuid) to authenticated;
