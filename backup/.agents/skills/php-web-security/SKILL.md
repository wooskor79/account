---
name: php-web-security
description: PHP 백엔드 및 API의 보안 강화 가이드. SQL 인젝션, XSS, CSRF, 악성 파일 업로드 방어 및 데이터 유효성 검증.
---

# PHP Web Security & Hardening Guide

안전한 PHP 웹 애플리케이션 및 API 구현을 위한 보안 가이드입니다.

## 1. 입력 검증 및 이스케이프
- 모든 $_GET, $_POST, $_REQUEST 값은 신뢰할 수 없는 데이터로 취급.
- HTML 출력 시 htmlspecialchars(, ENT_QUOTES, 'UTF-8') 필터링 필수.
- 데이터베이스 쿼리는 항상 Prepared Statements(PDO 또는 MySQLi) 사용.

## 2. 파일 업로드 보안
- 업로드 파일의 MIME 타입 및 확장자 화이트리스트 검사 (.xlsx, .json 등 허용 확장자만 제한).
- 업로드된 파일 이름을 무작위 해시(UUID/SHA256)로 변경하여 저장.
- 업로드 디렉토리(uploads/) 내 .php, .phtml, 스크립트 실행 권한 차단 (.htaccess / Nginx 설정).

## 3. 보안 헤더 설정
- Content-Security-Policy (CSP), X-Frame-Options, X-Content-Type-Options 등 보안 헤더 기본 적용.
- JSON API 응답 시 명확한 Content-Type (pplication/json; charset=utf-8) 명시.
