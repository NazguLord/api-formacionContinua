import { obtenerApiKeySistema } from '../db/api-key.queries.js';
import { comparePassword } from '../utils/hash.js';

const obtenerApiKeyRequest = (req) => {
  const apiKeyHeader = req.headers?.['x-api-key'];
  const authorization = req.headers?.authorization || '';

  if (apiKeyHeader) return apiKeyHeader;
  if (authorization.startsWith('Bearer ')) return authorization.slice(7);

  return null;
};

export const verificarApiKeyNeolms = (req, res, next) => {
  const apiKey = obtenerApiKeyRequest(req);

  if (!process.env.NEOLMS_X_API_KEY) {
    return res.status(500).json({
      message: 'No se ha configurado la API key de NEOLMS',
    });
  }

  if (!apiKey || apiKey !== process.env.NEOLMS_X_API_KEY) {
    return res.status(401).json({
      message: 'API key no proporcionada o invalida',
    });
  }

  next();
};

export const verificarApiKeySistema = (sistema) => {
  return async (req, res, next) => {
    try {
      const apiKey = obtenerApiKeyRequest(req);

      if (!apiKey) {
        return res.status(401).json({
          message: 'API key no proporcionada',
        });
      }

      const registro = await obtenerApiKeySistema(sistema);
      if (!registro) {
        return res.status(401).json({
          message: 'API key no configurada para el sistema',
        });
      }

      const apiKeyValida = await comparePassword(apiKey, registro.api_key);
      if (!apiKeyValida) {
        return res.status(401).json({
          message: 'API key invalida',
        });
      }

      req.sistema = {
        id: registro.id,
        nombre: registro.sistema,
      };

      return next();
    } catch (error) {
      console.error('Error al validar API key del sistema:', error);
      return res.status(500).json({
        message: 'Error interno al validar API key',
      });
    }
  };
};
