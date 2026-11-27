"use server";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function acceptNotice() {
  const session = await getSession();
  if (!session?.active) redirect("/entrar");
  const supabase = await createClient();
  const { error } = await supabase.from("consents").insert({
    school_id: session.active.schoolId,
    user_id: session.userId,
    notice_version: session.active.noticeVersion,
  });
  if (error && error.code !== "23505") throw new Error("No se pudo guardar su aceptación. Intente de nuevo.");
  redirect("/inicio");
}
