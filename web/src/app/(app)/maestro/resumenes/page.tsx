import Link from "next/link";
import { Badge, Card, Empty, PageHeader, cx } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { formatMonth } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { teacherGroups } from "@/lib/teacher";

export const metadata = { title: "Resúmenes del mes" };

const STATUS = {
  draft: { label: "Por revisar", tone: "neutral" },
  needs_manual: { label: "Redactar", tone: "care" },
  approved: { label: "Enviado", tone: "good" },
} as const;

export default async function SummariesPage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const { mes } = await searchParams;
  const { session, membership } = await requireRole("teacher", "director");
  const supabase = await createClient();

  const { data: months } = await supabase.from("monthly_summaries").select("month").order("month", { ascending: false }).limit(500);
  const monthList = [...new Set((months ?? []).map((m) => m.month))];
  const month = monthList.find((m) => m === mes) ?? monthList[0];
  if (!month) {
    return (
      <>
        <PageHeader title="Resúmenes del mes" />
        <Empty title="Todavía no hay resúmenes">El día 1 de cada mes se preparan los borradores del mes anterior para que usted los revise.</Empty>
      </>
    );
  }

  // Cada maestra titular revisa los de su grupo; si no es titular de ninguno, ve los de todos sus alumnos.
  let groupIds: string[] | null = null;
  if (membership.role === "teacher") {
    const groups = await teacherGroups(supabase, session.userId);
    const homeroom = groups.filter((g) => g.isHomeroom).map((g) => g.id);
    groupIds = homeroom.length ? homeroom : groups.map((g) => g.id);
  }
  let q = supabase
    .from("monthly_summaries")
    .select("id, status, students!inner(first_name, last_name, enrollments!inner(group_id, groups(grade, name)))")
    .eq("month", month);
  if (groupIds) q = q.in("students.enrollments.group_id", groupIds.length ? groupIds : ["00000000-0000-0000-0000-000000000000"]);
  const { data: rows } = await q;
  const list = (rows ?? []).sort((a, b) => {
    const order = { needs_manual: 0, draft: 1, approved: 2 };
    return order[a.status] - order[b.status] || (a.students?.last_name ?? "").localeCompare(b.students?.last_name ?? "", "es");
  });
  const pending = list.filter((r) => r.status !== "approved").length;

  return (
    <>
      <PageHeader
        title={`Resúmenes de ${formatMonth(month)}`}
        subtitle={pending ? `${pending} por revisar. Nada llega a las familias sin su aprobación.` : "Todos enviados. Gracias."}
      />
      {monthList.length > 1 && (
        <nav className="mb-4 flex gap-2 overflow-x-auto" aria-label="Mes">
          {monthList.slice(0, 6).map((m) => (
            <Link key={m} href={`?mes=${m}`} className={cx("min-h-10 shrink-0 content-center rounded-full px-4 text-sm", m === month ? "bg-brand text-white" : "bg-card ring-1 ring-line")}>
              {formatMonth(m)}
            </Link>
          ))}
        </nav>
      )}
      <Card className="p-0">
        <ul className="divide-y divide-line">
          {list.map((r) => {
            const g = r.students?.enrollments?.[0]?.groups;
            return (
              <li key={r.id}>
                <Link href={`/maestro/resumenes/${r.id}`} className="flex min-h-14 items-center justify-between gap-3 px-4">
                  <span>
                    {r.students?.first_name} {r.students?.last_name} {g && <span className="text-sm text-muted">· {`${g.grade}°${g.name}`}</span>}
                  </span>
                  <Badge tone={STATUS[r.status].tone}>{STATUS[r.status].label}</Badge>
                </Link>
              </li>
            );
          })}
        </ul>
      </Card>
    </>
  );
}
