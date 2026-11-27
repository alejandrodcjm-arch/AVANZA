import Link from "next/link";
import { PushSetup } from "@/components/push-setup";
import { Card, PageHeader, cx } from "@/components/ui";
import { ROLE_HOME, ROLE_LABEL, getSession } from "@/lib/auth";
import { ArcoForm, NameForm } from "./forms";

export const metadata = { title: "Cuenta" };

export default async function AccountPage() {
  const session = (await getSession())!;
  return (
    <>
      <PageHeader title="Cuenta" subtitle={session.email} />
      <div className="space-y-4">
        <Card>
          <h2 className="mb-3 font-semibold">Notificaciones en este celular</h2>
          <PushSetup vapidKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY} />
        </Card>

        <Card>
          <NameForm name={session.fullName} />
        </Card>

        {session.memberships.length > 1 && (
          <Card id="rol">
            <h2 className="mb-2 font-semibold">Entrar como</h2>
            <ul className="space-y-2">
              {session.memberships.map((m) => (
                <li key={m.id}>
                  <Link
                    href={`/cambiar-rol?a=${m.id}&siguiente=${ROLE_HOME[m.role]}`}
                    className={cx("flex min-h-12 items-center justify-between rounded-xl px-4 ring-1 ring-line", m.id === session.active?.id && "bg-brand-soft ring-brand")}
                  >
                    <span>{ROLE_LABEL[m.role]}</span>
                    <span className="text-sm text-muted">{m.schoolName}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}

        <Card>
          <h2 className="font-semibold">Mis datos</h2>
          <p className="mt-1 text-muted">Puede descargar todo lo que la app tiene de usted{session.active?.role === "guardian" ? " y de sus hijos" : ""}, o pedir que se corrija o se borre.</p>
          <a href="/api/mis-datos" className="mt-3 inline-flex min-h-12 items-center font-semibold text-brand underline">
            Descargar mis datos
          </a>
          <div className="mt-4 border-t border-line pt-4">
            <ArcoForm />
          </div>
          <Link href="/aviso-de-privacidad" className="mt-4 inline-flex min-h-10 items-center text-sm text-brand underline">
            Leer el aviso de privacidad
          </Link>
        </Card>

        <form action="/salir" method="post">
          <button className="min-h-12 w-full rounded-xl font-semibold text-muted ring-1 ring-line">Salir</button>
        </form>
      </div>
    </>
  );
}
