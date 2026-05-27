import express from 'express';
import {
  actualizarCursoNeolms,
  modificarCursoNeolms,
  obtenerCategoriasCursos,
  obtenerCursos,
  sincronizarCursosNeolms,
} from '../controllers/cursos.controller.js';
import {
  obtenerActividadesCurso,
  obtenerDocentesCurso,
  obtenerLeccionesCurso,
  sincronizarActividadesCursosNeolms,
  sincronizarDocentesCursosNeolms,
  sincronizarLeccionesCursosNeolms,
} from '../controllers/curso-detalle.controller.js';
import { verificarApiKeyNeolms, verificarApiKeySistema } from '../middleware/api-key.middleware.js';

const router = express.Router();
const verificarApiKeyCifer = verificarApiKeySistema('Cifer');

router.post('/cursos/sincronizar', verificarApiKeyNeolms, sincronizarCursosNeolms);
router.post('/cursos/actualizar', verificarApiKeyNeolms, sincronizarCursosNeolms);
router.post('/cursos/:cursoId/actualizar', verificarApiKeyNeolms, actualizarCursoNeolms);
router.post('/cursos/lecciones/sincronizar', verificarApiKeyNeolms, sincronizarLeccionesCursosNeolms);
router.post('/cursos/actividades/sincronizar', verificarApiKeyNeolms, sincronizarActividadesCursosNeolms);
router.post('/cursos/docentes/sincronizar', verificarApiKeyNeolms, sincronizarDocentesCursosNeolms);
router.patch('/cursos/:cursoId/actualizar', verificarApiKeyCifer, modificarCursoNeolms);
router.patch('/cursos/:cursoId', verificarApiKeyCifer, modificarCursoNeolms);
router.get('/categorias', verificarApiKeyCifer, obtenerCategoriasCursos);
router.get('/cursos/categorias', verificarApiKeyCifer, obtenerCategoriasCursos);
router.get('/cursos/:cursoId/lecciones', verificarApiKeyCifer, obtenerLeccionesCurso);
router.get('/cursos/:cursoId/actividades', verificarApiKeyCifer, obtenerActividadesCurso);
router.get('/cursos/:cursoId/docentes', verificarApiKeyCifer, obtenerDocentesCurso);
router.get('/cursos', verificarApiKeyCifer, obtenerCursos);

export default router;
