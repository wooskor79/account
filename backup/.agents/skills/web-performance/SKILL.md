---
name: web-performance
description: 대용량 엑셀/데이터 파싱 최적화, Web Worker 백그라운드 처리, 브라우저 렌더링 성능 및 메모리 최적화 가이드.
---

# Web Performance & Data Optimization Guide

웹 애플리케이션의 렌더링 성능과 대용량 데이터 처리 속도를 극대화하기 위한 가이드입니다.

## 1. 무거운 연산의 백그라운드 분리 (Web Worker)
- 대용량 엑셀(XLSX) 파싱 및 문제 데이터셋 가공은 메인 스레드를 블로킹하지 않도록 Worker 스레드에서 처리.
- 메인 스레드와 워커 간 전송 시 Transferable Objects(ArrayBuffer 등)를 활용하여 복사 오버헤드 최소화.

## 2. DOM 렌더링 최적화
- 수백/수천 개의 문제 리스트 렌더링 시 DOM 조작을 최소화하고 DocumentFragment 또는 가상 스크롤(Virtual List) 패턴 적용.
- 레이아웃 리플로우(Reflow)와 리페인트(Repaint)를 유발하는 DOM 속성 연속 접근 방지.

## 3. 메모리 관리 및 캐싱
- 불필요한 전역 변수 지양, 컴포넌트 제거 시 이벤트 리스너 및 타이머(clearTimeout, clearInterval) 해제.
- 이미 파싱된 퀴즈 데이터는 로컬 스토리지 또는 메모리 캐시에 보관하여 중복 파싱 방지.
