/**
 * Lee el registro de Excel que la maestra YA lleva (sin plantilla obligatoria) y obtiene:
 * - qué alumno es cada renglón (por nombre, en cualquier orden: "Apellidos Nombre" o "Nombre Apellidos",
 *   en una columna o separado en varias),
 * - qué columnas son actividades y quién no entregó cada una,
 * - opcionalmente, la columna de promedio o calificación del periodo.
 * Nada se guarda sin que ella vea la vista previa.
 */

export type RosterStudent = { id: string; first_name: string; last_name: string; second_last_name?: string | null };
export type MarkMeaning = "x_missing" | "x_delivered";

export type ActivityColumn = {
  col: number;
  title: string;
  dueOn: string | null;
  missing: string[];
  delivered: number;
  blank: number;
};

export type GradebookParse = {
  headerRow: number;
  matched: { studentId: string; row: number; text: string }[];
  unmatched: { row: number; text: string }[];
  notInFile: string[];
  activities: ActivityColumn[];
  gradeColumn: { col: number; title: string; scores: Record<string, number> } | null;
  error?: string;
};

export const norm = (s: unknown) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-zñ0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const tokens = (s: string) => norm(s).split(" ").filter((t) => t.length > 1 || t === "y");

/** Puntaje de coincidencia entre un texto y un alumno: apellido paterno + primer nombre son obligatorios. */
export function matchScore(text: string, s: RosterStudent): number {
  const t = new Set(tokens(text));
  const last = tokens(s.last_name);
  const first = tokens(s.first_name);
  const second = tokens(s.second_last_name ?? "");
  if (!last.every((x) => t.has(x)) || !first.length || !t.has(first[0])) return 0;
  let score = 2;
  score += first.slice(1).filter((x) => t.has(x)).length;
  score += second.filter((x) => t.has(x)).length;
  return score;
}

const isNumberLike = (v: unknown) => typeof v === "number" || (/^\s*\d+([.,]\d+)?\s*$/.test(String(v ?? "")) && String(v).trim() !== "");
const toNumber = (v: unknown) => (typeof v === "number" ? v : Number(String(v).replace(",", ".")));
const isTextCell = (v: unknown) => typeof v === "string" && /[a-záéíóúñ]/i.test(v) && v.trim().length > 1;

const MISSING_WORDS = new Set(["ne", "n e", "np", "n p", "no", "falta", "no entrego", "pendiente", "sin entregar", "0"]);
const DELIVERED_WORDS = new Set(["si", "sí", "e", "ok", "entrego", "entregado", "listo", "bien", "ent"]);
const GRADE_HEADER = /(promedio|calificacion|calif|final|evaluacion|trimestr|bimestr|periodo)/;
const SKIP_HEADER = /^(no|num|numero|n|#|lista|clave|curp|matricula|sexo|genero|edad|asistencia|faltas|retardos|total|suma|observaciones?)$/;

type Cell = "missing" | "delivered" | "blank" | "unknown";

export function classifyCell(v: unknown, x: MarkMeaning = "x_missing"): Cell {
  if (v === null || v === undefined || String(v).trim() === "") return "blank";
  if (typeof v === "boolean") return v ? "delivered" : "missing";
  if (isNumberLike(v)) return toNumber(v) > 0 ? "delivered" : "missing";
  const s = norm(v);
  const raw = String(v).trim();
  if (/^[✓✔☑√]+$/.test(raw)) return "delivered";
  if (/^[✗✘×]+$/.test(raw)) return "missing";
  if (s === "x") return x === "x_missing" ? "missing" : "delivered";
  if (MISSING_WORDS.has(s)) return "missing";
  if (DELIVERED_WORDS.has(s)) return "delivered";
  if (raw === "-" || raw === "—") return "missing";
  return "unknown";
}

function headerTitle(v: unknown): { title: string; dueOn: string | null } {
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    const iso = v.toISOString().slice(0, 10);
    return { title: `Actividad del ${iso.slice(8, 10)}/${iso.slice(5, 7)}`, dueOn: iso };
  }
  const t = String(v ?? "").replace(/\s+/g, " ").trim();
  const m = t.match(/(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?/);
  let dueOn: string | null = null;
  if (m) {
    const d = Number(m[1]);
    const mo = Number(m[2]);
    const y = m[3] ? (m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])) : null;
    if (d >= 1 && d <= 31 && mo >= 1 && mo <= 12 && y) dueOn = `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
  return { title: t.slice(0, 200), dueOn };
}

export function parseGradebook(sheet: unknown[][], roster: RosterStudent[], opts: { x?: MarkMeaning; blankIsMissing?: boolean } = {}): GradebookParse {
  const empty: GradebookParse = { headerRow: -1, matched: [], unmatched: [], notInFile: roster.map((s) => s.id), activities: [], gradeColumn: null };
  if (!sheet.length || !roster.length) return { ...empty, error: "El archivo está vacío o el grupo no tiene alumnos." };

  // 1. Renglones de alumnos: unir las celdas de texto del renglón y buscar al alumno con mejor puntaje.
  const matched: GradebookParse["matched"] = [];
  const used = new Set<string>();
  const candidateRows: { row: number; text: string }[] = [];
  sheet.forEach((r, i) => {
    const text = (r ?? []).filter(isTextCell).map(String).join(" ");
    if (text) candidateRows.push({ row: i, text });
  });
  for (const c of candidateRows) {
    let best: RosterStudent | null = null;
    let bestScore = 0;
    let tie = false;
    for (const s of roster) {
      const sc = matchScore(c.text, s);
      if (sc > bestScore) {
        best = s;
        bestScore = sc;
        tie = false;
      } else if (sc === bestScore && sc > 0) tie = true;
    }
    if (best && !tie && !used.has(best.id)) {
      matched.push({ studentId: best.id, row: c.row, text: c.text });
      used.add(best.id);
    }
  }
  if (matched.length < Math.min(3, roster.length)) {
    return { ...empty, error: "No reconocimos los nombres de los alumnos. Revise que el archivo sea del grupo correcto y tenga una columna con sus nombres." };
  }

  const firstRow = Math.min(...matched.map((m) => m.row));
  const lastRow = Math.max(...matched.map((m) => m.row));
  // Renglones dentro del bloque que parecen alumno pero no coinciden.
  const unmatched = candidateRows
    .filter((c) => c.row > firstRow && c.row < lastRow && !matched.some((m) => m.row === c.row) && tokens(c.text).length >= 2)
    .map((c) => ({ row: c.row + 1, text: c.text }));

  // 2. Encabezado: el renglón no vacío más cercano arriba del primer alumno (si son dos, se unen).
  let headerRow = firstRow - 1;
  while (headerRow >= 0 && !(sheet[headerRow] ?? []).some((v) => String(v ?? "").trim() !== "")) headerRow--;
  const header = (sheet[headerRow] ?? []) as unknown[];
  const header2 = (headerRow > 0 ? sheet[headerRow - 1] ?? [] : []) as unknown[];
  const width = Math.max(...sheet.slice(firstRow, lastRow + 1).map((r) => (r ?? []).length), header.length);

  // Columnas que contienen el nombre (texto en la mayoría de los renglones de alumnos) no son actividades.
  const nameCols = new Set<number>();
  for (let c = 0; c < width; c++) {
    const texts = matched.filter((m) => isTextCell(sheet[m.row]?.[c]) && classifyCell(sheet[m.row]?.[c]) === "unknown").length;
    if (texts >= matched.length * 0.6) nameCols.add(c);
  }

  // 3. Actividades y columna de calificación.
  const activities: ActivityColumn[] = [];
  let gradeColumn: GradebookParse["gradeColumn"] = null;
  for (let c = 0; c < width; c++) {
    if (nameCols.has(c)) continue;
    const h = header[c] ?? header2[c];
    const { title, dueOn } = headerTitle(h);
    const nh = norm(title);
    if (!title || !nh || SKIP_HEADER.test(nh)) continue;
    const cells = matched.map((m) => ({ id: m.studentId, v: sheet[m.row]?.[c] }));
    const kinds = cells.map((x) => classifyCell(x.v, opts.x));
    const recognized = kinds.filter((k) => k !== "unknown" && k !== "blank").length;
    const blank = kinds.filter((k) => k === "blank").length;
    if (recognized < matched.length * 0.5) continue; // columna casi vacía o de texto libre

    if (GRADE_HEADER.test(nh) && cells.every((x) => x.v === null || x.v === undefined || String(x.v).trim() === "" || isNumberLike(x.v))) {
      const nums = cells.filter((x) => isNumberLike(x.v)).map((x) => toNumber(x.v));
      const scale = Math.max(...nums) > 10 ? 10 : 1; // 0–100 → 0–10
      const scores: Record<string, number> = {};
      for (const x of cells) {
        if (!isNumberLike(x.v)) continue;
        const n = Math.round((toNumber(x.v) / scale) * 10) / 10;
        scores[x.id] = Math.min(10, Math.max(5, n)); // escala oficial 5 a 10
      }
      gradeColumn = { col: c, title, scores }; // la última columna de calificación gana (suele ser la final)
      continue;
    }
    activities.push({
      col: c,
      title,
      dueOn,
      missing: cells.filter((_, i) => kinds[i] === "missing" || (opts.blankIsMissing && kinds[i] === "blank")).map((x) => x.id),
      delivered: kinds.filter((k) => k === "delivered").length,
      blank,
    });
  }

  return {
    headerRow: headerRow + 1,
    matched,
    unmatched,
    notInFile: roster.filter((s) => !used.has(s.id)).map((s) => s.id),
    activities,
    gradeColumn,
    error: activities.length || gradeColumn ? undefined : "Encontramos a los alumnos, pero ninguna columna de actividades o calificaciones.",
  };
}
