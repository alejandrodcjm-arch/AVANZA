import { z } from "zod";

/** Fila lista para public.import_roster. */
export type RosterRow = {
  grado: number;
  grupo: string;
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string;
  tutores: { nombre: string; correo: string; parentesco: "madre" | "padre" | "tutor" }[];
};

export type RowError = { row: number; message: string };
export type ParseResult = { rows: RosterRow[]; errors: RowError[]; warnings: RowError[] };

const REQUIRED = ["grado", "grupo", "nombre", "apellido_paterno"] as const;

const normalize = (s: unknown) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[()]/g, "")
    .replace(/[\s.-]+/g, "_");

// Encabezados que la gente escribe en lugar de los de la plantilla.
const ALIASES: Record<string, string> = {
  grado_escolar: "grado", grupo_escolar: "grupo", nombres: "nombre", nombre_s: "nombre", nombres_s: "nombre",
  primer_apellido: "apellido_paterno", paterno: "apellido_paterno", ap_paterno: "apellido_paterno",
  segundo_apellido: "apellido_materno", materno: "apellido_materno", ap_materno: "apellido_materno",
  correo_tutor: "tutor1_correo", email_tutor: "tutor1_correo", nombre_tutor: "tutor1_nombre",
};

const clean = (v: unknown) => String(v ?? "").replace(/\s+/g, " ").trim();
const titleCase = (s: string) =>
  s.toLocaleLowerCase("es-MX").replace(/(^|[\s-])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toLocaleUpperCase("es-MX"));
// Si viene todo en mayúsculas ("MARÍA JOSÉ"), se ve mejor como "María José"; si no, se respeta.
const nice = (s: string) => (s && s === s.toUpperCase() ? titleCase(s) : s);

const email = z.email();

/** Convierte las filas de la hoja (primera fila = encabezados) en alumnos válidos y errores por renglón. */
export function parseRoster(sheet: unknown[][]): ParseResult {
  const errors: RowError[] = [];
  const warnings: RowError[] = [];
  const rows: RosterRow[] = [];
  if (!sheet.length) return { rows, errors: [{ row: 1, message: "La hoja está vacía." }], warnings };

  const header = sheet[0].map((h) => {
    const n = normalize(h);
    return ALIASES[n] ?? n;
  });
  const missing = REQUIRED.filter((c) => !header.includes(c));
  if (missing.length) {
    return { rows, errors: [{ row: 1, message: `Faltan columnas: ${missing.join(", ")}. Use la plantilla.` }], warnings };
  }
  const col = (r: unknown[], name: string) => {
    const i = header.indexOf(name);
    return i === -1 ? "" : clean(r[i]);
  };

  const seen = new Map<string, number>();
  for (let i = 1; i < sheet.length; i++) {
    const r = sheet[i];
    const line = i + 1;
    if (!r || r.every((c) => clean(c) === "")) continue;

    const gradeRaw = col(r, "grado").replace(/[°º]/g, "");
    const grado = Number(gradeRaw);
    const grupo = col(r, "grupo").toUpperCase();
    const nombre = nice(col(r, "nombre"));
    const paterno = nice(col(r, "apellido_paterno"));
    const materno = nice(col(r, "apellido_materno"));

    const problems: string[] = [];
    if (!Number.isInteger(grado) || grado < 1 || grado > 6) problems.push(`grado "${gradeRaw}" debe ser un número del 1 al 6`);
    if (!grupo || grupo.length > 10) problems.push("falta el grupo");
    if (!nombre) problems.push("falta el nombre");
    if (!paterno) problems.push("falta el apellido paterno");

    const tutores: RosterRow["tutores"] = [];
    for (const n of [1, 2]) {
      const correo = col(r, `tutor${n}_correo`).toLowerCase();
      const tNombre = nice(col(r, `tutor${n}_nombre`));
      const parRaw = normalize(col(r, `tutor${n}_parentesco`));
      if (!correo) {
        if (tNombre) warnings.push({ row: line, message: `El tutor ${n} (${tNombre}) no tiene correo; no se le podrá invitar.` });
        continue;
      }
      if (!email.safeParse(correo).success) {
        problems.push(`el correo del tutor ${n} "${correo}" no es válido`);
        continue;
      }
      const parentesco = parRaw === "madre" || parRaw === "mama" ? "madre" : parRaw === "padre" || parRaw === "papa" ? "padre" : "tutor";
      if (!tutores.some((t) => t.correo === correo)) tutores.push({ nombre: tNombre, correo, parentesco });
    }
    if (!tutores.length && !problems.length) warnings.push({ row: line, message: `${nombre} ${paterno} no tiene tutor con correo.` });

    if (problems.length) {
      errors.push({ row: line, message: problems.join("; ") });
      continue;
    }

    const key = normalize(`${nombre} ${paterno} ${materno}`);
    if (seen.has(key)) {
      errors.push({ row: line, message: `${nombre} ${paterno} ${materno} está repetido (también en el renglón ${seen.get(key)}).` });
      continue;
    }
    seen.set(key, line);
    rows.push({ grado, grupo, nombre, apellido_paterno: paterno, apellido_materno: materno, tutores });
  }

  if (!rows.length && !errors.length) errors.push({ row: 2, message: "No hay alumnos en la hoja." });
  return { rows, errors, warnings };
}

/** Resumen para la vista previa: alumnos por grupo y tutores únicos. */
export function previewStats(rows: RosterRow[]) {
  const groups = new Map<string, number>();
  const emails = new Set<string>();
  for (const r of rows) {
    const g = `${r.grado}°${r.grupo}`;
    groups.set(g, (groups.get(g) ?? 0) + 1);
    r.tutores.forEach((t) => emails.add(t.correo));
  }
  return {
    students: rows.length,
    groups: [...groups.entries()].sort(([a], [b]) => a.localeCompare(b, "es")),
    guardians: emails.size,
  };
}
