-- Carry unfinished tasks over to the next day.
--
-- At midnight in each space's timezone, every unfinished task from an earlier day moves to the
-- new day. original_date keeps the day it was first planned for, so the app can tag it
-- "Backlog from DD-MM-YYYY" and still count it as unfinished on each day it was carried over
-- from (statistics stay honest). Safe to run more than once.

alter table public.tasks
  add column if not exists original_date date;

create index if not exists tasks_open_date_idx
  on public.tasks (task_date)
  where completed_at is null;

-- Moves unfinished tasks from past days to today (in their space's timezone).
-- Returns how many tasks moved. Run by the scheduled job below, not by browsers.
create or replace function public.carry_over_tasks()
returns integer
language sql
set search_path = ''
as $$
  with moved as (
    update public.tasks t
    set original_date = coalesce(t.original_date, t.task_date),
        task_date = (now() at time zone c.timezone)::date
    from public.couples c
    where c.id = t.couple_id
      and t.completed_at is null
      and t.task_date < (now() at time zone c.timezone)::date
    returning 1
  )
  select count(*)::integer from moved;
$$;

revoke all on function public.carry_over_tasks() from public, anon, authenticated;

-- Copies added to another space from the edit form keep the backlog date too.
create or replace function public.save_task(
  p_task_id uuid,
  p_title text,
  p_notes text,
  p_duration integer,
  p_priority smallint,
  p_couple_ids uuid[]
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_task public.tasks;
  v_target uuid[];
  v_link uuid;
begin
  if v_user is null then
    raise exception 'Sign in required';
  end if;

  select array_agg(distinct c) into v_target from unnest(p_couple_ids) c;
  if v_target is null then
    raise exception 'Choose at least one space';
  end if;

  select * into v_task
  from public.tasks
  where id = p_task_id and user_id = v_user
  for update;
  if not found then
    raise exception 'Task not found';
  end if;

  -- A task in several spaces is linked; a task left in one space is not.
  v_link := case
    when array_length(v_target, 1) > 1 then coalesce(v_task.link_id, gen_random_uuid())
  end;

  -- Remove copies from spaces that are no longer selected.
  delete from public.tasks
  where user_id = v_user
    and (id = p_task_id or (v_task.link_id is not null and link_id = v_task.link_id))
    and not (couple_id = any (v_target));

  -- Update the copies that remain.
  update public.tasks
  set title = trim(p_title),
      notes = nullif(trim(p_notes), ''),
      duration_minutes = p_duration,
      priority = p_priority,
      link_id = v_link
  where user_id = v_user
    and (id = p_task_id or (v_task.link_id is not null and link_id = v_task.link_id));

  -- Add copies to newly selected spaces, matching the task's dates and completion.
  insert into public.tasks
    (couple_id, user_id, title, notes, duration_minutes, priority, task_date, original_date,
     completed_at, link_id)
  select c, v_user, trim(p_title), nullif(trim(p_notes), ''), p_duration, p_priority,
         v_task.task_date, v_task.original_date, v_task.completed_at, v_link
  from unnest(v_target) c
  where not exists (
    select 1
    from public.tasks t
    where t.user_id = v_user
      and t.couple_id = c
      and (t.id = p_task_id or (v_task.link_id is not null and t.link_id = v_task.link_id))
  );
end;
$$;

revoke all on function public.save_task(uuid, text, text, integer, smallint, uuid[]) from public, anon;
grant execute on function public.save_task(uuid, text, text, integer, smallint, uuid[]) to authenticated;

-- Run every 15 minutes: midnight lands on the hour, half or quarter hour in every timezone
-- (India's is 18:30 UTC), so tasks move right at 12 AM. Re-running replaces the same job.
create extension if not exists pg_cron;

select cron.schedule(
  'carry-over-unfinished-tasks',
  '*/15 * * * *',
  'select public.carry_over_tasks()'
);

-- Move anything already overdue right away, and show how many tasks moved.
select public.carry_over_tasks() as tasks_moved_now;
