import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BottomNav, type NavItem } from "@/components/nav";
import { getSession, type Role } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const NAV: Record<Role, NavItem[]> = {
  guardian: [
    { href: "/hijos", label: "Mis hijos", icon: "home" },
    { href: "/avisos", label: "Avisos", icon: "bell" },
    { href: "/cuenta", label: "Cuenta", icon: "user" },
  ],
  teacher: [
    { href: "/maestro", label: "Hoy", icon: "home" },
    { href: "/maestro/alertas", label: "Apoyo", icon: "flag" },
    { href: "/maestro/resumenes", label: "Resúmenes", icon: "doc" },
    { href: "/avisos", label: "Avisos", icon: "bell" },
    { href: "/cuenta", label: "Cuenta", icon: "user" },
  ],
  director: [
    { href: "/director", label: "Tablero", icon: "chart" },
    { href: "/director/casos", label: "Casos", icon: "folder" },
    { href: "/director/familias", label: "Familias", icon: "people" },
    { href: "/director/escuela", label: "Escuela", icon: "gear" },
    { href: "/cuenta", label: "Cuenta", icon: "user" },
  ],
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/entrar");
  if (!session.active) redirect("/sin-escuela");

  const supabase = await createClient();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", session.userId)
    .is("read_at", null);

  const items = NAV[session.active.role].map((i) => (i.href === "/avisos" ? { ...i, badge: count ?? 0 } : i));

  return (
    <div className="mx-auto min-h-dvh max-w-3xl px-4 pt-[max(env(safe-area-inset-top),1rem)] pb-28 md:pb-10">
      <div className="mb-4 flex items-center justify-between gap-3 text-sm text-muted">
        <Link href="/inicio" className="flex min-h-10 items-center gap-2 font-semibold text-brand">
          <Image src="/icons/icon-192.png" alt="" width={28} height={28} className="rounded-lg" />
          <span className="truncate">{session.active.schoolName}</span>
        </Link>
        {session.memberships.length > 1 && (
          <Link href="/cuenta#rol" className="min-h-10 content-center underline">
            Cambiar
          </Link>
        )}
      </div>
      <main>{children}</main>
      <BottomNav items={items} />
    </div>
  );
}
