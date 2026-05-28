import {
  guardarAlumnosNeolms,
  guardarCalificacionesAlumnoNeolms,
  guardarMatriculasCursoNeolms,
  obtenerAlumnosLocales,
  obtenerAlumnosCursosPorMes,
  obtenerAlumnosParaSincronizarCalificaciones,
  obtenerAlumnosPorCursoLocal,
  obtenerCalificacionesAlumnoLocal,
  obtenerCursosParaSincronizarAlumnos,
} from '../db/alumnos.queries.js';

const NEOLMS_API_BASE_URL = process.env.NEOLMS_API_BASE_URL || 'https://unicah.neolms.com/api/v3';
const LIMITE_NEOLMS = 50;
const MAX_PAGINAS_NEOLMS = 500;
const DEFAULT_NEOLMS_REQUEST_DELAY_MS = 750;
const DEFAULT_NEOLMS_RATE_LIMIT_RETRY_MS = 60 * 1000;
const MAX_REINTENTOS_NEOLMS = 3;
let ultimaConsultaNeolmsAt = 0;

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

    if (response.ok) {
      return data;
    }

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

const esAlumno = (usuario) => {
  return Array.isArray(usuario?.roles) && usuario.roles.includes('Student');
};

export const sincronizarAlumnosNeolms = async (req, res) => {
  try {
    if (!validarApiKeyNeolms()) {
      return res.status(500).json({
        message: 'No se ha configurado la API key de NEOLMS',
      });
    }

    const usuarios = await consultarTodosNeolms('/users');
    const alumnos = usuarios.filter(esAlumno);
    const resultado = await guardarAlumnosNeolms(alumnos);

    return res.status(200).json({
      message: 'Alumnos sincronizados correctamente',
      totalUsuariosNeolms: usuarios.length,
      totalAlumnosNeolms: alumnos.length,
      guardados: resultado.guardados,
    });
  } catch (error) {
    console.error('Error al sincronizar alumnos desde NEOLMS:', error);
    return res.status(error.status || 500).json({
      message: error.message || 'Error interno al sincronizar alumnos desde NEOLMS',
      detail: error.detail || null,
    });
  }
};

export const sincronizarAlumnosCursosNeolms = async (req, res) => {
  try {
    if (!validarApiKeyNeolms()) {
      return res.status(500).json({
        message: 'No se ha configurado la API key de NEOLMS',
      });
    }

    const cursoId = req.query?.cursoId ? normalizarEntero(req.query.cursoId, null, { min: 1, max: 999999999 }) : null;
    const neolmsClassId = req.query?.neolmsClassId
      ? normalizarEntero(req.query.neolmsClassId, null, { min: 1, max: 999999999999 })
      : null;
    const cursos = await obtenerCursosParaSincronizarAlumnos({ cursoId, neolmsClassId });

    let totalMatriculasNeolms = 0;
    let guardadas = 0;
    let omitidas = 0;

    for (const curso of cursos) {
      const matriculas = await consultarTodosNeolms(`/classes/${curso.neolms_id}/students`);
      totalMatriculasNeolms += matriculas.length;

      const resultado = await guardarMatriculasCursoNeolms({
        cursoLocalId: curso.id,
        matriculas,
      });

      guardadas += resultado.guardadas;
      omitidas += resultado.omitidas;
    }

    return res.status(200).json({
      message: 'Alumnos por curso sincronizados correctamente',
      cursosProcesados: cursos.length,
      totalMatriculasNeolms,
      guardadas,
      omitidasPorAlumnoNoSincronizado: omitidas,
    });
  } catch (error) {
    console.error('Error al sincronizar alumnos por curso desde NEOLMS:', error);
    return res.status(error.status || 500).json({
      message: error.message || 'Error interno al sincronizar alumnos por curso desde NEOLMS',
      detail: error.detail || null,
    });
  }
};

export const sincronizarCalificacionesAlumnosNeolms = async (req, res) => {
  try {
    if (!validarApiKeyNeolms()) {
      return res.status(500).json({
        message: 'No se ha configurado la API key de NEOLMS',
      });
    }

    const alumnoId = req.query?.alumnoId ? normalizarEntero(req.query.alumnoId, null, { min: 1, max: 999999999 }) : null;
    const neolmsUserId = req.query?.neolmsUserId
      ? normalizarEntero(req.query.neolmsUserId, null, { min: 1, max: 999999999999 })
      : null;
    const alumnos = await obtenerAlumnosParaSincronizarCalificaciones({ alumnoId, neolmsUserId });

    let totalCalificacionesNeolms = 0;
    let guardadas = 0;

    for (const alumno of alumnos) {
      const calificaciones = await consultarTodosNeolms(`/users/${alumno.neolms_id}/assignment_grades`);
      totalCalificacionesNeolms += calificaciones.length;

      const resultado = await guardarCalificacionesAlumnoNeolms({
        alumnoLocalId: alumno.id,
        calificaciones,
      });

      guardadas += resultado.guardadas;
    }

    return res.status(200).json({
      message: 'Calificaciones de alumnos sincronizadas correctamente',
      alumnosProcesados: alumnos.length,
      totalCalificacionesNeolms,
      guardadas,
    });
  } catch (error) {
    console.error('Error al sincronizar calificaciones desde NEOLMS:', error);
    return res.status(error.status || 500).json({
      message: error.message || 'Error interno al sincronizar calificaciones desde NEOLMS',
      detail: error.detail || null,
    });
  }
};

export const obtenerAlumnos = async (req, res) => {
  try {
    const page = normalizarEntero(req.query?.page, 1, { min: 1, max: 10000 });
    const limit = normalizarEntero(req.query?.limit, 10, { min: 1, max: 50 });
    const search = String(req.query?.search || req.query?.q || '').trim();
    const resultado = await obtenerAlumnosLocales({ page, limit, search });

    return res.status(200).json(resultado);
  } catch (error) {
    console.error('Error al obtener alumnos:', error);
    return res.status(500).json({
      message: 'Error interno al obtener alumnos',
    });
  }
};

export const obtenerReporteAlumnosCursosPorMes = async (req, res) => {
  try {
    const anio = normalizarEntero(req.query?.anio, null, { min: 2000, max: 2100 });
    const mes = normalizarEntero(req.query?.mes, null, { min: 1, max: 12 });

    if (!anio || !mes) {
      return res.status(400).json({
        message: 'Los parametros anio y mes son obligatorios',
      });
    }

    const data = await obtenerAlumnosCursosPorMes({ anio, mes });

    return res.status(200).json({
      anio,
      mes,
      data,
      count: data.length,
    });
  } catch (error) {
    console.error('Error al obtener reporte de alumnos por curso y mes:', error);
    return res.status(500).json({
      message: 'Error interno al obtener reporte de alumnos por curso y mes',
    });
  }
};

export const obtenerAlumnosPorCurso = async (req, res) => {
  try {
    const cursoId = normalizarEntero(req.params?.cursoId, null, { min: 1, max: 999999999 });

    if (!cursoId) {
      return res.status(400).json({
        message: 'El cursoId es obligatorio',
      });
    }

    const page = normalizarEntero(req.query?.page, 1, { min: 1, max: 10000 });
    const limit = normalizarEntero(req.query?.limit, 10, { min: 1, max: 50 });
    const resultado = await obtenerAlumnosPorCursoLocal({ cursoId, page, limit });

    return res.status(200).json(resultado);
  } catch (error) {
    console.error('Error al obtener alumnos por curso:', error);
    return res.status(500).json({
      message: 'Error interno al obtener alumnos por curso',
    });
  }
};

export const obtenerCalificacionesAlumno = async (req, res) => {
  try {
    const alumnoId = normalizarEntero(req.params?.alumnoId, null, { min: 1, max: 999999999 });

    if (!alumnoId) {
      return res.status(400).json({
        message: 'El alumnoId es obligatorio',
      });
    }

    const page = normalizarEntero(req.query?.page, 1, { min: 1, max: 10000 });
    const limit = normalizarEntero(req.query?.limit, 10, { min: 1, max: 50 });
    const resultado = await obtenerCalificacionesAlumnoLocal({ alumnoId, page, limit });

    return res.status(200).json(resultado);
  } catch (error) {
    console.error('Error al obtener calificaciones del alumno:', error);
    return res.status(500).json({
      message: 'Error interno al obtener calificaciones del alumno',
    });
  }
};
