# web/ + 3d/ 분리 (SvelteKit + Babylon)

한 저장소(모노레포) 안에서 `web(SvelteKit)`과 `3d(Babylon)`을 분리하고, **변경된 쪽만 빌드**해도 실행 결과에 반영되도록 만든 예제입니다.

---

### 목표(해결하고 싶은 불편함)

- **web만 수정했는데도 항상 3d까지 같이 빌드되는 문제**를 없애고 싶음
- 원하는 흐름:
  - **1) 전체 빌드 1회**
  - **2) web 또는 3d 중 한쪽만 업데이트**
  - **3) 업데이트한 쪽만 빌드**
  - **4) 실행해 보면(웹 앱 기준) 변경 내용이 반영되어 있어야 함**

---

### 폴더 구조

```
/
  web/            # SvelteKit (adapter-node)
  3d/             # Vite + Babylon 번들(dist)
  scripts/        # 3d → web 동기화 / 스모크 테스트
  .github/
    workflows/ci.yml
  package.json    # npm workspaces + 루트 스크립트
```

---

### 어떻게 구현했는지 (핵심 설계)

#### 1) 3d는 “앱”이 아니라 “정적 번들”로 만든다

- `3d`는 Vite `lib` 빌드로 **`dist/bundle.js`(ESM) + chunk들**을 생성합니다.
- 진입점은 `3d/src/bundle.ts`이며, `initBabylon(canvas)` 함수를 export 합니다.
- 설정은 `3d/vite.config.ts`:
  - `build.lib.entry = 'src/bundle.ts'`
  - `fileName = 'bundle.js'`

#### 2) web은 3d를 빌드 타임에 묶지 않고, 런타임에 로드한다

- `web/src/routes/+page.svelte`에서 아래처럼 **런타임 동적 import**를 사용합니다.
  - 로컬/배포 모두에서 `/3d/bundle.js`를 불러옴
  - 번들 로드 실패 시 화면에 에러를 표시

#### 3) “3d만 빌드” 시에도 web 실행 결과에 반영되도록, 파일만 교체한다

여기서 핵심이 **복사(sync) 스크립트**입니다.

- `scripts/sync-3d-to-web-static.mjs`
  - `3d/dist` → `web/static/3d`로 복사
  - web을 새로 빌드할 때 정적 파일로 포함되게 함

- `scripts/sync-3d-to-web-build.mjs`
  - `3d/dist` → `web/build/client/3d`로 복사
  - **이미 빌드된 web을 다시 빌드하지 않아도**(= 3d-only) 실행 결과에 반영되게 함

#### 4) web은 adapter-node로 “빌드 산출물 실행”이 가능하게 한다

- `web/svelte.config.js`는 `@sveltejs/adapter-node` 사용
- 그래서 `web/build`(node 서버)를 바로 실행할 수 있음

---

### 어떻게 사용하는지 (예시 포함)

#### 공통: 의존성 설치

```bash
npm install
```

#### (중요) 최초 1회 전제: web “빌드 환경”이 필요한 모드가 있음

- `npm run dev:3d`는 **web을 빌드 산출물(server)로 실행**하면서 3D만 dev 코드로 붙이는 모드입니다.
- 따라서 최소 1회는 아래를 실행해 `web/build`가 있어야 합니다:

```bash
npm run build:all
```

#### dev / start 동작 정의(요구사항 기준)

이 레포는 아래 목표를 만족하도록 구성되어 있습니다.

- `dev:all`: **web + 3d 둘 다 “개발중 코드”**로 합쳐서 구동
- `dev:3d`: **web은 “빌드된 환경”**, 3d만 “개발중 코드”로 합쳐서 구동
- `dev:web`: **3d는 “빌드된 환경”**, web만 “개발중 코드”로 합쳐서 구동
- `start:all`: web + 3d **둘 다 최신 빌드 산출물**로 합쳐서 구동
- `start:web`: web만 **최신 빌드**, 3d는 **가장 최근 빌드**를 합쳐서 구동
- `start:3d`: 3d만 **최신 빌드**, web은 **가장 최근 빌드**를 합쳐서 구동

#### 포트/접속 URL

- **web(dev)**: `http://localhost:5174/`
- **3d(dev)**: `http://localhost:5173/` (web에서 3d dev 모듈을 불러오기 위해 CORS/고정 포트 사용)
- **web(build server)**: `http://127.0.0.1:4173/`

> 주의: `dev:*` 또는 `start:*` 프로세스는 포트를 점유합니다. 다른 모드를 실행하기 전에 기존 실행을 종료해야 포트 충돌이 안 납니다.

#### 예시 0) 개발 모드 3종

- **web + 3d 모두 개발중 코드로 합쳐서(`dev:all`)**

```bash
npm run dev:all
```

- **web은 빌드 환경 + 3d만 개발중 코드(`dev:3d`)**

```bash
npm run dev:3d
```

- **3d는 빌드 환경 + web만 개발중 코드(`dev:web`)**

```bash
npm run dev:web
```

#### 예시 A) 1) 전체 빌드 1회 → 실행

```bash
npm run build:all
npm run start:all
```

- 브라우저에서 `/`에 접속하면 3D 캔버스가 보입니다.
- 내부적으로는 `/3d/bundle.js`를 런타임에 로드해서 Babylon을 초기화합니다.

#### 예시 B) 2) web만 수정 → 3) web만 빌드 → 4) 실행 시 web 변경 반영

1) `web/src/routes/+page.svelte` 텍스트를 조금 바꿈
2) web만 빌드 & 실행:

```bash
npm run start:web
```

- web 화면 텍스트 변경이 반영됩니다.
- 3d는 “다시 빌드”하지 않아도 됩니다(필요하면 나중에 `build:3d`만 하면 됨).

#### 예시 C) 2) 3d만 수정 → 3) 3d만 빌드 → 4) 실행 시 3d 변경 반영(웹 재빌드 없음)

1) `3d/src/bundle.ts`에서 예: 배경색/메시/라이트 등을 변경
2) 3d만 최신화해서 실행:

```bash
npm run start:3d
```

- `build:3d`가 `web/build/client/3d` 아래 파일을 교체하므로, **web 재빌드 없이** 3D 변경이 반영됩니다.

---

### 다른 프로젝트에 적용하려면 (이식 체크리스트)

아래 순서대로 옮기면 됩니다.

#### 0) (중요) 폴더 구조/경로 규칙부터 고정하기

이 방식은 **경로에 의존**합니다. 즉, “폴더 이름/위치”가 바뀌면 아래 경로들도 같이 바꿔야 합니다.

- **web이 로드하는 URL**: `web`은 런타임에 항상 **`/3d/bundle.js`** 를 import 합니다.
- **web dev 서버가 서빙하는 위치**: `dev:web`에서 `/3d/*`는 **`web/static/3d/*`** 에서 나옵니다.
- **3d-only 빌드가 교체하는 위치**: `build:3d`는 **`web/build/client/3d/*`** 를 교체합니다.

그래서 “다른 프로젝트에 적용”할 때는 먼저 아래 중 하나로 폴더 구조를 선택하고, 선택한 구조에 맞춰 **스크립트 경로**를 수정하세요.

**옵션 A (이 레포와 동일, 추천)**

```
/
  web/
  3d/
  scripts/
```

**옵션 B (일반적인 모노레포 스타일)**

```
/
  apps/
    web/
    3d/
  scripts/
```

옵션 B로 바꾸면 `scripts/sync-3d-to-web-*.mjs` 안의 경로(`web`, `3d`)를 `apps/web`, `apps/3d`로 변경해야 합니다.

#### 1) 모노레포(workspaces) 구성

- 루트 `package.json`에:
  - `"private": true`
  - `"workspaces": ["web", "3d"]` (폴더명이 다르면 맞춰서 변경)

#### 2) 3d를 “정적 번들”로 만들기

- `3d/vite.config.ts`에 `build.lib` 설정 추가(번들 파일명을 고정: `bundle.js`)
- `3d/src/bundle.ts`에 `export function initBabylon(canvas)` 같은 **웹이 호출할 엔트리 함수**를 제공

#### 3) web에서 3d 번들을 런타임 import로 로드하기

- web 코드에서:
  - 기본: `const bundleUrl = new URL('/3d/bundle.js', window.location.origin).toString();`
  - `await import(/* @vite-ignore */ bundleUrl);`
- 중요한 점:
  - **정적 import 금지**(정적 import를 하면 web 빌드가 3d에 종속됨)
  - 번들 파일은 반드시 web이 서비스하는 경로(`/3d/bundle.js`)에 존재해야 함

추가로 이 레포는 “하이브리드 dev”를 위해 `THREED_BUNDLE_URL` 환경변수를 지원합니다.

- 예: `THREED_BUNDLE_URL=http://localhost:5173/src/bundle.ts`
- 구현: `web/src/hooks.server.ts`가 `window.__THREED_BUNDLE_URL__`로 주입하고, 페이지에서 그 값을 우선 사용합니다.

#### 4) 3d 산출물을 web에 “복사(sync)”하는 스크립트 추가

- 이 레포의 `scripts/` 2개를 그대로 가져오고, 경로만 프로젝트 구조에 맞게 바꾸면 됩니다.
  - `sync-3d-to-web-static.mjs`: `web` 빌드 시 포함되게 하기
  - `sync-3d-to-web-build.mjs`: **3d-only 빌드로도** 이미 빌드된 web에 즉시 반영되게 하기

#### 5) web은 “빌드 산출물 실행”을 지원하도록 adapter-node 권장

- `web`이 SvelteKit이면 `@sveltejs/adapter-node`를 적용하면
  - `web/build`를 node로 실행 가능
  - 3d-only 시나리오에서 “web 재빌드 없이 파일만 교체” 전략과 궁합이 좋습니다.

#### 6) CI에서 “변경된 쪽만 빌드”하려면

- `.github/workflows/ci.yml`처럼
  - 경로 필터(web/3d)로 변경 감지
  - (중요) **3d-only 빌드가 가능하려면 web/build가 캐시에 있어야 함**
  - 없으면 전체 빌드를 강제로 한 번 수행하도록 처리

---

### 참고: 루트 스크립트 요약

- **`npm run build:all`**: 3d 빌드 → `web/static/3d`로 복사 → web 빌드
- **`npm run build:web`**: `web/static/3d`로 복사 → web만 빌드
- **`npm run build:3d`**: 3d만 빌드 → `web/build/client/3d`(+ `web/static/3d`)로 복사
- **`npm run start:all`**: 최신 web+3d 빌드 후 실행
- **`npm run start:web`**: 최신 web 빌드 후 실행(3d는 최근 빌드 사용)
- **`npm run start:3d`**: 최신 3d 빌드 후 실행(web은 최근 빌드 사용)
- **`npm run dev:all`**: web(dev)+3d(dev) 합쳐서 실행
- **`npm run dev:web`**: web(dev) + 3d(최근 빌드) 합쳐서 실행
- **`npm run dev:3d`**: web(최근 빌드) + 3d(dev) 합쳐서 실행

#### 각 명령이 “어떤 서버를 켜는지” + “어느 URL로 봐야 합쳐진 화면인지”

- **web(dev) 서버**: SvelteKit dev 서버(소스코드 기반). 기본 접속 `http://localhost:5174/`
- **3d(dev) 서버**: Vite dev 서버(소스코드 기반). 기본 접속 `http://localhost:5173/`
- **web(build) 서버**: SvelteKit adapter-node 빌드 산출물(`web/build`)을 node로 실행. 기본 접속 `http://127.0.0.1:4173/`

명령별로 “합쳐진 화면(web 안에 3D)”을 보려면 아래 URL로 접속하세요.

- **`npm run dev:web`**
  - 켜지는 서버: **web(dev)** (5174)
  - 3D 로드 방식: **최근 빌드된 3D 번들**을 `web/static/3d`에서 서빙(`/3d/bundle.js`)
  - 합쳐진 화면 접속: `http://localhost:5174/`

- **`npm run dev:3d`**
  - 켜지는 서버: **web(build)** (4173) + **3d(dev)** (5173) → *서버가 2개 뜹니다*
  - 3D 로드 방식: web이 3d(dev)의 모듈을 직접 로드 (`THREED_BUNDLE_URL=http://localhost:5173/src/bundle.ts`)
  - 합쳐진 화면 접속(중요): `http://127.0.0.1:4173/`
  - 참고: `http://localhost:5173/`로 들어가면 **3d 단독(dev) 화면**이 보이는 게 정상입니다.

- **`npm run dev:all`**
  - 켜지는 서버: **web(dev)** (5174) + **3d(dev)** (5173) → *서버가 2개 뜹니다*
  - 3D 로드 방식: web이 3d(dev)의 모듈을 직접 로드 (`THREED_BUNDLE_URL=http://localhost:5173/src/bundle.ts`)
  - 합쳐진 화면 접속: `http://localhost:5174/`

- **`npm run start:all` / `npm run start:web` / `npm run start:3d`**
  - 켜지는 서버: **web(build)** (4173)
  - 합쳐진 화면 접속: `http://127.0.0.1:4173/`

> 주의: 위 서버들은 포트를 점유하므로, 다른 모드를 실행하기 전 기존 프로세스를 종료하지 않으면 포트 충돌이 날 수 있습니다.