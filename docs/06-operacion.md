# Operación: qué pasa solo y qué hace cada quien

Horarios en hora de Durango (sin horario de verano).

| Cuándo | Qué pasa | Quién |
| --- | --- | --- |
| Cada día hábil, al llegar | Pasar lista (todos presentes por defecto, tocar excepciones) | Maestra |
| Lunes a viernes 7:00 | Se revisan las señales de apoyo (faltas, tareas, conducta, calificaciones) y se avisa una vez al día al personal | Sistema |
| Cuando hay señales | Dar seguimiento (abre caso) o descartar con motivo | Maestra o dirección |
| Viernes 16:00 | Resumen semanal a cada familia con aviso aceptado (sin IA, números exactos) | Sistema |
| Día 1 de cada mes 6:00 | Se preparan los resúmenes del mes anterior con los datos calculados en la base | Sistema |
| Día 1, cada 10 minutos | La IA redacta borradores; el validador revisa números, palabras y comparaciones | Sistema |
| Días 1 a 5 | La maestra titular revisa, edita y aprueba; al aprobar, la familia recibe aviso | Maestra |
| Cada 2 minutos | Envío de avisos: push si está activado; si no, correo. Nada no urgente de 21:00 a 7:00 | Sistema |
| Al cerrar cada periodo | Capturar calificaciones (escala 5 a 10) | Maestra |
| Cada semana | Revisar tablero: familias sin activar, grupos sin lista, acciones vencidas | Dirección |

## Límites que protegen a las familias

- Máximo 3 avisos no urgentes por semana por hijo; lo demás va al resumen semanal.
- Los papás nunca ven alertas, notas confidenciales, borradores ni comparaciones con otros alumnos.
- Nada de la IA llega a una familia sin aprobación de la maestra.

## Si algo falla

- **No llegan códigos**: revise SMTP de Supabase y el dominio en Resend; pida revisar spam.
- **No se redactan resúmenes**: revise `ANTHROPIC_API_KEY` y el límite de gasto; los borradores quedan como
  «Redactar» para que la maestra los escriba, nada se pierde.
- **No salen avisos**: revise los secretos `app_url` y `cron_secret` en Vault y la variable `CRON_SECRET` en Vercel
  (deben ser iguales); en Supabase > Cron vea el historial de `enviar-avisos`.
- **Respaldo**: Supabase Pro guarda respaldo diario; para restaurar, Project Settings > Database > Backups.
