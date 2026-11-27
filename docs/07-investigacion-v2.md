# Investigación v2: tareas, conducta y datos de dirección

## Tareas: por semana, no tarea por tarea
- Avisos automáticos a papás sobre tareas no entregadas (aviso semanal), faltas por clase y promedio bajo (mensual), sacados del registro del maestro, bajaron materias reprobadas ~38% y subieron asistencia 17% en 22 escuelas (Bergman y Chan; J-PAL). https://www.povertyactionlab.org/print/pdf/node/2353
- Portales con calificaciones en tiempo real aumentan ansiedad de alumnos y papás y los correos a maestros (Education Week, 2026). https://www.edweek.org/teaching-learning/online-portals-offer-instant-access-to-grades-thats-not-always-a-good-thing/2026/01
- Papás saturados por notificaciones y plataformas (Boston Globe, 2026).
- Regla en la app: corte semanal por materia (o Excel del maestro); la familia recibe el total por materia el viernes; el detalle por actividad es opcional y está escondido.

## Conducta: registro tipo SWIS/PBIS ("Big 5")
- Los equipos escolares revisan: cuántas incidencias por día y mes, de qué tipo, dónde, a qué hora y quiénes (SWIS, Skyward, Edutopia).
- Proporción recomendada de 4 reconocimientos por cada corrección (PBIS / CHAMPS).
- SEP: Acuerdo 14/12/23, protocolo de erradicación del acoso escolar con detección, notificación, intervención y seguimiento.
- Regla en la app: incidencia con fecha, hora, lugar, tipo, gravedad, acción; un registro por alumno con texto para su familia que no nombra a otros niños; afectados no cuentan como reporte; posible acoso abre caso con dirección; reconocimientos sin puntos ni rankings.

## Datos que usa dirección
- Asistencia (diaria, por grupo, ausentismo crónico ≥10%), calificaciones por grupo y materia ("concentrado"/"sábana"), reprobación, avance de captura antes de las fechas oficiales, convivencia, uso real por maestro (licencias sin uso son comunes).
- Los maestros ya llevan registros en Excel; la SEP misma permite carga masiva por plantilla. Por eso la app importa el Excel del maestro sin plantilla obligatoria.

## Pendiente evaluado (no implementado)
- Google Classroom: factible por API (estado de entrega, retraso, calificación; avisos por Pub/Sub), requiere Workspace for Education, revisión de permisos sensibles de Google y autorización del administrador de la escuela. Classroom ya envía a tutores resúmenes de tareas faltantes, sin calificaciones ni asistencia.
- Horarios y calendario con suscripción ICS (Google actualiza calendarios suscritos con poca frecuencia).
- Estado de cuenta de colegiaturas: solo visible para el tutor (Profeco prohíbe exhibir adeudos).
