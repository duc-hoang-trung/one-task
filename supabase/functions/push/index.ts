// Edge Function gửi Web Push. Được public.push_due() gọi qua pg_net, chỉ khi có người tới giờ.
// Secret cần đặt: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, PUSH_SHARED_SECRET.
// SUPABASE_URL và SUPABASE_SERVICE_ROLE_KEY do Supabase tự tiêm, không phải khai.
import webpush from 'npm:web-push@3.6.7'

const SECRET = Deno.env.get('PUSH_SHARED_SECRET') ?? ''
const SB_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SB_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@example.com',
  Deno.env.get('VAPID_PUBLIC_KEY') ?? '',
  Deno.env.get('VAPID_PRIVATE_KEY') ?? '',
)

interface Item { endpoint: string; p256dh: string; auth: string; title: string; body: string | null; tag: string }

/** Endpoint đã chết (người dùng gỡ app): xoá khỏi bảng để khỏi bắn vào hư không mãi. */
async function dropDead(endpoints: string[]) {
  if (!endpoints.length || !SB_URL || !SB_KEY) return
  const list = endpoints.map((e) => `"${encodeURIComponent(e)}"`).join(',')
  await fetch(`${SB_URL}/rest/v1/push_subscriptions?endpoint=in.(${list})`, {
    method: 'DELETE',
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
  })
}

Deno.serve(async (req) => {
  // Chỉ pg_net gọi được: không có header đúng thì từ chối, khỏi ai ngoài kia spam.
  if (!SECRET || req.headers.get('x-push-secret') !== SECRET) {
    return new Response('forbidden', { status: 401 })
  }
  const { items = [] } = (await req.json()) as { items?: Item[] }
  const dead: string[] = []
  let sent = 0

  await Promise.all(items.map(async (it) => {
    try {
      await webpush.sendNotification(
        { endpoint: it.endpoint, keys: { p256dh: it.p256dh, auth: it.auth } },
        JSON.stringify({ title: it.title, body: it.body ?? undefined, tag: it.tag }),
      )
      sent++
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode
      if (code === 404 || code === 410) dead.push(it.endpoint)
    }
  }))

  await dropDead(dead)
  return new Response(JSON.stringify({ sent, dead: dead.length }), { headers: { 'Content-Type': 'application/json' } })
})
