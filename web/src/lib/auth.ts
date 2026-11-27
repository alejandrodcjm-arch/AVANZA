import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/lib/database.types";

export type Role = Enums<"member_role">;
export const CTX_COOKIE = "avanza_ctx";

export type Membership = {
  id: string;
  role: Role;
  schoolId: string;
  schoolName: string;
  noticeVersion: string;
};

export type Session = {
  userId: string;
  email: string;
  fullName: string;
  memberships: Membership[];
  active: Membership | null;
  /** El usuario aceptó el aviso de privacidad vigente de la escuela activa. */
  hasConsent: boolean;
};

const ROLE_PRIORITY: Role[] = ["director", "teacher", "guardian"];

export const ROLE_HOME: Record<Role, string> = {
  director: "/director",
  teacher: "/maestro",
  guardian: "/hijos",
};

export const ROLE_LABEL: Record<Role, string> = {
  director: "Dirección",
  teacher: "Maestro(a)",
  guardian: "Mamá, papá o tutor",
};

/** Sesión del usuario actual (una vez por petición). null si no hay sesión. */
export const getSession = cache(async (): Promise<Session | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;

  const [{ data: rows }, { data: profile }] = await Promise.all([
    supabase.from("memberships").select("id, role, school_id, schools(name, privacy_notice_version)").eq("user_id", claims.sub),
    supabase.from("profiles").select("full_name").eq("id", claims.sub).maybeSingle(),
  ]);

  const memberships: Membership[] = (rows ?? [])
    .map((m) => ({
      id: m.id,
      role: m.role,
      schoolId: m.school_id,
      schoolName: m.schools?.name ?? "",
      noticeVersion: m.schools?.privacy_notice_version ?? "",
    }))
    .sort((a, b) => ROLE_PRIORITY.indexOf(a.role) - ROLE_PRIORITY.indexOf(b.role));

  const chosen = (await cookies()).get(CTX_COOKIE)?.value;
  const active = memberships.find((m) => m.id === chosen) ?? memberships[0] ?? null;

  let hasConsent = false;
  if (active) {
    const { data: consent } = await supabase
      .from("consents")
      .select("id")
      .eq("user_id", claims.sub)
      .eq("school_id", active.schoolId)
      .eq("notice_version", active.noticeVersion)
      .maybeSingle();
    hasConsent = Boolean(consent);
  }

  return {
    userId: claims.sub,
    email: (claims.email as string | undefined) ?? "",
    fullName: profile?.full_name ?? "",
    memberships,
    active,
    hasConsent,
  };
});

/**
 * Exige sesión con alguno de los roles dados en la escuela activa.
 * Los papás deben haber aceptado el aviso de privacidad vigente antes de ver cualquier dato.
 */
export async function requireRole(...roles: Role[]) {
  const session = await getSession();
  if (!session) redirect("/entrar");
  const active = session.active;
  if (!active) redirect("/sin-escuela");
  if (!roles.includes(active.role)) {
    const other = session.memberships.find((m) => roles.includes(m.role));
    if (!other) redirect(ROLE_HOME[active.role]);
    redirect(`/cambiar-rol?a=${other.id}&siguiente=${ROLE_HOME[other.role]}`);
  }
  if (active.role === "guardian" && !session.hasConsent) redirect("/aviso-de-privacidad");
  return { session, membership: active };
}
