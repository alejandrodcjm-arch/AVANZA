import { describe, expect, it } from "vitest";
import { parseRoster, previewStats } from "../roster";

const H = ["grado", "grupo", "nombre", "apellido_paterno", "apellido_materno", "tutor1_nombre", "tutor1_correo", "tutor1_parentesco", "tutor2_nombre", "tutor2_correo", "tutor2_parentesco"];

describe("importación de alumnos", () => {
  it("lee la plantilla oficial", () => {
    const r = parseRoster([H, [3, "a", "Sofía", "Ramírez", "Soto", "Roberto Ramírez", "Papa@Correo.MX", "padre", "", "", ""]]);
    expect(r.errors).toEqual([]);
    expect(r.rows[0]).toMatchObject({ grado: 3, grupo: "A", nombre: "Sofía", tutores: [{ correo: "papa@correo.mx", parentesco: "padre" }] });
  });

  it("acepta encabezados con acentos, mayúsculas y sinónimos", () => {
    const r = parseRoster([["Grado", "Grupo", "Nombre(s)", "Primer apellido", "Segundo apellido", "Correo tutor"], ["2°", "B", "ANA", "LÓPEZ", "DÍAZ", "a@b.mx"]]);
    expect(r.errors).toEqual([]);
    expect(r.rows[0]).toMatchObject({ grado: 2, nombre: "Ana", apellido_paterno: "López", apellido_materno: "Díaz" });
  });

  it("respeta nombres que no vienen en mayúsculas", () => {
    expect(parseRoster([H, [1, "A", "María José", "de la Cruz", "", "", "x@y.mx", "", "", "", ""]]).rows[0].apellido_paterno).toBe("de la Cruz");
  });

  it("marca errores por renglón sin detener el resto", () => {
    const r = parseRoster([H, [9, "A", "Luis", "Paz", "", "", "", "", "", "", ""], [1, "A", "", "Paz", "", "", "", "", "", "", ""], [1, "A", "Eva", "Paz", "", "", "correo-malo", "", "", "", ""], [1, "A", "Iker", "Paz", "", "", "i@p.mx", "", "", "", ""]]);
    expect(r.errors.map((e) => e.row)).toEqual([2, 3, 4]);
    expect(r.errors[0].message).toMatch(/grado/);
    expect(r.errors[2].message).toMatch(/correo/);
    expect(r.rows).toHaveLength(1);
  });

  it("detecta alumnos repetidos en el archivo", () => {
    const r = parseRoster([H, [1, "A", "Eva", "Paz", "", "", "e@p.mx", "", "", "", ""], [1, "B", "eva", "PAZ", "", "", "e@p.mx", "", "", "", ""]]);
    expect(r.errors[0].message).toMatch(/repetido.*renglón 2/);
  });

  it("avisa (sin bloquear) cuando no hay correo de tutor", () => {
    const r = parseRoster([H, [1, "A", "Eva", "Paz", "", "Juan Paz", "", "", "", "", ""]]);
    expect(r.errors).toEqual([]);
    expect(r.warnings.length).toBe(2);
  });

  it("ignora renglones vacíos y quita tutores repetidos", () => {
    const r = parseRoster([H, [], ["", "", ""], [1, "A", "Eva", "Paz", "", "Ana", "a@p.mx", "mamá", "Ana", "A@P.mx", "madre"]]);
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0].tutores).toEqual([{ nombre: "Ana", correo: "a@p.mx", parentesco: "madre" }]);
  });

  it("rechaza hojas sin las columnas mínimas", () => {
    expect(parseRoster([["nombre", "correo"], ["Eva", "e@p.mx"]]).errors[0].message).toMatch(/Faltan columnas/);
  });

  it("resume grupos y tutores únicos para la vista previa", () => {
    const r = parseRoster([H, [1, "A", "Eva", "Paz", "", "", "m@p.mx", "", "", "", ""], [2, "A", "Leo", "Paz", "", "", "m@p.mx", "", "", "", ""]]);
    expect(previewStats(r.rows)).toEqual({ students: 2, groups: [["1°A", 1], ["2°A", 1]], guardians: 1 });
  });
});
