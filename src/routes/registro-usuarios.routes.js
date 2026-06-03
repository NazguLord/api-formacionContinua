import express from 'express';
import {
  crearRegistroUsuario,
  loginRegistroUsuario,
  logoutRegistroUsuario,
  validarSesionRegistroUsuario,
} from '../controllers/registro-usuarios.controller.js';

const router = express.Router();

router.post('/registro/usuarios', crearRegistroUsuario);
router.post('/registro/login', loginRegistroUsuario);
router.post('/registro/logout', logoutRegistroUsuario);
router.get('/registro/sesion', validarSesionRegistroUsuario);

export default router;
