# Bloque 11 · Calendario de entregas, avisos programados y reporte de grupo

Tres mejoras de producto para el día a día del aula, después de cerrar el bloque B.

---

## 1 · Calendario de entregas

### Dónde
`/panel/calendario`, con entrada propia en la barra del panel (icono de calendario) para
estudiantes, docentes y dirección.

### Qué muestra
- Rejilla mensual (lunes a domingo) con las actividades cuya **fecha de entrega** cae en el mes.
- Cada actividad aparece como ficha de color del aula; se abre en `/panel/tareas/[id]`.
- Si un día tiene más de dos actividades, se resume con «+N más».
- Sección «Lo que viene» con las próximas seis entregas.
- Filtro por aula (cuando el usuario tiene más de una) y navegación ← mes → con «Hoy».

### Estado por rol
| Rol | Qué ve | Estado que se muestra |
| --- | --- | --- |
| Estudiante | actividades de sus aulas inscritas | «Entregada» / «Pendiente» |
| Docente | actividades de sus aulas (propias o co-docencia) | «x de y pendientes» |
| Dirección | todo el plantel, con filtro por aula | «x de y pendientes» |

El estado del estudiante se calcula comparando sus entregas; el del docente, restando las
entregas registradas al número de inscritos del aula.

### Zona horaria
Las fechas se presentan en `America/Ciudad_Juarez`. Los cortes de mes se toman a las 00:00
local (UTC−6, huso de invierno de la frontera), documentado en `src/lib/calendario.ts`.

### Sin base de datos
El calendario muestra un aviso claro («necesita la base de datos del plantel») en lugar de una
rejilla vacía que parezca un error.

---

## 2 · Avisos programados

### Qué cambia
Los comunicados institucionales (`/panel/avisos`) ya se pueden **programar**: al crear uno se
elige una fecha y hora opcionales. Hasta ese momento el aviso queda guardado como programado y
no aparece ni en el portal público ni en la API.

### Cómo funciona
- Nueva columna `announcements.publicar_en` (`timestamptz`), creada con `CREATE TABLE` para
  instalaciones nuevas y `ALTER TABLE … ADD COLUMN IF NOT EXISTS` para la base que ya existe.
- La fecha del formulario se interpreta en **hora de Ciudad Juárez (UTC−6)** y se guarda con
  zona horaria.
- Visibilidad: `publicado = true` **y** (`publicar_en` nula **o** ya pasó). Se aplica en la
  consulta del panel, en la portada pública y en `GET /api/avisos`, así que no hay forma de
  filtrar un aviso programado.
- En la lista de avisos aparece la etiqueta ámbar «Programado para …».

### Compatibilidad
Los avisos existentes mantienen `publicar_en = null`, por lo que siguen visibles igual que
antes. No se requiere migración manual: `ensure-schema` agrega la columna al iniciar sesión o al
llamar a `/api/health?init=1`.

---

## 3 · Reporte de grupo en PDF

### Dónde
Botón **«Reporte del grupo»** en el encabezado de `/panel/clases/[id]`, junto a Calificaciones.

### Ruta
`GET /api/reportes/grupo/[courseId]` → `application/pdf`,
`CBTIS270-reporte-<clave>.pdf`, `Cache-Control: no-store`.

### Permisos
| Rol | Acceso |
| --- | --- |
| Dirección | cualquier aula |
| Docente titular o co-docente | su aula |
| Estudiante | `403` |
| Sin sesión | `401` |
| Sin base de datos | `503` con mensaje explícito |
| Aula inexistente | `404` |

### Contenido
- Encabezado institucional y datos del aula (clave, semestre, grupo, turno, aula, módulo).
- Docentes del aula (titular y co-docentes, ya con el bloque B7).
- Tres tarjetas de resumen: alumnos, promedio del grupo, entregas pendientes.
- Tabla por alumno: número, nombre, matrícula, promedio, asistencia %, entregas y pendientes
  (en rojo cuando hay pendientes). Continúa en otra página si el grupo es grande.
- Criterios al pie y folio `CB270-R<aula>-AAAAMMDDHHmm`.

### Cómo se calcula
- **Promedio:** media de las actividades calificadas del aula.
- **Asistencia:** (presente + retardo + justificado) / sesiones registradas del aula.
- **Pendientes:** actividades activas del aula menos entregas del alumno.
- Todo con consultas agregadas (cuatro consultas, sin N+1 por alumno).

### Auditoría
Cada descarga registra `reporte_grupo_generado` con aula, número de alumnos, pendientes y folio.

---

## Verificación realizada

| Caso | Resultado |
| --- | --- |
| `/panel/calendario` como dirección | `200`, aviso de base de datos en preview |
| `/panel/calendario?mes=2026-12` como estudiante | `200` |
| `/panel/avisos` | `200`, aparece el campo «Publicar el (opcional)» |
| Avisos programados en consulta | condición `publicado AND (publicar_en IS NULL OR publicar_en <= now)` en panel, portada y API |
| Reporte sin sesión | `401` |
| Reporte como estudiante | `403` |
| Reporte como dirección sin PostgreSQL | `503` con mensaje |
| Reporte con datos de muestra (12 alumnos) | PDF válido `%PDF … %%EOF`, 12 alumnos, resumen, folio `CB270-R7-…` |

`npm run typecheck`, `npm run build` y `eslint` sobre los archivos nuevos: sin errores.

## Pendientes conocidos

- El calendario sólo incluye **fechas de entrega**; las sesiones de clase y los exámenes
  programados todavía no se dibujan (se pueden sumar como segunda fuente de eventos).
- La programación de avisos no envía notificación al publicarse: el aviso aparece, pero no
  avisa. Se puede enganchar al cron del bloque 9.
- El reporte de grupo promedia actividades, no ponderados por puntos; coincide con la boleta
  actual del plantel.
