import {
  guardarActividadesCursoNeolms,
  guardarDocentesCursoNeolms,
  guardarLeccionesCursoNeolms,
  obtenerActividadesCursoLocal,
  obtenerCursosParaSincronizarDetalle,
  obtenerDocentesCursoLocal,
  obtenerLeccionesCursoLocal,
} from '../db/curso-detalle.queries.js';

const NEOLMS_API_BASE_URL = process.env.NEOLMS_API_BASE_URL || 'https://unicah.neolms.com/api/v3';
const LIMITE_NEOLMS = 50;
const MAX_PAGINAS_NEOLMS = 500;
const DEFAULT_NEOLMS_REQUEST_DELAY_MS = 750;
const DEFAULT_NEOLMS_RATE_LIMIT_RETRY_MS = 60 * 1000;
const MAX_REINTENTOS_NEOLMS = 3;
let ultimaConsultaNeolmsAt = 0;
const usuariosNeolmsCache = new Map();

const normalizarEntero = (valor, fallback, { min, max }) => {
  const numero = Number.parseInt(valor, 10);
  if (Number.isNaN(numero)) return fallback;
  return Math.min(Math.max(numero, min), max);
};

const validarApiKeyNeolms = () => Boolean(process.env.NEOLMS_X_API_KEY);

const esperar = (ms) => new Promise((resolve) => {
  setTimeout(resolve, ms);
});

const obtenerDelayConsultasNeolms = () => normalizarEntero(
  process.env.NEOLMS_REQUEST_DELAY_MS,
  DEFAULT_NEOLMS_REQUEST_DELAY_MS,
  { min: 0, max: 10 * 1000 }
);

const obtenerDelayRateLimitNeolms = () => normalizarEntero(
  process.env.NEOLMS_RATE_LIMIT_RETRY_MS,
  DEFAULT_NEOLMS_RATE_LIMIT_RETRY_MS,
  { min: 5 * 1000, max: 10 * 60 * 1000 }
);

const esperarTurnoNeolms = async () => {
  const delayMs = obtenerDelayConsultasNeolms();
  const ahora = Date.now();
  const esperaPendiente = Math.max(0, ultimaConsultaNeolmsAt + delayMs - ahora);

  if (esperaPendiente > 0) {
    await esperar(esperaPendiente);
  }

  ultimaConsultaNeolmsAt = Date.now();
};

const construirUrlNeolms = (path, { limit, offset } = {}) => {
  const url = new URL(`${NEOLMS_API_BASE_URL}${path}`);

  if (limit !== undefined) url.searchParams.set('$limit', String(limit));
  if (offset !== undefined) url.searchParams.set('$offset', String(offset));

  return url.toString();
};

const consultarNeolms = async (path, { limit, offset } = {}) => {
  for (let intento = 1; intento <= MAX_REINTENTOS_NEOLMS; intento += 1) {
    await esperarTurnoNeolms();

    const response = await fetch(construirUrlNeolms(path, { limit, offset }), {
      method: 'GET',
      headers: {
        'x-api-key': process.env.NEOLMS_X_API_KEY,
        Accept: 'application/json',
      },
    });

    const data = await response.json().catch(() => null);

    if (response.ok) return data;

    if (response.status === 429 && intento < MAX_REINTENTOS_NEOLMS) {
      const retryMs = obtenerDelayRateLimitNeolms();
      console.warn(`NEOLMS limito las consultas. Reintentando ${path} en ${retryMs}ms`);
      await esperar(retryMs);
      continue;
    }

    const error = new Error('No se pudo consultar NEOLMS');
    error.status = response.status;
    error.detail = data?.message || data?.error || null;
    throw error;
  }

  return null;
};

const consultarTodosNeolms = async (path) => {
  const registros = [];

  for (let pagina = 0; pagina < MAX_PAGINAS_NEOLMS; pagina += 1) {
    const offset = pagina * LIMITE_NEOLMS;
    const lote = await consultarNeolms(path, { limit: LIMITE_NEOLMS, offset });

    if (!Array.isArray(lote)) return registros;
    registros.push(...lote);

    if (lote.length < LIMITE_NEOLMS) break;
  }

  return registros;
};

const consultarUsuarioNeolms = async (userId) => {
  if (!userId) return null;
  const cacheKey = String(userId);

  if (usuariosNeolmsCache.has(cacheKey)) {
    return usuariosNeolmsCache.get(cacheKey);
  }

  try {
    const usuario = await consultarNeolms(`/users/${userId}`);
    usuariosNeolmsCache.set(cacheKey, usuario);
    return usuario;
  } catch (error) {
    console.warn(`No se pudo obtener detalle del usuario NEOLMS ${userId}:`, {
      status: error.status || null,
      detail: error.detail || error.message,
    });
    usuariosNeolmsCache.set(cacheKey, null);
    return null;
  }
};

const enriquecerDocentesConUsuarios = async (docentes) => {
  const docentesEnriquecidos = [];

  for (const docente of docentes) {
    const usuario = await consultarUsuarioNeolms(docente.user_id);
    docentesEnriquecidos.push({
      ...docente,
      user: usuario,
    });
  }

  return docentesEnriquecidos;
};

const obtenerFiltroCurso = (req) => {
  const cursoId = req.query?.cursoId
    ? normalizarEntero(req.query.cursoId, null, { min: 1, max: 999999999 })
    : null;
  const neolmsClassId = req.query?.neolmsClassId
    ? normalizarEntero(req.query.neolmsClassId, null, { min: 1, max: 999999999999 })
    : null;

  return { cursoId, neolmsClassId };
};

export const sincronizarLeccionesCursosNeolms = async (req, res) => {
  try {
    if (!validarApiKeyNeolms()) {
      return res.status(500).json({ message: 'No se ha configurado la API key de NEOLMS' });
    }

    const cursos = await obtenerCursosParaSincronizarDetalle(obtenerFiltroCurso(req));
    let totalLeccionesNeolms = 0;
    let guardadas = 0;

    for (const curso of cursos) {
      const lecciones = await consultarTodosNeolms(`/classes/${curso.neolms_id}/lessons`);
      totalLeccionesNeolms += lecciones.length;
      const resultado = await guardarLeccionesCursoNeolms({
        cursoLocalId: curso.id,
        lecciones,
      });
      guardadas += resultado.guardadas;
    }

    return res.status(200).json({
      message: 'Lecciones de cursos sincronizadas correctamente',
      cursosProcesados: cursos.length,
      totalLeccionesNeolms,
      guardadas,
    });
  } catch (error) {
    console.error('Error al sincronizar lecciones desde NEOLMS:', error);
    return res.status(error.status || 500).json({
      message: error.message || 'Error interno al sincronizar lecciones desde NEOLMS',
      detail: error.detail || null,
    });
  }
};

export const sincronizarActividadesCursosNeolms = async (req, res) => {
  try {
    if (!validarApiKeyNeolms()) {
      return res.status(500).json({ message: 'No se ha configurado la API key de NEOLMS' });
    }

    const cursos = await obtenerCursosParaSincronizarDetalle(obtenerFiltroCurso(req));
    let totalActividadesNeolms = 0;
    let guardadas = 0;

    for (const curso of cursos) {
      const actividades = await consultarTodosNeolms(`/classes/${curso.neolms_id}/assignments`);
      totalActividadesNeolms += actividades.length;
      const resultado = await guardarActividadesCursoNeolms({
        cursoLocalId: curso.id,
        actividades,
      });
      guardadas += resultado.guardadas;
    }

    return res.status(200).json({
      message: 'Actividades de cursos sincronizadas correctamente',
      cursosProcesados: cursos.length,
      totalActividadesNeolms,
      guardadas,
    });
  } catch (error) {
    console.error('Error al sincronizar actividades desde NEOLMS:', error);
    return res.status(error.status || 500).json({
      message: error.message || 'Error interno al sincronizar actividades desde NEOLMS',
      detail: error.detail || null,
    });
  }
};

export const sincronizarDocentesCursosNeolms = async (req, res) => {
  try {
    if (!validarApiKeyNeolms()) {
      return res.status(500).json({ message: 'No se ha configurado la API key de NEOLMS' });
    }

    const cursos = await obtenerCursosParaSincronizarDetalle(obtenerFiltroCurso(req));
    let totalDocentesNeolms = 0;
    let guardados = 0;

    for (const curso of cursos) {
      const docentes = await consultarTodosNeolms(`/classes/${curso.neolms_id}/teachers`);
      const docentesEnriquecidos = await enriquecerDocentesConUsuarios(docentes);
      totalDocentesNeolms += docentes.length;
      const resultado = await guardarDocentesCursoNeolms({
        cursoLocalId: curso.id,
        docentes: docentesEnriquecidos,
      });
      guardados += resultado.guardados;
    }

    return res.status(200).json({
      message: 'Docentes de cursos sincronizados correctamente',
      cursosProcesados: cursos.length,
      totalDocentesNeolms,
      guardados,
    });
  } catch (error) {
    console.error('Error al sincronizar docentes desde NEOLMS:', error);
    return res.status(error.status || 500).json({
      message: error.message || 'Error interno al sincronizar docentes desde NEOLMS',
      detail: error.detail || null,
    });
  }
};

export const obtenerLeccionesCurso = async (req, res) => {
  try {
    const cursoId = normalizarEntero(req.params?.cursoId, null, { min: 1, max: 999999999 });

    if (!cursoId) return res.status(400).json({ message: 'El cursoId es obligatorio' });

    const data = await obtenerLeccionesCursoLocal({ cursoId });
    return res.status(200).json({ data, count: data.length });
  } catch (error) {
    console.error('Error al obtener lecciones del curso:', error);
    return res.status(500).json({ message: 'Error interno al obtener lecciones del curso' });
  }
};

export const obtenerActividadesCurso = async (req, res) => {
  try {
    const cursoId = normalizarEntero(req.params?.cursoId, null, { min: 1, max: 999999999 });

    if (!cursoId) return res.status(400).json({ message: 'El cursoId es obligatorio' });

    const data = await obtenerActividadesCursoLocal({ cursoId });
    return res.status(200).json({ data, count: data.length });
  } catch (error) {
    console.error('Error al obtener actividades del curso:', error);
    return res.status(500).json({ message: 'Error interno al obtener actividades del curso' });
  }
};

export const obtenerDocentesCurso = async (req, res) => {
  try {
    const cursoId = normalizarEntero(req.params?.cursoId, null, { min: 1, max: 999999999 });

    if (!cursoId) return res.status(400).json({ message: 'El cursoId es obligatorio' });

    const data = await obtenerDocentesCursoLocal({ cursoId });
    return res.status(200).json({ data, count: data.length });
  } catch (error) {
    console.error('Error al obtener docentes del curso:', error);
    return res.status(500).json({ message: 'Error interno al obtener docentes del curso' });
  }
};
