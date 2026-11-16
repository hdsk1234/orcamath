# ORCA 수학

Vinext·React 기반 학습관리 서비스를 Cloudflare Workers와 D1으로 운영합니다.
Worker 이름은 `orca-math`, D1 이름은 `orca-db`, 코드의 DB 연결 이름은 `DB`입니다.
`wrangler.jsonc`에 기존 D1의 Database ID와 정적 파일 연결을 설정합니다.
운영 주소는 `https://orca-math.hdsk123489.workers.dev`입니다.

## 개발 환경

Node.js 22.13 이상과 pnpm 11.25.0을 사용합니다.

```sh
pnpm install --frozen-lockfile
npm run db:migrate:local
npm run dev
```

개발 서버의 기본 주소는 `http://127.0.0.1:5174`입니다.
개발 환경은 `.wrangler/state`의 로컬 D1을 사용합니다.
로컬 설정은 `.dev.vars`에 저장하며 Git에서 제외합니다.

## 빌드와 검증

```sh
npm run build
npm start
npm run deploy:check
```

빌드 결과는 `dist/client`의 정적 파일과 `dist/server/index.js`의 Worker입니다.
Cloudflare Vite 플러그인이 `dist/server/wrangler.json`을 생성합니다.
`start`는 빌드 결과를 로컬에서 실행하고, `deploy:check`는 실제 업로드 없이
배포 패키지와 바인딩을 검사합니다.

## Cloudflare 배포

기존 `orca-db`가 있는 Cloudflare 계정으로 Wrangler에 로그인합니다.

```sh
npx wrangler login
npm run db:migrate:remote
npm run deploy
```

`db:migrate:remote`는 `drizzle`의 미적용 마이그레이션을 운영 D1에 적용합니다.
기존 데이터 이전은 별도 작업입니다. 원장 계정 초기화와 기존 회원의 소셜
로그인 연결도 운영 전환 전에 확인해야 합니다. 직원 계정은 서버의
`app/lib/staff-access.ts`에 구글 이메일·역할·담당 강사를 사전등록합니다.
등록된 직원은 구글 인증 후 승인 없이 연결되며, 이메일 미정인 직원은
등록 후 이용할 수 있습니다. 변경 전 직원 세션은 재로그인이 필요합니다.
`deploy`는 새 Worker 코드를 Cloudflare에 올립니다.

## 로그인과 비밀값

현재 구글 로그인만 활성화합니다. `ORCA_LOGIN_ORIGIN`은
`https://orca-math.hdsk123489.workers.dev`이며, 구글 콜백 주소는 다음과 같습니다.

- `https://orca-math.hdsk123489.workers.dev/api/auth/callback/google`

세션 비밀키는 Cloudflare Secrets에 등록합니다.

```sh
npx wrangler secret put ORCA_LOGIN_SECRET
```

사용할 공급자의 `<공급자>_CLIENT_ID`, `<공급자>_CLIENT_SECRET`,
`<공급자>_LOGIN_ENABLED=true`를 설정합니다. 공급자 접두사는 `GOOGLE`,
`KAKAO`, `NAVER`입니다. 세부 사항은 `LOGIN-OPERATIONS.md`를 참고하세요.
AI 진단 연결과 `OPENAI_API_KEY` 등록은 보류 상태입니다.
운영 비밀값은 소스와 빌드 파일에 넣지 않습니다.

## 파일 기능

R2를 연결하지 않으며 파일 첨부·다운로드는 비활성 상태입니다.
파일 선택창과 기존 첨부 링크는 비활성 안내를 표시하고 파일 API는 503을
반환합니다. 사진·PDF가 필요한 학생 과제 제출은 사용할 수 없습니다.
기상 인증, 텍스트 질문·진단 답안, 담당자 확인과 공개 정적 자료는 이용할 수 있습니다.
기존 첨부가 필요한 AI 진단은 실행 전에 비활성 안내를 반환합니다.
