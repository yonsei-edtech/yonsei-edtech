/**
 * topic-report-map — 핵심 주제(seed + deepDive) → 보고서/계획서 필드 매핑 순수 모듈
 *  (P2-1, 2026-08-10)
 *
 * TopicDeepDiveSyncPanel(불러오기 패널)과 useEnsureResearchReport(빈 문서 자동 시드)에서
 * 공유하는 매핑 로직. 부수효과 없는 순수 함수만 노출한다.
 *
 * 주의: PaperVariables 는 research-report 에서 re-export 되지 않으므로 @/types 배럴에서 가져온다.
 */

import type { SavedTopicDirection, ResearchApproach, PaperVariables } from "@/types";

/** 주제 탐색 접근 라벨(양적/질적/혼합/개발·설계) → 보고서 연구 접근 패러다임. */
export function mapApproach(approach: string | undefined): ResearchApproach {
  switch (approach) {
    case "양적":
      return "analytical";
    case "질적":
      return "generative";
    case "혼합":
      return "mixed_methods";
    case "개발·설계":
      return "generative";
    default:
      return "";
  }
}

const VAR_KEYS: (keyof PaperVariables)[] = [
  "independent",
  "dependent",
  "mediator",
  "moderator",
  "control",
];

/** 레거시·오염 방어: 각 변인 카테고리를 배열로만 정규화(빈 카테고리는 제외). */
function normalizeVariables(v: PaperVariables | undefined): PaperVariables {
  const out: PaperVariables = {};
  if (!v || typeof v !== "object") return out;
  for (const k of VAR_KEYS) {
    const arr = v[k];
    if (Array.isArray(arr)) {
      const cleaned = arr.map((s) => String(s).trim()).filter(Boolean);
      if (cleaned.length > 0) out[k] = cleaned;
    }
  }
  return out;
}

/** 핵심 주제(seed+deepDive)에서 유도되는 보고서 시드값. 존재하는 값만 키로 포함. */
export interface CoreReportSeed {
  fieldSubject?: string;
  fieldAudience?: string;
  researchApproach?: ResearchApproach;
  variables?: PaperVariables;
  scopeAudience?: string;
  scopeContext?: string;
  scopeExclusion?: string;
  researchQuestions?: string[];
}

/**
 * 핵심 주제(seed+deepDive) → 보고서 시드값(존재하는 값만). 빈 문서 자동 시드용.
 * truthy/non-empty 인 값만 키로 담으므로 빈 보고서 defaults 뒤에 그대로 spread 할 수 있다.
 */
export function coreTopicToReportSeed(
  core: SavedTopicDirection | null | undefined,
): CoreReportSeed {
  const out: CoreReportSeed = {};
  if (!core) return out;

  const seed = core.seed;
  const dd = core.deepDive;

  const topic = (seed?.topic ?? "").trim();
  if (topic) out.fieldSubject = topic;

  const target = (seed?.target ?? seed?.subjectTerms?.[0] ?? "").trim();
  if (target) out.fieldAudience = target;

  const approach = mapApproach(seed?.approach ?? core.approach);
  if (approach) out.researchApproach = approach;

  const variables = normalizeVariables(dd?.variables);
  if (Object.keys(variables).length > 0) out.variables = variables;

  const population = (dd?.population ?? "").trim();
  if (population) out.scopeAudience = population;

  const context = (dd?.context ?? "").trim();
  if (context) out.scopeContext = context;

  const exclusion = (dd?.exclusion ?? "").trim();
  if (exclusion) out.scopeExclusion = exclusion;

  const researchQuestions = Array.isArray(dd?.researchQuestions)
    ? dd.researchQuestions.map((q) => String(q).trim()).filter(Boolean)
    : [];
  if (researchQuestions.length > 0) out.researchQuestions = researchQuestions;

  return out;
}
