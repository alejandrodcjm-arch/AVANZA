import { Card, PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Bitácora" };

const ACTION: Record<string, string> = { view: "consultó", insert: "creó", update: "cambió", delete: "borró" };
const ENTITY: Record<string, string> = {
  students: "alumno", attendance: "asistencia", grades: "calificación", behavior_reports: "reporte de conducta",
  sensitive_notes: "nota confidencial", monthly_summaries: "resumen", cases: "caso", student_guardians: "vínculo familiar",
};

export default async function AuditPage() {
  const { membership } = await requireRole("director");
  const supabase = await createClient();
  const { data } = await supabase.from("audit_log").select("id, actor_id, action, entity, entity_id, metadata, created_at").eq("school_id", membership.schoolId).order("created_at", { ascending: false }).limit(150);
  const actorIds = [...new Set((data ?? []).map((d) => d.actor_id).filter(Boolean))] as string[];
  const studentIds = [...new Set((data ?? []).map((d) => (d.metadata as { student_id?: string })?.student_id ?? (d.entity === "students" ? d.entity_id : null)).filter(Boolean))] as string[];
  const [{ data: people }, { data: students }] = await Promise.all([
    supabase.from("profiles").select("id, full_name").in("id", actorIds.length ? actorIds : ["00000000-0000-0000-0000-000000000000"]),
    supabase.from("students").select("id, first_name, last_name").in("id", studentIds.length ? studentIds : ["00000000-0000-0000-0000-000000000000"]),
  ]);
  const who = new Map((people ?? []).map((p) => [p.id, p.full_name]));
  const stu = new Map((students ?? []).map((s) => [s.id, `${s.first_name} ${s.last_name}`]));

  return (
    <>
      <PageHeader title="Bitácora" subtitle="Últimos 150 movimientos. No guarda el contenido de notas confidenciales, solo que existieron." back="/director/escuela" />
      <Card className="p-0">
        <ul className="divide-y divide-line text-sm">
          {(data ?? []).map((d) => {
            const sid = (d.metadata as { student_id?: string })?.student_id ?? (d.entity === "students" ? d.entity_id : null);
            return (
              <li key={d.id} className="px-4 py-2.5">
                <span className="font-medium">{(d.actor_id && who.get(d.actor_id)) || "Sistema"}</span> {ACTION[d.action] ?? d.action} {ENTITY[d.entity] ?? d.entity}
                {sid && stu.get(sid) ? ` de ${stu.get(sid)}` : ""} <span className="text-muted">· {formatDateTime(d.created_at)}</span>
              </li>
            );
          })}
        </ul>
      </Card>
    </>
  );
}
