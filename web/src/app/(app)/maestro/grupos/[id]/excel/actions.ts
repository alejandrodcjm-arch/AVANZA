"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  subjectId: z.guid(),
  fileName: z.string().max(200),
  activities: z.array(z.object({ title: z.string().min(1).max(200), due_on: z.iso.date().nullable(), missing: z.array(z.guid()) })).max(200),
  grades: z.object({ periodId: z.guid(), scores: z.record(z.guid(), z.number().min(5).max(10)) }).nullable(),
});

export async function commitGradebook(groupId: string, input: z.infer<typeof schema>) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Los datos del archivo no son válidos." };
  const d = parsed.data;
  const supabase = await createClient();
  let activities = 0;
  let missing = 0;
  if (d.activities.length) {
    const { data, error } = await supabase.rpc("import_gradebook", {
      p_group: groupId,
      p_subject: d.subjectId,
      p_file_name: d.fileName,
      p_activities: d.activities.map((a) => ({ title: a.title, due_on: a.due_on, missing: a.missing })),
    });
    if (error) return { ok: false, error: error.code === "42501" ? "No da esta materia en este grupo." : "No se pudo guardar." };
    const r = data as { activities: number; missing: number };
    activities = r.activities;
    missing = r.missing;
  }
  let grades = 0;
  if (d.grades && Object.keys(d.grades.scores).length) {
    const { data, error } = await supabase.rpc("save_grades", { p_subject: d.subjectId, p_period: d.grades.periodId, p_scores: d.grades.scores });
    if (error) return { ok: false, error: "Las actividades se guardaron, pero no las calificaciones." };
    grades = data ?? 0;
  }
  revalidatePath(`/maestro/grupos/${groupId}`, "layout");
  return { ok: true, error: "", activities, missing, grades };
}
