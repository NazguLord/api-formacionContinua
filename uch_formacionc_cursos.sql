-- ============================================================
-- Script de base de datos: uch_formacionc
-- Modulo: Cursos sincronizados desde NEOLMS
-- Motor: MySQL 8+
-- ============================================================

USE uch_formacionc;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- Tabla: cursos
-- ============================================================
CREATE TABLE IF NOT EXISTS cursos (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    neolms_id BIGINT UNSIGNED NOT NULL,
    parent_neolms_id BIGINT UNSIGNED NULL,
    access_code VARCHAR(50) NULL,
    nombre VARCHAR(255) NOT NULL,
    descripcion_corta TEXT NULL,
    descripcion_larga TEXT NULL,
    imagen_url TEXT NULL,
    estilo VARCHAR(80) NULL,
    fecha_inicio DATE NULL,
    fecha_fin DATE NULL,
    zona_horaria VARCHAR(80) NULL,
    codigo_curso VARCHAR(100) NULL,
    codigo_seccion VARCHAR(100) NULL,
    creditos DECIMAL(10,2) NULL,
    precio DECIMAL(10,2) NULL,
    organizacion_id BIGINT UNSIGNED NULL,
    organizacion_nombre VARCHAR(180) NULL,
    privado TINYINT(1) NOT NULL DEFAULT 0,
    archivado TINYINT(1) NOT NULL DEFAULT 0,
    archivado_en DATETIME NULL,
    bloqueado TINYINT(1) NOT NULL DEFAULT 0,
    mostrar_catalogo TINYINT(1) NOT NULL DEFAULT 0,
    inscripcion_abierta TINYINT(1) NOT NULL DEFAULT 0,
    inscripcion_publica TINYINT(1) NOT NULL DEFAULT 0,
    cupos_usados INT UNSIGNED NULL,
    max_estudiantes INT UNSIGNED NULL,
    max_cupos INT UNSIGNED NULL,
    sis_id VARCHAR(100) NULL,
    sis_pid VARCHAR(100) NULL,
    metadata_creator_id BIGINT UNSIGNED NULL,
    metadata_created_at DATETIME NULL,
    idioma VARCHAR(60) NULL,
    edad_minima INT UNSIGNED NULL,
    edad_maxima INT UNSIGNED NULL,
    materia VARCHAR(150) NULL,
    raw_data JSON NULL,
    sincronizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_cursos_neolms_id (neolms_id),
    KEY idx_cursos_nombre (nombre),
    KEY idx_cursos_fechas (fecha_inicio, fecha_fin),
    KEY idx_cursos_mostrar_catalogo (mostrar_catalogo),
    KEY idx_cursos_inscripcion_abierta (inscripcion_abierta),
    KEY idx_cursos_archivado (archivado),
    KEY idx_cursos_materia (materia)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Tabla: curso_categorias
-- ============================================================
CREATE TABLE IF NOT EXISTS curso_categorias (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    nombre VARCHAR(150) NOT NULL,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_curso_categorias_nombre (nombre)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Tabla: curso_categoria_relaciones
-- ============================================================
CREATE TABLE IF NOT EXISTS curso_categoria_relaciones (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    curso_id INT UNSIGNED NOT NULL,
    categoria_id INT UNSIGNED NOT NULL,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_curso_categoria (curso_id, categoria_id),
    KEY idx_ccr_curso_id (curso_id),
    KEY idx_ccr_categoria_id (categoria_id),
    CONSTRAINT fk_ccr_curso
        FOREIGN KEY (curso_id)
        REFERENCES cursos (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_ccr_categoria
        FOREIGN KEY (categoria_id)
        REFERENCES curso_categorias (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
