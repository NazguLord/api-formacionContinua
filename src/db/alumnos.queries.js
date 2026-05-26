import pool from '../config/db.js';

const normalizarTexto = (valor) => {
  const texto = String(valor ?? '').trim();
  return texto || null;
};

const normalizarFecha = (valor) => {
  if (!valor) return null;
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return null;
  return fecha.toISOString().slice(0, 10);
};

const normalizarFechaHora = (valor) => {
  if (!valor) return null;
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return null;
  return fecha.toISOString().slice(0, 19).replace('T', ' ');
};

const normalizarNumero = (valor) => {
  if (valor === null || valor === undefined || valor === '') return null;
  const numero = Number(valor);
  return Number.isNaN(numero) ? null : numero;
};

const normalizarBoolean = (valor) => (valor ? 1 : 0);

const normalizarRoles = (roles) => {
  if (Array.isArray(roles)) return roles.join(',');
  return normalizarTexto(roles);
};

const mapearAlumnoNeolms = (alumno) => ({
  neolmsId: alumno.id,
  userid: normalizarTexto(alumno.userid),
  nombres: normalizarTexto(alumno.first_name),
  apellidos: normalizarTexto(alumno.last_name),
  nombrePreferido: normalizarTexto(alumno.nick_name),
  roles: normalizarRoles(alumno.roles),
  genero: normalizarTexto(alumno.gender),
  fechaNacimiento: normalizarFecha(alumno.birthdate),
  email: normalizarTexto(alumno.email),
  telefono: normalizarTexto(alumno.phone),
  celular: normalizarTexto(alumno.mobile_phone),
  pais: normalizarTexto(alumno.country),
  ciudad: normalizarTexto(alumno.city),
  estadoRegion: normalizarTexto(alumno.state),
  idioma: normalizarTexto(alumno.language),
  zonaHoraria: normalizarTexto(alumno.time_zone),
  studentId: normalizarTexto(alumno.studentID),
  teacherId: normalizarTexto(alumno.teacherID),
  acercaDe: normalizarTexto(alumno.about),
  organizacionId: normalizarNumero(alumno.organization_id),
  organizacionNombre: normalizarTexto(alumno.organization_name),
  sisId: normalizarTexto(alumno.sis_id),
  sisPid: normalizarTexto(alumno.sis_pid),
  archivado: normalizarBoolean(alumno.archived),
  archivadoEn: normalizarFechaHora(alumno.archived_at),
  joinedAt: normalizarFechaHora(alumno.joined_at),
  firstLoginAt: normalizarFechaHora(alumno.first_login_at),
  lastLoginAt: normalizarFechaHora(alumno.last_login_at),
  rawData: JSON.stringify(alumno),
});

export const guardarAlumnoNeolms = async (alumno, connectionArg = null) => {
  const connection = connectionArg || pool;
  const alumnoMapeado = mapearAlumnoNeolms(alumno);

  await connection.execute(
    `
      INSERT INTO alumnos (
        neolms_id,
        userid,
        nombres,
        apellidos,
        nombre_preferido,
        roles,
        genero,
        fecha_nacimiento,
        email,
        telefono,
        celular,
        pais,
        ciudad,
        estado_region,
        idioma,
        zona_horaria,
        student_id,
        teacher_id,
        acerca_de,
        organizacion_id,
        organizacion_nombre,
        sis_id,
        sis_pid,
        archivado,
        archivado_en,
        joined_at,
        first_login_at,
        last_login_at,
        raw_data,
        sincronizado_en
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW()
      )
      ON DUPLICATE KEY UPDATE
        userid = VALUES(userid),
        nombres = VALUES(nombres),
        apellidos = VALUES(apellidos),
        nombre_preferido = VALUES(nombre_preferido),
        roles = VALUES(roles),
        genero = VALUES(genero),
        fecha_nacimiento = VALUES(fecha_nacimiento),
        email = VALUES(email),
        telefono = VALUES(telefono),
        celular = VALUES(celular),
        pais = VALUES(pais),
        ciudad = VALUES(ciudad),
        estado_region = VALUES(estado_region),
        idioma = VALUES(idioma),
        zona_horaria = VALUES(zona_horaria),
        student_id = VALUES(student_id),
        teacher_id = VALUES(teacher_id),
        acerca_de = VALUES(acerca_de),
        organizacion_id = VALUES(organizacion_id),
        organizacion_nombre = VALUES(organizacion_nombre),
        sis_id = VALUES(sis_id),
        sis_pid = VALUES(sis_pid),
        archivado = VALUES(archivado),
        archivado_en = VALUES(archivado_en),
        joined_at = VALUES(joined_at),
        first_login_at = VALUES(first_login_at),
        last_login_at = VALUES(last_login_at),
        raw_data = VALUES(raw_data),
        sincronizado_en = NOW()
    `,
    [
      alumnoMapeado.neolmsId,
      alumnoMapeado.userid,
      alumnoMapeado.nombres,
      alumnoMapeado.apellidos,
      alumnoMapeado.nombrePreferido,
      alumnoMapeado.roles,
      alumnoMapeado.genero,
      alumnoMapeado.fechaNacimiento,
      alumnoMapeado.email,
      alumnoMapeado.telefono,
      alumnoMapeado.celular,
      alumnoMapeado.pais,
      alumnoMapeado.ciudad,
      alumnoMapeado.estadoRegion,
      alumnoMapeado.idioma,
      alumnoMapeado.zonaHoraria,
      alumnoMapeado.studentId,
      alumnoMapeado.teacherId,
      alumnoMapeado.acercaDe,
      alumnoMapeado.organizacionId,
      alumnoMapeado.organizacionNombre,
      alumnoMapeado.sisId,
      alumnoMapeado.sisPid,
      alumnoMapeado.archivado,
      alumnoMapeado.archivadoEn,
      alumnoMapeado.joinedAt,
      alumnoMapeado.firstLoginAt,
      alumnoMapeado.lastLoginAt,
      alumnoMapeado.rawData,
    ]
  );

  const [rows] = await connection.execute(
    'SELECT id FROM alumnos WHERE neolms_id = ? LIMIT 1',
    [alumnoMapeado.neolmsId]
  );

  return rows[0].id;
};

export const guardarAlumnosNeolms = async (alumnos) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    let guardados = 0;
    for (const alumno of alumnos) {
      if (!alumno?.id) continue;
      await guardarAlumnoNeolms(alumno, connection);
      guardados += 1;
    }

    await connection.commit();
    return { guardados };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const mapearMatriculaNeolms = (matricula) => ({
  neolmsEnrollmentId: matricula.id,
  neolmsClassId: normalizarNumero(matricula.class_id),
  neolmsUserId: normalizarNumero(matricula.user_id),
  enrolledAt: normalizarFechaHora(matricula.enrolled_at),
  enrollType: normalizarTexto(matricula.enroll_type),
  enrolledById: normalizarNumero(matricula.enrolled_by_id),
  started: normalizarBoolean(matricula.started),
  startedAt: normalizarFechaHora(matricula.started_at),
  completed: normalizarBoolean(matricula.completed),
  unenrolled: normalizarBoolean(matricula.unenrolled),
  deactivated: normalizarBoolean(matricula.deactivated),
  transferred: normalizarBoolean(matricula.transferred),
  classArchived: normalizarBoolean(matricula.class_archived),
  userArchived: normalizarBoolean(matricula.user_archived),
  percent: normalizarNumero(matricula.percent),
  grade: normalizarTexto(matricula.grade),
  overridePercent: normalizarNumero(matricula.override_percent),
  overrideComment: normalizarTexto(matricula.override_comment),
  overrideById: normalizarNumero(matricula.override_by_id),
  overrideAt: normalizarFechaHora(matricula.override_at),
  timeSpent: normalizarNumero(matricula.time_spent),
  lastVisitedAt: normalizarFechaHora(matricula.last_visited_at),
  orderItemId: normalizarNumero(matricula.order_item_id),
  rawData: JSON.stringify(matricula),
});

export const guardarMatriculasCursoNeolms = async ({ cursoLocalId, matriculas }) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    let guardadas = 0;
    let omitidas = 0;

    for (const matricula of matriculas) {
      if (!matricula?.id || !matricula?.user_id) continue;

      const matriculaMapeada = mapearMatriculaNeolms(matricula);
      const [alumnos] = await connection.execute(
        'SELECT id FROM alumnos WHERE neolms_id = ? LIMIT 1',
        [matriculaMapeada.neolmsUserId]
      );

      if (!alumnos[0]) {
        omitidas += 1;
        continue;
      }

      await connection.execute(
        `
          INSERT INTO curso_alumnos (
            curso_id,
            alumno_id,
            neolms_enrollment_id,
            neolms_class_id,
            neolms_user_id,
            enrolled_at,
            enroll_type,
            enrolled_by_id,
            started,
            started_at,
            completed,
            unenrolled,
            deactivated,
            transferred,
            class_archived,
            user_archived,
            percent,
            grade,
            override_percent,
            override_comment,
            override_by_id,
            override_at,
            time_spent,
            last_visited_at,
            order_item_id,
            raw_data,
            sincronizado_en
          ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW()
          )
          ON DUPLICATE KEY UPDATE
            curso_id = VALUES(curso_id),
            alumno_id = VALUES(alumno_id),
            neolms_class_id = VALUES(neolms_class_id),
            neolms_user_id = VALUES(neolms_user_id),
            enrolled_at = VALUES(enrolled_at),
            enroll_type = VALUES(enroll_type),
            enrolled_by_id = VALUES(enrolled_by_id),
            started = VALUES(started),
            started_at = VALUES(started_at),
            completed = VALUES(completed),
            unenrolled = VALUES(unenrolled),
            deactivated = VALUES(deactivated),
            transferred = VALUES(transferred),
            class_archived = VALUES(class_archived),
            user_archived = VALUES(user_archived),
            percent = VALUES(percent),
            grade = VALUES(grade),
            override_percent = VALUES(override_percent),
            override_comment = VALUES(override_comment),
            override_by_id = VALUES(override_by_id),
            override_at = VALUES(override_at),
            time_spent = VALUES(time_spent),
            last_visited_at = VALUES(last_visited_at),
            order_item_id = VALUES(order_item_id),
            raw_data = VALUES(raw_data),
            sincronizado_en = NOW()
        `,
        [
          cursoLocalId,
          alumnos[0].id,
          matriculaMapeada.neolmsEnrollmentId,
          matriculaMapeada.neolmsClassId,
          matriculaMapeada.neolmsUserId,
          matriculaMapeada.enrolledAt,
          matriculaMapeada.enrollType,
          matriculaMapeada.enrolledById,
          matriculaMapeada.started,
          matriculaMapeada.startedAt,
          matriculaMapeada.completed,
          matriculaMapeada.unenrolled,
          matriculaMapeada.deactivated,
          matriculaMapeada.transferred,
          matriculaMapeada.classArchived,
          matriculaMapeada.userArchived,
          matriculaMapeada.percent,
          matriculaMapeada.grade,
          matriculaMapeada.overridePercent,
          matriculaMapeada.overrideComment,
          matriculaMapeada.overrideById,
          matriculaMapeada.overrideAt,
          matriculaMapeada.timeSpent,
          matriculaMapeada.lastVisitedAt,
          matriculaMapeada.orderItemId,
          matriculaMapeada.rawData,
        ]
      );

      guardadas += 1;
    }

    await connection.commit();
    return { guardadas, omitidas };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const mapearCalificacionNeolms = (calificacion) => ({
  neolmsGradeId: calificacion.id,
  neolmsUserId: normalizarNumero(calificacion.user_id),
  neolmsClassId: normalizarNumero(calificacion.class_id),
  graderId: normalizarNumero(calificacion.grader_id),
  assignmentId: normalizarNumero(calificacion.assignment_id),
  lessonId: normalizarNumero(calificacion.lesson_id),
  lessonName: normalizarTexto(calificacion.lesson_name),
  started: normalizarBoolean(calificacion.started),
  startedAt: normalizarFechaHora(calificacion.started_at),
  finished: normalizarBoolean(calificacion.finished),
  finishedAt: normalizarFechaHora(calificacion.finished_at),
  graded: normalizarBoolean(calificacion.graded),
  fullyGraded: normalizarBoolean(calificacion.fully_graded),
  gradedAt: normalizarFechaHora(calificacion.graded_at),
  score: normalizarNumero(calificacion.score),
  percent: normalizarNumero(calificacion.percent),
  grade: normalizarTexto(calificacion.grade),
  points: normalizarNumero(calificacion.points),
  minPoints: normalizarNumero(calificacion.min_points),
  missing: normalizarBoolean(calificacion.missing),
  absent: normalizarBoolean(calificacion.absent),
  excused: normalizarBoolean(calificacion.excused),
  incomplete: normalizarBoolean(calificacion.incomplete),
  excusedComment: normalizarTexto(calificacion.excused_comment),
  teacherComment: normalizarTexto(calificacion.teacher_comment),
  rawData: JSON.stringify(calificacion),
});

export const guardarCalificacionesAlumnoNeolms = async ({ alumnoLocalId, calificaciones }) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    let guardadas = 0;
    for (const calificacion of calificaciones) {
      if (!calificacion?.id) continue;
      const calificacionMapeada = mapearCalificacionNeolms(calificacion);

      const [cursos] = await connection.execute(
        'SELECT id FROM cursos WHERE neolms_id = ? LIMIT 1',
        [calificacionMapeada.neolmsClassId]
      );

      await connection.execute(
        `
          INSERT INTO alumno_calificaciones (
            alumno_id,
            curso_id,
            neolms_grade_id,
            neolms_user_id,
            neolms_class_id,
            grader_id,
            assignment_id,
            lesson_id,
            lesson_name,
            started,
            started_at,
            finished,
            finished_at,
            graded,
            fully_graded,
            graded_at,
            score,
            percent,
            grade,
            points,
            min_points,
            missing,
            absent,
            excused,
            incomplete,
            excused_comment,
            teacher_comment,
            raw_data,
            sincronizado_en
          ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW()
          )
          ON DUPLICATE KEY UPDATE
            alumno_id = VALUES(alumno_id),
            curso_id = VALUES(curso_id),
            neolms_user_id = VALUES(neolms_user_id),
            neolms_class_id = VALUES(neolms_class_id),
            grader_id = VALUES(grader_id),
            assignment_id = VALUES(assignment_id),
            lesson_id = VALUES(lesson_id),
            lesson_name = VALUES(lesson_name),
            started = VALUES(started),
            started_at = VALUES(started_at),
            finished = VALUES(finished),
            finished_at = VALUES(finished_at),
            graded = VALUES(graded),
            fully_graded = VALUES(fully_graded),
            graded_at = VALUES(graded_at),
            score = VALUES(score),
            percent = VALUES(percent),
            grade = VALUES(grade),
            points = VALUES(points),
            min_points = VALUES(min_points),
            missing = VALUES(missing),
            absent = VALUES(absent),
            excused = VALUES(excused),
            incomplete = VALUES(incomplete),
            excused_comment = VALUES(excused_comment),
            teacher_comment = VALUES(teacher_comment),
            raw_data = VALUES(raw_data),
            sincronizado_en = NOW()
        `,
        [
          alumnoLocalId,
          cursos[0]?.id || null,
          calificacionMapeada.neolmsGradeId,
          calificacionMapeada.neolmsUserId,
          calificacionMapeada.neolmsClassId,
          calificacionMapeada.graderId,
          calificacionMapeada.assignmentId,
          calificacionMapeada.lessonId,
          calificacionMapeada.lessonName,
          calificacionMapeada.started,
          calificacionMapeada.startedAt,
          calificacionMapeada.finished,
          calificacionMapeada.finishedAt,
          calificacionMapeada.graded,
          calificacionMapeada.fullyGraded,
          calificacionMapeada.gradedAt,
          calificacionMapeada.score,
          calificacionMapeada.percent,
          calificacionMapeada.grade,
          calificacionMapeada.points,
          calificacionMapeada.minPoints,
          calificacionMapeada.missing,
          calificacionMapeada.absent,
          calificacionMapeada.excused,
          calificacionMapeada.incomplete,
          calificacionMapeada.excusedComment,
          calificacionMapeada.teacherComment,
          calificacionMapeada.rawData,
        ]
      );

      guardadas += 1;
    }

    await connection.commit();
    return { guardadas };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const obtenerCursosParaSincronizarAlumnos = async ({ cursoId, neolmsClassId }) => {
  const where = [];
  const params = [];

  if (cursoId) {
    where.push('id = ?');
    params.push(cursoId);
  }

  if (neolmsClassId) {
    where.push('neolms_id = ?');
    params.push(neolmsClassId);
  }

  const [rows] = await pool.execute(
    `
      SELECT id, neolms_id, nombre
      FROM cursos
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY id ASC
    `,
    params
  );

  return rows;
};

export const obtenerAlumnosParaSincronizarCalificaciones = async ({ alumnoId, neolmsUserId }) => {
  const where = [];
  const params = [];

  if (alumnoId) {
    where.push('id = ?');
    params.push(alumnoId);
  }

  if (neolmsUserId) {
    where.push('neolms_id = ?');
    params.push(neolmsUserId);
  }

  const [rows] = await pool.execute(
    `
      SELECT id, neolms_id, nombres, apellidos
      FROM alumnos
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY id ASC
    `,
    params
  );

  return rows;
};

const mapearAlumnoLocal = (alumno) => ({
  id: alumno.id,
  neolmsId: alumno.neolms_id,
  userid: alumno.userid,
  nombres: alumno.nombres,
  apellidos: alumno.apellidos,
  email: alumno.email,
  telefono: alumno.telefono,
  celular: alumno.celular,
  pais: alumno.pais,
  idioma: alumno.idioma,
  roles: alumno.roles ? alumno.roles.split(',').filter(Boolean) : [],
  archivado: Boolean(alumno.archivado),
  joinedAt: alumno.joined_at,
  lastLoginAt: alumno.last_login_at,
  sincronizadoEn: alumno.sincronizado_en,
});

export const obtenerAlumnosLocales = async ({ page, limit, search }) => {
  const limitSeguro = Number(limit);
  const offset = (Number(page) - 1) * limitSeguro;
  const where = [];
  const params = [];

  if (search) {
    where.push('(nombres LIKE ? OR apellidos LIKE ? OR userid LIKE ? OR email LIKE ?)');
    const searchLike = `%${search}%`;
    params.push(searchLike, searchLike, searchLike, searchLike);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const [countRows] = await pool.execute(
    `SELECT COUNT(*) AS total FROM alumnos ${whereSql}`,
    params
  );

  const [rows] = await pool.execute(
    `
      SELECT id, neolms_id, userid, nombres, apellidos, email, telefono, celular,
        pais, idioma, roles, archivado, joined_at, last_login_at, sincronizado_en
      FROM alumnos
      ${whereSql}
      ORDER BY apellidos ASC, nombres ASC, id ASC
      LIMIT ${limitSeguro} OFFSET ${offset}
    `,
    params
  );

  const total = countRows[0]?.total || 0;

  return {
    data: rows.map(mapearAlumnoLocal),
    pagination: {
      page,
      limit,
      count: rows.length,
      total,
      hasNextPage: page * limit < total,
      hasPreviousPage: page > 1,
    },
  };
};

export const obtenerAlumnosPorCursoLocal = async ({ cursoId, page, limit }) => {
  const limitSeguro = Number(limit);
  const offset = (Number(page) - 1) * limitSeguro;

  const [countRows] = await pool.execute(
    'SELECT COUNT(*) AS total FROM curso_alumnos WHERE curso_id = ?',
    [cursoId]
  );

  const [rows] = await pool.execute(
    `
      SELECT
        ca.id AS matricula_id,
        ca.enrolled_at,
        ca.enroll_type,
        ca.started,
        ca.started_at,
        ca.completed,
        ca.percent,
        ca.grade,
        ca.time_spent,
        ca.last_visited_at,
        ca.sincronizado_en,
        a.id,
        a.neolms_id,
        a.userid,
        a.nombres,
        a.apellidos,
        a.email,
        a.telefono,
        a.celular,
        a.roles,
        a.archivado
      FROM curso_alumnos ca
      INNER JOIN alumnos a ON a.id = ca.alumno_id
      WHERE ca.curso_id = ?
      ORDER BY a.apellidos ASC, a.nombres ASC, a.id ASC
      LIMIT ${limitSeguro} OFFSET ${offset}
    `,
    [cursoId]
  );

  const total = countRows[0]?.total || 0;

  return {
    data: rows.map((row) => ({
      matriculaId: row.matricula_id,
      enrolledAt: row.enrolled_at,
      enrollType: row.enroll_type,
      started: Boolean(row.started),
      startedAt: row.started_at,
      completed: Boolean(row.completed),
      percent: row.percent,
      grade: row.grade,
      timeSpent: row.time_spent,
      lastVisitedAt: row.last_visited_at,
      sincronizadoEn: row.sincronizado_en,
      alumno: mapearAlumnoLocal(row),
    })),
    pagination: {
      page,
      limit,
      count: rows.length,
      total,
      hasNextPage: page * limit < total,
      hasPreviousPage: page > 1,
    },
  };
};

export const obtenerCalificacionesAlumnoLocal = async ({ alumnoId, page, limit }) => {
  const limitSeguro = Number(limit);
  const offset = (Number(page) - 1) * limitSeguro;

  const [countRows] = await pool.execute(
    'SELECT COUNT(*) AS total FROM alumno_calificaciones WHERE alumno_id = ?',
    [alumnoId]
  );

  const [rows] = await pool.execute(
    `
      SELECT
        ac.id,
        ac.neolms_grade_id,
        ac.neolms_class_id,
        ac.assignment_id,
        ac.lesson_id,
        ac.lesson_name,
        ac.started,
        ac.started_at,
        ac.finished,
        ac.finished_at,
        ac.graded,
        ac.fully_graded,
        ac.graded_at,
        ac.score,
        ac.percent,
        ac.grade,
        ac.points,
        ac.min_points,
        ac.missing,
        ac.absent,
        ac.excused,
        ac.incomplete,
        ac.teacher_comment,
        ac.sincronizado_en,
        c.id AS curso_id,
        c.nombre AS curso_nombre
      FROM alumno_calificaciones ac
      LEFT JOIN cursos c ON c.id = ac.curso_id
      WHERE ac.alumno_id = ?
      ORDER BY ac.graded_at DESC, ac.id DESC
      LIMIT ${limitSeguro} OFFSET ${offset}
    `,
    [alumnoId]
  );

  const total = countRows[0]?.total || 0;

  return {
    data: rows.map((row) => ({
      id: row.id,
      neolmsGradeId: row.neolms_grade_id,
      neolmsClassId: row.neolms_class_id,
      assignmentId: row.assignment_id,
      lessonId: row.lesson_id,
      lessonName: row.lesson_name,
      started: Boolean(row.started),
      startedAt: row.started_at,
      finished: Boolean(row.finished),
      finishedAt: row.finished_at,
      graded: Boolean(row.graded),
      fullyGraded: Boolean(row.fully_graded),
      gradedAt: row.graded_at,
      score: row.score,
      percent: row.percent,
      grade: row.grade,
      points: row.points,
      minPoints: row.min_points,
      missing: Boolean(row.missing),
      absent: Boolean(row.absent),
      excused: Boolean(row.excused),
      incomplete: Boolean(row.incomplete),
      teacherComment: row.teacher_comment,
      sincronizadoEn: row.sincronizado_en,
      curso: row.curso_id
        ? {
            id: row.curso_id,
            nombre: row.curso_nombre,
          }
        : null,
    })),
    pagination: {
      page,
      limit,
      count: rows.length,
      total,
      hasNextPage: page * limit < total,
      hasPreviousPage: page > 1,
    },
  };
};
