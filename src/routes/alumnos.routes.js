import express from 'express';
import {
  obtenerAlumnos,
  obtenerAlumnosPorCurso,
  obtenerCalificacionesAlumno,
  sincronizarAlumnosCursosNeolms,
  sincronizarAlumnosNeolms,
  sincronizarCalificacionesAlumnosNeolms,
} from '../controllers/alumnos.controller.js';
import { verificarApiKeyNeolms, verificarApiKeySistema } from '../middleware/api-key.middleware.js';

const router = express.Router();
const verificarApiKeyCifer = verificarApiKeySistema('Cifer');

router.post('/alumnos/sincronizar', verificarApiKeyNeolms, sincronizarAlumnosNeolms);
router.post('/cursos/alumnos/sincronizar', verificarApiKeyNeolms, sincronizarAlumnosCursosNeolms);
router.post(
  '/alumnos/calificaciones/sincronizar',
  verificarApiKeyNeolms,
  sincronizarCalificacionesAlumnosNeolms
);

router.get('/alumnos', verificarApiKeyCifer, obtenerAlumnos);
router.get('/cursos/:cursoId/alumnos', verificarApiKeyCifer, obtenerAlumnosPorCurso);
router.get('/alumnos/:alumnoId/calificaciones', verificarApiKeyCifer, obtenerCalificacionesAlumno);

export default router;
