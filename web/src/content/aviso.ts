/**
 * Aviso de privacidad integral (LFPDPPP vigente desde el 21 de marzo de 2025, arts. 15, 16, 29 y 35).
 * PLANTILLA: la escuela es la responsable; Avanza es la persona encargada. Debe revisarla un abogado
 * antes del piloto y la escuela debe llenar sus datos (Dirección > Escuela). Al cambiar el texto, suba
 * la versión de la escuela (schools.privacy_notice_version) para pedir aceptación de nuevo.
 */
export type NoticeSchool = { name: string; address?: string | null; privacyEmail?: string | null; version: string };

export function privacyNotice(s: NoticeSchool) {
  const resp = s.name || "La escuela";
  const domicilio = s.address || "[domicilio de la escuela]";
  const correo = s.privacyEmail || "[correo de privacidad de la escuela]";
  return [
    {
      h: "Quién es responsable de sus datos",
      p: [
        `${resp}, con domicilio en ${domicilio}, es la responsable del tratamiento de los datos personales que usted y la escuela registran en Avanza.`,
        "Avanza es la plataforma que la escuela contrató para procesar esos datos por su cuenta y siguiendo sus instrucciones (persona encargada). Avanza no usa los datos para fines propios, no los vende y no los comparte para publicidad.",
      ],
    },
    {
      h: "Qué datos se tratan",
      p: [
        "De usted: nombre, correo electrónico, parentesco con el alumno y el registro de su actividad en la app (avisos recibidos y leídos).",
        "Del alumno: nombre, grado y grupo; asistencia; calificaciones; tareas no entregadas; reportes de conducta; observaciones del personal; metas del mes y resúmenes mensuales.",
        "Datos sensibles: la app no le pide datos de salud, religión ni origen. Si el personal registra una nota confidencial que contenga datos sensibles del alumno, solo la ve el personal autorizado, nunca se envía a la inteligencia artificial y la escuela la trata con su consentimiento expreso conforme a la ley.",
      ],
    },
    {
      h: "Para qué se usan",
      p: [
        "Finalidades necesarias para el servicio educativo: informarle cada semana y cada mes cómo va el alumno; que el personal dé seguimiento oportuno a la asistencia, las calificaciones y la conducta; avisarle de asuntos que requieren su atención; y cumplir obligaciones de la escuela.",
        "No hay finalidades secundarias: no se usan sus datos para mercadotecnia, publicidad ni perfiles comerciales.",
        "Inteligencia artificial: para redactar el borrador del resumen mensual se envían a un proveedor de IA solo el nombre de pila del alumno y sus números del mes (asistencia, calificaciones, tareas), sin apellidos, sin datos de usted y sin notas confidenciales. El proveedor no usa esos datos para entrenar sus modelos. Ningún resumen se le envía sin que lo revise y apruebe la maestra o el maestro.",
      ],
    },
    {
      h: "Quién más procesa los datos",
      p: [
        "Para funcionar, Avanza usa proveedores que actúan como encargados y no pueden usar los datos para otro fin: alojamiento de la base de datos y de la app (Supabase y Vercel, con servidores en Estados Unidos), envío de correos (Resend) y redacción de borradores (Anthropic). La remisión a encargados no requiere su consentimiento, pero se la informamos con transparencia.",
        "La escuela no transfiere sus datos a terceros distintos de estos encargados, salvo los casos que la ley permite sin consentimiento (por ejemplo, requerimientos de autoridad competente).",
      ],
    },
    {
      h: "Sus derechos (ARCO) y cómo ejercerlos",
      p: [
        "Usted puede acceder a sus datos y a los de su hijo o hija, pedir que se corrijan, que se cancelen u oponerse a su tratamiento. Desde la app, en Cuenta > Mis datos, puede descargar todo y enviar su solicitud; también puede escribir a " + correo + ".",
        "La escuela designa a la persona o área de datos personales que responde estas solicitudes en los plazos de la ley. Si no recibe respuesta, puede acudir a la autoridad en materia de protección de datos (Secretaría Anticorrupción y Buen Gobierno).",
        "Puede retirar su consentimiento en cualquier momento desde la app. Dejará de recibir información del alumno por este medio; la escuela seguirá informándole por los medios tradicionales.",
      ],
    },
    {
      h: "Seguridad",
      p: [
        "Los datos viajan cifrados. Cada persona ve solo lo que le corresponde: usted solo ve a sus hijos y solo después de aceptar este aviso; el personal ve a sus grupos. Se registra quién consulta la ficha de cada alumno.",
      ],
    },
    {
      h: "Cambios a este aviso",
      p: [`Versión ${s.version}. Si el aviso cambia, se lo mostraremos en la app y le pediremos que lo acepte de nuevo antes de seguir.`],
    },
  ];
}
