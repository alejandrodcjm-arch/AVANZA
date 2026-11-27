"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { sendInvitations, type InviteToSend } from "@/lib/notify/invitations";
import { createClient } from "@/lib/supabase/server";

const rowSchema = z.object({
  grado: z.number().int().min(1).max(6),
  grupo: z.string().min(1).max(10),
  nombre: z.string().min(1).max(100),
  apellido_paterno: z.string().min(1).max(100),
  apellido_materno: z.string().max(100),
  tutores: z.array(z.object({ nombre: z.string().max(150), correo: z.email(), parentesco: z.enum(["madre", "padre", "tutor"]) })).max(2),
});

export type ImportResult = {
  ok: boolean;
  error?: string;
  groups_created?: number;
  students_created?: number;
  students_moved?: number;
  students_unchanged?: number;
  invitations_sent?: number;
  invitations_failed?: string[];
};

export async function commitImport(rows: unknown, fileName: string, sendNow: boolean): Promise<ImportResult> {
  const { membership } = await requireRole("director");
  const parsed = z.array(rowSchema).min(1).max(3000).safeParse(rows);
  if (!parsed.success) return { ok: false, error: "El archivo tiene datos que no se pueden importar. Revise la vista previa." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("import_roster", { p_school: membership.schoolId, p_rows: parsed.data, p_file_name: fileName.slice(0, 200) });
  if (error) {
    if (error.code === "P0001") return { ok: false, error: "Primero configure el ciclo escolar actual (Escuela › Ciclo y materias)." };
    return { ok: false, error: "No se pudo importar. No se guardó nada; intente de nuevo." };
  }
  const res = data as unknown as { groups_created: number; students_created: number; students_moved: number; students_unchanged: number; invitations: InviteToSend[] };
  let sent = { sentIds: [] as string[], failed: [] as string[] };
  if (sendNow && res.invitations.length) {
    sent = await sendInvitations(res.invitations, membership.schoolName);
    if (sent.sentIds.length) await supabase.rpc("mark_invitations_sent", { p_ids: sent.sentIds });
  }
  revalidatePath("/director", "layout");
  return {
    ok: true,
    groups_created: res.groups_created,
    students_created: res.students_created,
    students_moved: res.students_moved,
    students_unchanged: res.students_unchanged,
    invitations_sent: new Set(res.invitations.filter((i) => sent.sentIds.includes(i.id)).map((i) => i.email)).size,
    invitations_failed: sent.failed,
  };
}
