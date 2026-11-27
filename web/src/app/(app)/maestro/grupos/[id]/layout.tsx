import Link from "next/link";
import { GroupTabs } from "@/components/group-tabs";
import { createClient } from "@/lib/supabase/server";

export default async function GroupLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: g } = await supabase.from("groups").select("grade, name").eq("id", id).maybeSingle();
  return (
    <>
      <div className="mb-3 flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">{g ? `${g.grade}°${g.name}` : "Grupo"}</h1>
        <Link href="/maestro" className="inline-flex min-h-10 items-center text-sm font-medium text-brand">
          ← Mi semana
        </Link>
      </div>
      <GroupTabs groupId={id} />
      {children}
    </>
  );
}
