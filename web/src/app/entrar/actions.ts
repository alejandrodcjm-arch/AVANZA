"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { step: "email" | "code"; email: string; error?: string; info?: string };

const emailSchema = z.email();

function safeNext(next: FormDataEntryValue | null) {
  const n = typeof next === "string" ? next : "";
  return n.startsWith("/") && !n.startsWith("//") ? n : "/inicio";
}

export async function loginAction(prev: LoginState, form: FormData): Promise<LoginState> {
  const supabase = await createClient();
  const intent = form.get("intent");

  if (intent === "send" || intent === "resend") {
    const email = String(form.get("email") ?? prev.email).trim().toLowerCase();
    if (!emailSchema.safeParse(email).success) return { step: "email", email, error: "Revise su correo; parece incompleto." };
    // shouldCreateUser: false → solo entran cuentas creadas por la escuela (invitación o alta de personal).
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
    if (error && error.status === 429) {
      return { step: "code", email, error: "Ya le enviamos un código hace un momento. Espere un minuto antes de pedir otro." };
    }
    // Mismo mensaje exista o no la cuenta: no revelamos qué correos están registrados.
    return {
      step: "code",
      email,
      info: intent === "resend" ? "Le enviamos un código nuevo." : undefined,
    };
  }

  if (intent === "verify") {
    const token = String(form.get("code") ?? "").replace(/\D/g, "");
    if (token.length < 6) return { ...prev, step: "code", error: "El código tiene 6 dígitos." };
    const { error } = await supabase.auth.verifyOtp({ email: prev.email, token, type: "email" });
    if (error) {
      return { ...prev, step: "code", error: "Ese código no es válido o ya venció. Revise el correo más reciente o pida otro." };
    }
    redirect(safeNext(form.get("next")));
  }

  if (intent === "change") return { step: "email", email: prev.email };
  return prev;
}
