-- Our Daily: shared workspace + daily tasks.
-- Access is enforced here with RLS; the browser only holds the publishable key.

create table public.couples (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Our space',
  timezone text not null default 'Asia/Kolkata',
  invite_code text not null unique
    default replace(gen_random_uuid()::text, '-', ''),
  created_at timestamptz not null default now()
);

create table public.couple_members (
  couple_id uuid not null
    references public.couples(id) on delete cascade,
  user_id uuid not null
    references auth.users(id) on delete cascade,
  role text not null default 'member'
    check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (couple_id, user_id),
  -- One workspace per user.
  unique (user_id)
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null,
  user_id uuid not null,
  title text not null
    check (char_length(trim(title)) between 1 and 200),
  task_date date not null default (now() at time zone 'UTC')::date,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  foreign key (couple_id, user_id)
    references public.couple_members(couple_id, user_id)
    on delete cascade
);

create index tasks_couple_date_idx
  on public.tasks (couple_id, task_date);

create index tasks_owner_date_idx
  on public.tasks (user_id, task_date);

-- Keep updated_at honest regardless of what the client sends.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger tasks_touch_updated_at
before update on public.tasks
for each row execute function public.touch_updated_at();

alter table public.couples enable row level security;
alter table public.couple_members enable row level security;
alter table public.tasks enable row level security;

-- Helper: check workspace membership without recursive RLS.
create or replace function public.is_couple_member(p_couple_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.couple_members m
    where m.couple_id = p_couple_id
      and m.user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_couple_member(uuid) from public, anon;
grant execute on function public.is_couple_member(uuid)
  to authenticated;

-- Workspaces: members can read their own workspace.
create policy "Members read their workspace"
on public.couples for select
to authenticated
using (public.is_couple_member(id));

-- Memberships: users can see memberships in their workspace.
create policy "Members read workspace members"
on public.couple_members for select
to authenticated
using (public.is_couple_member(couple_id));

-- Tasks: both members can read tasks in their shared workspace.
create policy "Members read shared tasks"
on public.tasks for select
to authenticated
using (public.is_couple_member(couple_id));

-- Users can create tasks only for themselves.
create policy "Members create own tasks"
on public.tasks for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and public.is_couple_member(couple_id)
);

-- Users can update only their own tasks.
create policy "Members update own tasks"
on public.tasks for update
to authenticated
using (
  user_id = (select auth.uid())
  and public.is_couple_member(couple_id)
)
with check (
  user_id = (select auth.uid())
  and public.is_couple_member(couple_id)
);

create policy "Members delete own tasks"
on public.tasks for delete
to authenticated
using (
  user_id = (select auth.uid())
  and public.is_couple_member(couple_id)
);

-- Do not expose these tables to signed-out users.
revoke all on public.couples,
  public.couple_members, public.tasks from anon;

grant select on public.couples,
  public.couple_members to authenticated;

grant select, insert, update, delete
  on public.tasks to authenticated;

-- Create a workspace and its owner membership atomically.
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

  if exists (
    select 1 from public.couple_members
    where user_id = v_user
  ) then
    raise exception 'You already belong to a workspace';
  end if;

  insert into public.couples(name)
  values (coalesce(nullif(trim(p_name), ''), 'Our space'))
  returning id into v_id;

  insert into public.couple_members(couple_id, user_id, role)
  values (v_id, v_user, 'owner');

  return v_id;
end;
$$;

-- Join an existing workspace by invitation code.
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

  if exists (
    select 1 from public.couple_members
    where user_id = v_user
  ) then
    raise exception 'You already belong to a workspace';
  end if;

  -- Row lock serializes concurrent joins so the size check is reliable.
  select id into v_id
  from public.couples
  where invite_code = trim(p_code)
  for update;

  if v_id is null then
    raise exception 'Invalid invitation code';
  end if;

  if (
    select count(*) from public.couple_members
    where couple_id = v_id
  ) >= 2 then
    raise exception 'Workspace is full';
  end if;

  insert into public.couple_members(couple_id, user_id)
  values (v_id, v_user);

  return v_id;
end;
$$;

revoke all on function public.create_couple(text)
  from public, anon;
revoke all on function public.join_couple(text)
  from public, anon;

grant execute on function public.create_couple(text)
  to authenticated;
grant execute on function public.join_couple(text)
  to authenticated;

-- Realtime: broadcast task changes (RLS still applies to subscribers).
alter publication supabase_realtime add table public.tasks;
