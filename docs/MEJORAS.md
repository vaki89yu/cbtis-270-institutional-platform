# Plataforma CBTIS 270 — Mejoras propuestas

Catálogo de mejoras sugeridas sobre lo que **ya existe** en el repositorio.
Cada ficha dice qué es, por qué conviene, qué archivos se tocan y cuánto trabajo cuesta.

Escala de esfuerzo: **S** = una sesión corta · **M** = media sesión larga · **L** = varias sesiones.

Estado actual (para ubicarse): 21 tablas en Neon, aula viva con pase de lista,
13 actividades precargadas, biblioteca de formatos con habilitación por docente/semestre/grupo,
expedientes filtrados por tutor, mensajes internos, avisos, almacén y notificaciones.

---

## Bloque 1 — Cerrar lo que ya está a medias (máximo impacto, mínimo costo)

### 1.1 Boleta y concentrado de calificaciones en pantalla · **S**
La consulta `concentradoDeCalificaciones` (alumno × actividad) **ya existe** en
`src/lib/academico/aula.ts` pero ninguna pantalla la usa. Falta:
- Pestaña "Calificaciones" dentro del aula: tabla alumnos × actividades, promedio por parcial y semáforo.
- Vista del alumno: su boleta con las tres parciales y lo que le falta entregar.
- Botón "Exportar a Excel" reusando el generador de `src/lib/formatos/plantillas.ts`.

*Archivos:* `src/app/panel/clases/[id]/page.tsx`, nueva `src/app/panel/calificaciones/page.tsx`.
**Es la función que más le va a pedir un docente y ya está el 70% hecha.**

### 1.2 Material de lectura precargado por submódulo · **S/M**
La tabla `materials` existe y está vacía de contenido curricular. Precargar por módulo
el mismo estilo que `src/lib/academico/actividades.ts`: apuntes, guías de llenado de cada
formato, videos y enlaces. El docente sólo activa/desactiva, igual que las actividades.

*Archivos:* nuevo `src/lib/academico/materiales.ts`, `src/lib/actions/aula.ts`, vista del aula.

### 1.3 Mensajes acotados a la relación real docente–alumno · **S**
`listarDestinatarios` filtra por semestre/grupo/turno, pero la regla acordada es
**tutor**: el alumno sólo escribe a su docente registrado y el docente sólo a sus alumnos.
Alinearlo con `studentProfiles.tutorDocenteId` como ya se hizo en Expedientes.

*Archivos:* `src/lib/comunicacion-datos.ts` (`listarDestinatarios`, `puedeEnviarA`).

### 1.4 Rúbricas y retroalimentación en la entrega · **S**
Hoy se califica con un número. Agregar rúbrica de 3–4 criterios por actividad
(ya hay `puntos` y `tipoEvidencia` en el catálogo) y un campo de comentario que le llegue
al alumno como notificación.

---

## Bloque 2 — El aula viva (lo que hace que se sienta "estar en clase")

### 2.1 Tablero del día · **M**
Al entrar al aula, el docente ve una sola pantalla: quién falta hoy, qué actividad está
activa, cuántas entregas llevan y qué falta por calificar. Un clic para "empezar clase"
(abre pase de lista + activa la actividad del día juntos).

### 2.2 Código de clase / QR para el pase de lista · **M**
El docente proyecta un código de 6 dígitos o un QR; el alumno lo teclea desde su teléfono
y queda registrado. Evita que alguien marque asistencia desde su casa.
Se apoya en `attendance_sessions` que ya tiene `abierta` y `tolerancia_min`; sólo hay que
agregar `codigo` y validarlo.

*Archivos:* `src/db/schema.ts`, `src/lib/ensure-schema.ts`, `src/lib/actions/aula.ts`.

### 2.3 Actualización en vivo sin recargar · **M**
Hoy el docente tiene que refrescar para ver quién ya marcó. Con un endpoint SSE
(`/api/aula/[id]/stream`) o un *polling* de 5 s como el que ya usa el registro, la lista
se va llenando sola mientras pasa lista. Efecto "salón real" inmediato.

### 2.4 Muro del aula (avisos y dudas) · **M**
La tabla `class_posts` ya existe y no se usa. Un hilo por aula donde el docente publica el
tema del día y los alumnos preguntan. Es lo que convierte el aula en un espacio y no en un
formulario.

### 2.5 Horario y calendario escolar · **M**
Cada aula con sus días y horas; el panel muestra "tu próxima clase en 20 min" y bloquea o
avisa cuando alguien intenta pasar lista fuera de horario. Calendario con entregas y parciales.

---

## Bloque 3 — Seguimiento y dirección académica

### 3.1 Alertas tempranas de riesgo · **M**
Regla automática: 3 faltas seguidas, 2 actividades sin entregar o promedio < 7 genera una
notificación al docente y un registro en el expediente. Es lo que pide control escolar para
canalizar a orientación.

### 3.2 Panel de dirección con indicadores · **M**
Para el rol admin: asistencia por grupo, avance por módulo, formatos habilitados, docentes
activos, alumnos en riesgo. Gráficas simples y exportable a Excel/PDF.

### 3.3 Expediente con línea de tiempo · **S/M**
`user_activity` ya registra accesos. Mostrar en el expediente una línea de tiempo:
se registró, entró a clase, entregó, faltó, se le envió mensaje. Un solo lugar para la tutoría.

### 3.4 Justificantes con evidencia y flujo de aprobación · **S**
`attendance_justifications` existe; falta subir el comprobante (receta, oficio) y que el
docente apruebe o rechace, con la falta convirtiéndose en justificada automáticamente.

### 3.5 Reportes oficiales imprimibles · **M**
Lista de asistencia mensual por grupo, concentrado de calificaciones por parcial y
constancia de prácticas — con los encabezados oficiales del plantel, listos para firma.
Ya existe el motor de PDF en `src/lib/formatos/pdf.ts`.

---

## Bloque 4 — Robustez y experiencia

### 4.1 Recuperación de contraseña y cambio de datos · **S**
Hoy sólo hay OTP para registro. Falta "olvidé mi contraseña" y que el alumno pueda
corregir su grupo/semestre (con visto bueno del docente, porque eso mueve su aula).

### 4.2 Administración de usuarios de verdad · **S/M**
En `/panel/usuarios`: dar de baja, reactivar, cambiar de rol, reasignar tutor y fusionar
cuentas duplicadas. Hoy el rol se define en el registro y no hay forma de corregir un error
sin tocar la base.

### 4.3 Uso sin internet estable (PWA) · **M/L**
Instalable en el teléfono, con el pase de lista y el llenado de formatos funcionando offline
y sincronizando al recuperar señal. En un taller o almacén la señal es mala y esto se nota.

### 4.4 Bitácora de auditoría · **S**
Quién habilitó qué formato, quién cambió una calificación y cuándo. Indispensable cuando
llega una revisión y alguien pregunta "¿quién modificó esto?".

### 4.5 Carga masiva de alumnos desde Excel · **M**
El docente sube la lista del grupo (matrícula, nombre, correo) y la plataforma pre-crea las
cuentas; el alumno sólo activa la suya con su correo. Evita 40 registros manuales por grupo.

### 4.6 Accesibilidad y modo alto contraste · **S**
Tamaño de letra ajustable, contraste reforzado y navegación por teclado. El fondo con
wallpaper se ve bien pero castiga la lectura en proyector; un interruptor "modo clase"
que quita fondos y agranda todo ayuda mucho al proyectar.

---

## Orden recomendado

| # | Mejora | Bloque | Esfuerzo | Por qué primero |
|---|--------|--------|----------|-----------------|
| 1 | Calificaciones y boleta en pantalla | 1.1 | S | La consulta ya existe; cierra el ciclo evaluar→ver |
| 2 | Mensajes por tutor | 1.3 | S | Coherencia con la regla de pertenencia ya aplicada |
| 3 | Tablero del día | 2.1 | M | Convierte el aula en algo que se usa a diario |
| 4 | Código/QR de asistencia | 2.2 | M | Resuelve el fraude de la asistencia remota |
| 5 | Material precargado | 1.2 | S/M | Completa "todo viene cargado, sólo se activa" |
| 6 | Alertas de riesgo | 3.1 | M | Valor para tutoría y dirección |
| 7 | Carga masiva de alumnos | 4.5 | M | Quita la fricción del arranque de semestre |
| 8 | Reportes imprimibles | 3.5 | M | Lo que la escuela entrega en papel |
