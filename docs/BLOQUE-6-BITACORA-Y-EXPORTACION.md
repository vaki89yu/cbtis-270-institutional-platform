# Bloque 6 — Bitácora consultable y exportación a Excel/CSV

PR 1 del bloque **B (operativo escolar)**. Cubre dos huecos que no existían en
la plataforma: la bitácora de auditoría se llenaba pero nadie podía consultarla,
y no había una sola forma de sacar datos a una hoja de cálculo.

---

## 1. Bitácora de auditoría · `/panel/bitacora` (sólo admin)

`audit_log` se llenaba desde el Bloque 4 pero sólo se veían los últimos 25
registros dentro de `/panel/usuarios`. Ahora tiene pantalla propia:

- **Filtros**: búsqueda libre (actor, acción, entidad o detalle), acción, entidad
  y rango de fechas `desde`/`hasta` (el fin es exclusivo: incluye todo el día).
- **Paginación** de 40 registros por página, con orden `createdAt DESC`.
- **Indicadores**: total de registros filtrados, actores distintos, tipos de
  acción y entidades afectadas.
- **Facetas** calculadas sobre todo el histórico (no sobre la página) para el
  desplegable de acciones y entidades, con su conteo.
- Cada exportación que se genera queda registrada como
  `exportacion_generada`, de modo que la propia bitácora queda auditada.
- Entrada en el menú del panel sólo para `admin`.

**Archivos**: `src/lib/bitacora.ts`, `src/app/panel/bitacora/page.tsx`,
`src/app/panel/layout.tsx` (entrada de menú con `soloAdmin`).

**Respaldo demo**: `demo-store.ts` guarda un arreglo `auditoria` (máximo 5000
registros) y `registrarAuditoria` escribe ahí cuando no hay base. Así la pantalla
y su exportación se pueden probar en el preview sin PostgreSQL.

---

## 2. Exportación XLSX y CSV · `/api/exportar/[tipo]`

Un solo endpoint sirve todos los reportes en dos formatos:

```
/api/exportar/{tipo}?formato=xlsx|csv&aula=…&clave=…&q=…&desde=…&hasta=…
```

| Tipo | Contenido | Quién |
|---|---|---|
| `calificaciones` | Concentrado alumno × actividad, con promedio | admin y docente dueño del aula |
| `asistencias` | Presentes, retardos, faltas, justificados, total y % por alumno | admin y docente dueño del aula |
| `alumnos` | Lista del grupo (con `aula`) o padrón de alumnos con tutor y contacto | admin; docente sólo sus aulas |
| `usuarios` | Padrón completo con rol, estado y verificación | sólo admin |
| `analitica` | Un renglón por reactivo: intentos, aciertos, % y error más común | admin; docente sus alumnos |
| `practicas` | Agenda del Almacén Escuela con EPP y estado | admin; docente las suyas |
| `embarques` | Folio, ruta, estado, avance y operador | admin; docente los suyos |
| `bitacora` | Movimientos con actor, acción, entidad y detalle | sólo admin |

**Reglas de acceso** viven en `src/lib/exportacion.ts`: el estudiante recibe
`403`, el docente sólo puede exportar sus aulas y sus alumnos, y la bitácora y el
padrón de usuarios son exclusivos de administración. Sin sesión, `401`.

### Formato de los archivos

- **XLSX** con `exceljs` (ya era dependencia): título y fecha en las primeras
  filas, encabezado azul institucional con fila congelada (`ySplit: 4`),
  autofiltro, ancho de columna calculado y nota al pie con la fuente o el
  criterio aplicado.
- **CSV** con BOM UTF-8 y separador `;` (lo que Excel en español abre bien),
  saltos CRLF y título/nota dentro del archivo. Las celdas que empiezan con
  `=`, `+`, `-` o `@` se prefijan con `'` para evitar **inyección de fórmulas**.
- Nombre del archivo: `CBTIS270-<tipo>[-aulaN]-AAAAMMDD-HHmm.xlsx|csv`.

### Dónde están los botones

`<BotonExportar>` (componente de servidor, sin JavaScript) pinta dos enlaces
—XLSX y CSV— que arrastran los filtros de la pantalla:

| Pantalla | Tipo |
|---|---|
| Calificaciones (concentrado) | `calificaciones` |
| Asistencias (selector de aula) | `asistencias` |
| Expedientes | `alumnos` |
| Usuarios | `usuarios` |
| Cuestionarios → Analítica | `analitica` |
| Almacén Escuela | `practicas` |
| Rastreo GPS | `embarques` |
| Bitácora | `bitacora` |

---

## Verificación de este bloque

- `npm run typecheck` en verde.
- `npm run build` en verde; rutas nuevas compiladas: `/api/exportar/[tipo]` y
  `/panel/bitacora`.
- ESLint sin observaciones en los archivos nuevos y tocados (los 15 errores
  preexistentes de componentes de acceso/registro siguen fuera de alcance).
- Pruebas funcionales contra el servidor de desarrollo:
  - `/panel/bitacora` responde 200 y muestra los movimientos.
  - Filtro `?accion=exportacion_generada`: desaparece el renglón del cuestionario
    y queda el de exportación; `?q=noexiste` muestra el estado vacío.
  - `/api/exportar/bitacora?formato=csv`: `200`, `text/csv; charset=utf-8`,
    BOM correcto, encabezados con `;` y filas reales.
  - `/api/exportar/analitica?formato=xlsx`: `200`, tipo MIME de Excel; el archivo
    se abre como ZIP válido, contiene la hoja, los encabezados y los datos del
    intento registrado.
  - `/api/exportar/usuarios` como admin: `200` y el XLSX trae las cuentas; como
    docente: `403`; sin sesión: `401`; tipo inexistente: `404`.

---

## Pendientes del bloque B

| # | Mejora | Estado |
|---|---|---|
| B1 | Consulta para tutores por enlace con token | siguiente PR |
| B3 | Búsqueda global con `Ctrl/⌘+K` | pendiente |
| B5 | Recordatorios automáticos con cron de Vercel | pendiente |
| B7 | Multi-docente por aula | pendiente |
| B8 | Constancia y kardex en PDF | pendiente |
| B4 | Push PWA | fuera de alcance (requiere llaves VAPID) |
