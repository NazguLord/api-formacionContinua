import pool from '../config/db.js';

const normalizarTexto = (valor) => {
  const texto = String(valor ?? '').trim();
  return texto || null;
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

export const obtenerCursosParaSincronizarDetalle = async ({ cursoId, neolmsClassId }) => {
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

const obtenerTags = (registro) => {
  if (!Array.isArray(registro?.tags)) return [];
  return registro.tags.map((tag) => normalizarTexto(tag)).filter(Boolean);
};

const mapearLeccionNeolms = (leccion) => ({
  neolmsLessonId: normalizarNumero(leccion.id),
  neolmsClassId: normalizarNumero(leccion.class_id),
  nombre: normalizarTexto(leccion.name) || `Leccion ${leccion.id}`,
  descripcion: normalizarTexto(leccion.description),
  imagenUrl: normalizarTexto(leccion.picture),
  notas: normalizarTexto(leccion.notes),
  posicion: normalizarNumero(leccion.position),
  startAt: normalizarFechaHora(leccion.start_at),
  updatedAt: normalizarFechaHora(leccion.updated_at),
  releasedAt: normalizarFechaHora(leccion.released_at),
  tileColor: normalizarTexto(leccion.tile_color),
  personalized: normalizarBoolean(leccion.personalized),
  optionalForCompletion: normalizarBoolean(leccion.optional_for_completion),
  beginAt: normalizarFechaHora(leccion.begin_at),
  endAt: normalizarFechaHora(leccion.end_at),
  allDay: normalizarBoolean(leccion.all_day),
  location: normalizarTexto(leccion.location),
  rawData: JSON.stringify(leccion),
});

const sincronizarTagsLeccion = async (connection, leccionId, tags) => {
  const tagIds = [];

  for (const tag of tags) {
    const [existentes] = await connection.execute(
      'SELECT id FROM curso_leccion_tags WHERE leccion_id = ? AND nombre = ? LIMIT 1',
      [leccionId, tag]
    );

    if (existentes[0]) {
      tagIds.push(existentes[0].id);
      continue;
    }

    const [result] = await connection.execute(
      'INSERT INTO curso_leccion_tags (leccion_id, nombre) VALUES (?, ?)',
      [leccionId, tag]
    );
    tagIds.push(result.insertId);
  }

  if (tagIds.length === 0) {
    await connection.execute('DELETE FROM curso_leccion_tags WHERE leccion_id = ?', [leccionId]);
    return;
  }

  await connection.execute(
    `
      DELETE FROM curso_leccion_tags
      WHERE leccion_id = ?
        AND id NOT IN (${tagIds.map(() => '?').join(', ')})
    `,
    [leccionId, ...tagIds]
  );
};

export const guardarLeccionesCursoNeolms = async ({ cursoLocalId, lecciones }) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const leccionesIds = [];
    let guardadas = 0;

    for (const leccion of lecciones) {
      if (!leccion?.id) continue;
      const leccionMapeada = mapearLeccionNeolms(leccion);
      const params = [
        cursoLocalId,
        leccionMapeada.neolmsLessonId,
        leccionMapeada.neolmsClassId,
        leccionMapeada.nombre,
        leccionMapeada.descripcion,
        leccionMapeada.imagenUrl,
        leccionMapeada.notas,
        leccionMapeada.posicion,
        leccionMapeada.startAt,
        leccionMapeada.updatedAt,
        leccionMapeada.releasedAt,
        leccionMapeada.tileColor,
        leccionMapeada.personalized,
        leccionMapeada.optionalForCompletion,
        leccionMapeada.beginAt,
        leccionMapeada.endAt,
        leccionMapeada.allDay,
        leccionMapeada.location,
        leccionMapeada.rawData,
      ];

      const [existentes] = await connection.execute(
        'SELECT id FROM curso_lecciones WHERE neolms_lesson_id = ? LIMIT 1',
        [leccionMapeada.neolmsLessonId]
      );

      let leccionId = existentes[0]?.id;

      if (leccionId) {
        await connection.execute(
          `
            UPDATE curso_lecciones
            SET
              curso_id = ?,
              neolms_lesson_id = ?,
              neolms_class_id = ?,
              nombre = ?,
              descripcion = ?,
              imagen_url = ?,
              notas = ?,
              posicion = ?,
              start_at = ?,
              updated_at = ?,
              released_at = ?,
              tile_color = ?,
              personalized = ?,
              optional_for_completion = ?,
              begin_at = ?,
              end_at = ?,
              all_day = ?,
              location = ?,
              raw_data = ?,
              sincronizado_en = NOW()
            WHERE id = ?
          `,
          [...params, leccionId]
        );
      } else {
        const [result] = await connection.execute(
          `
            INSERT INTO curso_lecciones (
              curso_id,
              neolms_lesson_id,
              neolms_class_id,
              nombre,
              descripcion,
              imagen_url,
              notas,
              posicion,
              start_at,
              updated_at,
              released_at,
              tile_color,
              personalized,
              optional_for_completion,
              begin_at,
              end_at,
              all_day,
              location,
              raw_data,
              sincronizado_en
            ) VALUES (
              ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW()
            )
          `,
          params
        );
        leccionId = result.insertId;
      }

      leccionesIds.push(leccionId);
      await sincronizarTagsLeccion(connection, leccionId, obtenerTags(leccion));
      guardadas += 1;
    }

    if (leccionesIds.length > 0) {
      await connection.execute(
        `
          DELETE FROM curso_lecciones
          WHERE curso_id = ?
            AND id NOT IN (${leccionesIds.map(() => '?').join(', ')})
        `,
        [cursoLocalId, ...leccionesIds]
      );
    } else {
      await connection.execute('DELETE FROM curso_lecciones WHERE curso_id = ?', [cursoLocalId]);
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

const mapearActividadNeolms = (actividad) => ({
  neolmsAssignmentId: normalizarNumero(actividad.id),
  neolmsClassId: normalizarNumero(actividad.class_id),
  neolmsLessonId: normalizarNumero(actividad.lesson_id),
  lessonName: normalizarTexto(actividad.lesson_name),
  creatorId: normalizarNumero(actividad.creator_id),
  tipo: normalizarTexto(actividad.type),
  nombre: normalizarTexto(actividad.name) || `Actividad ${actividad.id}`,
  puntos: normalizarNumero(actividad.points),
  beginAt: normalizarFechaHora(actividad.begin_at),
  endAt: normalizarFechaHora(actividad.end_at),
  given: normalizarBoolean(actividad.given),
  givenAt: normalizarFechaHora(actividad.given_at),
  grading: normalizarTexto(actividad.grading),
  useResults: normalizarTexto(actividad.use_results),
  categoria: normalizarTexto(actividad.category),
  rawData: JSON.stringify(actividad),
});

export const guardarActividadesCursoNeolms = async ({ cursoLocalId, actividades }) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const actividadesIds = [];
    let guardadas = 0;

    for (const actividad of actividades) {
      if (!actividad?.id) continue;
      const actividadMapeada = mapearActividadNeolms(actividad);
      const [lecciones] = await connection.execute(
        'SELECT id FROM curso_lecciones WHERE neolms_lesson_id = ? LIMIT 1',
        [actividadMapeada.neolmsLessonId]
      );
      const leccionId = lecciones[0]?.id || null;
      const params = [
        cursoLocalId,
        leccionId,
        actividadMapeada.neolmsAssignmentId,
        actividadMapeada.neolmsClassId,
        actividadMapeada.neolmsLessonId,
        actividadMapeada.lessonName,
        actividadMapeada.creatorId,
        actividadMapeada.tipo,
        actividadMapeada.nombre,
        actividadMapeada.puntos,
        actividadMapeada.beginAt,
        actividadMapeada.endAt,
        actividadMapeada.given,
        actividadMapeada.givenAt,
        actividadMapeada.grading,
        actividadMapeada.useResults,
        actividadMapeada.categoria,
        actividadMapeada.rawData,
      ];

      const [existentes] = await connection.execute(
        'SELECT id FROM curso_actividades WHERE neolms_assignment_id = ? LIMIT 1',
        [actividadMapeada.neolmsAssignmentId]
      );

      let actividadId = existentes[0]?.id;

      if (actividadId) {
        await connection.execute(
          `
            UPDATE curso_actividades
            SET
              curso_id = ?,
              leccion_id = ?,
              neolms_assignment_id = ?,
              neolms_class_id = ?,
              neolms_lesson_id = ?,
              lesson_name = ?,
              creator_id = ?,
              tipo = ?,
              nombre = ?,
              puntos = ?,
              begin_at = ?,
              end_at = ?,
              given = ?,
              given_at = ?,
              grading = ?,
              use_results = ?,
              categoria = ?,
              raw_data = ?,
              sincronizado_en = NOW()
            WHERE id = ?
          `,
          [...params, actividadId]
        );
      } else {
        const [result] = await connection.execute(
          `
            INSERT INTO curso_actividades (
              curso_id,
              leccion_id,
              neolms_assignment_id,
              neolms_class_id,
              neolms_lesson_id,
              lesson_name,
              creator_id,
              tipo,
              nombre,
              puntos,
              begin_at,
              end_at,
              given,
              given_at,
              grading,
              use_results,
              categoria,
              raw_data,
              sincronizado_en
            ) VALUES (
              ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW()
            )
          `,
          params
        );
        actividadId = result.insertId;
      }

      actividadesIds.push(actividadId);
      guardadas += 1;
    }

    if (actividadesIds.length > 0) {
      await connection.execute(
        `
          DELETE FROM curso_actividades
          WHERE curso_id = ?
            AND id NOT IN (${actividadesIds.map(() => '?').join(', ')})
        `,
        [cursoLocalId, ...actividadesIds]
      );
    } else {
      await connection.execute('DELETE FROM curso_actividades WHERE curso_id = ?', [cursoLocalId]);
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

const mapearDocenteNeolms = (docente) => ({
  neolmsTeacherRelationId: normalizarNumero(docente.id),
  neolmsUserId: normalizarNumero(docente.user_id),
  neolmsClassId: normalizarNumero(docente.class_id),
  userid: normalizarTexto(docente.user?.userid),
  nombres: normalizarTexto(docente.user?.first_name),
  apellidos: normalizarTexto(docente.user?.last_name),
  email: normalizarTexto(docente.user?.email),
  coteacher: normalizarBoolean(docente.coteacher),
  lastVisitedAt: normalizarFechaHora(docente.last_visited_at),
  rawData: JSON.stringify(docente),
});

export const guardarDocentesCursoNeolms = async ({ cursoLocalId, docentes }) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const docentesIds = [];
    let guardados = 0;

    for (const docente of docentes) {
      if (!docente?.id || !docente?.user_id) continue;
      const docenteMapeado = mapearDocenteNeolms(docente);
      const params = [
        cursoLocalId,
        docenteMapeado.neolmsTeacherRelationId,
        docenteMapeado.neolmsUserId,
        docenteMapeado.neolmsClassId,
        docenteMapeado.userid,
        docenteMapeado.nombres,
        docenteMapeado.apellidos,
        docenteMapeado.email,
        docenteMapeado.coteacher,
        docenteMapeado.lastVisitedAt,
        docenteMapeado.rawData,
      ];

      const [existentes] = await connection.execute(
        `
          SELECT id
          FROM curso_docentes
          WHERE neolms_teacher_relation_id = ?
             OR (curso_id = ? AND neolms_user_id = ?)
          LIMIT 1
        `,
        [docenteMapeado.neolmsTeacherRelationId, cursoLocalId, docenteMapeado.neolmsUserId]
      );

      let docenteId = existentes[0]?.id;

      if (docenteId) {
        await connection.execute(
          `
            UPDATE curso_docentes
            SET
              curso_id = ?,
              neolms_teacher_relation_id = ?,
              neolms_user_id = ?,
              neolms_class_id = ?,
              userid = ?,
              nombres = ?,
              apellidos = ?,
              email = ?,
              coteacher = ?,
              last_visited_at = ?,
              raw_data = ?,
              sincronizado_en = NOW()
            WHERE id = ?
          `,
          [...params, docenteId]
        );
      } else {
        const [result] = await connection.execute(
          `
            INSERT INTO curso_docentes (
              curso_id,
              neolms_teacher_relation_id,
              neolms_user_id,
              neolms_class_id,
              userid,
              nombres,
              apellidos,
              email,
              coteacher,
              last_visited_at,
              raw_data,
              sincronizado_en
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
          `,
          params
        );
        docenteId = result.insertId;
      }

      docentesIds.push(docenteId);
      guardados += 1;
    }

    if (docentesIds.length > 0) {
      await connection.execute(
        `
          DELETE FROM curso_docentes
          WHERE curso_id = ?
            AND id NOT IN (${docentesIds.map(() => '?').join(', ')})
        `,
        [cursoLocalId, ...docentesIds]
      );
    } else {
      await connection.execute('DELETE FROM curso_docentes WHERE curso_id = ?', [cursoLocalId]);
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

export const obtenerLeccionesCursoLocal = async ({ cursoId }) => {
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
    personalized: Boolean(row.personalized),
    optionalForCompletion: Boolean(row.optional_for_completion),
    beginAt: row.begin_at,
    endAt: row.end_at,
    allDay: Boolean(row.all_day),
    location: row.location,
    tags: row.tags ? row.tags.split('||').filter(Boolean) : [],
    sincronizadoEn: row.sincronizado_en,
  }));
};

export const obtenerActividadesCursoLocal = async ({ cursoId }) => {
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
    given: Boolean(row.given),
    givenAt: row.given_at,
    grading: row.grading,
    useResults: row.use_results,
    categoria: row.categoria,
    sincronizadoEn: row.sincronizado_en,
  }));
};

export const obtenerDocentesCursoLocal = async ({ cursoId }) => {
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
    coteacher: Boolean(row.coteacher),
    lastVisitedAt: row.last_visited_at,
    sincronizadoEn: row.sincronizado_en,
  }));
};
