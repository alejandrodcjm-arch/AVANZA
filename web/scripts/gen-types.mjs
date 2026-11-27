// Genera src/lib/database.types.ts leyendo el esquema real de Postgres (mismo formato que `supabase gen types`).
// Uso: DATABASE_URL=postgres://... node scripts/gen-types.mjs
// Con Supabase CLI disponible también sirve: supabase gen types typescript --local > src/lib/database.types.ts
import pg from "pg";
import { writeFileSync } from "node:fs";

const client = new pg.Client({ connectionString: process.env.DATABASE_URL ?? "postgres:///avanza_test" });
await client.connect();

const q = async (sql, params = []) => (await client.query(sql, params)).rows;

const enums = await q(`
  select t.typname as name, array_agg(e.enumlabel order by e.enumsortorder) as labels
  from pg_type t join pg_enum e on e.enumtypid = t.oid join pg_namespace n on n.oid = t.typnamespace
  where n.nspname = 'public' group by t.typname order by t.typname`);
const enumNames = new Set(enums.map((e) => e.name));

function tsType(udt, isArray = false) {
  const base = udt.replace(/^_/, "");
  let t;
  if (enumNames.has(base)) t = `Database["public"]["Enums"]["${base}"]`;
  else if (["int2", "int4", "int8", "float4", "float8", "numeric"].includes(base)) t = "number";
  else if (base === "bool") t = "boolean";
  else if (["json", "jsonb"].includes(base)) t = "Json";
  else if (base === "void") t = "undefined";
  else t = "string";
  return isArray || udt.startsWith("_") ? `${t}[]` : t;
}

const columns = await q(`
  select c.table_name, c.column_name, c.udt_name, c.is_nullable = 'YES' as nullable,
         (c.column_default is not null or c.is_identity = 'YES') as has_default, t.table_type
  from information_schema.columns c
  join information_schema.tables t on t.table_schema = c.table_schema and t.table_name = c.table_name
  where c.table_schema = 'public' order by c.table_name, c.ordinal_position`);

const fks = await q(`
  select con.conname, cl.relname as table_name, rcl.relname as ref_table,
         array(select a.attname from unnest(con.conkey) k join pg_attribute a on a.attrelid = con.conrelid and a.attnum = k) as cols,
         array(select a.attname from unnest(con.confkey) k join pg_attribute a on a.attrelid = con.confrelid and a.attnum = k) as ref_cols,
         exists (select 1 from pg_constraint u where u.conrelid = con.conrelid and u.contype in ('u','p')
                 and u.conkey::int[] @> con.conkey::int[] and u.conkey::int[] <@ con.conkey::int[]) as one_to_one
  from pg_constraint con join pg_class cl on cl.oid = con.conrelid join pg_class rcl on rcl.oid = con.confrelid
  join pg_namespace n on n.oid = cl.relnamespace join pg_namespace rn on rn.oid = rcl.relnamespace
  where con.contype = 'f' and n.nspname = 'public' and rn.nspname = 'public' order by con.conname`);

const funcs = await q(`
  select p.proname as name, p.proretset as returns_set, rt.typname as ret,
         coalesce(p.proargnames, '{}') as arg_names, p.proargmodes as modes,
         array(select t.typname from unnest(p.proargtypes::oid[]) o join pg_type t on t.oid = o) as arg_types,
         p.pronargdefaults as n_defaults, p.pronargs as n_args
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace join pg_type rt on rt.oid = p.prorettype
  where n.nspname = 'public' and p.prokind = 'f'
    and rt.typname <> 'trigger'
    and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
  order by p.proname`);

const byTable = new Map();
for (const c of columns) {
  if (!byTable.has(c.table_name)) byTable.set(c.table_name, { type: c.table_type, cols: [] });
  byTable.get(c.table_name).cols.push(c);
}

const ind = (n) => "  ".repeat(n);
let out = `// Archivo generado por scripts/gen-types.mjs. No editar a mano.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
`;
const relFor = (table) =>
  fks
    .filter((f) => f.table_name === table)
    .map(
      (f) => `${ind(5)}{
${ind(6)}foreignKeyName: "${f.conname}";
${ind(6)}columns: [${f.cols.map((c) => `"${c}"`).join(", ")}];
${ind(6)}isOneToOne: ${f.one_to_one};
${ind(6)}referencedRelation: "${f.ref_table}";
${ind(6)}referencedColumns: [${f.ref_cols.map((c) => `"${c}"`).join(", ")}];
${ind(5)}},`,
    )
    .join("\n");

for (const [table, info] of byTable) {
  if (info.type !== "BASE TABLE") continue;
  const row = info.cols.map((c) => `${ind(5)}${c.column_name}: ${tsType(c.udt_name)}${c.nullable ? " | null" : ""};`).join("\n");
  const ins = info.cols
    .map((c) => `${ind(5)}${c.column_name}${c.nullable || c.has_default ? "?" : ""}: ${tsType(c.udt_name)}${c.nullable ? " | null" : ""};`)
    .join("\n");
  const upd = info.cols.map((c) => `${ind(5)}${c.column_name}?: ${tsType(c.udt_name)}${c.nullable ? " | null" : ""};`).join("\n");
  const rels = relFor(table);
  out += `${ind(3)}${table}: {
${ind(4)}Row: {
${row}
${ind(4)}};
${ind(4)}Insert: {
${ins}
${ind(4)}};
${ind(4)}Update: {
${upd}
${ind(4)}};
${ind(4)}Relationships: [${rels ? `\n${rels}\n${ind(4)}` : ""}];
${ind(3)}};
`;
}
out += `${ind(2)}};
${ind(2)}Views: {
`;
for (const [table, info] of byTable) {
  if (info.type !== "VIEW") continue;
  const row = info.cols.map((c) => `${ind(5)}${c.column_name}: ${tsType(c.udt_name)} | null;`).join("\n");
  out += `${ind(3)}${table}: {
${ind(4)}Row: {
${row}
${ind(4)}};
${ind(4)}Relationships: [];
${ind(3)}};
`;
}
out += `${ind(2)}};
${ind(2)}Functions: {
`;
for (const f of funcs) {
  const names = f.arg_names.slice(0, f.n_args);
  const firstDefault = f.n_args - f.n_defaults;
  const args = names.length
    ? `{ ${names.map((n, i) => `${n}${i >= firstDefault ? "?" : ""}: ${tsType(f.arg_types[i])}`).join("; ")} }`
    : "never";
  const ret = tsType(f.ret);
  out += `${ind(3)}${f.name}: { Args: ${args}; Returns: ${f.returns_set ? `${ret}[]` : ret} };\n`;
}
out += `${ind(2)}};
${ind(2)}Enums: {
`;
for (const e of enums) out += `${ind(3)}${e.name}: ${e.labels.map((l) => `"${l}"`).join(" | ")};\n`;
out += `${ind(2)}};
${ind(2)}CompositeTypes: { [_ in never]: never };
  };
};

type PublicSchema = Database["public"];
export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"];
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T];
`;

writeFileSync(new URL("../src/lib/database.types.ts", import.meta.url), out);
await client.end();
console.log(`Tipos generados: ${[...byTable.keys()].length} tablas/vistas, ${funcs.length} funciones, ${enums.length} enums`);
