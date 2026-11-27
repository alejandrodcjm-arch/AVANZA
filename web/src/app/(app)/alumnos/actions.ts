"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { todayLocal } from "@/lib/time";

type Res = { error: string; ok?: boolean };

export async function dismissAlert(alertId: string, note: string): Promise<Res> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("dismiss_alert", { p_alert: alertId, p_note: note });
  if (error) return { error: error.code === "22023" ? "Escriba el motivo." : "No se pudo descartar." };
  revalidatePath("/", "layout");
  return { error: "" };
}

export async function convertAlert(alertId: string, summary: string): Promise<Res> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("convert_alert_to_case", { p_alert: alertId, p_summary: summary });
  if (error) return { error: "No se pudo abrir el caso." };
  redirect(`/casos/${data}`);
}

const behaviorSchema = z.object({
  occurred_on: z.iso.date(),
  severity: z.enum(["minor", "moderate", "serious"]),
  description: z.string().trim().min(5).max(1000),
});

export async function addBehavior(studentId: string, _p: Res, form: FormData): Promise<Res> {
  const parsed = behaviorSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Describa qué pasó (al menos 5 letras) y la fecha." };
  if (parsed.data.occurred_on > todayLocal()) return { error: "La fecha no puede ser futura." };
  const session = await getSession();
  const supabase = await createClient();
  const { error } = await supabase.from("behavior_reports").insert({
    school_id: session!.active!.schoolId,
    student_id: studentId,
    created_by: session!.userId,
    ...parsed.data,
  });
  if (error) return { error: "No se pudo guardar el reporte." };
  revalidatePath(`/alumnos/${studentId}`);
  return { error: "", ok: true };
}

export async function addObservation(studentId: string, _p: Res, form: FormData): Promise<Res> {
  const body = z.string().trim().min(5).max(1000).safeParse(form.get("body"));
  if (!body.success) return { error: "Escriba la observación (al menos 5 letras)." };
  const session = await getSession();
  const supabase = await createClient();
  const { error } = await supabase
    .from("observations")
    .insert({ school_id: session!.active!.schoolId, student_id: studentId, body: body.data, created_by: session!.userId });
  if (error) return { error: "No se pudo guardar." };
  revalidatePath(`/alumnos/${studentId}`);
  return { error: "", ok: true };
}

export async function addSensitiveNote(studentId: string, _p: Res, form: FormData): Promise<Res> {
  const body = z.string().trim().min(5).max(2000).safeParse(form.get("body"));
  if (!body.success) return { error: "Escriba la nota (al menos 5 letras)." };
  const session = await getSession();
  const supabase = await createClient();
  const { error } = await supabase
    .from("sensitive_notes")
    .insert({ school_id: session!.active!.schoolId, student_id: studentId, body: body.data, created_by: session!.userId });
  if (error) return { error: "No se pudo guardar." };
  revalidatePath(`/alumnos/${studentId}`);
  return { error: "", ok: true };
}
