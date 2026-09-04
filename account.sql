-- 전산회계 자료실 DB 스키마 (MariaDB 용)
-- phpMyAdmin의 SQL 탭에 복사하여 실행하거나, 이 파일을 가져오기(Import) 하시면 됩니다.

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+09:00";

-- 1. 사용자(Users) 테이블
CREATE TABLE IF NOT EXISTS `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL COMMENT '로그인 아이디',
  `password_hash` varchar(255) NOT NULL COMMENT '암호화된 비밀번호',
  `role` enum('user','admin') DEFAULT 'user' COMMENT '사용자 권한',
  `is_blocked` tinyint(1) DEFAULT 0 COMMENT '차단 여부 (0:정상, 1:차단)',
  `block_reason` varchar(255) DEFAULT NULL COMMENT '접속 차단 사유',
  `created_at` datetime DEFAULT current_timestamp() COMMENT '가입일',
  `last_login_at` datetime DEFAULT NULL COMMENT '마지막 로그인 시간',
  `last_login_ip` varchar(45) DEFAULT NULL COMMENT '마지막 접속 IP',
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='회원 정보 테이블';

-- 2. 사용자 활동 로그 (User Logs) 테이블
CREATE TABLE IF NOT EXISTS `user_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL COMMENT '사용자 ID',
  `action` varchar(50) NOT NULL COMMENT '활동 유형 (login, solve_quiz, view_page 등)',
  `detail` text DEFAULT NULL COMMENT '상세 내용 (예: 어떤 문제를 풀었는지)',
  `ip_address` varchar(45) NOT NULL COMMENT '접속 IP',
  `created_at` datetime DEFAULT current_timestamp() COMMENT '기록 시간',
  PRIMARY KEY (`id`),
  KEY `idx_user_action` (`user_id`, `action`),
  CONSTRAINT `fk_user_logs_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='사용자 활동 기록';


-- 3. 다운로드 이력 (Download Logs) 테이블
CREATE TABLE IF NOT EXISTS `download_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL COMMENT '다운로드한 사용자 ID',
  `file_name` varchar(255) NOT NULL COMMENT '다운로드한 파일명',
  `ip_address` varchar(45) NOT NULL COMMENT '다운로드 시점의 IP',
  `created_at` datetime DEFAULT current_timestamp() COMMENT '다운로드 시간',
  PRIMARY KEY (`id`),
  KEY `idx_user_download` (`user_id`),
  CONSTRAINT `fk_download_logs_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='파일 다운로드 이력';


-- 4. 학습 통계 (Learning Stats) 테이블
-- 1급/2급, 분개/필기 등 유저의 누적 학습 데이터를 저장
CREATE TABLE IF NOT EXISTS `learning_stats` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `grade` varchar(20) NOT NULL COMMENT '급수 (예: 1급, 2급)',
  `subject` varchar(50) NOT NULL COMMENT '과목 (예: 분개, 필기)',
  `total_solved` int(11) DEFAULT 0 COMMENT '총 푼 문제 수',
  `correct_count` int(11) DEFAULT 0 COMMENT '맞춘 수',
  `wrong_count` int(11) DEFAULT 0 COMMENT '틀린 수',
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp() COMMENT '최근 업데이트',
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_user_grade_subject` (`user_id`, `grade`, `subject`),
  CONSTRAINT `fk_learning_stats_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='유저별 학습 누적 통계';

COMMIT;
