import pool from '../config/db.js';

export const obtenerApiKeySistema = async (sistema) => {
  const sql = `
    SELECT id, sistema, api_key, activa
    FROM \`uch-registro\`.apiKeySistemas
    WHERE sistema = ?
      AND activa = 1
    LIMIT 1
  `;

  const [rows] = await pool.execute(sql, [sistema]);
  return rows[0] || null;
};
