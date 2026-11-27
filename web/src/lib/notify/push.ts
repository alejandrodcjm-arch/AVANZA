import "server-only";
import webpush from "web-push";
import { env } from "@/lib/env";

export type PushPayload = { title: string; body: string; url: string; tag?: string };
export type PushSub = { endpoint: string; p256dh: string; auth: string };

let configured = false;

export function pushEnabled() {
  const e = env();
  return Boolean(e.NEXT_PUBLIC_VAPID_PUBLIC_KEY && e.VAPID_PRIVATE_KEY);
}

/** Envía un push. Regresa "gone" si la suscripción ya no existe (hay que borrarla). */
export async function sendPush(sub: PushSub, payload: PushPayload): Promise<"ok" | "gone" | "error"> {
  const e = env();
  if (!pushEnabled()) return "error";
  if (!configured) {
    webpush.setVapidDetails(e.VAPID_SUBJECT, e.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, e.VAPID_PRIVATE_KEY!);
    configured = true;
  }
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload),
      { TTL: 60 * 60 * 24, urgency: "normal" },
    );
    return "ok";
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode;
    return status === 404 || status === 410 ? "gone" : "error";
  }
}
