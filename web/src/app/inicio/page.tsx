import { redirect } from "next/navigation";
import { ROLE_HOME, getSession } from "@/lib/auth";

export default async function Home() {
  const session = await getSession();
  if (!session) redirect("/entrar");
  if (!session.active) redirect("/sin-escuela");
  if (session.active.role === "guardian" && !session.hasConsent) redirect("/aviso-de-privacidad");
  redirect(ROLE_HOME[session.active.role]);
}
