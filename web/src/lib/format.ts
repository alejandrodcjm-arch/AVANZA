const dateFmt = new Intl.DateTimeFormat("es-MX", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const shortFmt = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", timeZone: "UTC" });
const monthFmt = new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric", timeZone: "UTC" });
const relFmt = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "America/Mexico_City" });

const at = (d: string) => new Date(d.length === 10 ? `${d}T12:00:00Z` : d);

/** "jueves 26 de noviembre" */
export const formatDate = (d: string) => dateFmt.format(at(d));
/** "26 nov" */
export const formatShortDate = (d: string) => shortFmt.format(at(d));
/** "noviembre de 2026" */
export const formatMonth = (d: string) => monthFmt.format(at(d));
/** "26 nov, 7:05" (para avisos) */
export const formatDateTime = (d: string) => relFmt.format(new Date(d));

export function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

/** 9 → "9", 8.5 → "8.5" */
export function formatScore(n: number | null | undefined) {
  if (n === null || n === undefined) return "—";
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export function studentName(s: { first_name: string; last_name: string; second_last_name?: string | null }) {
  return [s.first_name, s.last_name, s.second_last_name].filter(Boolean).join(" ");
}

export function firstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] ?? "";
}
