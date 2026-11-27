import { notFound } from "next/navigation";
import { Card, PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { formatDate, formatMonth } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Resumen del mes" };

export default async function SummaryPage({ params }: { params: Promise<{ id: string; sid: string }> }) {
  const { id, sid } = await params;
  const { session } = await requireRole("guardian");
  const supabase = await createClient();
  const { data: s } = await supabase
    .from("monthly_summaries")
    .select("id, month, final_text, approved_at, students(first_name), profiles:approved_by(full_name)")
    .eq("id", sid)
    .eq("student_id", id)
    .eq("status", "approved")
    .maybeSingle();
  if (!s) notFound();

  // Al abrir el resumen, su aviso queda como leído.
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", session.userId)
    .eq("kind", "monthly_summary")
    .eq("student_id", id)
    .is("read_at", null);

  return (
    <>
      <PageHeader title={`${s.students?.first_name ?? ""} en ${formatMonth(s.month)}`} back={`/hijos/${id}`} />
      <Card>
        <div className="space-y-4 text-lg leading-relaxed">
          {(s.final_text ?? "").split(/\n{2,}/).map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
        <p className="mt-6 border-t border-line pt-3 text-sm text-muted">
          Revisado y aprobado por {s.profiles?.full_name ?? "la maestra o el maestro"}
          {s.approved_at ? ` el ${formatDate(s.approved_at.slice(0, 10))}` : ""}. Se redactó con ayuda de inteligencia artificial.
        </p>
      </Card>
    </>
  );
}
