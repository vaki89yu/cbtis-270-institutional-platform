# Bloque 8 · Consulta para tutores por enlace personal

## Qué resuelve

Hasta ahora la madre, el padre o el tutor legal sólo podía enterarse de la asistencia y el
avance del alumno pidiendo una impresión en control escolar. Este bloque agrega una **liga
personal por alumno** que el docente encargado o dirección genera desde el expediente y que
el tutor abre en cualquier teléfono, **sin crear cuenta ni contraseña**.

La vista es exclusivamente de lectura y está acotada a un alumno: el enlace no acepta
parámetros, búsquedas ni cambios de identificador, así que no puede usarse para ver a otros
estudiantes del plantel.

## Cómo funciona

1. En `/panel/expedientes/[id]` (docente o dirección) se elige a quién se entrega el enlace
   —Madre, Padre, Tutor legal, Tutor— y la vigencia: 7, 15 o 30 días.
2. El servidor genera un token aleatorio de 24 bytes (`base64url`) y guarda **sólo su hash
   SHA-256** en la tabla `tutor_links`, junto con la pista de los últimos 6 caracteres, la
   caducidad, quién lo creó y el contador de accesos.
3. El token en claro se muestra **una sola vez** en el expediente. Viaja en una cookie
   httpOnly de 3 minutos (`cbtis270_enlace_tutor`) para pintarse en la pantalla; después ya
   no se puede recuperar. Si se pierde, se revoca y se emite otro.
4. El tutor abre `/consulta/[token]`. El servidor busca por hash, valida que no esté revocado,
   que no haya caducado y que la cuenta del alumno siga activa, y registra el acceso.
5. Cualquier enlace inválido, caducado o revocado muestra la misma pantalla de aviso, sin
   datos de ningún alumno.

## Qué ve el tutor

- Nombre, matrícula, semestre, grupo y turno del alumno, más el docente encargado.
- Porcentaje de asistencia y desglose por asignatura (asistencias, retardos, faltas,
  justificadas).
- Promedio general y por parcial (1°, 2°, 3°), calculado con las actividades calificadas.
- Actividades por entregar, marcando las que ya vencieron.
- Semáforo de riesgo con sus motivos (faltas consecutivas, asistencia baja, entregas
  pendientes, promedio bajo).
- Aviso de privacidad y fecha de caducidad del enlace.

## Modelo de datos

Tabla `tutor_links` (creada por `ensure-schema.ts` de forma idempotente):

| Columna | Uso |
| --- | --- |
| `student_id` | Alumno dueño del enlace (FK a `users`) |
| `token_hash` | SHA-256 del token, único; nunca se guarda el token en claro |
| `token_pista` | Últimos 6 caracteres, para identificar el enlace en la lista |
| `etiqueta` | A quién se entregó (Madre, Padre, Tutor legal, Tutor) |
| `creado_por_id` / `creado_por_nombre` | Autor del enlace |
| `expira_en` | Caducidad (1 a 60 días; la UI ofrece 7/15/30) |
| `revocado_en` | Baja inmediata por el plantel |
| `ultimo_acceso_en` / `accesos` | Uso del enlace, visible en el expediente |
| `created_at` | Alta |

Índice `tutor_links_alumno_idx` sobre `student_id`.

## Permisos

- **Dirección (admin):** genera y revoca para cualquier alumno.
- **Docente:** sólo si es el docente encargado del alumno (`student_profiles.tutor_docente_id`)
  o imparte alguna de sus asignaturas (`courses.docente_id`).
- **Estudiante:** no ve la sección de enlaces.
- **Tutor:** no tiene cuenta ni sesión; sólo lectura de la liga.

La acción de servidor valida el permiso otra vez antes de crear o revocar, aunque la sección
no se renderice.

## Bitácora

Se registran tres acciones en `registrarAuditoria`:

- `enlace_tutor_creado` — alumno, etiqueta y vigencia.
- `enlace_tutor_revocado` — enlace y alumno.
- El acceso del tutor se cuenta en `ultimo_acceso_en` / `accesos`, visible en el expediente.

## Privacidad y endurecimiento

- Token de 192 bits, imposible de adivinar; sólo se almacena el hash.
- `noindex, nofollow, nocache` en la vista pública.
- Respuesta indistinguible para enlace inexistente, caducado o revocado (no filtra si un
  alumno existe).
- Caducidad obligatoria y revocación inmediata.
- El enlace no permite descargar bases ni ver calificaciones de terceros.

## Verificación realizada (modo demo, sin PostgreSQL)

| Caso | Resultado |
| --- | --- |
| Enlace válido | `200` con nombre, semáforo, asistencia, parciales y pendientes |
| Enlace inexistente | `200` con aviso "ya no está disponible", 0 menciones del alumno |
| Enlace caducado | `200` con aviso, 0 menciones del alumno |
| Enlace revocado | `200` con aviso, 0 menciones del alumno |
| Token de 500 caracteres | `200` con aviso, sin consulta a la base |
| Acción de crear desde el expediente | Devuelve OK y la liga se pinta una vez con cookie de 3 min |
| Acción de revocar | El enlace deja de resolver de inmediato |
| Expediente con sección de enlaces | `200`, con formulario, lista, estado y botón de revocar |

`npm run typecheck` y `npx eslint` sobre los archivos nuevos: sin errores.

## Pendientes conocidos

- Enviar el enlace por correo al tutor requiere capturar su dirección; queda para una
  extensión del mismo bloque (hoy se copia y se comparte por WhatsApp o impreso).
- El enlace es de alumno completo, no por asignatura; si dirección lo pide, se puede
  parametrizar el alcance con un campo adicional en `tutor_links`.
