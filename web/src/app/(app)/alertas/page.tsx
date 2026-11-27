import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

/** Destino de los avisos de alertas: cada rol tiene su propia lista. */
export default async function AlertsRedirect() {
  const session = await getSession();
  redirect(session?.active?.role === "director" ? "/director" : "/maestro/alertas");
}
