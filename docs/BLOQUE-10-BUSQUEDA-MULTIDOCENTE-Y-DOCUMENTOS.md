# Bloque 10 · Búsqueda global, equipo docente y documentos en PDF

Tres funciones del bloque B que cierran el operativo escolar:

- **B3** búsqueda global con `Ctrl/⌘ + K`.
- **B7** varias docentes o docentes por aula (co-docencia).
- **B8** constancia de estudios y kardex académico en PDF.

---

## B3 · Búsqueda global

### Dónde
- Botón «Buscar…» en la barra del panel y atajo **Ctrl + K** (⌘ + K en Mac).
- API: `GET /api/buscar?q=` (requiere sesión).

### Qué busca

| Grupo | Campos | Destino |
| --- | --- | --- |
| Aulas | nombre, clave, aula | `/panel/clases/[id]` |
| Alumnos | nombre, correo, matrícula | `/panel/expedientes/[id]` |
| Actividades | título | `/panel/tareas/[id]` |
| Cuestionarios | título, clave, submódulo, módulo | `/panel/cuestionarios/[clave]` |
| Formatos | título, código, descripción | `/panel/formatos/[codigo]` |
| Usuarios (sólo dirección) | nombre, correo, matrícula | `/panel/usuarios?q=` |

### Filtro por rol (en el servidor)
- **Dirección:** todo el plantel.
- **Docente:** sus aulas (propias o donde es co-docente) y los alumnos inscritos en ellas.
- **Estudiante:** sus aulas y el material de consulta; **nunca** otros alumnos.

Un docente no puede obtener nombres de alumnos de aulas ajenas ni cambiando el `q`: el filtro
va en la consulta SQL, no en la interfaz.

### Comportamiento
- Mínimo dos letras; 220 ms de espera antes de consultar para no saturar la API.
- Navegación con ↑ ↓, Enter abre, Esc cierra.
- Respuesta sin datos sensibles: sólo títulos, una línea de detalle y la ruta.
- Los cuestionarios y formatos son catálogos estáticos: aparecen incluso si la base de datos
  no responde (preview).

---

## B7 · Equipo docente por aula

### Modelo
`course_teachers` (creada de forma idempotente en `ensure-schema.ts`):

| Columna | Uso |
| --- | --- |
| `course_id` | Aula (FK a `courses`, borrado en cascada) |
| `teacher_id` | Docente adicional (FK a `users`) |
| `agregado_por_id` | Quién lo sumó |
| `created_at` | Alta |

Índice único `(course_id, teacher_id)`: nadie se duplica. `courses.docente_id` sigue siendo el
**docente principal** y no se puede quitar desde la interfaz.

### Permisos (`src/lib/permisos-aula.ts`)
- `docentesDelAula(courseId)` — principal + co-docentes.
- `esDocenteDelAula(courseId, userId)` — verdadero para principal o co-docente.
- `puedeAdministrarAula(user, courseId)` — dirección siempre; docente sólo donde imparte.
- `aulasAdministradasPor(user)` — ids de aulas propias y compartidas.
- `docentesDisponiblesParaAula(courseId)` — docentes activos que aún no están en el aula.

`aulaDelDocente` (el guardián de todas las acciones del aula: pase de lista, material, muro,
calificaciones, recordatorios) ahora también acepta co-docentes, así que la co-docencia aplica
en todo el flujo y no sólo en la vista.

`clasesDelDocente` también suma las aulas compartidas, así que la pantalla «Aulas» del docente
muestra las propias y las de co-docencia.

### Interfaz
En `/panel/clases/[id]`, sección **Equipo docente del aula**: lista con la etiqueta
«Principal» o «Co-docente», botón para quitar y formulario para sumar a otro docente.
Dirección o el docente principal pueden sumar; dirección, el principal o el propio co-docente
pueden salir del aula.

### Auditoría
`aula_codocente_agregado` y `aula_codocente_retirado`, visibles y exportables en la bitácora.

---

## B8 · Constancia de estudios y kardex

### Rutas
| Documento | Ruta |
| --- | --- |
| Constancia de estudios | `GET /api/constancias/constancia/[studentId]` |
| Kardex académico | `GET /api/constancias/kardex/[studentId]` |

Ambas devuelven `application/pdf` con nombre `CBTIS270-<tipo>-<matrícula>.pdf` y
`Cache-Control: no-store`.

### Permisos
| Rol | Acceso |
| --- | --- |
| Estudiante | sólo su propio documento |
| Docente | alumno del que es docente encargado o de cualquiera de sus aulas (principal o co-docente) |
| Dirección | cualquier alumno |
| Sin sesión | `401` |
| Tipo inválido (`diploma`) | `404` |
| Alumno inexistente | `404` |

### Contenido
- **Constancia:** encabezado institucional (plantel, dependencia, carrera, CCT, dirección),
  párrafo «A quien corresponda» con matrícula, número de control, semestre, grupo y turno,
  avance (asignaturas, promedio general, asistencia), tabla de asignaturas con docente,
  fecha en letra, firmas de dirección y control escolar, y folio.
- **Kardex:** datos del alumno en dos columnas, tabla por asignatura con clave, nombre,
  docente, calificaciones de 1°, 2° y 3° parcial, promedio y estado
  (Acreditada / En curso / No acreditada con umbral de 70), resumen de asistencia y criterio de
  acreditación.

### Folio
`CB270-C<id>-AAAAMMDDHHmm` para constancia y `CB270-K<id>-AAAAMMDDHHmm` para kardex. Se imprime
al pie con la nota de verificación ante Servicios Escolares y queda en la bitácora
(`constancia_generada`), así que dirección puede auditar cuántos documentos se emitieron y
para quién.

### Dónde se descargan
En `/panel/expedientes/[id]`, tarjeta **Documentos del alumno**, para dirección, docentes y el
propio estudiante.

---

## Verificación realizada (sin PostgreSQL, modo demo)

| Caso | Resultado |
| --- | --- |
| `GET /api/buscar` sin sesión | `401 {"ok":false,"error":"Inicia sesión para buscar."}` |
| Búsqueda «inventario» con dirección | cuestionarios + formatos, 2 resultados |
| Búsqueda «kardex» con dirección | formato de kardex, 1 resultado |
| Búsqueda «direccion» como estudiante | 0 resultados, sin grupos de alumnos ni usuarios |
| `q` de una letra | 0 resultados, sin consultar |
| Constancia de un alumno | `200`, `application/pdf`, `%PDF-…%%EOF` |
| Kardex de un alumno | `200`, `application/pdf` |
| PDF con 6 asignaturas (datos de muestra) | encabezado, párrafo, 6 renglones con clave, folio y firmas presentes |
| PDF sin asignaturas todavía | párrafo correcto: «cursa 0 asignatura(s)» |
| Sin sesión | `401` |
| Tipo `diploma` | `404` |
| Estudiante pidiendo el kardex de otra cuenta | `403` |
| Estudiante pidiendo su propio kardex | `200` |
| Panel | botón «Buscar…» y atajo `Ctrl K` renderizados |
| Expediente | tarjeta «Documentos del alumno» con ambos enlaces |

`npm run typecheck`, `npm run build` y `eslint` sobre los archivos nuevos: sin errores.

## Pendientes conocidos

- La búsqueda no ordena por relevancia: agrupa por tipo y corta a 5 resultados por grupo. Con
  más de ~900 alumnos conviene añadir `pg_trgm` y orden por similitud.
- El kardex no calcula créditos ni promedio ponderado por horas: el plantel promedia
  asignaturas, igual que la boleta actual.
- Las firmas son líneas para firma autógrafa; no hay firma electrónica ni sello de tiempo.
- La co-docencia no distingue permisos finos (por ejemplo, un co-docente que sólo califica):
  hoy todo co-docente administra el aula completa.
