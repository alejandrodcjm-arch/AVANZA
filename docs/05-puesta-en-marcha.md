# Puesta en marcha (producción)

Todo lo técnico ya está hecho y probado. Lo que sigue requiere cuentas a su nombre, pagos o firmas; por eso
lo hace usted. Tiempo estimado: una tarde. Costo fijo mensual aproximado: Vercel Pro 20 USD + Supabase Pro
25 USD + dominio + Claude API por uso (centavos por resumen).

## 1. Cuentas (todas con el mismo correo de la empresa)

1. **GitHub**: cree un repositorio privado y suba esta carpeta (`git remote add origin …` y `git push -u origin main`).
   Las pruebas de `.github/workflows/ci.yml` corren solas en cada cambio.
2. **Supabase**: proyecto nuevo, región **East US (North Virginia)** o la más cercana disponible; plan **Pro**
   (el gratuito se pausa a los 7 días sin uso y no tiene respaldos diarios).
3. **Vercel**: plan **Pro** (el gratuito no permite uso comercial). Importe el repositorio y en
   *Root Directory* elija `web`.
4. **Anthropic** (console.anthropic.com): cree una llave de API y ponga un límite de gasto mensual.
5. **Resend** (o Brevo): verifique su dominio (registros DNS que le indique) para enviar desde `avisos@sudominio.mx`.
6. **Dominio**: compre `sudominio.mx` y apúntelo a Vercel (`app.sudominio.mx`).

## 2. Base de datos

```bash
supabase login
supabase link --project-ref <ref-del-proyecto>
supabase db push          # aplica todas las migraciones
```

No cargue `seed.sql` en producción (son datos de demostración).

En el **SQL Editor** de Supabase, guarde los secretos para las tareas programadas:

```sql
select vault.create_secret('https://app.sudominio.mx', 'app_url');
select vault.create_secret('<CRON_SECRET>', 'cron_secret');  -- el mismo valor que pondrá en Vercel
```

Revise en *Integrations > Cron* que existan: `alertas-diarias`, `resumen-semanal`, `preparar-resumenes`,
`redactar-resumenes`, `enviar-avisos`, `limpieza-semanal`.

## 3. Autenticación (Supabase > Authentication)

- *Sign In / Providers > Email*: activado; **Allow new users to sign up: desactivado** (las cuentas las crea la escuela);
  *Confirm email*: desactivado; longitud del código: 6; vigencia: 900 segundos.
- *Emails > SMTP Settings*: configure Resend (host `smtp.resend.com`, puerto 465, usuario `resend`, contraseña = llave de Resend).
  Sin SMTP propio, Supabase solo manda correos al equipo del proyecto.
- *Emails > Templates > Magic Link*: asunto `Su código para entrar a Avanza: {{ .Token }}` y como cuerpo el contenido de
  `supabase/templates/codigo.html`.
- *URL Configuration*: Site URL `https://app.sudominio.mx`; Redirect URLs `https://app.sudominio.mx/auth/confirm`.

## 4. Variables en Vercel (Settings > Environment Variables)

Copie `web/.env.example` y llene:

| Variable | De dónde sale |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase > Project Settings > API Keys |
| `SUPABASE_SECRET_KEY` | Misma página (llave secreta). Nunca la comparta. |
| `NEXT_PUBLIC_APP_URL` | `https://app.sudominio.mx` |
| `CRON_SECRET` | Genere con `openssl rand -hex 32`; el mismo que guardó en Vault |
| `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` | Consola de Anthropic; modelo `claude-sonnet-5-5` |
| `RESEND_API_KEY`, `EMAIL_FROM` | Resend; `Avanza <avisos@sudominio.mx>` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | `npx web-push generate-vapid-keys`; `mailto:soporte@sudominio.mx` |

Redeploy después de guardar.

## 5. Primera escuela

En el SQL Editor (una sola vez por escuela):

```sql
insert into public.schools (name) values ('Colegio …') returning id;
```

Después, desde la app con el correo del director: en Supabase > Authentication > Users > *Add user* cree al
director (marque *Auto confirm*), y en SQL:

```sql
insert into public.memberships (school_id, user_id, role)
values ('<id de la escuela>', (select id from auth.users where email = 'director@colegio.mx'), 'director');
```

El director entra con su correo y el tablero le muestra los pasos: datos de la escuela, ciclo y materias,
importar alumnos (plantilla de Excel), dar de alta maestros y asignar grupos.

## 6. Antes del piloto (no técnico, obligatorio)

- **Abogado**: revisar el aviso de privacidad (`web/src/content/aviso.ts`) y el contrato escuela–Avanza
  (la escuela es responsable; Avanza es encargada). Después de cambios, el director publica la versión nueva.
- **Contrato y precio** con la escuela; acuerde por escrito las metas del piloto (`docs/00-alcance.md`).
- **Capacitación de 30 minutos** a maestros: pasar lista, calificaciones, revisar resúmenes.
- **Junta con familias** o mensaje de la dirección antes de enviar invitaciones: la activación sube mucho cuando
  la escuela lo presenta como suyo.
- **Prueba real con 2 o 3 maestras** durante una semana antes de invitar a todas las familias.
