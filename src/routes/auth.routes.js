import express from 'express';
import { crearUsuario, loginUsuario } from '../controllers/auth.controller.js';


const router = express.Router();


router.post('/crearUsuario', crearUsuario);
router.post('/loginUsuario', loginUsuario);

export default router;
