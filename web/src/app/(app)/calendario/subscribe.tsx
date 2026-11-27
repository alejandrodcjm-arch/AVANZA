"use client";

import { useState, useTransition } from "react";
import { Button, Card } from "@/components/ui";
import { newFeedToken } from "./actions";

type Links = { feedUrl: string; google: string; apple: string; outlook: string };

const btn = "inline-flex min-h-11 items-center justify-center rounded-xl px-4 font-semibold ring-1 ring-line bg-card hover:ring-brand";

export function SubscribeCard({ links, role }: { links: Links | null; role: "director" | "teacher" | "guardian" }) {
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();
  const includes =
    role === "teacher"
      ? "las fechas de la escuela, los eventos de sus grupos y sus clases de cada semana"
      : role === "guardian"
        ? "las fechas de la escuela, los exámenes y eventos del grupo de sus hijos y las fechas de pago (sin montos)"
        : "todas las fechas de la escuela";

  return (
    <Card id="sincronizar" className="scroll-mt-4 space-y-3">
      <div>
        <h2 className="text-lg font-semibold">Tenerlo en su calendario</h2>
        <p className="text-muted">Incluye {includes}. Se actualiza solo: no tiene que volver a hacer nada.</p>
      </div>
      {!links ? (
        <Button onClick={() => start(() => newFeedToken())} disabled={pending}>
          {pending ? "Preparando…" : "Activar"}
        </Button>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <a href={links.google} target="_blank" rel="noopener" className={btn}>
              Google Calendar
            </a>
            <a href={links.apple} className={btn}>
              iPhone / Mac
            </a>
            <a href={links.outlook} target="_blank" rel="noopener" className={btn}>
              Outlook
            </a>
            <button
              type="button"
              className={btn}
              onClick={async () => {
                await navigator.clipboard.writeText(links.feedUrl);
                setCopied(true);
              }}
            >
              {copied ? "Enlace copiado" : "Copiar enlace"}
            </button>
          </div>
          <details className="text-sm text-muted">
            <summary className="min-h-10 cursor-pointer content-center font-medium text-ink">¿Cómo funciona?</summary>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              <li>Google: se abre Google Calendar; confirme con «Agregar». En Android aparece en la app del celular en unos minutos.</li>
              <li>Google revisa los cambios cada varias horas (a veces hasta un día). Por eso los avisos importantes, como una suspensión, también le llegan por Avanza.</li>
              <li>Es un enlace privado. Si lo compartió por error, genere uno nuevo: el anterior deja de funcionar.</li>
            </ul>
            <button type="button" onClick={() => start(() => newFeedToken())} disabled={pending} className="mt-2 min-h-10 text-brand underline">
              {pending ? "Generando…" : "Generar enlace nuevo"}
            </button>
          </details>
        </>
      )}
    </Card>
  );
}
