import Link from "next/link";
import { notFound } from "next/navigation";
import { Sparkline } from "@/components/charts";
import { Badge, Button, Card, PageHeader, Stat, Trend } from "@/components/ui";
import { WeekStrip } from "@/components/week-strip";
import { requireRole } from "@/lib/auth";
import { RECOGNITION } from "@/lib/convivencia";
import { formatDate, formatMonth, formatScore, formatShortDate, plural } from "@/lib/format";
import type { Overview } from "@/lib/overview";
import { createClient } from "@/lib/supabase/server";
import { WEEKDAYS } from "@/lib/calendar/kinds";
import { addDays, isWeekday, isoWeekday, localHour, monthStart, todayLocal } from "@/lib/time";
import { markGoal } from "./actions";
import { GoalForm } from "./goal-form";

const SEVERITY = { minor: "Leve", moderate: "Moderada", serious: "Grave" } as const;

export default async function ChildPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireRole("guardian");
  const supabase = await createClient();
  const today = todayLocal();
  const { data, error } = await supabase.rpc("student_overview", { p_student: id, p_today: today });
  if (error || !data) notFound();
  const o = data as unknown as Overview;
  const name = o.student.first_name;
  const a = o.attendance;
  const thisMonth = monthStart(today);
  const goalThisMonth = o.goal && o.goal.month === thisMonth ? o.goal : null;
  const lastGoal = o.goal && o.goal.month < thisMonth ? o.goal : null;
  const latest = o.summaries[0];
  const weekPending = o.week.pending.filter((p) => p.count > 0);
  const weekRecs = o.recognitions.filter((r) => r.date >= o.week.start);
  const weekReports = o.behavior.filter((b) => b.date >= o.week.start && b.involvement === "involucrado");
  const history = new Map(o.grade_history.map((h) => [h.subject, h.points]));
  // Clases de hoy (o del siguiente día de escuela si ya salieron) y fechas cercanas del grupo.
  let classDay = today;
  if (!isWeekday(classDay) || localHour() >= 14) do classDay = addDays(classDay, 1); while (!isWeekday(classDay));
  const dayLabel = classDay === today ? "Hoy le toca" : classDay === addDays(today, 1) ? "Mañana le toca" : `El ${WEEKDAYS[isoWeekday(classDay)].toLowerCase()} le toca`;
  const [blocksRes, eventsRes] = await Promise.all([
    o.group
      ? supabase.from("schedule_blocks").select("label, subjects(name)").eq("group_id", o.group.id).eq("weekday", isoWeekday(classDay)).order("starts_at")
      : Promise.resolve({ data: [] as { label: string | null; subjects: { name: string } | null }[] }),
    supabase.from("calendar_events").select("id, title, starts_on, group_id").gte("ends_on", today).lte("starts_on", addDays(today, 14)).order("starts_on").limit(8),
  ]);
  const classes = [...new Set((blocksRes.data ?? []).filter((b) => b.subjects).map((b) => b.subjects!.name))];
  const upcoming = (eventsRes.data ?? []).filter((e) => !e.group_id || e.group_id === o.group?.id).slice(0, 4);
  const icon = (cat: string) => RECOGNITION.find((r) => r.key === cat)?.icon ?? "⭐";

  return (
    <>
      <PageHeader title={name} subtitle={[o.group?.label, o.period?.name].filter(Boolean).join(" · ")} back="/hijos" />

      <div className="space-y-4">
        {/* La semana: lo primero que un papá quiere saber */}
        <Card>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-lg font-semibold">Esta semana</h2>
            <span className="text-sm text-muted">desde el {formatShortDate(o.week.start)}</span>
          </div>
          <WeekStrip days={o.week.days} today={today} />
          <ul className="mt-4 space-y-2">
            <li className="flex items-start gap-2">
              <span aria-hidden>{weekPending.length ? "📝" : "✅"}</span>
              <span>
                {o.week.pending.length === 0
                  ? "La maestra aún no hace el corte de pendientes de esta semana."
                  : weekPending.length
                    ? `Trabajos pendientes: ${weekPending.map((p) => `${p.count} de ${p.subject}`).join(", ")}.`
                    : "Entregó todos sus trabajos."}
              </span>
            </li>
            {weekRecs.length > 0 && (
              <li className="flex items-start gap-2">
                <span aria-hidden>⭐</span>
                <span>Reconocido por {[...new Set(weekRecs.map((r) => r.label.toLowerCase()))].join(", ")}.</span>
              </li>
            )}
            {weekReports.length > 0 && (
              <li className="flex items-start gap-2">
                <span aria-hidden>💬</span>
                <a href="#conducta" className="underline">
                  {plural(weekReports.length, "reporte de conducta", "reportes de conducta")} esta semana
                </a>
              </li>
            )}
          </ul>
          {weekPending.length > 0 && (
            <p className="mt-3 rounded-xl bg-brand-soft p-3 text-sm text-brand-dark">
              Para casa: pregúntele qué parte se le complicó y acuerden una hora fija para hacer tarea. No hace falta hacerla por {name}.
            </p>
          )}
        </Card>

        {/* Lo que sigue: clases del día y fechas cercanas del grupo */}
        <Card className="space-y-3">
          <div>
            <div className="flex items-baseline justify-between">
              <h2 className="font-semibold">{dayLabel}</h2>
              <Link href="/horario" className="min-h-10 content-center text-sm text-brand underline">
                Horario completo
              </Link>
            </div>
            {classes.length ? (
              <p className="text-muted">{classes.join(" · ")}</p>
            ) : (
              <p className="text-muted">La escuela aún no ha cargado el horario.</p>
            )}
          </div>
          <div>
            <div className="flex items-baseline justify-between">
              <h2 className="font-semibold">Próximas fechas</h2>
              <Link href="/calendario" className="min-h-10 content-center text-sm text-brand underline">
                Calendario
              </Link>
            </div>
            {upcoming.length ? (
              <ul className="space-y-1">
                {upcoming.map((e) => (
                  <li key={e.id}>
                    <span className="text-muted">{formatShortDate(e.starts_on)}:</span> {e.title}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted">Nada en las próximas dos semanas.</p>
            )}
          </div>
        </Card>

        {latest && (
          <Link href={`/hijos/${id}/resumenes/${latest.id}`} className="block">
            <Card className="bg-brand text-white ring-brand">
              <p className="text-sm text-white/80">Resumen de {formatMonth(latest.month)}</p>
              <p className="mt-1 text-lg font-semibold">Lo que la maestra quiere que sepa este mes →</p>
            </Card>
          </Link>
        )}

        {o.recognitions.length > 0 && (
          <Card>
            <h2 className="font-semibold">Reconocimientos</h2>
            <ul className="mt-2 space-y-2">
              {o.recognitions.slice(0, 6).map((r, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span aria-hidden className="text-lg">
                    {icon(r.category)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p>
                      <strong>{r.label}</strong> <span className="text-sm text-muted">· {formatShortDate(r.date)}</span>
                    </p>
                    {r.note && <p className="text-sm text-ink/80">{r.note}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </Card>
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
                {a.absences === 0 ? `${name} no ha faltado en este periodo.` : `Última falta: ${formatDate(a.last_absence!)}. Cada día de clase cuenta; si hay un motivo, avise a la escuela.`}
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
              {o.grades.map((g) => {
                const pts = history.get(g.subject) ?? [];
                return (
                  <li key={g.subject} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="font-medium">{g.subject}</p>
                      <Trend delta={g.delta} />
                    </div>
                    <div className="flex items-center gap-3">
                      <Sparkline values={pts.map((p) => Number(p.score))} labels={pts.map((p) => p.period)} />
                      <span className="num w-10 text-right text-2xl font-bold">{formatScore(g.score)}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-2 text-muted">Las calificaciones aparecen cuando la maestra o el maestro las capture.</p>
          )}
          <p className="mt-2 text-sm text-muted">Se compara a {name} con su periodo anterior, nunca con otros alumnos.</p>
        </Card>

        <Card id="conducta">
          <h2 className="font-semibold">Conducta (últimos 60 días)</h2>
          {o.behavior.length ? (
            <ul className="mt-2 divide-y divide-line">
              {o.behavior.map((b) => (
                <li key={b.id} className="py-3">
                  <p className="flex items-center gap-2 text-sm">
                    <Badge tone={b.involvement === "afectado" ? "neutral" : b.severity === "minor" ? "muted" : "care"}>{b.involvement === "afectado" ? "Aviso" : SEVERITY[b.severity]}</Badge>
                    <span className="text-muted">{formatDate(b.date)}</span>
                  </p>
                  <p className="mt-1">{b.text}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-muted">Sin reportes. Siga reconociendo en casa lo que hace bien.</p>
          )}
          {o.behavior.some((b) => b.involvement === "involucrado") && (
            <p className="mt-2 text-sm text-muted">Sugerencia: platiquen qué pasó y qué podría hacer distinto la próxima vez, sin castigos en caliente. Si quiere hablar con la escuela, pida una cita en dirección.</p>
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
              <GoalForm studentId={id} firstName={name} />
            </div>
          )}
        </Card>

        {o.pending_work.length > 0 && (
          <Card>
            <details>
              <summary className="cursor-pointer font-semibold">Detalle de actividades sin entregar ({o.pending_work.length})</summary>
              <ul className="mt-2 space-y-2">
                {o.pending_work.map((w, i) => (
                  <li key={i} className="flex items-start justify-between gap-3 text-sm">
                    <span>
                      {w.title} <span className="text-muted">· {w.subject}</span>
                    </span>
                    <span className="shrink-0 text-muted">{formatShortDate(w.due_on)}</span>
                  </li>
                ))}
              </ul>
            </details>
          </Card>
        )}

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
      </div>
    </>
  );
}
