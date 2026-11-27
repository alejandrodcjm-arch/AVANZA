import Link from "next/link";
import { BarList, Columns } from "@/components/charts";
import { RangePicker } from "@/components/report-nav";
import { Card, Empty, Stat } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { schoolCalendar } from "@/lib/director-context";
import { formatShortDate } from "@/lib/format";
import { pickRange, ranges } from "@/lib/report-range";
import { createClient } from "@/lib/supabase/server";
import { todayLocal } from "@/lib/time";

export const metadata = { title: "Reporte de asistencia" };

type R = {
  groups: { group_id: string; group: string; students: number; records: number; absences: number; lates: number; rate: number | null; chronic: number }[];
  daily: { date: string; rate: number; absences: number }[];
  today: { student_id: string; name: string; group: string; status: "absent" | "late" | "excused" }[];
  chronic_students: { student_id: string; name: string; group: string; absences: number; days: number; pct: number }[];
};
const STATUS = { absent: "Falta", late: "Retardo", excused: "Justificada" } as const;

export default async function AttendanceReport({ searchParams }: { searchParams: Promise<{ rango?: string }> }) {
  const { rango } = await searchParams;
  const { membership } = await requireRole("director");
  const supabase = await createClient();
  const today = todayLocal();
  const { year, period } = await schoolCalendar(supabase, membership.schoolId, today);
  const all = ranges(today, period, year);
  const range = pickRange(all, rango);
  const { data } = await supabase.rpc("report_attendance", { p_school: membership.schoolId, p_from: range.from, p_to: range.to });
  const r = data as unknown as R;
  const records = r.groups.reduce((t, g) => t + g.records, 0);
  const absences = r.groups.reduce((t, g) => t + g.absences, 0);
  const rate = records ? Math.round((1000 * (records - absences)) / records) / 10 : null;

  return (
    <div className="space-y-4">
      <RangePicker ranges={all} current={range.key} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <Stat value={rate === null ? "—" : `${rate}%`} label="asistencia" />
        </Card>
        <Card>
          <Stat value={absences} label="faltas" />
        </Card>
        <Card>
          <Stat value={r.groups.reduce((t, g) => t + g.lates, 0)} label="retardos" />
        </Card>
        <Card>
          <Stat value={r.chronic_students.length} label="con ausentismo crónico (≥10%)" tone={r.chronic_students.length ? "care" : "good"} />
        </Card>
      </div>

      <Card>
        <h2 className="mb-2 font-semibold">Asistencia diaria: faltas por día</h2>
        <Columns
          label="Faltas por día"
          height={220}
          items={r.daily.map((d) => ({ label: formatShortDate(d.date).replace(/ de /, " ").replace(/\.$/, ""), value: d.absences, hint: `${formatShortDate(d.date)} · asistencia ${Number(d.rate).toFixed(1)}%` }))}
        />
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">Por grupo</h2>
        <BarList
          unit="%"
          max={100}
          items={r.groups.map((g) => ({ label: `${g.group} · ${g.absences} faltas, ${g.lates} retardos`, value: g.rate ?? 0, attention: (g.rate ?? 100) < 90, hint: `${g.chronic} alumnos con ausentismo crónico` }))}
        />
      </Card>

      <Card>
        <h2 className="font-semibold">Faltas y retardos de hoy</h2>
        {r.today.length ? (
          <ul className="mt-2 divide-y divide-line">
            {r.today.map((t) => (
              <li key={t.student_id} className="flex justify-between gap-2 py-2">
                <Link href={`/alumnos/${t.student_id}`} className="text-brand underline">
                  {t.name}
                </Link>
                <span className="text-sm text-muted">
                  {t.group} · {STATUS[t.status]}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-muted">Sin faltas registradas hoy (o aún no pasan lista).</p>
        )}
      </Card>

      <Card>
        <h2 className="font-semibold">Ausentismo crónico (faltó 10% o más de los días)</h2>
        <p className="text-sm text-muted">Faltar 1 de cada 10 días ya afecta el aprendizaje; conviene una llamada temprana a la familia.</p>
        {r.chronic_students.length ? (
          <ul className="mt-2 divide-y divide-line">
            {r.chronic_students.map((c) => (
              <li key={c.student_id} className="flex justify-between gap-2 py-2">
                <Link href={`/alumnos/${c.student_id}`} className="text-brand underline">
                  {c.name}
                </Link>
                <span className="num text-sm text-muted">
                  {c.group} · {c.absences} de {c.days} días ({c.pct}%)
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <Empty title="Nadie en ausentismo crónico en este periodo" />
        )}
      </Card>
    </div>
  );
}
