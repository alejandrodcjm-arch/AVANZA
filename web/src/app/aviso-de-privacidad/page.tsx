import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { privacyNotice } from "@/content/aviso";
import { Button, Notice } from "@/components/ui";
import { acceptNotice } from "./actions";

export const metadata = { title: "Aviso de privacidad" };

export default async function NoticePage({ searchParams }: { searchParams: Promise<{ bienvenida?: string }> }) {
  const [{ bienvenida }, session] = await Promise.all([searchParams, getSession()]);
  let school = { name: "", address: null as string | null, privacyEmail: null as string | null, version: "vigente" };
  if (session?.active) {
    const supabase = await createClient();
    const { data } = await supabase.from("schools").select("name, address, privacy_email, privacy_notice_version").eq("id", session.active.schoolId).maybeSingle();
    if (data) school = { name: data.name, address: data.address, privacyEmail: data.privacy_email, version: data.privacy_notice_version };
  }
  const sections = privacyNotice(school);
  const mustAccept = Boolean(session?.active && !session.hasConsent);

  return (
    <main className="mx-auto max-w-2xl px-5 py-8">
      {bienvenida && <Notice tone="good">Listo, su cuenta quedó creada. Antes de ver la información, lea y acepte el aviso.</Notice>}
      <h1 className="mt-4 text-3xl font-bold">Aviso de privacidad</h1>
      {mustAccept && (
        <Card>
          <p className="font-semibold">En resumen</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
            <li>Solo usted y el personal de la escuela ven la información de su hijo o hija.</li>
            <li>No vendemos ni usamos sus datos para publicidad.</li>
            <li>La IA solo ayuda a redactar; la maestra o el maestro revisa todo antes de que le llegue.</li>
            <li>Puede descargar o pedir que se borren sus datos cuando quiera.</li>
          </ul>
        </Card>
      )}
      <div className="mt-6 space-y-6">
        {sections.map((s) => (
          <section key={s.h}>
            <h2 className="text-lg font-semibold">{s.h}</h2>
            {s.p.map((p, i) => (
              <p key={i} className="mt-2 leading-relaxed text-ink/90">
                {p}
              </p>
            ))}
          </section>
        ))}
      </div>
      {mustAccept ? (
        <form action={acceptNotice} className="sticky bottom-0 mt-8 bg-paper py-4">
          <Button full>Leí el aviso y acepto</Button>
          <p className="mt-2 text-center text-sm text-muted">Si no acepta, la escuela le seguirá informando por los medios de siempre.</p>
        </form>
      ) : (
        <a href="/inicio" className="mt-8 inline-block font-semibold text-brand underline">
          Volver
        </a>
      )}
    </main>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="mt-4 rounded-card bg-card p-5 ring-1 ring-line">{children}</div>;
}
