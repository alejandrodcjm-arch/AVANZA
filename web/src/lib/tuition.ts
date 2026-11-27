/** Estado de un cargo de colegiatura. "Vencido" se dice con ámbar, nunca rojo: es información, no regaño. */
export type Charge = { id: string; concept: string; amount: number; paid: number; due_on: string; paid_on: string | null };
export type ChargeState = "pagado" | "vencido" | "por_vencer" | "proximo";

export function chargeState(c: Pick<Charge, "amount" | "paid" | "due_on">, today: string, soonDays = 7): ChargeState {
  if (Number(c.paid) >= Number(c.amount)) return "pagado";
  if (c.due_on < today) return "vencido";
  const diff = (Date.parse(`${c.due_on}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86400000;
  return diff <= soonDays ? "por_vencer" : "proximo";
}

export const STATE_LABEL: Record<ChargeState, string> = { pagado: "Pagado", vencido: "Pendiente", por_vencer: "Por vencer", proximo: "Próximo" };

export function balance<T extends Pick<Charge, "amount" | "paid" | "due_on">>(charges: T[], today: string) {
  const overdue = charges.filter((c) => chargeState(c, today) === "vencido");
  return {
    overdueCount: overdue.length,
    overdueAmount: overdue.reduce((t, c) => t + Number(c.amount) - Number(c.paid), 0),
    next: (charges.filter((c) => Number(c.paid) < Number(c.amount) && c.due_on >= today).sort((a, b) => a.due_on.localeCompare(b.due_on))[0] ?? null) as T | null,
  };
}
