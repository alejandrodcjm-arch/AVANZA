"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { generateDraft } from "@/lib/ai/generate";
import { PROMPT_VERSION } from "@/lib/ai/prompt";
import { snapshotSchema } from "@/lib/ai/snapshot";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function approve(summaryId: string, nextId: string | null, _p: { error: string }, form: FormData) {
  const text = String(form.get("text") ?? "").trim();
  const supabase = await createClient();
  const { error } = await supabase.rpc("approve_summary", { p_summary: summaryId, p_text: text });
  if (error) {
    if (error.code === "22023") return { error: "El resumen debe tener entre 40 y 2000 letras." };
    if (error.code === "P0001") return { error: "Este resumen ya se había enviado." };
    return { error: "No se pudo aprobar. Intente de nuevo." };
  }
  revalidatePath("/maestro/resumenes");
  redirect(nextId ? `/maestro/resumenes/${nextId}` : "/maestro/resumenes");
}

/** Vuelve a pedir el borrador a la IA (por ejemplo, después de capturar observaciones nuevas). */
export async function regenerate(summaryId: string) {
  const supabase = await createClient();
  // Si el usuario no es personal del alumno, RLS no le deja leer el borrador y aquí se detiene.
  const { data: draft } = await supabase.from("summary_drafts").select("student_id, monthly_summaries(month, status)").eq("summary_id", summaryId).maybeSingle();
  if (!draft || draft.monthly_summaries?.status === "approved") return { error: "No disponible." };
  const { data: snap, error } = await supabase.rpc("build_summary_snapshot", { p_student: draft.student_id, p_month: draft.monthly_summaries!.month });
  if (error) return { error: "No se pudieron leer los datos." };
  const snapshot = snapshotSchema.parse(snap);
  const result = await generateDraft(snapshot);
  const admin = createAdminClient();
  await admin.from("summary_drafts").update({ data_snapshot: snap }).eq("summary_id", summaryId);
  await admin.rpc("save_summary_draft", {
    p_summary: summaryId,
    p_text: result.text ?? "",
    p_errors: result.errors,
    p_prompt_version: PROMPT_VERSION,
    p_model: result.model,
  });
  revalidatePath(`/maestro/resumenes/${summaryId}`);
  return { error: "" };
}
