import { addDays, monthStart } from "./time";

export type Range = { from: string; to: string; key: string; label: string };

/** Rangos rápidos para reportes. El ciclo y el periodo vienen de la base. */
export function ranges(today: string, period?: { starts_on: string; name: string } | null, year?: { starts_on: string } | null): Range[] {
  const r: Range[] = [
    { key: "30d", label: "Últimos 30 días", from: addDays(today, -29), to: today },
    { key: "mes", label: "Este mes", from: monthStart(today), to: today },
  ];
  if (period) r.push({ key: "periodo", label: period.name, from: period.starts_on, to: today });
  if (year) r.push({ key: "ciclo", label: "Todo el ciclo", from: year.starts_on, to: today });
  return r;
}

export function pickRange(all: Range[], key?: string) {
  return all.find((r) => r.key === key) ?? all[0];
}
