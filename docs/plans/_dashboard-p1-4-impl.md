# 대시보드 P1-4 구현 — 코칭 슬롯 레이아웃 키 편입 (2026-08-10)

근거: `docs/plans/dashboard-improvement-project.md` §3 P1-4.

## 목표
고정 스택의 코칭/넛지 단일 슬롯(CoachingSlot, P1-1)은 편집모드·프리셋 대상이 아니라 **끌 수 없었다.** 이를 레이아웃 시스템의 단일 키 `coachingSlot` 으로 편입해 사용자가 on/off 하도록 함.

## 방식 — `staffAlerts` 패턴 그대로
`staffAlerts` 는 이미 "키는 있으나 widgetMap 에는 없고, 고정 위치에서 `isWidgetVisible` 게이트로 렌더되며, 설정 페이지에서 토글되는" 선례다. `coachingSlot` 을 동일하게 미러링.

## 변경 파일
1. `src/types/dashboard-layout.ts`
   - `DashboardWidgetKey` 에 `"coachingSlot"` 추가.
   - `DASHBOARD_WIDGET_META.coachingSlot`(label "코칭·넛지 카드", 설명) 추가 → 설정 페이지 토글 카드에 노출.
   - `DASHBOARD_WIDGET_KEYS` 에 추가 → `getSortedWidgets` 자동 보충 대상.
   - `DEFAULT_VISIBLE_WIDGETS` 에 추가 → 기본 노출(현행 항상-표시 유지).
2. `src/app/dashboard/page.tsx`
   - CoachingSlot 렌더를 `{isWidgetVisible(layout, "coachingSlot") && (…)}` 로 게이트. **고정 스택 위치는 유지**(넛지는 상단 노출이 생명). widgetMap 미등록 → 그리드 재배치 대상 아님(staffAlerts 동일).
3. `src/lib/dashboard-presets.ts`
   - student/staff/research 프리셋 order 에 `coachingSlot` 추가(가시=true). default 는 전 키 visible=true 로 자동 노출. **minimal 은 제외**(스트립 유지 — 사용자가 편집모드에서 켤 수 있음).

## 마이그레이션·회귀 (무마이그레이션·무회귀)
- `isWidgetVisible(layout, key)`: 저장 레이아웃에 없는 키는 `cfg ? cfg.visible : true` 로 **기존 사용자도 자동 노출**. 레이아웃 없는 사용자는 `DEFAULT_VISIBLE_WIDGETS.has` → 노출.
- `getSortedWidgets`: 누락 키를 `DEFAULT_VISIBLE_WIDGETS` 기준으로 보충 + RETIRED 제외 → 설정 페이지에 자동 등장.
- 대시보드 그리드 렌더(`widgetMap[cfg.key]` `!node` 가드): coachingSlot 은 widgetMap 미존재 → 그리드·드래그 편집 UI 에서 자동 제외(이중 렌더 없음).

## 검증
- TSC 0 / ESLint 0(변경 3파일) / rawcolor 1 / eslint-warning 래칫 146 / next build 0.
- QA: 대시보드 기본 노출 유지, 설정 페이지에 "코칭·넛지 카드" 토글 등장·OFF 시 슬롯 숨김, 프리셋 적용 시 반영, 편집 그리드에 중복 안 뜸.
