import { ActionForm } from "@/components/action-form";
import { Badge, Card, Field, Input, PageHeader, Select } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { formatShortDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { addStaff } from "../escuela/actions";
import { RemoveStaff } from "./remove";

export const metadata = { title: "Personal" };

export default async function StaffPage() {
  const { membership } = await requireRole("director");
  const supabase = await createClient();
  const { data: staff } = await supabase
    .from("memberships")
    .select("id, role, user_id, created_at, profiles(full_name)")
    .eq("school_id", membership.schoolId)
    .in("role", ["teacher", "director"])
    .order("role");
  // Uso real: última lista capturada por cada maestro (la licencia que no se usa no sirve).
  const { data: lastCapture } = await supabase.from("attendance").select("recorded_by, date").eq("school_id", membership.schoolId).order("date", { ascending: false }).limit(2000);
  const last = new Map<string, string>();
  for (const r of lastCapture ?? []) if (r.recorded_by && !last.has(r.recorded_by)) last.set(r.recorded_by, r.date);

  return (
    <>
      <PageHeader title="Personal" subtitle="Entran con un código que llega a su correo; no hay contraseñas." back="/director/escuela" />
      <Card>
        <ul className="divide-y divide-line">
          {(staff ?? []).map((s) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <div>
                <p>
                  {s.profiles?.full_name || "Sin nombre"} <Badge tone={s.role === "director" ? "neutral" : "muted"}>{s.role === "director" ? "Dirección" : "Maestro(a)"}</Badge>
                </p>
                {s.role === "teacher" && <p className="text-sm text-muted">{last.has(s.user_id) ? `Última lista: ${formatShortDate(last.get(s.user_id)!)}` : "Aún no pasa lista en la app"}</p>}
              </div>
              <RemoveStaff id={s.id} name={s.profiles?.full_name || "esta persona"} />
            </li>
          ))}
        </ul>
      </Card>
      <Card className="mt-4">
        <h2 className="mb-3 font-semibold">Dar acceso</h2>
        <ActionForm action={addStaff} submit="Dar acceso y enviar correo" success="Listo. Le enviamos un correo con las instrucciones.">
          <Field label="Nombre completo">
            <Input name="full_name" required minLength={3} />
          </Field>
          <Field label="Correo">
            <Input name="email" type="email" required />
          </Field>
          <Field label="Rol">
            <Select name="role" defaultValue="teacher">
              <option value="teacher">Maestro(a)</option>
              <option value="director">Dirección (ve todo)</option>
            </Select>
          </Field>
        </ActionForm>
      </Card>
    </>
  );
}
