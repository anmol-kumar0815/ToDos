// Emails a person's partner(s) when they mark themselves done for the day.
//
// Called by the app right after marking the day done. Everything is re-checked here: who the
// caller is (from their access token), that their day is really marked done, and that this
// day hasn't been emailed about already. Partner addresses are read with the service role and
// never sent to the browser.
//
// Secrets (Edge Functions -> Secrets): GMAIL_USER, GMAIL_APP_PASSWORD, and optionally APP_URL.
import { createClient } from 'npm:@supabase/supabase-js@2'
import nodemailer from 'npm:nodemailer@6'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

const DAY = /^\d{4}-\d{2}-\d{2}$/
const DAY_MS = 86_400_000

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const url = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const gmailUser = Deno.env.get('GMAIL_USER')
  const gmailPassword = Deno.env.get('GMAIL_APP_PASSWORD')
  const appUrl = Deno.env.get('APP_URL')
  if (!url || !serviceKey || !gmailUser || !gmailPassword) {
    return json({ error: 'Email is not configured' }, 500)
  }
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } })

  // Who is calling?
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return json({ error: 'Sign in required' }, 401)
  const { data: auth, error: authError } = await admin.auth.getUser(token)
  if (authError || !auth.user) return json({ error: 'Sign in required' }, 401)
  const me = auth.user

  // Which day? Only around today, so nobody can trigger emails for arbitrary dates.
  const { day } = (await req.json().catch(() => ({}))) as { day?: string }
  if (!day || !DAY.test(day)) return json({ error: 'Invalid day' }, 400)
  if (Math.abs(Date.parse(`${day}T00:00:00Z`) - Date.now()) > 2 * DAY_MS) {
    return json({ error: 'Day is too far from today' }, 400)
  }

  // Claim the notification: succeeds once per person and day, and only if marked done.
  const { data: claimed, error: claimError } = await admin
    .from('day_done')
    .update({ notified_at: new Date().toISOString() })
    .eq('user_id', me.id)
    .eq('day', day)
    .not('done_at', 'is', null)
    .is('notified_at', null)
    .select('done_at')
  if (claimError) return json({ error: claimError.message }, 500)
  if (!claimed?.length) return json({ sent: 0, reason: 'already notified or not done' })
  const doneAt = new Date(claimed[0].done_at as string)

  const release = () =>
    admin.from('day_done').update({ notified_at: null }).eq('user_id', me.id).eq('day', day)

  try {
    // Partners: everyone who shares at least one space with the caller.
    const { data: myRows, error: e1 } = await admin
      .from('couple_members')
      .select('couple_id')
      .eq('user_id', me.id)
    if (e1) throw e1
    const coupleIds = myRows.map((r) => r.couple_id as string)
    if (coupleIds.length === 0) return json({ sent: 0, reason: 'no spaces' })

    const [others, couples, tasks] = await Promise.all([
      admin.from('couple_members').select('couple_id, user_id').in('couple_id', coupleIds).neq('user_id', me.id),
      admin.from('couples').select('id, name, timezone').in('id', coupleIds),
      admin
        .from('tasks')
        .select('id, couple_id, link_id, completed_at')
        .eq('user_id', me.id)
        .eq('task_date', day)
        .in('couple_id', coupleIds),
    ])
    if (others.error) throw others.error
    if (couples.error) throw couples.error
    if (tasks.error) throw tasks.error

    const sharedSpaces = new Map<string, string[]>() // partner id -> space ids
    for (const row of others.data) {
      const list = sharedSpaces.get(row.user_id as string) ?? []
      list.push(row.couple_id as string)
      sharedSpaces.set(row.user_id as string, list)
    }
    if (sharedSpaces.size === 0) return json({ sent: 0, reason: 'no partner yet' })

    const spaceById = new Map(couples.data.map((c) => [c.id as string, c]))
    const who = (me.email ?? 'Your partner').split('@')[0]
    const transport = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user: gmailUser, pass: gmailPassword },
    })

    let sent = 0
    let failed = 0
    for (const [partnerId, spaceIds] of sharedSpaces) {
      const { data: partner } = await admin.auth.admin.getUserById(partnerId)
      const to = partner?.user?.email
      if (!to) {
        failed++
        continue
      }

      // Progress in the spaces they share; linked copies of one task count once.
      const shared = tasks.data.filter((t) => spaceIds.includes(t.couple_id as string))
      const unique = new Map(shared.map((t) => [(t.link_id ?? t.id) as string, t.completed_at !== null]))
      const total = unique.size
      const done = [...unique.values()].filter(Boolean).length

      const spaces = spaceIds.map((id) => spaceById.get(id))
      const spaceNames = spaces.map((s) => s?.name as string).filter(Boolean).join(', ')
      const time = new Intl.DateTimeFormat('en-IN', {
        timeZone: (spaces[0]?.timezone as string) ?? 'Asia/Kolkata',
        hour: 'numeric',
        minute: '2-digit',
      }).format(doneAt)
      const progress = total === 0 ? 'No tasks were planned today.' : `${done} of ${total} tasks completed today.`

      const subject = `${who} is done for the day 🌙`
      const text = [
        `${who} marked themselves done for the day at ${time} in ${spaceNames}.`,
        progress,
        appUrl ? `\nOpen ToDo's: ${appUrl}` : '',
      ].join('\n')
      const html = `
        <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#0f172a">
          <p style="font-size:32px;margin:0">🌙</p>
          <h1 style="font-size:20px;margin:12px 0 4px">${escapeHtml(who)} is done for the day</h1>
          <p style="margin:0 0 16px;color:#475569">Marked at ${escapeHtml(time)} in ${escapeHtml(spaceNames)}.</p>
          <p style="margin:0 0 20px;padding:12px 16px;border-radius:12px;background:#eef2ff;color:#3730a3;font-weight:600">${escapeHtml(progress)}</p>
          ${
            appUrl
              ? `<a href="${escapeHtml(appUrl)}" style="display:inline-block;padding:10px 18px;border-radius:10px;background:#4f46e5;color:#fff;text-decoration:none;font-weight:600">Open ToDo's</a>`
              : ''
          }
          <p style="margin:24px 0 0;font-size:12px;color:#94a3b8">You're getting this because you share a space with ${escapeHtml(me.email ?? who)} in ToDo's.</p>
        </div>`

      try {
        await transport.sendMail({
          from: `"ToDo's" <${gmailUser}>`,
          to,
          replyTo: me.email ?? undefined,
          subject,
          text,
          html,
        })
        sent++
      } catch (err) {
        console.error('send failed', partnerId, err)
        failed++
      }
    }

    // Nothing went out: let a later attempt try again.
    if (sent === 0) await release()
    return json({ sent, failed })
  } catch (err) {
    console.error(err)
    await release()
    return json({ error: err instanceof Error ? err.message : 'Failed to notify' }, 500)
  }
})
