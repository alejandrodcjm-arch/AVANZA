"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "./ui";

const TABS = [
  { href: "/director/reportes/asistencia", label: "Asistencia" },
  { href: "/director/reportes/calificaciones", label: "Calificaciones" },
  { href: "/director/reportes/convivencia", label: "Convivencia" },
  { href: "/director/reportes/maestros", label: "Maestros" },
];

export function ReportNav() {
  const path = usePathname();
  return (
    <nav aria-label="Reportes" className="-mx-4 mb-4 overflow-x-auto px-4">
      <ul className="flex min-w-max gap-1 rounded-xl bg-[#efeae1] p-1">
        {TABS.map((t) => (
          <li key={t.href}>
            <Link href={t.href} aria-current={path.startsWith(t.href) ? "page" : undefined} className={cx("inline-flex min-h-10 items-center rounded-lg px-3.5 text-sm font-medium", path.startsWith(t.href) ? "bg-card text-brand shadow-sm" : "text-muted")}>
              {t.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function RangePicker({ ranges, current }: { ranges: { key: string; label: string }[]; current: string }) {
  return (
    <nav aria-label="Periodo del reporte" className="mb-4 flex flex-wrap gap-2">
      {ranges.map((r) => (
        <Link key={r.key} href={`?rango=${r.key}`} className={cx("min-h-10 content-center rounded-full px-4 text-sm", r.key === current ? "bg-brand text-white" : "bg-card ring-1 ring-line")}>
          {r.label}
        </Link>
      ))}
    </nav>
  );
}
