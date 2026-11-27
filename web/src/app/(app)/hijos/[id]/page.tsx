import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Button, Card, PageHeader, Stat, Trend } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { formatDate, formatMonth, formatScore, formatShortDate, plural } from "@/lib/format";
import type { Overview } from "@/lib/overview";
import { createClient } from "@/lib/supabase/server";
import { monthStart, todayLocal } from "@/lib/time";
import { markGoal } from "./actions";
import { GoalForm } from "./goal-form";

export default async function ChildPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireRole("guardian");
  const supabase = await createClient();
  const today = todayLocal();
  const { data, error } = await supabase.rpc("student_overview", { p_student: id, p_today: today });
  if (error || !data) notFound();
  const o = data as unknown as Overview;
  const a = o.attendance;
  const thisMonth = monthStart(today);
  const goalThisMonth = o.goal && o.goal.month === thisMonth ? o.goal : null;
  const lastGoal = o.goal && o.goal.month < thisMonth ? o.goal : null;
  const latest = o.summaries[0];

  return (
    <>
      <PageHeader title={o.student.first_name} subtitle={[o.group?.label, o.period?.name].filter(Boolean).join(" · ")} back="/hijos" />

      <div className="space-y-4">
        {latest && (
          <Link href={`/hijos/${id}/resumenes/${latest.id}`} className="block">
            <Card className="bg-brand text-white ring-brand">
              <p className="text-sm text-white/80">Resumen de {formatMonth(latest.month)}</p>
              <p className="mt-1 text-lg font-semibold">Lo que la maestra quiere que sepa este mes →</p>
            </Card>
          </Link>
        )}

        <Card>
          <h2 className="font-semibold">Asistencia en el {o.period?.name ?? "periodo"}</h2>
          {a && a.days > 0 ? (
            <>
              <div className="mt-3 grid grid-cols-3 gap-3">
                <Stat value={a.absences} label={a.absences === 1 ? "falta" : "faltas"} tone={a.absences === 0 ? "good" : undefined} />
                <Stat value={a.lates} label={a.lates === 1 ? "retardo" : "retardos"} />
                <Stat value={a.days - a.absences} label={`de ${a.days} días asistió`} />
              </div>
              <p className="mt-3 text-muted">
                {a.absences === 0
                  ? `${o.student.first_name} no ha faltado en este periodo.`
                  : `Última falta: ${formatDate(a.last_absence!)}. Cada día de clase cuenta; si hay un motivo, avise a la escuela.`}
              </p>
            </>
          ) : (
            <p className="mt-2 text-muted">Aún no hay asistencia registrada en este periodo.</p>
          )}
        </Card>

        <Card>
          <h2 className="font-semibold">Calificaciones{o.grades[0] ? ` · ${o.grades[0].period}` : ""}</h2>
          {o.grades.length ? (
            <ul className="mt-2 divide-y divide-line">
              {o.grades.map((g) => (
                <li key={g.subject} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="font-medium">{g.subject}</p>
                    <Trend delta={g.delta} />
                  </div>
                  <span className="num text-2xl font-bold">{formatScore(g.score)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-muted">Las calificaciones aparecen cuando la maestra o el maestro las capture.</p>
          )}
          <p className="mt-2 text-sm text-muted">La flecha compara con el periodo anterior de {o.student.first_name}, no con otros alumnos.</p>
        </Card>

        <Card>
          <h2 className="font-semibold">Tareas sin entregar (últimos 30 días)</h2>
          {o.pending_work.length ? (
            <ul className="mt-2 space-y-2">
              {o.pending_work.map((w, i) => (
                <li key={i} className="flex items-start justify-between gap-3">
                  <span>
                    {w.title} <span className="text-muted">· {w.subject}</span>
                  </span>
                  <Badge tone="care">{formatShortDate(w.due_on)}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-muted">Ninguna. Entregó todo lo que se pidió.</p>
          )}
          {o.pending_work.length > 0 && (
            <p className="mt-3 text-sm text-muted">
              Sugerencia: pregunte qué parte se le complicó y acuerden un horario fijo para hacer la tarea. No hace falta hacerla por él o ella.
            </p>
          )}
        </Card>

        <Card>
          <h2 className="font-semibold">Meta del mes</h2>
          {lastGoal && lastGoal.achieved === null && (
            <div className="mt-2 rounded-xl bg-brand-soft p-3">
              <p>
                El mes pasado eligieron: <strong>{lastGoal.goal}</strong>. ¿La cumplieron?
              </p>
              <div className="mt-2 flex gap-2">
                <form action={markGoal.bind(null, id, lastGoal.id, true)}>
                  <Button variant="secondary">Sí</Button>
                </form>
                <form action={markGoal.bind(null, id, lastGoal.id, false)}>
                  <Button variant="ghost">Todavía no</Button>
                </form>
              </div>
            </div>
          )}
          {goalThisMonth ? (
            <div className="mt-2">
              <p className="text-lg">{goalThisMonth.goal}</p>
              <p className="mt-1 text-sm text-muted">La maestra la ve y la toma en cuenta en el resumen del mes.</p>
            </div>
          ) : (
            <div className="mt-2">
              <GoalForm studentId={id} firstName={o.student.first_name} />
            </div>
          )}
        </Card>

        {o.summaries.length > 1 && (
          <Card>
            <h2 className="font-semibold">Resúmenes anteriores</h2>
            <ul className="mt-2 space-y-1">
              {o.summaries.slice(1).map((s) => (
                <li key={s.id}>
                  <Link href={`/hijos/${id}/resumenes/${s.id}`} className="inline-flex min-h-10 items-center text-brand underline">
                    {formatMonth(s.month)}
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}
        <p className="text-center text-sm text-muted">{plural(o.behavior_month, "reporte", "reportes")} de conducta en los últimos 30 días. Si tiene dudas, escriba a la escuela.</p>
      </div>
    </>
  );
}
