---
name: frontend-design
description: 모던하고 세련된 웹 인터페이스(UI/UX) 구축, 감각적인 타이포그래피, 반응형 레이아웃 및 디자인 시스템 가이드.
---

# Frontend Design & UI/UX Best Practices

세련되고 현대적인 웹 사용자 경험을 구축하기 위한 가이드입니다.

## 1. 디자인 원칙
- **시각적 위계**: 글꼴 크기, 두께, 색상 대비를 명확히 구분하여 중요한 정보(문제, 정답, 버튼)가 한눈에 들어오도록 구성.
- **여백과 밀도(Spacing & Density)**: 4px/8px 단위의 그리드 시스템을 기반으로 여백을 일관되게 적용.
- **컬러 팔레트**:
  - Primary: 신뢰감을 주는 색상 (Slate Blue, Deep Indigo 등)
  - Semantic: 성공(Green), 오류/경고(Red/Amber), 정보(Blue)
  - Neutral: 눈의 피로를 덜어주는 부드러운 회색조 (#F8FAFC, #0F172A 등)

## 2. 인터랙션 및 애니메이션
- 버튼 및 카드 요소에 자연스러운 transition (150ms~200ms ease) 적용.
- 화면 전환 시 부드러운 페이드인 및 카드 슬라이드 효과 적용.

## 3. 반응형 대응 (Responsive)
- 모바일(320px~), 태블릿(768px~), 데스크톱(1024px~) 뷰포트에서 레이아웃 깨짐 방지.
- 모바일 터치 타겟(버튼, 선택지)은 최소 44px x 44px 크기 확보.
