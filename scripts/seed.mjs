import { randomBytes, scryptSync } from "node:crypto";
import { readFileSync } from "node:fs";
import pg from "pg";

function cargarEnv() {
  try {
    const contenido = readFileSync(new URL("../.env", import.meta.url), "utf8");
    for (const linea of contenido.split("\n")) {
      const limpia = linea.trim();
      if (!limpia || limpia.startsWith("#")) continue;
      const idx = limpia.indexOf("=");
      if (idx === -1) continue;
      const clave = limpia.slice(0, idx).trim();
      const valor = limpia.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[clave]) process.env[clave] = valor;
    }
  } catch {
    /* sin archivo .env */
  }
}

cargarEnv();

const connectionString =
  process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:5432/app_db";

const hash = (password) => {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
};

const dias = (n) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);
const RESET = process.argv.includes("--reset");

const pool = new pg.Pool({ connectionString });

async function main() {
  const cliente = await pool.connect();
  try {
    if (RESET) {
      await cliente.query(
        `truncate table attendances, attendance_justifications, logistics_templates, warehouse_practices,
         internal_messages, notifications, user_activity, otp_codes,
         submissions, assignments, class_posts, class_sessions, materials,
         enrollments, courses, announcements, sessions, student_profiles, teacher_profiles, users
         restart identity cascade`,
      );
      console.log("Tablas reiniciadas.");
    }

    const { rows } = await cliente.query("select count(*)::int as total from users");
    if (rows[0].total > 0) {
      console.log("La base ya contiene usuarios; no se vuelve a sembrar.");
      return;
    }

    const clave = hash("cbtis270");

    // rol, matrícula, módulo profesional, semestre, turno
    const usuarios = [
      ["Lic. Marisol Aguilar Ríos", "admin@cbtis270.edu.mx", "admin", "EMP-1001", "Jefatura de Logística", null, "Matutino"],
      ["Ing. Héctor Salinas Vega", "docente@cbtis270.edu.mx", "docente", "EMP-2043", "Gestión de Almacenes e Inventarios", null, "Matutino"],
      ["Mtra. Diana López Cruz", "dlopez@cbtis270.edu.mx", "docente", "EMP-2088", "Comercio Exterior y Aduanas", null, "Vespertino"],
      ["Ana Karen Ruiz Méndez", "alumno@cbtis270.edu.mx", "estudiante", "270-2023-014", "Gestión de Almacenes e Inventarios", 5, "Matutino"],
      ["Luis Fernando Ortega Pérez", "lortega@cbtis270.edu.mx", "estudiante", "270-2023-027", "Transporte y Distribución", 5, "Matutino"],
      ["Jimena Castillo Ramos", "jcastillo@cbtis270.edu.mx", "estudiante", "270-2023-033", "Cadena de Suministro", 5, "Matutino"],
      ["Diego Armando Solís Nava", "dsolis@cbtis270.edu.mx", "estudiante", "270-2024-006", "Comercio Exterior y Aduanas", 3, "Vespertino"],
      ["Paola Hernández Zúñiga", "phernandez@cbtis270.edu.mx", "estudiante", "270-2024-019", "Compras y Abastecimiento", 3, "Vespertino"],
      ["Kevin Josué Márquez Tovar", "kmarquez@cbtis270.edu.mx", "estudiante", "270-2024-041", "Logística Inversa y Sustentable", 4, "Matutino"],
    ];

    const ids = {};
    for (const [nombre, email, rol, matricula, especialidad, semestre, turno] of usuarios) {
      const res = await cliente.query(
        `insert into users (nombre, email, password_hash, rol, matricula, especialidad, semestre, turno)
         values ($1,$2,$3,$4,$5,$6,$7,$8) returning id`,
        [nombre, email, clave, rol, matricula, especialidad, semestre, turno],
      );
      ids[email] = res.rows[0].id;
    }

    const docente1 = ids["docente@cbtis270.edu.mx"];
    const docente2 = ids["dlopez@cbtis270.edu.mx"];
    const admin = ids["admin@cbtis270.edu.mx"];
    const alumno1 = ids["alumno@cbtis270.edu.mx"];

    await cliente.query(
      `insert into teacher_profiles (user_id, numero_empleado, departamento, asignatura_base, modulo_numero, submodulo_numero, modulo_nombre, submodulo_nombre, semestre_responsable, grupo_responsable, turno_responsable, grupos_responsables, turnos_responsables, telefono)
       values ($1,'EMP-2043','Logística','Módulo 2 · Submódulo 1',2,1,'Gestión de almacenes e inventarios','Control de inventarios y conteo cíclico',5,'Todos','Matutino','E,F','Matutino','55 1010 2043'),
              ($2,'EMP-2088','Logística','Módulo 4 · Submódulo 1',4,1,'Comercio exterior y aduanas','Operación aduanera y regímenes',3,'F','Vespertino','F','Vespertino','55 1010 2088')`,
      [docente1, docente2],
    );

    const perfilesAlumnos = [
      ["alumno@cbtis270.edu.mx", "270-2023-014", "CE-270-014", "E", docente1, "55 3300 1014", "María López Ruiz", "55 7000 1014"],
      ["lortega@cbtis270.edu.mx", "270-2023-027", "CE-270-027", "E", docente1, "55 3300 1027", "Fernando Ortega Soto", "55 7000 1027"],
      ["jcastillo@cbtis270.edu.mx", "270-2023-033", "CE-270-033", "E", docente1, "55 3300 1033", "Rosa Ramos Vega", "55 7000 1033"],
      ["dsolis@cbtis270.edu.mx", "270-2024-006", "CE-270-006", "F", docente2, "55 3300 1006", "Armando Solís Méndez", "55 7000 1006"],
      ["phernandez@cbtis270.edu.mx", "270-2024-019", "CE-270-019", "F", docente2, "55 3300 1019", "Paola Zúñiga Pérez", "55 7000 1019"],
      ["kmarquez@cbtis270.edu.mx", "270-2024-041", "CE-270-041", "E", docente1, "55 3300 1041", "Josefina Tovar Ríos", "55 7000 1041"],
    ];
    for (const [correo, nc, nce, grupo, tutor, tel, contacto, telContacto] of perfilesAlumnos) {
      await cliente.query(
        `insert into student_profiles (user_id, numero_control, numero_control_escolar, grupo, tutor_docente_id, telefono, contacto_emergencia_nombre, contacto_emergencia_telefono, acepto_reglamento)
         values ($1,$2,$3,$4,$5,$6,$7,$8,true)`,
        [ids[correo], nc, nce, grupo, tutor, tel, contacto, telContacto],
      );
    }

    // nombre, clave, descripción, módulo, semestre, grupo, turno, aula, color, docente
    const clases = [
      ["Gestión de almacenes e inventarios", "LOG-401", "Recepción, acomodo, picking y despacho de mercancías. Control de existencias con kardex, PEPS, UEPS y clasificación ABC.", "Gestión de Almacenes e Inventarios", 4, "E", "Matutino", "Almacén escuela · Edificio C", "#0B5C3F", docente1],
      ["Transporte y distribución de mercancías", "LOG-501", "Modos de transporte, costeo de fletes, diseño de rutas, consolidación de carga y entrega de última milla.", "Transporte y Distribución", 5, "E", "Matutino", "Aula 12 · Simulador de rutas", "#1D4ED8", docente1],
      ["Fundamentos de la cadena de suministro", "LOG-301", "Flujo de materiales, información y capital entre proveedores, planta, distribución y cliente final.", "Cadena de Suministro", 3, "F", "Matutino", "Aula 8", "#12A468", docente1],
      ["Comercio exterior y aduanas", "LOG-601", "INCOTERMS 2020, pedimentos, regímenes aduaneros y documentación de importación y exportación.", "Comercio Exterior y Aduanas", 6, "E", "Vespertino", "Aula 15", "#B3862A", docente2],
      ["Compras y abastecimiento", "LOG-502", "Evaluación y selección de proveedores, órdenes de compra, punto de reorden y negociación.", "Compras y Abastecimiento", 5, "F", "Vespertino", "Aula 11", "#9333EA", docente2],
      ["Logística inversa y sustentable", "LOG-602", "Devoluciones, reciclaje de empaques, huella de carbono e indicadores KPI del área logística.", "Logística Inversa y Sustentable", 6, "F", "Matutino", "Aula 9", "#DC2626", docente1],
    ];

    const claseIds = {};
    for (const c of clases) {
      const res = await cliente.query(
        `insert into courses (nombre, clave, descripcion, especialidad, semestre, grupo, turno, aula, color, docente_id)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning id`,
        c,
      );
      claseIds[c[1]] = res.rows[0].id;
    }

    const inscripciones = [
      ["LOG-401", ["alumno@cbtis270.edu.mx", "lortega@cbtis270.edu.mx", "jcastillo@cbtis270.edu.mx", "kmarquez@cbtis270.edu.mx"]],
      ["LOG-501", ["alumno@cbtis270.edu.mx", "lortega@cbtis270.edu.mx", "jcastillo@cbtis270.edu.mx"]],
      ["LOG-301", ["dsolis@cbtis270.edu.mx", "phernandez@cbtis270.edu.mx"]],
      ["LOG-601", ["dsolis@cbtis270.edu.mx", "phernandez@cbtis270.edu.mx"]],
      ["LOG-502", ["phernandez@cbtis270.edu.mx", "alumno@cbtis270.edu.mx"]],
      ["LOG-602", ["kmarquez@cbtis270.edu.mx", "jcastillo@cbtis270.edu.mx"]],
    ];
    for (const [claveClase, correos] of inscripciones) {
      for (const correo of correos) {
        await cliente.query("insert into enrollments (course_id, student_id) values ($1,$2)", [
          claseIds[claveClase],
          ids[correo],
        ]);
      }
    }

    const materiales = [
      ["LOG-401", "Formato de kardex (PEPS / UEPS)", "Plantilla de control de entradas y salidas para la práctica de inventarios.", "enlace", "https://ejemplo.cbtis270.edu.mx/kardex.xlsx"],
      ["LOG-401", "Layout del almacén escuela", "Plano de racks, pasillos, zona de recepción y zona de embarque.", "apunte", null],
      ["LOG-401", "Video: clasificación ABC de inventarios", "Explicación con ejemplo numérico paso a paso.", "video", "https://www.youtube.com/results?search_query=clasificacion+abc+inventarios"],
      ["LOG-501", "Tabla de costeo de fletes", "Cálculo de costo por kilómetro, casetas y combustible.", "practica", null],
      ["LOG-501", "Carta porte: guía de llenado", "Requisitos del complemento Carta Porte del SAT.", "lectura", "https://www.sat.gob.mx"],
      ["LOG-601", "INCOTERMS 2020 · Cuadro comparativo", "Responsabilidades de comprador y vendedor en cada término.", "apunte", null],
      ["LOG-301", "Mapa de la cadena de suministro", "Diagrama de flujo desde proveedor hasta cliente final.", "apunte", null],
      ["LOG-502", "Formato de orden de compra", "Documento base para la práctica de abastecimiento.", "enlace", "https://ejemplo.cbtis270.edu.mx/orden-compra.pdf"],
    ];
    for (const [claveClase, titulo, descripcion, tipo, url] of materiales) {
      await cliente.query(
        "insert into materials (course_id, titulo, descripcion, tipo, url) values ($1,$2,$3,$4,$5)",
        [claseIds[claveClase], titulo, descripcion, tipo, url],
      );
    }

    const sesiones = [
      ["LOG-401", "Práctica: recepción y acomodo de mercancía", "Uso de lector de código de barras y registro en kardex.", "Presencial", null, dias(1), 100],
      ["LOG-401", "Conteo cíclico e inventario físico", "Levantamiento de inventario por zonas del almacén escuela.", "Híbrida", "https://meet.google.com/cbtis270-almacen", dias(5), 50],
      ["LOG-501", "Diseño de rutas de distribución", "Ejercicio de ruteo con restricciones de tiempo y capacidad.", "Virtual", "https://meet.google.com/cbtis270-transporte", dias(2), 50],
      ["LOG-601", "Llenado de pedimento aduanal", "Caso práctico de importación definitiva A1.", "Presencial", null, dias(3), 50],
      ["LOG-301", "Visita industrial: centro de distribución", "Recorrido guiado por el CEDIS regional.", "Presencial", null, dias(7), 240],
      ["LOG-502", "Evaluación de proveedores", "Matriz de ponderación por precio, calidad y tiempo de entrega.", "Virtual", "https://meet.google.com/cbtis270-compras", dias(4), 50],
    ];
    for (const [claveClase, tema, descripcion, modalidad, enlace, inicia, duracion] of sesiones) {
      await cliente.query(
        `insert into class_sessions (course_id, tema, descripcion, modalidad, enlace, inicia, duracion_min)
         values ($1,$2,$3,$4,$5,$6,$7)`,
        [claseIds[claveClase], tema, descripcion, modalidad, enlace, inicia, duracion],
      );
    }

    // Tareas con parciales (1er Parcial, 2do Parcial, 3er Parcial)
    const tareas = [
      ["LOG-401", "Kardex de la práctica de almacén", "Registra 15 movimientos de entrada y salida con método PEPS. Entrega el archivo con saldos y valuación final.", 100, 2, dias(5)],
      ["LOG-401", "Clasificación ABC de inventario", "Con el listado de 30 artículos, determina las categorías A, B y C por valor de consumo anual.", 50, 1, dias(-2)],
      ["LOG-401", "Layout y asignación de ubicaciones", "Diseña el plano de distribución del almacén asignando ubicaciones por rotación alta, media y baja.", 100, 2, dias(12)],
      ["LOG-501", "Diseño de ruta de última milla", "Planea la ruta de 8 entregas minimizando kilómetros. Justifica el orden y calcula el costo del flete.", 100, 1, dias(6)],
      ["LOG-601", "Cuadro comparativo de INCOTERMS", "Elabora el cuadro de los 11 INCOTERMS 2020 señalando dónde transfiere el riesgo.", 100, 1, dias(4)],
      ["LOG-301", "Mapa de la cadena de suministro", "Diagrama la cadena de suministro de un producto local, desde materia prima hasta el consumidor.", 100, 1, dias(8)],
      ["LOG-502", "Matriz de evaluación de proveedores", "Evalúa tres proveedores reales con criterios ponderados y emite tu recomendación de compra.", 100, 1, dias(3)],
    ];
    const tareaIds = {};
    for (const [claveClase, titulo, instrucciones, puntos, parcial, fecha] of tareas) {
      const res = await cliente.query(
        `insert into assignments (course_id, titulo, instrucciones, puntos, parcial, fecha_entrega)
         values ($1,$2,$3,$4,$5,$6) returning id`,
        [claseIds[claveClase], titulo, instrucciones, puntos, parcial, fecha],
      );
      tareaIds[titulo] = res.rows[0].id;
    }

    const entregas = [
      ["Clasificación ABC de inventario", "alumno@cbtis270.edu.mx", "Adjunto el archivo con las tres categorías. Los artículos A representan el 72% del valor de consumo.", "https://drive.google.com/ejemplo-abc", 48, "Muy buen análisis. Cuida el redondeo de los porcentajes acumulados."],
      ["Clasificación ABC de inventario", "lortega@cbtis270.edu.mx", "Entrego la clasificación, me faltó calcular el porcentaje acumulado de la categoría C.", null, null, null],
      ["Clasificación ABC de inventario", "jcastillo@cbtis270.edu.mx", "Anexo tabla en Excel con gráfica de Pareto.", "https://drive.google.com/ejemplo-pareto", 50, "Excelente, la gráfica de Pareto suma valor al análisis."],
      ["Kardex de la práctica de almacén", "kmarquez@cbtis270.edu.mx", "Subo el kardex con los 15 movimientos y el saldo valuado.", "https://drive.google.com/ejemplo-kardex", null, null],
      ["Diseño de ruta de última milla", "alumno@cbtis270.edu.mx", "Ruta optimizada de 8 entregas: 42 km totales y costo de flete de $860.", null, null, null],
    ];
    for (const [tituloTarea, correo, contenido, url, calificacion, retro] of entregas) {
      await cliente.query(
        `insert into submissions (assignment_id, student_id, contenido, url, calificacion, retroalimentacion, calificado_en)
         values ($1,$2,$3,$4,$5,$6,$7)`,
        [
          tareaIds[tituloTarea],
          ids[correo],
          contenido,
          url,
          calificacion,
          retro,
          calificacion != null ? new Date() : null,
        ],
      );
    }

    // MEJORA 1: Asistencias Digitales para alumnos
    const fechasAsistencia = [dias(-6), dias(-4), dias(-2), dias(-1), dias(0)];
    const alumnosCurso401 = [alumno1, ids["lortega@cbtis270.edu.mx"], ids["jcastillo@cbtis270.edu.mx"], ids["kmarquez@cbtis270.edu.mx"]];

    for (const f of fechasAsistencia) {
      for (const stId of alumnosCurso401) {
        const est = stId === alumno1 && f.getTime() === fechasAsistencia[1].getTime() ? "retardo" : "presente";
        await cliente.query(
          `insert into attendances (course_id, student_id, fecha, estado, observacion)
           values ($1, $2, $3, $4, $5) on conflict do nothing`,
          [claseIds["LOG-401"], stId, f, est, null],
        );
      }
    }

    // MEJORA 4: Justificante médico de ejemplo
    await cliente.query(
      `insert into attendance_justifications (student_id, course_id, fecha_falta, motivo, documento_url, estado, nota_revision, revisado_por_id)
       values ($1, $2, $3, 'Cita médica en el IMSS por malestar estomacal.', 'https://ejemplo.cbtis270.edu.mx/receta-imss.pdf', 'aprobado', 'Justificante oficial verificado y registrado.', $4)`,
      [alumno1, claseIds["LOG-401"], dias(-7), docente1],
    );

    // MEJORA 2: Biblioteca de Formatos Logísticos Oficiales
    const formatos = [
      ["FOR-LOG-01", "Kardex de Control de Existencias (PEPS y Promedios)", "Almacén e Inventarios", "Hoja de cálculo oficial para registrar entradas, salidas y valuación de inventario con método Primeras Entradas Primeras Salidas.", "xlsx", "https://ejemplo.cbtis270.edu.mx/kardex-oficial.xlsx", 45],
      ["FOR-LOG-02", "Layout y Zonificación de Almacén Escuela", "Almacén e Inventarios", "Plantilla en cuadrícula milimétrica para diseño de pasillos, racks selectivos, zona de picking y muelle de carga.", "pdf", "https://ejemplo.cbtis270.edu.mx/layout-almacen.pdf", 38],
      ["FOR-LOG-03", "Orden de Compra y Requisición de Materiales", "Compras y Abastecimiento", "Formato estándar con especificaciones de proveedor, precios unitarios, condiciones de entrega INCOTERMS y firmas de autorización.", "xlsx", "https://ejemplo.cbtis270.edu.mx/orden-compra.xlsx", 29],
      ["FOR-LOG-04", "Matriz de Costeo de Fletes y Selección de Rutas", "Transporte y Rutas", "Calculadora para flete terrestre: costo por kilómetro, casetas CAPUFE, consumo de diésel y cálculo de margen de ganancia.", "xlsx", "https://ejemplo.cbtis270.edu.mx/costeo-fletes.xlsx", 52],
      ["FOR-LOG-05", "Pedimento Aduanal Simplificado (Importación A1)", "Comercio Exterior", "Estructura del pedimento mexicano con clave de régimen, valor comercial, valor en aduana, aranceles IGI e IVA.", "pdf", "https://ejemplo.cbtis270.edu.mx/pedimento-a1.pdf", 41],
      ["FOR-LOG-06", "Checklist Pre-operacional de Montacargas y Seguridad", "Seguridad y Calidad", "Lista de verificación diaria para montacargas de hombre sentado: frenos, horquillas, torreta, extintor y equipo de protección.", "pdf", "https://ejemplo.cbtis270.edu.mx/checklist-montacargas.pdf", 63],
    ];
    for (const [cod, tit, cat, desc, tipo, url, descargas] of formatos) {
      await cliente.query(
        `insert into logistics_templates (codigo, titulo, categoria, descripcion, tipo_archivo, url_descarga, descargas)
         values ($1, $2, $3, $4, $5, $6, $7)`,
        [cod, tit, cat, desc, tipo, url, descargas],
      );
    }

    // MEJORA 6: Prácticas en Almacén Escuela Edificio C
    const practicas = [
      [claseIds["LOG-401"], docente1, "Práctica 1: Conteo Cíclico en Racks de Nivel 1 y 2", "Levantamiento de inventario físico en estantería selectiva, cotejo contra kardex y cálculo de precisión de registro (IRA).", "Zona de Racks y Estantería A", "Transpaleta hidráulica manual, lectores de código de barras Honeywell, tableros de conteo", "Chaleco reflejante reglamentario, calzado con casquillo de acero, guantes de carnaza", dias(3), 100, 30, "programada"],
      [claseIds["LOG-401"], docente1, "Práctica 2: Maniobras de Estiba y Paletizado con Montacargas", "Recepción de tarimas estándar de 1.0 x 1.2 m, emplayado manual y acomodo en altura supervisado por el instructor.", "Muelle de Embarque y Descarga", "Montacargas contrabalanceado eléctrico, película plástica estirable (film)", "Casco de seguridad de polietileno, chaleco reflejante, botas con casquillo, faja lumbar", dias(7), 120, 25, "programada"],
      [claseIds["LOG-501"], docente1, "Práctica 3: Inspección de Unidad de Carga y Complemento Carta Porte", "Revisión física de caja seca de 48 pies: sellos de seguridad, sujeción de carga con bandas y cotejo documental SAT.", "Patio de Maniobras Exterior", "Tensiómetros de banda, precintos fiscales de seguridad numerados", "Chaleco reflejante de alta visibilidad, guantes de nitrilo, lentes de protección", dias(10), 90, 28, "programada"],
    ];
    for (const [cId, dId, tit, obj, area, eqU, seg, fP, dur, cupo, est] of practicas) {
      await cliente.query(
        `insert into warehouse_practices (course_id, docente_id, titulo, objetivo, area_almacen, equipos_utilizados, equipo_seguridad_obligatorio, fecha_practica, duracion_minutos, cupo_maximo, estado)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [cId, dId, tit, obj, area, eqU, seg, fP, dur, cupo, est],
      );
    }

    const publicaciones = [
      ["LOG-401", docente1, "Recuerden que para la práctica del almacén escuela es indispensable traer chaleco reflejante y calzado de protección. No se permitirá acceso sin equipo completo."],
      ["LOG-401", alumno1, "Profe, ¿la práctica de kardex se entrega en el formato oficial FOR-LOG-01 descargable en la plataforma?"],
      ["LOG-501", docente1, "Ya está disponible la tabla de costeo de fletes para la actividad del 1er Parcial."],
      ["LOG-601", docente2, "Para la sesión de pedimento aduanal traigan la plantilla oficial de pedimento A1."],
    ];
    for (const [claveClase, autor, contenido] of publicaciones) {
      await cliente.query(
        "insert into class_posts (course_id, autor_id, contenido) values ($1,$2,$3)",
        [claseIds[claveClase], autor, contenido],
      );
    }

    const avisos = [
      ["Apertura del Almacén Escuela (Edificio C)", "A partir de esta semana inician las prácticas de recepción, acomodo y manejo de montacargas en el Almacén Escuela. Consulta tu horario y equipo de seguridad.", "Prácticas"],
      ["Biblioteca de Formatos Logísticos Disponibles", "Ya puedes descargar desde la plataforma los formatos oficiales de Kardex, Carta Porte y Pedimento para tus actividades del semestre.", "Académico"],
      ["Visita al Centro de Distribución Regional", "Los grupos de Logística asistirán al CEDIS regional. Entrega tu permiso firmado en la jefatura de carrera antes del viernes.", "Visitas industriales"],
      ["Corte de Calificaciones del 1er Parcial", "Los docentes capturarán las calificaciones del 1er Parcial en la plataforma a más tardar el viernes.", "Académico"],
    ];
    for (const [titulo, contenido, categoria] of avisos) {
      await cliente.query(
        "insert into announcements (titulo, contenido, categoria, autor_id, publicado) values ($1,$2,$3,$4,true)",
        [titulo, contenido, categoria, admin],
      );
    }

    console.log("Base de datos de Logística sembrada exitosamente con todas las mejoras.");
  } finally {
    cliente.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
