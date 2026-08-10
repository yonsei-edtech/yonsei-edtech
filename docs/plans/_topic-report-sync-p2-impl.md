# 주제→보고서 연동 P2 구현 요약

- 구현일: 2026-08-10
- 근거: `docs/plans/topic-deepdive-report-sync-proposal.md` §4 P2
- 전제: P0+P1 LIVE (핵심주제 seed+deepDive, TopicDeepDiveSyncPanel 전필드 매핑, TopicDeepDive 폼)
- 원칙: 비파괴 매핑(사용자 입력 미덮어씀) · 시맨틱 토큰 · 기존 패턴 재사용 · 추가만(기존 UX 무변경)

## 신규 파일

### `src/features/research/topic-report-map.ts`
공유 순수 모듈(부수효과 없음). TopicDeepDiveSyncPanel · useEnsureResearchReport 가 공유.
- `mapApproach(approach)`: 양적→analytical, 질적→generative, 혼합→mixed_methods, 개발·설계→generative, else `""`. (기존 패널 로직과 동일 — 동작 불변)
- `CoreReportSeed`: 보고서 시드 필드 인터페이스(전부 옵셔널).
- `coreTopicToReportSeed(core)`: 핵심주제(seed+deepDive)→보고서 시드값. **truthy/non-empty 인 값만 키로 포함**하므로 빈 문서 defaults 뒤에 그대로 spread 가능. deepDive.variables 는 카테고리별 배열 방어 정규화(빈 카테고리 제외).
- 참고: `PaperVariables` 는 `@/types/research-report` 에서 re-export 되지 않으므로 `@/types` 배럴에서 import(컴파일 필요 조정).

## P2-1. 보고서 최초 생성 시 자동 시드 (빈 문서 한정)

### `src/features/research/useResearchReport.ts`
- `useEnsureResearchReport` mutationFn 입력을 `string` → `{ userId: string; seed?: Partial<ResearchReport> }` 로 변경.
- 문서 없을 때 create 페이로드 끝에 `...(seed ?? {})` spread(빈값 defaults 뒤 → 값 있는 필드만 덮어씀, 비파괴). 문서 있으면 기존대로 최신 반환(시드 미적용).
- `onSuccess` 의 userId 접근을 `(_d, vars) => vars.userId` 로.

### 호출부 2곳
- `src/app/research-model/page.tsx` L64: `ensureReport.mutateAsync(user.id)` → `ensureReport.mutateAsync({ userId: user.id })` (시드 없음).
- `src/features/research/ResearchReportEditor.tsx`:
  - import 추가: `useCoreTopic`(topic-explorer/useSavedTopics), `coreTopicToReportSeed`(topic-report-map).
  - `const coreTopic = useCoreTopic();` 추가.
  - ensure 호출(useEffect 내부) `ensure.mutate(user.id)` → `ensure.mutate({ userId: user.id, seed: coreTopicToReportSeed(coreTopic) })`, deps 에 `coreTopic` 추가.
  - **빈 문서(신규)에만 적용** — 기존 사용자 무영향.

## P2-2. TopicDeepDiveSyncPanel 일반화 + 계획서 연동

### `src/features/research/TopicDeepDiveSyncPanel.tsx`
- 자체 `mapApproach` 제거 → `import { mapApproach } from "./topic-report-map"` (중복 제거, 동작 불변).
- `Props.current` 의 모든 필드를 **옵셔널**로. 각 매핑/미리보기 라인을 "해당 current 필드가 제공됐고(≠undefined) 비었을 때만" 채우도록 가드. variables/researchQuestions 계산도 `current.X !== undefined` 일 때만.
- 보고서 호출부는 전 필드 전달 → **동작 불변**(회귀 없음, tsc 확인).

### `src/features/research/ResearchProposalEditor.tsx`
- import 추가: `TopicDeepDiveSyncPanel`.
- 연구문제/연구변인 스텝의 "연구문제" Section 상단에 패널 삽입:
  `current={{ variables: form.variables, researchQuestions: form.researchQuestions }}`, `readOnly` 전달, onApply 로 variables·researchQuestions 만 setField.

## P2-3. 연구방법 아카이브 링크 (라이트)

### `src/features/research/topic-explorer/TopicDeepDive.tsx`
- import 추가: `next/link`, lucide `BookOpen`.
- approach→검색어 매핑: 질적→질적연구, 양적→조사연구, 개발·설계→개발연구, 혼합→혼합연구, else `""`(링크 생략).
- 폼 하단(저장 버튼 위)에 `href={/archive/research-methods?q=...}` 단일 링크. (research-methods 페이지가 `?q=` 를 검색어로 반영함 확인.)

## 검증
- `npx tsc --noEmit` → 0 errors.
- `npx eslint <변경·신규 7파일>` → 0 error · 0 warning.

## 변경 파일 목록
- 신규 `src/features/research/topic-report-map.ts`
- `src/features/research/TopicDeepDiveSyncPanel.tsx`
- `src/features/research/useResearchReport.ts`
- `src/features/research/ResearchReportEditor.tsx`
- `src/features/research/ResearchProposalEditor.tsx`
- `src/features/research/topic-explorer/TopicDeepDive.tsx`
- `src/app/research-model/page.tsx`
