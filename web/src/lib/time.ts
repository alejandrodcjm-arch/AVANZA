/** Fechas y horas siempre en la zona de la escuela (el servidor corre en UTC). */
export const SCHOOL_TZ = "America/Mexico_City";

/** Fecha local YYYY-MM-DD en la zona de la escuela. */
export function todayLocal(now = new Date(), tz = SCHOOL_TZ) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** Hora local (0–23) en la zona de la escuela. */
export function localHour(now = new Date(), tz = SCHOOL_TZ) {
  return Number(new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", hourCycle: "h23" }).format(now));
}

/** Horario de descanso de las familias: no se mandan avisos no urgentes de 21:00 a 6:59. */
export function isQuietHours(now = new Date(), tz = SCHOOL_TZ) {
  const h = localHour(now, tz);
  return h >= 21 || h < 7;
}

export function isWeekday(date: string) {
  const d = new Date(`${date}T12:00:00Z`).getUTCDay();
  return d >= 1 && d <= 5;
}

export function addDays(date: string, days: number) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Primer día del mes anterior (para revisar resúmenes del mes que terminó). */
export function previousMonthStart(date: string) {
  const [y, m] = date.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 2, 1));
  return d.toISOString().slice(0, 10);
}

export function monthStart(date: string) {
  return `${date.slice(0, 7)}-01`;
}
