import Image from "next/image";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { InviteForm } from "./invite-form";

export const metadata = { title: "Invitación" };

type Preview = {
  valid: boolean;
  reason: "not_found" | "used" | "expired" | null;
  school_name?: string;
  student_first_name?: string;
  email?: string;
  full_name?: string;
};

function mask(email: string) {
  const [user, domain] = email.split("@");
  return `${user.slice(0, 2)}${"•".repeat(Math.max(2, user.length - 2))}@${domain}`;
}

export default async function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();
  const [{ data }, session] = await Promise.all([supabase.rpc("invitation_preview", { p_token: token }), getSession()]);
  const p = (data ?? { valid: false, reason: "not_found" }) as unknown as Preview;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-10">
      <Image src="/icons/icon-192.png" alt="" width={56} height={56} className="mb-6 rounded-2xl" />
      {p.valid ? (
        <>
          <h1 className="text-3xl font-bold">
            {p.full_name ? `Hola, ${p.full_name.split(" ")[0]}` : "Bienvenida, bienvenido"}
          </h1>
          <p className="mt-2 mb-8 text-lg text-muted">
            {p.school_name} le invita a seguir el avance de <strong className="text-ink">{p.student_first_name}</strong>: cada
            semana sabrá su asistencia y sus calificaciones, y qué puede hacer en casa para apoyarle.
          </p>
          <InviteForm token={token} maskedEmail={mask(p.email ?? "")} signedInAs={session?.email || undefined} />
        </>
      ) : (
        <>
          <h1 className="text-2xl font-bold">
            {p.reason === "used" ? "Esta invitación ya se usó" : p.reason === "expired" ? "Esta invitación ya venció" : "Enlace no válido"}
          </h1>
          <p className="mt-2 text-muted">
            {p.reason === "used"
              ? "Si usted ya la aceptó, solo entre con su correo."
              : "Pida a la escuela que le reenvíe la invitación. Llega a su correo en un minuto."}
          </p>
          <a href="/entrar" className="mt-6 font-semibold text-brand underline">
            Entrar con mi correo
          </a>
        </>
      )}
    </main>
  );
}
