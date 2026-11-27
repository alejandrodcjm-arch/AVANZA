import Link from "next/link";
import { Card, PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth";

export const metadata = { title: "Escuela" };

const LINKS = [
  { href: "/director/escuela/datos", title: "Datos de la escuela", text: "Nombre, domicilio y contacto del aviso de privacidad." },
  { href: "/director/escuela/ciclo", title: "Ciclo, periodos y materias", text: "Trimestres del ciclo 2026-2027 y campos formativos." },
  { href: "/director/importar", title: "Importar alumnos y familias", text: "Desde la plantilla de Excel. Se puede repetir sin duplicar." },
  { href: "/director/personal", title: "Personal", text: "Maestros y dirección con acceso." },
  { href: "/director/escuela/grupos", title: "Grupos y maestros", text: "Quién da cada materia y quién es titular." },
  { href: "/director/escuela/alertas", title: "Señales de apoyo", text: "Cuándo se avisa al personal (faltas, tareas, conducta, calificaciones)." },
  { href: "/director/escuela/arco", title: "Solicitudes de datos (ARCO)", text: "Acceso, corrección o borrado que piden las familias." },
  { href: "/director/escuela/bitacora", title: "Bitácora", text: "Quién consultó o cambió información de alumnos." },
];

export default async function SchoolHub() {
  await requireRole("director");
  return (
    <>
      <PageHeader title="Escuela" />
      <ul className="grid gap-3 sm:grid-cols-2">
        {LINKS.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="block h-full">
              <Card className="h-full hover:ring-brand">
                <p className="font-semibold text-brand">{l.title}</p>
                <p className="mt-1 text-sm text-muted">{l.text}</p>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
