# Bloque 9 · Recordatorios automáticos (cron diario)

## Qué resuelve

Hasta ahora, avisar de una entrega próxima o vencida dependía de que el docente entrara a la
actividad y pulsara «Recordar a quienes no han entregado». Si nadie lo hacía, el alumno se
enteraba hasta el día de la revisión. Este bloque agrega un **cron diario** que recorre las
actividades del plantel y avisa sin intervención humana, además de un **resumen semanal para
docentes** con los pendientes de sus aulas.

## Trabajos que ejecuta

| Trabajo | Cuándo | A quién | Regla |
| --- | --- | --- | --- |
| Por vencer | cada corrida | alumnos inscritos sin entrega | la actividad cierra en las próximas **48 horas** |
| Vencidas | cada corrida | alumnos inscritos sin entrega | la fecha límite pasó, pero hace **menos de 7 días** |
| Resumen semanal | lunes (o `?semanal=1`) | docentes con pendientes | cuenta entregas faltantes por actividad en sus aulas |

Cada aviso llega como **notificación interna** (`notifications`, tipo `recordatorio`) y, si hay
SMTP configurado, también por **correo** con plantilla institucional y enlace a
`/panel/tareas`. Se envían como máximo 60 correos por corrida para no agotar el tiempo de la
función; las notificaciones internas no tienen tope.

## Deduplicación

Antes de enviar se consulta `notifications` por `tipo = 'recordatorio'`, título de la
actividad y los últimos **72 horas**. El mismo alumno no recibe dos veces el aviso de la misma
actividad en ese periodo, aunque el cron corra todos los días. Los avisos omitidos se reportan
como `duplicadosOmitidos` en la respuesta.

## Programación

`vercel.json`:

```json
{
  "crons": [{ "path": "/api/cron/recordatorios", "schedule": "0 14 * * *" }]
}
```

`0 14 * * *` UTC = **08:00** en Ciudad Juárez / Chihuahua (UTC−6). El cron diario ejecuta los
tres trabajos; el resumen semanal sólo se arma los lunes (`getUTCDay() === 1`) para no repetirlo
cada día.

## Seguridad

`GET /api/cron/recordatorios` acepta dos formas de autorización:

1. **Vercel Cron:** `Authorization: Bearer $CRON_SECRET`. Vercel agrega esa cabecera
   automáticamente cuando la variable existe en el proyecto.
2. **Dirección a mano:** sesión iniciada con rol `admin` (útil para probar antes de crear la
   variable, y para relanzar el resumen desde el panel).

| Situación | Respuesta |
| --- | --- |
| `CRON_SECRET` configurado, sin cabecera ni sesión | `401 {"ok":false,"error":"No autorizado."}` |
| `CRON_SECRET` configurado, cabecera incorrecta | `401` |
| `CRON_SECRET` configurado, cabecera correcta | ejecuta (`via: "cron"`) |
| `CRON_SECRET` **no** configurado y sin sesión | `503` con instrucción de configurar la variable |
| Sesión de dirección | ejecuta (`via: "admin"`) |
| Sin PostgreSQL (preview) | `503` con `sinBaseDeDatos: true`, sin enviar nada |

La respuesta nunca incluye correos ni nombres de alumnos; sólo conteos y mensajes de resultado.

## Parámetros de prueba

| Parámetro | Efecto |
| --- | --- |
| `?tarea=diario` | sólo avisos de 48 h y vencidas |
| `?tarea=semanal` | sólo el resumen para docentes |
| `?semanal=1` | fuerza el resumen aunque no sea lunes |

## Variables de entorno

| Variable | Obligatoria | Uso |
| --- | --- | --- |
| `CRON_SECRET` | sí, para que el cron de Vercel pase | comparación exacta con la cabecera `Authorization` |
| `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` | opcional | envío real de correos; sin ellas sólo hay notificación interna |
| `SMTP_PORT`, `SMTP_FROM` | opcional | puerto (587 por defecto) y remitente |

Sin `CRON_SECRET`, el cron diario responde `503` y **no envía nada**; en cuanto se pega la
variable en Vercel, la siguiente corrida pasa.

## Auditoría

Cada corrida registra en la bitácora la acción `cron_recordatorios` con el resumen: avisos por
vencer, vencidos, docentes notificados y duplicados omitidos. En `/panel/bitacora` aparece como
«Recordatorios automáticos» y se puede filtrar y exportar a XLSX/CSV como el resto.

## Verificación realizada (sin PostgreSQL, modo demo)

| Caso | Resultado |
| --- | --- |
| Reglas de planeación con datos de prueba | 2 avisos por vencer, 2 vencidos, tareas fuera de ventana y de más de 7 días descartadas |
| Alumno que ya entregó | no recibe aviso |
| Alumno ya avisado | se omite y se cuenta en `duplicadosOmitidos` |
| Segunda corrida el mismo día | 0 avisos nuevos |
| Corrida al día siguiente | la tarea que entró a la ventana de 48 h se avisa; la que venció se reclasifica |
| Cron sin `CRON_SECRET` y sin sesión | `503` con mensaje de configuración |
| Cron con `CRON_SECRET`, sin cabecera | `401` |
| Cron con `CRON_SECRET`, cabecera incorrecta | `401` |
| Cron con `CRON_SECRET`, cabecera correcta | ejecuta y degrada con `sinBaseDeDatos` |
| Cron con sesión de dirección | ejecuta (`via: "admin"`) |
| `?tarea=semanal` | `modo: "semanal"`, sin avisos individuales |

`npm run typecheck`, `npm run build` y `eslint` sobre los archivos nuevos: sin errores.

## Pendientes conocidos

- El resumen semanal suma pendientes por actividad; un alumno con dos actividades pendientes
  cuenta dos, no uno. Es a propósito: mide carga de revisión, no alumnos distintos.
- No hay reintentos: si el cron falla un día, la siguiente corrida cubre la ventana de 48 h y
  los 7 días de vencidas, así que no se pierde ningún aviso de forma permanente.
- Para avisos push reales (sin abrir la plataforma) sigue pendiente integrar VAPID; quedó fuera
  de alcance a propósito.
