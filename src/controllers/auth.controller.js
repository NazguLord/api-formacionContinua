import {
  crearSesionUsuario,
  crearUsuarioConRol,
  obtenerRolPorNombre,
  obtenerUsuarioLogin,
  obtenerUsuarioPorEmail,
} from '../db/auth.queries.js';
import { comparePassword, hashPassword } from '../utils/hash.js';
import { generarToken } from '../utils/jwt.js';

const normalizarEmail = (email) => String(email ?? '').trim().toLowerCase();

const validarEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const obtenerFechaExpiracionSesion = () => {
  const fechaExpiracion = new Date();
  fechaExpiracion.setHours(fechaExpiracion.getHours() + 8);
  return fechaExpiracion;
};

export const crearUsuario = async (req, res) => {
  try {
    const nombre = String(req.body?.nombre ?? '').trim();
    const email = normalizarEmail(req.body?.email);
    const password = String(req.body?.password ?? '');
    const estado = String(req.body?.estado ?? 'ACTIVO').trim().toUpperCase();
    const rolNombre = String(req.body?.rol ?? '').trim().toUpperCase();

    if (!nombre || !email || !password || !rolNombre) {
      return res.status(400).json({
        message: 'Nombre, email, password y rol son obligatorios',
      });
    }

    if (!validarEmail(email)) {
      return res.status(400).json({
        message: 'El email no tiene un formato valido',
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: 'El password debe tener al menos 8 caracteres',
      });
    }

    if (!['ACTIVO', 'INACTIVO'].includes(estado)) {
      return res.status(400).json({
        message: 'El estado debe ser ACTIVO o INACTIVO',
      });
    }

    const rol = await obtenerRolPorNombre(rolNombre);
    if (!rol) {
      return res.status(400).json({
        message: 'El rol indicado no existe',
      });
    }

    const usuarioExistente = await obtenerUsuarioPorEmail(email);
    if (usuarioExistente) {
      return res.status(409).json({
        message: 'Ya existe un usuario con ese email',
      });
    }

    const passwordHash = await hashPassword(password);
    const usuario = await crearUsuarioConRol({
      nombre,
      email,
      passwordHash,
      estado,
      rolNombre,
    });

    return res.status(201).json({
      message: 'Usuario creado correctamente',
      usuario,
    });
  } catch (error) {
    if (error?.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        message: 'Ya existe un usuario con ese email',
      });
    }

    console.error('Error al crear usuario:', error);
    return res.status(500).json({
      message: 'Error interno al crear usuario',
    });
  }
};

export const loginUsuario = async (req, res) => {
  try {
    const email = normalizarEmail(req.body?.email);
    const password = String(req.body?.password ?? '');

    if (!email || !password) {
      return res.status(400).json({
        message: 'Email y password son obligatorios',
      });
    }

    if (!validarEmail(email)) {
      return res.status(400).json({
        message: 'El email no tiene un formato valido',
      });
    }

    const usuario = await obtenerUsuarioLogin(email);
    if (!usuario) {
      return res.status(401).json({
        message: 'Credenciales invalidas',
      });
    }

    if (usuario.estado !== 'ACTIVO') {
      return res.status(403).json({
        message: 'El usuario se encuentra inactivo',
      });
    }

    const passwordValido = await comparePassword(password, usuario.password);
    if (!passwordValido) {
      return res.status(401).json({
        message: 'Credenciales invalidas',
      });
    }

    const roles = usuario.roles ? usuario.roles.split(',') : [];
    const token = generarToken({
      id: usuario.id,
      email: usuario.email,
      roles,
    });

    const fechaExpiracion = obtenerFechaExpiracionSesion();
    await crearSesionUsuario({
      usuarioId: usuario.id,
      token,
      fechaExpiracion,
    });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: fechaExpiracion,
    });

    return res.status(200).json({
      message: 'Login correcto',
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        estado: usuario.estado,
        roles,
      },
    });
  } catch (error) {
    console.error('Error al iniciar sesion:', error);
    return res.status(500).json({
      message: 'Error interno al iniciar sesion',
    });
  }
};
