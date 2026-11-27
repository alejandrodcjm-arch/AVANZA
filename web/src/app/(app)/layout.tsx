import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MainFrame } from "@/components/main-frame";
import { BottomNav, SideNav, type NavItem } from "@/components/nav";
import { getSession, type Role } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const NAV: Record<Role, NavItem[]> = {
  guardian: [
    { href: "/hijos", label: "Mis hijos", icon: "home" },
    { href: "/calendario", label: "Calendario", icon: "calendar" },
    { href: "/pagos", label: "Pagos", icon: "wallet" },
    { href: "/avisos", label: "Avisos", icon: "bell" },
    { href: "/cuenta", label: "Cuenta", icon: "user" },
  ],
  teacher: [
    { href: "/maestro", label: "Mi semana", icon: "home" },
    { href: "/calendario", label: "Calendario", icon: "calendar" },
    { href: "/maestro/alertas", label: "Apoyo", icon: "flag" },
    { href: "/maestro/resumenes", label: "Resúmenes", icon: "doc" },
    { href: "/avisos", label: "Avisos", icon: "bell" },
  ],
  director: [
    { href: "/director", label: "Tablero", icon: "home" },
    { href: "/director/reportes", label: "Reportes", icon: "chart" },
    { href: "/director/casos", label: "Casos", icon: "folder" },
    { href: "/director/familias", label: "Familias", icon: "people" },
    { href: "/director/escuela", label: "Escuela", icon: "gear" },
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

  const role = session.active.role;
  const extra: NavItem[] = [
    ...(role === "director" ? [{ href: "/calendario", label: "Calendario", icon: "calendar" as const }, { href: "/director/horarios", label: "Horarios", icon: "clock" as const }, { href: "/director/colegiaturas", label: "Colegiaturas", icon: "wallet" as const }] : []),
    ...(role === "teacher" ? [{ href: "/horario", label: "Mi horario", icon: "clock" as const }] : []),
    ...(role === "guardian" ? [{ href: "/horario", label: "Horario", icon: "clock" as const }] : []),
    ...(role !== "guardian" ? [{ href: "/cuenta", label: "Cuenta", icon: "user" as const }] : []),
  ];

  return (
    <>
      <SideNav items={items} school={session.active.schoolName} extra={extra} />
      <div className="lg:pl-60">
        <MainFrame wide={role !== "guardian"}>
          <header data-app-header className="mb-4 flex items-center justify-between gap-3 text-sm text-muted lg:hidden">
            <Link href="/inicio" className="flex min-h-10 items-center gap-2 font-semibold text-brand">
              <Image src="/icons/icon-192.png" alt="" width={28} height={28} className="rounded-lg" />
              <span className="truncate">{session.active.schoolName}</span>
            </Link>
            <span className="flex items-center gap-3">
              {session.memberships.length > 1 && (
                <Link href="/cuenta#rol" className="min-h-10 content-center underline">
                  Cambiar
                </Link>
              )}
              {role !== "guardian" && (
                <Link href="/cuenta" className="min-h-10 content-center underline">
                  Cuenta
                </Link>
              )}
            </span>
          </header>
          {session.memberships.length > 1 && (
            <div className="mb-2 hidden justify-end text-sm lg:flex print:hidden">
              <Link href="/cuenta#rol" className="min-h-10 content-center text-muted underline">
                Cambiar de escuela o rol
              </Link>
            </div>
          )}
          <main>{children}</main>
        </MainFrame>
        <BottomNav items={items} />
      </div>
    </>
  );
}
