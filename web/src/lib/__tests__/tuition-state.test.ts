import { describe, expect, it } from "vitest";
import { balance, chargeState } from "@/lib/tuition";

describe("estado de colegiaturas", () => {
  const today = "2026-11-26";
  it("clasifica cada cargo", () => {
    expect(chargeState({ amount: 3500, paid: 3500, due_on: "2026-11-10" }, today)).toBe("pagado");
    expect(chargeState({ amount: 3500, paid: 1000, due_on: "2026-11-10" }, today)).toBe("vencido");
    expect(chargeState({ amount: 3500, paid: 0, due_on: "2026-12-01" }, today)).toBe("por_vencer");
    expect(chargeState({ amount: 3500, paid: 0, due_on: "2026-12-10" }, today)).toBe("proximo");
  });
  it("saldo vencido y siguiente pago", () => {
    const b = balance(
      [
        { amount: 3500, paid: 3500, due_on: "2026-10-10" },
        { amount: 3500, paid: 1000, due_on: "2026-11-10" },
        { amount: 3500, paid: 0, due_on: "2026-12-10" },
        { amount: 3500, paid: 0, due_on: "2027-01-10" },
      ],
      today,
    );
    expect(b).toMatchObject({ overdueCount: 1, overdueAmount: 2500 });
    expect(b.next?.due_on).toBe("2026-12-10");
  });
});
