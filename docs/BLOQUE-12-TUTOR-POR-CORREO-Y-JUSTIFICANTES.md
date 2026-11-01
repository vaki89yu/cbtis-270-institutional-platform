# Bloque 12 · Enlace de tutor por correo y justificantes de inasistencia

Dos mejoras que cierran pendientes reales del día a día: entregar la consulta del tutor sin
depender de copiar y pegar, y emitir el justificante de una falta sin pasar por ventanilla.

---

## 1 · Envío del enlace de tutor por correo

### Antes
La liga se generaba y había que copiarla para mandarla por WhatsApp o imprimirla. El pendiente
estaba documentado desde el bloque 10.

### Ahora
El formulario de `/panel/expedientes/[id]` → «Enlace de consulta para tutores» tiene un campo
**«Correo del tutor (opcional)»**. Si se captura:

1. Se valida el formato del correo (si no es válido, no se crea nada y se avisa).
2. Se crea el enlace igual que antes (token aleatorio, hash en la base, caducidad, cookie de 3
   minutos).
3. Se envía un correo institucional con la liga, la vigencia y la advertencia de que es personal
   e intransferible.
4. Se guarda `tutor_links.tutor_email` para mostrarlo en la lista («Enviado a …»).
5. Se registra `enlace_tutor_enviado` en la bitácora.

### Si no hay SMTP
El enlace se crea igual y el mensaje de la pantalla lo dice explícitamente:
«El correo no salió (SMTP sin configurar): copia la liga y compártela». La liga sigue visible una
sola vez con la cookie de 3 minutos, así que no se pierde el flujo.

### Detalle técnico
- Nueva columna `tutor_links.tutor_email text` (`ALTER TABLE … ADD COLUMN IF NOT EXISTS`).
- `crearEnlaceTutor` acepta `email` y lo guarda; `plantillaEnlaceTutor` arma asunto, texto y HTML.
- El envío ocurre en la acción de servidor, que ya tenía acceso a `headers()` para construir la
  URL absoluta del enlace.
- El correo nunca contiene el hash ni datos de otros alumnos: sólo nombre del alumno, liga y
  vigencia.

---

## 2 · Justificante de inasistencia en PDF

### Dónde
- `GET /api/justificantes/[attendanceId]` → PDF.
- Botón **«Justificante PDF»** en la tarjeta «Faltas recientes» del expediente.

### Quién puede
Se comparte el mismo criterio que constancias y kardex, ahora centralizado en
`src/lib/permisos-documentos.ts`:

| Rol | Acceso |
| --- | --- |
| Estudiante | sus propios registros |
| Docente | alumno tutorizado o de cualquiera de sus aulas (titular o co-docente) |
| Dirección | cualquier alumno |
| Sin sesión | `401` |
| Registro inexistente | `404` |
| Sin PostgreSQL | `503` con mensaje |

### Contenido
- Encabezado institucional y título «JUSTIFICANTE DE INASISTENCIA».
- Párrafo con nombre, matrícula, semestre, grupo y turno del alumno; asignatura, clave, docente y
  fecha/hora del registro.
- Texto distinto según el estado: «no asistió» (falta) o «presentó una falta justificada».
- Motivo registrado por el aula, o «no especificado».
- Nota de que la justificación formal con comprobantes se resuelve en control escolar.
- Firmas de docente del aula y control escolar, más folio `CB270-J<registro>-AAAAMMDDHHmm`.

### Auditoría
Cada descarga registra `justificante_generado` con alumno, clave de la asignatura, estado y folio.

### Privacidad
El listado «Faltas recientes» sólo muestra las últimas seis faltas del alumno abierto y respeta
las mismas reglas de acceso del expediente (el estudiante sólo ve el suyo).

---

## Verificación realizada

| Caso | Resultado |
| --- | --- |
| Crear enlace con correo (SMTP apagado) | Enlace creado, mensaje «el correo no salió (SMTP sin configurar)» |
| Crear enlace con correo inválido | `El correo del tutor no es válido.` y no se crea nada |
| Expediente después de crear | Aparece «Enviado a tutora.ana@gmail.com» en la lista, campo «Correo del tutor» y tarjeta de faltas |
| Justificante sin sesión | `401` |
| Justificante con dirección sin PostgreSQL | `503` con mensaje |
| PDF de falta | Válido, párrafo «no asistió», motivo «no especificado», folio `CB270-J42-…` |
| PDF de falta justificada | Válido, párrafo «presentó una falta justificada», motivo con el texto capturado |

`npm run typecheck`, `npm run build` y `eslint` sobre los archivos nuevos: sin errores.

## Pendientes conocidos

- El correo del tutor no se puede corregir después: si se captura mal, se revoca el enlace y se
  emite otro con el correo correcto.
- No hay reenvío automático ni recordatorio al tutor; el cron del bloque 9 sólo avisa a alumnos y
  docentes.
- Un justificante cubre **un registro de asistencia** (una clase). Para justificar varios días se
  descargan varios documentos con folios distintos.
