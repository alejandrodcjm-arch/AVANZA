"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cx } from "./ui";

// Tableros, reportes, horarios y calendario usan todo el ancho de la computadora;
// formularios y fichas se quedan angostos para que se lean bien.
const WIDE_STAFF = [/^\/director$/, /^\/director\/reportes/, /^\/director\/colegiaturas/, /^\/director\/horarios/, /^\/director\/familias/, /^\/director\/casos$/, /^\/maestro$/, /^\/maestro\/grupos\/[^/]+$/, /^\/maestro\/alertas/, /^\/horario/, /^\/calendario/];
const WIDE_FAMILY = [/^\/hijos/, /^\/horario/, /^\/calendario/, /^\/pagos/];

export function MainFrame({ wide, children }: { wide: boolean; children: ReactNode }) {
  const path = usePathname();
  const isWide = (wide ? WIDE_STAFF : WIDE_FAMILY).some((r) => r.test(path));
  return (
    <div className={cx("mx-auto min-h-dvh px-4 pt-[max(env(safe-area-inset-top),1rem)] pb-28 sm:px-6 lg:px-8 lg:pt-8 lg:pb-12", isWide ? (wide ? "max-w-[1400px]" : "max-w-5xl") : "max-w-3xl")}>
      {children}
    </div>
  );
}
