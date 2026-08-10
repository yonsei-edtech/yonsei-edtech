"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { researchReportsApi } from "@/lib/bkend";
import type { ResearchReport } from "@/types";

export function useResearchReport(userId: string | undefined) {
  const { data, isLoading } = useQuery({
    queryKey: ["research_report", userId ?? "guest"],
    queryFn: async () => {
      if (!userId) return undefined;
      const res = await researchReportsApi.listByUser(userId);
      const sorted = [...res.data].sort((a, b) =>
        (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "")
      );
      // QA-v3 M: react-query v5 는 undefined resolve 를 에러로 처리 — 문서 0건이면 null
      return (sorted[0] ?? null) as ResearchReport | null;
    },
    enabled: !!userId,
    staleTime: 1000 * 30,
  });
  return { report: data, isLoading };
}

export function useEnsureResearchReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      seed,
    }: {
      userId: string;
      /** 빈 문서 최초 생성 시에만 적용되는 시드값(비파괴 — 기존 문서엔 미적용) */
      seed?: Partial<ResearchReport>;
    }): Promise<ResearchReport> => {
      const res = await researchReportsApi.listByUser(userId);
      if (res.data.length > 0) {
        const sorted = [...res.data].sort((a, b) =>
          (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "")
        );
        return sorted[0];
      }
      const created = await researchReportsApi.create({
        userId,
        fieldDescription: "",
        fieldProblem: "",
        problemPhenomenon: "",
        problemEvidence: "",
        problemCause: "",
        problemDefinition: "",
        theoryType: "",
        theoryDefinition: "",
        theoryConnection: "",
        priorResearchAnalysis: "",
        priorResearchPaperIds: [],
        priorResearchGroups: [],
        // v2 신규
        fieldAudience: "",
        fieldFormat: "",
        fieldSubject: "",
        problemPhenomena: [],
        problemEvidences: [],
        problemCauses: [],
        problemImpact: "",
        problemImportance: "",
        scopeAudience: "",
        scopeContext: "",
        scopeExclusion: "",
        problemMeasurements: [],
        // v2 — 2. 교육공학 이론 신규
        theoryCards: [],
        theoryRelationProblem: "",
        theoryRelationRoles: "",
        theoryRelationIntegration: "",
        // 빈값 defaults 뒤에 시드를 spread — 값이 있는 필드만 덮어씀(비파괴)
        ...(seed ?? {}),
      });
      return created;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["research_report", vars.userId] });
    },
  });
}

export function useUpdateResearchReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      researchReportsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["research_report"] });
    },
  });
}
