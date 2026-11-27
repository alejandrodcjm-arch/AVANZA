/**
 * Lee el control de colegiaturas que ya lleva administración, en cualquiera de las dos formas comunes:
 *  - "Lista de cargos": un renglón por pago (Alumno, Concepto, Monto, Vencimiento, Pagado…), como lo exportan los sistemas de caja.
 *  - "Tabla por meses": un renglón por alumno y una columna por mes (Septiembre, Octubre…) con ✓, «pagado», el monto o la fecha.
 * Nada se guarda sin vista previa.
 */
import type { RosterStudent } from "./gradebook";
import { bestStudent, norm, toAmount, toDate } from "./cells";

export type TuitionRow = { student_id: string; concept: string; amount: number; paid: number; due_on: string; paid_on: string | null };
export type TuitionParse = {
  layout: "cargos" | "meses" | null;
  rows: TuitionRow[];
  matched: number;
  unmatched: { row: number; text: string }[];
  needsAmount: boolean;
  error?: string;
};

const MONTHS: [RegExp, number, string][] = [
  [/\bago(sto)?\b/, 8, "agosto"],
  [/\bsep(t|tiembre)?\b/, 9, "septiembre"],
  [/\boct(ubre)?\b/, 10, "octubre"],
  [/\bnov(iembre)?\b/, 11, "noviembre"],
  [/\bdic(iembre)?\b/, 12, "diciembre"],
  [/\bene(ro)?\b/, 1, "enero"],
  [/\bfeb(rero)?\b/, 2, "febrero"],
  [/\bmar(zo)?\b/, 3, "marzo"],
  [/\babr(il)?\b/, 4, "abril"],
  [/\bmay(o)?\b/, 5, "mayo"],
  [/\bjun(io)?\b/, 6, "junio"],
  [/\bjul(io)?\b/, 7, "julio"],
];
const monthOf = (v: unknown) => {
  const s = norm(v);
  if (!s || s.length > 30 || /fecha|venc|pago de|total/.test(s)) return null;
  return MONTHS.find(([re]) => re.test(s)) ?? null;
};

const NAME = /^(alumno|alumna|nombre|nombres|estudiante|apellido|apellidos|apellido paterno|apellido materno|nombre del alumno|nombre completo)$/;
const PAID_WORDS = /^(si|pagado|pagada|liquidado|cubierto|ok|x|✓|✔|pago|al corriente)$/;
const UNPAID_WORDS = /^(no|pendiente|adeudo|debe|vencido|sin pago|0)$/;

/** Valor de una celda de pago: true (pagado), false (pendiente), número (monto abonado) o una fecha de pago. */
function paidValue(v: unknown): { paid: boolean | number; on: string | null } {
  if (v instanceof Date) return { paid: true, on: toDate(v) };
  const raw = String(v ?? "").trim();
  if (raw === "✓" || raw === "✔") return { paid: true, on: null };
  const s = norm(raw);
  if (!s) return { paid: false, on: null };
  if (PAID_WORDS.test(s)) return { paid: true, on: null };
  if (UNPAID_WORDS.test(s)) return { paid: false, on: null };
  const d = typeof v === "number" ? null : toDate(raw);
  if (d) return { paid: true, on: d };
  const n = toAmount(v);
  if (n !== null) return { paid: n, on: null };
  return { paid: false, on: null };
}

function findHeader(sheet: unknown[][], test: (cells: string[]) => boolean) {
  for (let r = 0; r < Math.min(sheet.length, 15); r++) if (test((sheet[r] ?? []).map(norm))) return r;
  return -1;
}

export function parseTuition(sheet: unknown[][], roster: RosterStudent[], opts: { startYear: number; monthlyAmount?: number; dueDay?: number }): TuitionParse {
  const dueDay = Math.min(Math.max(opts.dueDay ?? 10, 1), 28);
  const empty: TuitionParse = { layout: null, rows: [], matched: 0, unmatched: [], needsAmount: false };

  const longHdr = findHeader(sheet, (c) => c.some((x) => /concepto|descripcion/.test(x)) && c.some((x) => /monto|importe|cargo|precio|total/.test(x)));
  const wideHdr = findHeader(sheet, (c) => c.filter((x) => monthOf(x)).length >= 2);
  if (longHdr < 0 && wideHdr < 0)
    return { ...empty, error: "No reconocimos el formato. Necesitamos columnas «Alumno, Concepto, Monto, Vencimiento, Pagado» o una columna por mes." };

  const rows: TuitionRow[] = [];
  const unmatched: TuitionParse["unmatched"] = [];
  const seen = new Set<string>();

  if (longHdr >= 0) {
    const h = (sheet[longHdr] ?? []).map(norm);
    const col = (re: RegExp, not?: RegExp) => h.findIndex((x) => re.test(x) && !(not && not.test(x)));
    const names = h.map((x, i) => (NAME.test(x) ? i : -1)).filter((i) => i >= 0);
    const cConcept = col(/concepto|descripcion/);
    const cAmount = col(/monto|importe|cargo|precio|total/, /pagad|abon|saldo/);
    const cDue = col(/venc|limite|vence/);
    const cPaidOn = col(/fecha de pago|fecha pago|pagado el|fecha de abono/);
    const cPaid = h.findIndex((x, i) => i !== cPaidOn && /pagad|abono|cobrad|estatus|estado|status|pago/.test(x) && !/fecha/.test(x));
    const cBalance = col(/saldo|adeudo|por pagar|pendiente/);
    if (!names.length || cDue < 0) return { ...empty, layout: "cargos", error: "Faltan las columnas del nombre del alumno o de la fecha de vencimiento." };
    for (let r = longHdr + 1; r < sheet.length; r++) {
      const row = sheet[r] ?? [];
      const text = names.map((i) => String(row[i] ?? "")).join(" ").trim();
      if (!text) continue;
      const id = bestStudent(text, roster);
      if (!id) {
        unmatched.push({ row: r + 1, text });
        continue;
      }
      const concept = String(row[cConcept] ?? "").trim().replace(/\s+/g, " ").slice(0, 80);
      const amount = toAmount(row[cAmount]);
      const due = toDate(row[cDue]);
      if (concept.length < 2 || !amount || amount <= 0 || !due) continue;
      let paid = 0;
      let on = cPaidOn >= 0 ? toDate(row[cPaidOn]) : null;
      if (cPaid >= 0) {
        const p = paidValue(row[cPaid]);
        paid = p.paid === true ? amount : typeof p.paid === "number" ? Math.min(p.paid, amount) : 0;
        on = on ?? p.on;
      } else if (cBalance >= 0) {
        const bal = toAmount(row[cBalance]);
        paid = bal === null ? 0 : Math.max(0, amount - bal);
      } else if (on) paid = amount;
      seen.add(id);
      rows.push({ student_id: id, concept, amount, paid, due_on: due, paid_on: paid >= amount ? on : null });
    }
    return { layout: "cargos", rows, matched: seen.size, unmatched, needsAmount: false };
  }

  // Tabla por meses
  const h = (sheet[wideHdr] ?? []).map(norm);
  const names = h.map((x, i) => (NAME.test(x) ? i : -1)).filter((i) => i >= 0);
  const nameCols = names.length ? names : [h.findIndex((x, i) => !monthOf(x) && i < 3 && x !== "no" && x !== "#")].filter((i) => i >= 0);
  const monthCols = h.map((x, i) => [i, monthOf(x)] as const).filter((x): x is readonly [number, [RegExp, number, string]] => Boolean(x[1]));
  const cMonthly = h.findIndex((x) => /colegiatura mensual|mensualidad|cuota|monto mensual|importe mensual/.test(x));
  const needsAmount = cMonthly < 0 && !opts.monthlyAmount;
  if (!nameCols.length) return { ...empty, layout: "meses", error: "No encontramos la columna con el nombre del alumno." };

  for (let r = wideHdr + 1; r < sheet.length; r++) {
    const row = sheet[r] ?? [];
    const text = nameCols.map((i) => String(row[i] ?? "")).join(" ").trim();
    if (!text || /^total/i.test(text)) continue;
    const id = bestStudent(text, roster);
    if (!id) {
      unmatched.push({ row: r + 1, text });
      continue;
    }
    seen.add(id);
    const amount = (cMonthly >= 0 ? toAmount(row[cMonthly]) : null) ?? opts.monthlyAmount ?? 0;
    if (!amount) continue;
    for (const [i, [, month, name]] of monthCols) {
      const year = month >= 8 ? opts.startYear : opts.startYear + 1;
      const p = paidValue(row[i]);
      const paid = p.paid === true ? amount : typeof p.paid === "number" ? Math.min(p.paid, amount) : 0;
      rows.push({
        student_id: id,
        concept: `Colegiatura ${name}`,
        amount,
        paid,
        due_on: `${year}-${String(month).padStart(2, "0")}-${String(dueDay).padStart(2, "0")}`,
        paid_on: paid >= amount ? p.on : null,
      });
    }
  }
  return { layout: "meses", rows, matched: seen.size, unmatched, needsAmount };
}
