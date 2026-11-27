import "server-only";
import { env } from "@/lib/env";
import { invitationEmail } from "./emails";
import { sendEmail } from "./email";

export type InviteToSend = { id: string; email: string; token: string; guardian_name: string; student_first_name: string };

/**
 * Envía invitaciones de 5 en 5. Si un correo tiene varias (hermanos), basta un correo por persona:
 * al aceptar una, la base acepta las de sus otros hijos con el mismo correo.
 */
export async function sendInvitations(invites: InviteToSend[], schoolName: string) {
  const base = env().NEXT_PUBLIC_APP_URL;
  const byEmail = new Map<string, InviteToSend[]>();
  for (const i of invites) byEmail.set(i.email, [...(byEmail.get(i.email) ?? []), i]);

  const sentIds: string[] = [];
  const failed: string[] = [];
  const groups = [...byEmail.values()];
  for (let i = 0; i < groups.length; i += 5) {
    await Promise.all(
      groups.slice(i, i + 5).map(async (list) => {
        const first = list[0];
        const names = list.map((l) => l.student_first_name);
        const studentLabel = names.length > 1 ? `${names.slice(0, -1).join(", ")} y ${names.at(-1)}` : names[0];
        const mail = invitationEmail({ guardianName: first.guardian_name, studentFirstName: studentLabel, schoolName, url: `${base}/invitacion/${first.token}` });
        const res = await sendEmail({ to: first.email, ...mail });
        if (res.ok) sentIds.push(...list.map((l) => l.id));
        else failed.push(first.email);
      }),
    );
  }
  return { sentIds, failed };
}
