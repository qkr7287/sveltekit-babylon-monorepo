<script lang="ts">
	import { onDestroy, onMount } from 'svelte';

	let canvas: HTMLCanvasElement | null = null;
	let dispose: (() => void) | undefined;
	let error: string | null = null;

	onMount(async () => {
		if (!canvas) return;

		// 기본: 같은 origin의 /3d/bundle.js (web/static/3d 또는 web/build/client/3d)
		// 하이브리드(dev:all/dev:3d): hooks.server.ts가 window.__THREED_BUNDLE_URL__을 주입해 그걸 우선 사용
		try {
			const bundleUrl = window.__THREED_BUNDLE_URL__ ?? new URL('/3d/bundle.js', window.location.origin).toString();
			const mod = await import(/* @vite-ignore */ bundleUrl);
			dispose = mod.initBabylon(canvas).dispose;
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		}
	});

	onDestroy(() => {
		dispose?.();
	});
</script>

<main style="display:flex; flex-direction:column; gap:12px; padding:24px;">
	<h1>SvelteKit + Babylon (web/3d 분리)</h1>
	<p style="opacity:.8; margin:0;">
		이 페이지는 <code>/3d/bundle.js</code>를 런타임에 불러서 3D를 초기화합니다. 그래서 <strong>3d만 빌드</strong>해도
		정적 파일만 교체되면 실행 결과에 반영됩니다.
	</p>

	<canvas
		bind:this={canvas}
		style="width: 900px; height: 520px; border-radius: 12px; border: 1px solid #2a2a2a;"
	></canvas>

	{#if error}
		<pre style="white-space:pre-wrap; color:#ffb4b4; background:#2b1b1b; padding:12px; border-radius:8px;">
{error}
		</pre>
	{/if}
</main>
