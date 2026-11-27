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
| 2026-11-26 | Entrada con código de 6 dígitos (no enlace) | El enlace abre el navegador y no la app instalada; los filtros de correo escolares a veces "visitan" los enlaces y los gastan. |
| 2026-11-26 | Sin registro abierto: las cuentas las crea la escuela | La invitación crea la cuenta del papá; el alta de personal la crea dirección. Nadie ajeno puede registrarse. |
| 2026-11-26 | Next.js sin Cache Components | Todo es dato personal leído con la sesión del usuario; no se guarda en caché del servidor. |
| 2026-11-26 | IA y envío de avisos como rutas de la app (Vercel) llamadas por Supabase Cron | Un solo lugar para el código y las pruebas; las tareas de SQL (alertas, resumen semanal) corren en la base. |
| 2026-11-26 | Resumen mensual: 6 partes de la IA + cierre fijo, validador y aprobación obligatoria | El validador detecta números inventados, etiquetas, comparaciones y trato de "tú"; la maestra firma. |
| 2026-11-26 | Avisos: push si está activado, si no correo; silencio de 21:00 a 7:00 | Respeto al descanso familiar y canal de respaldo para quien no instala la app. |
| 2026-11-26 | Señales internas en ámbar, nunca rojo | Evitar alarma y etiquetas; "en riesgo" no aparece en ninguna pantalla. |
| 2026-11-26 | Reintento automático sin conexión (`experimental.useOffline`) | En salones con mala señal, pasar lista no se pierde. |
| 2026-11-26 | Tareas por corte semanal o Excel del maestro, no tarea por tarea | Evidencia de avisos semanales (Bergman y Chan) y ansiedad de portales en tiempo real; cero captura doble. |
| 2026-11-26 | Incidencias con lugar, hora, tipo y acción; texto para familia separado del interno | Reportes "Big 5" para dirección y privacidad de los otros niños. |
| 2026-11-26 | Alumno afectado no cuenta como reporte de conducta | No etiquetar a la víctima. |
| 2026-11-26 | Gráficas propias en SVG/HTML, una serie = un color validado | Sin librerías pesadas; colores revisados con validador de contraste y daltonismo. |
