import Link from "next/link";
import { BarList, Columns, Meter } from "@/components/charts";
import { HeatTable } from "@/components/heat-table";
import { Badge, Card, CardTitle, Kpi, cx } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { describeAlert, INDICATOR_LABEL } from "@/lib/alerts";
import { KIND_LABEL, NO_CLASS } from "@/lib/calendar/kinds";
import { schoolCalendar } from "@/lib/director-context";
import { firstName, formatDate, formatMoney, formatShortDate, plural } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { addDays, isWeekday, todayLocal } from "@/lib/time";

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
type Att = {
  groups: { group_id: string; group: string; students: number; records: number; absences: number; lates: number; rate: number | null; chronic: number }[];
  daily: { date: string; rate: number; absences: number }[];
  today: { student_id: string; name: string; group: string; status: "absent" | "late" | "excused" }[];
  chronic_students: { student_id: string; name: string; group: string; absences: number; days: number; pct: number }[];
};
type Beh = { total: number; recognitions: number; bullying_open: number; by_category: { key: string; label: string; count: number }[]; by_location: { key: string; count: number }[] };
type Grades = {
  by_group_subject: { group: string; subject: string; average: number | null; failing: number; captured: number; students: number }[];
  by_subject: { subject: string; average: number; failing: number; captured: number }[];
  students_failing: { student_id: string; name: string; group: string; subjects: string[]; count: number }[];
  capture_by_teacher: { teacher: string; expected: number; captured: number; pct: number | null }[];
};
type Staff = { teacher: string; teacher_id: string; groups: string | null; attendance_days: number; expected_days: number; weekly_cuts: number; incidents: number; recognitions: number; last_activity: string | null }[];
type Tuition = { expected: number; collected: number; overdue_amount: number; overdue_students: number; students: number; upcoming_amount: number; upcoming_count: number };

const STATUS = { absent: "Falta", late: "Retardo", excused: "Justificada" } as const;
const wd = new Intl.DateTimeFormat("es-MX", { weekday: "narrow", day: "numeric", timeZone: "UTC" });

export default async function DirectorHome() {
  const { session, membership } = await requireRole("director");
  const supabase = await createClient();
  const today = todayLocal();
  const sid = membership.schoolId;
  const { year, periods, period } = await schoolCalendar(supabase, sid, today);

  const [setupR, dashR, attR, behR, prevBehR, staffR, tuitionR, eventsR, alertsR, studentsR, linkedR, gradesNow] = await Promise.all([
    Promise.all([
      supabase.from("subjects").select("id", { count: "exact", head: true }).eq("school_id", sid),
      supabase.from("memberships").select("id", { count: "exact", head: true }).eq("school_id", sid).eq("role", "teacher"),
      supabase.from("schedule_blocks").select("id", { count: "exact", head: true }).eq("school_id", sid),
    ]),
    supabase.rpc("director_dashboard", { p_school: sid, p_today: today }),
    supabase.rpc("report_attendance", { p_school: sid, p_from: addDays(today, -29), p_to: today }),
    supabase.rpc("report_behavior", { p_school: sid, p_from: addDays(today, -6), p_to: today }),
    supabase.rpc("report_behavior", { p_school: sid, p_from: addDays(today, -13), p_to: addDays(today, -7) }),
    supabase.rpc("report_staff", { p_school: sid, p_from: addDays(today, -13), p_to: today }),
    supabase.rpc("tuition_report", { p_school: sid, p_today: today }),
    supabase.from("calendar_events").select("id, title, kind, starts_on, ends_on, start_time, groups(grade, name)").eq("school_id", sid).gte("ends_on", today).lte("starts_on", addDays(today, 21)).order("starts_on").limit(7),
    supabase.from("alerts").select("id, indicator, detail, student_id, students(first_name, last_name)").eq("status", "open").order("created_at").limit(40),
    supabase.from("students").select("id", { count: "exact", head: true }).eq("school_id", sid),
    supabase.from("student_guardians").select("student_id").eq("school_id", sid),
    period ? supabase.rpc("report_grades", { p_school: sid, p_period: period.id }) : Promise.resolve({ data: null }),
  ]);

  // Si el periodo actual apenas empieza y no tiene calificaciones, se muestra el anterior.
  let grades = gradesNow.data as unknown as Grades | null;
  let gradesPeriod = period;
  if (period && (!grades || grades.by_subject.length === 0)) {
    const prev = periods.filter((p) => p.sort < period.sort).at(-1);
    if (prev) {
      const { data } = await supabase.rpc("report_grades", { p_school: sid, p_period: prev.id });
      if (data) [grades, gradesPeriod] = [data as unknown as Grades, prev];
    }
  }

  const dash = dashR.data as unknown as Dashboard;
  const att = attR.data as unknown as Att;
  const beh = behR.data as unknown as Beh;
  const prevBeh = prevBehR.data as unknown as Beh;
  const staff = (staffR.data ?? []) as unknown as Staff;
  const tuition = tuitionR.data as unknown as Tuition | null;
  const totalStudents = studentsR.count ?? 0;
  const withFamily = new Set((linkedR.data ?? []).map((l) => l.student_id)).size;
  const familyPct = totalStudents ? Math.round((100 * withFamily) / totalStudents) : 0;

  const days = att.daily.filter((d) => isWeekday(d.date));
  const lastDay = days.at(-1);
  const avgRate = days.length ? days.reduce((t, d) => t + Number(d.rate), 0) / days.length : null;
  const avgAbs = days.length ? days.reduce((t, d) => t + d.absences, 0) / days.length : 0;
  const absentToday = att.today.filter((t) => t.status === "absent");
  const takenToday = lastDay?.date === today;
  const avgGrade = grades && grades.by_subject.length ? grades.by_subject.reduce((t, x) => t + Number(x.average) * x.captured, 0) / Math.max(1, grades.by_subject.reduce((t, x) => t + x.captured, 0)) : null;
  const capture = grades?.capture_by_teacher ?? [];
  const capturePct = capture.length ? Math.round((100 * capture.reduce((t, c) => t + c.captured, 0)) / Math.max(1, capture.reduce((t, c) => t + c.expected, 0))) : null;
  const collectedPct = tuition && tuition.expected > 0 ? Math.round((100 * tuition.collected) / tuition.expected) : null;
  const behDelta = prevBeh ? beh.total - prevBeh.total : null;
  const daysLeft = period ? Math.ceil((Date.parse(`${period.ends_on}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86400000) : null;

  const byStudent = new Map<string, { name: string; items: string[] }>();
  for (const a of alertsR.data ?? []) {
    const cur = byStudent.get(a.student_id) ?? { name: `${a.students?.first_name ?? ""} ${a.students?.last_name ?? ""}`.trim(), items: [] };
    cur.items.push(`${INDICATOR_LABEL[a.indicator]}: ${describeAlert(a.indicator, a.detail)}`);
    byStudent.set(a.student_id, cur);
  }
  const support = [...byStudent.entries()].sort((a, b) => b[1].items.length - a[1].items.length).slice(0, 6);
  const [subj, teach, sched] = setupR;
  const setup = [
    { done: Boolean(year), label: "Ciclo escolar y periodos", href: "/director/escuela/ciclo" },
    { done: (subj.count ?? 0) > 0, label: "Materias", href: "/director/escuela/ciclo" },
    { done: totalStudents > 0, label: "Alumnos y familias (Excel)", href: "/director/importar" },
    { done: (teach.count ?? 0) > 0, label: "Maestros", href: "/director/personal" },
    { done: (sched.count ?? 0) > 0, label: "Horarios", href: "/director/horarios" },
    { done: Boolean(tuition && tuition.students), label: "Estado de cuenta", href: "/director/colegiaturas" },
  ];
  const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/Mexico_City", hour: "numeric", hourCycle: "h23" }).format(new Date()));
  const greet = hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted first-letter:uppercase">{formatDate(today)}</p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {greet}, {firstName(session.fullName.replace(/\s*\(.*\)$/, "")) || "dirección"}
          </h1>
          <p className="text-muted">
            {year?.name && `Ciclo ${year.name}`}
            {period && ` · ${period.name}${daysLeft !== null && daysLeft >= 0 ? `, ${plural(daysLeft, "día", "días")} para cerrar` : ""}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link href="/director/reportes" className="inline-flex min-h-10 items-center rounded-xl bg-card px-3 font-medium ring-1 ring-line hover:ring-brand">
            Reportes
          </Link>
          <Link href={gradesPeriod ? `/api/reportes/concentrado?periodo=${gradesPeriod.id}` : "/director/reportes/calificaciones"} prefetch={false} className="inline-flex min-h-10 items-center rounded-xl bg-card px-3 font-medium ring-1 ring-line hover:ring-brand">
            Descargar concentrado
          </Link>
          <Link href="/calendario" className="inline-flex min-h-10 items-center rounded-xl bg-brand px-3 font-medium text-white">
            + Evento o aviso
          </Link>
        </div>
      </div>

      {setup.some((s) => !s.done) && (
        <Card className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 py-3">
          <span className="font-semibold">Para completar la configuración:</span>
          {setup
            .filter((s) => !s.done)
            .map((s) => (
              <Link key={s.label} href={s.href} className="min-h-10 content-center text-brand underline">
                {s.label}
              </Link>
            ))}
        </Card>
      )}

      {/* Indicadores */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi
          label={takenToday ? "Asistencia hoy" : "Asistencia (último día)"}
          value={lastDay ? `${Number(lastDay.rate).toFixed(1)}%` : "—"}
          delta={lastDay && avgRate !== null ? { text: `${Number(lastDay.rate) >= avgRate ? "▲" : "▼"} promedio 30 días ${avgRate.toFixed(1)}%`, good: Number(lastDay.rate) >= avgRate } : null}
          sub={takenToday ? `${absentToday.length} faltas hoy` : "Sin lista hoy todavía"}
          href="/director/reportes/asistencia"
        />
        <Kpi label="Ausentismo crónico" value={att.chronic_students.length} sub="alumnos con 10% o más de faltas" tone={att.chronic_students.length ? "care" : "good"} href="/director/reportes/asistencia" />
        <Kpi
          label={`Promedio ${gradesPeriod?.name ?? ""}`.trim()}
          value={avgGrade !== null ? avgGrade.toFixed(1) : "—"}
          sub={grades ? `${plural(grades.students_failing.length, "alumno", "alumnos")} con materias abajo de 6` : "Sin calificaciones"}
          href="/director/reportes/calificaciones"
        />
        <Kpi
          label="Incidencias esta semana"
          value={beh.total}
          delta={behDelta !== null ? { text: behDelta === 0 ? "igual que la semana pasada" : `${behDelta > 0 ? "▲" : "▼"} ${Math.abs(behDelta)} vs. semana pasada`, good: behDelta <= 0 } : null}
          sub={`${beh.recognitions} reconocimientos${beh.bullying_open ? ` · ${beh.bullying_open} posible acoso` : ""}`}
          tone={beh.bullying_open ? "care" : undefined}
          href="/director/reportes/convivencia"
        />
        <Kpi
          label="Cobranza"
          value={collectedPct !== null ? `${collectedPct}%` : "—"}
          sub={tuition && tuition.students ? `${formatMoney(tuition.overdue_amount)} vencido · ${tuition.overdue_students} familias` : "Sin estado de cuenta"}
          tone={tuition && tuition.overdue_students > 0 ? "care" : undefined}
          href="/director/colegiaturas"
        />
        <Kpi label="Familias en la app" value={`${familyPct}%`} sub={dash.guardians_pending ? `${dash.guardians_pending} invitaciones sin aceptar` : "Meta del piloto: 70%"} tone={familyPct >= 70 ? "good" : "care"} href="/director/familias" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-12">
        {/* Asistencia */}
        <Card className="lg:col-span-8">
          <CardTitle href="/director/reportes/asistencia" sub={`Promedio: ${avgAbs.toFixed(1)} faltas por día. En ámbar, los días con más faltas de lo normal.`}>
            Faltas por día · últimos 30 días
          </CardTitle>
          <Columns
            label="Faltas por día"
            height={220}
            target={{ y: Math.round(avgAbs * 10) / 10, label: `promedio ${avgAbs.toFixed(1)}` }}
            items={days.map((d) => ({
              label: wd.format(new Date(`${d.date}T12:00:00Z`)).replace(" ", " "),
              value: d.absences,
              hint: `${formatShortDate(d.date)} · asistencia ${Number(d.rate).toFixed(1)}%`,
              attention: avgAbs > 0 && d.absences >= Math.max(3, avgAbs * 1.5),
            }))}
          />
        </Card>
        <Card className="lg:col-span-4">
          <CardTitle href="/director/reportes/asistencia" sub={takenToday ? `${att.today.length} con falta, retardo o justificación` : "Aún no hay listas de hoy"}>
            Hoy
          </CardTitle>
          {att.today.length ? (
            <ul className="max-h-64 divide-y divide-line overflow-y-auto">
              {att.today.slice(0, 30).map((t) => (
                <li key={t.student_id} className="flex items-center justify-between gap-2 py-1.5 text-sm">
                  <Link href={`/alumnos/${t.student_id}`} className="min-w-0 truncate hover:underline">
                    {t.name} <span className="text-muted">· {t.group}</span>
                  </Link>
                  <Badge tone={t.status === "absent" ? "care" : "muted"}>{STATUS[t.status]}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted">{takenToday ? "Todos presentes." : "Cuando los maestros pasen lista aparecerá aquí."}</p>
          )}
          {dash.teachers_behind.length > 0 && (
            <div className="mt-3 rounded-xl bg-care-soft p-3 text-sm text-[#6b450d]">
              <p className="font-semibold">Grupos sin lista en 2 días</p>
              <p>{dash.teachers_behind.map((t) => `${t.group} (${firstName(t.teacher)})`).join(", ")}</p>
            </div>
          )}
        </Card>

        {/* Por grupo */}
        <Card className="lg:col-span-4">
          <CardTitle href="/director/reportes/asistencia" sub="Últimos 30 días. Meta: 90% o más.">
            Asistencia por grupo
          </CardTitle>
          <BarList unit="%" max={100} items={att.groups.filter((g) => g.rate !== null).map((g) => ({ label: `${g.group}${g.chronic ? ` · ${g.chronic} crónicos` : ""}`, value: Number(g.rate), attention: Number(g.rate) < 90 }))} />
        </Card>
        <Card className="lg:col-span-5">
          <CardTitle href="/director/reportes/calificaciones" linkText="Ver concentrado" sub={gradesPeriod?.name}>
            Promedio por grupo y materia
          </CardTitle>
          <HeatTable cells={(grades?.by_group_subject ?? []).map((c) => ({ row: c.group, col: c.subject, value: c.average === null ? null : Number(c.average), note: c.failing ? String(c.failing) : undefined }))} />
        </Card>
        <Card className="lg:col-span-3">
          <CardTitle href="/director/reportes/convivencia" sub="Esta semana, por tipo">
            Convivencia
          </CardTitle>
          {beh.bullying_open > 0 && (
            <Link href="/director/casos" className="mb-3 block rounded-xl bg-care-soft p-3 text-sm font-medium text-[#6b450d]">
              {plural(beh.bullying_open, "caso", "casos")} de posible acoso en seguimiento →
            </Link>
          )}
          <BarList empty="Sin incidencias esta semana." items={beh.by_category.slice(0, 6).map((c) => ({ label: c.label, value: c.count }))} />
          <p className="mt-3 text-sm text-muted">
            Reconocimientos: <strong className="num text-ink">{beh.recognitions}</strong> · por cada reporte: <strong className="num text-ink">{beh.total ? (beh.recognitions / beh.total).toFixed(1) : "—"}</strong> (meta 4)
          </p>
        </Card>

        {/* Personal */}
        <Card className="lg:col-span-7">
          <CardTitle href="/director/reportes/maestros" sub="Últimas 2 semanas. La captura a tiempo es lo que hace funcionar los avisos a familias.">
            Maestros
          </CardTitle>
          <div className="-mx-2 overflow-x-auto px-2">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="text-left text-xs text-muted">
                <tr>
                  <th className="py-1 font-medium">Maestro</th>
                  <th className="py-1 font-medium">Lista</th>
                  <th className="py-1 font-medium">Cortes</th>
                  <th className="py-1 font-medium">Calif. {gradesPeriod?.name}</th>
                  <th className="py-1 font-medium">Reconoc. / reportes</th>
                  <th className="py-1 font-medium">Último uso</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {staff.map((t) => {
                  const cap = capture.find((c) => c.teacher === t.teacher);
                  const listPct = t.expected_days ? Math.round((100 * t.attendance_days) / t.expected_days) : null;
                  return (
                    <tr key={t.teacher_id}>
                      <td className="py-2">
                        <span className="font-medium">{t.teacher}</span>
                        <span className="block text-xs text-muted">{t.groups}</span>
                      </td>
                      <td className={cx("num py-2", listPct !== null && listPct < 80 && "text-[#7a4f0f]")}>{listPct === null ? "—" : `${listPct}%`}</td>
                      <td className="num py-2">{t.weekly_cuts}</td>
                      <td className={cx("num py-2", cap?.pct !== null && cap?.pct !== undefined && cap.pct < 100 && "text-[#7a4f0f]")}>{cap?.pct === null || cap?.pct === undefined ? "—" : `${cap.pct}%`}</td>
                      <td className="num py-2">
                        {t.recognitions} / {t.incidents}
                      </td>
                      <td className="py-2 text-muted">{t.last_activity ? formatShortDate(t.last_activity.slice(0, 10)) : "nunca"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {capturePct !== null && (
            <div className="mt-3">
              <Meter label={`Calificaciones capturadas · ${gradesPeriod?.name}`} value={capturePct} goal={100} detail={daysLeft !== null && daysLeft >= 0 ? `Cierre en ${plural(daysLeft, "día", "días")}` : undefined} />
            </div>
          )}
        </Card>

        {/* Apoyo */}
        <Card className="lg:col-span-5">
          <CardTitle href="/director/casos" linkText="Casos" sub={`${plural(dash.students_needing_support, "alumno con señales", "alumnos con señales")} · ${plural(dash.open_cases, "caso abierto", "casos abiertos")}${dash.overdue_actions ? ` · ${dash.overdue_actions} acciones vencidas` : ""}`}>
            Alumnos que podrían necesitar apoyo
          </CardTitle>
          {support.length ? (
            <ul className="divide-y divide-line">
              {support.map(([id, s]) => (
                <li key={id} className="py-2">
                  <Link href={`/alumnos/${id}`} className="font-medium text-brand hover:underline">
                    {s.name}
                  </Link>
                  <p className="text-sm text-muted">{s.items.slice(0, 2).join(" · ")}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted">Nadie con señales abiertas.</p>
          )}
          {att.chronic_students.length > 0 && (
            <p className="mt-3 text-sm text-muted">
              Ausentismo crónico: {att.chronic_students.slice(0, 4).map((c) => `${c.name} (${c.pct}%)`).join(", ")}
              {att.chronic_students.length > 4 && "…"}
            </p>
          )}
        </Card>

        {/* Agenda, dinero y familias */}
        <Card className="lg:col-span-4">
          <CardTitle href="/calendario" linkText="Calendario">
            Próximas 3 semanas
          </CardTitle>
          {eventsR.data?.length ? (
            <ul className="space-y-2">
              {eventsR.data.map((e) => (
                <li key={e.id} className="flex gap-3">
                  <span className={cx("num w-12 shrink-0 rounded-lg py-1 text-center text-sm font-semibold", NO_CLASS.includes(e.kind) ? "bg-care-soft" : "bg-brand-soft")}>{formatShortDate(e.starts_on).replace(/\.$/, "")}</span>
                  <span className="text-sm">
                    {e.title}
                    <span className="block text-xs text-muted">
                      {KIND_LABEL[e.kind]}
                      {e.groups && ` · ${e.groups.grade}°${e.groups.name}`}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted">Nada agendado.</p>
          )}
        </Card>
        <Card className="lg:col-span-4">
          <CardTitle href="/director/colegiaturas" linkText="Colegiaturas">
            Cobranza del ciclo
          </CardTitle>
          {tuition && tuition.students ? (
            <div className="space-y-3">
              <Meter label="Cobrado de lo ya vencido" value={collectedPct ?? 0} goal={95} detail={`${formatMoney(tuition.collected)} de ${formatMoney(tuition.expected)}`} />
              <p className="text-sm">
                Vencido: <strong className="num">{formatMoney(tuition.overdue_amount)}</strong> en {plural(tuition.overdue_students, "familia", "familias")}
              </p>
              <p className="text-sm text-muted">
                Próximos 15 días: {formatMoney(tuition.upcoming_amount)} ({tuition.upcoming_count} pagos). Las familias reciben recordatorio 3 días antes.
              </p>
            </div>
          ) : (
            <p className="text-muted">Suba el Excel de pagos para ver la cobranza y avisar a las familias.</p>
          )}
        </Card>
        <Card className="lg:col-span-4">
          <CardTitle href="/director/familias" linkText="Familias">
            Familias y comunicación
          </CardTitle>
          <div className="space-y-3">
            <Meter label="Alumnos con familia en la app" value={familyPct} goal={70} detail={`${withFamily} de ${totalStudents} alumnos`} />
            <ul className="space-y-1 text-sm">
              <li>
                <strong className="num">{dash.guardians_pending}</strong> invitaciones sin aceptar
              </li>
              <li>
                <strong className="num">{dash.summaries_pending}</strong> resúmenes mensuales sin aprobar
              </li>
              <li>
                <strong className="num">{dash.open_alerts}</strong> señales abiertas en total
              </li>
            </ul>
          </div>
        </Card>
      </div>
    </>
  );
}
