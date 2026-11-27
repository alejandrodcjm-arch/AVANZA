import { describe, expect, it } from "vitest";
import { buildIcs, escapeText, fold, type Feed } from "@/lib/calendar/ics";
import { googleEventUrl, subscribeLinks } from "@/lib/calendar/links";

const base: Feed = { school: "Colegio Demo", events: [], payments: [], classes: [], no_class: [], year_end: null };
const now = new Date("2026-11-26T18:00:00Z"); // jueves

describe("ics", () => {
  it("escapa comas, punto y coma y saltos de línea", () => {
    expect(escapeText("Junta; traer lápiz, goma\nGracias")).toBe("Junta\\; traer lápiz\\, goma\\nGracias");
  });

  it("dobla líneas largas a 75 octetos sin romper acentos", () => {
    const line = "SUMMARY:" + "Árbol ñandú ".repeat(20);
    const out = fold(line).split("\r\n");
    const enc = new TextEncoder();
    expect(out.length).toBeGreaterThan(1);
    for (const l of out) expect(enc.encode(l).length).toBeLessThanOrEqual(75);
    expect(out.map((l, i) => (i ? l.slice(1) : l)).join("")).toBe(line);
  });

  it("los eventos de todo el día terminan al día siguiente (exclusivo)", () => {
    const ics = buildIcs({ ...base, events: [{ id: "e1", kind: "vacaciones", title: "Vacaciones de invierno", description: null, starts_on: "2026-12-21", ends_on: "2027-01-06", start_time: null, end_time: null, group_label: null }] }, now);
    expect(ics).toContain("DTSTART;VALUE=DATE:20261221");
    expect(ics).toContain("DTEND;VALUE=DATE:20270107");
    expect(ics).toContain("UID:e1@avanza");
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics.split("\r\n").every((l) => !l.includes("\n"))).toBe(true);
  });

  it("los eventos con hora usan la zona de la escuela y el grupo va en el título", () => {
    const ics = buildIcs({ ...base, events: [{ id: "e2", kind: "junta", title: "Junta", description: "Salón 3", starts_on: "2026-12-04", ends_on: "2026-12-04", start_time: "08:00:00", end_time: "09:30:00", group_label: "3°A" }] }, now);
    expect(ics).toContain("DTSTART;TZID=America/Mexico_City:20261204T080000");
    expect(ics).toContain("DTEND;TZID=America/Mexico_City:20261204T093000");
    expect(ics).toContain("SUMMARY:Junta · 3°A");
    expect(ics).toContain("BEGIN:VTIMEZONE");
  });

  it("las fechas de pago no llevan montos", () => {
    const ics = buildIcs({ ...base, payments: [{ id: "p1", concept: "Colegiatura diciembre", due_on: "2026-12-10", student: "Natalia" }] }, now);
    expect(ics).toContain("SUMMARY:Fecha de pago: Colegiatura diciembre (Natalia)");
    expect(ics).not.toMatch(/\$|\d{3,},?\d*\.\d\d/);
    expect(ics).toContain("TRIGGER:-PT15H");
  });

  it("las clases se repiten cada semana hasta fin de ciclo y saltan los días sin clases", () => {
    const ics = buildIcs(
      {
        ...base,
        classes: [{ id: "c1", weekday: 5, starts_at: "08:00:00", ends_at: "09:00:00", subject: "Lenguajes", group: "3°A", room: "Aula 2" }],
        no_class: [{ from: "2026-11-27", to: "2026-11-27" }, { from: "2026-12-21", to: "2027-01-06" }, { from: "2026-12-02", to: "2026-12-02" }],
        year_end: "2027-07-09",
      },
      now,
    );
    expect(ics).toContain("DTSTART;TZID=America/Mexico_City:20261127T080000");
    expect(ics).toContain("RRULE:FREQ=WEEKLY;UNTIL=20270709T235959Z");
    expect(ics).toContain("EXDATE;TZID=America/Mexico_City:20261127T080000");
    expect(ics).toContain("EXDATE;TZID=America/Mexico_City:20261225T080000");
    expect(ics).toContain("EXDATE;TZID=America/Mexico_City:20270101T080000");
    expect(ics).not.toContain("20261202T080000"); // miércoles: no aplica a una clase de viernes
    expect(ics).toContain("LOCATION:Aula 2");
  });
});

describe("enlaces de calendario", () => {
  it("evento de todo el día en Google", () => {
    const u = new URL(googleEventUrl({ title: "Examen", starts_on: "2026-12-08", ends_on: "2026-12-08" }));
    expect(u.searchParams.get("dates")).toBe("20261208/20261209");
    expect(u.searchParams.get("action")).toBe("TEMPLATE");
  });
  it("suscripción con webcal", () => {
    const l = subscribeLinks("https://app.mx/api/calendario/abc.ics", "Colegio");
    expect(l.apple).toBe("webcal://app.mx/api/calendario/abc.ics");
    expect(decodeURIComponent(new URL(l.google).searchParams.get("cid")!)).toBe("webcal://app.mx/api/calendario/abc.ics");
  });
});
