# v3: calendario, horarios y colegiaturas (todo gratis, sin servicios de terceros)

## Calendario del ciclo
- Dirección carga con un botón el calendario oficial SEP 2026-2027 (publicado el 15 de julio de 2026): inicio 31 de agosto, 8 viernes de Consejo Técnico, días de descanso, vacaciones de invierno (21 dic – 6 ene) y primavera (22 mar – 2 abr), fin de cursos 9 de julio. Luego ajusta lo que su escuela haga distinto.
- Maestros agendan exámenes, juntas y eventos de sus grupos. Las fechas internas (registro de calificaciones) solo las ve el personal.
- "Avisar a familias": una notificación por familia (aunque tenga varios hijos), una sola vez por evento.

## Sincronizar con Google Calendar, iPhone y Outlook
- Cada persona tiene un enlace secreto (`/api/calendario/<token>.ics`) que se agrega con un toque. Costo: $0. No requiere OAuth ni revisión de Google.
- Familias: fechas de la escuela, exámenes/eventos del grupo de sus hijos y fechas de pago **sin montos**. Maestros: además sus clases semanales hasta fin de ciclo, sin los días sin clases.
- Limitación conocida: Google refresca calendarios suscritos cada varias horas (hasta ~24 h). Por eso lo urgente siempre va por aviso de la app. Cada evento también tiene "Agregar a Google" (instantáneo).
- Generar un enlace nuevo invalida el anterior.

## Horarios
- Dirección sube el Excel de horarios que ya tiene (días como columnas, horas en la primera columna; acepta "8:00 - 9:00", horas en dos columnas, recreo en celdas combinadas, hoja por grupo) o lo captura. "Copiar el lunes a toda la semana".
- Familias ven "Hoy / Mañana le toca" en la ficha de su hijo; maestros ven sus clases del día en "Mi semana".

## Colegiaturas
- Administración sube el Excel que ya lleva: reporte de caja (Alumno, Concepto, Importe, Vencimiento, Pagado) o la tabla de siempre con una columna por mes (✓, "pagado", el monto o la fecha). Se puede volver a subir sin duplicar.
- Cada familia ve solo su estado de cuenta: "Al corriente" o "1 pago pendiente" (ámbar, nunca rojo), siguiente pago y cómo pagar.
- Recordatorio discreto 3 días antes del vencimiento y uno solo 5 días después si sigue pendiente; sin montos en la notificación (se ve en la pantalla bloqueada).
- Maestros no ven pagos. La lista de pendientes es privada de dirección: la Ley Federal de Protección al Consumidor y Profeco prohíben exhibir a deudores o condicionar la educación.
- No incluye cobro en línea: las pasarelas cobran comisión (no es gratis). Queda para después del piloto.

## No implementado
- Google Classroom: gratis de usar, pero requiere que la escuela tenga Workspace for Education y autorización de su administrador. Se hace cuando haya una escuela que lo use.
