# Registro de decisiones

| Fecha | Decisión | Por qué |
| --- | --- | --- |
| 2026-11-26 | TypeScript en todo el proyecto | Un solo lenguaje para una sola persona; los tipos atrapan errores. |
| 2026-11-26 | Next.js 16 (App Router) como app web PWA | Pantallas y servidor en un proyecto; línea 16.x con soporte activo. |
| 2026-11-26 | Supabase (Postgres, Auth, Storage, Cron, Edge Functions) | Backend administrado; permisos en la base de datos con RLS. |
| 2026-11-26 | Multiescuela con `school_id` en cada tabla y RLS | Aislar escuelas desde la base de datos, no desde la pantalla. |
| 2026-11-26 | Papás entran por enlace de un solo uso (OTP por correo) | Contraseñas olvidadas son la primera barrera de adopción. |
| 2026-11-26 | Información empujada (resumen semanal y notificaciones) en lugar de portal | Solo una cuarta parte de los papás usa portales que hay que visitar. |
| 2026-11-26 | Números calculados en SQL; la IA solo redacta | Evitar números inventados. |
| 2026-11-26 | API de Claude para los resúmenes | Términos comerciales prohíben entrenar con los datos enviados. |
| 2026-11-26 | Escala de calificaciones de 5 a 10, aprobatoria desde 6 | Escala oficial en México para educación básica. |
| 2026-11-26 | Zona horaria America/Mexico_City para fechas escolares; pg_cron en UTC | Durango usa la hora del centro; pg_cron programa en UTC. |
| 2026-11-26 | Sin puntos, insignias ni rankings | Ver guía psicológica. |
