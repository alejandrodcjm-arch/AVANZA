"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "./ui";

export type NavItem = { href: string; label: string; icon: keyof typeof ICONS; badge?: number };

const ICONS = {
  home: "M3 10.5 12 3l9 7.5V21H3z M9 21v-6h6v6",
  bell: "M6 16V11a6 6 0 1 1 12 0v5l2 2H4z M10 20a2 2 0 0 0 4 0",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4 21a8 8 0 0 1 16 0",
  list: "M8 6h13 M8 12h13 M8 18h13 M3 6h.01 M3 12h.01 M3 18h.01",
  flag: "M4 21V4 M4 4h12l-2 4 2 4H4",
  doc: "M7 3h7l5 5v13H7z M14 3v5h5 M10 13h6 M10 17h6",
  chart: "M4 20V10 M10 20V4 M16 20v-7 M22 20H2",
  folder: "M3 7h6l2 2h10v10H3z",
  people: "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M2 21a7 7 0 0 1 14 0 M17 11a3 3 0 1 0 0-6 M22 21a6 6 0 0 0-5-6",
  gear: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19 12l2-1-2-4-2 1-2-2 1-2-4-2-1 2h-2L10 3 6 5l1 2-2 2-2-1-2 4 2 1v2l-2 1 2 4 2-1 2 2-1 2 4 2 1-2h2l1 2 4-2-1-2 2-2 2 1 2-4-2-1z",
};

function Icon({ name }: { name: keyof typeof ICONS }) {
  return (
    <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {ICONS[name].split(" M").map((d, i) => (
        <path key={i} d={i === 0 ? d : `M${d}`} />
      ))}
    </svg>
  );
}

export function BottomNav({ items }: { items: NavItem[] }) {
  const path = usePathname();
  // Activo = el elemento cuyo enlace es el prefijo más largo de la ruta actual.
  const current = items
    .filter((i) => path === i.href || path.startsWith(i.href + "/"))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
  const active = (href: string) => href === current;
  return (
    <nav aria-label="Principal" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:static md:mb-6 md:rounded-card md:border md:pb-0">
      <ul className="mx-auto flex max-w-3xl">
        {items.map((it) => (
          <li key={it.href} className="flex-1">
            <Link
              href={it.href}
              aria-current={active(it.href) ? "page" : undefined}
              className={cx(
                "relative flex min-h-16 flex-col items-center justify-center gap-0.5 text-xs font-medium",
                active(it.href) ? "text-brand" : "text-muted",
              )}
            >
              <Icon name={it.icon} />
              {it.label}
              {it.badge ? (
                <span className="num absolute top-2 left-1/2 ml-2 rounded-full bg-care px-1.5 text-[11px] leading-5 text-white">{it.badge > 9 ? "9+" : it.badge}</span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
