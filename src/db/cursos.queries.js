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

const mapearCursoNeolms = (curso) => ({
  neolmsId: curso.id,
  parentNeolmsId: normalizarNumero(curso.parent_id),
  accessCode: normalizarTexto(curso.access_code),
  nombre: normalizarTexto(curso.name) || `Curso ${curso.id}`,
  descripcionCorta: normalizarTexto(curso.short_description),
  descripcionLarga: normalizarTexto(curso.long_description),
  imagenUrl: normalizarTexto(curso.picture),
  estilo: normalizarTexto(curso.style),
  fechaInicio: normalizarFecha(curso.start_at),
  fechaFin: normalizarFecha(curso.finish_at),
  zonaHoraria: normalizarTexto(curso.time_zone),
  codigoCurso: normalizarTexto(curso.course_code),
  codigoSeccion: normalizarTexto(curso.section_code),
  creditos: normalizarNumero(curso.credits),
  precio: normalizarNumero(curso.price),
  organizacionId: normalizarNumero(curso.organization_id),
  organizacionNombre: normalizarTexto(curso.organization_name),
  privado: normalizarBoolean(curso.private),
  archivado: normalizarBoolean(curso.archived),
  archivadoEn: normalizarFechaHora(curso.archived_at),
  archiverId: normalizarNumero(curso.archiver_id),
  bloqueado: normalizarBoolean(curso.locked),
  mostrarCatalogo: normalizarBoolean(curso.display_in_catalog),
  inscripcionAbierta: normalizarBoolean(curso.enrollment_open),
  inscripcionPublica: normalizarBoolean(curso.open_enrollment),
  allowUnenrollment: normalizarBoolean(curso.allow_unenrollment),
  deleteHistoryOnUnenroll: normalizarBoolean(curso.delete_history_on_unenroll),
  allowReenrollment: normalizarBoolean(curso.allow_reenrollment),
  mustRepurchaseToReenroll: normalizarBoolean(curso.must_repurchase_to_reenroll),
  waitlistAfterLimit: normalizarBoolean(curso.waitlist_after_limit),
  autoEnrollFromWaitlist: normalizarBoolean(curso.auto_enroll_from_waitlist),
  cuposUsados: normalizarNumero(curso.used_seats),
  maxEstudiantes: normalizarNumero(curso.max_students),
  maxCupos: normalizarNumero(curso.max_seats),
  sisId: normalizarTexto(curso.sis_id),
  sisPid: normalizarTexto(curso.sis_pid),
  esPath: normalizarBoolean(curso.path),
  metadataCreatorId: normalizarNumero(curso.metadata?.creator_id),
  metadataCreatedAt: normalizarFechaHora(curso.metadata?.created_at),
  currentLessonId: normalizarNumero(curso.current_lesson_id),
  idioma: normalizarTexto(curso.metadata?.language),
  edadMinima: normalizarNumero(curso.metadata?.lo_age),
  edadMaxima: normalizarNumero(curso.metadata?.hi_age),
  materia: normalizarTexto(curso.metadata?.subject),
  taxExempt: normalizarBoolean(curso.tax_exempt),
  weightUsingCategories: normalizarBoolean(curso.weight_using_categories),
  weights: normalizarTexto(curso.weights),
  disableCompletion: normalizarBoolean(curso.disable_completion),
  autoCompleteOnVisit: normalizarBoolean(curso.auto_complete_on_visit),
  rawData: JSON.stringify(curso),
});

const obtenerCategoriasCurso = (curso) => {
  if (Array.isArray(curso?.catalog_categories) && curso.catalog_categories.length > 0) {
    return curso.catalog_categories
      .map((categoria) => normalizarTexto(categoria))
      .filter(Boolean);
  }

  const materia = normalizarTexto(curso?.metadata?.subject);
  return materia ? [materia] : ['Sin categoria'];
};

const obtenerTagsCurso = (curso) => {
  if (!Array.isArray(curso?.tags)) return [];
  return curso.tags.map((tag) => normalizarTexto(tag)).filter(Boolean);
};

const obtenerCustomFieldsCurso = (curso) => {
  if (!curso?.custom_fields || typeof curso.custom_fields !== 'object' || Array.isArray(curso.custom_fields)) {
    return [];
  }

  return Object.entries(curso.custom_fields)
    .map(([campo, valor]) => ({
      campo: normalizarTexto(campo),
      valor: valor === null || valor === undefined ? null : String(valor),
    }))
    .filter((customField) => customField.campo);
};

const obtenerClassTimesCurso = (curso) => {
  if (!Array.isArray(curso?.class_times)) return [];
  return curso.class_times.map((classTime, index) => ({
    posicion: index + 1,
    descripcion: normalizarTexto(classTime?.name || classTime?.description || classTime?.title),
    rawData: JSON.stringify(classTime),
  }));
};

const upsertCurso = async (connection, curso) => {
  const cursoMapeado = mapearCursoNeolms(curso);

  const params = [
    cursoMapeado.parentNeolmsId,
    cursoMapeado.accessCode,
    cursoMapeado.nombre,
    cursoMapeado.descripcionCorta,
    cursoMapeado.descripcionLarga,
    cursoMapeado.imagenUrl,
    cursoMapeado.estilo,
    cursoMapeado.fechaInicio,
    cursoMapeado.fechaFin,
    cursoMapeado.zonaHoraria,
    cursoMapeado.codigoCurso,
    cursoMapeado.codigoSeccion,
    cursoMapeado.creditos,
    cursoMapeado.precio,
    cursoMapeado.organizacionId,
    cursoMapeado.organizacionNombre,
    cursoMapeado.privado,
    cursoMapeado.archivado,
    cursoMapeado.archivadoEn,
    cursoMapeado.archiverId,
    cursoMapeado.bloqueado,
    cursoMapeado.mostrarCatalogo,
    cursoMapeado.inscripcionAbierta,
    cursoMapeado.inscripcionPublica,
    cursoMapeado.allowUnenrollment,
    cursoMapeado.deleteHistoryOnUnenroll,
    cursoMapeado.allowReenrollment,
    cursoMapeado.mustRepurchaseToReenroll,
    cursoMapeado.waitlistAfterLimit,
    cursoMapeado.autoEnrollFromWaitlist,
    cursoMapeado.cuposUsados,
    cursoMapeado.maxEstudiantes,
    cursoMapeado.maxCupos,
    cursoMapeado.sisId,
    cursoMapeado.sisPid,
    cursoMapeado.esPath,
    cursoMapeado.metadataCreatorId,
    cursoMapeado.metadataCreatedAt,
    cursoMapeado.currentLessonId,
    cursoMapeado.idioma,
    cursoMapeado.edadMinima,
    cursoMapeado.edadMaxima,
    cursoMapeado.materia,
    cursoMapeado.taxExempt,
    cursoMapeado.weightUsingCategories,
    cursoMapeado.weights,
    cursoMapeado.disableCompletion,
    cursoMapeado.autoCompleteOnVisit,
    cursoMapeado.rawData,
  ];

  const [existentes] = await connection.execute(
    'SELECT id FROM cursos WHERE neolms_id = ? LIMIT 1',
    [cursoMapeado.neolmsId]
  );

  if (existentes[0]) {
    await connection.execute(
      `
        UPDATE cursos
        SET
          parent_neolms_id = ?,
          access_code = ?,
          nombre = ?,
          descripcion_corta = ?,
          descripcion_larga = ?,
          imagen_url = ?,
          estilo = ?,
          fecha_inicio = ?,
          fecha_fin = ?,
          zona_horaria = ?,
          codigo_curso = ?,
          codigo_seccion = ?,
          creditos = ?,
          precio = ?,
          organizacion_id = ?,
          organizacion_nombre = ?,
          privado = ?,
          archivado = ?,
          archivado_en = ?,
          archiver_id = ?,
          bloqueado = ?,
          mostrar_catalogo = ?,
          inscripcion_abierta = ?,
          inscripcion_publica = ?,
          allow_unenrollment = ?,
          delete_history_on_unenroll = ?,
          allow_reenrollment = ?,
          must_repurchase_to_reenroll = ?,
          waitlist_after_limit = ?,
          auto_enroll_from_waitlist = ?,
          cupos_usados = ?,
          max_estudiantes = ?,
          max_cupos = ?,
          sis_id = ?,
          sis_pid = ?,
          es_path = ?,
          metadata_creator_id = ?,
          metadata_created_at = ?,
          current_lesson_id = ?,
          idioma = ?,
          edad_minima = ?,
          edad_maxima = ?,
          materia = ?,
          tax_exempt = ?,
          weight_using_categories = ?,
          weights = ?,
          disable_completion = ?,
          auto_complete_on_visit = ?,
          raw_data = ?,
          sincronizado_en = NOW()
        WHERE id = ?
      `,
      [...params, existentes[0].id]
    );

    return existentes[0].id;
  }

  await connection.execute(
    `
      INSERT INTO cursos (
      neolms_id,
      parent_neolms_id,
      access_code,
      nombre,
      descripcion_corta,
      descripcion_larga,
      imagen_url,
      estilo,
      fecha_inicio,
      fecha_fin,
      zona_horaria,
      codigo_curso,
      codigo_seccion,
      creditos,
      precio,
      organizacion_id,
      organizacion_nombre,
      privado,
      archivado,
      archivado_en,
      archiver_id,
      bloqueado,
      mostrar_catalogo,
      inscripcion_abierta,
      inscripcion_publica,
      allow_unenrollment,
      delete_history_on_unenroll,
      allow_reenrollment,
      must_repurchase_to_reenroll,
      waitlist_after_limit,
      auto_enroll_from_waitlist,
      cupos_usados,
      max_estudiantes,
      max_cupos,
      sis_id,
      sis_pid,
      es_path,
      metadata_creator_id,
      metadata_created_at,
      current_lesson_id,
      idioma,
      edad_minima,
      edad_maxima,
      materia,
      tax_exempt,
      weight_using_categories,
      weights,
      disable_completion,
      auto_complete_on_visit,
      raw_data,
      sincronizado_en
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW()
      )
    `,
    [cursoMapeado.neolmsId, ...params]
  );

  const [rows] = await connection.execute(
    'SELECT id FROM cursos WHERE neolms_id = ? LIMIT 1',
    [cursoMapeado.neolmsId]
  );

  return rows[0].id;
};

const sincronizarCategoriasCurso = async (connection, cursoId, categorias) => {
  const categoriasIds = [];

  for (const categoria of categorias) {
    const [categoriasExistentes] = await connection.execute(
      'SELECT id FROM curso_categorias WHERE nombre = ? LIMIT 1',
      [categoria]
    );

    let categoriaId = categoriasExistentes[0]?.id;

    if (!categoriaId) {
      const [result] = await connection.execute(
        'INSERT INTO curso_categorias (nombre) VALUES (?)',
        [categoria]
      );
      categoriaId = result.insertId;
    }

    categoriasIds.push(categoriaId);

    const [relacionesExistentes] = await connection.execute(
      `
        SELECT id
        FROM curso_categoria_relaciones
        WHERE curso_id = ?
          AND categoria_id = ?
        LIMIT 1
      `,
      [cursoId, categoriaId]
    );

    if (!relacionesExistentes[0]) {
      await connection.execute(
        `
          INSERT INTO curso_categoria_relaciones (curso_id, categoria_id)
          VALUES (?, ?)
        `,
        [cursoId, categoriaId]
      );
    }
  }

  if (categoriasIds.length === 0) {
    await connection.execute('DELETE FROM curso_categoria_relaciones WHERE curso_id = ?', [cursoId]);
    return;
  }

  await connection.execute(
    `
      DELETE FROM curso_categoria_relaciones
      WHERE curso_id = ?
        AND categoria_id NOT IN (${categoriasIds.map(() => '?').join(', ')})
    `,
    [cursoId, ...categoriasIds]
  );
};

const sincronizarTagsCurso = async (connection, cursoId, tags) => {
  const tagIds = [];

  for (const tag of tags) {
    const [existentes] = await connection.execute(
      'SELECT id FROM curso_tags WHERE curso_id = ? AND nombre = ? LIMIT 1',
      [cursoId, tag]
    );

    if (existentes[0]) {
      tagIds.push(existentes[0].id);
      continue;
    }

    const [result] = await connection.execute(
      'INSERT INTO curso_tags (curso_id, nombre) VALUES (?, ?)',
      [cursoId, tag]
    );
    tagIds.push(result.insertId);
  }

  if (tagIds.length === 0) {
    await connection.execute('DELETE FROM curso_tags WHERE curso_id = ?', [cursoId]);
    return;
  }

  await connection.execute(
    `
      DELETE FROM curso_tags
      WHERE curso_id = ?
        AND id NOT IN (${tagIds.map(() => '?').join(', ')})
    `,
    [cursoId, ...tagIds]
  );
};

const sincronizarCustomFieldsCurso = async (connection, cursoId, customFields) => {
  const customFieldIds = [];

  for (const customField of customFields) {
    const [existentes] = await connection.execute(
      'SELECT id FROM curso_custom_fields WHERE curso_id = ? AND campo = ? LIMIT 1',
      [cursoId, customField.campo]
    );

    if (existentes[0]) {
      await connection.execute(
        `
          UPDATE curso_custom_fields
          SET valor = ?
          WHERE id = ?
        `,
        [customField.valor, existentes[0].id]
      );
      customFieldIds.push(existentes[0].id);
      continue;
    }

    const [result] = await connection.execute(
      'INSERT INTO curso_custom_fields (curso_id, campo, valor) VALUES (?, ?, ?)',
      [cursoId, customField.campo, customField.valor]
    );
    customFieldIds.push(result.insertId);
  }

  if (customFieldIds.length === 0) {
    await connection.execute('DELETE FROM curso_custom_fields WHERE curso_id = ?', [cursoId]);
    return;
  }

  await connection.execute(
    `
      DELETE FROM curso_custom_fields
      WHERE curso_id = ?
        AND id NOT IN (${customFieldIds.map(() => '?').join(', ')})
    `,
    [cursoId, ...customFieldIds]
  );
};

const sincronizarClassTimesCurso = async (connection, cursoId, classTimes) => {
  const classTimeIds = [];

  for (const classTime of classTimes) {
    const [existentes] = await connection.execute(
      'SELECT id FROM curso_class_times WHERE curso_id = ? AND posicion = ? LIMIT 1',
      [cursoId, classTime.posicion]
    );

    if (existentes[0]) {
      await connection.execute(
        `
          UPDATE curso_class_times
          SET
            descripcion = ?,
            raw_data = ?,
            sincronizado_en = NOW()
          WHERE id = ?
        `,
        [classTime.descripcion, classTime.rawData, existentes[0].id]
      );
      classTimeIds.push(existentes[0].id);
      continue;
    }

    const [result] = await connection.execute(
      `
        INSERT INTO curso_class_times (
          curso_id,
          posicion,
          descripcion,
          raw_data,
          sincronizado_en
        ) VALUES (?, ?, ?, ?, NOW())
      `,
      [cursoId, classTime.posicion, classTime.descripcion, classTime.rawData]
    );
    classTimeIds.push(result.insertId);
  }

  if (classTimeIds.length === 0) {
    await connection.execute('DELETE FROM curso_class_times WHERE curso_id = ?', [cursoId]);
    return;
  }

  await connection.execute(
    `
      DELETE FROM curso_class_times
      WHERE curso_id = ?
        AND id NOT IN (${classTimeIds.map(() => '?').join(', ')})
    `,
    [cursoId, ...classTimeIds]
  );
};

export const guardarCursosNeolms = async (cursos) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    let guardados = 0;
    for (const curso of cursos) {
      if (!curso?.id) continue;

      const cursoId = await upsertCurso(connection, curso);
      const categorias = obtenerCategoriasCurso(curso);
      const tags = obtenerTagsCurso(curso);
      const customFields = obtenerCustomFieldsCurso(curso);
      const classTimes = obtenerClassTimesCurso(curso);
      await sincronizarCategoriasCurso(connection, cursoId, categorias);
      await sincronizarTagsCurso(connection, cursoId, tags);
      await sincronizarCustomFieldsCurso(connection, cursoId, customFields);
      await sincronizarClassTimesCurso(connection, cursoId, classTimes);
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

export const guardarCursoNeolms = async (curso) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const cursoId = await upsertCurso(connection, curso);
    const categorias = obtenerCategoriasCurso(curso);
    const tags = obtenerTagsCurso(curso);
    const customFields = obtenerCustomFieldsCurso(curso);
    const classTimes = obtenerClassTimesCurso(curso);
    await sincronizarCategoriasCurso(connection, cursoId, categorias);
    await sincronizarTagsCurso(connection, cursoId, tags);
    await sincronizarCustomFieldsCurso(connection, cursoId, customFields);
    await sincronizarClassTimesCurso(connection, cursoId, classTimes);

    await connection.commit();
    return { cursoId };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const obtenerCursoLocalPorId = async (cursoId) => {
  const [rows] = await pool.execute(
    `
      SELECT id, neolms_id, nombre
      FROM cursos
      WHERE id = ?
      LIMIT 1
    `,
    [cursoId]
  );

  return rows[0] || null;
};

const mapearCursoLocal = (curso) => ({
  id: curso.id,
  neolmsId: curso.neolms_id,
  nombre: curso.nombre,
  descripcionCorta: curso.descripcion_corta,
  descripcionLarga: curso.descripcion_larga,
  imagenUrl: curso.imagen_url,
  estilo: curso.estilo,
  fechaInicio: curso.fecha_inicio,
  fechaFin: curso.fecha_fin,
  codigoCurso: curso.codigo_curso,
  codigoSeccion: curso.codigo_seccion,
  creditos: curso.creditos,
  precio: curso.precio,
  organizacionId: curso.organizacion_id,
  organizacionNombre: curso.organizacion_nombre,
  privado: Boolean(curso.privado),
  archivado: Boolean(curso.archivado),
  bloqueado: Boolean(curso.bloqueado),
  mostrarCatalogo: Boolean(curso.mostrar_catalogo),
  inscripcionAbierta: Boolean(curso.inscripcion_abierta),
  inscripcionPublica: Boolean(curso.inscripcion_publica),
  cuposUsados: curso.cupos_usados,
  maxEstudiantes: curso.max_estudiantes,
  maxCupos: curso.max_cupos,
  idioma: curso.idioma,
  edadMinima: curso.edad_minima,
  edadMaxima: curso.edad_maxima,
  materia: curso.materia,
  categorias: curso.categorias ? curso.categorias.split('||').filter(Boolean) : [],
  sincronizadoEn: curso.sincronizado_en,
  actualizadoEn: curso.actualizado_en,
});

export const obtenerCursosLocales = async ({ page, limit, category, search }) => {
  const limitSeguro = Number(limit);
  const offset = (Number(page) - 1) * limitSeguro;
  const where = ['1 = 1'];
  const params = [];

  if (category) {
    where.push(`
      EXISTS (
        SELECT 1
        FROM curso_categoria_relaciones ccr_filter
        INNER JOIN curso_categorias cc_filter ON cc_filter.id = ccr_filter.categoria_id
        WHERE ccr_filter.curso_id = c.id
          AND cc_filter.nombre = ?
      )
    `);
    params.push(category);
  }

  if (search) {
    where.push('(c.nombre LIKE ? OR c.descripcion_corta LIKE ? OR c.descripcion_larga LIKE ?)');
    const searchLike = `%${search}%`;
    params.push(searchLike, searchLike, searchLike);
  }

  const whereSql = where.join(' AND ');

  const [countRows] = await pool.execute(
    `
      SELECT COUNT(*) AS total
      FROM cursos c
      WHERE ${whereSql}
    `,
    params
  );

  const [rows] = await pool.execute(
    `
      SELECT
        c.id,
        c.neolms_id,
        c.nombre,
        c.descripcion_corta,
        c.descripcion_larga,
        c.imagen_url,
        c.estilo,
        c.fecha_inicio,
        c.fecha_fin,
        c.codigo_curso,
        c.codigo_seccion,
        c.creditos,
        c.precio,
        c.organizacion_id,
        c.organizacion_nombre,
        c.privado,
        c.archivado,
        c.bloqueado,
        c.mostrar_catalogo,
        c.inscripcion_abierta,
        c.inscripcion_publica,
        c.cupos_usados,
        c.max_estudiantes,
        c.max_cupos,
        c.idioma,
        c.edad_minima,
        c.edad_maxima,
        c.materia,
        c.sincronizado_en,
        c.actualizado_en,
        GROUP_CONCAT(DISTINCT cc.nombre ORDER BY cc.nombre SEPARATOR '||') AS categorias
      FROM cursos c
      LEFT JOIN curso_categoria_relaciones ccr ON ccr.curso_id = c.id
      LEFT JOIN curso_categorias cc ON cc.id = ccr.categoria_id
      WHERE ${whereSql}
      GROUP BY c.id
      ORDER BY c.fecha_inicio DESC, c.id DESC
      LIMIT ${limitSeguro} OFFSET ${offset}
    `,
    params
  );

  const total = countRows[0]?.total || 0;

  return {
    data: rows.map(mapearCursoLocal),
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

export const obtenerCategoriasCursosLocales = async () => {
  const [rows] = await pool.execute(`
    SELECT
      cc.id,
      cc.nombre AS name,
      COUNT(ccr.curso_id) AS count
    FROM curso_categorias cc
    LEFT JOIN curso_categoria_relaciones ccr ON ccr.categoria_id = cc.id
    GROUP BY cc.id, cc.nombre
    ORDER BY cc.nombre ASC
  `);

  return rows;
};
