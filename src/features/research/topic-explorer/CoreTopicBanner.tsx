"use client";

/**
 * 핵심 주제 배너 (2026-07-30 사용자 요청, P1 액션 승격 2026-08-10)
 *
 * 주제 탐색에서 지정한 "핵심 주제"를 논문 읽기·연구보고서 등 관련 화면 상단에
 * 노출한다. 핵심 주제가 없으면 아무것도 렌더하지 않는다(미노출).
 * 조회는 공용 훅 useCoreTopic() 재사용.
 *
 * P1-3: 표시 전용 → CTA 2개 추가.
 *  - "심화하기": 핵심 주제 심화 폼(Dialog) 열기 (자체 내장 — 별도 배선 불필요).
 *  - "보고서에 불러오기": importHref 로 이동 (기본 연구보고서 탭). onImport 콜백 우선.
 * 기존 사용처(`<CoreTopicBanner />`)는 모든 기본값으로 하위호환.
 */

import { useState } from "react";
import Link from "next/link";
import { Star, ArrowRight, Target, ListPlus } from "lucide-react";
import { useCoreTopic } from "./useSavedTopics";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import TopicDeepDive from "./TopicDeepDive";

interface Props {
  /** 우측 이동 링크 목적지 (기본: 주제 탐색 탭) */
  href?: string;
  /** "보고서에 불러오기" 이동 목적지 (기본: 연구보고서 탭) */
  importHref?: string;
  /** "보고서에 불러오기" 콜백 — 지정 시 링크 대신 호출 */
  onImport?: () => void;
}

export default function CoreTopicBanner({
  href = "/mypage/research?tab=explore",
  importHref = "/mypage/research?tab=reportdoc",
  onImport,
}: Props) {
  const core = useCoreTopic();
  const [deepOpen, setDeepOpen] = useState(false);
  if (!core) return null;

  return (
    <div className="rounded-2xl border border-warning/30 bg-warning/5 p-3.5">
      <div className="flex items-start gap-2.5">
        <Star size={16} className="mt-0.5 shrink-0 fill-warning text-warning" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold text-warning">내 핵심 주제</p>
          <p className="mt-0.5 text-sm font-medium leading-snug text-foreground">{core.label}</p>
          {core.approach && (
            <p className="mt-0.5 text-[11px] text-muted-foreground">연구 접근: {core.approach}</p>
          )}
        </div>
        <Link
          href={href}
          className="inline-flex shrink-0 items-center gap-1 self-center rounded-lg border border-warning/30 bg-card px-2.5 py-1.5 text-[11px] font-medium text-warning transition-colors hover:bg-warning/10"
        >
          주제 탐색 <ArrowRight size={11} />
        </Link>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-warning/15 pt-2.5">
        <button
          type="button"
          onClick={() => setDeepOpen(true)}
          className="inline-flex h-8 items-center gap-1 rounded-md border border-input bg-background px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
        >
          <Target size={13} />
          심화하기
        </button>
        {onImport ? (
          <button
            type="button"
            onClick={onImport}
            className="inline-flex h-8 items-center gap-1 rounded-md border border-input bg-background px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
          >
            <ListPlus size={13} />
            보고서에 불러오기
          </button>
        ) : (
          <Link
            href={importHref}
            className="inline-flex h-8 items-center gap-1 rounded-md border border-input bg-background px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
          >
            <ListPlus size={13} />
            보고서에 불러오기
          </Link>
        )}
      </div>

      <Dialog open={deepOpen} onOpenChange={setDeepOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>주제 심화 질의응답</DialogTitle>
            <DialogDescription>
              핵심 주제를 변인·대상·맥락·연구문제로 좁혀 연구보고서에 바로 연결하세요.
            </DialogDescription>
          </DialogHeader>
          {deepOpen && (
            <TopicDeepDive key={core.id} topicId={core.id} onDone={() => setDeepOpen(false)} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
