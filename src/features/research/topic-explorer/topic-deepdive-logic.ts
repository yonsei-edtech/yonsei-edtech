// 주제 심화 질의응답 — 순수 로직 (UI 비의존, 테스트 가능)  [P1, 2026-08-10]
//
// 저장한 주제 방향(TopicSeed)을 변인·대상·맥락·연구문제로 좁히는 심화 폼의
// 초기 프리필과 연구문제 자동 초안을 담당한다. 신규 브랜칭 엔진을 만들지 않고
// 순수 헬퍼만 제공 — 실제 편집은 폼(TopicDeepDive.tsx)에서 한다.

import type { TopicSeed, TopicDeepDive } from "@/types/topic-exploration";

// ── 한국어 조사 처리 (research-question-generator.ts 와 동일 규칙, 자체 보유) ──

/** 마지막 글자에 받침이 있는지 (한글 음절 기준). 한글이 아니면 false. */
function hasFinalConsonant(word: string): boolean {
  const ch = word.trim().slice(-1);
  if (!ch) return false;
  const code = ch.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return false;
  return (code - 0xac00) % 28 !== 0;
}

/** 받침에 따라 은/는 */
function topicJosa(word: string): string {
  return `${word}${hasFinalConsonant(word) ? "은" : "는"}`;
}
/** 받침에 따라 이/가 */
function subjectJosa(word: string): string {
  return `${word}${hasFinalConsonant(word) ? "이" : "가"}`;
}
/** 받침에 따라 을/를 */
function objectJosa(word: string): string {
  return `${word}${hasFinalConsonant(word) ? "을" : "를"}`;
}

function clean(v: string | undefined): string {
  return (v ?? "").trim();
}

/** 질적 접근인지 — 변인 프리필 생략·질적 문형 분기 */
function isQualitative(approach?: string): boolean {
  return approach === "질적";
}

// ── 시드 → 심화 초안 프리필 ──────────────────────────────────────────────

/**
 * seed(TopicSeed)로 심화 초안을 프리필한다.
 * - population 에 seed.target
 * - 양적/개발·혼합: variables.independent 에 seed.topic 1개 시드
 * - 질적: 변인 프리필 생략(맥락·경험 강조)
 */
export function ddInitialFromSeed(seed?: TopicSeed, approach?: string): TopicDeepDive {
  const population = clean(seed?.target);
  const topic = clean(seed?.topic);
  const dd: TopicDeepDive = {
    variables: {},
    population,
    context: "",
    exclusion: "",
    researchQuestions: [],
  };
  if (!isQualitative(approach) && topic) {
    dd.variables = { independent: [topic] };
  }
  return dd;
}

// ── 심화 값 → 연구문제 자동 초안 ─────────────────────────────────────────

function firstOf(arr: string[] | undefined): string {
  if (!Array.isArray(arr)) return "";
  for (const v of arr) {
    const c = clean(v);
    if (c) return c;
  }
  return "";
}

/**
 * 변인·대상·맥락으로 연구문제 1~2문을 자동 초안한다(편집 전제).
 * 값이 부족하면 빈 배열을 돌려준다.
 *  - 양적/개발·혼합: "{population}의 {independent}이(가) {dependent}에 미치는 영향은 어떠한가?"
 *  - 질적: "{population}은 {context}에서 {topic/independent}을(를) 어떻게 경험하는가?"
 */
export function ddDraftResearchQuestions(dd: TopicDeepDive, approach?: string): string[] {
  const population = clean(dd.population);
  const context = clean(dd.context);
  const independent = firstOf(dd.variables?.independent);
  const dependent = firstOf(dd.variables?.dependent);
  const mediator = firstOf(dd.variables?.mediator);
  const out: string[] = [];

  if (isQualitative(approach)) {
    // 질적: 대상 + (맥락 또는 소재)로 경험 탐구 문형
    const object = independent || firstOf(dd.variables?.dependent);
    if (!population || !object) return [];
    const where = context ? `${context}에서 ` : "";
    out.push(`${topicJosa(population)} ${where}${objectJosa(object)} 어떻게 경험하는가?`);
    return out;
  }

  // 양적·개발·혼합: 독립·종속 변인 기반 영향 문형
  if (!independent || !dependent) return [];
  const who = population ? `${population}의 ` : "";
  out.push(`${who}${subjectJosa(independent)} ${dependent}에 미치는 영향은 어떠한가?`);
  if (mediator) {
    out.push(`${topicJosa(mediator)} ${independent}과(와) ${dependent}의 관계를 매개하는가?`);
  }
  return out;
}
