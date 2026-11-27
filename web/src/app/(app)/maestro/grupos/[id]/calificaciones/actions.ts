"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  subjectId: z.guid(),
  periodId: z.guid(),
  scores: z.record(z.guid(), z.union([z.number().min(5).max(10), z.null()])),
});

export async function saveGrades(groupId: string, input: z.infer<typeof schema>) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Revise las calificaciones: van de 5 a 10." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("save_grades", { p_subject: parsed.data.subjectId, p_period: parsed.data.periodId, p_scores: parsed.data.scores });
  if (error) return { ok: false, error: error.code === "42501" ? "No da esta materia a este grupo." : "No se pudo guardar." };
  revalidatePath(`/maestro/grupos/${groupId}/calificaciones`);
  return { ok: true, error: "", changed: data ?? 0 };
}
