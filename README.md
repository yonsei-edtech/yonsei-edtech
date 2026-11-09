# 연세교육공학회 웹사이트

연세대학교 교육공학 전공 학회의 공식 웹사이트입니다. 학회 소개·세미나/학술활동·아카이브·논문 연구 지원·운영 콘솔을 제공합니다.

- **서비스**: https://yonsei-edtech.vercel.app
- **스택**: Next.js (App Router) · TypeScript · Tailwind · Firebase · Vercel
- **관리**: [`yonsei-edtech`](https://github.com/yonsei-edtech) GitHub 조직

## 빠른 시작

```bash
npm install
cp .env.example .env.local   # 값은 운영진에게 전달받기
npm run dev                  # http://localhost:3000
```

## 주요 명령

| 명령 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 |
| `npm test` | 단위 테스트 (vitest) |
| `npm run build` | 프로덕션 빌드 (품질 ratchet 포함) |
| `npm run lint:deadcode` | 미사용 코드 점검 |
| `npm run deploy:vercel` | 프로덕션 배포 (배포 담당 전용) |

## 문서

- [CONTRIBUTING.md](CONTRIBUTING.md) — 작업 흐름·브랜치/PR 규칙·배포 절차 (**처음 참여 시 필독**)
- [DESIGN.md](DESIGN.md) — 디자인 토큰·UI 기준
- [SECURITY.md](SECURITY.md) — 보안 정책
- `docs/` — 기획·보고서
