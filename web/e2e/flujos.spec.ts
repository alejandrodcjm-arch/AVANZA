import { expect, test } from "@playwright/test";
import { login } from "./helpers";

// Requiere `supabase start` (aplica migraciones y seed.sql) y la app apuntando a él. Ver .github/workflows/ci.yml.
test.skip(!process.env.E2E_FULL, "Flujos completos: solo con E2E_FULL=1 y Supabase local");

test("papá con aviso aceptado ve a sus dos hijos con números exactos y sin comparaciones", async ({ page }) => {
  await login(page, "papa@demo.mx");
  await expect(page).toHaveURL(/\/hijos$/);
  await expect(page.getByRole("heading", { name: "Natalia" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Luis" })).toBeVisible();
  await page.getByRole("heading", { name: "Natalia" }).click();
  await expect(page.getByRole("heading", { name: /Asistencia en el/ })).toBeVisible();
  await expect(page.getByText(/nunca con otros alumnos/)).toBeVisible();
  const body = (await page.locator("main").innerText()).toLowerCase();
  for (const word of ["promedio del grupo", "en riesgo", "lugar en el grupo", "ranking"]) expect(body).not.toContain(word);
});

test("un papá no puede abrir la ficha de un alumno ajeno", async ({ page }) => {
  await login(page, "papa@demo.mx");
  await page.goto("/hijos/55555555-5555-5555-5555-000000000002");
  await expect(page.getByRole("heading", { name: "No encontramos esta página" })).toBeVisible();
});

test("mamá sin aviso aceptado no ve datos hasta aceptarlo", async ({ page }) => {
  await login(page, "mama@demo.mx");
  await expect(page).toHaveURL(/\/aviso-de-privacidad/);
  await page.goto("/hijos");
  await expect(page).toHaveURL(/\/aviso-de-privacidad/);
  await page.getByRole("button", { name: "Leí el aviso y acepto" }).click();
  await expect(page).toHaveURL(/\/hijos\//);
  await expect(page.getByRole("heading", { name: /Asistencia en el/ })).toBeVisible();
});

test("la maestra pasa lista tocando solo las excepciones", async ({ page }) => {
  await login(page, "laura@demo.mx");
  await expect(page).toHaveURL(/\/maestro$/);
  await expect(page.getByRole("heading", { name: "3°A" })).toBeVisible();
  // Un día hábil fijo del seed para que la prueba no dependa del día en que corre.
  await page.goto("/maestro/grupos/33333333-3333-3333-3333-333333333331/lista?fecha=2026-11-24");
  await expect(page.getByText(/presentes ·/)).toBeVisible();
  // El seed ya trae faltas ese día: se parte de "todos presentes" y se marca una sola.
  await page.getByRole("button", { name: "Todos presentes" }).click();
  await expect(page.getByText(/· 0 faltas ·/)).toBeVisible();
  await page.getByRole("button", { name: "Falta", exact: true }).first().click();
  await expect(page.getByText(/· 1 falta ·/)).toBeVisible();
  await page.getByRole("button", { name: /Guardar/ }).click();
  // Si falla, el mensaje real queda en el reporte.
  const msg = page.getByText(/^(Lista guardada\.|No se pudo.*|No da clase.*|Datos incompletos\.|No se puede.*)$/);
  await expect(msg).toBeVisible({ timeout: 10_000 });
  await expect(msg).toHaveText("Lista guardada.");
});

test("la maestra ve señales de apoyo con números y no puede ver el tablero del director", async ({ page }) => {
  await login(page, "laura@demo.mx");
  await page.goto("/maestro/alertas");
  await expect(page.getByRole("heading", { name: /necesitar apoyo/ })).toBeVisible();
  await page.goto("/director");
  await expect(page).not.toHaveURL(/\/director$/);
});

test("el director ve el tablero, las familias pendientes y la bitácora", async ({ page }) => {
  await login(page, "director@demo.mx");
  await expect(page).toHaveURL(/\/director$/);
  await expect(page.getByText("alumnos con familia activa")).toBeVisible();
  await page.goto("/director/escuela/bitacora");
  await expect(page.getByRole("heading", { name: "Bitácora" })).toBeVisible();
});

// Versión 2 ---------------------------------------------------------------------------

test("el papá ve su semana, reconocimientos y conducta", async ({ page }) => {
  await login(page, "papa@demo.mx");
  await page.getByRole("heading", { name: "Natalia" }).click();
  await expect(page.getByRole("heading", { name: "Esta semana" })).toBeVisible();
  await expect(page.getByRole("list", { name: "Asistencia de esta semana" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Conducta/ })).toBeVisible();
});

test("la maestra hace el corte semanal y da un reconocimiento", async ({ page }) => {
  await login(page, "laura@demo.mx");
  await page.goto("/maestro/grupos/33333333-3333-3333-3333-333333333331/pendientes");
  await expect(page.getByText(/al corriente ·/)).toBeVisible();
  await page.getByRole("button", { name: "Uno más" }).first().click();
  await page.getByRole("button", { name: /corte/ }).last().click();
  await expect(page.getByText(/Corte guardado/)).toBeVisible();

  await page.goto("/maestro/grupos/33333333-3333-3333-3333-333333333331/conducta");
  // Primer alumno del selector
  await page.locator("button[aria-pressed]").first().click();
  await page.getByRole("button", { name: /Esfuerzo/ }).click();
  await page.getByRole("button", { name: "Reconocer", exact: true }).click();
  await expect(page.getByText(/Reconocimiento guardado/)).toBeVisible();
});

test("el director ve los reportes y descarga el concentrado", async ({ page }) => {
  await login(page, "director@demo.mx");
  for (const [path, heading] of [
    ["/director/reportes/asistencia", "Asistencia diaria"],
    ["/director/reportes/calificaciones", "Avance de captura por maestro"],
    ["/director/reportes/convivencia", "¿Dónde?"],
  ] as const) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
  }
  await page.goto("/director/reportes/maestros");
  await expect(page.getByText("Laura Castillo")).toBeVisible();
  const res = await page.request.get("/api/reportes/concentrado?periodo=11111111-1111-1111-1111-111111111113");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("spreadsheetml");
});

// Versión 3 ---------------------------------------------------------------------------

test("el papá ve horario, calendario con fechas SEP y su estado de cuenta privado", async ({ page }) => {
  await login(page, "papa@demo.mx");
  await page.goto("/horario");
  await expect(page.getByRole("heading", { name: /Natalia/ })).toBeVisible();
  await expect(page.getByText("Recreo").first()).toBeVisible();

  await page.goto("/calendario?ver=todo");
  await expect(page.getByText("Vacaciones de invierno")).toBeVisible();
  await expect(page.getByText("Registro de calificaciones (SEP)")).toHaveCount(0);
  await page.getByRole("button", { name: "Activar" }).click();
  const google = page.getByRole("link", { name: "Google Calendar" });
  await expect(google).toBeVisible();
  const href = (await google.getAttribute("href"))!;
  const feed = decodeURIComponent(new URL(href).searchParams.get("cid")!).replace("webcal://", "http://").replace(/^http:\/\/[^/]+/, "");
  const ics = await page.request.get(feed);
  expect(ics.status()).toBe(200);
  const body = await ics.text();
  expect(body).toContain("BEGIN:VCALENDAR");
  expect(body).toContain("Fecha de pago: Colegiatura diciembre");
  expect(body).not.toMatch(/\$\s?\d|3,500|Importe/);

  await page.goto("/pagos");
  await expect(page.getByRole("heading", { name: "Natalia" })).toBeVisible();
  await expect(page.getByText("Al corriente")).toBeVisible();
  await expect(page.getByText("1 pago pendiente")).toBeVisible(); // Luis debe noviembre en el seed
  await expect(page.getByText("Cómo pagar")).toBeVisible();
});

test("la maestra agenda un examen; dirección ve horarios y cobranza; los maestros no ven pagos", async ({ page }) => {
  await login(page, "laura@demo.mx");
  await page.goto("/calendario");
  await page.getByText("Agendar examen o evento de su grupo").click();
  await page.getByLabel("Qué es").fill("Examen de lectura");
  await page.getByLabel("Fecha").fill("2026-12-15");
  await page.getByRole("button", { name: "Guardar en el calendario" }).click();
  await expect(page.getByText("Examen de lectura")).toBeVisible();
  await page.goto("/horario");
  await expect(page.getByRole("heading", { name: "Mi horario" })).toBeVisible();
  await page.goto("/director/colegiaturas");
  await expect(page).not.toHaveURL(/colegiaturas/);

  await page.context().clearCookies();
  await login(page, "director@demo.mx");
  await page.goto("/director/horarios");
  await expect(page.getByRole("button", { name: /Guardar horario de 3°A/ })).toBeVisible();
  await page.goto("/director/colegiaturas");
  await expect(page.getByRole("heading", { name: "Pagos vencidos" })).toBeVisible();
  await expect(page.getByText("de 90 alumnos con pagos vencidos")).toBeVisible();
});
