import { describe, expect, it } from "vitest";
import { classifyCell, parseGradebook, type RosterStudent } from "../gradebook";

const roster: RosterStudent[] = [
  { id: "a", first_name: "Sofía", last_name: "Ramírez", second_last_name: "Soto" },
  { id: "b", first_name: "José Luis", last_name: "García", second_last_name: "Pérez" },
  { id: "c", first_name: "María José", last_name: "de la Cruz", second_last_name: null },
  { id: "d", first_name: "Mateo", last_name: "Hernández", second_last_name: "López" },
];

describe("registro de Excel del maestro", () => {
  it("lee un registro típico: título, encabezados y nombres 'Apellidos Nombre'", () => {
    const sheet = [
      ["ESCUELA PRIMARIA COLEGIO DEMO — 3° A — MATEMÁTICAS"],
      [],
      ["No.", "Nombre del alumno", "Tarea 1", "Tarea 2 (12/11/2026)", "Proyecto", "Promedio"],
      [1, "RAMIREZ SOTO SOFIA", "✓", "✓", 9, 9.2],
      [2, "GARCIA PEREZ JOSE LUIS", "X", "✓", 8, 7.5],
      [3, "DE LA CRUZ MARIA JOSE", "NE", "", 0, 6],
      [4, "HERNANDEZ LOPEZ MATEO", "✓", "X", 10, 9.8],
    ];
    const r = parseGradebook(sheet, roster);
    expect(r.error).toBeUndefined();
    expect(r.matched.map((m) => m.studentId).sort()).toEqual(["a", "b", "c", "d"]);
    expect(r.activities.map((a) => a.title)).toEqual(["Tarea 1", "Tarea 2 (12/11/2026)", "Proyecto"]);
    expect(r.activities[0].missing.sort()).toEqual(["b", "c"]);
    expect(r.activities[1].missing).toEqual(["d"]);
    expect(r.activities[1].dueOn).toBe("2026-11-12");
    expect(r.activities[2].missing).toEqual(["c"]); // 0 = no entregó
    expect(r.gradeColumn?.scores).toEqual({ a: 9.2, b: 7.5, c: 6, d: 9.8 });
  });

  it("acepta nombres separados en varias columnas y en orden 'Nombre Apellidos'", () => {
    const sheet = [
      ["Paterno", "Materno", "Nombre(s)", "Act 1", "Act 2"],
      ["Ramírez", "Soto", "Sofía", "si", "no"],
      ["García", "Pérez", "José Luis", "si", "si"],
      ["Mateo Hernández López", "", "", "entregó", "pendiente"],
      ["de la Cruz", "", "María José", "", "si"],
    ];
    const r = parseGradebook(sheet, roster);
    expect(r.matched).toHaveLength(4);
    expect(r.activities.find((a) => a.title === "Act 2")?.missing.sort()).toEqual(["a", "d"]);
  });

  it("calificación en escala 0–100 se convierte a 5–10", () => {
    const sheet = [
      ["Alumno", "Calificación final"],
      ["Ramírez Soto Sofía", 95],
      ["García Pérez José Luis", 42],
      ["De la Cruz María José", 70],
    ];
    const r = parseGradebook(sheet, roster);
    expect(r.gradeColumn?.scores).toEqual({ a: 9.5, b: 5, c: 7 });
  });

  it("la X puede significar 'entregó' si así lo usa la maestra", () => {
    const sheet = [
      ["Alumno", "Tarea"],
      ["Ramírez Soto Sofía", "x"],
      ["García Pérez José Luis", ""],
      ["De la Cruz María José", "x"],
    ];
    expect(parseGradebook(sheet, roster, { x: "x_delivered" }).activities[0].missing).toEqual([]);
    expect(parseGradebook(sheet, roster).activities[0].missing.sort()).toEqual(["a", "c"]);
  });

  it("ignora columnas de número de lista, faltas y observaciones", () => {
    const sheet = [
      ["#", "Alumno", "Faltas", "Observaciones", "Tarea"],
      [1, "Ramírez Soto Sofía", 2, "Muy participativa", "✓"],
      [2, "García Pérez José Luis", 0, "Platica mucho", "✓"],
      [3, "De la Cruz María José", 1, "Excelente actitud", "X"],
    ];
    expect(parseGradebook(sheet, roster).activities.map((a) => a.title)).toEqual(["Tarea"]);
  });

  it("reporta alumnos del archivo que no están en el grupo y alumnos del grupo que faltan en el archivo", () => {
    const sheet = [
      ["Alumno", "Tarea"],
      ["Ramírez Soto Sofía", "✓"],
      ["Pedro Infante Cruz", "✓"],
      ["García Pérez José Luis", "✓"],
      ["De la Cruz María José", "X"],
    ];
    const r = parseGradebook(sheet, roster);
    expect(r.unmatched.map((u) => u.text)).toEqual(["Pedro Infante Cruz"]);
    expect(r.notInFile).toEqual(["d"]);
  });

  it("si no reconoce nombres, lo dice en lugar de inventar", () => {
    const r = parseGradebook([["a", "b"], [1, 2]], roster);
    expect(r.error).toMatch(/No reconocimos/);
  });

  it("clasifica marcas comunes", () => {
    expect(["✓", "si", "E", 10, "entregó"].map((v) => classifyCell(v))).toEqual(Array(5).fill("delivered"));
    expect(["NE", "np", 0, "-", "✗", "No entregó"].map((v) => classifyCell(v))).toEqual(Array(6).fill("missing"));
    expect(classifyCell("")).toBe("blank");
  });
});

describe("celdas vacías", () => {
  it("por defecto no cuentan como no entregado; la maestra puede decidir que sí", () => {
    const sheet = [
      ["Alumno", "Tarea"],
      ["Ramírez Soto Sofía", "✓"],
      ["García Pérez José Luis", ""],
      ["De la Cruz María José", "✓"],
    ];
    expect(parseGradebook(sheet, roster).activities[0].missing).toEqual([]);
    expect(parseGradebook(sheet, roster, { blankIsMissing: true }).activities[0].missing).toEqual(["b"]);
  });
});
