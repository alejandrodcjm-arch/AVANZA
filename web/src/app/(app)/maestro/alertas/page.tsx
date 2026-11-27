import { AlertsList } from "@/components/alerts-list";
import { PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Apoyo" };

export default async function TeacherAlerts() {
  await requireRole("teacher");
  const supabase = await createClient();
  return (
    <>
      <PageHeader title="Alumnos que podrían necesitar apoyo" subtitle="Es una señal para revisar, no una etiqueta: solo la ve el personal." />
      <AlertsList supabase={supabase} />
    </>
  );
}
