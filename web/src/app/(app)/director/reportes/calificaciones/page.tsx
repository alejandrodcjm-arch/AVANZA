import Link from "next/link";
import { BarList, Columns } from "@/components/charts";
import { Badge, ButtonLink, Card, Empty, Stat, cx } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { schoolCalendar } from "@/lib/director-context";
import { formatDate, formatScore } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { todayLocal } from "@/lib/time";

export const metadata = { title: "Reporte de calificaciones" };

type R = {
  by_group_subject: { group: string; group_id: string; subject: string; average: number | null; failing: number; captured: number; students: number }[];
  by_subject: { subject: string; average: number; failing: number; captured: number }[];
  distribution: { bucket: string; count: number }[];
  students_failing: { student_id: string; name: string; group: string; subjects: string[]; count: number }[];
  capture_by_teacher: { teacher: string; expected: number; captured: number; pct: number | null }[];
};

export default async function GradesReport({ searchParams }: { searchParams: Promise<{ periodo?: string }> }) {
  const sp = await searchParams;
  const { membership } = await requireRole("director");
  const supabase = await createClient();
  const today = todayLocal();
  const { periods, period: current } = await schoolCalendar(supabase, membership.schoolId, today);
  const period = periods.find((p) => p.id === sp.periodo) ?? current;
  if (!period) return <Empty title="Configure primero el ciclo y sus periodos" />;
  const { data } = await supabase.rpc("report_grades", { p_school: membership.schoolId, p_period: period.id });
  const r = data as unknown as R;
  const captured = r.capture_by_teacher.reduce((t, x) => t + x.captured, 0);
  const expected = r.capture_by_teacher.reduce((t, x) => t + x.expected, 0);
  const groups = [...new Set(r.by_group_subject.map((x) => x.group))];
  const subjects = [...new Set(r.by_group_subject.map((x) => x.subject))].sort((a, b) => a.localeCompare(b, "es"));
  const cell = (g: string, s: string) => r.by_group_subject.find((x) => x.group === g && x.subject === s);
  const avgAll = r.by_subject.length ? r.by_subject.reduce((t, x) => t + Number(x.average) * x.captured, 0) / Math.max(1, r.by_subject.reduce((t, x) => t + x.captured, 0)) : null;
  const daysLeft = Math.ceil((new Date(`${period.ends_on}T12:00:00Z`).getTime() - new Date(`${today}T12:00:00Z`).getTime()) / 86400000);

  return (
    <div className="space-y-4">
      <nav className="flex flex-wrap gap-2" aria-label="Periodo">
        {periods.map((p) => (
          <Link key={p.id} href={`?periodo=${p.id}`} className={cx("min-h-10 content-center rounded-full px-4 text-sm", p.id === period.id ? "bg-brand text-white" : "bg-card ring-1 ring-line")}>
            {p.name}
          </Link>
        ))}
      </nav>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <Stat value={expected ? `${Math.round((100 * captured) / expected)}%` : "—"} label="capturado" tone={expected && captured >= expected ? "good" : "care"} />
        </Card>
        <Card>
          <Stat value={avgAll ? formatScore(Math.round(avgAll * 10) / 10) : "—"} label="promedio general" />
        </Card>
        <Card>
          <Stat value={r.students_failing.length} label="alumnos con alguna materia reprobada" tone={r.students_failing.length ? "care" : "good"} />
        </Card>
        <Card>
          <Stat value={daysLeft >= 0 ? daysLeft : 0} label={`días para cerrar el ${period.name}`} />
        </Card>
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-semibold">Avance de captura por maestro</h2>
            <p className="text-sm text-muted">El periodo cierra el {formatDate(period.ends_on)}. Revise antes de la captura oficial de la SEP.</p>
          </div>
          <ButtonLink href={`/api/reportes/concentrado?periodo=${period.id}`} variant="secondary" prefetch={false}>
            Descargar concentrado (Excel)
          </ButtonLink>
        </div>
        <div className="mt-3">
          <BarList unit="%" max={100} items={r.capture_by_teacher.map((t) => ({ label: `${t.teacher} · ${t.captured} de ${t.expected}`, value: t.pct ?? 0, attention: (t.pct ?? 0) < 100 }))} />
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">Concentrado: promedio por grupo y materia</h2>
        <div className="-mx-2 overflow-x-auto">
          <table className="num w-full min-w-[480px] text-sm">
            <thead>
              <tr className="text-left text-muted">
                <th className="px-2 py-1.5 font-medium">Grupo</th>
                {subjects.map((s) => (
                  <th key={s} className="px-2 py-1.5 font-medium">
                    {s}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <tr key={g} className="border-t border-line">
                  <td className="px-2 py-2 font-semibold">{g}</td>
                  {subjects.map((s) => {
                    const c = cell(g, s);
                    return (
                      <td key={s} className="px-2 py-2">
                        {c?.average ? formatScore(Number(c.average)) : "—"}
                        {c && c.failing > 0 && <span className="ml-1 text-xs text-[#7a4f0f]">({c.failing} rep.)</span>}
                        {c && c.captured < c.students && <span className="block text-xs text-muted">{c.captured}/{c.students}</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-semibold">Reprobados por materia</h2>
          <BarList items={r.by_subject.map((s) => ({ label: `${s.subject} (promedio ${formatScore(Number(s.average))})`, value: s.failing, attention: s.failing > 0 }))} />
        </Card>
        <Card>
          <h2 className="mb-3 font-semibold">Distribución de calificaciones</h2>
          <Columns label="Número de calificaciones por rango" items={r.distribution.map((d) => ({ label: d.bucket, value: d.count, attention: d.bucket === "5", hint: `calificaciones de ${d.bucket}` }))} />
        </Card>
      </div>

      <Card>
        <h2 className="font-semibold">Alumnos con materias reprobadas</h2>
        {r.students_failing.length ? (
          <ul className="mt-2 divide-y divide-line">
            {r.students_failing.map((s) => (
              <li key={s.student_id} className="py-2">
                <div className="flex justify-between gap-2">
                  <Link href={`/alumnos/${s.student_id}`} className="text-brand underline">
                    {s.name}
                  </Link>
                  <Badge tone="care">{s.count} materia{s.count === 1 ? "" : "s"}</Badge>
                </div>
                <p className="text-sm text-muted">
                  {s.group} · {s.subjects.join(", ")}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <Empty title="Nadie reprobando en este periodo" />
        )}
      </Card>
    </div>
  );
}
