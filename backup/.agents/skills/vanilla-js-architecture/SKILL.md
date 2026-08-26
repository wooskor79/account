---
name: vanilla-js-architecture
description: 무거운 프레임워크 없이 순수 JavaScript(Vanilla JS)로 확장 가능하고 유지보수하기 쉬운 프론트엔드 모듈 아키텍처 패턴.
---

# Vanilla JavaScript Architecture Guide

순수 자바스크립트 프로젝트에서 코드 스파게티를 방지하고 체계적으로 모듈화하기 위한 아키텍처 가이드입니다.

## 1. 모듈화 및 단일 책임 원칙 (SRP)
- UI 렌더링, 상태 관리, 비즈니스 로직(채점, 계산), 네트워크 통신(API)을 별도 파일로 분리.
  - quiz_core.js: 공통 퀴즈 상태 및 라이프사이클 관리
  - quiz_journal.js / quiz_theory.js: 유형별 특화 로직
  - pi.js: 서버와의 비동기 통신 전담

## 2. 상태 관리 (State Management)
- 단일 진실 공급원(Single Source of Truth) 원칙 적용.
- 상태(State) 객체를 직접 수정하지 않고, 상태 변경 함수(Action/Reducer 역할)를 통해 변경 후 UI 리렌더링 트리거.

## 3. 이벤트 위임 (Event Delegation)
- 동적으로 생성되는 퀴즈 보기, 계정과목 검색 결과, 버튼 등에 대해 부모 컨테이너에 단일 이벤트 리스너 등록하여 메모리 사용 최적화.
