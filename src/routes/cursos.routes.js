import express from 'express';
import { obtenerCategoriasCursos, obtenerCursos } from '../controllers/cursos.controller.js';

const router = express.Router();

router.get('/cursos/categorias', obtenerCategoriasCursos);
router.get('/cursos', obtenerCursos);

export default router;
