-- ============================================================
-- Script de base de datos: uch_formacionc
-- Modulo: Detalle interno de cursos desde NEOLMS
-- Motor: MySQL 8+
-- ============================================================

USE uch_formacionc;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- Campos adicionales del encabezado del curso
-- Ejecutar una sola vez. Si algun campo ya existe, omitir esa linea.
-- ============================================================
ALTER TABLE cursos ADD COLUMN archiver_id BIGINT UNSIGNED NULL AFTER archivado_en;
ALTER TABLE cursos ADD COLUMN current_lesson_id BIGINT UNSIGNED NULL AFTER metadata_created_at;
ALTER TABLE cursos ADD COLUMN tax_exempt TINYINT(1) NOT NULL DEFAULT 0 AFTER precio;
ALTER TABLE cursos ADD COLUMN weight_using_categories TINYINT(1) NOT NULL DEFAULT 0 AFTER tax_exempt;
ALTER TABLE cursos ADD COLUMN weights VARCHAR(50) NULL AFTER weight_using_categories;
ALTER TABLE cursos ADD COLUMN disable_completion TINYINT(1) NOT NULL DEFAULT 0 AFTER weights;
ALTER TABLE cursos ADD COLUMN auto_complete_on_visit TINYINT(1) NOT NULL DEFAULT 0 AFTER disable_completion;
ALTER TABLE cursos ADD COLUMN allow_unenrollment TINYINT(1) NOT NULL DEFAULT 0 AFTER inscripcion_publica;
ALTER TABLE cursos ADD COLUMN delete_history_on_unenroll TINYINT(1) NOT NULL DEFAULT 0 AFTER allow_unenrollment;
ALTER TABLE cursos ADD COLUMN allow_reenrollment TINYINT(1) NOT NULL DEFAULT 0 AFTER delete_history_on_unenroll;
ALTER TABLE cursos ADD COLUMN must_repurchase_to_reenroll TINYINT(1) NOT NULL DEFAULT 0 AFTER allow_reenrollment;
ALTER TABLE cursos ADD COLUMN waitlist_after_limit TINYINT(1) NOT NULL DEFAULT 0 AFTER must_repurchase_to_reenroll;
ALTER TABLE cursos ADD COLUMN auto_enroll_from_waitlist TINYINT(1) NOT NULL DEFAULT 0 AFTER waitlist_after_limit;
ALTER TABLE cursos ADD COLUMN es_path TINYINT(1) NOT NULL DEFAULT 0 AFTER sis_pid;

-- ============================================================
-- Tabla: curso_tags
-- ============================================================
CREATE TABLE IF NOT EXISTS curso_tags (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    curso_id INT UNSIGNED NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_curso_tags_curso_nombre (curso_id, nombre),
    KEY idx_curso_tags_curso_id (curso_id),
    KEY idx_curso_tags_nombre (nombre),
    CONSTRAINT fk_curso_tags_curso
        FOREIGN KEY (curso_id)
        REFERENCES cursos (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Tabla: curso_custom_fields
-- ============================================================
CREATE TABLE IF NOT EXISTS curso_custom_fields (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    curso_id INT UNSIGNED NOT NULL,
    campo VARCHAR(150) NOT NULL,
    valor TEXT NULL,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_curso_custom_fields_curso_campo (curso_id, campo),
    KEY idx_curso_custom_fields_curso_id (curso_id),
    CONSTRAINT fk_curso_custom_fields_curso
        FOREIGN KEY (curso_id)
        REFERENCES cursos (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Tabla: curso_class_times
-- ============================================================
CREATE TABLE IF NOT EXISTS curso_class_times (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    curso_id INT UNSIGNED NOT NULL,
    posicion INT UNSIGNED NOT NULL,
    descripcion VARCHAR(255) NULL,
    raw_data JSON NULL,
    sincronizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_curso_class_times_curso_posicion (curso_id, posicion),
    KEY idx_curso_class_times_curso_id (curso_id),
    CONSTRAINT fk_curso_class_times_curso
        FOREIGN KEY (curso_id)
        REFERENCES cursos (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Tabla: curso_lecciones
-- ============================================================
CREATE TABLE IF NOT EXISTS curso_lecciones (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    curso_id INT UNSIGNED NOT NULL,
    neolms_lesson_id BIGINT UNSIGNED NOT NULL,
    neolms_class_id BIGINT UNSIGNED NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT NULL,
    imagen_url TEXT NULL,
    notas TEXT NULL,
    posicion INT UNSIGNED NULL,
    start_at DATETIME NULL,
    updated_at DATETIME NULL,
    released_at DATETIME NULL,
    tile_color VARCHAR(50) NULL,
    personalized TINYINT(1) NOT NULL DEFAULT 0,
    optional_for_completion TINYINT(1) NOT NULL DEFAULT 0,
    begin_at DATETIME NULL,
    end_at DATETIME NULL,
    all_day TINYINT(1) NOT NULL DEFAULT 0,
    location VARCHAR(255) NULL,
    raw_data JSON NULL,
    sincronizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_curso_lecciones_neolms_lesson_id (neolms_lesson_id),
    KEY idx_curso_lecciones_curso_id (curso_id),
    KEY idx_curso_lecciones_neolms_class_id (neolms_class_id),
    KEY idx_curso_lecciones_posicion (curso_id, posicion),
    CONSTRAINT fk_curso_lecciones_curso
        FOREIGN KEY (curso_id)
        REFERENCES cursos (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Tabla: curso_leccion_tags
-- ============================================================
CREATE TABLE IF NOT EXISTS curso_leccion_tags (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    leccion_id INT UNSIGNED NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_curso_leccion_tags_leccion_nombre (leccion_id, nombre),
    KEY idx_curso_leccion_tags_leccion_id (leccion_id),
    KEY idx_curso_leccion_tags_nombre (nombre),
    CONSTRAINT fk_curso_leccion_tags_leccion
        FOREIGN KEY (leccion_id)
        REFERENCES curso_lecciones (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Tabla: curso_actividades
-- ============================================================
CREATE TABLE IF NOT EXISTS curso_actividades (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    curso_id INT UNSIGNED NOT NULL,
    leccion_id INT UNSIGNED NULL,
    neolms_assignment_id BIGINT UNSIGNED NOT NULL,
    neolms_class_id BIGINT UNSIGNED NOT NULL,
    neolms_lesson_id BIGINT UNSIGNED NULL,
    lesson_name VARCHAR(255) NULL,
    creator_id BIGINT UNSIGNED NULL,
    tipo VARCHAR(100) NULL,
    nombre VARCHAR(255) NOT NULL,
    puntos DECIMAL(10,2) NULL,
    begin_at DATETIME NULL,
    end_at DATETIME NULL,
    given TINYINT(1) NOT NULL DEFAULT 0,
    given_at DATETIME NULL,
    grading VARCHAR(80) NULL,
    use_results VARCHAR(80) NULL,
    categoria VARCHAR(150) NULL,
    raw_data JSON NULL,
    sincronizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_curso_actividades_neolms_assignment_id (neolms_assignment_id),
    KEY idx_curso_actividades_curso_id (curso_id),
    KEY idx_curso_actividades_leccion_id (leccion_id),
    KEY idx_curso_actividades_neolms_class_id (neolms_class_id),
    KEY idx_curso_actividades_neolms_lesson_id (neolms_lesson_id),
    KEY idx_curso_actividades_categoria (categoria),
    CONSTRAINT fk_curso_actividades_curso
        FOREIGN KEY (curso_id)
        REFERENCES cursos (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_curso_actividades_leccion
        FOREIGN KEY (leccion_id)
        REFERENCES curso_lecciones (id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Tabla: curso_docentes
-- ============================================================
CREATE TABLE IF NOT EXISTS curso_docentes (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    curso_id INT UNSIGNED NOT NULL,
    neolms_teacher_relation_id BIGINT UNSIGNED NOT NULL,
    neolms_user_id BIGINT UNSIGNED NOT NULL,
    neolms_class_id BIGINT UNSIGNED NOT NULL,
    userid VARCHAR(100) NULL,
    nombres VARCHAR(150) NULL,
    apellidos VARCHAR(150) NULL,
    email VARCHAR(180) NULL,
    coteacher TINYINT(1) NOT NULL DEFAULT 0,
    last_visited_at DATETIME NULL,
    raw_data JSON NULL,
    sincronizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_curso_docentes_neolms_relation_id (neolms_teacher_relation_id),
    UNIQUE KEY uq_curso_docentes_curso_usuario (curso_id, neolms_user_id),
    KEY idx_curso_docentes_curso_id (curso_id),
    KEY idx_curso_docentes_neolms_user_id (neolms_user_id),
    KEY idx_curso_docentes_neolms_class_id (neolms_class_id),
    KEY idx_curso_docentes_nombre (nombres, apellidos),
    KEY idx_curso_docentes_email (email),
    CONSTRAINT fk_curso_docentes_curso
        FOREIGN KEY (curso_id)
        REFERENCES cursos (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
