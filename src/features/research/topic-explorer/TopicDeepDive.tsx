"use client";

/**
 * TopicDeepDive — 주제 심화 질의응답 폼 (P1, 2026-08-10)
 *
 * 저장한 주제 방향을 변인·대상·맥락·연구문제로 좁힌다. 단계형 브랜칭 엔진이
 * 아닌 섹션형 가이드 폼(신규 엔진 없음). seed 로 초기 프리필하고, 이미 저장된
 * deepDive 가 있으면 그걸로 하이드레이션한다. 저장은 useSavedTopics.updateDeepDive.
 *
 * 상위(부모)는 topicId 변경 시 remount 되도록 key={topicId} 를 넘겨야 초기값이
 * 올바르게 반영된다(useState 초기화 1회).
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { Sparkles, Plus, Trash2, Wand2, Save, BookOpen } from "lucide-react";
import { toast } from "sonner";
import type { PaperVariables, TopicDeepDive as TopicDeepDiveData } from "@/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useSavedTopics } from "./useSavedTopics";
import { ddInitialFromSeed, ddDraftResearchQuestions } from "./topic-deepdive-logic";
import VariablesInput from "@/features/research/VariablesInput";

const VAR_KEYS: (keyof PaperVariables)[] = [
  "independent",
  "dependent",
  "mediator",
  "moderator",
  "control",
];

/** 레거시·오염 방어: 각 변인 카테고리를 배열로만 정규화 */
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

function hydrate(
  deepDive: TopicDeepDiveData | undefined,
  seed: Parameters<typeof ddInitialFromSeed>[0],
  approach?: string,
): TopicDeepDiveData {
  if (deepDive) {
    return {
      variables: normalizeVariables(deepDive.variables),
      population: deepDive.population ?? "",
      context: deepDive.context ?? "",
      exclusion: deepDive.exclusion ?? "",
      researchQuestions: Array.isArray(deepDive.researchQuestions)
        ? deepDive.researchQuestions
        : [],
    };
  }
  return ddInitialFromSeed(seed, approach);
}

interface Props {
  topicId: string;
  onDone?: () => void;
}

export default function TopicDeepDive({ topicId, onDone }: Props) {
  const { saved, updateDeepDive } = useSavedTopics();
  const topic = useMemo(() => saved.find((t) => t.id === topicId) ?? null, [saved, topicId]);
  const approach = topic?.approach;
  const isQualitative = approach === "질적";
  // 접근별 연구방법 아카이브 검색어 (없으면 링크 생략)
  const methodQuery =
    approach === "질적"
      ? "질적연구"
      : approach === "양적"
        ? "조사연구"
        : approach === "개발·설계"
          ? "개발연구"
          : approach === "혼합"
            ? "혼합연구"
            : "";

  const [dd, setDd] = useState<TopicDeepDiveData>(() =>
    hydrate(topic?.deepDive, topic?.seed, approach),
  );
  const [saving, setSaving] = useState(false);

  if (!topic) {
    return (
      <p className="rounded-xl border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground">
        대상 주제를 찾을 수 없습니다. 주제 탐색에서 먼저 이 주제를 저장했는지 확인해 주세요.
      </p>
    );
  }

  const questions = dd.researchQuestions ?? [];

  function handleGenerate() {
    const drafts = ddDraftResearchQuestions(dd, approach);
    if (drafts.length === 0) {
      toast.info("변인(독립·종속) 또는 대상·맥락을 먼저 채우면 연구문제를 초안할 수 있어요.");
      return;
    }
    const current = questions.map((q) => q.trim());
    const newOnes = drafts.filter((d) => !current.includes(d.trim()));
    if (newOnes.length === 0) {
      toast.info("이미 같은 연구문제 초안이 목록에 있습니다.");
      return;
    }
    setDd((p) => ({ ...p, researchQuestions: [...(p.researchQuestions ?? []), ...newOnes] }));
    toast.success(`연구문제 초안 ${newOnes.length}개를 추가했어요. 자유롭게 다듬어 보세요.`);
  }

  function setQuestionAt(idx: number, text: string) {
    setDd((p) => ({
      ...p,
      researchQuestions: (p.researchQuestions ?? []).map((q, i) => (i === idx ? text : q)),
    }));
  }
  function removeQuestionAt(idx: number) {
    setDd((p) => ({
      ...p,
      researchQuestions: (p.researchQuestions ?? []).filter((_, i) => i !== idx),
    }));
  }
  function addQuestion() {
    setDd((p) => ({ ...p, researchQuestions: [...(p.researchQuestions ?? []), ""] }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await updateDeepDive(topicId, {
        variables: normalizeVariables(dd.variables),
        population: dd.population?.trim() ?? "",
        context: dd.context?.trim() ?? "",
        exclusion: dd.exclusion?.trim() ?? "",
        researchQuestions: (dd.researchQuestions ?? []).map((q) => q.trim()).filter(Boolean),
      });
      onDone?.();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-warning/30 bg-warning/5 p-3.5">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-warning">
          <Sparkles size={13} /> 주제 심화 — 더 좁히기
        </p>
        <p className="mt-1 text-sm font-medium leading-snug text-foreground">{topic.label}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          변인·대상·맥락·연구문제로 구체화하면 연구보고서에 바로 불러올 수 있어요. 최종 설계는 지도교수와 상의하세요.
        </p>
      </div>

      {/* 변인 */}
      <section className="space-y-2">
        <div>
          <h4 className="text-sm font-semibold text-foreground">연구 변인</h4>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {isQualitative
              ? "질적 연구에서는 변인보다 맥락·경험이 중심입니다 — 필요할 때만 선택 입력하세요."
              : "바꾸려는 것(독립)과 달라지길 기대하는 것(종속)을 먼저 채워보세요."}
          </p>
        </div>
        <VariablesInput
          value={dd.variables ?? {}}
          onChange={(next) => setDd((p) => ({ ...p, variables: next }))}
        />
      </section>

      {/* 대상·맥락·제외 */}
      <section className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-foreground">연구 대상 (구체화)</label>
          <Textarea
            value={dd.population ?? ""}
            onChange={(e) => setDd((p) => ({ ...p, population: e.target.value }))}
            placeholder="예: 서울 소재 중학교 2학년 2개 학급 (약 60명)"
            rows={2}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-foreground">환경·기간·도구 (맥락)</label>
          <Textarea
            value={dd.context ?? ""}
            onChange={(e) => setDd((p) => ({ ...p, context: e.target.value }))}
            placeholder="예: 1학기 8주간 대면 수업, 태블릿 기반 협력 도구 활용"
            rows={2}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-foreground">제외·한정 범위 (선택)</label>
          <Textarea
            value={dd.exclusion ?? ""}
            onChange={(e) => setDd((p) => ({ ...p, exclusion: e.target.value }))}
            placeholder="예: 특수교육 대상 학생·전학생은 분석에서 제외"
            rows={2}
          />
        </div>
      </section>

      {/* 연구문제 */}
      <section className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-semibold text-foreground">연구문제 초안</h4>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              위 변인·대상·맥락으로 문장을 자동 초안한 뒤 다듬으세요.
            </p>
          </div>
          <button
            type="button"
            onClick={handleGenerate}
            className="inline-flex h-8 items-center gap-1 rounded-md border border-input bg-background px-2.5 text-xs font-medium text-foreground hover:bg-muted"
          >
            <Wand2 size={13} /> 자동 초안 생성
          </button>
        </div>
        <div className="space-y-2">
          {questions.map((q, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="mt-2.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/10 px-1.5 text-[11px] font-bold text-primary">
                {i + 1}
              </span>
              <Textarea
                value={q}
                onChange={(e) => setQuestionAt(i, e.target.value)}
                placeholder="연구문제를 입력하거나 위에서 자동 초안하세요…"
                rows={2}
                className="flex-1"
              />
              <button
                type="button"
                onClick={() => removeQuestionAt(i)}
                aria-label={`연구문제 ${i + 1} 삭제`}
                className="mt-2 rounded-md p-1.5 text-muted-foreground hover:bg-destructive/5 hover:text-destructive"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addQuestion}
            className="inline-flex h-8 items-center gap-1 rounded-md border border-dashed border-input px-2.5 text-xs font-medium text-muted-foreground hover:bg-muted"
          >
            <Plus size={13} /> 연구문제 추가
          </button>
        </div>
      </section>

      {methodQuery && (
        <Link
          href={`/archive/research-methods?q=${encodeURIComponent(methodQuery)}`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
        >
          <BookOpen size={13} />
          관련 연구방법 살펴보기 ({methodQuery})
        </Link>
      )}

      <div className="flex justify-end gap-2 border-t pt-3">
        {onDone && (
          <Button variant="outline" size="sm" onClick={onDone} disabled={saving}>
            닫기
          </Button>
        )}
        <Button size="sm" onClick={handleSave} disabled={saving}>
          <Save size={13} className="mr-1" />
          심화 저장
        </Button>
      </div>
    </div>
  );
}
