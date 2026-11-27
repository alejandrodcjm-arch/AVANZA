import type { Snapshot } from "./snapshot";
import type { SummaryParts } from "./prompt";
import { PART_ORDER } from "./prompt";

export const MAX_WORDS = 150;

// docs/04 §2 y §5. Palabras que etiquetan a la persona en vez de describir el proceso.
const BANNED: RegExp[] = [
  /\binteligente(s)?\b/i, /\btalentos[oa]s?\b/i, /\bflo(j|g)[oa]s?\b/i, /\bflojera\b/i, /\bburr[oa]s?\b/i,
  /\bperezos[oa]s?\b/i, /\b(es|muy|qué|tan) list[oa]\b/i, /\b(mal[oa]|buen[oa]) para\b/i, /\ben riesgo\b/i,
  /\breprobando\b/i, /\bproblemas? de conducta\b/i, /\b(es|son) un problema\b/i, /\btiene problemas\b/i, /\bfracas/i, /\bno puede\b/i, /\bdesastre\b/i, /\bpésim[oa]\b/i,
];

// Comparaciones con otros (Rogers y Feller: no ayudan; además exponen a otros alumnos).
const COMPARISONS: RegExp[] = [
  /\bcompañer[oa]s\b/i, /\bdel grupo\b/i, /\bel grupo\b/i, /\bdel salón\b/i, /\bpromedio del\b/i,
  /\bmejor que\b/i, /\bpeor que\b/i, /\blos demás\b/i, /\bel resto\b/i, /\branking\b/i,
  /\b(primer|segundo|tercer|último) lugar\b/i, /\blugar (en|del) (el )?(grupo|salón)\b/i,
  /\bmás que (sus|los|otros)\b/i, /\botros (alumnos|niños|niñas)\b/i,
];

// Trato de "tú" al papá (debe ser "usted").
const INFORMAL: RegExp[] = [/\btu hij[oa]\b/i, /\bpuedes\b/i, /\btienes\b/i, /\bpregúntale\b/i, /\bayúdale\b/i, /\bplatica con\b/i];

const ALARM: RegExp[] = [/!{2,}/, /\b[A-ZÁÉÍÓÚÑ]{5,}\b/, /\p{Extended_Pictographic}/u];

const NUMBER_WORDS: Record<string, number> = {
  dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12,
};

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Todos los números que el texto puede mencionar: los de la foto y diferencias entre ellos. */
export function allowedNumbers(s: Snapshot): Set<number> {
  const set = new Set<number>();
  const add = (n: number | null | undefined) => {
    if (n === null || n === undefined || Number.isNaN(n)) return;
    set.add(round1(n));
  };
  const a = s.attendance;
  [a.month_absences, a.month_lates, a.month_days_recorded, a.period_absences, s.behavior_reports].forEach(add);
  add(a.month_days_recorded - a.month_absences);
  for (const g of s.grades) {
    add(g.score);
    add(g.previous);
    if (g.previous !== null) add(Math.abs(g.score - g.previous));
  }
  for (const m of s.missed_assignments) add(m.count);
  add(s.missed_assignments.reduce((t, m) => t + m.count, 0));
  add(s.grades.length);
  for (const text of [...s.teacher_observations, s.monthly_goal?.goal ?? ""]) {
    for (const n of extractNumbers(text)) add(n);
  }
  // Periodo ("Trimestre 1") y "1" para frases como "1 punto a mejorar".
  for (const n of extractNumbers(s.grades_period ?? "")) add(n);
  add(1);
  return set;
}

export function extractNumbers(text: string): number[] {
  const out: number[] = [];
  for (const m of text.matchAll(/\d+(?:[.,]\d+)?/g)) out.push(round1(Number(m[0].replace(",", "."))));
  for (const m of text.toLowerCase().matchAll(/\b(dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce)\b/g)) {
    out.push(NUMBER_WORDS[m[1]]);
  }
  return out;
}

export function countWords(text: string) {
  return text.split(/\s+/).filter(Boolean).length;
}

/** Revisa el resumen contra las reglas. Regresa la lista de errores (vacía = aprobado para revisión). */
export function validateSummary(parts: SummaryParts, fullText: string, s: Snapshot): string[] {
  const errors: string[] = [];
  for (const k of PART_ORDER) {
    if (!parts[k] || parts[k].trim().length < 8) errors.push(`Falta la parte "${k}".`);
  }
  if (!parts.pregunta?.trim().endsWith("?")) errors.push("La pregunta para casa debe terminar en signo de interrogación.");
  return [...errors, ...validateText(fullText, s)];
}

/**
 * Reglas sobre el texto completo. También se usan como advertencias mientras la maestra edita:
 * ella decide (puede saber un dato que no está en la app), pero ve lo que rompe la guía.
 */
export function validateText(fullText: string, s: Snapshot): string[] {
  const errors: string[] = [];
  const words = countWords(fullText);
  if (words > MAX_WORDS) errors.push(`Tiene ${words} palabras; el máximo es ${MAX_WORDS}.`);

  const allowed = allowedNumbers(s);
  const bad = [...new Set(extractNumbers(fullText).filter((n) => !allowed.has(n)))];
  if (bad.length) errors.push(`Menciona números que no vienen en los datos: ${bad.join(", ")}.`);

  for (const re of BANNED) {
    const m = fullText.match(re);
    if (m) errors.push(`Usa una palabra que etiqueta: "${m[0]}".`);
  }
  for (const re of COMPARISONS) {
    const m = fullText.match(re);
    if (m) errors.push(`Compara con otros alumnos: "${m[0]}".`);
  }
  for (const re of INFORMAL) {
    const m = fullText.match(re);
    if (m) errors.push(`Habla de "tú" al papá: "${m[0]}". Debe ser "usted".`);
  }
  for (const re of ALARM) {
    const m = fullText.match(re);
    if (m) errors.push(`Tono de alarma: "${m[0]}".`);
  }

  if (!fullText.includes(s.student_first_name)) errors.push(`No menciona a ${s.student_first_name} por su nombre.`);
  if (/explíquele|hágale la tarea|haga la tarea/i.test(fullText)) {
    errors.push("Sugiere hacer o explicar la tarea; debe ser una pregunta o rutina.");
  }

  return errors;
}
