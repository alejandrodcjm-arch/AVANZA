import Link from "next/link";
import { PrintButton } from "@/components/print-button";
import { ButtonLink, Card, Empty, PageHeader, cx } from "@/components/ui";
import { WeekTable } from "@/components/week-table";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isoWeekday, todayLocal } from "@/lib/time";
import { ScheduleEditor } from "./editor";

export const metadata = { title: "Horarios" };

export default async function SchedulesPage({ searchParams }: { searchParams: Promise<{ grupo?: string; editar?: string; todos?: string }> }) {
  const { session } = await requireRole("director");
  const supabase = await createClient();
  const schoolId = session.active!.schoolId;
  const sp = await searchParams;
  const [{ data: groups }, { data: subjects }, { data: all }] = await Promise.all([
    supabase.from("groups").select("id, grade, name, school_years!inner(is_current)").eq("school_id", schoolId).eq("school_years.is_current", true).order("grade").order("name"),
    supabase.from("subjects").select("id, name").eq("school_id", schoolId).order("name"),
    supabase.from("schedule_blocks").select("id, group_id, weekday, starts_at, ends_at, subject_id, label, room, subjects(name)").eq("school_id", schoolId),
  ]);
  const list = (groups ?? []).map((g) => ({ id: g.id, label: `${g.grade}°${g.name}` }));
  const blocks = all ?? [];
  const withSchedule = new Set(blocks.map((b) => b.group_id));
  const view = (gid: string) =>
    blocks
      .filter((b) => b.group_id === gid)
      .map((b) => ({ id: b.id, weekday: b.weekday, starts_at: b.starts_at, ends_at: b.ends_at, title: b.subjects?.name ?? b.label ?? "", sub: b.room, isSubject: Boolean(b.subject_id), colorKey: b.subject_id }));
  const todayWd = isoWeekday(todayLocal());

  if (sp.todos) {
    return (
      <>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <PageHeader title="Horarios de todos los grupos" subtitle="Una hoja horizontal por grupo." back="/director/horarios" />
          <PrintButton />
        </div>
        <div className="space-y-6">
          {list
            .filter((g) => withSchedule.has(g.id))
            .map((g) => (
              <Card key={g.id} className="print-break print-avoid print:shadow-none print:ring-0">
                <WeekTable blocks={view(g.id)} caption={`Horario ${g.label} · ${session.active!.schoolName}`} />
              </Card>
            ))}
        </div>
      </>
    );
  }

  const current = list.find((g) => g.id === sp.grupo) ?? list[0];
  const currentBlocks = current ? view(current.id) : [];
  const editing = Boolean(sp.editar) || (current && !currentBlocks.length);

  return (
    <>
      <PageHeader
        title="Horarios"
        subtitle="Familias y maestros ven la semana completa de su grupo; los maestros además la reciben en su calendario."
        back="/director/escuela"
        action={withSchedule.size > 0 ? <ButtonLink href="/director/horarios?todos=1" variant="secondary" className="whitespace-nowrap">Imprimir todos</ButtonLink> : undefined}
      />
      {!current ? (
        <Empty title="Primero cree los grupos">En Escuela › Grupos y maestros.</Empty>
      ) : (
        <>
          <nav aria-label="Grupo" className="-mx-4 mb-4 overflow-x-auto px-4">
            <ul className="flex min-w-max gap-1.5">
              {list.map((g) => (
                <li key={g.id}>
                  <Link
                    href={`/director/horarios?grupo=${g.id}`}
                    aria-current={g.id === current.id ? "page" : undefined}
                    className={cx("inline-flex min-h-10 items-center gap-1.5 rounded-full px-4 text-sm ring-1", g.id === current.id ? "bg-brand text-white ring-brand" : "bg-card ring-line")}
                  >
                    {g.label}
                    {!withSchedule.has(g.id) && <span className="text-xs opacity-75">· sin horario</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          {editing ? (
            <ScheduleEditor key={current.id} groupId={current.id} groupLabel={current.label} subjects={subjects ?? []} initial={blocks.filter((b) => b.group_id === current.id)} />
          ) : (
            <Card>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">Semana de {current.label}</h2>
                <div className="flex gap-2">
                  <ButtonLink href={`/director/horarios?grupo=${current.id}&editar=1`}>Editar</ButtonLink>
                </div>
              </div>
              <WeekTable blocks={currentBlocks} todayWeekday={todayWd} />
            </Card>
          )}
        </>
      )}
    </>
  );
}
