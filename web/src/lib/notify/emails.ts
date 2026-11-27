/** Textos de correo. Tono cálido, sin culpa, con lo esencial primero (docs/04 §1). */

export function invitationEmail(p: { guardianName: string; studentFirstName: string; schoolName: string; url: string }) {
  const hola = p.guardianName ? `Hola, ${p.guardianName.split(" ")[0]}:` : "Hola:";
  return {
    subject: `${p.schoolName}: siga el avance de ${p.studentFirstName}`,
    text: `${hola}

${p.schoolName} usa Avanza para que usted sepa cada semana cómo va ${p.studentFirstName}: asistencia, calificaciones y lo que puede hacer en casa para apoyarle.

Entrar toma un minuto y no necesita contraseña. Este enlace es personal y vence en 14 días:

${p.url}

Si no esperaba este correo, puede ignorarlo.`,
  };
}

export function staffWelcomeEmail(p: { name: string; schoolName: string; role: "director" | "teacher"; url: string }) {
  return {
    subject: `Su acceso a Avanza en ${p.schoolName}`,
    text: `Hola, ${p.name.split(" ")[0]}:

${p.schoolName} le dio acceso a Avanza${p.role === "teacher" ? " para pasar lista, capturar calificaciones y revisar los resúmenes mensuales antes de que lleguen a los papás" : " como dirección"}.

Para entrar, escriba su correo en la app y le llegará un código de 6 dígitos. No hay contraseña que recordar.

${p.url}`,
  };
}

export function notificationEmail(p: { title: string; body: string; url: string }) {
  return { subject: p.title, text: `${p.body}\n\n${p.url}\n\nRecibe este correo porque no tiene activadas las notificaciones en su celular.` };
}
