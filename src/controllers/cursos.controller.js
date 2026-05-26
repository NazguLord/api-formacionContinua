import {
  guardarCursoNeolms,
  guardarCursosNeolms,
  obtenerCategoriasCursosLocales,
  obtenerCursoLocalPorId,
  obtenerCursosLocales,
} from '../db/cursos.queries.js';

const NEOLMS_CLASSES_URL =
  process.env.NEOLMS_CLASSES_URL || 'https://unicah.neolms.com/api/v3/classes';

const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_PAGINAS_CACHE = 200;
const LIMITE_CACHE = 50;
const CAMPOS_ACTUALIZABLES_CURSO = new Set([
  'allow_reenrollment',
  'allow_unenrollment',
  'archived',
  'auto_complete_on_visit',
  'auto_enroll_from_waitlist',
  'course_code',
  'credits',
  'custom_fields',
  'delete_history_on_unenroll',
  'disable_completion',
  'display_in_catalog',
  'enrollment_open',
  'finish_at',
  'locked',
  'long_description',
  'max_seats',
  'max_students',
  'metadata',
  'must_repurchase_to_reenroll',
  'name',
  'open_enrollment',
  'organization_id',
  'path',
  'picture',
  'price',
  'private',
  'section_code',
  'short_description',
  'sis_id',
  'sis_pid',
  'start_at',
  'style',
  'tags',
  'tax_exempt',
  'time_zone',
  'waitlist_after_limit',
  'weight_using_categories',
  'weights',
]);

let cursosCache = {
  data: null,
  expiresAt: 0,
};

const normalizarEntero = (valor, fallback, { min, max }) => {
  const numero = Number.parseInt(valor, 10);

  if (Number.isNaN(numero)) return fallback;
  return Math.min(Math.max(numero, min), max);
};

const construirUrlCursos = ({ limit, offset }) => {
  const url = new URL(NEOLMS_CLASSES_URL);

  url.searchParams.set('$limit', String(limit));
  url.searchParams.set('$offset', String(offset));

  return url.toString();
};

const validarApiKeyCursos = () => Boolean(process.env.NEOLMS_X_API_KEY);

const construirPayloadActualizacionCurso = (body = {}) => {
  if (body?.campo) {
    return CAMPOS_ACTUALIZABLES_CURSO.has(body.campo)
      ? { [body.campo]: body.valor ?? null }
      : {};
  }

  return Object.fromEntries(
    Object.entries(body).filter(([campo]) => CAMPOS_ACTUALIZABLES_CURSO.has(campo))
  );
};

const consultarCursosCypher = async ({ limit, offset }) => {
  const response = await fetch(construirUrlCursos({ limit, offset }), {
    method: 'GET',
    headers: {
      'x-api-key': process.env.NEOLMS_X_API_KEY,
      Accept: 'application/json',
    },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error('No se pudieron obtener los cursos');
    error.status = response.status;
    error.detail = data?.message || data?.error || null;
    throw error;
  }

  return Array.isArray(data) ? data : [];
};

const consultarCursoCypherPorId = async (neolmsId) => {
  const url = new URL(`${NEOLMS_CLASSES_URL}/${neolmsId}`);
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'x-api-key': process.env.NEOLMS_X_API_KEY,
      Accept: 'application/json',
    },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error('No se pudo obtener el curso');
    error.status = response.status;
    error.detail = data?.message || data?.error || null;
    throw error;
  }

  return data;
};

const actualizarCursoCypherPorId = async (neolmsId, payload) => {
  const url = new URL(`${NEOLMS_CLASSES_URL}/${neolmsId}`);
  const response = await fetch(url.toString(), {
    method: 'PATCH',
    headers: {
      'x-api-key': process.env.NEOLMS_X_API_KEY,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error('No se pudo actualizar el curso en NEOLMS');
    error.status = response.status;
    error.detail = data?.message || data?.error || null;
    throw error;
  }

  return data;
};

const obtenerCategoriasCurso = (curso) => {
  if (Array.isArray(curso?.catalog_categories) && curso.catalog_categories.length > 0) {
    return curso.catalog_categories.filter(Boolean);
  }

  if (curso?.metadata?.subject) return [curso.metadata.subject];
  return ['Sin categoria'];
};

const obtenerTodosCursos = async () => {
  if (cursosCache.data && cursosCache.expiresAt > Date.now()) {
    return cursosCache.data;
  }

  const cursos = [];

  for (let pagina = 0; pagina < MAX_PAGINAS_CACHE; pagina += 1) {
    const offset = pagina * LIMITE_CACHE;
    const lote = await consultarCursosCypher({ limit: LIMITE_CACHE, offset });

    cursos.push(...lote);

    if (lote.length < LIMITE_CACHE) {
      break;
    }
  }

  cursosCache = {
    data: cursos,
    expiresAt: Date.now() + CACHE_TTL_MS,
  };

  return cursos;
};

const filtrarCursosPorCategoria = (cursos, categoria) => {
  const categoriaNormalizada = String(categoria || '').trim().toLowerCase();

  if (!categoriaNormalizada) return cursos;

  return cursos.filter((curso) =>
    obtenerCategoriasCurso(curso).some(
      (cursoCategoria) => String(cursoCategoria).trim().toLowerCase() === categoriaNormalizada
    )
  );
};

const paginarCursos = (cursos, { page, limit }) => {
  const inicio = (page - 1) * limit;
  return cursos.slice(inicio, inicio + limit);
};

export const obtenerCategoriasCursos = async (req, res) => {
  try {
    const categorias = await obtenerCategoriasCursosLocales();

    return res.status(200).json({
      data: categorias,
      count: categorias.length,
    });
  } catch (error) {
    console.error('Error al obtener categorias de cursos:', error);
    return res.status(error.status || 500).json({
      message: error.message || 'Error interno al obtener categorias de cursos',
      detail: error.detail || null,
    });
  }
};

export const obtenerCursos = async (req, res) => {
  try {
    const page = normalizarEntero(req.query?.page, 1, { min: 1, max: 10000 });
    const limit = normalizarEntero(req.query?.limit, 10, { min: 1, max: 50 });
    const category = String(req.query?.category || '').trim();
    const search = String(req.query?.search || req.query?.q || '').trim();
    const resultado = await obtenerCursosLocales({ page, limit, category, search });

    return res.status(200).json({
      data: resultado.data,
      pagination: resultado.pagination,
    });
  } catch (error) {
    console.error('Error al obtener cursos:', error);
    return res.status(error.status || 500).json({
      message: error.message || 'Error interno al obtener cursos',
      detail: error.detail || null,
    });
  }
};

export const sincronizarCursosNeolms = async (req, res) => {
  try {
    if (!validarApiKeyCursos()) {
      return res.status(500).json({
        message: 'No se ha configurado la API key de cursos',
      });
    }

    const cursos = await obtenerTodosCursos();
    const resultado = await guardarCursosNeolms(cursos);

    cursosCache = {
      data: cursos,
      expiresAt: Date.now() + CACHE_TTL_MS,
    };

    return res.status(200).json({
      message: 'Cursos sincronizados correctamente',
      totalNeolms: cursos.length,
      guardados: resultado.guardados,
    });
  } catch (error) {
    console.error('Error al sincronizar cursos desde NEOLMS:', error);
    return res.status(error.status || 500).json({
      message: error.message || 'Error interno al sincronizar cursos desde NEOLMS',
      detail: error.detail || null,
    });
  }
};

export const actualizarCursoNeolms = async (req, res) => {
  try {
    if (!validarApiKeyCursos()) {
      return res.status(500).json({
        message: 'No se ha configurado la API key de cursos',
      });
    }

    const cursoId = normalizarEntero(req.params?.cursoId, null, { min: 1, max: 999999999 });
    const neolmsIdQuery = normalizarEntero(req.query?.neolmsId, null, {
      min: 1,
      max: 999999999999,
    });

    let neolmsId = neolmsIdQuery;
    let cursoLocal = null;

    if (!neolmsId && cursoId) {
      cursoLocal = await obtenerCursoLocalPorId(cursoId);

      if (!cursoLocal) {
        return res.status(404).json({
          message: 'El curso local indicado no existe',
        });
      }

      neolmsId = cursoLocal.neolms_id;
    }

    if (!neolmsId) {
      return res.status(400).json({
        message: 'Debe indicar cursoId en la ruta o neolmsId en query',
      });
    }

    const curso = await consultarCursoCypherPorId(neolmsId);
    const resultado = await guardarCursoNeolms(curso);

    cursosCache = {
      data: null,
      expiresAt: 0,
    };

    return res.status(200).json({
      message: 'Curso actualizado correctamente',
      cursoId: resultado.cursoId,
      neolmsId: curso.id,
      nombre: curso.name,
    });
  } catch (error) {
    console.error('Error al actualizar curso desde NEOLMS:', error);
    return res.status(error.status || 500).json({
      message: error.message || 'Error interno al actualizar curso desde NEOLMS',
      detail: error.detail || null,
    });
  }
};

export const modificarCursoNeolms = async (req, res) => {
  try {
    if (!validarApiKeyCursos()) {
      return res.status(500).json({
        message: 'No se ha configurado la API key de cursos',
      });
    }

    const cursoId = normalizarEntero(req.params?.cursoId, null, { min: 1, max: 999999999 });
    const cursoLocal = await obtenerCursoLocalPorId(cursoId);

    if (!cursoLocal) {
      return res.status(404).json({
        message: 'El curso local indicado no existe',
      });
    }

    const payload = construirPayloadActualizacionCurso(req.body);
    const camposIgnorados = Object.keys(req.body || {}).filter(
      (campo) => !['campo', 'valor'].includes(campo) && !CAMPOS_ACTUALIZABLES_CURSO.has(campo)
    );

    if (Object.keys(payload).length === 0) {
      return res.status(400).json({
        message: 'Debe enviar al menos un campo valido para actualizar',
        camposPermitidos: [...CAMPOS_ACTUALIZABLES_CURSO],
      });
    }

    await actualizarCursoCypherPorId(cursoLocal.neolms_id, payload);
    const cursoActualizado = await consultarCursoCypherPorId(cursoLocal.neolms_id);
    const resultado = await guardarCursoNeolms(cursoActualizado);

    cursosCache = {
      data: null,
      expiresAt: 0,
    };

    return res.status(200).json({
      message: 'Curso modificado correctamente en NEOLMS y actualizado localmente',
      cursoId: resultado.cursoId,
      neolmsId: cursoActualizado.id,
      nombre: cursoActualizado.name,
      camposActualizados: Object.keys(payload),
      camposIgnorados,
    });
  } catch (error) {
    console.error('Error al modificar curso en NEOLMS:', error);
    return res.status(error.status || 500).json({
      message: error.message || 'Error interno al modificar curso en NEOLMS',
      detail: error.detail || null,
    });
  }
};
