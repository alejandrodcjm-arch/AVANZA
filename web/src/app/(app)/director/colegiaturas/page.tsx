import { ActionForm } from "@/components/action-form";
import { Columns } from "@/components/charts";
import { Card, Empty, PageHeader, Stat, Textarea } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { formatMoney, formatMonth, formatShortDate, plural } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { todayLocal } from "@/lib/time";
import { markPaid, savePaymentInfo } from "./actions";
import { TuitionUploader } from "./uploader";

export const metadata = { title: "Colegiaturas" };

type Report = {
  expected: number;
  collected: number;
  overdue_amount: number;
  overdue_students: number;
  students: number;
  upcoming_amount: number;
  upcoming_count: number;
  last_update: string | null;
  by_month: { month: string; expected: number; collected: number }[];
  overdue: { student_id: string; name: string; group: string | null; owed: number; oldest_due: string; items: { id: string; concept: string; due_on: string; owed: number }[] }[];
};

const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86400000);

export default async function TuitionPage() {
  const { membership } = await requireRole("director");
  const supabase = await createClient();
  const today = todayLocal();
  const [{ data }, { data: school }, { data: year }, { data: enroll }] = await Promise.all([
    supabase.rpc("tuition_report", { p_school: membership.schoolId, p_today: today }),
    supabase.from("schools").select("payment_info").eq("id", membership.schoolId).single(),
    supabase.from("school_years").select("starts_on").eq("school_id", membership.schoolId).eq("is_current", true).maybeSingle(),
    supabase
      .from("enrollments")
      .select("students!inner(id, first_name, last_name, second_last_name), school_years!inner(is_current)")
      .eq("school_id", membership.schoolId)
      .eq("school_years.is_current", true)
      .limit(5000),
  ]);
  const r = data as unknown as Report | null;
  const roster = (enroll ?? []).map((e) => e.students!).filter(Boolean);
  const startYear = Number((year?.starts_on ?? today).slice(0, 4));
  const pct = r && r.expected > 0 ? Math.round((1000 * r.collected) / r.expected) / 10 : null;

  return (
    <>
      <PageHeader title="Colegiaturas" subtitle="Cada familia ve solo su estado de cuenta. Esta lista es privada de dirección." back="/director/escuela" />
      <div className="space-y-4">
        {!r || r.students === 0 ? (
          <Empty title="Aún no hay estado de cuenta">Suba el Excel de pagos que ya llevan. Las familias verán si van al corriente y recibirán un recordatorio discreto 3 días antes de cada vencimiento.</Empty>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Card>
                <Stat value={pct === null ? "—" : `${pct}%`} label="cobrado de lo ya vencido" tone={pct !== null && pct >= 90 ? "good" : undefined} />
              </Card>
              <Card>
                <Stat value={formatMoney(r.overdue_amount)} label="saldo vencido" tone={r.overdue_amount > 0 ? "care" : undefined} />
              </Card>
              <Card>
                <Stat value={r.overdue_students} label={`de ${r.students} alumnos con pagos vencidos`} tone={r.overdue_students > 0 ? "care" : "good"} />
              </Card>
              <Card>
                <Stat value={formatMoney(r.upcoming_amount)} label={`por cobrar en 15 días (${r.upcoming_count})`} />
              </Card>
            </div>

            {r.by_month.length > 1 && (
              <Card>
                <h2 className="mb-3 font-semibold">Cobrado por mes</h2>
                <Columns
                  label="Porcentaje cobrado por mes de vencimiento"
                  unit="%"
                  items={r.by_month.map((m) => {
                    const v = m.expected > 0 ? Math.round((1000 * m.collected) / m.expected) / 10 : 0;
                    return { label: formatMonth(`${m.month}-01`).slice(0, 3), value: v, hint: `${formatMoney(m.collected)} de ${formatMoney(m.expected)}`, attention: v < 90 };
                  })}
                />
              </Card>
            )}

            <Card>
              <h2 className="font-semibold">Pagos vencidos</h2>
              <p className="text-sm text-muted">No publique ni comparta esta lista (Profeco prohíbe exhibir a deudores). Las familias reciben un solo aviso privado, sin montos, 5 días después del vencimiento.</p>
              {r.overdue.length === 0 ? (
                <p className="mt-3 text-good">Todas las familias van al corriente.</p>
              ) : (
                <ul className="mt-3 divide-y divide-line">
                  {r.overdue.map((s) => (
                    <li key={s.student_id} className="py-3">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="font-medium">
                          {s.name} {s.group && <span className="font-normal text-muted">· {s.group}</span>}
                        </p>
                        <p className="num font-semibold">{formatMoney(s.owed)}</p>
                      </div>
                      <ul className="mt-1 space-y-1">
                        {s.items.map((i) => (
                          <li key={i.id} className="flex items-center justify-between gap-3 text-sm text-muted">
                            <span>
                              {i.concept} · venció el {formatShortDate(i.due_on)} ({plural(daysBetween(i.due_on, today), "día", "días")})
                            </span>
                            <form action={markPaid.bind(null, i.id)}>
                              <button className="min-h-9 text-brand underline">Marcar pagado</button>
                            </form>
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </>
        )}

        <Card className="space-y-3">
          <h2 className="text-lg font-semibold">Actualizar desde Excel</h2>
          {r?.last_update && <p className="text-sm text-muted">Última actualización: {formatShortDate(r.last_update.slice(0, 10))}. Súbalo cada semana para que las familias vean lo correcto.</p>}
          <TuitionUploader roster={roster} startYear={startYear} />
        </Card>

        <Card>
          <h2 className="text-lg font-semibold">Cómo pagar</h2>
          <p className="mb-3 text-sm text-muted">Lo ven las familias en su estado de cuenta.</p>
          <ActionForm action={savePaymentInfo} submit="Guardar">
            <Textarea name="payment_info" rows={3} maxLength={1000} defaultValue={school?.payment_info ?? ""} placeholder="Banco, CLABE, referencia, horario de caja…" />
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
