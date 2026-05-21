import pool from '../config/db.js';

export const obtenerUsuarioPorEmail = async (email) => {
  const sql = `
    SELECT id, nombre, email, estado, fecha_creacion, fecha_actualizacion
    FROM usuarios
    WHERE email = ?
    LIMIT 1
  `;

  const [rows] = await pool.execute(sql, [email]);
  return rows[0] || null;
};

export const obtenerUsuarioLogin = async (email) => {
  const sql = `
    SELECT
      u.id,
      u.nombre,
      u.email,
      u.password,
      u.estado,
      GROUP_CONCAT(r.nombre ORDER BY r.nombre SEPARATOR ',') AS roles
    FROM usuarios u
    LEFT JOIN usuario_roles ur ON ur.usuario_id = u.id
    LEFT JOIN roles r ON r.id = ur.rol_id
    WHERE u.email = ?
    GROUP BY u.id, u.nombre, u.email, u.password, u.estado
    LIMIT 1
  `;

  const [rows] = await pool.execute(sql, [email]);
  return rows[0] || null;
};

export const obtenerRolPorNombre = async (nombre) => {
  const sql = `
    SELECT id, nombre, descripcion
    FROM roles
    WHERE nombre = ?
    LIMIT 1
  `;

  const [rows] = await pool.execute(sql, [nombre]);
  return rows[0] || null;
};

export const crearSesionUsuario = async ({ usuarioId, token, fechaExpiracion }) => {
  const sql = `
    INSERT INTO sesiones (usuario_id, token, fecha_expiracion)
    VALUES (?, ?, ?)
  `;

  const [result] = await pool.execute(sql, [usuarioId, token, fechaExpiracion]);
  return result.insertId;
};

export const obtenerSesionValidaPorToken = async (token) => {
  const sql = `
    SELECT
      s.id,
      s.usuario_id,
      s.token,
      s.fecha_creacion,
      s.fecha_expiracion,
      u.estado AS usuario_estado
    FROM sesiones s
    INNER JOIN usuarios u ON u.id = s.usuario_id
    WHERE s.token = ?
      AND u.estado = 'ACTIVO'
      AND (s.fecha_expiracion IS NULL OR s.fecha_expiracion > NOW())
    LIMIT 1
  `;

  const [rows] = await pool.execute(sql, [token]);
  return rows[0] || null;
};

export const crearUsuarioConRol = async ({
  nombre,
  email,
  passwordHash,
  estado = 'ACTIVO',
  rolNombre,
}) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [usuarioResult] = await connection.execute(
      `
        INSERT INTO usuarios (nombre, email, password, estado)
        VALUES (?, ?, ?, ?)
      `,
      [nombre, email, passwordHash, estado]
    );

    const [roles] = await connection.execute(
      `
        SELECT id, nombre
        FROM roles
        WHERE nombre = ?
        LIMIT 1
      `,
      [rolNombre]
    );

    if (!roles[0]) {
      throw new Error('ROL_NO_EXISTE');
    }

    await connection.execute(
      `
        INSERT INTO usuario_roles (usuario_id, rol_id)
        VALUES (?, ?)
      `,
      [usuarioResult.insertId, roles[0].id]
    );

    await connection.commit();

    return {
      id: usuarioResult.insertId,
      nombre,
      email,
      estado,
      rol: roles[0].nombre,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};
