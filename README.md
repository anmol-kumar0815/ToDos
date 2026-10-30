# Our Daily

A private, shared daily to-do app for two people. React + Vite + TypeScript on the front end; Supabase (Auth, Postgres with Row Level Security, Realtime) as the back end.

- Each person has their own task list for each day; both can see each other's.
- Live sync between devices (Realtime nudges a refetch; focus/reconnect also refetch).
- Daily completion per person and combined, weekly statistics, and streaks.
- Installable on a phone home screen (web app manifest + icons).

## Rules the numbers follow

- **Daily completion** = completed ÷ all tasks. No tasks shows "No tasks yet", never 100%.
- **Weekly completion** = total completed ÷ total tasks over the seven days (not an average of daily percentages). The average-daily figure only counts days that have tasks.
- **Streak** = consecutive calendar days on which at least one task was completed. Each person's streak uses their own tasks; the shared (Together) streak counts days when *both* of you completed at least one. A day with no completed task breaks it. Today, while it has nothing completed yet, neither extends nor breaks the *current* streak; *best* is tracked separately.
- **Carry-over**: at midnight in the space's timezone, unfinished tasks from earlier days move to the new day (a scheduled `pg_cron` job every 15 minutes) and are tagged "Backlog from DD-MM-YYYY". A moved task still counts as unfinished on each day it slipped from, so past days' percentages stay accurate.
- **Dates** are stored as Postgres `date` and computed in the workspace timezone (`couples.timezone`, default `Asia/Kolkata`), so a task stays on its day regardless of device timezone.

The logic lives in `src/lib/stats.ts` and is covered by `npm test`.

## Local setup

1. Create a project at <https://supabase.com/dashboard>.
2. Apply the schema. Either paste each file in `supabase/migrations/` into the SQL editor in filename order, or use the CLI:
   ```
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push
   ```
   The migration also adds `tasks` to the `supabase_realtime` publication.
3. Under **Authentication → URL Configuration**, set the Site URL to your production URL and add `http://localhost:5173` to the redirect URLs.
4. Copy `.env.example` to `.env.local` and fill in the project URL and **publishable** key (Project Settings → API). Never put a secret/service-role key in a `VITE_` variable.
5. `npm install && npm run dev`

## First use

Sign up, then choose **Create space** and share the invite code privately. Your partner signs up and chooses **Join space**. You can belong to several spaces (create or join more from the **Your space** page and switch from the header). A space holds at most two people, and each person can edit or delete only their own tasks (enforced by RLS, not just the UI). Treat the invite code like a password.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Typecheck + production build into `dist/` |
| `npm test` | Unit tests for completion, streak, and date logic |
| `npm run lint` | oxlint |
| `node scripts/generate-icons.mjs` | Regenerate the PWA icons |

## Deploy (Vercel)

Push to a private GitHub repo, import it in Vercel, build command `npm run build`, output directory `dist`, and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Then add the Vercel URL to Supabase's Site URL / redirect URLs.

## Backups

Supabase's free plan has no automatic backups and pauses projects after about a week of inactivity. Export periodically, for example:

```
npx supabase db dump --linked -f backup-$(date +%F).sql
npx supabase db dump --linked --data-only -f backup-data-$(date +%F).sql
```

## Before you rely on it

Test with real accounts (a third account is easiest done with a second email):

- [ ] Sign up, confirm email, sign in, sign out, reset password.
- [ ] A third account cannot join a full workspace; a lone account cannot read another workspace's tasks.
- [ ] Neither partner can update or delete the other's tasks (try it via the API/SQL editor with each user's JWT, not just the UI).
- [ ] Both phones update without a manual refresh; reload recovers after being offline.
- [ ] Add/complete/delete tasks and check the percentages and streaks.
- [ ] Add the app to both home screens.

## Not included yet

- Automated RLS tests (pgTAP via `supabase test db` is the natural fit).
- Invite code expiry/revocation.
- A service worker for offline use (the app is installable but needs a connection).
- Dark mode.
