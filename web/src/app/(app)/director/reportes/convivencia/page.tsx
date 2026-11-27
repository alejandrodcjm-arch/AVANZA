import Link from "next/link";
import { BarList, Columns } from "@/components/charts";
import { RangePicker } from "@/components/report-nav";
import { Badge, Card, Empty, Stat } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { ACTION_LABEL, LOCATION_LABEL, SEVERITY_LABEL } from "@/lib/convivencia";
import type { Enums } from "@/lib/database.types";
import { schoolCalendar } from "@/lib/director-context";
import { formatShortDate } from "@/lib/format";
import { pickRange, ranges } from "@/lib/report-range";
import { createClient } from "@/lib/supabase/server";
import { todayLocal } from "@/lib/time";

export const metadata = { title: "Reporte de convivencia" };

type R = {
  total: number;
  school_days: number;
  per_day: number;
  by_month: { month: string; count: number; per_day: number }[];
  by_category: { key: string; label: string; count: number }[];
  by_location: { key: Enums<"incident_location">; count: number }[];
  by_hour: { hour: number; count: number }[];
  by_severity: { key: Enums<"behavior_severity">; count: number }[];
  by_group: { group: string; count: number }[];
  by_student: { student_id: string; name: string; count: number; serious: number }[];
  bullying_open: number;
  recognitions: number;
  recognitions_by_category: { label: string; count: number }[];
  recent: { id: string; date: string; time: string | null; category: string; severity: Enums<"behavior_severity">; location: Enums<"incident_location">; action: Enums<"incident_action">; students: string[]; reported_by: string }[];
};

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export default async function ConductReport({ searchParams }: { searchParams: Promise<{ rango?: string }> }) {
  const { rango } = await searchParams;
  const { membership } = await requireRole("director");
  const supabase = await createClient();
  const today = todayLocal();
  const { year, period } = await schoolCalendar(supabase, membership.schoolId, today);
  const all = ranges(today, period, year);
  const range = pickRange(all, rango ?? "ciclo");
  const { data } = await supabase.rpc("report_behavior", { p_school: membership.schoolId, p_from: range.from, p_to: range.to });
  const r = data as unknown as R;
  const ratio = r.total ? Math.round((r.recognitions / r.total) * 10) / 10 : null;
  const serious = r.by_severity.find((s) => s.key === "serious")?.count ?? 0;
  const hours = Array.from({ length: 8 }, (_, i) => i + 7).map((h) => ({ label: `${h}h`, value: r.by_hour.find((x) => x.hour === h)?.count ?? 0, hint: `incidencias entre ${h}:00 y ${h}:59` }));

  return (
    <div className="space-y-4">
      <RangePicker ranges={all} current={range.key} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <Stat value={r.total} label={`incidencias (${r.per_day} por día de clases)`} />
        </Card>
        <Card>
          <Stat value={serious} label="graves" tone={serious ? "care" : "good"} />
        </Card>
        <Card>
          <Stat value={r.bullying_open} label="casos de acoso en seguimiento" tone={r.bullying_open ? "care" : "good"} />
        </Card>
        <Card>
          <Stat value={ratio === null ? r.recognitions : `${ratio} a 1`} label={ratio === null ? "reconocimientos" : "reconocimientos por incidencia (meta 4 a 1)"} tone={ratio === null || ratio >= 4 ? "good" : "care"} />
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-semibold">¿Qué pasa?</h2>
          <BarList items={r.by_category.map((c) => ({ label: c.label, value: c.count, attention: c.key === "acoso" || c.key === "agresion_fisica" }))} />
        </Card>
        <Card>
          <h2 className="mb-3 font-semibold">¿Dónde?</h2>
          <BarList items={r.by_location.map((l) => ({ label: LOCATION_LABEL[l.key], value: l.count }))} />
          <p className="mt-3 text-sm text-muted">Si un lugar concentra incidencias (ej. el patio en el recreo), más supervisión ahí suele resolver más que sanciones.</p>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-semibold">¿A qué hora?</h2>
          <Columns label="Incidencias por hora del día" items={hours} />
        </Card>
        <Card>
          <h2 className="mb-3 font-semibold">Por mes (promedio por día de clases)</h2>
          <Columns label="Incidencias por día de clases, por mes" items={r.by_month.map((m) => ({ label: MONTHS[Number(m.month.slice(5)) - 1], value: Number(m.per_day), hint: `${m.count} incidencias en el mes` }))} />
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-semibold">Por grupo</h2>
          <BarList items={r.by_group.map((g) => ({ label: g.group, value: g.count }))} />
        </Card>
        <Card>
          <h2 className="font-semibold">Alumnos con 2 o más reportes</h2>
          <p className="mb-2 text-sm text-muted">Para darles apoyo, no para exhibirlos. Solo lo ve dirección.</p>
          {r.by_student.length ? (
            <ul className="divide-y divide-line">
              {r.by_student.map((s) => (
                <li key={s.student_id} className="flex justify-between gap-2 py-2">
                  <Link href={`/alumnos/${s.student_id}`} className="text-brand underline">
                    {s.name}
                  </Link>
                  <span className="num text-sm text-muted">
                    {s.count} reportes{s.serious ? ` · ${s.serious} graves` : ""}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty title="Nadie con reportes repetidos" />
          )}
        </Card>
      </div>

      <Card>
        <h2 className="mb-3 font-semibold">Reconocimientos</h2>
        <BarList items={r.recognitions_by_category.map((c) => ({ label: c.label, value: c.count }))} empty="Aún no hay reconocimientos en este periodo." />
      </Card>

      <Card>
        <h2 className="font-semibold">Incidencias recientes</h2>
        {r.recent.length ? (
          <ul className="mt-2 divide-y divide-line">
            {r.recent.map((i) => (
              <li key={i.id} className="py-2.5">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Badge tone={i.severity === "minor" ? "muted" : "care"}>{SEVERITY_LABEL[i.severity]}</Badge>
                  <strong>{i.category}</strong>
                  <span className="text-muted">
                    {formatShortDate(i.date)}
                    {i.time ? ` · ${i.time.slice(0, 5)}` : ""} · {LOCATION_LABEL[i.location]}
                  </span>
                </div>
                <p className="mt-0.5 text-sm">{(i.students ?? []).join(", ")}</p>
                <p className="text-xs text-muted">
                  {ACTION_LABEL[i.action]} · reportó {i.reported_by}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <Empty title="Sin incidencias en este periodo" />
        )}
      </Card>
    </div>
  );
}
