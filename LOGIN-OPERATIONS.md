# ORCA 로그인 운영

회원·학생 기록의 기준 키는 기존 membership user_id입니다. Google/Kakao/Naver에서 받은 식별자는 공급자별로 해시하여 login_identities에 저장합니다. 이름·이메일 일치만으로 회원을 합치지 않습니다.

- `/login`: 일반 로그인·가입 시작
- `/login?connect=1`: 승인된 기존 회원이 로그인 방식을 추가합니다. 원장 계정도 먼저 기존 계정으로 로그인한 상태에서 연결해야 권한이 유지됩니다.
- `/login?test=1`: 원장만 검수 중인 서비스 버튼을 점검할 수 있습니다. 새 계정으로 시작하는 흐름이며, 자동으로 기존 계정에 연결하지 않습니다.
- `/privacy`: 운영자 및 정보 이용 안내
- `/logout`: 이 기기의 소셜 로그인 세션 종료

로그아웃 확인 폼은 `/api/logout`으로 같은 출처의 POST 요청을 보냅니다. 소셜 로그인 설정·비밀키와 관계없이 이 기기의 세션 쿠키(분할 쿠키 포함)와 계정 연결 쿠키를 만료시킵니다. 종료 후 `/login`으로 돌아옵니다.

신규 회원은 학생·학부모를 선택해 가입 신청 후 관리자 승인을 받습니다. 직원 이름은 신청 역할의 기본값만 정하며 관리자 권한은 승인·초대코드로 부여합니다. 학부모 역시 관리자 확인 또는 초대코드로 자녀에 연결합니다.

## 서버 설정

운영 비밀값은 Cloudflare Workers Secrets에 저장합니다. 로컬 비밀값은 Git에서 제외하는 `.dev.vars`에 저장합니다.

- `ORCA_LOGIN_SECRET`: 암호화 쿠키용 서버 비밀키
- `ORCA_LOGIN_ORIGIN`: 실제 Cloudflare 운영 주소로 설정
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_LOGIN_ENABLED`
- `KAKAO_CLIENT_ID`, `KAKAO_CLIENT_SECRET`, `KAKAO_LOGIN_ENABLED`
- `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`, `NAVER_LOGIN_ENABLED`
- `<공급자>_LOGIN_PUBLIC_READY`: `false`이면 일반 로그인 버튼을 준비 상태로 표시합니다. 검수 승인 후 `true`로 변경하고 다시 배포합니다.

인증 복귀 주소는 운영 주소의 `/api/auth/callback/google`, `/api/auth/callback/kakao`, `/api/auth/callback/naver`입니다. URL을 바꾸면 각 개발자센터의 허용 주소도 함께 변경해야 합니다.

Auth.js가 OAuth state, Google PKCE, CSRF 및 암호화 세션 쿠키를 처리합니다. 서버에서 매 요청 시 회원 연결과 권한을 확인합니다. 연결 요청은 8분간 유효하고 한 번만 사용할 수 있습니다. 다른 가입 기록이 존재하는 계정은 자동 병합하지 않습니다.

## 일반 공개 준비

개발자센터의 앱 등록은 검수 승인과 다릅니다. Google의 브랜딩·게시 상태와 네이버 검수 상태를 실제 콘솔에서 확인한 후 공개 준비 플래그를 변경합니다. 공개 전에는 각 공급자로 로그인 → 신규 가입 신청 화면 → 기존 계정 연결 → 본래 권한 유지 → 로그아웃을 점검합니다.

이메일·닉네임 선택 동의를 거절해도 가입할 수 있습니다. 회원 식별은 공급자의 고유 식별자를 사용하고, 실제 학생 이름은 가입 신청 때 별도로 받습니다.
