"use client";

import { useEffect, useState } from "react";
import { Button, Notice } from "./ui";

type Status = "loading" | "unsupported" | "ios-needs-install" | "denied" | "off" | "on";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

/**
 * Activa las notificaciones. En iPhone, Safari solo permite push si la app se agregó a la pantalla de inicio
 * (iOS 16.4+), así que primero se explica cómo hacerlo.
 */
export function PushSetup({ vapidKey }: { vapidKey?: string }) {
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    queueMicrotask(detect);
    function detect() {
    const ua = navigator.userAgent;
    const isIOS = /iPhone|iPad|iPod/.test(ua) || (ua.includes("Mac") && "ontouchend" in document);
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone;
    if (isIOS && !standalone) return setStatus("ios-needs-install");
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !vapidKey) return setStatus("unsupported");
    if (Notification.permission === "denied") return setStatus("denied");
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setStatus(sub ? "on" : "off"))
      .catch(() => setStatus("off"));
    }
  }, [vapidKey]);

  async function enable() {
    setError("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return setStatus(permission === "denied" ? "denied" : "off");
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapidKey!) });
      const res = await fetch("/api/push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sub.toJSON()) });
      if (!res.ok) throw new Error();
      setStatus("on");
    } catch {
      setError("No se pudieron activar. Intente de nuevo o revise los permisos del navegador.");
    }
  }

  async function disable() {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await fetch("/api/push", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) });
      await sub.unsubscribe();
    }
    setStatus("off");
  }

  if (status === "loading") return <p className="text-muted">Revisando…</p>;
  if (status === "ios-needs-install")
    return (
      <div className="space-y-2">
        <p>En iPhone, primero agregue Avanza a su pantalla de inicio:</p>
        <ol className="list-decimal space-y-1 pl-5 text-ink/90">
          <li>Abra esta página en Safari.</li>
          <li>Toque el botón Compartir (el cuadro con flecha hacia arriba).</li>
          <li>Elija «Agregar a pantalla de inicio» y luego «Agregar».</li>
          <li>Abra Avanza desde el ícono nuevo y regrese aquí para activar los avisos.</li>
        </ol>
        <p className="text-sm text-muted">Mientras tanto, los avisos le llegan por correo.</p>
      </div>
    );
  if (status === "unsupported") return <p className="text-muted">Este navegador no permite notificaciones. Los avisos le llegan por correo.</p>;
  if (status === "denied")
    return <p className="text-muted">Las notificaciones están bloqueadas en este navegador. Puede permitirlas en la configuración del sitio. Mientras, le llegan por correo.</p>;
  return (
    <div className="space-y-2">
      {status === "on" ? (
        <>
          <Notice tone="good">Notificaciones activadas en este dispositivo.</Notice>
          <Button variant="ghost" onClick={disable}>
            Desactivar en este dispositivo
          </Button>
        </>
      ) : (
        <>
          <p className="text-muted">Le avisamos poco: el resumen semanal, el del mes y lo urgente. Nunca de noche.</p>
          <Button onClick={enable}>Activar notificaciones</Button>
        </>
      )}
      {error && <Notice tone="error">{error}</Notice>}
    </div>
  );
}
