import { devices, test } from "@playwright/test";
import { login } from "./helpers";

// Capturas de las pantallas principales con los datos de prueba (se revisan a ojo; CI las guarda como artefacto).
test.skip(!process.env.E2E_FULL, "Solo con Supabase local");
test.use({ ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } });

const SHOTS: Record<string, string[]> = {
  "director@demo.mx": ["/director", "/director/horarios", "/director/horarios?todos=1", "/director/colegiaturas", "/calendario", "/director/reportes/asistencia"],
  "laura@demo.mx": ["/maestro", "/horario"],
  "papa@demo.mx": ["/hijos", "/hijos/55555555-5555-5555-5555-000000000001", "/horario", "/pagos"],
};

for (const [email, paths] of Object.entries(SHOTS)) {
  test(`capturas ${email}`, async ({ page }) => {
    test.setTimeout(120_000);
    await login(page, email);
    for (const path of paths) {
      const name = `${email.split("@")[0]}${path.replace(/[/?=&]+/g, "_")}`;
      for (const [w, h, tag] of [[1440, 900, "pc"], [390, 844, "cel"]] as const) {
        await page.setViewportSize({ width: w, height: h });
        await page.goto(path);
        await page.waitForLoadState("networkidle");
        await page.waitForTimeout(400);
        await page.screenshot({ path: `capturas/${name}-${tag}.png`, fullPage: true });
      }
    }
  });
}
