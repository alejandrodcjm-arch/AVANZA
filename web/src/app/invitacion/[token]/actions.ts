"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type InviteState = { step: "start" | "code"; error?: string };

type Preview = { valid: boolean; email: string; full_name: string };

async function preview(token: string): Promise<Preview | null> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("invitation_preview", { p_token: token });
  const p = data as unknown as Preview | null;
  return p?.valid ? p : null;
}

async function accept(token: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("accept_guardian_invitation", { p_token: token });
  if (error) {
    if (error.code === "42501") return "Esta invitación es para otro correo. Salga de su cuenta y abra el enlace otra vez.";
    return "La invitación ya no es válida. Pida a la escuela que se la reenvíe.";
  }
  redirect("/aviso-de-privacidad?bienvenida=1");
}

export async function inviteAction(token: string, prev: InviteState, form: FormData): Promise<InviteState> {
  const intent = form.get("intent");
  const supabase = await createClient();

  if (intent === "accept-signed-in") {
    const err = await accept(token);
    return { step: "start", error: err };
  }

  const p = await preview(token);
  if (!p) return { step: "start", error: "La invitación ya no es válida. Pida a la escuela que se la reenvíe." };

  if (intent === "send") {
    // La cuenta se crea aquí (no hay registro abierto al público). El correo se confirma con el código.
    const admin = createAdminClient();
    const { error: createError } = await admin.auth.admin.createUser({
      email: p.email,
      email_confirm: true,
      user_metadata: { full_name: p.full_name },
    });
    if (createError && !/already|registered|exists/i.test(createError.message)) {
      return { step: "start", error: "No pudimos preparar su cuenta. Intente de nuevo en un momento." };
    }
    const { error } = await supabase.auth.signInWithOtp({ email: p.email, options: { shouldCreateUser: false } });
    if (error?.status === 429) return { step: "code", error: "Ya le enviamos un código. Espere un minuto antes de pedir otro." };
    if (error) return { step: "start", error: "No pudimos enviar el código. Intente de nuevo en un momento." };
    return { step: "code" };
  }

  if (intent === "verify") {
    const code = String(form.get("code") ?? "").replace(/\D/g, "");
    const { error } = await supabase.auth.verifyOtp({ email: p.email, token: code, type: "email" });
    if (error) return { step: "code", error: "Ese código no es válido o ya venció. Revise el correo más reciente." };
    const err = await accept(token);
    return { step: "code", error: err };
  }

  return prev;
}
