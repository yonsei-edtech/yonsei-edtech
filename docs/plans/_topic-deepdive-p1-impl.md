# 주제 심화 질의응답 (P1) 구현 요약

- 작성일: 2026-08-10
- 근거 제안서: `docs/plans/topic-deepdive-report-sync-proposal.md` §2·§3·§4(P1)
- 전제: P0(근거보존 seed + TopicDeepDiveSyncPanel 최소매핑) LIVE 위에 얹음
- 검증: `npx tsc --noEmit` → 0 errors / `npx eslint <변경파일 8종>` → 0 error·0 warning

## 변경·신규 파일

### 신규
1. `src/features/research/topic-explorer/topic-deepdive-logic.ts` — 순수 로직
   - `ddInitialFromSeed(seed?, approach?): TopicDeepDive` — population←seed.target, 양적/개발·혼합은 variables.independent←[seed.topic] 프리필, 질적은 변인 프리필 생략.
   - `ddDraftResearchQuestions(dd, approach?): string[]` — 양적: "{population}의 {독립}이(가) {종속}에 미치는 영향은 어떠한가?"(+매개 있으면 매개 문형), 질적: "{population}은 {context}에서 {소재}을(를) 어떻게 경험하는가?". 값 부족 시 `[]`.
   - 한국어 조사(은/는·이/가·을/를)는 받침(한글 음절 % 28) 기준 자체 처리(generator 미export라 복제).
2. `src/features/research/topic-explorer/TopicDeepDive.tsx` — 섹션형 가이드 폼(신규 브랜칭 엔진 없음)
   - props `{ topicId, onDone? }`. `useSavedTopics()`로 대상 topic + `updateDeepDive` 사용. topic 없으면 안내.
   - 변인(`VariablesInput` 재사용), 대상/맥락/제외(Textarea), 연구문제(자동 초안 버튼+편집 목록).
   - seed 프리필/기존 deepDive 하이드레이션(각 변인 배열·researchQuestions `Array.isArray` 가드). 질적이면 변인 섹션 보조 안내.
   - 상위는 `key={topicId}`로 remount(초기값 반영).

### 변경
3. `src/types/topic-exploration.ts`
   - `import type { PaperVariables }` 추가.
   - `TopicDeepDive` 인터페이스 신설(variables?/population?/context?/exclusion?/researchQuestions?/updatedAt?, 모두 옵셔널).
   - `SavedTopicDirection`에 `deepDive?: TopicDeepDive` 추가(구버전 호환). @/types 배럴 `export *`로 자동 노출.
4. `src/features/research/topic-explorer/useSavedTopics.ts`
   - `UseSavedTopics`에 `updateDeepDive(id, deepDive)` 추가. 해당 id만 `deepDive:{...deepDive, updatedAt: new Date().toISOString()}` 병합, 나머지 불변. `persist`(낙관적+롤백) 재사용. 존재 가드.
5. `src/features/research/topic-explorer/TopicExplorer.tsx`
   - Dialog+TopicDeepDive import, `deepDiveTopicId` state, `openDeepDive(sentence)`(라벨로 저장 topic 조회, 미저장 시 저장 유도 토스트).
   - 결과 프레임 액션에 "더 좁히기" 버튼, 저장 목록 각 항목에 심화 아이콘 버튼(deepDive 있으면 강조).
   - 하단에 심화 모달 Dialog(`key={deepDiveTopicId}`).
6. `src/features/research/topic-explorer/CoreTopicBanner.tsx` (P1-3)
   - 표시 전용 → CTA 2개: "심화하기"(자체 내장 Dialog+TopicDeepDive), "보고서에 불러오기"(`onImport` 우선, 없으면 `importHref` 링크, 기본 `?tab=reportdoc`).
   - props 확장(`href`·`importHref`·`onImport`) 모두 기본값 → 기존 `<CoreTopicBanner />` 하위호환.
7. `src/features/research/TopicDeepDiveSyncPanel.tsx` (P1-2)
   - props 확장: `current`에 scopeAudience/scopeContext/scopeExclusion/variables/researchQuestions 추가, `DeepDivePatch`에 대응 키 추가.
   - core.deepDive 전 필드 비파괴 매핑(빈 칸만): variables 카테고리별 채움(병합 전체 객체 대입), population→scopeAudience, context→scopeContext, exclusion→scopeExclusion, researchQuestions는 미존재 항목만 append. seed 매핑(topic→fieldSubject, target→fieldAudience, approach→researchApproach) 유지. 미리보기 rows 확장.
8. `src/features/research/ResearchReportEditor.tsx`
   - Field11Context의 패널 사용처: `current`에 5필드 추가 전달, `onApply`에서 신규 patch 키(scopeAudience/scopeContext/scopeExclusion/variables/researchQuestions) `setField` 반영. setField는 `<K extends keyof FormState>`라 각 키 그대로 대입(패널이 병합본 계산해 전달).

## 데이터 모델
- `TopicDeepDive` = `{ variables?: PaperVariables; population?; context?; exclusion?; researchQuestions?: string[]; updatedAt? }`.
- 저장 경로: `users.savedTopicDirections[].deepDive` (신규 컬렉션·rules 불필요). `PaperVariables` 재사용으로 보고서 variables와 무변환 연동.

## 매핑 표 (심화→보고서, 전부 비파괴 빈칸채움)
| 심화 필드 | 보고서 필드 |
|---|---|
| seed.topic | fieldSubject |
| seed.target | fieldAudience |
| approach(양적→analytical, 질적/개발→generative, 혼합→mixed_methods) | researchApproach |
| deepDive.variables (카테고리별) | variables |
| deepDive.population | scopeAudience |
| deepDive.context | scopeContext |
| deepDive.exclusion | scopeExclusion |
| deepDive.researchQuestions | researchQuestions (append) |

## 비파괴 보장
- 모든 매핑은 대상 필드가 비었을 때만 채움. variables는 카테고리 단위로 비었을 때만. researchQuestions는 목록에 없는 항목만 append.
- 기존 동작·UX 무변경(추가만). readOnly(콘솔 열람)에서 패널 미노출 계약 유지.

## 검증 결과
- `npx tsc --noEmit` → TSC_EXIT=0
- `npx eslint` (8파일) → ESLINT_EXIT=0 (0 error·0 warning)
- 배포·커밋·`next build` 미수행(지시대로).

## 변경 파일 목록 (git add 대상)
- src/types/topic-exploration.ts
- src/features/research/topic-explorer/useSavedTopics.ts
- src/features/research/topic-explorer/topic-deepdive-logic.ts (신규)
- src/features/research/topic-explorer/TopicDeepDive.tsx (신규)
- src/features/research/topic-explorer/TopicExplorer.tsx
- src/features/research/topic-explorer/CoreTopicBanner.tsx
- src/features/research/TopicDeepDiveSyncPanel.tsx
- src/features/research/ResearchReportEditor.tsx
- docs/plans/_topic-deepdive-p1-impl.md (본 문서)
