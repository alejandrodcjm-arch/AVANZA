"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export async function saveWeekly(groupId: string, subjectId: string, week: string, counts: Record<string, number>) {
  const parsed = z.object({ subjectId: z.guid(), week: z.iso.date(), counts: z.record(z.guid(), z.number().int().min(0).max(30)) }).safeParse({ subjectId, week, counts });
  if (!parsed.success) return { ok: false, error: "Revise los números (0 a 30)." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_weekly_pending", { p_group: groupId, p_subject: subjectId, p_week: week, p_counts: parsed.data.counts });
  if (error) return { ok: false, error: error.code === "42501" ? "No da esta materia en este grupo." : "No se pudo guardar." };
  revalidatePath(`/maestro/grupos/${groupId}/pendientes`);
  revalidatePath("/maestro");
  return { ok: true, error: "" };
}
