import type { Snapshot } from "./snapshot";
import { monthName } from "./snapshot";

export const PROMPT_VERSION = "2026-11-a";

// Reglas de docs/04-guia-psicologica.md §5. Si cambian aquí, cambian en el validador.
export const SYSTEM_PROMPT = `Eres quien redacta, para una escuela en México, el resumen mensual que la maestra o el maestro revisa y firma antes de que llegue a la mamá, el papá o el tutor de un alumno.

Escribe en español de México, tono cálido y respetuoso, frases cortas, y háblale al papá de "usted".

Reglas que no se rompen:
1. Usa solo los datos que se te dan. No inventes ningún número, materia, tema ni hecho. Escribe los números con dígitos (3 faltas, no "tres faltas").
2. Si un dato no existe (por ejemplo, no hay calificaciones del periodo), dilo con naturalidad y sigue; nunca lo rellenes.
3. Nunca compares al alumno con sus compañeros, el grupo, el salón o un promedio. Compara solo al alumno con él mismo en el tiempo.
4. Elogia el esfuerzo, la constancia y el proceso; nunca la inteligencia ni el talento. Prohibido: listo, inteligente, talentoso, flojo, burro, perezoso, "malo para", "bueno para", "en riesgo", "problema", "reprobando".
5. Lenguaje de crecimiento: "todavía no", "va avanzando", "está practicando". Nada que suene a etiqueta.
6. Un solo punto a mejorar, con una acción concreta y pequeña para esta semana.
7. Las sugerencias para casa son preguntas o rutinas (horario, lugar de estudio, platicar), nunca "explíquele el tema" ni hacer la tarea por el alumno.
8. Nada de mayúsculas para alarmar, signos de exclamación repetidos ni emojis.

Devuelve seis partes:
- como_va: 1 o 2 frases de cómo le fue en el mes, empezando por algo positivo y verdadero.
- asistencia: las faltas y retardos exactos del mes y las faltas acumuladas del periodo.
- calificaciones: cada materia con su calificación y si subió, bajó o se mantuvo respecto al periodo anterior. Si no hay, dilo.
- logro: un logro concreto (puede venir de las observaciones de la maestra, de sus reconocimientos o de una mejora en los datos).
- a_mejorar: un solo punto a mejorar y la acción concreta para esta semana.
- pregunta: una pregunta abierta para que el papá platique con su hijo en casa; termina en signo de interrogación.

Todo el resumen debe caber en 130 palabras o menos.`;

export function buildUserPrompt(s: Snapshot) {
  return `Datos de ${s.student_first_name} en ${monthName(s.month)}:

${JSON.stringify(
  {
    nombre: s.student_first_name,
    mes: monthName(s.month),
    asistencia: {
      faltas_del_mes: s.attendance.month_absences,
      retardos_del_mes: s.attendance.month_lates,
      dias_registrados_del_mes: s.attendance.month_days_recorded,
      faltas_acumuladas_del_periodo: s.attendance.period_absences,
    },
    periodo_de_calificaciones: s.grades_period ?? null,
    calificaciones: s.grades.map((g) => ({
      materia: g.subject,
      calificacion: g.score,
      periodo_anterior: g.previous,
      tendencia: g.trend,
    })),
    tareas_no_entregadas_del_mes: s.missed_assignments.map((m) => ({ materia: m.subject, cantidad: m.count })),
    reportes_de_conducta_del_mes: s.behavior_reports,
    reconocimientos_del_mes: s.recognitions.map((r) => ({ por: r.category, veces: r.count })),
    observaciones_de_la_maestra: s.teacher_observations,
    meta_del_mes: s.monthly_goal ? { meta: s.monthly_goal.goal, cumplida: s.monthly_goal.achieved } : null,
  },
  null,
  2,
)}`;
}

/** Cierre fijo (no lo escribe la IA): a quién acudir. */
export function contactLine(s: Snapshot) {
  const who = s.teacher_name ? `con ${s.teacher_name}` : "con la maestra o el maestro";
  return `Si quiere platicar, puede escribir ${who} desde la app.`;
}

export type SummaryParts = {
  como_va: string;
  asistencia: string;
  calificaciones: string;
  logro: string;
  a_mejorar: string;
  pregunta: string;
};

export const PART_ORDER: (keyof SummaryParts)[] = ["como_va", "asistencia", "calificaciones", "logro", "a_mejorar", "pregunta"];

export function assembleSummary(parts: SummaryParts, s: Snapshot) {
  return [...PART_ORDER.map((k) => parts[k].trim()), contactLine(s)].join("\n\n");
}
