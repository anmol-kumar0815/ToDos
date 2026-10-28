-- Tasks added to several spaces at once share a link_id, so completing, editing or deleting
-- one copy can be applied to all of them. NULL means the task lives in one space only.
-- Existing grants and RLS policies are table-level: updates and deletes can only ever touch
-- the caller's own rows, so a link can never reach anyone else's tasks.

alter table public.tasks
  add column if not exists link_id uuid;

create index if not exists tasks_link_idx
  on public.tasks (link_id)
  where link_id is not null;
