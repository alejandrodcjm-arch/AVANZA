import { ActionForm } from "@/components/action-form";
import { Card, Field, Input, PageHeader } from "@/components/ui";
import { INDICATOR_LABEL } from "@/lib/alerts";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { saveAlertRule } from "../actions";

export const metadata = { title: "Señales de apoyo" };

const HELP = {
  attendance: { unit: "% de días con falta", text: "Faltar 10% de los días es el umbral más usado para ausentismo crónico." },
  behavior: { unit: "reportes", text: "Número de reportes de conducta en el periodo." },
  grades: { unit: "calificación menor a", text: "También avisa si una materia baja 1 punto o más contra el periodo anterior." },
  assignments: { unit: "tareas sin entregar", text: "Tareas no entregadas en el periodo." },
} as const;

export default async function AlertRulesPage() {
  const { membership } = await requireRole("director");
  const supabase = await createClient();
  const { data: rules } = await supabase.from("alert_rules").select("id, indicator, threshold, window_days, enabled").eq("school_id", membership.schoolId).order("indicator");
  return (
    <>
      <PageHeader title="Señales de apoyo" subtitle="Se revisan cada mañana a las 7:00. Solo las ve el personal; nunca las familias ni los alumnos." back="/director/escuela" />
      <div className="space-y-3">
        {(rules ?? []).map((r) => (
          <Card key={r.id}>
            <h2 className="font-semibold">{INDICATOR_LABEL[r.indicator]}</h2>
            <p className="mb-3 text-sm text-muted">{HELP[r.indicator].text}</p>
            <ActionForm action={saveAlertRule.bind(null, r.id)} variant="secondary">
              <div className="grid grid-cols-2 gap-3">
                <Field label={HELP[r.indicator].unit}>
                  <Input name="threshold" type="number" step="0.1" min={0} max={100} defaultValue={Number(r.threshold)} />
                </Field>
                <Field label="en los últimos (días)">
                  <Input name="window_days" type="number" min={7} max={365} defaultValue={r.window_days} />
                </Field>
              </div>
              <label className="flex min-h-11 items-center gap-2">
                <input type="checkbox" name="enabled" defaultChecked={r.enabled} className="size-5" /> Activa
              </label>
            </ActionForm>
          </Card>
        ))}
      </div>
    </>
  );
}
