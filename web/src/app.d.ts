// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	// 3D 번들 로드 URL을 런타임에 바꾸기 위해 hooks.server.ts가 주입합니다.
	// (dev:all / dev:3d 같은 하이브리드 모드에서 사용)
	interface Window {
		__THREED_BUNDLE_URL__?: string;
	}

	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
