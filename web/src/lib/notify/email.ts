import "server-only";
import { env } from "@/lib/env";

export type Email = { to: string; subject: string; text: string; html?: string };

/** Envía un correo con Resend. Sin llave (desarrollo) lo imprime en la consola. */
export async function sendEmail(mail: Email): Promise<{ ok: boolean; error?: string }> {
  const e = env();
  if (!e.RESEND_API_KEY) {
    console.info(`[correo de desarrollo] Para: ${mail.to}\nAsunto: ${mail.subject}\n\n${mail.text}\n`);
    return { ok: true };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${e.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: e.EMAIL_FROM, to: [mail.to], subject: mail.subject, text: mail.text, html: mail.html ?? textToHtml(mail.text) }),
  });
  if (!res.ok) return { ok: false, error: `${res.status} ${await res.text().catch(() => "")}` };
  return { ok: true };
}

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** HTML sencillo y legible en cualquier celular; los enlaces se vuelven botón. */
export function textToHtml(text: string) {
  const body = text
    .split(/\n{2,}/)
    .map((p) => {
      const url = p.trim().match(/^https?:\/\/\S+$/);
      if (url) {
        return `<p style="margin:24px 0"><a href="${escapeHtml(url[0])}" style="background:#1d4f57;color:#fff;padding:14px 22px;border-radius:10px;text-decoration:none;font-weight:600;display:inline-block">Abrir</a></p>`;
      }
      return `<p style="margin:0 0 14px">${escapeHtml(p).replace(/\n/g, "<br>")}</p>`;
    })
    .join("");
  return `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;font-size:16px;line-height:1.5;color:#1f2a2c;max-width:520px;margin:0 auto;padding:24px">${body}</div>`;
}
