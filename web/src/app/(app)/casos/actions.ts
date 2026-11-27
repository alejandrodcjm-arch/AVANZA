"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type Res = { error: string; ok?: boolean; n?: number };

const actionSchema = z.object({
  action_type: z.enum(["cita_papas", "tutoria", "platica_alumno", "canalizacion", "otra"]),
  description: z.string().trim().min(3).max(1000),
  due_on: z.union([z.iso.date(), z.literal("")]).optional(),
});

export async function addAction(caseId: string, _p: Res, form: FormData): Promise<Res> {
  const parsed = actionSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Elija el tipo de acción y descríbala." };
  const session = await getSession();
  const supabase = await createClient();
  const { error } = await supabase.from("case_actions").insert({
    school_id: session!.active!.schoolId,
    case_id: caseId,
    action_type: parsed.data.action_type,
    description: parsed.data.description,
    due_on: parsed.data.due_on || null,
    assigned_to: session!.userId,
    created_by: session!.userId,
  });
  if (error) return { error: "No se pudo guardar la acción." };
  revalidatePath(`/casos/${caseId}`);
  // n cambia en cada alta para que el formulario se limpie.
  return { error: "", ok: true, n: Date.now() };
}

export async function completeAction(caseId: string, actionId: string, _p: Res, form: FormData): Promise<Res> {
  const result = z.string().trim().min(3).max(1000).safeParse(form.get("result"));
  if (!result.success) return { error: "Escriba qué resultó." };
  const supabase = await createClient();
  const { error } = await supabase.from("case_actions").update({ status: "done", result: result.data, done_at: new Date().toISOString() }).eq("id", actionId);
  if (error) return { error: "No se pudo guardar." };
  revalidatePath(`/casos/${caseId}`);
  return { error: "", ok: true };
}

export async function escalate(caseId: string) {
  const supabase = await createClient();
  await supabase.rpc("escalate_case", { p_case: caseId });
  revalidatePath(`/casos/${caseId}`);
}

export async function closeCase(caseId: string, _p: Res, form: FormData): Promise<Res> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("close_case", { p_case: caseId, p_outcome: String(form.get("outcome") ?? "") });
  if (error) return { error: error.code === "22023" ? "Escriba cómo terminó el caso." : "No se pudo cerrar." };
  revalidatePath(`/casos/${caseId}`);
  return { error: "", ok: true };
}
