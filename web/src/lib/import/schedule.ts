/**
 * Lee el horario de un grupo desde el Excel que la escuela ya tiene: una tabla con los días
 * (Lunes…Viernes) como columnas y un renglón por hora. No necesita plantilla.
 */
import { norm, toTime, toTimeRange } from "./cells";

export type ScheduleBlock = { weekday: number; starts_at: string; ends_at: string; subject_id: string | null; label: string | null; room?: string | null };
export type ScheduleParse = { blocks: ScheduleBlock[]; asText: string[]; skipped: number[]; error?: string };

const DAY: [RegExp, number][] = [
  [/^lun/, 1],
  [/^mar(?!z)/, 2],
  [/^mi[eé]/, 3],
  [/^jue/, 4],
  [/^vie/, 5],
  [/^s[aá]b/, 6],
];
const dayOf = (v: unknown) => {
  const s = norm(v);
  if (!s || s.length > 12) return 0;
  return DAY.find(([re]) => re.test(s))?.[1] ?? 0;
};
const ALL_DAYS = /^(recreo|receso|descanso|honores|lunch|refrigerio|comida|salida|entrada|homenaje)/;

/** Materia que corresponde al texto de la celda (acepta abreviaturas y nombres del maestro entre paréntesis). */
export function matchSubject(cell: string, subjects: { id: string; name: string }[]): string | null {
  const c = norm(cell.replace(/\(.*?\)/g, ""));
  if (c.length < 3) return null;
  const exact = subjects.find((s) => norm(s.name) === c);
  if (exact) return exact.id;
  const hits = subjects.filter((s) => {
    const n = norm(s.name);
    const first = n.split(" ").find((t) => t.length >= 5);
    return (c.length >= 4 && n.startsWith(c)) || (first !== undefined && c.split(" ").includes(first)) || c.startsWith(n);
  });
  return hits.length === 1 ? hits[0].id : null;
}

export function parseSchedule(sheet: unknown[][], subjects: { id: string; name: string }[]): ScheduleParse {
  const headerRow = sheet.findIndex((r) => (r ?? []).filter((v) => dayOf(v)).length >= 3);
  if (headerRow < 0) return { blocks: [], asText: [], skipped: [], error: "No encontramos los días (Lunes, Martes…) como encabezados de columna." };
  const header = sheet[headerRow];
  const dayCols = header.map((v, i) => [i, dayOf(v)] as const).filter(([, d]) => d);
  const firstDayCol = Math.min(...dayCols.map(([i]) => i));

  // Hora de cada renglón: "8:00 - 9:00" en una celda, o inicio y fin en dos celdas.
  const rows: { r: number; start: string; end: string | null }[] = [];
  for (let r = headerRow + 1; r < sheet.length; r++) {
    const left = (sheet[r] ?? []).slice(0, firstDayCol);
    let start: string | null = null;
    let end: string | null = null;
    for (const v of left) {
      const range = toTimeRange(v);
      if (range) [start, end] = range;
      else {
        const t = toTime(v);
        if (t && !start) start = t;
        else if (t && start && !end) end = t;
      }
    }
    if (start) rows.push({ r, start, end });
  }
  rows.forEach((x, i) => {
    if (!x.end && rows[i + 1] && rows[i + 1].start > x.start) x.end = rows[i + 1].start;
  });

  const blocks: ScheduleBlock[] = [];
  const asText = new Set<string>();
  const skipped: number[] = [];
  for (const { r, start, end } of rows) {
    if (!end || end <= start) {
      skipped.push(r + 1);
      continue;
    }
    const row = sheet[r] ?? [];
    const filled = dayCols.filter(([i]) => String(row[i] ?? "").trim());
    // Recreo u Honores escrito una sola vez (celdas combinadas): aplica a todos los días.
    const spread = filled.length === 1 && ALL_DAYS.test(norm(row[filled[0][0]])) ? dayCols : null;
    for (const [i, d] of spread ?? dayCols) {
      const text = String(row[spread ? filled[0][0] : i] ?? "").trim().replace(/\s+/g, " ");
      if (!text || text === "-" || text === "—") continue;
      const subject = matchSubject(text, subjects);
      if (!subject) asText.add(text.slice(0, 60));
      blocks.push({ weekday: d, starts_at: start, ends_at: end, subject_id: subject, label: subject ? null : text.slice(0, 60) });
    }
  }
  if (!blocks.length) return { blocks, asText: [], skipped, error: "No encontramos horas (por ejemplo «8:00 - 9:00») en la primera columna." };
  return { blocks, asText: [...asText], skipped };
}
