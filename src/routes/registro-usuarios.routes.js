import express from 'express';
import {
  crearRegistroUsuario,
  loginRegistroUsuario,
} from '../controllers/registro-usuarios.controller.js';

const router = express.Router();

router.post('/registro/usuarios', crearRegistroUsuario);
router.post('/registro/login', loginRegistroUsuario);

export default router;
