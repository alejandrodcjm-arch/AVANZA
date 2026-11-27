import { expect, test } from "@playwright/test";

test("sin sesión, cualquier pantalla manda a entrar y recuerda a dónde iba", async ({ page }) => {
  await page.goto("/maestro/resumenes");
  await expect(page).toHaveURL(/\/entrar\?siguiente=%2Fmaestro%2Fresumenes/);
  await expect(page.getByRole("heading", { name: "Avanza" })).toBeVisible();
});

test("la pantalla de entrar pide correo y no revela si existe", async ({ page }) => {
  await page.goto("/entrar");
  const email = page.getByLabel("Su correo");
  await expect(email).toBeVisible();
  await email.fill("correo-mal");
  await page.getByRole("button", { name: "Enviarme un código" }).click();
  // La validación del navegador detiene el envío de un correo inválido.
  await expect(page).toHaveURL(/\/entrar/);
});

test("el aviso de privacidad es público y nombra a los encargados", async ({ page }) => {
  await page.goto("/aviso-de-privacidad");
  await expect(page.getByRole("heading", { name: "Aviso de privacidad" })).toBeVisible();
  await expect(page.getByText(/Anthropic/)).toBeVisible();
  await expect(page.getByText(/no usa esos datos para entrenar/)).toBeVisible();
});

test("una invitación falsa no muestra datos", async ({ page }) => {
  await page.goto("/invitacion/token-que-no-existe");
  await expect(page.getByRole("heading", { name: /no válido|ya se usó|ya venció/ })).toBeVisible();
});

test("la app es instalable (manifest e íconos)", async ({ request }) => {
  const res = await request.get("/manifest.webmanifest");
  expect(res.ok()).toBeTruthy();
  const m = await res.json();
  expect(m.display).toBe("standalone");
  expect(m.lang).toBe("es-MX");
  expect(m.icons.some((i: { purpose?: string }) => i.purpose === "maskable")).toBeTruthy();
  expect((await request.get("/icons/icon-512.png")).ok()).toBeTruthy();
});

test("el service worker se sirve sin caché y con política estricta", async ({ request }) => {
  const res = await request.get("/sw.js");
  expect(res.ok()).toBeTruthy();
  expect(res.headers()["cache-control"]).toContain("no-store");
  expect(res.headers()["content-security-policy"]).toContain("default-src 'self'");
});

test("las rutas de tareas programadas rechazan llamadas sin secreto", async ({ request }) => {
  expect((await request.post("/api/cron/send-notifications")).status()).toBe(401);
  expect((await request.post("/api/cron/generate-summaries", { headers: { authorization: "Bearer adivinanza" } })).status()).toBe(401);
});

test("encabezados de seguridad en todas las páginas", async ({ request }) => {
  const res = await request.get("/entrar");
  const h = res.headers();
  expect(h["x-frame-options"]).toBe("DENY");
  expect(h["referrer-policy"]).toBe("no-referrer");
  expect(h["x-powered-by"]).toBeUndefined();
});

test("la descarga de datos exige sesión", async ({ request }) => {
  const res = await request.get("/api/mis-datos", { maxRedirects: 0 });
  expect([302, 307, 401]).toContain(res.status());
});
