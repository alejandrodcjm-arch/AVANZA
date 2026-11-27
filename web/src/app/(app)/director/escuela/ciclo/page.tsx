import { ActionForm } from "@/components/action-form";
import { Card, Field, Input, PageHeader, Select } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { addSubjectForm, createYear, updatePeriod } from "../actions";
import { DeleteSubject, SubjectTemplates } from "./subject-tools";

export const metadata = { title: "Ciclo y materias" };

export default async function CyclePage() {
  const { membership } = await requireRole("director");
  const supabase = await createClient();
  const [{ data: year }, { data: subjects }] = await Promise.all([
    supabase.from("school_years").select("id, name, starts_on, ends_on, periods(id, name, sort, starts_on, ends_on)").eq("school_id", membership.schoolId).eq("is_current", true).maybeSingle(),
    supabase.from("subjects").select("id, name").eq("school_id", membership.schoolId).order("name"),
  ]);
  const periods = [...(year?.periods ?? [])].sort((a, b) => a.sort - b.sort);

  return (
    <>
      <PageHeader title="Ciclo, periodos y materias" back="/director/escuela" />
      <div className="space-y-4">
        <Card>
          <h2 className="font-semibold">Ciclo escolar actual</h2>
          {year ? (
            <>
              <p className="mt-1">
                {year.name} · {year.starts_on} a {year.ends_on}
              </p>
              <ul className="mt-3 space-y-3">
                {periods.map((p) => (
                  <li key={p.id}>
                    <ActionForm action={updatePeriod.bind(null, p.id)} submit="Guardar" variant="ghost" className="grid grid-cols-[1fr_auto_auto_auto] items-end gap-2">
                      <Input name="name" defaultValue={p.name} aria-label="Nombre del periodo" />
                      <Input type="date" name="starts_on" defaultValue={p.starts_on} aria-label="Inicio" />
                      <Input type="date" name="ends_on" defaultValue={p.ends_on} aria-label="Fin" />
                    </ActionForm>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="mt-1 text-muted">Todavía no hay ciclo. Créelo abajo.</p>
          )}
        </Card>

        <Card>
          <h2 className="mb-3 font-semibold">{year ? "Iniciar un ciclo nuevo" : "Crear el ciclo escolar"}</h2>
          <ActionForm action={createYear} submit={year ? "Crear y usar como actual" : "Crear ciclo"} success="Ciclo creado con sus periodos.">
            <Field label="Nombre">
              <Input name="name" defaultValue="2026-2027" required />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Inicio">
                <Input type="date" name="starts_on" defaultValue="2026-08-31" required />
              </Field>
              <Field label="Fin">
                <Input type="date" name="ends_on" defaultValue="2027-07-15" required />
              </Field>
            </div>
            <Field label="Periodos de evaluación" hint="Se reparten por igual; después puede ajustar las fechas.">
              <Select name="periods" defaultValue="trimestres">
                <option value="trimestres">3 trimestres (SEP)</option>
                <option value="bimestres">5 bimestres</option>
                <option value="semestres">2 semestres</option>
              </Select>
            </Field>
          </ActionForm>
        </Card>

        <Card>
          <h2 className="font-semibold">Materias o campos formativos</h2>
          <ul className="mt-2 divide-y divide-line">
            {(subjects ?? []).map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-2 py-1.5">
                {s.name}
                <DeleteSubject id={s.id} />
              </li>
            ))}
          </ul>
          <div className="mt-4 space-y-3">
            <SubjectTemplates />
            <ActionForm action={addSubjectForm} submit="Agregar" variant="secondary">
              <Input name="name" placeholder="Otra materia, ej. Inglés" aria-label="Nombre de la materia" />
            </ActionForm>
          </div>
        </Card>
      </div>
    </>
  );
}
