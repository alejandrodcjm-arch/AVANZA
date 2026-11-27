import Link from "next/link";
import { AlertsList } from "@/components/alerts-list";
import { ButtonLink, Card, PageHeader, Stat } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { formatShortDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { todayLocal } from "@/lib/time";

export const metadata = { title: "Tablero" };

type Dashboard = {
  open_alerts: number;
  students_needing_support: number;
  open_cases: number;
  overdue_actions: number;
  guardians_pending: number;
  guardians_active: number;
  summaries_pending: number;
  teachers_behind: { teacher: string; group: string; last_capture: string | null }[];
};

export default async function DirectorHome() {
  const { membership } = await requireRole("director");
  const supabase = await createClient();
  const today = todayLocal();
  const [{ data: d }, students, linked, years, subjects, teachers] = await Promise.all([
    supabase.rpc("director_dashboard", { p_school: membership.schoolId, p_today: today }),
    supabase.from("students").select("id", { count: "exact", head: true }).eq("school_id", membership.schoolId),
    supabase.from("student_guardians").select("student_id").eq("school_id", membership.schoolId),
    supabase.from("school_years").select("id", { count: "exact", head: true }).eq("school_id", membership.schoolId).eq("is_current", true),
    supabase.from("subjects").select("id", { count: "exact", head: true }).eq("school_id", membership.schoolId),
    supabase.from("memberships").select("id", { count: "exact", head: true }).eq("school_id", membership.schoolId).eq("role", "teacher"),
  ]);
  const dash = d as unknown as Dashboard;
  const totalStudents = students.count ?? 0;
  const withFamily = new Set((linked.data ?? []).map((l) => l.student_id)).size;
  const pct = totalStudents ? Math.round((100 * withFamily) / totalStudents) : 0;

  const setup = [
    { done: (years.count ?? 0) > 0, label: "Ciclo escolar y periodos", href: "/director/escuela/ciclo" },
    { done: (subjects.count ?? 0) > 0, label: "Materias o campos formativos", href: "/director/escuela/ciclo" },
    { done: totalStudents > 0, label: "Importar alumnos y familias (Excel)", href: "/director/importar" },
    { done: (teachers.count ?? 0) > 0, label: "Dar de alta a los maestros", href: "/director/personal" },
  ];
  const pendingSetup = setup.filter((s) => !s.done);

  return (
    <>
      <PageHeader title="Tablero" subtitle="Primero, lo que protege a los alumnos y a la matrícula." />
      <div className="space-y-4">
        {pendingSetup.length > 0 && (
          <Card className="ring-brand">
            <h2 className="font-semibold">Para empezar</h2>
            <ol className="mt-2 space-y-2">
              {setup.map((s, i) => (
                <li key={s.label}>
                  <Link href={s.href} className="flex min-h-11 items-center gap-3">
                    <span className={s.done ? "text-good" : "text-muted"}>{s.done ? "✓" : `${i + 1}.`}</span>
                    <span className={s.done ? "text-muted line-through" : "font-medium text-brand underline"}>{s.label}</span>
                  </Link>
                </li>
              ))}
            </ol>
          </Card>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card>
            <Stat value={dash.students_needing_support} label="alumnos con señales" tone={dash.students_needing_support ? "care" : "good"} />
          </Card>
          <Card>
            <Stat value={dash.open_cases} label="casos abiertos" />
            {dash.overdue_actions > 0 && <p className="mt-1 text-sm text-care">{dash.overdue_actions} acciones vencidas</p>}
          </Card>
          <Card>
            <Stat value={`${pct}%`} label="alumnos con familia activa" tone={pct >= 70 ? "good" : "care"} />
            <p className="mt-1 text-sm text-muted">Meta del piloto: 70%</p>
          </Card>
          <Card>
            <Stat value={dash.summaries_pending} label="resúmenes sin aprobar" />
          </Card>
        </div>

        {dash.teachers_behind.length > 0 && (
          <Card>
            <h2 className="font-semibold">Grupos sin lista en los últimos 2 días</h2>
            <ul className="mt-2 space-y-1">
              {dash.teachers_behind.map((t) => (
                <li key={t.group} className="flex justify-between gap-2">
                  <span>
                    {t.group} · {t.teacher}
                  </span>
                  <span className="text-sm text-muted">{t.last_capture ? `última: ${formatShortDate(t.last_capture)}` : "nunca"}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-sm text-muted">Sin lista no hay alertas de faltas. Un recordatorio amable suele bastar.</p>
          </Card>
        )}

        {dash.guardians_pending > 0 && (
          <Card className="flex items-center justify-between gap-3">
            <p>
              <strong className="num">{dash.guardians_pending}</strong> familias no han aceptado su invitación.
            </p>
            <ButtonLink href="/director/familias" variant="secondary">
              Ver
            </ButtonLink>
          </Card>
        )}

        <h2 className="pt-2 text-lg font-semibold">Alumnos que podrían necesitar apoyo</h2>
        <AlertsList supabase={supabase} />
      </div>
    </>
  );
}
