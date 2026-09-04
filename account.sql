-- =========================================================
-- 전산회계 자료실 DB 스키마 (MariaDB 용)
-- phpMyAdmin SQL 탭에 붙여넣기 후 실행하거나
-- SSH: mysql -u root -p account_db < account.sql
-- =========================================================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+09:00";

-- ---------------------------------------------------------
-- 1. 사용자(Users) 테이블
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id`            int(11)             NOT NULL AUTO_INCREMENT,
  `username`      varchar(50)         NOT NULL                        COMMENT '로그인 아이디',
  `password_hash` varchar(255)        NOT NULL                        COMMENT '암호화된 비밀번호',
  `role`          enum('user','admin') DEFAULT 'user'                 COMMENT '사용자 권한',
  `is_blocked`    tinyint(1)          DEFAULT 0                       COMMENT '차단 여부 (0:정상, 1:차단)',
  `block_reason`  varchar(255)        DEFAULT NULL                    COMMENT '접속 차단 사유',
  `created_at`    datetime            DEFAULT current_timestamp()     COMMENT '가입일',
  `last_login_at` datetime            DEFAULT NULL                    COMMENT '마지막 로그인 시간',
  `last_login_ip` varchar(45)         DEFAULT NULL                    COMMENT '마지막 접속 IP',
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='회원 정보 테이블';

-- 기존 DB에 컬럼이 없는 경우 안전하게 추가 (이미 있으면 무시)
ALTER TABLE `users`
  ADD COLUMN IF NOT EXISTS `is_blocked`    tinyint(1)   NOT NULL DEFAULT 0    COMMENT '차단 여부 (0:정상, 1:차단)',
  ADD COLUMN IF NOT EXISTS `block_reason`  varchar(255)          DEFAULT NULL  COMMENT '접속 차단 사유',
  ADD COLUMN IF NOT EXISTS `last_login_at` datetime              DEFAULT NULL  COMMENT '마지막 로그인 시간',
  ADD COLUMN IF NOT EXISTS `last_login_ip` varchar(45)           DEFAULT NULL  COMMENT '마지막 접속 IP';


-- ---------------------------------------------------------
-- 2. 사용자 활동 로그 (User Logs) 테이블
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS `user_logs` (
  `id`         int(11)     NOT NULL AUTO_INCREMENT,
  `user_id`    int(11)     NOT NULL                    COMMENT '사용자 ID',
  `action`     varchar(50) NOT NULL                    COMMENT '활동 유형 (login, solve_quiz, view_page 등)',
  `detail`     text        DEFAULT NULL                COMMENT '상세 내용',
  `ip_address` varchar(45) NOT NULL                    COMMENT '접속 IP',
  `created_at` datetime    DEFAULT current_timestamp() COMMENT '기록 시간',
  PRIMARY KEY (`id`),
  KEY `idx_user_action` (`user_id`, `action`),
  CONSTRAINT `fk_user_logs_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='사용자 활동 기록';


-- ---------------------------------------------------------
-- 3. 다운로드 이력 (Download Logs) 테이블
--    ※ api.php 에서 file_path, downloaded_at 컬럼으로 조회
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS `download_logs` (
  `id`            bigint      NOT NULL AUTO_INCREMENT,
  `user_id`       varchar(64) DEFAULT NULL              COMMENT '다운로드한 유저 ID (비회원이면 NULL)',
  `file_path`     text        NOT NULL                  COMMENT '다운로드된 파일 경로',
  `ip_address`    varchar(64) DEFAULT NULL              COMMENT '접속 IP',
  `downloaded_at` datetime    NOT NULL DEFAULT NOW()    COMMENT '다운로드 시각',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_downloaded_at` (`downloaded_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='파일 다운로드 이력';

-- 기존 구버전 download_logs(file_name, created_at)가 있을 경우 새 컬럼 추가
-- 이미 있는 경우 Note:#1060으로 무시됨
ALTER TABLE `download_logs`
  ADD COLUMN IF NOT EXISTS `file_path`     text     DEFAULT NULL   COMMENT '다운로드된 파일 경로',
  ADD COLUMN IF NOT EXISTS `downloaded_at` datetime DEFAULT NULL   COMMENT '다운로드 시각';


-- ---------------------------------------------------------
-- 4. 학습 통계 (Learning Stats) 테이블
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS `learning_stats` (
  `id`            int(11)     NOT NULL AUTO_INCREMENT,
  `user_id`       int(11)     NOT NULL,
  `grade`         varchar(20) NOT NULL                                    COMMENT '급수 (grade1, grade2)',
  `subject`       varchar(50) NOT NULL                                    COMMENT '과목 (분개, 필기 등)',
  `total_solved`  int(11)     DEFAULT 0                                   COMMENT '총 푼 문제 수',
  `correct_count` int(11)     DEFAULT 0                                   COMMENT '맞춘 수',
  `wrong_count`   int(11)     DEFAULT 0                                   COMMENT '틀린 수',
  `updated_at`    datetime    DEFAULT current_timestamp() ON UPDATE current_timestamp() COMMENT '최근 업데이트',
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_user_grade_subject` (`user_id`, `grade`, `subject`),
  CONSTRAINT `fk_learning_stats_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='유저별 학습 누적 통계';


COMMIT;

-- =========================================================
-- ✅ 적용 확인 쿼리 (실행 후 결과로 컬럼/테이블 확인)
-- =========================================================
-- SHOW COLUMNS FROM users;
-- SHOW TABLES;
