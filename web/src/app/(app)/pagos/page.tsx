import { Badge, Card, Empty, PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { formatDate, formatMoney, formatShortDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { todayLocal } from "@/lib/time";
import { balance, chargeState, STATE_LABEL, type ChargeState } from "@/lib/tuition";

export const metadata = { title: "Pagos" };

const TONE: Record<ChargeState, "good" | "care" | "neutral" | "muted"> = { pagado: "good", vencido: "care", por_vencer: "neutral", proximo: "muted" };

export default async function PaymentsPage() {
  const { session, membership } = await requireRole("guardian");
  const supabase = await createClient();
  const today = todayLocal();
  const [{ data: kids }, { data: charges }, { data: school }] = await Promise.all([
    supabase.from("student_guardians").select("students!inner(id, first_name)").eq("guardian_id", session.userId).eq("school_id", membership.schoolId),
    supabase.from("tuition_charges").select("id, student_id, concept, amount, paid, due_on, paid_on, updated_at").eq("school_id", membership.schoolId).order("due_on"),
    supabase.from("schools").select("payment_info").eq("id", membership.schoolId).single(),
  ]);
  const children = (kids ?? []).map((k) => k.students!).filter(Boolean);
  const all = (charges ?? []).map((c) => ({ ...c, amount: Number(c.amount), paid: Number(c.paid) }));
  const updated = all.reduce<string | null>((m, c) => (!m || c.updated_at > m ? c.updated_at : m), null);

  return (
    <>
      <PageHeader title="Pagos" subtitle="Estado de cuenta de colegiaturas. Solo usted y dirección lo ven." />
      {all.length === 0 ? (
        <Empty title="La escuela aún no ha cargado el estado de cuenta">Cuando administración lo suba, aquí verá sus fechas de pago y si va al corriente.</Empty>
      ) : (
        <div className="space-y-4">
          {children.map((child) => {
            const list = all.filter((c) => c.student_id === child.id);
            if (!list.length) return null;
            const b = balance(list, today);
            return (
              <Card key={child.id} className="space-y-3">
                <div className="flex items-baseline justify-between gap-2">
                  <h2 className="text-xl font-bold">{child.first_name}</h2>
                  {b.overdueCount === 0 ? <Badge tone="good">Al corriente</Badge> : <Badge tone="care">{b.overdueCount === 1 ? "1 pago pendiente" : `${b.overdueCount} pagos pendientes`}</Badge>}
                </div>
                {b.overdueCount > 0 && (
                  <p>
                    Saldo pendiente: <strong className="num">{formatMoney(b.overdueAmount)}</strong>. Si ya pagó, administración lo actualizará en unos días.
                  </p>
                )}
                {b.next && (
                  <p className="text-muted">
                    Siguiente pago: <span className="text-ink">{b.next.concept}</span> · {formatMoney(Number(b.next.amount) - Number(b.next.paid))} · vence el {formatDate(b.next.due_on)}
                  </p>
                )}
                <ul className="divide-y divide-line">
                  {list.map((c) => {
                    const st = chargeState(c, today);
                    return (
                      <li key={c.id} className="flex items-center justify-between gap-3 py-2">
                        <div>
                          <p className="font-medium">{c.concept}</p>
                          <p className="text-sm text-muted">{st === "pagado" ? (c.paid_on ? `Pagado el ${formatShortDate(c.paid_on)}` : "Pagado") : `Vence el ${formatShortDate(c.due_on)}`}</p>
                        </div>
                        <div className="text-right">
                          <p className="num">{formatMoney(st === "pagado" ? c.amount : c.amount - c.paid)}</p>
                          <Badge tone={TONE[st]}>{c.paid > 0 && st !== "pagado" ? "Abono parcial" : STATE_LABEL[st]}</Badge>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            );
          })}

          {school?.payment_info && (
            <Card>
              <h2 className="font-semibold">Cómo pagar</h2>
              <p className="mt-1 whitespace-pre-line text-muted">{school.payment_info}</p>
            </Card>
          )}
          {updated && <p className="text-sm text-muted">Información de administración, actualizada el {formatShortDate(updated.slice(0, 10))}.</p>}
        </div>
      )}
    </>
  );
}
