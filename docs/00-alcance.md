# Alcance del MVP

Nombre de trabajo: **Avanza** (provisional; verificar marca antes de usarlo públicamente).

## Problema

Los papás de escuelas privadas se enteran de cómo van sus hijos hasta la boleta, cuando ya es tarde. Los directores pierden alumnos sin ver venir la baja. Los maestros no tienen tiempo de avisar a cada familia.

## Qué hace el MVP

Una app web (PWA) donde:

1. La escuela carga sus grupos, alumnos y papás desde Excel.
2. El maestro captura asistencia, calificaciones, tareas no entregadas, reportes de conducta y observaciones desde el celular.
3. El papá ve una ficha clara de su hijo y recibe un resumen semanal y un resumen mensual escrito con IA y aprobado por el maestro.
4. El sistema detecta alertas tempranas (asistencia, conducta, calificaciones, tareas).
5. El director ve un tablero con alumnos en riesgo y da seguimiento a cada caso hasta cerrarlo.
6. Todo cumple con la Ley Federal de Protección de Datos Personales: consentimiento, derechos ARCO y bitácora.

## Qué entra

| Módulo | Entra en el MVP |
| --- | --- |
| Alta de escuela, ciclo, periodos, grupos, materias, maestros | Sí |
| Importación de alumnos y papás desde Excel con vista previa | Sí |
| Invitación a papás con enlace de un solo uso | Sí |
| Captura de asistencia, calificaciones, tareas, conducta, observaciones | Sí |
| Notas sensibles separadas | Sí |
| Ficha del alumno (papá, maestro, director) | Sí |
| Meta del mes elegida por papá e hijo | Sí |
| Motor de alertas con umbrales ajustables | Sí |
| Resumen semanal automático (sin IA) | Sí |
| Resumen mensual con IA, revisado por el maestro | Sí |
| Tablero del director y seguimiento de casos | Sí |
| Notificaciones push y respaldo por correo | Sí |
| Consentimiento, aviso de privacidad, ARCO, bitácora | Sí |

## Qué NO entra (va a `despues-del-piloto.md`)

- Tutor IA para alumnos.
- Admisiones y seguimiento de prospectos.
- Cobranza o pagos.
- Chat libre entre papás y maestros (solo botón para pedir cita).
- Apps nativas en tiendas.
- Integración con sistemas de control escolar existentes.
- Varios idiomas.

## Usuarios

| Rol | Quién es | Qué necesita |
| --- | --- | --- |
| Papá o tutor | Mamá, papá o tutor legal | Saber en 30 segundos cómo va su hijo y qué hacer |
| Maestro | Titular o maestro de materia | Capturar rápido y no tener más trabajo |
| Director | Director o coordinador académico | Ver a tiempo quién se puede ir y actuar |
| Admin de plataforma | Tú | Dar de alta escuelas y dar soporte |

## Métricas del piloto

- Porcentaje de días con asistencia capturada (meta: 90% o más).
- Porcentaje de papás que activan su cuenta (meta: 70% o más).
- Porcentaje de resúmenes mensuales aprobados a tiempo (meta: 90% o más).
- Alertas atendidas en menos de 7 días (meta: 80% o más).
- Asistencia y calificaciones antes y después del piloto.
