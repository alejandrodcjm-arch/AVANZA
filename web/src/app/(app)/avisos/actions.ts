"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function markAllRead() {
  const session = await getSession();
  if (!session) return;
  const supabase = await createClient();
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", session.userId).is("read_at", null);
  revalidatePath("/", "layout");
}

export async function openNotification(id: string, url: string | null) {
  const supabase = await createClient();
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id).is("read_at", null);
  const { redirect } = await import("next/navigation");
  redirect(url && url.startsWith("/") ? url : "/avisos");
}
