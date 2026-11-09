# 기여 가이드 (연세교육공학회 웹사이트)

이 레포는 [`yonsei-edtech`](https://github.com/yonsei-edtech) 조직이 관리합니다.
처음 참여하는 분은 이 문서를 끝까지 읽은 뒤 작업을 시작해 주세요.

- 서비스: https://yonsei-edtech.vercel.app
- 스택: Next.js (App Router) · TypeScript · Tailwind · Firebase(Auth/Firestore/Storage) · Vercel

---

## 1. 로컬 개발 환경

**필요한 것**: Node.js 22 이상 (권장 24 — Vercel·CI와 동일), npm, Git

```bash
git clone https://github.com/yonsei-edtech/yonsei-edtech.git
cd yonsei-edtech
npm install
cp .env.example .env.local   # 값은 운영진에게 받기 (아래 참고)
npm run dev                  # http://localhost:3000
```

### 환경변수

`.env.example`에 키 목록이 있습니다. **실제 값은 절대 커밋하지 말고**, 운영진(조직 Owner)에게 개별로 전달받으세요.

| 변수 | 필요한 경우 |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT_KEY` | 서버 API(`/api/**`)를 로컬에서 실행할 때 (서비스 계정 JSON의 base64) |
| `GOOGLE_GENERATIVE_AI_API_KEY`, `OPENAI_API_KEY` | AI 기능 |
| `RESEND_API_KEY`, `RESEND_FROM` | 메일 발송 |
| `CRON_SECRET` | 크론 엔드포인트 |
| `NEXT_PUBLIC_FIREBASE_*` | 비워두면 기본(프로덕션) 웹 설정을 사용 |

> ⚠️ 서비스 계정 키·API 키는 슬랙/카톡 단체방, 이슈, PR에 붙여 넣지 마세요. 유출 시 즉시 Owner에게 알려 키를 폐기합니다.

---

## 2. 작업 흐름

`master`는 보호 브랜치입니다. **직접 push는 막혀 있고 PR로만 병합**됩니다.

1. 최신 master에서 브랜치 생성
   ```bash
   git switch master && git pull
   git switch -c feat/짧은-설명      # 예: feat/seminar-qna, fix/mypage-crash
   ```
2. 작업 후 로컬 검증 (CI와 동일)
   ```bash
   npx tsc --noEmit        # 타입 검사
   npx eslint src --quiet  # lint 오류 (경고는 아래 ratchet이 관리)
   npm test                # 단위 테스트
   npm run build           # 빌드 (prebuild ratchet 포함)
   ```
3. push 후 PR 생성 → PR 템플릿 체크리스트 작성
4. **CI(`build`) 통과 + 리뷰 승인 1명** 이후 병합 (Squash merge 권장)

### 브랜치 접두사
`feat/` 기능 · `fix/` 버그 · `refactor/` 구조 개선 · `docs/` 문서 · `chore/` 설정·잡무

### 커밋 메시지
`타입(영역): 설명` 형식, 설명은 한국어 OK
```
feat(seminar): 라이브 Q&A 좋아요 정렬 추가
fix(mypage): 진단 문서 weakConceptIds 누락 시 크래시 수정
```

---

## 3. 품질 규칙 (ratchet)

빌드 전에 자동 실행되며, **기존 수치보다 늘어나면 빌드가 실패**합니다.

- **Raw color ratchet** — Tailwind 기본 팔레트(`bg-blue-500` 등) 직접 사용 금지. 시맨틱 토큰(`bg-primary`, `text-muted-foreground` 등)을 쓰세요. 디자인 기준은 `DESIGN.md`.
- **ESLint warning ratchet** — 경고 수 증가 금지. 손댄 파일의 경고는 가능하면 줄여 주세요.
- **Dead code** — `npm run lint:deadcode`로 미사용 export 확인.

---

## 4. 코드 컨벤션

- 경로 별칭 `@/` = `src/`
- 구조: `src/app`(라우트) · `src/features/<도메인>`(기능 컴포넌트) · `src/components`(공용 UI) · `src/lib`(유틸·데이터 접근) · `src/types`
- **운영 콘솔(`/console/**`) 신규 페이지는 `ConsolePage` 래퍼 사용** — 세부 규칙은 `CLAUDE.md`의 "운영 콘솔 페이지 컨벤션"
- 서버 API는 `requireAuth(req, role)`(`src/lib/api-auth.ts`)로 권한 확인. 비로그인 API는 개인정보를 반환하지 말고 rate limit 적용
- Firestore 보안 규칙(`firestore.rules`)을 바꾸는 PR은 **Owner 리뷰 필수**, 규칙 배포도 Owner가 수행
- 외부/레거시 데이터는 필드 누락을 전제로 옵셔널 처리(`?.`, `?? []`) — 실제 장애 원인 1순위

---

## 5. 배포 (Owner/배포 담당만)

일반 기여자는 **PR 병합까지만** 하면 됩니다. 배포는 배포 담당이 수행합니다.

```bash
npm run build
npm run deploy:vercel     # 토큰 기반 Vercel 프로덕션 배포 (VERCEL_TOKEN_YONSEI 필요)
```

- GitHub Actions `deploy.yml`은 **수동 실행 전용**이며 사용하지 않습니다(다른 Vercel 계정으로 배포되어 alias가 깨짐).
- `npx vercel --prod`를 직접 쓰지 마세요 — 로그인 계정에 따라 잘못된 프로젝트로 배포될 수 있습니다.
- 배포 후 새로 추가한 라우트가 200을 반환하는지 확인합니다.
  ```bash
  curl -s -o /dev/null -w "%{http_code}" https://yonsei-edtech.vercel.app/<새_라우트>
  ```

---

## 6. 권한 구조

| 역할 | 대상 | 권한 |
|---|---|---|
| Owner | 회장단·관리 계정 | 조직·레포 전체, 배포, 시크릿 |
| Member (Write) | 개발 담당 | 브랜치 push, PR 생성·리뷰 |

권한 요청·문의는 조직 Owner에게 연락해 주세요.
