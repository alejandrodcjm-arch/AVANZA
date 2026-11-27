import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ siguiente?: string }> }) {
  const [{ siguiente }, session] = await Promise.all([searchParams, getSession()]);
  if (session) redirect("/inicio");
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-10">
      <img src="/icons/icon-192.png" alt="" width={56} height={56} className="mb-6 rounded-2xl" />
      <h1 className="text-3xl font-bold">Avanza</h1>
      <p className="mt-1 mb-8 text-muted">Cómo va cada alumno, cada semana. Sin contraseñas: le enviamos un código a su correo.</p>
      <LoginForm next={siguiente} />
      <p className="mt-10 text-sm text-muted">
        ¿Es mamá, papá o tutor y no tiene cuenta? Use el enlace de invitación que le envió la escuela o pídalo en dirección.
      </p>
      <a href="/aviso-de-privacidad" className="mt-3 text-sm font-medium text-brand underline">
        Aviso de privacidad
      </a>
    </main>
  );
}
