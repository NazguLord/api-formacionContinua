import pool from '../config/db.js';

export const obtenerRegistroUsuarioPorCorreo = async (correo) => {
  const [rows] = await pool.execute(
    `
      SELECT id, correo
      FROM registro_usuarios
      WHERE correo = ?
      LIMIT 1
    `,
    [correo]
  );

  return rows[0] || null;
};

export const obtenerRegistroUsuarioPorIdentidad = async (identidad) => {
  const [rows] = await pool.execute(
    `
      SELECT id, identidad
      FROM registro_usuarios
      WHERE identidad = ?
      LIMIT 1
    `,
    [identidad]
  );

  return rows[0] || null;
};

export const obtenerRegistroUsuarioLogin = async (correo) => {
  const [rows] = await pool.execute(
    `
      SELECT
        u.id,
        u.nombre_completo,
        u.correo,
        u.password,
        u.identidad,
        u.tipo_usuario,
        u.numero_cuenta,
        u.descuento_aplicable,
        u.verificado,
        u.fuente_verificacion,
        u.registro_cue_reg,
        u.registro_cue_cod,
        u.registro_tuvo_plan,
        u.registro_plan_activo,
        u.workcloud_emp_cod,
        u.workcloud_contrato_cod,
        u.estado,
        GROUP_CONCAT(r.nombre ORDER BY r.nombre SEPARATOR ',') AS roles
      FROM registro_usuarios u
      LEFT JOIN registro_usuario_roles ur ON ur.usuario_id = u.id
      LEFT JOIN registro_roles r ON r.id = ur.rol_id
      WHERE u.correo = ?
      GROUP BY
        u.id,
        u.nombre_completo,
        u.correo,
        u.password,
        u.identidad,
        u.tipo_usuario,
        u.numero_cuenta,
        u.descuento_aplicable,
        u.verificado,
        u.fuente_verificacion,
        u.registro_cue_reg,
        u.registro_cue_cod,
        u.registro_tuvo_plan,
        u.registro_plan_activo,
        u.workcloud_emp_cod,
        u.workcloud_contrato_cod,
        u.estado
      LIMIT 1
    `,
    [correo]
  );

  return rows[0] || null;
};

export const crearRegistroSesionUsuario = async ({ usuarioId, token, fechaExpiracion }) => {
  const [result] = await pool.execute(
    `
      INSERT INTO registro_sesiones (usuario_id, token, fecha_expiracion)
      VALUES (?, ?, ?)
    `,
    [usuarioId, token, fechaExpiracion]
  );

  return result.insertId;
};

export const obtenerRegistroSesionValidaPorToken = async (token) => {
  const [rows] = await pool.execute(
    `
      SELECT
        s.id AS sesion_id,
        s.usuario_id,
        s.fecha_creacion,
        s.fecha_expiracion,
        u.nombre_completo,
        u.correo,
        u.identidad,
        u.tipo_usuario,
        u.numero_cuenta,
        u.descuento_aplicable,
        u.verificado,
        u.fuente_verificacion,
        u.registro_cue_reg,
        u.registro_cue_cod,
        u.registro_tuvo_plan,
        u.registro_plan_activo,
        u.workcloud_emp_cod,
        u.workcloud_contrato_cod,
        u.estado,
        GROUP_CONCAT(r.nombre ORDER BY r.nombre SEPARATOR ',') AS roles
      FROM registro_sesiones s
      INNER JOIN registro_usuarios u ON u.id = s.usuario_id
      LEFT JOIN registro_usuario_roles ur ON ur.usuario_id = u.id
      LEFT JOIN registro_roles r ON r.id = ur.rol_id
      WHERE s.token = ?
        AND u.estado = 'ACTIVO'
        AND (s.fecha_expiracion IS NULL OR s.fecha_expiracion > NOW())
      GROUP BY
        s.id,
        s.usuario_id,
        s.fecha_creacion,
        s.fecha_expiracion,
        u.nombre_completo,
        u.correo,
        u.identidad,
        u.tipo_usuario,
        u.numero_cuenta,
        u.descuento_aplicable,
        u.verificado,
        u.fuente_verificacion,
        u.registro_cue_reg,
        u.registro_cue_cod,
        u.registro_tuvo_plan,
        u.registro_plan_activo,
        u.workcloud_emp_cod,
        u.workcloud_contrato_cod,
        u.estado
      LIMIT 1
    `,
    [token]
  );

  return rows[0] || null;
};

export const eliminarRegistroSesionPorToken = async (token) => {
  const [result] = await pool.execute(
    `
      DELETE FROM registro_sesiones
      WHERE token = ?
    `,
    [token]
  );

  return result.affectedRows;
};

export const obtenerAlumnoRegistroPorNumeroCuenta = async (numeroCuenta) => {
  const [rows] = await pool.execute(
    `
      SELECT
        c.CueReg AS cue_reg,
        c.CueCod AS cue_cod,
        c.CueID AS identidad,
        c.CueNom AS nombre,
        c.CueMailIns AS correo_institucional,
        c.CueMailPer AS correo_personal,
        c.CueEst AS estado_cuenta,
        COUNT(DISTINCT pc.PlaCod) AS total_planes,
        SUM(CASE WHEN pc.CupEst = 'ACT' THEN 1 ELSE 0 END) AS planes_activos
      FROM \`uch-registro\`.cuentas c
      LEFT JOIN \`uch-registro\`.planescue pc ON pc.CueReg = c.CueReg
      WHERE c.CueCod = ?
         OR c.CueReg = ?
      GROUP BY c.CueReg, c.CueCod, c.CueID, c.CueNom, c.CueMailIns, c.CueMailPer, c.CueEst
      HAVING total_planes > 0
      LIMIT 1
    `,
    [numeroCuenta, numeroCuenta]
  );

  return rows[0] || null;
};

export const obtenerEmpleadoActivoPorIdentidad = async (identidad) => {
  const [rows] = await pool.execute(
    `
      SELECT
        e.EmpCod AS emp_cod,
        e.EmpID AS identidad,
        CONCAT_WS(' ', e.EmpNom1, e.EmpNom2, e.EmpApe1, e.EmpApe2) AS nombre,
        e.EmpMail AS correo,
        e.EmpEst AS estado_empleado,
        c.CtrCod AS contrato_cod,
        c.CtrEst AS estado_contrato,
        c.CtrIni AS contrato_inicio,
        c.CtrFin AS contrato_fin
      FROM \`uch-workcloud\`.empleados e
      INNER JOIN \`uch-workcloud\`.contratos c ON c.EmpCod = e.EmpCod
      WHERE e.EmpID = ?
        AND e.EmpEst = 'ACT'
        AND c.CtrEst = 'ACT'
      ORDER BY c.CtrIni DESC, c.CtrCod DESC
      LIMIT 1
    `,
    [identidad]
  );

  return rows[0] || null;
};

export const crearRegistroUsuarioConRol = async ({
  nombreCompleto,
  correo,
  passwordHash,
  identidad,
  tipoUsuario,
  numeroCuenta,
  descuentoAplicable,
  verificado,
  fuenteVerificacion,
  registroCueReg,
  registroCueCod,
  registroTuvoPlan,
  registroPlanActivo,
  workcloudEmpCod,
  workcloudContratoCod,
  rolNombre,
}) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [usuarioResult] = await connection.execute(
      `
        INSERT INTO registro_usuarios (
          nombre_completo,
          correo,
          password,
          identidad,
          tipo_usuario,
          numero_cuenta,
          descuento_aplicable,
          verificado,
          fuente_verificacion,
          registro_cue_reg,
          registro_cue_cod,
          registro_tuvo_plan,
          registro_plan_activo,
          workcloud_emp_cod,
          workcloud_contrato_cod
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        nombreCompleto,
        correo,
        passwordHash,
        identidad,
        tipoUsuario,
        numeroCuenta,
        descuentoAplicable ? 1 : 0,
        verificado ? 1 : 0,
        fuenteVerificacion,
        registroCueReg,
        registroCueCod,
        registroTuvoPlan ? 1 : 0,
        registroPlanActivo ? 1 : 0,
        workcloudEmpCod,
        workcloudContratoCod,
      ]
    );

    const [roles] = await connection.execute(
      `
        SELECT id, nombre
        FROM registro_roles
        WHERE nombre = ?
        LIMIT 1
      `,
      [rolNombre]
    );

    if (!roles[0]) {
      throw new Error(`El rol ${rolNombre} no existe`);
    }

    await connection.execute(
      `
        INSERT INTO registro_usuario_roles (usuario_id, rol_id)
        VALUES (?, ?)
      `,
      [usuarioResult.insertId, roles[0].id]
    );

    await connection.commit();

    return {
      id: usuarioResult.insertId,
      nombreCompleto,
      correo,
      identidad,
      tipoUsuario,
      numeroCuenta,
      descuentoAplicable: Boolean(descuentoAplicable),
      verificado: Boolean(verificado),
      fuenteVerificacion,
      registroCueReg,
      registroCueCod,
      registroTuvoPlan: Boolean(registroTuvoPlan),
      registroPlanActivo: Boolean(registroPlanActivo),
      workcloudEmpCod,
      workcloudContratoCod,
      rol: roles[0].nombre,
      estado: 'ACTIVO',
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};
