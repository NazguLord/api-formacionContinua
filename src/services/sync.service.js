const DEFAULT_INTERVAL_MINUTES = 60;
const DEFAULT_REQUEST_TIMEOUT_MS = 15 * 60 * 1000;

const tareasSincronizacion = [
  {
    nombre: 'cursos',
    path: '/api/cursos/sincronizar',
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

    try {
      for (const tarea of tareasSincronizacion) {
        const resultado = await ejecutarPost({
          baseUrl,
          path: tarea.path,
          apiKey,
          timeoutMs,
        });

        console.log(`Sincronizacion de ${tarea.nombre} completada`, resultado);
        await esperar(1000);
      }

      const segundos = Math.round((Date.now() - inicio) / 1000);
      console.log(`Sincronizacion automatica finalizada en ${segundos}s`);
    } catch (error) {
      console.error('Error en sincronizacion automatica:', {
        message: error.message,
        status: error.status || null,
        detail: error.detail || null,
      });
    } finally {
      ejecutando = false;
      programarSiguiente();
    }
  };

  console.log(`Sincronizacion automatica activa cada ${intervaloMinutos} minutos`);
  programarSiguiente(ejecutarAlArrancar ? 5000 : intervaloMs);

  return {
    detener() {
      if (timer) clearTimeout(timer);
    },
  };
};
