import { describe, expect, it } from "vitest";
import { assembleSummary, type SummaryParts } from "../prompt";
import type { Snapshot } from "../snapshot";
import { allowedNumbers, countWords, extractNumbers, validateSummary } from "../validate";

const snap: Snapshot = {
  student_first_name: "Sofía",
  month: "2026-11",
  teacher_name: "Laura Castillo",
  grades_period: "Trimestre 1",
  attendance: { month_absences: 2, month_lates: 1, month_days_recorded: 17, period_absences: 5 },
  grades: [
    { subject: "Lenguajes", score: 8.5, previous: 7.8, trend: "sube" },
    { subject: "Saberes y Pensamiento Científico", score: 6.5, previous: null, trend: "sin_anterior" },
  ],
  missed_assignments: [{ subject: "Saberes y Pensamiento Científico", count: 3 }],
  behavior_reports: 0,
  recognitions: [{ category: "Esfuerzo", count: 3 }],
  teacher_observations: ["Participa en lectura en voz alta."],
  monthly_goal: { goal: "Leer 20 minutos diarios", achieved: true },
};

const good: SummaryParts = {
  como_va: "Sofía tuvo un buen mes: cumplió su meta de leer 20 minutos diarios.",
  asistencia: "Faltó 2 días y llegó tarde 1 vez este mes. Lleva 5 faltas en el trimestre.",
  calificaciones: "En Lenguajes subió de 7.8 a 8.5. En Saberes y Pensamiento Científico tiene 6.5.",
  logro: "Participa con más confianza en la lectura en voz alta.",
  a_mejorar: "Tiene 3 tareas sin entregar de Saberes. Esta semana revisen juntos la mochila cada noche.",
  pregunta: "¿Qué fue lo que más le gustó aprender esta semana?",
};

const check = (p: SummaryParts) => validateSummary(p, assembleSummary(p, snap), snap);

describe("validador del resumen mensual", () => {
  it("aprueba un resumen que sigue las reglas", () => {
    expect(check(good)).toEqual([]);
  });

  it("detecta números inventados", () => {
    const errs = check({ ...good, asistencia: "Faltó 4 días este mes. Lleva 5 faltas en el trimestre." });
    expect(errs.join(" ")).toMatch(/números que no vienen.*4/);
  });

  it("detecta números escritos con letra que no están en los datos", () => {
    expect(check({ ...good, asistencia: "Faltó siete días. Lleva 5 faltas en el trimestre." }).join(" ")).toMatch(/7/);
  });

  it("permite la diferencia entre periodos (subió 0.7)", () => {
    expect(check({ ...good, calificaciones: "En Lenguajes subió 0.7 puntos, a 8.5. En Saberes tiene 6.5." })).toEqual([]);
  });

  it("rechaza etiquetas sobre la persona", () => {
    expect(check({ ...good, logro: "Sofía es muy inteligente y talentosa." }).length).toBeGreaterThanOrEqual(2);
    expect(check({ ...good, a_mejorar: "Es mala para las matemáticas; practiquen 10 minutos." }).join(" ")).toMatch(/etiqueta/);
    expect(check({ ...good, como_va: "Sofía está en riesgo este mes por sus tareas." }).join(" ")).toMatch(/etiqueta/);
  });

  it("permite hablar de resolver problemas de matemáticas y del lugar de estudio", () => {
    expect(
      check({ ...good, a_mejorar: "Le cuesta resolver problemas con fracciones. Elijan un lugar fijo para estudiar 3 tareas." }),
    ).toEqual([]);
  });

  it("rechaza comparaciones con otros alumnos", () => {
    expect(check({ ...good, como_va: "Sofía va mejor que sus compañeros este mes." }).join(" ")).toMatch(/Compara/);
    expect(check({ ...good, calificaciones: "Está arriba del promedio del grupo en Lenguajes con 8.5." }).join(" ")).toMatch(/Compara/);
  });

  it("exige usted, no tú", () => {
    expect(check({ ...good, pregunta: "¿Puedes preguntarle a tu hija qué aprendió?" }).join(" ")).toMatch(/usted/);
  });

  it("rechaza tono de alarma", () => {
    expect(check({ ...good, como_va: "ATENCIÓN!! Sofía faltó 2 días." }).join(" ")).toMatch(/alarma/);
  });

  it("exige la pregunta para casa y el nombre", () => {
    expect(check({ ...good, pregunta: "Platiquen de la escuela en la cena." }).join(" ")).toMatch(/interrogación/);
    const sinNombre = Object.fromEntries(Object.entries(good).map(([k, v]) => [k, v.replaceAll("Sofía", "la alumna")])) as SummaryParts;
    expect(check(sinNombre).join(" ")).toMatch(/nombre/);
  });

  it("rechaza sugerir hacer la tarea por el alumno", () => {
    expect(check({ ...good, a_mejorar: "Explíquele el tema de fracciones 3 tardes." }).join(" ")).toMatch(/rutina/);
  });

  it("limita a 150 palabras", () => {
    const long = { ...good, logro: "Sofía participa en lectura. ".repeat(40) };
    expect(check(long).join(" ")).toMatch(/palabras/);
  });

  it("agrega el contacto fijo con el nombre de la maestra", () => {
    expect(assembleSummary(good, snap)).toMatch(/Laura Castillo/);
  });
});

describe("utilidades", () => {
  it("extrae números con punto o coma", () => {
    expect(extractNumbers("tiene 8,5 y 7.25 y tres")).toEqual([8.5, 7.3, 3]);
  });
  it("cuenta palabras", () => {
    expect(countWords("  hola   mundo \n bonito ")).toBe(3);
  });
  it("incluye en los permitidos los días asistidos", () => {
    expect(allowedNumbers(snap).has(15)).toBe(true);
  });
});
