import express from "express";

import authRoutes from "./auth.routes.js";
import cursosRoutes from "./cursos.routes.js";

const router = express.Router();

router.use("/api", authRoutes);
router.use("/api", cursosRoutes);


export default router;
