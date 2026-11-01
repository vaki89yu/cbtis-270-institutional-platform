# Bloque 5 — Banco de reactivos, analítica y recordatorios de entrega

Tres funciones nuevas sobre el aula y los cuestionarios. Ninguna pide captura
masiva: el catálogo de 120 reactivos y los 15 cuestionarios siguen listos para
usarse, y lo que se agrega viene a cubrir lo que el docente hacía fuera de la
plataforma (hoja de cálculo para ver qué reactivo falló el grupo, WhatsApp para
recordar entregas).

---

## 1. Banco de reactivos propio del docente · `/panel/cuestionarios/banco`

El catálogo oficial vive en `src/lib/academico/cuestionarios.ts` y **no se
modifica**. Cada docente puede sumar hasta **40 reactivos propios por
cuestionario**, con:

- enunciado, de 2 a 6 opciones, una marcada como correcta y explicación;
- vista previa con la opción correcta marcada y el autor del reactivo;
- edición en línea, archivado y reactivación (nunca se borra: los intentos ya
  guardados conservan su sentido);
- permiso de escritura sólo para el autor; `admin` puede administrar todos.

**Cómo se integran.** Al abrir el cuestionario, el servidor une catálogo +
reactivos activos (`cuestionarioConExtras`). El alumno recibe la versión pública
—sin `correcta` ni `explicacion`— y el envío se califica en
`/api/cuestionarios/resolver` contra la lista combinada. La regla de seguridad
del catálogo se mantiene intacta: las respuestas correctas no salen del
servidor.

**Archivos**

| Archivo | Qué hace |
|---|---|
| `src/db/schema.ts` (`quizQuestions`) | Tabla `quiz_questions` |
| `src/lib/ensure-schema.ts` | DDL idempotente de la tabla e índice |
| `src/lib/academico/banco-reactivos.ts` | Unión catálogo + propios, validación y respaldo demo |
| `src/lib/actions/banco.ts` | Crear, editar, archivar y reactivar con bitácora |
| `src/app/panel/cuestionarios/banco/page.tsx` | Pantalla del banco |
| `src/app/api/cuestionarios/resolver/route.ts` | Califica catálogo + propios |
| `src/app/panel/cuestionarios/[clave]/page.tsx` | Examen con los reactivos extra |

**Validación en servidor** (`validarReactivo`): enunciado ≥ 10 caracteres,
mínimo 2 opciones, sin opciones repetidas, índice correcto dentro del rango y
límites de longitud. Los errores se muestran con el mismo `FormEstado` que el
resto del panel.

---

## 2. Analítica por reactivo · `/panel/cuestionarios/analitica`

Se calcula con lo que ya estaba guardado: `quiz_attempts.respuestas` dice qué
opción eligió cada alumno en cada posición.

- **Indicadores**: intentos, alumnos, promedio y porcentaje de acierto global.
- **Por cuestionario**: intentos, alumnos, promedio y acierto; enlace al detalle.
- **Por reactivo**: barra de acierto, cuántas veces se eligió cada opción y
  cuál es **el error más común** (el distractor que más se lleva al grupo).
- **Los más fallados**: reactivos con menos de 60% de acierto y al menos dos
  intentos, para retomarlos en clase.

**Alcance por rol**: `admin` analiza todo el plantel; `docente` sólo ve los
intentos de los alumnos inscritos en sus aulas; `estudiante` no tiene acceso.
Sin base de datos la pantalla se alimenta del almacén demo, así que no se rompe.

**Archivos**

| Archivo | Qué hace |
|---|---|
| `src/lib/academico/analitica.ts` | Agregados por reactivo y por cuestionario |
| `src/app/panel/cuestionarios/analitica/page.tsx` | Pantalla y detalle |

---

## 3. Recordatorio de entrega · aula y detalle de la tarea

Un botón en el aula (`Actividades del plan de estudios`) y otro en la pantalla
de revisión de la tarea:

> «Recordar a los N que no han entregado»

Envía una notificación interna a cada alumno que no ha entregado la actividad,
con el nombre de la tarea, el aula y la fecha límite.

**Anti-spam**: si la persona ya recibió un recordatorio de esa misma actividad
en las **últimas 12 horas**, no se le vuelve a notificar. Cada envío queda en
`audit_log` con cuántos se avisaron de cuántos pendientes.

**Archivos**

| Archivo | Qué hace |
|---|---|
| `src/lib/actions/aula.ts` (`recordarPendientesAction`) | Verifica que el aula sea del docente, calcula pendientes, deduplica y notifica |
| `src/app/panel/clases/[id]/page.tsx` | Botón por actividad activa |
| `src/app/panel/tareas/[id]/page.tsx` | Botón en la revisión de la tarea y contador de «sin entregar» |

---

## Modo demo (sin PostgreSQL)

Estas funciones siguen funcionando en el preview aunque no haya base:

- `quiz_questions` y los intentos tienen respaldo en `src/lib/demo-store.ts`
  (`reactivos` y `quizAttempts`), persistido igual que el resto del almacén demo;
- el guardado de un intento cae al almacén demo cuando la base falla, de modo
  que el historial del alumno y la analítica muestran datos reales de la sesión;
- el banco permite crear, editar, archivar y reactivar sin base.

En producción (Neon) se usa la tabla real: el DDL de `ensure-schema.ts` la crea
en el primer arranque sin migración manual.

---

## Verificación de este bloque

- `npm run typecheck` en verde.
- `npm run build` en verde; rutas nuevas: `/panel/cuestionarios/banco` y
  `/panel/cuestionarios/analitica`.
- ESLint sin observaciones en todos los archivos nuevos o tocados.
  Permanecen 15 errores **preexistentes** de las reglas nuevas de
  `eslint-config-next` 16 (`react-hooks/set-state-in-effect`,
  `react-hooks/purity`, `react/no-unescaped-entities`) en
  `registro-profesional.tsx` y componentes de acceso. Se corrigió uno
  (`Date.now()` en `tareas/[id]`, ahora vía `fechaVencida`).
- Prueba funcional en el servidor de desarrollo: con un docente demo se creó un
  reactivo propio en `Q-M1-P1`, el examen mostró **9 reactivos** (8 del catálogo
  + 1 propio), el envío con 8 respuestas se rechazó y con 9 se calificó; en el
  HTML del examen no aparece ni la opción correcta ni la explicación; la
  analítica mostró el reactivo, el porcentaje de acierto y el «error más común».

---

## Pendientes sugeridos (no incluidos)

1. **Editar la posición** de los reactivos propios (hoy van al final).
2. **Compartir reactivos entre docentes** del mismo módulo (con revisión
   académica antes de publicarlos al grupo).
3. **Exportar la analítica** a Excel reutilizando `plantillaDeReactivos`.
4. **Recordatorio automático** por correo o PWA, hoy es manual desde el aula.
