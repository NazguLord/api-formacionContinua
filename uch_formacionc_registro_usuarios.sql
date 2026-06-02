-- ============================================================
-- Script de base de datos: uch_formacionc
-- Modulo: Registro nuevo de usuarios
-- Motor: MySQL 8+
-- ============================================================

USE uch_formacionc;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- Tabla: registro_roles
-- ============================================================
CREATE TABLE IF NOT EXISTS registro_roles (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    nombre VARCHAR(50) NOT NULL,
    descripcion VARCHAR(150) NULL,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_registro_roles_nombre (nombre)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Tabla: registro_usuarios
-- ============================================================
CREATE TABLE IF NOT EXISTS registro_usuarios (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    nombre_completo VARCHAR(180) NOT NULL,
    correo VARCHAR(180) NOT NULL,
    password VARCHAR(255) NOT NULL COMMENT 'Hash bcrypt de la contrasena',
    identidad VARCHAR(50) NULL,
    tipo_usuario ENUM('ALUMNO', 'EMPLEADO', 'NINGUNO') NOT NULL DEFAULT 'NINGUNO',
    numero_cuenta VARCHAR(50) NULL,
    descuento_aplicable TINYINT(1) NOT NULL DEFAULT 0,
    verificado TINYINT(1) NOT NULL DEFAULT 0,
    fuente_verificacion VARCHAR(80) NULL,
    registro_cue_reg VARCHAR(40) NULL,
    registro_cue_cod VARCHAR(40) NULL,
    registro_tuvo_plan TINYINT(1) NOT NULL DEFAULT 0,
    registro_plan_activo TINYINT(1) NOT NULL DEFAULT 0,
    workcloud_emp_cod VARCHAR(10) NULL,
    workcloud_contrato_cod VARCHAR(40) NULL,
    estado ENUM('ACTIVO', 'INACTIVO') NOT NULL DEFAULT 'ACTIVO',
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_registro_usuarios_correo (correo),
    UNIQUE KEY uq_registro_usuarios_identidad (identidad),
    KEY idx_registro_usuarios_tipo_usuario (tipo_usuario),
    KEY idx_registro_usuarios_numero_cuenta (numero_cuenta),
    KEY idx_registro_usuarios_registro_cue_reg (registro_cue_reg),
    KEY idx_registro_usuarios_workcloud_emp_cod (workcloud_emp_cod),
    KEY idx_registro_usuarios_descuento (descuento_aplicable),
    KEY idx_registro_usuarios_estado (estado)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Tabla: registro_usuario_roles
-- ============================================================
CREATE TABLE IF NOT EXISTS registro_usuario_roles (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    usuario_id INT UNSIGNED NOT NULL,
    rol_id INT UNSIGNED NOT NULL,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_registro_usuario_roles_usuario_rol (usuario_id, rol_id),
    KEY idx_registro_usuario_roles_usuario_id (usuario_id),
    KEY idx_registro_usuario_roles_rol_id (rol_id),
    CONSTRAINT fk_registro_usuario_roles_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES registro_usuarios (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_registro_usuario_roles_rol
        FOREIGN KEY (rol_id)
        REFERENCES registro_roles (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Tabla: registro_sesiones
-- ============================================================
CREATE TABLE IF NOT EXISTS registro_sesiones (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    usuario_id INT UNSIGNED NOT NULL,
    token VARCHAR(700) NOT NULL,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_expiracion DATETIME NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_registro_sesiones_token (token),
    KEY idx_registro_sesiones_usuario_id (usuario_id),
    KEY idx_registro_sesiones_fecha_expiracion (fecha_expiracion),
    CONSTRAINT fk_registro_sesiones_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES registro_usuarios (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- Datos iniciales
-- ============================================================
INSERT INTO registro_roles (nombre, descripcion)
VALUES
    ('ALUMNO', 'Usuario alumno'),
    ('EMPLEADO', 'Usuario empleado'),
    ('USUARIO', 'Usuario general sin validacion de alumno o empleado')
ON DUPLICATE KEY UPDATE
    descripcion = VALUES(descripcion);
