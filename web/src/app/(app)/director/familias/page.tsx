import { Badge, Card, Empty, PageHeader, Stat } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { formatShortDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { ResendButton } from "./resend-button";

export const metadata = { title: "Familias" };

export default async function FamiliesPage() {
  const { membership } = await requireRole("director");
  const supabase = await createClient();
  const { data: inv } = await supabase
    .from("guardian_invitations")
    .select("id, email, full_name, relationship, sent_at, expires_at, accepted_at, students(first_name, last_name, enrollments(groups(grade, name)))")
    .eq("school_id", membership.schoolId)
    .order("created_at", { ascending: true });
  const now = new Date().toISOString();
  const all = inv ?? [];
  const accepted = all.filter((i) => i.accepted_at);
  const pending = all.filter((i) => !i.accepted_at);
  const expired = pending.filter((i) => i.expires_at < now || !i.sent_at);

  // Agrupar pendientes por grupo para que la maestra pueda recordarlo en la junta o a la salida.
  const byGroup = new Map<string, typeof pending>();
  for (const p of pending) {
    const g = p.students?.enrollments?.[0]?.groups;
    const key = g ? `${g.grade}°${g.name}` : "Sin grupo";
    byGroup.set(key, [...(byGroup.get(key) ?? []), p]);
  }

  return (
    <>
      <PageHeader title="Familias" subtitle="Una familia que entra en la primera semana suele quedarse. Recuérdelo en juntas y a la salida." />
      <div className="mb-4 grid grid-cols-2 gap-3">
        <Card>
          <Stat value={accepted.length} label="invitaciones aceptadas" tone="good" />
        </Card>
        <Card>
          <Stat value={pending.length} label="pendientes" tone={pending.length ? "care" : undefined} />
        </Card>
      </div>
      {expired.length > 0 && (
        <Card className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p>{expired.length} invitaciones vencidas o sin enviar.</p>
          <ResendButton ids={expired.map((e) => e.id)} label="Reenviar todas" variant="primary" />
        </Card>
      )}
      {!all.length ? (
        <Empty title="Aún no hay familias invitadas">Importe a sus alumnos con el correo de sus tutores en Escuela › Importar.</Empty>
      ) : (
        [...byGroup.entries()]
          .sort(([a], [b]) => a.localeCompare(b, "es"))
          .map(([g, list]) => (
            <Card key={g} className="mb-3">
              <h2 className="font-semibold">
                {g} · {list.length} pendientes
              </h2>
              <ul className="mt-2 divide-y divide-line">
                {list.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <div className="min-w-0">
                      <p>
                        {p.full_name || p.email} <span className="text-sm text-muted">· {p.relationship} de {p.students?.first_name}</span>
                      </p>
                      <p className="text-sm text-muted">
                        {p.email} ·{" "}
                        {!p.sent_at ? <Badge tone="care">sin enviar</Badge> : p.expires_at < now ? <Badge tone="care">vencida</Badge> : `enviada ${formatShortDate(p.sent_at.slice(0, 10))}`}
                      </p>
                    </div>
                    <ResendButton ids={[p.id]} label="Reenviar" variant="ghost" />
                  </li>
                ))}
              </ul>
            </Card>
          ))
      )}
    </>
  );
}
