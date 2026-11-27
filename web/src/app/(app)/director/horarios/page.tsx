import Link from "next/link";
import { Empty, PageHeader, cx } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ScheduleEditor } from "./editor";

export const metadata = { title: "Horarios" };

export default async function SchedulesPage({ searchParams }: { searchParams: Promise<{ grupo?: string }> }) {
  const { session } = await requireRole("director");
  const supabase = await createClient();
  const schoolId = session.active!.schoolId;
  const [{ data: groups }, { data: subjects }] = await Promise.all([
    supabase.from("groups").select("id, grade, name, school_years!inner(is_current)").eq("school_id", schoolId).eq("school_years.is_current", true).order("grade").order("name"),
    supabase.from("subjects").select("id, name").eq("school_id", schoolId).order("name"),
  ]);
  const list = (groups ?? []).map((g) => ({ id: g.id, label: `${g.grade}°${g.name}` }));
  const { grupo } = await searchParams;
  const current = list.find((g) => g.id === grupo) ?? list[0];
  const { data: blocks } = current
    ? await supabase.from("schedule_blocks").select("weekday, starts_at, ends_at, subject_id, label, room").eq("group_id", current.id)
    : { data: [] };
  const { data: filled } = await supabase.from("schedule_blocks").select("group_id").eq("school_id", schoolId);
  const withSchedule = new Set((filled ?? []).map((b) => b.group_id));

  return (
    <>
      <PageHeader title="Horarios" subtitle="Familias y maestros ven el horario de su grupo; los maestros lo reciben en su calendario." back="/director/escuela" />
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
          <ScheduleEditor key={current.id} groupId={current.id} groupLabel={current.label} subjects={subjects ?? []} initial={blocks ?? []} />
        </>
      )}
    </>
  );
}
