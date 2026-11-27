/**
 * Genera el archivo iCalendar (RFC 5545) del calendario suscrito de cada persona.
 * Lo leen Google Calendar, Apple Calendar y Outlook con el enlace secreto /api/calendario/<token>.
 * Google tarda hasta ~24 h en refrescar calendarios suscritos: lo urgente siempre va por aviso de la app.
 */
import { addDays, SCHOOL_TZ, todayLocal } from "@/lib/time";
import { KIND_LABEL, type EventKind } from "./kinds";

export type FeedEvent = {
  id: string;
  kind: EventKind;
  title: string;
  description: string | null;
  starts_on: string;
  ends_on: string;
  start_time: string | null;
  end_time: string | null;
  updated_at?: string | null;
  group_label: string | null;
};
export type FeedPayment = { id: string; concept: string; due_on: string; student: string };
export type FeedClass = { id: string; weekday: number; starts_at: string; ends_at: string; subject: string; group: string; room: string | null };
export type Feed = {
  school: string | null;
  events: FeedEvent[];
  payments: FeedPayment[];
  classes: FeedClass[];
  no_class: { from: string; to: string }[];
  year_end: string | null;
};

/** Escapa texto según RFC 5545 §3.3.11. */
export function escapeText(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Dobla líneas a 75 octetos sin partir caracteres UTF-8 (RFC 5545 §3.1). */
export function fold(line: string) {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const out: string[] = [];
  let cur = "";
  let bytes = 0;
  let limit = 75;
  for (const ch of line) {
    const b = enc.encode(ch).length;
    if (bytes + b > limit) {
      out.push(cur);
      cur = "";
      bytes = 0;
      limit = 74; // las líneas de continuación empiezan con un espacio
    }
    cur += ch;
    bytes += b;
  }
  out.push(cur);
  return out.join("\r\n ");
}

const d8 = (date: string) => date.replaceAll("-", "");
const t6 = (time: string) => time.slice(0, 8).replaceAll(":", "").padEnd(6, "0");
const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

function addHour(time: string) {
  const [h, m] = time.split(":").map(Number);
  return `${String(Math.min(h + 1, 23)).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

const VTIMEZONE = [
  "BEGIN:VTIMEZONE",
  `TZID:${SCHOOL_TZ}`,
  "BEGIN:STANDARD",
  "DTSTART:19700101T000000",
  "TZOFFSETFROM:-0600",
  "TZOFFSETTO:-0600",
  "TZNAME:CST",
  "END:STANDARD",
  "END:VTIMEZONE",
];

/** Recordatorio a las 9:00 del día anterior (para eventos de todo el día). Google lo ignora en suscripciones; Apple y Outlook sí. */
const ALARM_DAY_BEFORE = ["BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:Recordatorio", "TRIGGER:-PT15H", "END:VALARM"];

/** Fechas de un rango (inclusive). */
function datesBetween(from: string, to: string) {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

const isoWeekday = (date: string) => ((new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7) + 1;

export function buildIcs(feed: Feed, now = new Date()): string {
  const L: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Avanza//Calendario escolar//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(feed.school ? `${feed.school} · Avanza` : "Avanza")}`,
    `X-WR-TIMEZONE:${SCHOOL_TZ}`,
    "REFRESH-INTERVAL;VALUE=DURATION:PT6H",
    "X-PUBLISHED-TTL:PT6H",
    ...VTIMEZONE,
  ];
  const dtstamp = stamp(now);

  for (const e of feed.events) {
    const summary = e.group_label ? `${e.title} · ${e.group_label}` : e.title;
    L.push("BEGIN:VEVENT", `UID:${e.id}@avanza`, `DTSTAMP:${dtstamp}`);
    if (e.start_time) {
      L.push(`DTSTART;TZID=${SCHOOL_TZ}:${d8(e.starts_on)}T${t6(e.start_time)}`);
      L.push(`DTEND;TZID=${SCHOOL_TZ}:${d8(e.ends_on)}T${t6(e.end_time ?? addHour(e.start_time))}`);
    } else {
      L.push(`DTSTART;VALUE=DATE:${d8(e.starts_on)}`, `DTEND;VALUE=DATE:${d8(addDays(e.ends_on, 1))}`, "TRANSP:TRANSPARENT");
    }
    L.push(`SUMMARY:${escapeText(summary)}`, `CATEGORIES:${escapeText(KIND_LABEL[e.kind] ?? "Aviso")}`);
    if (e.description) L.push(`DESCRIPTION:${escapeText(e.description)}`);
    if (e.updated_at) L.push(`LAST-MODIFIED:${stamp(new Date(e.updated_at))}`);
    if (e.kind === "examen" && !e.start_time) L.push(...ALARM_DAY_BEFORE);
    L.push("END:VEVENT");
  }

  // Fechas de pago: solo el concepto, nunca montos ni si está pagado (el calendario se puede compartir).
  for (const p of feed.payments) {
    L.push(
      "BEGIN:VEVENT",
      `UID:pago-${p.id}@avanza`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART;VALUE=DATE:${d8(p.due_on)}`,
      `DTEND;VALUE=DATE:${d8(addDays(p.due_on, 1))}`,
      "TRANSP:TRANSPARENT",
      `SUMMARY:${escapeText(`Fecha de pago: ${p.concept} (${p.student})`)}`,
      "CATEGORIES:Pago",
      ...ALARM_DAY_BEFORE,
      "END:VEVENT",
    );
  }

  // Clases del maestro: semanales hasta fin de ciclo, sin los días sin clases.
  if (feed.classes.length && feed.year_end) {
    const today = todayLocal(now);
    const monday = addDays(today, 1 - isoWeekday(today));
    const offDays = new Set(feed.no_class.flatMap((r) => datesBetween(r.from, r.to)));
    const until = `${d8(feed.year_end)}T235959Z`;
    for (const c of feed.classes) {
      const first = addDays(monday, c.weekday - 1);
      if (first > feed.year_end) continue;
      const ex = [...offDays].filter((d) => d >= first && d <= feed.year_end! && isoWeekday(d) === c.weekday).sort();
      L.push(
        "BEGIN:VEVENT",
        `UID:clase-${c.id}@avanza`,
        `DTSTAMP:${dtstamp}`,
        `DTSTART;TZID=${SCHOOL_TZ}:${d8(first)}T${t6(c.starts_at)}`,
        `DTEND;TZID=${SCHOOL_TZ}:${d8(first)}T${t6(c.ends_at)}`,
        `RRULE:FREQ=WEEKLY;UNTIL=${until}`,
        `SUMMARY:${escapeText(`${c.subject} · ${c.group}`)}`,
        "CATEGORIES:Clase",
      );
      if (c.room) L.push(`LOCATION:${escapeText(c.room)}`);
      for (const d of ex) L.push(`EXDATE;TZID=${SCHOOL_TZ}:${d8(d)}T${t6(c.starts_at)}`);
      L.push("END:VEVENT");
    }
  }

  L.push("END:VCALENDAR");
  return L.map(fold).join("\r\n") + "\r\n";
}
