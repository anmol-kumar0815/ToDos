-- Optional task details: notes, planned duration, and priority.
-- Existing grants and RLS policies are table-level, so they cover the new columns.

alter table public.tasks
  add column notes text
    check (notes is null or char_length(notes) between 1 and 2000),
  add column duration_minutes integer
    check (duration_minutes is null or duration_minutes between 1 and 1440),
  -- 1 = urgent, 2 = high, 3 = medium, 4 = low
  add column priority smallint
    check (priority is null or priority between 1 and 4);
