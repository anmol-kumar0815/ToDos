-- Change which spaces a task lives in, together with its other fields, in one transaction.
--
-- 1. Backfill: copies added to several spaces before linking existed were written in one
--    statement, so they share user_id, created_at and task_date and sit in different spaces.
--    Link those groups. Groups with two rows in the same space are ambiguous and are skipped.
-- 2. save_task(): edits a task and its linked copies and adds or removes copies so the task
--    ends up in exactly the chosen spaces. SECURITY INVOKER, so RLS still applies: it can only
--    touch the caller's own tasks, and only create copies in spaces the caller belongs to.

-- Self-contained: also creates the link column if the previous migration was never applied.
alter table public.tasks
  add column if not exists link_id uuid;

create index if not exists tasks_link_idx
  on public.tasks (link_id)
  where link_id is not null;

update public.tasks t
set link_id = g.link_id
from (
  select user_id, created_at, task_date, gen_random_uuid() as link_id
  from public.tasks
  where link_id is null
  group by user_id, created_at, task_date
  having count(*) > 1
     and count(*) = count(distinct couple_id)
) g
where t.link_id is null
  and t.user_id = g.user_id
  and t.created_at = g.created_at
  and t.task_date = g.task_date;

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

  -- Add copies to newly selected spaces, matching the task's date and completion.
  insert into public.tasks
    (couple_id, user_id, title, notes, duration_minutes, priority, task_date, completed_at, link_id)
  select c, v_user, trim(p_title), nullif(trim(p_notes), ''), p_duration, p_priority,
         v_task.task_date, v_task.completed_at, v_link
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
