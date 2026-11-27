import { addDays, SCHOOL_TZ } from "@/lib/time";

const d8 = (date: string) => date.replaceAll("-", "");
const t6 = (time: string) => time.slice(0, 8).replaceAll(":", "").padEnd(6, "0");

/** Enlace "Agregar a Google Calendar" para un solo evento (aparece al instante, sin esperar la suscripción). */
export function googleEventUrl(e: { title: string; description?: string | null; starts_on: string; ends_on: string; start_time?: string | null; end_time?: string | null }) {
  const dates = e.start_time
    ? `${d8(e.starts_on)}T${t6(e.start_time)}/${d8(e.ends_on)}T${t6(e.end_time ?? e.start_time)}`
    : `${d8(e.starts_on)}/${d8(addDays(e.ends_on, 1))}`;
  const q = new URLSearchParams({ action: "TEMPLATE", text: e.title, dates, ctz: SCHOOL_TZ });
  if (e.description) q.set("details", e.description);
  return `https://calendar.google.com/calendar/render?${q}`;
}

/** Enlaces para suscribirse al calendario privado desde cada aplicación. */
export function subscribeLinks(feedUrl: string, name: string) {
  const webcal = feedUrl.replace(/^https?:\/\//, "webcal://");
  return {
    feedUrl,
    google: `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcal)}`,
    apple: webcal,
    outlook: `https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent(feedUrl)}&name=${encodeURIComponent(name)}`,
  };
}
