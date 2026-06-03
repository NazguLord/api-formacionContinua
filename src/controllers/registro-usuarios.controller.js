import {
  crearRegistroSesionUsuario,
  crearRegistroUsuarioConRol,
  eliminarRegistroSesionPorToken,
  obtenerAlumnoRegistroPorNumeroCuenta,
  obtenerEmpleadoActivoPorIdentidad,
  obtenerRegistroSesionValidaPorToken,
  obtenerRegistroUsuarioLogin,
  obtenerRegistroUsuarioPorCorreo,
  obtenerRegistroUsuarioPorIdentidad,
} from '../db/registro-usuarios.queries.js';
import jwt from 'jsonwebtoken';
import { comparePassword, hashPassword } from '../utils/hash.js';
import { generarToken } from '../utils/jwt.js';

const TIPOS_USUARIO = new Set(['ALUMNO', 'EMPLEADO', 'NINGUNO']);

const normalizarTexto = (valor) => String(valor ?? '').trim();
const normalizarCorreo = (valor) => normalizarTexto(valor).toLowerCase();
const normalizarTipoUsuario = (valor) => {
  const tipo = normalizarTexto(valor).toUpperCase();

  if (['ESTUDIANTE', 'ALUMNO', 'EXALUMNO', 'EX_ALUMNO', 'EX-ALUMNO'].includes(tipo)) {
    return 'ALUMNO';
  }

  return tipo;
};

const validarCorreo = (correo) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);
};

const obtenerFechaExpiracionSesion = () => {
  const fechaExpiracion = new Date();
  fechaExpiracion.setHours(fechaExpiracion.getHours() + 8);
  return fechaExpiracion;
};

const obtenerOpcionesCookieSesion = (fechaExpiracion) => {
  const cookieSecure = String(process.env.COOKIE_SECURE ?? 'false').toLowerCase() === 'true';
  const cookieSameSite = String(process.env.COOKIE_SAME_SITE ?? 'lax').toLowerCase();

  return {
    httpOnly: true,
    secure: cookieSecure,
    sameSite: cookieSameSite,
    expires: fechaExpiracion,
    path: '/',
  };
};

const obtenerOpcionesLimpiarCookieSesion = () => {
  const { expires, ...opcionesCookie } = obtenerOpcionesCookieSesion(new Date(0));
  return opcionesCookie;
};

const obtenerTokenRegistroRequest = (req) => {
  const tokenCookie = req.cookies?.registro_token;
  const authorization = req.headers?.authorization || '';

  if (tokenCookie) return tokenCookie;
  if (authorization.startsWith('Bearer ')) return authorization.slice(7);

  return null;
};

const formatearUsuarioSesion = (sesion) => {
  const roles = sesion.roles ? sesion.roles.split(',') : [];

  return {
    id: sesion.usuario_id,
    nombreCompleto: sesion.nombre_completo,
    correo: sesion.correo,
    identidad: sesion.identidad,
    tipoUsuario: sesion.tipo_usuario,
    numeroCuenta: sesion.numero_cuenta,
    descuentoAplicable: Boolean(sesion.descuento_aplicable),
    verificado: Boolean(sesion.verificado),
    fuenteVerificacion: sesion.fuente_verificacion,
    registroCueReg: sesion.registro_cue_reg,
    registroCueCod: sesion.registro_cue_cod,
    registroTuvoPlan: Boolean(sesion.registro_tuvo_plan),
    registroPlanActivo: Boolean(sesion.registro_plan_activo),
    workcloudEmpCod: sesion.workcloud_emp_cod,
    workcloudContratoCod: sesion.workcloud_contrato_cod,
    estado: sesion.estado,
    roles,
  };
};

const obtenerRolPorTipoUsuario = (tipoUsuario) => {
  if (tipoUsuario === 'ALUMNO') return 'ALUMNO';
  if (tipoUsuario === 'EMPLEADO') return 'EMPLEADO';
  return 'USUARIO';
};

const validarTipoUsuario = async ({ tipoUsuario, numeroCuenta, identidad }) => {
  if (tipoUsuario === 'ALUMNO') {
    if (!numeroCuenta) {
      return {
        valido: false,
        status: 400,
        message: 'El numeroCuenta es obligatorio para usuarios alumnos',
      };
    }

    const alumno = await obtenerAlumnoRegistroPorNumeroCuenta(numeroCuenta);

    if (!alumno) {
      return {
        valido: false,
        status: 404,
        message: 'No se encontro un alumno o exalumno con plan registrado para los datos indicados',
      };
    }

    const planActivo = Number(alumno.planes_activos || 0) > 0;

    return {
      valido: true,
      verificado: true,
      descuentoAplicable: true,
      fuenteVerificacion: 'uch-registro',
      registroCueReg: alumno.cue_reg,
      registroCueCod: alumno.cue_cod,
      registroTuvoPlan: true,
      registroPlanActivo: planActivo,
      workcloudEmpCod: null,
      workcloudContratoCod: null,
    };
  }

  if (tipoUsuario === 'EMPLEADO') {
    const empleado = await obtenerEmpleadoActivoPorIdentidad(identidad);

    if (!empleado) {
      return {
        valido: false,
        status: 404,
        message: 'No se encontro un empleado actualmente activo con la identidad indicada',
      };
    }

    return {
      valido: true,
      verificado: true,
      descuentoAplicable: true,
      fuenteVerificacion: 'uch-workcloud',
      registroCueReg: null,
      registroCueCod: null,
      registroTuvoPlan: false,
      registroPlanActivo: false,
      workcloudEmpCod: empleado.emp_cod,
      workcloudContratoCod: empleado.contrato_cod,
    };
  }

  return {
    valido: true,
    verificado: false,
    descuentoAplicable: false,
    fuenteVerificacion: null,
    registroCueReg: null,
    registroCueCod: null,
    registroTuvoPlan: false,
    registroPlanActivo: false,
    workcloudEmpCod: null,
    workcloudContratoCod: null,
  };
};

export const crearRegistroUsuario = async (req, res) => {
  try {
    const nombreCompleto = normalizarTexto(req.body?.nombreCompleto || req.body?.nombre);
    const correo = normalizarCorreo(req.body?.correo || req.body?.email);
    const contrasena = String(req.body?.contrasena || req.body?.password || '');
    const identidad = normalizarTexto(req.body?.identidad) || null;
    const tipoUsuario = normalizarTipoUsuario(req.body?.tipoUsuario || req.body?.tipo);
    const numeroCuenta = normalizarTexto(req.body?.numeroCuenta || req.body?.numero_cuenta) || null;

    if (!nombreCompleto || !correo || !contrasena || !tipoUsuario) {
      return res.status(400).json({
        message: 'nombreCompleto, correo, contrasena y tipoUsuario son obligatorios',
      });
    }

    if (!validarCorreo(correo)) {
      return res.status(400).json({
        message: 'El correo no tiene un formato valido',
      });
    }

    if (contrasena.length < 8) {
      return res.status(400).json({
        message: 'La contrasena debe tener al menos 8 caracteres',
      });
    }

    if (!TIPOS_USUARIO.has(tipoUsuario)) {
      return res.status(400).json({
        message: 'tipoUsuario debe ser ALUMNO, EMPLEADO o NINGUNO',
      });
    }

    if (tipoUsuario === 'EMPLEADO' && !identidad) {
      return res.status(400).json({
        message: 'La identidad es obligatoria para usuarios EMPLEADO',
      });
    }

    const usuarioCorreoExistente = await obtenerRegistroUsuarioPorCorreo(correo);
    if (usuarioCorreoExistente) {
      return res.status(409).json({
        message: 'Ya existe un usuario registrado con ese correo',
      });
    }

    if (identidad) {
      const usuarioIdentidadExistente = await obtenerRegistroUsuarioPorIdentidad(identidad);
      if (usuarioIdentidadExistente) {
        return res.status(409).json({
          message: 'Ya existe un usuario registrado con esa identidad',
        });
      }
    }

    const validacion = await validarTipoUsuario({ tipoUsuario, numeroCuenta, identidad });
    if (!validacion.valido) {
      return res.status(validacion.status).json({
        message: validacion.message,
      });
    }

    const passwordHash = await hashPassword(contrasena);
    const rolNombre = obtenerRolPorTipoUsuario(tipoUsuario);
    const usuario = await crearRegistroUsuarioConRol({
      nombreCompleto,
      correo,
      passwordHash,
      identidad,
      tipoUsuario,
      numeroCuenta: tipoUsuario === 'ALUMNO' ? numeroCuenta : null,
      descuentoAplicable: validacion.descuentoAplicable,
      verificado: validacion.verificado,
      fuenteVerificacion: validacion.fuenteVerificacion,
      registroCueReg: validacion.registroCueReg,
      registroCueCod: validacion.registroCueCod,
      registroTuvoPlan: validacion.registroTuvoPlan,
      registroPlanActivo: validacion.registroPlanActivo,
      workcloudEmpCod: validacion.workcloudEmpCod,
      workcloudContratoCod: validacion.workcloudContratoCod,
      rolNombre,
    });

    return res.status(201).json({
      message: 'Usuario registrado correctamente',
      usuario,
    });
  } catch (error) {
    if (error?.code === 'ER_DUP_ENTRY') {
      const duplicateMessage = error.sqlMessage || error.message || '';

      if (duplicateMessage.includes('uq_registro_usuarios_correo')) {
        return res.status(409).json({
          message: 'Ya existe un usuario registrado con ese correo',
        });
      }

      if (duplicateMessage.includes('uq_registro_usuarios_identidad')) {
        return res.status(409).json({
          message: 'Ya existe un usuario registrado con esa identidad',
        });
      }

      return res.status(409).json({
        message: 'Ya existe un usuario registrado con esos datos',
      });
    }

    console.error('Error al registrar usuario:', error);
    return res.status(500).json({
      message: 'Error interno al registrar usuario',
    });
  }
};

export const loginRegistroUsuario = async (req, res) => {
  try {
    const correo = normalizarCorreo(req.body?.correo || req.body?.email);
    const contrasena = String(req.body?.contrasena || req.body?.password || '');

    if (!correo || !contrasena) {
      return res.status(400).json({
        message: 'correo y contrasena son obligatorios',
      });
    }

    if (!validarCorreo(correo)) {
      return res.status(400).json({
        message: 'El correo no tiene un formato valido',
      });
    }

    const usuario = await obtenerRegistroUsuarioLogin(correo);
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

    const passwordValido = await comparePassword(contrasena, usuario.password);
    if (!passwordValido) {
      return res.status(401).json({
        message: 'Credenciales invalidas',
      });
    }

    const roles = usuario.roles ? usuario.roles.split(',') : [];
    const token = generarToken({
      id: usuario.id,
      correo: usuario.correo,
      tipoUsuario: usuario.tipo_usuario,
      roles,
      origen: 'registro_usuarios',
    });

    const fechaExpiracion = obtenerFechaExpiracionSesion();
    await crearRegistroSesionUsuario({
      usuarioId: usuario.id,
      token,
      fechaExpiracion,
    });

    res.cookie('registro_token', token, obtenerOpcionesCookieSesion(fechaExpiracion));

    return res.status(200).json({
      message: 'Login correcto',
      token,
      usuario: {
        id: usuario.id,
        nombreCompleto: usuario.nombre_completo,
        correo: usuario.correo,
        identidad: usuario.identidad,
        tipoUsuario: usuario.tipo_usuario,
        numeroCuenta: usuario.numero_cuenta,
        descuentoAplicable: Boolean(usuario.descuento_aplicable),
        verificado: Boolean(usuario.verificado),
        fuenteVerificacion: usuario.fuente_verificacion,
        registroCueReg: usuario.registro_cue_reg,
        registroCueCod: usuario.registro_cue_cod,
        registroTuvoPlan: Boolean(usuario.registro_tuvo_plan),
        registroPlanActivo: Boolean(usuario.registro_plan_activo),
        workcloudEmpCod: usuario.workcloud_emp_cod,
        workcloudContratoCod: usuario.workcloud_contrato_cod,
        estado: usuario.estado,
        roles,
      },
    });
  } catch (error) {
    console.error('Error al iniciar sesion de registro:', error);
    return res.status(500).json({
      message: 'Error interno al iniciar sesion',
    });
  }
};

export const validarSesionRegistroUsuario = async (req, res) => {
  const token = obtenerTokenRegistroRequest(req);

  if (!token) {
    return res.status(200).json({
      activa: false,
      message: 'Sesion no encontrada',
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded?.origen !== 'registro_usuarios') {
      return res.status(200).json({
        activa: false,
        message: 'Sesion invalida',
      });
    }

    const sesion = await obtenerRegistroSesionValidaPorToken(token);
    if (!sesion || Number(sesion.usuario_id) !== Number(decoded.id)) {
      return res.status(200).json({
        activa: false,
        message: 'Sesion invalida o expirada',
      });
    }

    return res.status(200).json({
      activa: true,
      usuario: formatearUsuarioSesion(sesion),
      sesion: {
        id: sesion.sesion_id,
        fechaCreacion: sesion.fecha_creacion,
        fechaExpiracion: sesion.fecha_expiracion,
      },
    });
  } catch (error) {
    return res.status(200).json({
      activa: false,
      message: error?.name === 'TokenExpiredError' ? 'Sesion expirada' : 'Sesion invalida',
    });
  }
};

export const logoutRegistroUsuario = async (req, res) => {
  try {
    const token = obtenerTokenRegistroRequest(req);

    if (token) {
      await eliminarRegistroSesionPorToken(token);
    }

    res.clearCookie('registro_token', obtenerOpcionesLimpiarCookieSesion());

    return res.status(200).json({
      message: 'Sesion cerrada correctamente',
    });
  } catch (error) {
    console.error('Error al cerrar sesion de registro:', error);
    return res.status(500).json({
      message: 'Error interno al cerrar sesion',
    });
  }
};
