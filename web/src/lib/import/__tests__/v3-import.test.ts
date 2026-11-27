import { describe, expect, it } from "vitest";
import { toAmount, toDate, toTime, toTimeRange } from "../cells";
import { matchSubject, parseSchedule } from "../schedule";
import { parseTuition } from "../tuition";

const subjects = [
  { id: "len", name: "Lenguajes" },
  { id: "sab", name: "Saberes y Pensamiento Científico" },
  { id: "eti", name: "Ética, Naturaleza y Sociedades" },
  { id: "hum", name: "De lo Humano y lo Comunitario" },
];
const roster = [
  { id: "nat", first_name: "Natalia", last_name: "Ramírez", second_last_name: "Soto" },
  { id: "luis", first_name: "Luis", last_name: "Ramírez", second_last_name: "Soto" },
  { id: "ana", first_name: "Ana Sofía", last_name: "López", second_last_name: "Cruz" },
];

describe("celdas", () => {
  it("horas y rangos", () => {
    expect(toTime(new Date(Date.UTC(1899, 11, 30, 7, 30)))).toBe("07:30");
    expect(toTime(0.375)).toBe("09:00");
    expect(toTime("1:30 pm")).toBe("13:30");
    expect(toTimeRange("8:00 - 9:00")).toEqual(["08:00", "09:00"]);
    expect(toTimeRange("07.30 a 08.20 hrs")).toEqual(["07:30", "08:20"]);
    expect(toTimeRange("12:30–1:20")).toEqual(["12:30", "13:20"]);
    expect(toTimeRange("Lenguajes")).toBeNull();
  });
  it("fechas y montos", () => {
    expect(toDate("10/12/2026")).toBe("2026-12-10");
    expect(toDate(new Date(Date.UTC(2026, 11, 10)))).toBe("2026-12-10");
    expect(toDate(46366)).toBe("2026-12-10");
    expect(toAmount("$3,500.00")).toBe(3500);
    expect(toAmount("3 500")).toBe(3500);
    expect(toAmount("pagado")).toBeNull();
  });
});

describe("horario", () => {
  it("reconoce materias por nombre corto o con el maestro entre paréntesis", () => {
    expect(matchSubject("Saberes", subjects)).toBe("sab");
    expect(matchSubject("LENGUAJES (Mtra. Laura)", subjects)).toBe("len");
    expect(matchSubject("Ética", subjects)).toBe("eti");
    expect(matchSubject("Inglés", subjects)).toBeNull();
  });

  it("lee la tabla de días × horas, con recreo combinado y horas en dos columnas", () => {
    const sheet = [
      ["HORARIO 3° A"],
      ["Inicio", "Fin", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes"],
      [0.333333, 0.375, "Lenguajes", "Saberes", "Lenguajes", "Ética", "Inglés"],
      ["9:00", "10:00", "Saberes", "Lenguajes", "De lo Humano", "Lenguajes", "Saberes"],
      ["10:00", "10:30", "RECREO", null, null, null, null],
      ["10:30", "11:30", "Ética", "", "Saberes", "-", "Artes"],
    ];
    const p = parseSchedule(sheet, subjects);
    expect(p.error).toBeUndefined();
    expect(p.blocks.filter((b) => b.label === "RECREO")).toHaveLength(5);
    expect(p.blocks.find((b) => b.weekday === 1 && b.starts_at === "08:00")).toMatchObject({ ends_at: "09:00", subject_id: "len" });
    expect(p.blocks.find((b) => b.weekday === 3 && b.starts_at === "09:00")?.subject_id).toBe("hum");
    expect(p.asText.sort()).toEqual(["Artes", "Inglés", "RECREO"]);
    expect(p.blocks.some((b) => b.weekday === 2 && b.starts_at === "10:30")).toBe(false);
  });

  it("acepta el rango en una celda", () => {
    const p = parseSchedule([["Hora", "Lun", "Mar", "Mié", "Jue", "Vie"], ["7:30 - 8:20", "Lenguajes", "Lenguajes", "Lenguajes", "Lenguajes", "Lenguajes"]], subjects);
    expect(p.blocks).toHaveLength(5);
    expect(p.blocks[0]).toMatchObject({ starts_at: "07:30", ends_at: "08:20" });
  });

  it("explica si no hay días", () => {
    expect(parseSchedule([["a", "b"]], subjects).error).toMatch(/días/);
  });
});

describe("colegiaturas", () => {
  it("lista de cargos (como la exporta caja)", () => {
    const sheet = [
      ["Reporte de cobranza"],
      ["Alumno", "Concepto", "Importe", "Fecha límite", "Estatus", "Fecha de pago"],
      ["RAMIREZ SOTO NATALIA", "Colegiatura noviembre", "$3,500.00", "10/11/2026", "Pagado", "08/11/2026"],
      ["Ramírez Soto Luis", "Colegiatura noviembre", 3500, new Date(Date.UTC(2026, 10, 10)), "Pendiente", ""],
      ["López Cruz Ana Sofía", "Colegiatura noviembre", 3500, "10/11/2026", 1500, ""],
      ["Pedro Inventado", "Colegiatura noviembre", 3500, "10/11/2026", "Pagado", ""],
    ];
    const p = parseTuition(sheet, roster, { startYear: 2026 });
    expect(p.layout).toBe("cargos");
    expect(p.matched).toBe(3);
    expect(p.unmatched).toEqual([{ row: 6, text: "Pedro Inventado" }]);
    expect(p.rows.find((r) => r.student_id === "nat")).toMatchObject({ amount: 3500, paid: 3500, due_on: "2026-11-10", paid_on: "2026-11-08" });
    expect(p.rows.find((r) => r.student_id === "luis")).toMatchObject({ paid: 0, paid_on: null });
    expect(p.rows.find((r) => r.student_id === "ana")?.paid).toBe(1500);
  });

  it("tabla por meses con palomitas, montos y fechas", () => {
    const sheet = [
      ["Nombre", "Sep", "Oct", "Nov", "Dic", "Ene"],
      ["Natalia Ramírez Soto", "✓", "pagado", new Date(Date.UTC(2026, 10, 9)), "", ""],
      ["Luis Ramírez Soto", "x", 3500, "pendiente", null, null],
      ["Total", "", "", "", "", ""],
    ];
    const p = parseTuition(sheet, roster, { startYear: 2026, monthlyAmount: 3500, dueDay: 10 });
    expect(p.layout).toBe("meses");
    expect(p.needsAmount).toBe(false);
    expect(p.rows).toHaveLength(10);
    expect(p.rows.find((r) => r.student_id === "nat" && r.concept === "Colegiatura noviembre")).toMatchObject({ paid: 3500, paid_on: "2026-11-09", due_on: "2026-11-10" });
    expect(p.rows.find((r) => r.student_id === "nat" && r.concept === "Colegiatura enero")).toMatchObject({ paid: 0, due_on: "2027-01-10" });
    expect(p.rows.find((r) => r.student_id === "luis" && r.concept === "Colegiatura noviembre")?.paid).toBe(0);
  });

  it("pide la colegiatura mensual si la tabla no la trae", () => {
    const p = parseTuition([["Alumno", "Septiembre", "Octubre"], ["Natalia Ramírez", "si", "no"]], roster, { startYear: 2026 });
    expect(p.needsAmount).toBe(true);
    expect(p.rows).toHaveLength(0);
  });
});
