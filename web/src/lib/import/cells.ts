/** Ayudas para leer celdas de Excel tal como las escriben las escuelas. */
import { matchScore, norm, type RosterStudent } from "./gradebook";

/** Alumno con mejor coincidencia de nombre; null si no hay o si hay empate. */
export function bestStudent(text: string, roster: RosterStudent[]): string | null {
  let best = 0;
  let id: string | null = null;
  let tie = false;
  for (const s of roster) {
    const sc = matchScore(text, s);
    if (sc > best) [best, id, tie] = [sc, s.id, false];
    else if (sc === best && sc > 0) tie = true;
  }
  return best > 0 && !tie ? id : null;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Fecha YYYY-MM-DD desde Date de Excel, número de serie o texto dd/mm/aaaa o aaaa-mm-dd. */
export function toDate(v: unknown): string | null {
  if (v instanceof Date && !Number.isNaN(v.getTime())) return `${v.getUTCFullYear()}-${pad(v.getUTCMonth() + 1)}-${pad(v.getUTCDate())}`;
  if (typeof v === "number" && v > 20000 && v < 80000) {
    const d = new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 86400000);
    return toDate(d);
  }
  const s = String(v ?? "").trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${pad(+m[2])}-${pad(+m[3])}`;
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (m) {
    const y = m[3].length === 2 ? 2000 + +m[3] : +m[3];
    if (+m[2] >= 1 && +m[2] <= 12 && +m[1] >= 1 && +m[1] <= 31) return `${y}-${pad(+m[2])}-${pad(+m[1])}`;
  }
  return null;
}

/** Hora HH:MM desde Date de Excel (1899-12-30), fracción de día o texto "7:30", "07.30", "1:30 pm". */
export function toTime(v: unknown): string | null {
  if (v instanceof Date && !Number.isNaN(v.getTime())) return `${pad(v.getUTCHours())}:${pad(v.getUTCMinutes())}`;
  if (typeof v === "number" && v >= 0 && v < 1) {
    const mins = Math.round(v * 1440);
    return `${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`;
  }
  const m = String(v ?? "").trim().toLowerCase().match(/^(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?$/);
  if (!m) return null;
  let h = +m[1];
  const min = +(m[2] ?? 0);
  if (m[3]?.startsWith("p") && h < 12) h += 12;
  if (h > 23 || min > 59) return null;
  return `${pad(h)}:${pad(min)}`;
}

/** "8:00 - 9:00", "08:00 a 08:50 hrs", "7:30–8:20" → [inicio, fin]. */
export function toTimeRange(v: unknown): [string, string] | null {
  const s = String(v ?? "").toLowerCase().replace(/hrs?\.?|horas/g, "").trim();
  const m = s.match(/^(\d{1,2}(?:[:.]\d{2})?\s*(?:am|pm)?)\s*(?:-|–|—|a|al|\/)\s*(\d{1,2}(?:[:.]\d{2})?\s*(?:am|pm)?)$/);
  if (!m) return null;
  const a = toTime(m[1]);
  let b = toTime(m[2]);
  if (!a || !b) return null;
  // "12:30 - 1:20" en horario escolar es de tarde
  if (b < a && +b.slice(0, 2) < 12) b = `${String(+b.slice(0, 2) + 12).padStart(2, "0")}${b.slice(2)}`;
  return b > a ? [a, b] : null;
}

/** Número desde 3500, "3,500.00", "$3 500". */
export function toAmount(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const s = String(v ?? "").replace(/[$\s]/g, "").replace(/,(?=\d{3}(\D|$))/g, "");
  if (!/^\d+(\.\d+)?$/.test(s)) return null;
  return Number(s);
}

export { norm };
