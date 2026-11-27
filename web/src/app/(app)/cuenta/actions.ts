"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function updateName(_prev: { ok: boolean; error: string }, form: FormData) {
  const name = z.string().trim().min(3).max(120).safeParse(form.get("full_name"));
  if (!name.success) return { ok: false, error: "Escriba su nombre completo." };
  const session = await getSession();
  if (!session) return { ok: false, error: "Su sesión terminó." };
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ full_name: name.data }).eq("id", session.userId);
  if (error) return { ok: false, error: "No se pudo guardar." };
  revalidatePath("/cuenta");
  return { ok: true, error: "" };
}

const KINDS = ["access", "rectification", "cancellation", "opposition"] as const;

export async function requestArco(_prev: { ok: boolean; error: string }, form: FormData) {
  const kind = z.enum(KINDS).safeParse(form.get("kind"));
  const details = z.string().trim().min(10).max(2000).safeParse(form.get("details"));
  if (!kind.success || !details.success) return { ok: false, error: "Elija el tipo de solicitud y explique en al menos 10 letras." };
  const session = await getSession();
  if (!session?.active) return { ok: false, error: "Su sesión terminó." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("arco_requests")
    .insert({ school_id: session.active.schoolId, user_id: session.userId, kind: kind.data, details: details.data });
  if (error) return { ok: false, error: "No se pudo enviar. Intente de nuevo." };
  return { ok: true, error: "" };
}
