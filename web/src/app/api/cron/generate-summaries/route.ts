import { NextResponse, type NextRequest } from "next/server";
import { generateDraft } from "@/lib/ai/generate";
import { PROMPT_VERSION } from "@/lib/ai/prompt";
import { monthName, snapshotSchema } from "@/lib/ai/snapshot";
import { isAuthorizedCron } from "@/lib/cron";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 300;
const BATCH = 15;

/** Redacta con IA los borradores pendientes, por lotes. Lo llama Supabase Cron cada 10 minutos. */
export async function POST(req: NextRequest) {
  if (!isAuthorizedCron(req)) return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  const admin = createAdminClient();
  const { data: pending, error } = await admin
    .from("summary_drafts")
    .select("summary_id, school_id, data_snapshot, monthly_summaries!inner(status, month)")
    .is("generated_at", null)
    .neq("monthly_summaries.status", "approved")
    .limit(BATCH);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let ok = 0;
  let manual = 0;
  const touched = new Map<string, string>(); // school_id -> month
  for (const d of pending ?? []) {
    const snap = snapshotSchema.safeParse(d.data_snapshot);
    const result = snap.success ? await generateDraft(snap.data).catch(() => null) : null;
    const errors = result ? result.errors : ["No se pudo redactar automáticamente."];
    await admin.rpc("save_summary_draft", {
      p_summary: d.summary_id,
      p_text: result?.text ?? "",
      p_errors: errors,
      p_prompt_version: PROMPT_VERSION,
      p_model: result?.model ?? "error",
    });
    if (errors.length) manual++;
    else ok++;
    touched.set(d.school_id, d.monthly_summaries!.month);
  }

  // Cuando una escuela ya no tiene borradores en cola, avisar una sola vez a las maestras titulares.
  for (const [schoolId, month] of touched) {
    const { count } = await admin
      .from("summary_drafts")
      .select("summary_id, monthly_summaries!inner(month)", { count: "exact", head: true })
      .eq("school_id", schoolId)
      .eq("monthly_summaries.month", month)
      .is("generated_at", null);
    if ((count ?? 0) > 0) continue;
    const title = `Resúmenes de ${monthName(month.slice(0, 7))} listos para revisar`;
    const { data: teachers } = await admin.from("teaching_assignments").select("teacher_id").eq("school_id", schoolId).eq("is_homeroom", true);
    for (const teacherId of new Set((teachers ?? []).map((t) => t.teacher_id))) {
      const { count: already } = await admin.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", teacherId).eq("title", title);
      if (already) continue;
      await admin.from("notifications").insert({
        school_id: schoolId,
        user_id: teacherId,
        kind: "system",
        title,
        body: "Revíselos y apruébelos: las familias los reciben en cuanto usted los envía. Toma unos 30 segundos cada uno.",
        url: "/maestro/resumenes",
      });
    }
  }

  return NextResponse.json({ processed: (pending ?? []).length, ok, manual });
}
