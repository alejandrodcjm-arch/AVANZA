import { ActionForm } from "@/components/action-form";
import { Card, Field, Input, PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { publishNoticeVersion, saveSchool } from "../actions";
import { PublishNotice } from "./publish";

export const metadata = { title: "Datos de la escuela" };

export default async function SchoolData() {
  const { membership } = await requireRole("director");
  const supabase = await createClient();
  const { data: s } = await supabase.from("schools").select("name, cct, address, privacy_email, phone, privacy_notice_version").eq("id", membership.schoolId).single();
  const { count } = await supabase.from("consents").select("id", { count: "exact", head: true }).eq("school_id", membership.schoolId).eq("notice_version", s?.privacy_notice_version ?? "");
  return (
    <>
      <PageHeader title="Datos de la escuela" subtitle="Aparecen en el aviso de privacidad: la escuela es la responsable de los datos." back="/director/escuela" />
      <Card>
        <ActionForm action={saveSchool}>
          <Field label="Nombre">
            <Input name="name" defaultValue={s?.name} required />
          </Field>
          <Field label="CCT">
            <Input name="cct" defaultValue={s?.cct ?? ""} />
          </Field>
          <Field label="Domicilio">
            <Input name="address" defaultValue={s?.address ?? ""} placeholder="Calle, número, colonia, Durango, Dgo." />
          </Field>
          <Field label="Correo para temas de privacidad" hint="Ahí llegan las solicitudes de acceso, corrección o borrado de datos.">
            <Input type="email" name="privacy_email" defaultValue={s?.privacy_email ?? ""} />
          </Field>
          <Field label="Teléfono">
            <Input name="phone" defaultValue={s?.phone ?? ""} inputMode="tel" />
          </Field>
        </ActionForm>
      </Card>
      <Card className="mt-4">
        <h2 className="font-semibold">Aviso de privacidad</h2>
        <p className="mt-1 text-muted">
          Versión vigente: <strong>{s?.privacy_notice_version}</strong> · {count ?? 0} personas lo han aceptado.
        </p>
        <p className="mt-2 text-sm text-muted">Si su abogado cambia el aviso, publique una versión nueva: todas las familias deberán aceptarlo otra vez antes de seguir viendo información.</p>
        <PublishNotice action={publishNoticeVersion} />
      </Card>
    </>
  );
}
