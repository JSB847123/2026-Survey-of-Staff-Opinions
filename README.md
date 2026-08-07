# 2026 직원 의견 설문조사

HWPX / DOCX / PDF 설문 파일을 업로드하면 자동으로 웹 설문으로 변환하고,
응답 수집 · 통계 · AI 분석까지 제공하는 직원 의견 설문조사 플랫폼입니다.

## 주요 기능

- **설문 파일 자동 변환** — HWPX(ZIP+XML 직접 해석), DOCX(mammoth), PDF(pdfjs-dist) 파일에서
  문항·체크박스 선택지를 자동 추출 (파일 최대 500KB, MIME/시그니처 검증)
- **설문 편집·게시** — 문항 추가/수정/삭제/순서 변경, 필수 설정, 미리보기, 게시/중지/종료
- **응답자 회원 가입/로그인** — 숫자 4자리 ID/비밀번호로 직접 가입 (Argon2id 해시 저장),
  로그인 후 게시된 설문 목록에서 참여
- **최대 13명 제한** — 응답자 계정 전체 13개 제한 + 설문별 응답 13명 제한
  (DB 수준 원자적 UPDATE로 동시 제출에도 정원 초과 차단)
- **중복 응답 방지** — DB unique constraint 기반 (설문별 계정당 1회)
- **권한(RBAC)** — 관리자(admin) / 확인자(reviewer) 역할 선택 로그인,
  모든 보호 API에서 서버 측 검증
- **통계** — 객관식 선택지별 인원/비율을 서버에서 계산해 차트로 표시
- **AI 분석** — GPT-5.6 Luna / DeepSeek V4 Flash, 결과 DB 저장·재사용, 두 모델 비교
- **보안** — HTTP-only 세션 쿠키(JWT), rate limiting, 계정 잠금, Zod 검증,
  prompt injection 방어, Supabase Private Storage
- **UI** — 다크 모드 기본(라이트 전환 가능), 모바일 대응, 접근성 고려

## 기술 스택

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · shadcn/ui ·
Prisma 6 · Supabase (PostgreSQL + Storage) · Zod · Vitest · Playwright

## 로컬 실행

```bash
npm install            # postinstall에서 prisma generate 실행됨
cp .env.example .env   # 아래 '환경변수' 참고하여 값 입력
npx prisma migrate deploy
npm run dev
```

- 운영자 로그인: `/staff/login`에서 관리자/확인자 선택 후 Access Code 입력
  (ADMIN_ACCESS_CODE / REVIEWER_ACCESS_CODE)
- 응답자: 메인 화면 → 설문 응답 → 회원 가입(숫자 4자리 ID/PW) → 로그인 →
  설문 목록에서 참여. 설문 직링크 `/s/{slug}` 공유도 가능

## Supabase 설정

1. [Supabase](https://supabase.com)에서 프로젝트 생성
2. **Database** — 연결 문자열 확인
   - `DATABASE_URL`: Transaction pooler(포트 6543) + `?pgbouncer=true&connection_limit=1`
   - `DIRECT_URL`: Session pooler(포트 5432) 또는 direct 연결 (마이그레이션용)
3. **Storage** — private 버킷 생성 (예: `survey-files`, 파일 크기 제한 512000 bytes 권장)
4. **API Keys** — `NEXT_PUBLIC_SUPABASE_URL`, publishable key, `service_role` key 확인

## Prisma 마이그레이션

```bash
npx prisma migrate deploy   # 배포/최초 설정
npx prisma migrate dev      # 스키마 변경 시 (개발)
npx prisma studio           # 데이터 확인
```

## 환경변수

`.env.example` 참고. 실제 값은 `.env`(로컬) 또는 Vercel Environment Variables에만 설정하세요.

| 변수 | 설명 |
|------|------|
| `DATABASE_URL` | Supabase pooled 연결 (런타임) |
| `DIRECT_URL` | 마이그레이션용 직접/세션 연결 |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Storage 서버 업로드용 (server only) |
| `SUPABASE_STORAGE_BUCKET` | private 버킷 이름 (예: survey-files) |
| `STORAGE_DRIVER` | `supabase`(기본) 또는 `local`(개발/테스트 전용) |
| `OPENAI_API_KEY` | GPT 분석용 |
| `DEEPSEEK_API_KEY` | DeepSeek 분석용 |
| `ADMIN_ACCESS_CODE` | 관리자 Access Code |
| `REVIEWER_ACCESS_CODE` | 확인자 Access Code |
| `SESSION_SECRET` | 세션 서명 시크릿 (32자 이상 랜덤 문자열) |

> ⚠️ Access Code·API Key를 코드/README에 커밋하지 마세요.
> `NEXT_PUBLIC_` 접두사가 붙은 시크릿 변수를 만들면 안 됩니다.

## OpenAI / DeepSeek 설정

- OpenAI: `OPENAI_API_KEY` 설정 → 모델 `gpt-5.6-luna`
- DeepSeek: `DEEPSEEK_API_KEY` 설정 → 모델 `deepseek-v4-flash` (OpenAI 호환 API 사용)
- 키가 없으면 분석 버튼 클릭 시 명확한 한국어 오류가 표시됩니다.
- AI에는 익명화된 통계·주관식 응답만 전달되며, 응답자 ID/비밀번호/세션 정보는 전달되지 않습니다.

## 테스트

```bash
npm run lint        # ESLint
npm run typecheck   # next typegen + tsc
npm test            # Vitest (단위 + DB 통합: 13명 제한/중복/race condition)
npm run test:e2e    # Playwright (관리자→게시→응답→중복차단→권한 검증)
npm run build       # production build
```

- DB 통합 테스트는 `DATABASE_URL`이 설정된 경우에만 실행됩니다.
- E2E는 dev 서버(포트 3100)를 자동 실행하며 `.env`의 Access Code를 사용합니다.
- AI provider는 자동 테스트에서 실제 API를 호출하지 않습니다.

## Vercel 배포

1. GitHub 저장소를 Vercel에 연결 (Framework: Next.js, 기본 빌드 설정)
2. 위 환경변수를 모두 설정 (`STORAGE_DRIVER`는 설정하지 않거나 `supabase`)
3. 최초 배포 전 로컬에서 `npx prisma migrate deploy`로 스키마 적용
   (Vercel 빌드에서 DB 마이그레이션/시드를 자동 실행하지 않습니다)
4. 배포 후 `/staff/login`에서 Access Code로 로그인해 확인

## 프로젝트 구조

```
src/
  app/              # App Router (staff 운영자 화면, s/[slug] 응답자 화면, api/*)
  components/       # UI 컴포넌트 (shadcn/ui + 화면별 컴포넌트)
  lib/
    parsing/        # HWPX/DOCX/PDF 파서 (server-only)
    analysis/       # AI provider 추상화 (OpenAI/DeepSeek)
    storage/        # Supabase Private Storage / 로컬 드라이버
    submit.ts       # 응답 제출 트랜잭션 (13명 제한·중복 방지)
prisma/             # 스키마·마이그레이션
tests/              # Vitest 단위·통합 테스트
e2e/                # Playwright E2E
```
