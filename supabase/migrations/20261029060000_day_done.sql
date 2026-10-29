-- "Done for the day": a person marks that they've finished for a given day, so whoever shares a
-- space with them can see it. It belongs to the person, not to a space, so it shows in every
-- space they're in. Safe to run more than once.

create table if not exists public.day_done (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  -- Null after "undo". Rows are updated rather than deleted because Realtime can't apply RLS
  -- to delete events, while inserts and updates are only sent to people allowed to see them.
  done_at timestamptz,
  primary key (user_id, day)
);

alter table public.day_done enable row level security;

-- True when the signed-in user and p_user are members of at least one common space.
create or replace function public.shares_space_with(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.couple_members mine
    join public.couple_members theirs on theirs.couple_id = mine.couple_id
    where mine.user_id = (select auth.uid())
      and theirs.user_id = p_user
  );
$$;

revoke all on function public.shares_space_with(uuid) from public, anon;
grant execute on function public.shares_space_with(uuid) to authenticated;

drop policy if exists "See own and partners' day status" on public.day_done;
create policy "See own and partners' day status"
on public.day_done for select
to authenticated
using (user_id = (select auth.uid()) or public.shares_space_with(user_id));

drop policy if exists "Set own day status" on public.day_done;
create policy "Set own day status"
on public.day_done for insert
to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists "Change own day status" on public.day_done;
create policy "Change own day status"
on public.day_done for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

revoke all on public.day_done from public, anon, authenticated;
grant select, insert, update on public.day_done to authenticated;

-- Live updates, so a partner sees the change without refreshing.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'day_done'
  ) then
    alter publication supabase_realtime add table public.day_done;
  end if;
end;
$$;
