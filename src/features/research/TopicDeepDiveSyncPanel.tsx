"use client";

/**
 * TopicDeepDiveSyncPanel — 핵심 주제(주제 탐색·심화) → 연구보고서 불러오기 패널
 *  (P0-2 최소매핑 2026-08-05 → P1-2 전 필드 매핑 2026-08-10)
 *
 * 주제 탐색에서 지정한 "핵심 주제"의 근거(seed)와 심화 결과(deepDive)를 읽어
 * 연구보고서의 대응 필드를 채운다. ResearchQuestionSyncPanel/VariableSyncPanel 의
 * import/append 비파괴 패턴을 따른다 — **빈 칸만 채우고, 사용자가 이미 입력한 값은 덮어쓰지 않는다.**
 *
 * 매핑:
 *  - seed.topic → fieldSubject, seed.target → fieldAudience, seed.approach → researchApproach (P0-2)
 *  - deepDive.variables → variables (카테고리별 빈 칸만), deepDive.population → scopeAudience,
 *    deepDive.context → scopeContext, deepDive.exclusion → scopeExclusion,
 *    deepDive.researchQuestions → researchQuestions (없는 항목만 append) (P1-2)
 * 데이터: users.savedTopicDirections[].{seed,deepDive} (신규 컬렉션·rules 불필요).
 */

import { Sparkles, ListPlus } from "lucide-react";
import { toast } from "sonner";
import { useCoreTopic } from "@/features/research/topic-explorer/useSavedTopics";
import { RESEARCH_APPROACH_LABELS, type ResearchApproach } from "@/types/research-report";
import type { PaperVariables } from "@/types";
import { mapApproach } from "./topic-report-map";

const VAR_META: { key: keyof PaperVariables; label: string }[] = [
  { key: "independent", label: "독립" },
  { key: "dependent", label: "종속" },
  { key: "mediator", label: "매개" },
  { key: "moderator", label: "조절" },
  { key: "control", label: "통제" },
];

function catValues(v: PaperVariables | undefined, key: keyof PaperVariables): string[] {
  const arr = v?.[key];
  return Array.isArray(arr) ? arr.map((s) => String(s).trim()).filter(Boolean) : [];
}

export interface DeepDivePatch {
  fieldSubject?: string;
  fieldAudience?: string;
  researchApproach?: ResearchApproach;
  variables?: PaperVariables;
  scopeAudience?: string;
  scopeContext?: string;
  scopeExclusion?: string;
  researchQuestions?: string[];
}

interface Props {
  readOnly?: boolean;
  /**
   * 현재 문서 값 — 빈 칸 판정용. 각 필드는 옵셔널: 제공된(≠undefined) 필드만 매핑·미리보기 대상.
   * (보고서는 전 필드 전달, 계획서는 variables·researchQuestions 만 전달)
   */
  current: {
    fieldSubject?: string;
    fieldAudience?: string;
    researchApproach?: ResearchApproach;
    scopeAudience?: string;
    scopeContext?: string;
    scopeExclusion?: string;
    variables?: PaperVariables;
    researchQuestions?: string[];
  };
  onApply: (patch: DeepDivePatch) => void;
}

export default function TopicDeepDiveSyncPanel({ readOnly = false, current, onApply }: Props) {
  const core = useCoreTopic();
  if (readOnly || !core) return null;

  const seed = core.seed;
  const dd = core.deepDive;

  const topicVal = (seed?.topic ?? "").trim();
  const targetVal = (seed?.target ?? seed?.subjectTerms?.[0] ?? "").trim();
  const approachVal = mapApproach(seed?.approach ?? core.approach);
  const approachLabel = approachVal ? RESEARCH_APPROACH_LABELS[approachVal] : "";

  const populationVal = (dd?.population ?? "").trim();
  const contextVal = (dd?.context ?? "").trim();
  const exclusionVal = (dd?.exclusion ?? "").trim();
  const ddQuestions = Array.isArray(dd?.researchQuestions)
    ? dd!.researchQuestions.map((q) => q.trim()).filter(Boolean)
    : [];

  // 비파괴: 값이 있고(offer) 해당 필드가 제공됐으며(≠undefined) 현재 비어 있을 때만 채움
  const patch: DeepDivePatch = {};
  if (topicVal && current.fieldSubject !== undefined && !current.fieldSubject.trim())
    patch.fieldSubject = topicVal;
  if (targetVal && current.fieldAudience !== undefined && !current.fieldAudience.trim())
    patch.fieldAudience = targetVal;
  if (approachVal && current.researchApproach !== undefined && !current.researchApproach)
    patch.researchApproach = approachVal;
  if (populationVal && current.scopeAudience !== undefined && !current.scopeAudience.trim())
    patch.scopeAudience = populationVal;
  if (contextVal && current.scopeContext !== undefined && !current.scopeContext.trim())
    patch.scopeContext = contextVal;
  if (exclusionVal && current.scopeExclusion !== undefined && !current.scopeExclusion.trim())
    patch.scopeExclusion = exclusionVal;

  // 변인: 제공됐을 때만, 카테고리별로 현재 비어 있으면 채움 (전체 객체 대입이므로 병합본 계산)
  const filledVarLabels: string[] = [];
  if (current.variables !== undefined) {
    const mergedVars: PaperVariables = {};
    let varsChanged = false;
    for (const { key, label } of VAR_META) {
      const cur = catValues(current.variables, key);
      const offered = catValues(dd?.variables, key);
      if (cur.length > 0) {
        mergedVars[key] = cur;
      } else if (offered.length > 0) {
        mergedVars[key] = offered;
        filledVarLabels.push(label);
        varsChanged = true;
      }
    }
    if (varsChanged) patch.variables = mergedVars;
  }

  // 연구문제: 제공됐을 때만, 현재 목록에 없는 항목만 append (비었으면 import)
  let newQuestions: string[] = [];
  if (current.researchQuestions !== undefined) {
    const curQuestions = current.researchQuestions.map((q) => q.trim()).filter(Boolean);
    newQuestions = ddQuestions.filter((q) => !curQuestions.includes(q));
    if (newQuestions.length > 0) {
      patch.researchQuestions = [...current.researchQuestions, ...newQuestions];
    }
  }

  const fillKeys = Object.keys(patch) as (keyof DeepDivePatch)[];
  const hasFill = fillKeys.length > 0;

  // 미리보기 항목 (제안값 + 이미 채워졌는지)
  const rows: { label: string; value: string; willFill: boolean }[] = [];
  if (topicVal && current.fieldSubject !== undefined)
    rows.push({ label: "교과/학습 주제", value: topicVal, willFill: !current.fieldSubject.trim() });
  if (targetVal && current.fieldAudience !== undefined)
    rows.push({ label: "대상 학습자", value: targetVal, willFill: !current.fieldAudience.trim() });
  if (approachLabel && current.researchApproach !== undefined)
    rows.push({ label: "연구 접근", value: approachLabel, willFill: !current.researchApproach });
  if (current.variables !== undefined) {
    const offeredVarLabels = VAR_META.filter((m) => catValues(dd?.variables, m.key).length > 0);
    if (offeredVarLabels.length > 0)
      rows.push({
        label: "연구 변인",
        value: offeredVarLabels.map((m) => m.label).join("·") + " 변인",
        willFill: filledVarLabels.length > 0,
      });
  }
  if (populationVal && current.scopeAudience !== undefined)
    rows.push({ label: "연구 대상", value: populationVal, willFill: !current.scopeAudience.trim() });
  if (contextVal && current.scopeContext !== undefined)
    rows.push({ label: "맥락", value: contextVal, willFill: !current.scopeContext.trim() });
  if (exclusionVal && current.scopeExclusion !== undefined)
    rows.push({ label: "제외 범위", value: exclusionVal, willFill: !current.scopeExclusion.trim() });
  if (ddQuestions.length > 0 && current.researchQuestions !== undefined)
    rows.push({
      label: "연구문제",
      value: `${ddQuestions.length}개 중 ${newQuestions.length}개 추가`,
      willFill: newQuestions.length > 0,
    });

  function handleImport() {
    if (!hasFill) return;
    onApply(patch);
    toast.success(`핵심 주제에서 ${fillKeys.length}개 항목을 불러왔습니다. 자유롭게 수정할 수 있어요.`);
  }

  return (
    <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-start gap-2">
          <Sparkles size={16} className="mt-0.5 text-primary" />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground">핵심 주제에서 불러오기</p>
            <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">
              주제 탐색·심화에서 지정한 핵심 주제 &ldquo;{core.label}&rdquo; 의 대상·소재·접근·변인·연구문제를 아래 빈 칸에 채웁니다.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleImport}
          disabled={!hasFill}
          title="빈 칸만 채우며, 이미 입력한 값은 덮어쓰지 않습니다."
          className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md border border-input bg-background px-2.5 text-xs font-medium text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ListPlus size={13} />
          빈 칸 채우기
        </button>
      </div>

      {rows.length > 0 && (
        <ul className="mt-2.5 space-y-1 border-t border-primary/15 pt-2.5">
          {rows.map((r) => (
            <li key={r.label} className="flex items-center gap-1.5 text-[11px]">
              <span className="min-w-[68px] font-medium text-muted-foreground">{r.label}</span>
              <span className="flex-1 truncate text-foreground">{r.value}</span>
              <span
                className={
                  r.willFill
                    ? "rounded bg-primary/10 px-1 py-0.5 text-[10px] font-medium text-primary"
                    : "rounded bg-muted px-1 py-0.5 text-[10px] font-medium text-muted-foreground"
                }
              >
                {r.willFill ? "채움" : "입력됨"}
              </span>
            </li>
          ))}
        </ul>
      )}
      {!hasFill && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          핵심 주제의 항목이 이미 모두 입력되어 있어 채울 빈 칸이 없습니다.
        </p>
      )}
    </div>
  );
}
