import express from 'express';
import {
  actualizarCursoNeolms,
  modificarCursoNeolms,
  obtenerCategoriasCursos,
  obtenerCursos,
  sincronizarCursosNeolms,
} from '../controllers/cursos.controller.js';
import { verificarApiKeyNeolms, verificarApiKeySistema } from '../middleware/api-key.middleware.js';

const router = express.Router();
const verificarApiKeyCifer = verificarApiKeySistema('Cifer');

router.post('/cursos/sincronizar', verificarApiKeyNeolms, sincronizarCursosNeolms);
router.post('/cursos/actualizar', verificarApiKeyNeolms, sincronizarCursosNeolms);
router.post('/cursos/:cursoId/actualizar', verificarApiKeyNeolms, actualizarCursoNeolms);
router.patch('/cursos/:cursoId/actualizar', verificarApiKeyCifer, modificarCursoNeolms);
router.patch('/cursos/:cursoId', verificarApiKeyCifer, modificarCursoNeolms);
router.get('/categorias', verificarApiKeyCifer, obtenerCategoriasCursos);
router.get('/cursos/categorias', verificarApiKeyCifer, obtenerCategoriasCursos);
router.get('/cursos', verificarApiKeyCifer, obtenerCursos);

export default router;
