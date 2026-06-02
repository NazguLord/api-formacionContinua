import express from "express";

import authRoutes from "./auth.routes.js";
import cursosRoutes from "./cursos.routes.js";
import alumnosRoutes from "./alumnos.routes.js";
import registroUsuariosRoutes from "./registro-usuarios.routes.js";

const router = express.Router();

router.use("/api", authRoutes);
router.use("/api", registroUsuariosRoutes);
router.use("/api", cursosRoutes);
router.use("/api", alumnosRoutes);


export default router;
