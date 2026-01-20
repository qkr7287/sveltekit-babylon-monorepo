import type { Handle } from '@sveltejs/kit';

/**
 * 런타임에서 3D 번들을 어디서 로드할지 결정하기 위한 설정 주입.
 *
 * - 기본값: 같은 origin의 `/3d/bundle.js` (web/static/3d 또는 web/build/client/3d에 존재)
 * - 개발 하이브리드 모드: THREED_BUNDLE_URL 을 설정하면 그 URL을 클라이언트에 주입
 *
 * 예) THREED_BUNDLE_URL=http://localhost:5173/src/bundle.ts
 */
export const handle: Handle = async ({ event, resolve }) => {
	const bundleUrl = process.env.THREED_BUNDLE_URL;

	return resolve(event, {
		transformPageChunk: ({ html }) => {
			if (!bundleUrl) return html;

			const injected = `<script>window.__THREED_BUNDLE_URL__=${JSON.stringify(bundleUrl)};</script>`;
			return html.replace('</head>', `${injected}</head>`);
		}
	});
};

