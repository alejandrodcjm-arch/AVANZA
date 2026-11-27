import "server-only";
import { z } from "zod";

const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(10),
  SUPABASE_SECRET_KEY: z.string().min(10).optional(),
  NEXT_PUBLIC_APP_URL: z.url().default("http://localhost:3000"),
  CRON_SECRET: z.string().min(16).optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default("claude-sonnet-5-5"),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default("Avanza <avisos@example.com>"),
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().default("mailto:soporte@example.com"),
});

let cached: z.infer<typeof schema> | null = null;

/** Variables de entorno validadas. Falla con un mensaje claro si falta algo obligatorio. */
export function env() {
  if (cached) return cached;
  const parsed = schema.safeParse({
    ...process.env,
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY || undefined,
    CRON_SECRET: process.env.CRON_SECRET || undefined,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || undefined,
    RESEND_API_KEY: process.env.RESEND_API_KEY || undefined,
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || undefined,
    VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY || undefined,
  });
  if (!parsed.success) {
    const missing = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`Configuración incompleta. Revise .env.local: ${missing}`);
  }
  cached = parsed.data;
  return cached;
}
