import { z } from "zod";

/** Foto de datos que arma la base (public.build_summary_snapshot). Es lo único que ve la IA. */
export const snapshotSchema = z.object({
  student_first_name: z.string(),
  month: z.string(),
  teacher_name: z.string().nullable().optional(),
  grades_period: z.string().nullable().optional(),
  attendance: z.object({
    month_absences: z.number(),
    month_lates: z.number(),
    month_days_recorded: z.number(),
    period_absences: z.number(),
  }),
  grades: z.array(
    z.object({
      subject: z.string(),
      score: z.number(),
      previous: z.number().nullable(),
      trend: z.enum(["sube", "baja", "igual", "sin_anterior"]),
    }),
  ),
  missed_assignments: z.array(z.object({ subject: z.string(), count: z.number() })),
  behavior_reports: z.number(),
  recognitions: z.array(z.object({ category: z.string(), count: z.number() })).default([]),
  teacher_observations: z.array(z.string()),
  monthly_goal: z.object({ goal: z.string(), achieved: z.boolean().nullable() }).nullable(),
});

export type Snapshot = z.infer<typeof snapshotSchema>;

const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

export function monthName(yyyyMm: string) {
  const m = Number(yyyyMm.split("-")[1]);
  return MONTHS[m - 1] ?? yyyyMm;
}
