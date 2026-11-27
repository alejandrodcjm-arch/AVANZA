import type { Enums } from "@/lib/database.types";

export const LOCATION_LABEL: Record<Enums<"incident_location">, string> = {
  salon: "Salón", patio: "Patio / recreo", banos: "Baños", pasillos: "Pasillos", entrada_salida: "Entrada o salida",
  comedor: "Comedor", deportes: "Canchas / deportes", transporte: "Transporte", en_linea: "En línea / redes", otro: "Otro",
};

export const CATEGORY_LABEL: Record<Enums<"incident_category">, string> = {
  interrupcion: "Interrupción de la clase", incumplimiento: "Incumplimiento (material, uniforme)", falta_respeto: "Falta de respeto",
  agresion_verbal: "Agresión verbal", agresion_fisica: "Agresión física", acoso: "Posible acoso escolar",
  dano_material: "Daño a material o instalaciones", celular: "Uso indebido del celular", deshonestidad: "Deshonestidad académica", otra: "Otra",
};

export const ACTION_LABEL: Record<Enums<"incident_action">, string> = {
  platica: "Plática con el alumno", llamada_atencion: "Llamada de atención", aviso_familia: "Aviso a la familia",
  citatorio: "Citatorio a la familia", reparacion: "Reparación del daño / disculpa", suspension: "Suspensión",
  canalizacion: "Canalización (psicología, USAER)", ninguna: "Ninguna por ahora",
};

export const SEVERITY_LABEL: Record<Enums<"behavior_severity">, string> = { minor: "Leve", moderate: "Moderada", serious: "Grave" };

export const SEVERITY_HELP: Record<Enums<"behavior_severity">, string> = {
  minor: "La maneja usted en el salón. La familia la ve en el resumen del viernes.",
  moderate: "La familia recibe aviso hoy.",
  serious: "Aviso urgente a la familia y caso para dirección.",
};

export const RECOGNITION: { key: Enums<"recognition_category">; label: string; icon: string }[] = [
  { key: "esfuerzo", label: "Esfuerzo", icon: "💪" },
  { key: "respeto", label: "Respeto", icon: "🤝" },
  { key: "responsabilidad", label: "Responsabilidad", icon: "📘" },
  { key: "colaboracion", label: "Colaboración", icon: "🧩" },
  { key: "mejora", label: "Mejora", icon: "📈" },
  { key: "liderazgo", label: "Liderazgo", icon: "⭐" },
];

/** Plantilla del texto para la familia: describe la conducta y la acción, sin etiquetas ni otros nombres. */
export function familyTemplate(category: Enums<"incident_category">, action: Enums<"incident_action">, affected: boolean) {
  if (affected) return "Su hijo o hija se vio afectado en una situación en la escuela. Ya estamos atendiendo y le mantendremos al tanto.";
  const what = CATEGORY_LABEL[category].toLowerCase();
  const act = ACTION_LABEL[action].toLowerCase();
  return `Hoy tuvimos una situación de ${what}. En la escuela hicimos: ${act}. Le pedimos platicar en casa sobre cómo podría resolverlo la próxima vez.`;
}
