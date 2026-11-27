"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { sendInvitations, type InviteToSend } from "@/lib/notify/invitations";
import { createClient } from "@/lib/supabase/server";

/** Reenvía (con enlace nuevo de 14 días) las invitaciones indicadas. */
export async function resendInvitations(ids: string[]) {
  const { membership } = await requireRole("director");
  const supabase = await createClient();
  const renewed: InviteToSend[] = [];
  for (const id of ids.slice(0, 300)) {
    const { data } = await supabase.rpc("renew_invitation", { p_invitation: id });
    if (data) renewed.push(data as unknown as InviteToSend);
  }
  const { sentIds, failed } = await sendInvitations(renewed, membership.schoolName);
  if (sentIds.length) await supabase.rpc("mark_invitations_sent", { p_ids: sentIds });
  revalidatePath("/director/familias");
  return { sent: new Set(renewed.filter((r) => sentIds.includes(r.id)).map((r) => r.email)).size, failed };
}
