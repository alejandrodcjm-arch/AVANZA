import { describe, expect, it } from "vitest";
import { addDays, isQuietHours, isWeekday, previousMonthStart, todayLocal } from "../time";

describe("fechas en la zona de la escuela", () => {
  it("a las 3:00 UTC todavía es el día anterior en Durango", () => {
    expect(todayLocal(new Date("2026-11-27T03:00:00Z"))).toBe("2026-11-26");
  });
  it("respeta el horario de descanso (21:00–7:00)", () => {
    expect(isQuietHours(new Date("2026-11-27T04:00:00Z"))).toBe(true); // 22:00
    expect(isQuietHours(new Date("2026-11-26T19:00:00Z"))).toBe(false); // 13:00
    expect(isQuietHours(new Date("2026-11-26T12:30:00Z"))).toBe(true); // 6:30
  });
  it("calcula días hábiles y meses", () => {
    expect(isWeekday("2026-11-28")).toBe(false);
    expect(isWeekday("2026-11-27")).toBe(true);
    expect(addDays("2026-11-30", 2)).toBe("2026-12-02");
    expect(previousMonthStart("2026-01-15")).toBe("2025-12-01");
  });
});
