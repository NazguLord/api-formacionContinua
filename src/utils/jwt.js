import jwt from 'jsonwebtoken';

export const generarToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '8h'
  });
};