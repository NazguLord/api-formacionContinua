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
  bloqueado: normalizarBoolean(curso.locked),
  mostrarCatalogo: normalizarBoolean(curso.display_in_catalog),
  inscripcionAbierta: normalizarBoolean(curso.enrollment_open),
  inscripcionPublica: normalizarBoolean(curso.open_enrollment),
  cuposUsados: normalizarNumero(curso.used_seats),
  maxEstudiantes: normalizarNumero(curso.max_students),
  maxCupos: normalizarNumero(curso.max_seats),
  sisId: normalizarTexto(curso.sis_id),
  sisPid: normalizarTexto(curso.sis_pid),
  metadataCreatorId: normalizarNumero(curso.metadata?.creator_id),
  metadataCreatedAt: normalizarFechaHora(curso.metadata?.created_at),
  idioma: normalizarTexto(curso.metadata?.language),
  edadMinima: normalizarNumero(curso.metadata?.lo_age),
  edadMaxima: normalizarNumero(curso.metadata?.hi_age),
  materia: normalizarTexto(curso.metadata?.subject),
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

const upsertCurso = async (connection, curso) => {
  const cursoMapeado = mapearCursoNeolms(curso);

  const sql = `
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
      bloqueado,
      mostrar_catalogo,
      inscripcion_abierta,
      inscripcion_publica,
      cupos_usados,
      max_estudiantes,
      max_cupos,
      sis_id,
      sis_pid,
      metadata_creator_id,
      metadata_created_at,
      idioma,
      edad_minima,
      edad_maxima,
      materia,
      raw_data,
      sincronizado_en
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW()
    )
    ON DUPLICATE KEY UPDATE
      parent_neolms_id = VALUES(parent_neolms_id),
      access_code = VALUES(access_code),
      nombre = VALUES(nombre),
      descripcion_corta = VALUES(descripcion_corta),
      descripcion_larga = VALUES(descripcion_larga),
      imagen_url = VALUES(imagen_url),
      estilo = VALUES(estilo),
      fecha_inicio = VALUES(fecha_inicio),
      fecha_fin = VALUES(fecha_fin),
      zona_horaria = VALUES(zona_horaria),
      codigo_curso = VALUES(codigo_curso),
      codigo_seccion = VALUES(codigo_seccion),
      creditos = VALUES(creditos),
      precio = VALUES(precio),
      organizacion_id = VALUES(organizacion_id),
      organizacion_nombre = VALUES(organizacion_nombre),
      privado = VALUES(privado),
      archivado = VALUES(archivado),
      archivado_en = VALUES(archivado_en),
      bloqueado = VALUES(bloqueado),
      mostrar_catalogo = VALUES(mostrar_catalogo),
      inscripcion_abierta = VALUES(inscripcion_abierta),
      inscripcion_publica = VALUES(inscripcion_publica),
      cupos_usados = VALUES(cupos_usados),
      max_estudiantes = VALUES(max_estudiantes),
      max_cupos = VALUES(max_cupos),
      sis_id = VALUES(sis_id),
      sis_pid = VALUES(sis_pid),
      metadata_creator_id = VALUES(metadata_creator_id),
      metadata_created_at = VALUES(metadata_created_at),
      idioma = VALUES(idioma),
      edad_minima = VALUES(edad_minima),
      edad_maxima = VALUES(edad_maxima),
      materia = VALUES(materia),
      raw_data = VALUES(raw_data),
      sincronizado_en = NOW()
  `;

  const params = [
    cursoMapeado.neolmsId,
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
    cursoMapeado.bloqueado,
    cursoMapeado.mostrarCatalogo,
    cursoMapeado.inscripcionAbierta,
    cursoMapeado.inscripcionPublica,
    cursoMapeado.cuposUsados,
    cursoMapeado.maxEstudiantes,
    cursoMapeado.maxCupos,
    cursoMapeado.sisId,
    cursoMapeado.sisPid,
    cursoMapeado.metadataCreatorId,
    cursoMapeado.metadataCreatedAt,
    cursoMapeado.idioma,
    cursoMapeado.edadMinima,
    cursoMapeado.edadMaxima,
    cursoMapeado.materia,
    cursoMapeado.rawData,
  ];

  await connection.execute(sql, params);

  const [rows] = await connection.execute(
    'SELECT id FROM cursos WHERE neolms_id = ? LIMIT 1',
    [cursoMapeado.neolmsId]
  );

  return rows[0].id;
};

const sincronizarCategoriasCurso = async (connection, cursoId, categorias) => {
  await connection.execute('DELETE FROM curso_categoria_relaciones WHERE curso_id = ?', [cursoId]);

  for (const categoria of categorias) {
    await connection.execute(
      `
        INSERT INTO curso_categorias (nombre)
        VALUES (?)
        ON DUPLICATE KEY UPDATE nombre = VALUES(nombre)
      `,
      [categoria]
    );

    const [rows] = await connection.execute(
      'SELECT id FROM curso_categorias WHERE nombre = ? LIMIT 1',
      [categoria]
    );

    await connection.execute(
      `
        INSERT IGNORE INTO curso_categoria_relaciones (curso_id, categoria_id)
        VALUES (?, ?)
      `,
      [cursoId, rows[0].id]
    );
  }
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
      await sincronizarCategoriasCurso(connection, cursoId, categorias);
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
