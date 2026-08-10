"use client";

/**
 * 운영 콘솔 — 회원 기수(generation) 재산정 마이그레이션 UI
 *
 * 기수 공식은 이미 1998년 전기(3월) = 1기 기준: generation = (year - 1998) * 2 + half
 * (lib/generation.ts, 신규가입·프로필수정 시 자동 적용).
 * 이 화면은 **저장된 generation 값이 공식 산정값과 다른 회원**(레거시·수기 입력분)을
 * enrollmentYear/enrollmentHalf 로부터 재계산해 운영진이 일괄/개별 보정한다.
 *
 * 대상: enrollmentYear 있음 AND enrollmentHalf ∈ {1,2} AND 산정값>0 AND 저장값과 다름.
 * 회원 데이터 쓰기이므로 적용은 운영진이 트리거(자동 실행 없음).
 */

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowRight, Check, Hash, Loader2 } from "lucide-react";
import AuthGuard from "@/features/auth/AuthGuard";
import { profilesApi } from "@/lib/bkend";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/ui/empty-state";
import SkeletonWidget from "@/components/ui/skeleton-widget";
import ConsolePageHeader from "@/components/admin/ConsolePageHeader";
import { calcGeneration } from "@/lib/generation";
import type { User } from "@/types";

interface RecalcRow {
  user: User;
  current: number;
  computed: number;
  enrollmentLabel: string;
}

function enrollmentLabel(year: number, half: number): string {
  return `${year}년 ${half === 1 ? "전기(3월)" : "후기(9월)"}`;
}

function RecalcPageContent() {
  const qc = useQueryClient();
  const { data: usersRes, isLoading } = useQuery({
    queryKey: ["console-recalc-generation"],
    queryFn: () => profilesApi.list({ limit: 1000 }),
    staleTime: 60_000,
  });

  const allUsers = useMemo(() => (usersRes?.data ?? []) as User[], [usersRes]);

  // 재산정 가능한 회원: 입학 정보 보유
  const withEnrollment = useMemo(
    () =>
      allUsers.filter(
        (u) => !!u.enrollmentYear && (u.enrollmentHalf === 1 || u.enrollmentHalf === 2),
      ),
    [allUsers],
  );

  // 보정 대상: 산정값(>0)이 저장값과 다른 회원
  const targets: RecalcRow[] = useMemo(() => {
    return withEnrollment
      .map((u) => {
        const computed = calcGeneration(u.enrollmentYear, u.enrollmentHalf);
        return {
          user: u,
          current: typeof u.generation === "number" ? u.generation : 0,
          computed,
          enrollmentLabel: enrollmentLabel(u.enrollmentYear as number, u.enrollmentHalf as number),
        };
      })
      .filter((r) => r.computed > 0 && r.computed !== r.current)
      .sort((a, b) => a.computed - b.computed);
  }, [withEnrollment]);

  // 입학 정보가 없어 재산정 불가한 회원 수 (참고)
  const missingCount = allUsers.length - withEnrollment.length;

  const [savingId, setSavingId] = useState<string | null>(null);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkDone, setBulkDone] = useState(0);

  async function applyOne(row: RecalcRow): Promise<boolean> {
    try {
      await profilesApi.update(row.user.id, { generation: row.computed });
      return true;
    } catch (err) {
      toast.error(`${row.user.name} 저장 실패: ${(err as Error).message}`);
      return false;
    }
  }

  async function save(row: RecalcRow) {
    setSavingId(row.user.id);
    const ok = await applyOne(row);
    if (ok) {
      toast.success(`${row.user.name} — ${row.current}기 → ${row.computed}기 저장 완료`);
      await qc.invalidateQueries({ queryKey: ["console-recalc-generation"] });
    }
    setSavingId(null);
  }

  async function applyAll() {
    if (bulkRunning || targets.length === 0) return;
    if (
      !window.confirm(
        `${targets.length}명의 기수를 1998 전기=1기 공식 산정값으로 일괄 보정합니다. 진행할까요?`,
      )
    )
      return;
    setBulkRunning(true);
    setBulkDone(0);
    let success = 0;
    for (const row of targets) {
      const ok = await applyOne(row);
      if (ok) success += 1;
      setBulkDone((n) => n + 1);
    }
    setBulkRunning(false);
    toast.success(`일괄 보정 완료 — ${success}/${targets.length}명 저장`);
    await qc.invalidateQueries({ queryKey: ["console-recalc-generation"] });
  }

  return (
    <div className="space-y-6">
      <ConsolePageHeader
        icon={Hash}
        title="회원 기수 재산정 (1998 전기 = 1기)"
        description="기수 공식은 이미 1998년 전기(3월)=1기 기준입니다. 이 화면은 저장된 기수가 입학학기 기준 산정값과 다른 회원(레거시·수기 입력분)을 찾아 보정합니다. 신규가입·프로필수정은 이미 공식으로 자동 저장됩니다."
      />

      {isLoading ? (
        <SkeletonWidget rows={3} />
      ) : targets.length === 0 ? (
        <EmptyState
          icon={Check}
          title="보정할 회원이 없습니다"
          description={`입학 정보 보유 ${withEnrollment.length}명의 기수가 모두 1998 전기=1기 공식과 일치합니다.${
            missingCount > 0 ? ` (입학 정보 미등록 ${missingCount}명은 재산정 대상 아님)` : ""
          }`}
        />
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              보정 대상 {targets.length}명 · 입학 정보 미등록 {missingCount}명은 재산정 불가.
              각 행의 &lsquo;적용&rsquo; 또는 아래 일괄 보정으로 저장하세요.
            </p>
            <Button type="button" size="sm" onClick={applyAll} disabled={bulkRunning}>
              {bulkRunning ? (
                <>
                  <Loader2 size={13} className="mr-1 animate-spin" />
                  보정 중… {bulkDone}/{targets.length}
                </>
              ) : (
                <>전체 일괄 보정 ({targets.length}명)</>
              )}
            </Button>
          </div>

          {targets.map((row) => (
            <div key={row.user.id} className="rounded-2xl border bg-card p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold">
                    {row.user.name}
                    <span className="ml-2 text-xs text-muted-foreground">
                      {row.user.studentId ?? "학번 -"} · 입학 {row.enrollmentLabel}
                    </span>
                  </p>
                  <p className="mt-1 flex items-center gap-2 text-sm">
                    <span className="rounded-md bg-muted px-2 py-0.5 font-medium text-muted-foreground">
                      현재 {row.current}기
                    </span>
                    <ArrowRight size={14} className="text-muted-foreground" />
                    <span className="rounded-md bg-primary/10 px-2 py-0.5 font-semibold text-primary">
                      {row.computed}기
                    </span>
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => save(row)}
                  disabled={savingId === row.user.id || bulkRunning}
                >
                  {savingId === row.user.id ? "저장 중…" : "적용"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function RecalcGenerationPage() {
  return (
    <AuthGuard allowedRoles={["admin", "sysadmin"]}>
      <RecalcPageContent />
    </AuthGuard>
  );
}
