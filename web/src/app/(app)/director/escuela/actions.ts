"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { env } from "@/lib/env";
import { staffWelcomeEmail } from "@/lib/notify/emails";
import { sendEmail } from "@/lib/notify/email";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { todayLocal } from "@/lib/time";

type Res = { ok: boolean; error: string };
const OK: Res = { ok: true, error: "" };

// Datos de la escuela -------------------------------------------------------------
const schoolSchema = z.object({
  name: z.string().trim().min(2).max(200),
  cct: z.string().trim().max(20).optional(),
  address: z.string().trim().max(300).optional(),
  privacy_email: z.union([z.email(), z.literal("")]).optional(),
  phone: z.string().trim().max(30).optional(),
});

export async function saveSchool(_p: Res, form: FormData): Promise<Res> {
  const { membership } = await requireRole("director");
  const parsed = schoolSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, error: "Revise los datos: el nombre es obligatorio y el correo debe ser válido." };
  const d = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase
    .from("schools")
    .update({ name: d.name, cct: d.cct || null, address: d.address || null, privacy_email: d.privacy_email || null, phone: d.phone || null })
    .eq("id", membership.schoolId);
  if (error) return { ok: false, error: "No se pudo guardar." };
  revalidatePath("/", "layout");
  return OK;
}

/** Publica una versión nueva del aviso: todas las familias deberán aceptarlo otra vez. */
export async function publishNoticeVersion(): Promise<Res> {
  const { membership } = await requireRole("director");
  const supabase = await createClient();
  const version = `${todayLocal()}`;
  const { error } = await supabase.from("schools").update({ privacy_notice_version: version }).eq("id", membership.schoolId);
  if (error) return { ok: false, error: "No se pudo publicar." };
  revalidatePath("/", "layout");
  return OK;
}

// Ciclo, periodos y materias -----------------------------------------------------------
const yearSchema = z.object({ name: z.string().trim().min(4).max(20), starts_on: z.iso.date(), ends_on: z.iso.date(), periods: z.enum(["trimestres", "bimestres", "semestres"]) });

function splitPeriods(start: string, end: string, n: number, label: string) {
  const s = new Date(`${start}T12:00:00Z`).getTime();
  const e = new Date(`${end}T12:00:00Z`).getTime();
  const step = (e - s) / n;
  return Array.from({ length: n }, (_, i) => {
    const a = new Date(s + step * i);
    const b = new Date(i === n - 1 ? e : s + step * (i + 1) - 86400000);
    return { name: `${label} ${i + 1}`, sort: i + 1, starts_on: a.toISOString().slice(0, 10), ends_on: b.toISOString().slice(0, 10) };
  });
}

export async function createYear(_p: Res, form: FormData): Promise<Res> {
  const { membership } = await requireRole("director");
  const parsed = yearSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success || parsed.data.ends_on <= parsed.data.starts_on) return { ok: false, error: "Revise el nombre y las fechas del ciclo." };
  const d = parsed.data;
  const supabase = await createClient();
  await supabase.from("school_years").update({ is_current: false }).eq("school_id", membership.schoolId).eq("is_current", true);
  const { data: y, error } = await supabase
    .from("school_years")
    .insert({ school_id: membership.schoolId, name: d.name, starts_on: d.starts_on, ends_on: d.ends_on, is_current: true })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.code === "23505" ? "Ya existe un ciclo con ese nombre." : "No se pudo crear el ciclo." };
  const n = d.periods === "trimestres" ? 3 : d.periods === "bimestres" ? 5 : 2;
  const label = d.periods === "trimestres" ? "Trimestre" : d.periods === "bimestres" ? "Bimestre" : "Semestre";
  const { error: pErr } = await supabase
    .from("periods")
    .insert(splitPeriods(d.starts_on, d.ends_on, n, label).map((p) => ({ ...p, school_id: membership.schoolId, school_year_id: y.id })));
  if (pErr) return { ok: false, error: "El ciclo se creó, pero no los periodos. Ajústelos abajo." };
  revalidatePath("/director", "layout");
  return OK;
}

export async function updatePeriod(periodId: string, _p: Res, form: FormData): Promise<Res> {
  await requireRole("director");
  const parsed = z.object({ name: z.string().trim().min(2).max(40), starts_on: z.iso.date(), ends_on: z.iso.date() }).safeParse(Object.fromEntries(form));
  if (!parsed.success || parsed.data.ends_on <= parsed.data.starts_on) return { ok: false, error: "Revise las fechas." };
  const supabase = await createClient();
  const { error } = await supabase.from("periods").update(parsed.data).eq("id", periodId);
  if (error) return { ok: false, error: "No se pudo guardar." };
  revalidatePath("/director/escuela/ciclo");
  return OK;
}

export async function addSubjects(names: string[]): Promise<Res> {
  const { membership } = await requireRole("director");
  const clean = [...new Set(names.map((n) => n.trim()).filter((n) => n.length >= 2 && n.length <= 80))];
  if (!clean.length) return { ok: false, error: "Escriba el nombre de la materia." };
  const supabase = await createClient();
  const { error } = await supabase.from("subjects").upsert(
    clean.map((name) => ({ school_id: membership.schoolId, name })),
    { onConflict: "school_id,name", ignoreDuplicates: true },
  );
  if (error) return { ok: false, error: "No se pudo guardar." };
  revalidatePath("/director/escuela/ciclo");
  return OK;
}

export async function addSubjectForm(_p: Res, form: FormData) {
  return addSubjects([String(form.get("name") ?? "")]);
}

export async function deleteSubject(id: string) {
  await requireRole("director");
  const supabase = await createClient();
  const { error } = await supabase.from("subjects").delete().eq("id", id);
  revalidatePath("/director/escuela/ciclo");
  return error ? { ok: false, error: "No se puede borrar: ya tiene calificaciones o tareas." } : OK;
}

// Grupos y maestros -----------------------------------------------------------------
export async function addGroup(_p: Res, form: FormData): Promise<Res> {
  const { membership } = await requireRole("director");
  const parsed = z.object({ grade: z.coerce.number().int().min(1).max(6), name: z.string().trim().min(1).max(10) }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, error: "Grado del 1 al 6 y letra del grupo." };
  const supabase = await createClient();
  const { data: y } = await supabase.from("school_years").select("id").eq("school_id", membership.schoolId).eq("is_current", true).maybeSingle();
  if (!y) return { ok: false, error: "Primero cree el ciclo escolar." };
  const { error } = await supabase.from("groups").insert({ school_id: membership.schoolId, school_year_id: y.id, grade: parsed.data.grade, name: parsed.data.name.toUpperCase() });
  if (error) return { ok: false, error: error.code === "23505" ? "Ese grupo ya existe." : "No se pudo crear." };
  revalidatePath("/director/escuela/grupos");
  return OK;
}

/** Reemplaza quién da cada materia en un grupo. assignments: {subjectId: teacherId | ""}; homeroom: teacherId titular. */
export async function saveGroupTeachers(groupId: string, assignments: Record<string, string>, homeroom: string): Promise<Res> {
  const { membership } = await requireRole("director");
  const ids = z.record(z.uuid(), z.union([z.uuid(), z.literal("")])).safeParse(assignments);
  if (!ids.success) return { ok: false, error: "Datos inválidos." };
  const supabase = await createClient();
  const rows = Object.entries(ids.data)
    .filter(([, t]) => t)
    .map(([subject_id, teacher_id]) => ({ school_id: membership.schoolId, group_id: groupId, subject_id, teacher_id, is_homeroom: teacher_id === homeroom }));
  const { error: delErr } = await supabase.from("teaching_assignments").delete().eq("group_id", groupId);
  if (delErr) return { ok: false, error: "No se pudo guardar." };
  if (rows.length) {
    // Que la titular quede marcada aunque solo dé una materia: basta una fila con is_homeroom.
    let marked = false;
    for (const r of rows) {
      if (r.is_homeroom && !marked) marked = true;
      else r.is_homeroom = false;
    }
    const { error } = await supabase.from("teaching_assignments").insert(rows);
    if (error) return { ok: false, error: "No se pudo guardar." };
  }
  revalidatePath("/director/escuela/grupos");
  return OK;
}

// Personal ----------------------------------------------------------------------------
const staffSchema = z.object({ full_name: z.string().trim().min(3).max(120), email: z.email(), role: z.enum(["teacher", "director"]) });

export async function addStaff(_p: Res, form: FormData): Promise<Res> {
  const { membership } = await requireRole("director");
  const parsed = staffSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, error: "Escriba nombre completo y un correo válido." };
  const { full_name, role } = parsed.data;
  const email = parsed.data.email.toLowerCase();
  const admin = createAdminClient();

  // Crear la cuenta si no existe (sin contraseña: entra con código).
  const created = await admin.auth.admin.createUser({ email, email_confirm: true, user_metadata: { full_name } });
  const userId = created.data.user?.id ?? (await findUserIdByEmail(admin, email));
  if (!userId) return { ok: false, error: "No se pudo crear la cuenta. Revise el correo." };

  // La membresía se crea con la sesión del director: RLS confirma que es director de esta escuela.
  const supabase = await createClient();
  const { error } = await supabase.from("memberships").insert({ school_id: membership.schoolId, user_id: userId, role });
  if (error && error.code !== "23505") return { ok: false, error: "No se pudo dar acceso." };

  const mail = staffWelcomeEmail({ name: full_name, schoolName: membership.schoolName, role, url: `${env().NEXT_PUBLIC_APP_URL}/entrar` });
  await sendEmail({ to: email, ...mail });
  revalidatePath("/director/personal");
  return OK;
}

async function findUserIdByEmail(admin: ReturnType<typeof createAdminClient>, email: string) {
  for (let page = 1; page <= 20; page++) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    const hit = data?.users.find((u) => u.email?.toLowerCase() === email);
    if (hit) return hit.id;
    if (!data || data.users.length < 200) return null;
  }
  return null;
}

export async function removeStaff(membershipId: string): Promise<Res> {
  const { session } = await requireRole("director");
  const supabase = await createClient();
  const { data: m } = await supabase.from("memberships").select("user_id, role").eq("id", membershipId).maybeSingle();
  if (!m) return { ok: false, error: "No encontrado." };
  if (m.user_id === session.userId && m.role === "director") return { ok: false, error: "No puede quitarse su propio acceso de dirección." };
  const { error } = await supabase.from("memberships").delete().eq("id", membershipId);
  if (error) return { ok: false, error: "No se pudo quitar el acceso." };
  revalidatePath("/director/personal");
  return OK;
}

// Alertas -----------------------------------------------------------------------------
export async function saveAlertRule(ruleId: string, _p: Res, form: FormData): Promise<Res> {
  await requireRole("director");
  const parsed = z
    .object({ threshold: z.coerce.number().min(0).max(100), window_days: z.coerce.number().int().min(7).max(365), enabled: z.enum(["on"]).optional() })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, error: "Revise los números." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("alert_rules")
    .update({ threshold: parsed.data.threshold, window_days: parsed.data.window_days, enabled: parsed.data.enabled === "on", updated_at: new Date().toISOString() })
    .eq("id", ruleId);
  if (error) return { ok: false, error: "No se pudo guardar." };
  revalidatePath("/director/escuela/alertas");
  return OK;
}

// ARCO --------------------------------------------------------------------------------
export async function answerArco(id: string, _p: Res, form: FormData): Promise<Res> {
  await requireRole("director");
  const parsed = z.object({ status: z.enum(["in_progress", "resolved", "rejected"]), response: z.string().trim().min(3).max(2000) }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, error: "Escriba la respuesta." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("arco_requests")
    .update({ ...parsed.data, resolved_at: parsed.data.status === "in_progress" ? null : new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: "No se pudo guardar." };
  revalidatePath("/director/escuela/arco");
  return OK;
}
