import { PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { Importer } from "./importer";

export const metadata = { title: "Importar alumnos" };

export default async function ImportPage() {
  await requireRole("director");
  return (
    <>
      <PageHeader title="Importar alumnos y familias" subtitle="Un solo archivo con grado, grupo, nombre del alumno y correo de sus tutores." back="/director/escuela" />
      <Importer />
    </>
  );
}
