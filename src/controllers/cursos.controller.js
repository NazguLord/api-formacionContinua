const NEOLMS_CLASSES_URL =
  process.env.NEOLMS_CLASSES_URL || 'https://unicah.neolms.com/api/v3/classes?$limit=100&';

const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_PAGINAS_CACHE = 200;
const LIMITE_CACHE = 50;

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
    if (!validarApiKeyCursos()) {
      return res.status(500).json({
        message: 'No se ha configurado la API key de cursos',
      });
    }

    const cursos = await obtenerTodosCursos();
    const categoriasMap = new Map();

    cursos.forEach((curso) => {
      obtenerCategoriasCurso(curso).forEach((categoria) => {
        const nombre = String(categoria || 'Sin categoria').trim() || 'Sin categoria';
        categoriasMap.set(nombre, (categoriasMap.get(nombre) || 0) + 1);
      });
    });

    const categorias = [...categoriasMap.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));

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
    if (!validarApiKeyCursos()) {
      return res.status(500).json({
        message: 'No se ha configurado la API key de cursos',
      });
    }

    const page = normalizarEntero(req.query?.page, 1, { min: 1, max: 10000 });
    const limit = normalizarEntero(req.query?.limit, 10, { min: 1, max: 50 });
    const category = String(req.query?.category || '').trim();
    const offset = (page - 1) * limit;

    if (category) {
      const todosCursos = await obtenerTodosCursos();
      const cursosFiltrados = filtrarCursosPorCategoria(todosCursos, category);
      const cursosPagina = paginarCursos(cursosFiltrados, { page, limit });

      return res.status(200).json({
        data: cursosPagina,
        pagination: {
          page,
          limit,
          count: cursosPagina.length,
          total: cursosFiltrados.length,
          hasNextPage: page * limit < cursosFiltrados.length,
          hasPreviousPage: page > 1,
        },
      });
    }

    const cursos = await consultarCursosCypher({ limit, offset });

    return res.status(200).json({
      data: cursos,
      pagination: {
        page,
        limit,
        count: cursos.length,
        total: null,
        hasNextPage: cursos.length === limit,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    console.error('Error al obtener cursos:', error);
    return res.status(error.status || 500).json({
      message: error.message || 'Error interno al obtener cursos',
      detail: error.detail || null,
    });
  }
};
