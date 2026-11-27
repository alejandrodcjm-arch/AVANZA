"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "./ui";

const TABS = [
  { seg: "", label: "Alumnos" },
  { seg: "/lista", label: "Lista" },
  { seg: "/pendientes", label: "Pendientes" },
  { seg: "/calificaciones", label: "Calificaciones" },
  { seg: "/conducta", label: "Conducta" },
];

export function GroupTabs({ groupId }: { groupId: string }) {
  const path = usePathname();
  const base = `/maestro/grupos/${groupId}`;
  const current = TABS.filter((t) => path === base + t.seg || (t.seg && path.startsWith(base + t.seg))).at(-1)?.seg ?? (path.includes("/excel") || path.includes("/tareas") ? "/pendientes" : "");
  return (
    <nav aria-label="Secciones del grupo" className="-mx-4 mb-4 overflow-x-auto px-4">
      <ul className="flex min-w-max gap-1 rounded-xl bg-[#efeae1] p-1">
        {TABS.map((t) => (
          <li key={t.seg}>
            <Link
              href={base + t.seg}
              aria-current={current === t.seg ? "page" : undefined}
              className={cx("inline-flex min-h-10 items-center rounded-lg px-3.5 text-sm font-medium", current === t.seg ? "bg-card text-brand shadow-sm" : "text-muted")}
            >
              {t.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
