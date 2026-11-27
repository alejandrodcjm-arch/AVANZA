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
  await expect(page.getByText(/no con otros alumnos/)).toBeVisible();
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
