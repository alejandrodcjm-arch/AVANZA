import Link from "next/link";
import { Badge, ButtonLink, Card, Empty, PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { firstName, formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { groupStudents, teacherGroups } from "@/lib/teacher";
import { isWeekday, todayLocal } from "@/lib/time";

export const metadata = { title: "Hoy" };

export default async function TeacherHome() {
  const { session } = await requireRole("teacher");
  const supabase = await createClient();
  const today = todayLocal();
  const groups = await teacherGroups(supabase, session.userId);

  const [taken, alerts, summaries] = await Promise.all([
    supabase.from("attendance").select("group_id").eq("date", today).in("group_id", groups.length ? groups.map((g) => g.id) : ["00000000-0000-0000-0000-000000000000"]),
    supabase.from("alerts").select("id", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("monthly_summaries").select("id", { count: "exact", head: true }).neq("status", "approved"),
  ]);
  const takenSet = new Set((taken.data ?? []).map((t) => t.group_id));
  const counts = await Promise.all(groups.map(async (g) => (await groupStudents(supabase, g.id)).length));

  return (
    <>
      <PageHeader title={`Hola, ${firstName(session.fullName) || "maestra/o"}`} subtitle={formatDate(today)} />
      <div className="space-y-4">
        {(summaries.count ?? 0) > 0 && (
          <Link href="/maestro/resumenes" className="block">
            <Card className="bg-brand text-white ring-brand">
              <p className="font-semibold">{summaries.count} resúmenes del mes esperan su revisión →</p>
              <p className="text-sm text-white/80">Las familias los reciben en cuanto usted los aprueba.</p>
            </Card>
          </Link>
        )}
        {(alerts.count ?? 0) > 0 && (
          <Link href="/maestro/alertas" className="block">
            <Card className="bg-care-soft ring-care/30">
              <p className="font-semibold">{alerts.count} alumnos podrían necesitar apoyo →</p>
              <p className="text-sm text-muted">Revise y decida: dar seguimiento o descartar.</p>
            </Card>
          </Link>
        )}

        {groups.length === 0 ? (
          <Empty title="Aún no tiene grupos asignados">Dirección le asigna sus grupos y materias en Escuela › Grupos.</Empty>
        ) : (
          groups.map((g, i) => (
            <Card key={g.id}>
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="text-xl font-bold">{g.label}</h2>
                <span className="text-sm text-muted">{counts[i]} alumnos</span>
              </div>
              <p className="text-sm text-muted">{g.subjects.map((s) => s.name).join(" · ")}</p>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                {isWeekday(today) &&
                  (takenSet.has(g.id) ? (
                    <ButtonLink href={`/maestro/grupos/${g.id}/lista`} variant="secondary">
                      <Badge tone="good">✓</Badge> Lista tomada
                    </ButtonLink>
                  ) : (
                    <ButtonLink href={`/maestro/grupos/${g.id}/lista`}>Pasar lista</ButtonLink>
                  ))}
                <ButtonLink href={`/maestro/grupos/${g.id}/calificaciones`} variant="secondary">
                  Calificaciones
                </ButtonLink>
                <ButtonLink href={`/maestro/grupos/${g.id}/tareas`} variant="secondary">
                  Tareas
                </ButtonLink>
              </div>
              <Link href={`/maestro/grupos/${g.id}`} className="mt-3 inline-flex min-h-10 items-center text-sm font-medium text-brand underline">
                Ver alumnos
              </Link>
            </Card>
          ))
        )}
      </div>
    </>
  );
}
