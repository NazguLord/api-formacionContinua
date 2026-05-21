import express from 'express';
import {
  obtenerCategoriasCursos,
  obtenerCursos,
  sincronizarCursosNeolms,
} from '../controllers/cursos.controller.js';
import { verificarApiKeyNeolms, verificarApiKeySistema } from '../middleware/api-key.middleware.js';

const router = express.Router();
const verificarApiKeyCifer = verificarApiKeySistema('Cifer');

router.post('/cursos/sincronizar', verificarApiKeyNeolms, sincronizarCursosNeolms);
router.get('/cursos/categorias', verificarApiKeyCifer, obtenerCategoriasCursos);
router.get('/cursos', verificarApiKeyCifer, obtenerCursos);

export default router;
