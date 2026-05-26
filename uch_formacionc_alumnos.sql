-- ============================================================
-- Script de base de datos: uch_formacionc
-- Modulo: Alumnos, matriculas y calificaciones desde NEOLMS
-- Motor: MySQL 8+
-- ============================================================

USE uch_formacionc;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- Tabla: alumnos
-- ============================================================
CREATE TABLE IF NOT EXISTS alumnos (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    neolms_id BIGINT UNSIGNED NOT NULL,
    userid VARCHAR(100) NULL,
    nombres VARCHAR(150) NULL,
    apellidos VARCHAR(150) NULL,
    nombre_preferido VARCHAR(150) NULL,
    roles VARCHAR(255) NULL,
    genero VARCHAR(50) NULL,
    fecha_nacimiento DATE NULL,
    email VARCHAR(180) NULL,
    telefono VARCHAR(50) NULL,
    celular VARCHAR(50) NULL,
    pais VARCHAR(100) NULL,
    ciudad VARCHAR(120) NULL,
    estado_region VARCHAR(120) NULL,
    idioma VARCHAR(80) NULL,
    zona_horaria VARCHAR(100) NULL,
    student_id VARCHAR(100) NULL,
    teacher_id VARCHAR(100) NULL,
    acerca_de TEXT NULL,
    organizacion_id BIGINT UNSIGNED NULL,
    organizacion_nombre VARCHAR(180) NULL,
    sis_id VARCHAR(100) NULL,
    sis_pid VARCHAR(100) NULL,
    archivado TINYINT(1) NOT NULL DEFAULT 0,
    archivado_en DATETIME NULL,
    joined_at DATETIME NULL,
    first_login_at DATETIME NULL,
    last_login_at DATETIME NULL,
    raw_data JSON NULL,
    sincronizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_alumnos_neolms_id (neolms_id),
    KEY idx_alumnos_userid (userid),
    KEY idx_alumnos_email (email),
    KEY idx_alumnos_nombre (nombres, apellidos),
    KEY idx_alumnos_archivado (archivado)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Tabla: curso_alumnos
-- ============================================================
CREATE TABLE IF NOT EXISTS curso_alumnos (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    curso_id INT UNSIGNED NOT NULL,
    alumno_id INT UNSIGNED NOT NULL,
    neolms_enrollment_id BIGINT UNSIGNED NOT NULL,
    neolms_class_id BIGINT UNSIGNED NOT NULL,
    neolms_user_id BIGINT UNSIGNED NOT NULL,
    enrolled_at DATETIME NULL,
    enroll_type VARCHAR(80) NULL,
    enrolled_by_id BIGINT UNSIGNED NULL,
    started TINYINT(1) NOT NULL DEFAULT 0,
    started_at DATETIME NULL,
    completed TINYINT(1) NOT NULL DEFAULT 0,
    unenrolled TINYINT(1) NOT NULL DEFAULT 0,
    deactivated TINYINT(1) NOT NULL DEFAULT 0,
    transferred TINYINT(1) NOT NULL DEFAULT 0,
    class_archived TINYINT(1) NOT NULL DEFAULT 0,
    user_archived TINYINT(1) NOT NULL DEFAULT 0,
    percent DECIMAL(8,2) NULL,
    grade VARCHAR(80) NULL,
    override_percent DECIMAL(8,2) NULL,
    override_comment TEXT NULL,
    override_by_id BIGINT UNSIGNED NULL,
    override_at DATETIME NULL,
    time_spent INT UNSIGNED NULL,
    last_visited_at DATETIME NULL,
    order_item_id BIGINT UNSIGNED NULL,
    raw_data JSON NULL,
    sincronizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_curso_alumnos_neolms_enrollment_id (neolms_enrollment_id),
    UNIQUE KEY uq_curso_alumnos_curso_alumno (curso_id, alumno_id),
    KEY idx_curso_alumnos_curso_id (curso_id),
    KEY idx_curso_alumnos_alumno_id (alumno_id),
    KEY idx_curso_alumnos_neolms_class_id (neolms_class_id),
    KEY idx_curso_alumnos_neolms_user_id (neolms_user_id),
    KEY idx_curso_alumnos_completed (completed),
    CONSTRAINT fk_curso_alumnos_curso
        FOREIGN KEY (curso_id)
        REFERENCES cursos (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_curso_alumnos_alumno
        FOREIGN KEY (alumno_id)
        REFERENCES alumnos (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Tabla: alumno_calificaciones
-- ============================================================
CREATE TABLE IF NOT EXISTS alumno_calificaciones (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    alumno_id INT UNSIGNED NOT NULL,
    curso_id INT UNSIGNED NULL,
    neolms_grade_id BIGINT UNSIGNED NOT NULL,
    neolms_user_id BIGINT UNSIGNED NOT NULL,
    neolms_class_id BIGINT UNSIGNED NULL,
    grader_id BIGINT UNSIGNED NULL,
    assignment_id BIGINT UNSIGNED NULL,
    lesson_id BIGINT UNSIGNED NULL,
    lesson_name VARCHAR(255) NULL,
    started TINYINT(1) NOT NULL DEFAULT 0,
    started_at DATETIME NULL,
    finished TINYINT(1) NOT NULL DEFAULT 0,
    finished_at DATETIME NULL,
    graded TINYINT(1) NOT NULL DEFAULT 0,
    fully_graded TINYINT(1) NOT NULL DEFAULT 0,
    graded_at DATETIME NULL,
    score DECIMAL(10,2) NULL,
    percent DECIMAL(8,2) NULL,
    grade VARCHAR(80) NULL,
    points DECIMAL(10,2) NULL,
    min_points DECIMAL(10,2) NULL,
    missing TINYINT(1) NOT NULL DEFAULT 0,
    absent TINYINT(1) NOT NULL DEFAULT 0,
    excused TINYINT(1) NOT NULL DEFAULT 0,
    incomplete TINYINT(1) NOT NULL DEFAULT 0,
    excused_comment TEXT NULL,
    teacher_comment TEXT NULL,
    raw_data JSON NULL,
    sincronizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_alumno_calificaciones_neolms_grade_id (neolms_grade_id),
    KEY idx_alumno_calificaciones_alumno_id (alumno_id),
    KEY idx_alumno_calificaciones_curso_id (curso_id),
    KEY idx_alumno_calificaciones_neolms_user_id (neolms_user_id),
    KEY idx_alumno_calificaciones_neolms_class_id (neolms_class_id),
    KEY idx_alumno_calificaciones_assignment_id (assignment_id),
    CONSTRAINT fk_alumno_calificaciones_alumno
        FOREIGN KEY (alumno_id)
        REFERENCES alumnos (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_alumno_calificaciones_curso
        FOREIGN KEY (curso_id)
        REFERENCES cursos (id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
