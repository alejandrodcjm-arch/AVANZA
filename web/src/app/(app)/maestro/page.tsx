import Link from "next/link";
import { ButtonLink, Card, Empty, PageHeader, cx } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { firstName, formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { teacherGroups, weekStart } from "@/lib/teacher";
import { addDays, isWeekday, todayLocal } from "@/lib/time";

export const metadata = { title: "Mi semana" };

function Check({ done, children, href }: { done: boolean; children: React.ReactNode; href: string }) {
  return (
    <li>
      <Link href={href} className="flex min-h-11 items-center gap-3">
        <span aria-hidden className={cx("flex size-6 shrink-0 items-center justify-center rounded-full text-sm", done ? "bg-good text-white" : "ring-2 ring-line")}>
          {done ? "✓" : ""}
        </span>
        <span className={done ? "text-muted" : "font-medium"}>{children}</span>
        <span className="sr-only">{done ? "(hecho)" : "(pendiente)"}</span>
      </Link>
    </li>
  );
}

export default async function TeacherHome() {
  const { session } = await requireRole("teacher");
  const supabase = await createClient();
  const today = todayLocal();
  const week = weekStart(today);
  const groups = await teacherGroups(supabase, session.userId);
  const gids = groups.length ? groups.map((g) => g.id) : ["00000000-0000-0000-0000-000000000000"];

  const [attendance, cuts, recs, incs, alerts, summaries, enroll] = await Promise.all([
    supabase.from("attendance").select("group_id, date").in("group_id", gids).gte("date", week).lte("date", today),
    supabase.from("weekly_pending").select("subject_id, student_id").eq("week_start", week).eq("recorded_by", session.userId),
    supabase.from("recognitions").select("id", { count: "exact", head: true }).eq("created_by", session.userId).gte("created_at", week),
    supabase.from("incidents").select("id", { count: "exact", head: true }).eq("reported_by", session.userId).gte("occurred_on", week),
    supabase.from("alerts").select("id", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("monthly_summaries").select("id", { count: "exact", head: true }).neq("status", "approved"),
    supabase.from("enrollments").select("group_id, student_id").in("group_id", gids),
  ]);
  const studentGroup = new Map((enroll.data ?? []).map((e) => [e.student_id, e.group_id]));
  const count = new Map<string, number>();
  for (const e of enroll.data ?? []) count.set(e.group_id, (count.get(e.group_id) ?? 0) + 1);
  const takenToday = new Set((attendance.data ?? []).filter((a) => a.date === today).map((a) => a.group_id));
  const weekdaysSoFar = [0, 1, 2, 3, 4].map((k) => addDays(week, k)).filter((d) => d <= today).length;
  const daysTaken = (gid: string) => new Set((attendance.data ?? []).filter((a) => a.group_id === gid).map((a) => a.date)).size;
  const cutDone = (gid: string, sid: string) => (cuts.data ?? []).some((c) => c.subject_id === sid && studentGroup.get(c.student_id) === gid);

  return (
    <>
      <PageHeader title={`Hola, ${firstName(session.fullName) || "maestra/o"}`} subtitle={formatDate(today)} />
      <div className="space-y-4">
        {((summaries.count ?? 0) > 0 || (alerts.count ?? 0) > 0) && (
          <div className="grid gap-3 sm:grid-cols-2">
            {(summaries.count ?? 0) > 0 && (
              <Link href="/maestro/resumenes">
                <Card className="h-full bg-brand text-white ring-brand">
                  <p className="text-2xl font-bold">{summaries.count}</p>
                  <p className="font-semibold">resúmenes del mes por revisar →</p>
                  <p className="text-sm text-white/80">Unos 30 segundos cada uno.</p>
                </Card>
              </Link>
            )}
            {(alerts.count ?? 0) > 0 && (
              <Link href="/maestro/alertas">
                <Card className="h-full bg-care-soft ring-care/30">
                  <p className="text-2xl font-bold">{alerts.count}</p>
                  <p className="font-semibold">señales de apoyo →</p>
                  <p className="text-sm text-muted">Dar seguimiento o descartar con motivo.</p>
                </Card>
              </Link>
            )}
          </div>
        )}

        {groups.length === 0 ? (
          <Empty title="Aún no tiene grupos asignados">Dirección le asigna sus grupos y materias en Escuela › Grupos.</Empty>
        ) : (
          groups.map((g) => (
            <Card key={g.id}>
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="text-xl font-bold">
                  <Link href={`/maestro/grupos/${g.id}`} className="text-ink">
                    {g.label}
                  </Link>
                </h2>
                <span className="text-sm text-muted">{count.get(g.id) ?? 0} alumnos</span>
              </div>
              <p className="text-sm text-muted">{g.subjects.map((s) => s.name).join(" · ")}</p>

              <ul className="mt-3 space-y-0.5">
                {isWeekday(today) && (
                  <Check done={takenToday.has(g.id)} href={`/maestro/grupos/${g.id}/lista`}>
                    Lista de hoy
                  </Check>
                )}
                <Check done={daysTaken(g.id) >= weekdaysSoFar} href={`/maestro/grupos/${g.id}/lista`}>
                  Lista de la semana ({daysTaken(g.id)} de {weekdaysSoFar} días)
                </Check>
                {g.subjects.map((s) => (
                  <Check key={s.id} done={cutDone(g.id, s.id)} href={`/maestro/grupos/${g.id}/pendientes?materia=${s.id}`}>
                    Corte de pendientes · {s.name}
                  </Check>
                ))}
              </ul>

              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <ButtonLink href={`/maestro/grupos/${g.id}/lista`} variant={takenToday.has(g.id) ? "secondary" : "primary"}>
                  Pasar lista
                </ButtonLink>
                <ButtonLink href={`/maestro/grupos/${g.id}/pendientes`} variant="secondary">
                  Pendientes
                </ButtonLink>
                <ButtonLink href={`/maestro/grupos/${g.id}/conducta`} variant="secondary">
                  Conducta
                </ButtonLink>
                <ButtonLink href={`/maestro/grupos/${g.id}/calificaciones`} variant="secondary">
                  Calificaciones
                </ButtonLink>
              </div>
            </Card>
          ))
        )}

        <Card className="flex items-center justify-between gap-3">
          <div>
            <p className="font-semibold">Esta semana</p>
            <p className="text-sm text-muted">
              {recs.count ?? 0} reconocimientos · {incs.count ?? 0} incidencias
            </p>
          </div>
          <span className="text-sm text-muted">Meta: 4 reconocimientos por cada reporte</span>
        </Card>
      </div>
    </>
  );
}
