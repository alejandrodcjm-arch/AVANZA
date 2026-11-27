# Avanza: seguimiento escolar por alumno

App (PWA) para escuelas privadas: cada familia sabe cada semana cómo va su hijo o hija con números exactos,
la maestra pasa lista en menos de un minuto y revisa un resumen mensual redactado con IA antes de que salga,
y dirección ve a tiempo a los alumnos que necesitan apoyo.

Nombre provisional: **Avanza**.

## Qué hay en este repositorio

| Carpeta | Contenido |
| --- | --- |
| `docs/` | Alcance, permisos, historias de usuario, pantallas, guía psicológica, decisiones, puesta en marcha, operación, investigación v2 (tareas, conducta, dirección) y v3 (calendario, horarios, colegiaturas). |
| `supabase/migrations/` | Base de datos: 32 tablas, permisos por fila (RLS), lógica (alertas, resúmenes, casos), tareas programadas. |
| `supabase/tests/database/` | 163 pruebas pgTAP de permisos y lógica. |
| `supabase/seed.sql` | Escuela de demostración: 90 alumnos, 3 grupos, asistencia y calificaciones del trimestre 1. |
| `web/` | App Next.js 16 (PWA): pantallas de familia, maestro y dirección; IA; avisos; importación de Excel. |
| `plantillas/` | Plantilla de Excel para importar alumnos y familias. |
| `.github/workflows/ci.yml` | Pruebas automáticas en cada cambio (incluye flujos completos con Supabase local). |

## Probar en su laptop

Necesita Node 22 y [Supabase CLI](https://supabase.com/docs/guides/local-development) con Docker Desktop.

```bash
supabase start                 # levanta Postgres, Auth y correo local; aplica migraciones y datos demo
supabase test db               # 163 pruebas de permisos y lógica
cd web
cp .env.example .env.local     # llene con lo que imprime `supabase status`
npm install
npm run dev                    # http://localhost:3000
```

Usuarios demo (el código llega al buzón local en http://127.0.0.1:54324):
`director@demo.mx`, `laura@demo.mx` (maestra 3°A), `jorge@demo.mx` (3°B y 3°C),
`papa@demo.mx` (dos hijos, aviso aceptado), `mama@demo.mx` (aún no acepta el aviso).

Pruebas de la app: `npm run lint && npm run typecheck && npm test && npm run build && npx playwright test`.

## Poner en producción

Paso a paso en [`docs/05-puesta-en-marcha.md`](docs/05-puesta-en-marcha.md). Cómo se opera el mes a mes en
[`docs/06-operacion.md`](docs/06-operacion.md).
