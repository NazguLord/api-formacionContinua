import pool from '../config/db.js';

const splitLista = (valor) => (valor ? String(valor).split('||').filter(Boolean) : []);

const mapearBoolean = (valor) => Boolean(valor);

const obtenerCurso = async (cursoId) => {
  const [rows] = await pool.execute(
    `
      SELECT
        c.*,
        GROUP_CONCAT(DISTINCT cc.nombre ORDER BY cc.nombre SEPARATOR '||') AS categorias,
        GROUP_CONCAT(DISTINCT ct.nombre ORDER BY ct.nombre SEPARATOR '||') AS tags
      FROM cursos c
      LEFT JOIN curso_categoria_relaciones ccr ON ccr.curso_id = c.id
      LEFT JOIN curso_categorias cc ON cc.id = ccr.categoria_id
      LEFT JOIN curso_tags ct ON ct.curso_id = c.id
      WHERE c.id = ?
      GROUP BY c.id
      LIMIT 1
    `,
    [cursoId]
  );

  const curso = rows[0];
  if (!curso) return null;

  return {
    id: curso.id,
    neolmsId: curso.neolms_id,
    parentNeolmsId: curso.parent_neolms_id,
    accessCode: curso.access_code,
    nombre: curso.nombre,
    descripcionCorta: curso.descripcion_corta,
    descripcionLarga: curso.descripcion_larga,
    imagenUrl: curso.imagen_url,
    estilo: curso.estilo,
    fechaInicio: curso.fecha_inicio,
    fechaFin: curso.fecha_fin,
    zonaHoraria: curso.zona_horaria,
    codigoCurso: curso.codigo_curso,
    codigoSeccion: curso.codigo_seccion,
    creditos: curso.creditos,
    precio: curso.precio,
    organizacionId: curso.organizacion_id,
    organizacionNombre: curso.organizacion_nombre,
    privado: mapearBoolean(curso.privado),
    archivado: mapearBoolean(curso.archivado),
    archivadoEn: curso.archivado_en,
    archiverId: curso.archiver_id,
    bloqueado: mapearBoolean(curso.bloqueado),
    mostrarCatalogo: mapearBoolean(curso.mostrar_catalogo),
    inscripcionAbierta: mapearBoolean(curso.inscripcion_abierta),
    inscripcionPublica: mapearBoolean(curso.inscripcion_publica),
    allowUnenrollment: mapearBoolean(curso.allow_unenrollment),
    deleteHistoryOnUnenroll: mapearBoolean(curso.delete_history_on_unenroll),
    allowReenrollment: mapearBoolean(curso.allow_reenrollment),
    mustRepurchaseToReenroll: mapearBoolean(curso.must_repurchase_to_reenroll),
    waitlistAfterLimit: mapearBoolean(curso.waitlist_after_limit),
    autoEnrollFromWaitlist: mapearBoolean(curso.auto_enroll_from_waitlist),
    cuposUsados: curso.cupos_usados,
    maxEstudiantes: curso.max_estudiantes,
    maxCupos: curso.max_cupos,
    sisId: curso.sis_id,
    sisPid: curso.sis_pid,
    esPath: mapearBoolean(curso.es_path),
    metadataCreatorId: curso.metadata_creator_id,
    metadataCreatedAt: curso.metadata_created_at,
    currentLessonId: curso.current_lesson_id,
    idioma: curso.idioma,
    edadMinima: curso.edad_minima,
    edadMaxima: curso.edad_maxima,
    materia: curso.materia,
    taxExempt: mapearBoolean(curso.tax_exempt),
    weightUsingCategories: mapearBoolean(curso.weight_using_categories),
    weights: curso.weights,
    disableCompletion: mapearBoolean(curso.disable_completion),
    autoCompleteOnVisit: mapearBoolean(curso.auto_complete_on_visit),
    categorias: splitLista(curso.categorias),
    tags: splitLista(curso.tags),
    sincronizadoEn: curso.sincronizado_en,
    creadoEn: curso.creado_en,
    actualizadoEn: curso.actualizado_en,
  };
};

const obtenerCustomFields = async (cursoId) => {
  const [rows] = await pool.execute(
    `
      SELECT id, campo, valor, actualizado_en
      FROM curso_custom_fields
      WHERE curso_id = ?
      ORDER BY campo ASC
    `,
    [cursoId]
  );

  return rows.map((row) => ({
    id: row.id,
    campo: row.campo,
    valor: row.valor,
    actualizadoEn: row.actualizado_en,
  }));
};

const obtenerClassTimes = async (cursoId) => {
  const [rows] = await pool.execute(
    `
      SELECT id, posicion, descripcion, sincronizado_en
      FROM curso_class_times
      WHERE curso_id = ?
      ORDER BY posicion ASC
    `,
    [cursoId]
  );

  return rows.map((row) => ({
    id: row.id,
    posicion: row.posicion,
    descripcion: row.descripcion,
    sincronizadoEn: row.sincronizado_en,
  }));
};

const obtenerLecciones = async (cursoId) => {
  const [rows] = await pool.execute(
    `
      SELECT
        cl.*,
        GROUP_CONCAT(DISTINCT clt.nombre ORDER BY clt.nombre SEPARATOR '||') AS tags
      FROM curso_lecciones cl
      LEFT JOIN curso_leccion_tags clt ON clt.leccion_id = cl.id
      WHERE cl.curso_id = ?
      GROUP BY cl.id
      ORDER BY cl.posicion ASC, cl.id ASC
    `,
    [cursoId]
  );

  return rows.map((row) => ({
    id: row.id,
    neolmsLessonId: row.neolms_lesson_id,
    neolmsClassId: row.neolms_class_id,
    nombre: row.nombre,
    descripcion: row.descripcion,
    imagenUrl: row.imagen_url,
    notas: row.notas,
    posicion: row.posicion,
    startAt: row.start_at,
    updatedAt: row.updated_at,
    releasedAt: row.released_at,
    tileColor: row.tile_color,
    personalized: mapearBoolean(row.personalized),
    optionalForCompletion: mapearBoolean(row.optional_for_completion),
    beginAt: row.begin_at,
    endAt: row.end_at,
    allDay: mapearBoolean(row.all_day),
    location: row.location,
    tags: splitLista(row.tags),
    sincronizadoEn: row.sincronizado_en,
  }));
};

const obtenerActividades = async (cursoId) => {
  const [rows] = await pool.execute(
    `
      SELECT *
      FROM curso_actividades
      WHERE curso_id = ?
      ORDER BY begin_at ASC, id ASC
    `,
    [cursoId]
  );

  return rows.map((row) => ({
    id: row.id,
    leccionId: row.leccion_id,
    neolmsAssignmentId: row.neolms_assignment_id,
    neolmsClassId: row.neolms_class_id,
    neolmsLessonId: row.neolms_lesson_id,
    lessonName: row.lesson_name,
    creatorId: row.creator_id,
    tipo: row.tipo,
    nombre: row.nombre,
    puntos: row.puntos,
    beginAt: row.begin_at,
    endAt: row.end_at,
    given: mapearBoolean(row.given),
    givenAt: row.given_at,
    grading: row.grading,
    useResults: row.use_results,
    categoria: row.categoria,
    sincronizadoEn: row.sincronizado_en,
  }));
};

const obtenerDocentes = async (cursoId) => {
  const [rows] = await pool.execute(
    `
      SELECT *
      FROM curso_docentes
      WHERE curso_id = ?
      ORDER BY coteacher ASC, apellidos ASC, nombres ASC, id ASC
    `,
    [cursoId]
  );

  return rows.map((row) => ({
    id: row.id,
    neolmsTeacherRelationId: row.neolms_teacher_relation_id,
    neolmsUserId: row.neolms_user_id,
    neolmsClassId: row.neolms_class_id,
    userid: row.userid,
    nombres: row.nombres,
    apellidos: row.apellidos,
    nombreCompleto: [row.nombres, row.apellidos].filter(Boolean).join(' ') || null,
    email: row.email,
    coteacher: mapearBoolean(row.coteacher),
    lastVisitedAt: row.last_visited_at,
    sincronizadoEn: row.sincronizado_en,
  }));
};

const obtenerCalificaciones = async (cursoId) => {
  const [rows] = await pool.execute(
    `
      SELECT
        ac.*,
        a.nombres,
        a.apellidos,
        a.email
      FROM alumno_calificaciones ac
      INNER JOIN alumnos a ON a.id = ac.alumno_id
      WHERE ac.curso_id = ?
      ORDER BY ac.graded_at DESC, ac.id DESC
    `,
    [cursoId]
  );

  return rows.map((row) => ({
    id: row.id,
    alumnoId: row.alumno_id,
    alumnoNombreCompleto: [row.nombres, row.apellidos].filter(Boolean).join(' ') || null,
    alumnoEmail: row.email,
    neolmsGradeId: row.neolms_grade_id,
    neolmsUserId: row.neolms_user_id,
    neolmsClassId: row.neolms_class_id,
    graderId: row.grader_id,
    assignmentId: row.assignment_id,
    lessonId: row.lesson_id,
    lessonName: row.lesson_name,
    started: mapearBoolean(row.started),
    startedAt: row.started_at,
    finished: mapearBoolean(row.finished),
    finishedAt: row.finished_at,
    graded: mapearBoolean(row.graded),
    fullyGraded: mapearBoolean(row.fully_graded),
    gradedAt: row.graded_at,
    score: row.score,
    percent: row.percent,
    grade: row.grade,
    points: row.points,
    minPoints: row.min_points,
    missing: mapearBoolean(row.missing),
    absent: mapearBoolean(row.absent),
    excused: mapearBoolean(row.excused),
    incomplete: mapearBoolean(row.incomplete),
    teacherComment: row.teacher_comment,
    sincronizadoEn: row.sincronizado_en,
  }));
};

export const obtenerCursoCompletoLocal = async ({ cursoId }) => {
  const curso = await obtenerCurso(cursoId);
  if (!curso) return null;

  const [
    customFields,
    classTimes,
    lecciones,
    actividades,
    docentes,
    calificaciones,
  ] = await Promise.all([
    obtenerCustomFields(cursoId),
    obtenerClassTimes(cursoId),
    obtenerLecciones(cursoId),
    obtenerActividades(cursoId),
    obtenerDocentes(cursoId),
    obtenerCalificaciones(cursoId),
  ]);

  return {
    curso,
    customFields,
    classTimes,
    lecciones,
    actividades,
    docentes,
    calificaciones,
    resumen: {
      totalLecciones: lecciones.length,
      totalActividades: actividades.length,
      totalDocentes: docentes.length,
      totalCalificaciones: calificaciones.length,
    },
  };
};
