import { NextResponse, type NextRequest } from "next/server";
import { isAuthorizedCron } from "@/lib/cron";
import { env } from "@/lib/env";
import { notificationEmail } from "@/lib/notify/emails";
import { sendEmail } from "@/lib/notify/email";
import { pushEnabled, sendPush } from "@/lib/notify/push";
import { createAdminClient } from "@/lib/supabase/admin";
import { isQuietHours } from "@/lib/time";

export const maxDuration = 120;

/**
 * Envía los avisos pendientes: push si la persona lo activó; si no, correo.
 * De 21:00 a 7:00 solo sale lo urgente; lo demás espera a la mañana (respeto al descanso familiar).
 */
export async function POST(req: NextRequest) {
  if (!isAuthorizedCron(req)) return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  const admin = createAdminClient();
  const quiet = isQuietHours();
  let q = admin
    .from("notifications")
    .select("id, user_id, title, body, url, urgent, kind")
    .is("sent_at", null)
    .gte("created_at", new Date(Date.now() - 3 * 86400000).toISOString())
    .order("created_at")
    .limit(200);
  if (quiet) q = q.eq("urgent", true);
  const { data: items, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const base = env().NEXT_PUBLIC_APP_URL;
  const emails = new Map<string, string | null>();
  const subsCache = new Map<string, { id: string; endpoint: string; p256dh: string; auth: string }[]>();
  let pushed = 0;
  let mailed = 0;

  for (const n of items ?? []) {
    const url = `${base}${n.url ?? "/avisos"}`;
    if (!subsCache.has(n.user_id)) {
      const { data } = pushEnabled() ? await admin.from("push_subscriptions").select("id, endpoint, p256dh, auth").eq("user_id", n.user_id) : { data: [] };
      subsCache.set(n.user_id, data ?? []);
    }
    let delivered = false;
    for (const s of subsCache.get(n.user_id)!) {
      const r = await sendPush(s, { title: n.title, body: n.body, url: n.url ?? "/avisos", tag: n.kind });
      if (r === "ok") delivered = true;
      if (r === "gone") await admin.from("push_subscriptions").delete().eq("id", s.id);
    }
    if (delivered) pushed++;
    else {
      if (!emails.has(n.user_id)) {
        const { data } = await admin.auth.admin.getUserById(n.user_id);
        emails.set(n.user_id, data.user?.email ?? null);
      }
      const to = emails.get(n.user_id);
      if (to) {
        const res = await sendEmail({ to, ...notificationEmail({ title: n.title, body: n.body, url }) });
        if (res.ok) {
          delivered = true;
          mailed++;
        }
      }
    }
    if (delivered) await admin.from("notifications").update({ sent_at: new Date().toISOString() }).eq("id", n.id);
  }

  return NextResponse.json({ pending: (items ?? []).length, pushed, mailed, quiet });
}
