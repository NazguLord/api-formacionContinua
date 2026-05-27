const DEFAULT_INTERVAL_MINUTES = 60;
const DEFAULT_REQUEST_TIMEOUT_MS = 15 * 60 * 1000;

const tareasSincronizacion = [
  {
    nombre: 'cursos',
    path: '/api/cursos/sincronizar',
  },
  {
    nombre: 'lecciones de cursos',
    path: '/api/cursos/lecciones/sincronizar',
  },
  {
    nombre: 'actividades de cursos',
    path: '/api/cursos/actividades/sincronizar',
  },
  {
    nombre: 'docentes de cursos',
    path: '/api/cursos/docentes/sincronizar',
  },
  {
    nombre: 'alumnos',
    path: '/api/alumnos/sincronizar',
  },
  {
    nombre: 'alumnos por curso',
    path: '/api/cursos/alumnos/sincronizar',
  },
  {
    nombre: 'calificaciones de alumnos',
    path: '/api/alumnos/calificaciones/sincronizar',
  },
];

const normalizarBoolean = (valor, fallback = false) => {
  if (valor === undefined || valor === null || valor === '') return fallback;
  return ['1', 'true', 'si', 'sí', 'yes', 'on'].includes(String(valor).trim().toLowerCase());
};

const normalizarEntero = (valor, fallback, { min, max }) => {
  const numero = Number.parseInt(valor, 10);
  if (Number.isNaN(numero)) return fallback;
  return Math.min(Math.max(numero, min), max);
};

const esperar = (ms) => new Promise((resolve) => {
  setTimeout(resolve, ms);
});

const construirBaseUrl = (port) => {
  return process.env.AUTO_SYNC_BASE_URL || `http://127.0.0.1:${port}`;
};

const ejecutarPost = async ({ baseUrl, path, apiKey, timeoutMs }) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const error = new Error(data?.message || `Error HTTP ${response.status}`);
      error.status = response.status;
      error.detail = data?.detail || null;
      throw error;
    }

    return data;
  } finally {
    clearTimeout(timeout);
  }
};

export const iniciarSincronizacionAutomatica = ({ port }) => {
  const habilitado = normalizarBoolean(process.env.AUTO_SYNC_ENABLED, false);
  const ejecutarAlArrancar = normalizarBoolean(process.env.AUTO_SYNC_RUN_ON_START, false);
  const intervaloMinutos = normalizarEntero(
    process.env.AUTO_SYNC_INTERVAL_MINUTES,
    DEFAULT_INTERVAL_MINUTES,
    { min: 15, max: 24 * 60 }
  );
  const timeoutMs = normalizarEntero(
    process.env.AUTO_SYNC_REQUEST_TIMEOUT_MS,
    DEFAULT_REQUEST_TIMEOUT_MS,
    { min: 30 * 1000, max: 60 * 60 * 1000 }
  );
  const apiKey = process.env.NEOLMS_X_API_KEY;
  const baseUrl = construirBaseUrl(port);
  let ejecutando = false;
  let timer = null;

  if (!habilitado) {
    console.log('Sincronizacion automatica desactivada');
    return null;
  }

  if (!apiKey) {
    console.warn('Sincronizacion automatica no iniciada: NEOLMS_X_API_KEY no configurada');
    return null;
  }

  const intervaloMs = intervaloMinutos * 60 * 1000;

  const programarSiguiente = (delayMs = intervaloMs) => {
    timer = setTimeout(ejecutarSincronizacion, delayMs);
  };

  const ejecutarSincronizacion = async () => {
    if (ejecutando) {
      console.warn('Sincronizacion automatica omitida: aun hay una ejecucion activa');
      programarSiguiente();
      return;
    }

    ejecutando = true;
    const inicio = Date.now();
    console.log('Sincronizacion automatica iniciada');

    const resumen = [];

    for (const tarea of tareasSincronizacion) {
      try {
        const resultado = await ejecutarPost({
          baseUrl,
          path: tarea.path,
          apiKey,
          timeoutMs,
        });

        console.log(`Sincronizacion de ${tarea.nombre} completada`, resultado);
        resumen.push({
          tarea: tarea.nombre,
          estado: 'completada',
          resultado,
        });
        await esperar(1000);
      } catch (error) {
        console.error(`Error en sincronizacion de ${tarea.nombre}:`, {
          message: error.message,
          status: error.status || null,
          detail: error.detail || null,
        });
        resumen.push({
          tarea: tarea.nombre,
          estado: 'error',
          message: error.message,
          status: error.status || null,
          detail: error.detail || null,
        });
      }
    }

    const segundos = Math.round((Date.now() - inicio) / 1000);
    console.log(`Sincronizacion automatica finalizada en ${segundos}s`, resumen);
    ejecutando = false;
    programarSiguiente();
  };

  console.log(`Sincronizacion automatica activa cada ${intervaloMinutos} minutos`);
  programarSiguiente(ejecutarAlArrancar ? 5000 : intervaloMs);

  return {
    detener() {
      if (timer) clearTimeout(timer);
    },
  };
};
