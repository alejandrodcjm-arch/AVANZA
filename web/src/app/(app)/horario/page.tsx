import { redirect } from "next/navigation";
import { PrintButton } from "@/components/print-button";
import { WeekTable, type WeekBlock } from "@/components/week-table";
import { ButtonLink, Card, Empty, PageHeader } from "@/components/ui";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { teacherGroups } from "@/lib/teacher";
import { isoWeekday, todayLocal } from "@/lib/time";

export const metadata = { title: "Horario" };

type Row = { id: string; group_id: string; weekday: number; starts_at: string; ends_at: string; label: string | null; room: string | null; subject_id: string | null; subjects: { name: string } | null };

export default async function SchedulePage() {
  const session = await getSession();
  if (!session?.active) redirect("/entrar");
  const role = session.active.role;
  if (role === "director") redirect("/director/horarios");
  const supabase = await createClient();
  const todayWd = isoWeekday(todayLocal());
  const cols = "id, group_id, weekday, starts_at, ends_at, label, room, subject_id, subjects(name)";

  if (role === "teacher") {
    const groups = await teacherGroups(supabase, session.userId);
    const mine = new Set(groups.flatMap((g) => g.subjects.map((s) => `${g.id}:${s.id}`)));
    const label = new Map(groups.map((g) => [g.id, g.label]));
    const { data } = groups.length ? await supabase.from("schedule_blocks").select(cols).in("group_id", groups.map((g) => g.id)) : { data: [] };
    const blocks: WeekBlock[] = ((data ?? []) as Row[])
      .filter((b) => b.subject_id && mine.has(`${b.group_id}:${b.subject_id}`))
      .map((b) => ({ id: b.id, weekday: b.weekday, starts_at: b.starts_at, ends_at: b.ends_at, title: b.subjects?.name ?? "", sub: [label.get(b.group_id), b.room].filter(Boolean).join(" · "), isSubject: true, colorKey: b.subject_id }));
    return (
      <>
        <PageHeader title="Mi horario" subtitle="Sus clases de la semana en todos sus grupos." back="/maestro" action={blocks.length ? <PrintButton label="Imprimir" /> : undefined} />
        {blocks.length ? (
          <Card>
            <WeekTable blocks={blocks} todayWeekday={todayWd} />
          </Card>
        ) : (
          <Empty title="Dirección aún no carga los horarios">Cuando los suba, aquí verá sus clases y podrá tenerlas en su calendario.</Empty>
        )}
        <div className="mt-4">
          <ButtonLink href="/calendario#sincronizar" variant="secondary">
            Tener mis clases en Google Calendar
          </ButtonLink>
        </div>
      </>
    );
  }

  // Familia: el horario del grupo de cada hijo.
  const { data: kids } = await supabase
    .from("student_guardians")
    .select("students!inner(id, first_name, enrollments!inner(group_id, groups!inner(grade, name, school_years!inner(is_current))))")
    .eq("guardian_id", session.userId)
    .eq("students.enrollments.groups.school_years.is_current", true);
  const children = (kids ?? []).flatMap((k) =>
    k.students ? k.students.enrollments.map((e) => ({ id: k.students!.id, name: k.students!.first_name, groupId: e.group_id, group: `${e.groups!.grade}°${e.groups!.name}` })) : [],
  );
  const groupIds = [...new Set(children.map((c) => c.groupId))];
  const { data } = groupIds.length ? await supabase.from("schedule_blocks").select(cols).in("group_id", groupIds) : { data: [] };
  const rows = (data ?? []) as Row[];

  return (
    <>
      <PageHeader title="Horario" subtitle="La semana completa de su hijo o hija. Útil para preparar la mochila la noche anterior." action={children.length ? <PrintButton label="Imprimir" /> : undefined} />
      {children.length === 0 && <Empty title="Aún no hay alumnos ligados a su cuenta" />}
      <div className="space-y-4">
        {children.map((c) => {
          const blocks: WeekBlock[] = rows
            .filter((b) => b.group_id === c.groupId)
            .map((b) => ({ id: b.id, weekday: b.weekday, starts_at: b.starts_at, ends_at: b.ends_at, title: b.subjects?.name ?? b.label ?? "", sub: b.room, isSubject: Boolean(b.subject_id), colorKey: b.subject_id }));
          return (
            <Card key={c.id} className="print-avoid print:shadow-none print:ring-0">
              <h2 className="mb-3 text-lg font-semibold">
                {c.name} <span className="font-normal text-muted">· {c.group}</span>
              </h2>
              {blocks.length ? <WeekTable blocks={blocks} todayWeekday={todayWd} /> : <p className="text-muted">La escuela aún no ha cargado el horario de este grupo.</p>}
            </Card>
          );
        })}
      </div>
    </>
  );
}
