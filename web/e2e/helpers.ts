import { expect, type Page } from "@playwright/test";

const MAIL = process.env.MAIL_URL ?? "http://127.0.0.1:54324";

/** Lee el código de 6 dígitos del último correo (Mailpit de `supabase start`; respaldo para Inbucket). */
async function latestCode(email: string, after: number): Promise<string> {
  for (let i = 0; i < 30; i++) {
    try {
      const r = await fetch(`${MAIL}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}&limit=1`);
      if (r.ok) {
        const j = (await r.json()) as { messages?: { ID: string; Created: string; Subject: string }[] };
        const m = j.messages?.[0];
        if (m && new Date(m.Created).getTime() >= after - 2000) {
          const code = m.Subject.match(/\b(\d{6})\b/)?.[1];
          if (code) return code;
        }
      } else {
        const box = email.split("@")[0];
        const list = (await (await fetch(`${MAIL}/api/v1/mailbox/${box}`)).json()) as { id: string; subject: string; date: string }[];
        const m = list.at(-1);
        if (m && new Date(m.date).getTime() >= after - 2000) {
          const code = m.subject.match(/\b(\d{6})\b/)?.[1];
          if (code) return code;
        }
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`No llegó el código a ${email}`);
}

export async function login(page: Page, email: string) {
  await page.goto("/entrar");
  const started = Date.now();
  await page.getByLabel("Su correo").fill(email);
  await page.getByRole("button", { name: "Enviarme un código" }).click();
  await expect(page.getByLabel("Código")).toBeVisible();
  await page.getByLabel("Código").fill(await latestCode(email, started));
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/entrar"));
}
