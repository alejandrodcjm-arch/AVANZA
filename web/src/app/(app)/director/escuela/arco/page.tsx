import { ActionForm } from "@/components/action-form";
import { Badge, Card, Empty, Field, PageHeader, Select, Textarea } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { formatShortDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { answerArco } from "../actions";

export const metadata = { title: "Solicitudes ARCO" };

const KIND = { access: "Acceso", rectification: "Corrección", cancellation: "Cancelación", opposition: "Oposición" } as const;
const STATUS = { received: "Recibida", in_progress: "En proceso", resolved: "Resuelta", rejected: "Rechazada" } as const;

export default async function ArcoPage() {
  const { membership } = await requireRole("director");
  const supabase = await createClient();
  const { data } = await supabase
    .from("arco_requests")
    .select("id, kind, details, status, response, created_at, profiles:user_id(full_name)")
    .eq("school_id", membership.schoolId)
    .order("created_at", { ascending: false });
  return (
    <>
      <PageHeader title="Solicitudes de datos (ARCO)" subtitle="La ley da plazos para responder; atiéndalas en cuanto lleguen." back="/director/escuela" />
      {!data?.length ? (
        <Empty title="Sin solicitudes" />
      ) : (
        <div className="space-y-3">
          {data.map((r) => (
            <Card key={r.id}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold">
                  {KIND[r.kind]} · {r.profiles?.full_name || "—"}
                </span>
                <Badge tone={r.status === "received" ? "care" : r.status === "resolved" ? "good" : "muted"}>{STATUS[r.status]}</Badge>
              </div>
              <p className="text-sm text-muted">{formatShortDate(r.created_at.slice(0, 10))}</p>
              <p className="mt-2">{r.details}</p>
              {r.status === "received" || r.status === "in_progress" ? (
                <ActionForm action={answerArco.bind(null, r.id)} submit="Guardar respuesta" variant="secondary" className="mt-3 space-y-3">
                  <Field label="Estado">
                    <Select name="status" defaultValue="resolved">
                      <option value="in_progress">En proceso</option>
                      <option value="resolved">Resuelta</option>
                      <option value="rejected">Rechazada (explique el motivo)</option>
                    </Select>
                  </Field>
                  <Field label="Respuesta">
                    <Textarea name="response" defaultValue={r.response ?? ""} required />
                  </Field>
                </ActionForm>
              ) : (
                <p className="mt-2 text-sm text-muted">Respuesta: {r.response}</p>
              )}
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
