# Matriz de permisos

Esta matriz se implementa como políticas de Row Level Security en `supabase/migrations` y se prueba con pgTAP en `supabase/tests`. Si cambia algo aquí, cambian la migración y su prueba.

Roles por escuela (tabla `memberships`): `director`, `teacher`, `guardian`. El administrador de plataforma usa la llave de servicio solo desde el servidor y cada acción queda en bitácora.

| Recurso | Director | Maestro | Papá | Sin sesión |
| --- | --- | --- | --- | --- |
| Escuela (`schools`) | Ver y editar la suya | Ver la suya | Ver la suya | Nada |
| Ciclos, periodos, materias, grupos | Ver y editar | Ver | Ver los de sus hijos | Nada |
| Asignaciones de maestros | Ver y editar | Ver las suyas | Nada | Nada |
| Alumnos (`students`) | Ver y editar todos | Ver los de sus grupos | Ver sus hijos | Nada |
| Inscripciones | Ver y editar | Ver las de sus grupos | Ver las de sus hijos | Nada |
| Tutores de alumnos | Ver y editar | Ver los de sus alumnos | Ver los propios | Nada |
| Asistencia | Ver y corregir | Ver y capturar en sus grupos | Ver la de sus hijos | Nada |
| Calificaciones | Ver y corregir | Ver y capturar en sus materias | Ver las de sus hijos | Nada |
| Tareas y entregas | Ver | Ver y capturar en sus materias | Ver las de sus hijos | Nada |
| Reportes de conducta | Ver y editar | Ver y crear en sus alumnos | Ver los de sus hijos | Nada |
| Observaciones | Ver | Ver y crear en sus alumnos | Nada (solo vía resumen aprobado) | Nada |
| Notas sensibles | Ver | Solo las que creó | Nada | Nada |
| Reglas de alerta | Ver y editar | Ver | Nada | Nada |
| Alertas | Ver todas | Ver las de sus alumnos y descartarlas o convertirlas | Nada | Nada |
| Casos y acciones | Ver, asignar y cerrar | Ver y atender los de sus alumnos | Nada | Nada |
| Resúmenes mensuales | Ver todos | Ver, editar y aprobar los de sus alumnos | Ver los aprobados de sus hijos | Nada |
| Metas del mes | Ver | Ver las de sus alumnos | Ver y crear las de sus hijos | Nada |
| Notificaciones | Las propias | Las propias | Las propias | Nada |
| Consentimientos | Ver los de su escuela | Nada | Ver y crear los propios | Nada |
| Solicitudes ARCO | Ver y responder | Nada | Ver y crear las propias | Nada |
| Bitácora | Ver la de su escuela | Nada | Nada | Nada |
| Importaciones | Ver y crear | Nada | Nada | Nada |

## Reglas que no se negocian

1. RLS activo en todas las tablas del esquema `public`.
2. Ningún usuario ve datos de otra escuela.
3. Un papá solo ve a los alumnos ligados a él en `student_guardians`, y solo si ya dio su consentimiento.
4. Las notas sensibles nunca salen del servidor hacia la IA.
5. La señal "en riesgo" nunca se muestra al papá ni al alumno.
