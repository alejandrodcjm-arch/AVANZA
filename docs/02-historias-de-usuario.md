# Historias de usuario y criterios de aceptación

Formato: "Como [rol] quiero [acción] para [beneficio]", con criterios "Dado / Cuando / Entonces". Cada criterio se vuelve una prueba automática.

## Director

**H1. Importar alumnos y papás desde Excel.** Como director quiero subir mi Excel de alumnos para no capturarlos uno por uno.
- Dado un archivo con la plantilla oficial, cuando lo subo, entonces veo una vista previa con cada fila marcada como válida o con su error.
- Dado un archivo con errores, cuando confirmo, entonces solo se cargan las filas válidas y descargo la lista de errores.
- Dado que vuelvo a subir el mismo archivo, cuando confirmo, entonces no se duplican alumnos ni papás.

**H2. Ver quién necesita apoyo.** Como director quiero ver en una pantalla a los alumnos con alertas abiertas para actuar antes de una baja.
- Dado que hay alertas abiertas, cuando abro el tablero, entonces veo alumnos ordenados por número de alertas y días sin atender.
- Dado un grupo, cuando filtro, entonces veo solo sus alumnos.

**H3. Dar seguimiento a un caso.** Como director quiero asignar una acción con fecha y registrar el resultado para que ningún caso se pierda.
- Dado un caso abierto, cuando asigno "cita con papás" con fecha, entonces el responsable lo ve en su lista.
- Dado un caso sin resultado tras su fecha, cuando abro el tablero, entonces aparece como vencido.

**H4. Ajustar umbrales.** Como director quiero cambiar los umbrales de alerta para adaptarlos a mi escuela.
- Dado el umbral de faltas en 10%, cuando lo cambio a 8%, entonces la siguiente evaluación usa 8%.

**H5. Ver si los maestros usan la app.** Como director quiero ver qué maestros capturan al día.
- Dado un maestro sin captura de asistencia en 2 días hábiles, cuando abro el tablero, entonces aparece marcado.

## Maestro

**H6. Pasar lista en menos de 30 segundos.** Como maestro quiero pasar lista rápido para no perder clase.
- Dado un grupo de 30 alumnos, cuando abro la lista, entonces todos aparecen presentes y solo toco a los que faltaron.
- Cuando guardo, entonces el papá del alumno con falta la ve en su ficha.

**H7. Capturar calificaciones.** Como maestro quiero capturar las calificaciones de mi grupo en una sola tabla.
- Dado un valor fuera de 5 a 10, cuando guardo, entonces se marca el error y no se guarda esa celda.

**H8. Marcar tareas no entregadas.** Como maestro quiero registrar quién no entregó.
- Dada una tarea, cuando marco a 3 alumnos, entonces cuenta para la alerta de tareas.

**H9. Registrar conducta y observaciones.** Como maestro quiero anotar un reporte o una observación en segundos.
- Dada una observación marcada como sensible, entonces se guarda en notas sensibles y nunca va a la IA.

**H10. Revisar y aprobar el resumen mensual.** Como maestro quiero revisar el borrador antes de que llegue al papá.
- Dado un borrador, cuando lo edito y apruebo, entonces el papá lo recibe y queda registrado quién aprobó.
- Dado un borrador que no pasó el validador, entonces aparece marcado para redactarlo yo.

**H11. Atender una alerta.** Como maestro quiero descartar o convertir una alerta en caso.
- Dada una alerta, cuando la descarto con motivo, entonces se cierra y queda registrada.

## Papá o tutor

**H12. Entrar sin contraseña.** Como papá quiero entrar con el enlace que me mandó la escuela.
- Dada una invitación válida, cuando abro el enlace, entonces creo mi acceso y veo el aviso de privacidad.
- Dada una invitación usada o vencida, entonces veo cómo pedir una nueva.

**H13. Dar consentimiento.** Como papá quiero saber qué se hace con los datos de mi hijo.
- Dado que no he aceptado, cuando entro, entonces no veo datos de mi hijo hasta aceptar.

**H14. Ver cómo va mi hijo en 30 segundos.** Como papá quiero una ficha clara.
- Cuando abro la ficha, entonces veo faltas exactas del periodo, calificaciones con flecha de tendencia y tareas pendientes, sin comparación con el grupo.

**H15. Recibir el resumen mensual.** Como papá quiero un resumen corto con qué hacer.
- Dado un resumen aprobado, cuando lo abro, entonces veo las 7 partes y un botón para pedir cita.

**H16. Elegir la meta del mes.** Como papá quiero fijar una meta con mi hijo.
- Cuando elijo una meta sugerida o escribo una, entonces queda visible en la ficha y el resumen del mes siguiente dice si se logró.

**H17. Ejercer mis derechos ARCO.** Como papá quiero pedir acceso, corrección o borrado de datos.
- Cuando envío la solicitud, entonces el director la recibe y yo veo su estado.

## Sistema

**H18. Generar alertas cada mañana.** Dado el umbral de faltas, cuando corre la evaluación diaria, entonces se crea una alerta por alumno que lo rebase, sin duplicar alertas abiertas del mismo tipo.

**H19. Limitar avisos.** Dado un papá con 3 avisos esta semana para un hijo, cuando surge otro no urgente, entonces se guarda para el resumen semanal.
