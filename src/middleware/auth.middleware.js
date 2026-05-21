import jwt from 'jsonwebtoken';
import { obtenerSesionValidaPorToken } from '../db/auth.queries.js';

const obtenerTokenRequest = (req) => {
  const tokenCookie = req.cookies?.token;
  const authorization = req.headers?.authorization || '';

  if (tokenCookie) return tokenCookie;
  if (authorization.startsWith('Bearer ')) return authorization.slice(7);

  return null;
};

export const verificarToken = async (req, res, next) => {
  const token = obtenerTokenRequest(req);

  if (!token) {
    return res.status(401).json({ message: 'Token no proporcionado' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const sesion = await obtenerSesionValidaPorToken(token);

    if (!sesion || sesion.usuario_id !== decoded.id) {
      return res.status(401).json({ message: 'Sesión inválida o expirada' });
    }

    req.user = decoded;
    req.session = {
      id: sesion.id,
      usuarioId: sesion.usuario_id,
      fechaCreacion: sesion.fecha_creacion,
      fechaExpiracion: sesion.fecha_expiracion,
    };

    next();
  } catch (error) {
    if (error?.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expirado' });
    }

    return res.status(401).json({ message: 'Token inválido' });
  }
};
