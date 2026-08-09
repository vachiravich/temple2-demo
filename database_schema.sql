CREATE DATABASE IF NOT EXISTS `temple2` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `temple2`;

DROP TABLE IF EXISTS `monks`;
CREATE TABLE `monks` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `image` VARCHAR(255) DEFAULT '',
  `title` VARCHAR(255) DEFAULT '',
  `first_name` VARCHAR(255) DEFAULT '',
  `last_name` VARCHAR(255) DEFAULT '',
  `chaya` VARCHAR(255) DEFAULT '',
  `nickname` VARCHAR(100) DEFAULT '',
  `id_card` VARCHAR(50) DEFAULT '',
  `birth_date` VARCHAR(100) DEFAULT '',
  `phone` VARCHAR(100) DEFAULT '',
  `line_id` VARCHAR(100) DEFAULT '',
  `ordination_date` VARCHAR(100) DEFAULT '',
  `upajjhaya` VARCHAR(255) DEFAULT '',
  `vassa` INT DEFAULT 0,
  `age` INT DEFAULT 0,
  `residing_temple` VARCHAR(255) DEFAULT '',
  `affiliated_temple` VARCHAR(255) DEFAULT '',
  `subdistrict` VARCHAR(255) DEFAULT '',
  `district` VARCHAR(255) DEFAULT '',
  `province` VARCHAR(255) DEFAULT '',
  `region` VARCHAR(100) DEFAULT '',
  `temple_position` VARCHAR(255) DEFAULT '',
  `sangha_position` VARCHAR(255) DEFAULT '',
  `upajjhaya_status` VARCHAR(255) DEFAULT '',
  `upajjhaya_code` VARCHAR(100) DEFAULT '',
  `other_position` TEXT DEFAULT NULL,
  `rajathinnanam` VARCHAR(255) DEFAULT '',
  `rank_class` VARCHAR(255) DEFAULT '',
  `faction` VARCHAR(100) DEFAULT '',
  `education` VARCHAR(255) DEFAULT '',
  `dhamma_education` VARCHAR(100) DEFAULT '',
  `pali_education` VARCHAR(100) DEFAULT '',
  `zip_code` VARCHAR(20) DEFAULT '',
  `remarks` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `temples`;
CREATE TABLE `temples` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `type` VARCHAR(255) DEFAULT '',
  `district` VARCHAR(255) DEFAULT '',
  `subdistrict` VARCHAR(255) DEFAULT '',
  `abbot` VARCHAR(255) DEFAULT '',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `events`;
CREATE TABLE `events` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `date` VARCHAR(255) DEFAULT '',
  `type` VARCHAR(100) DEFAULT '',
  `description` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
