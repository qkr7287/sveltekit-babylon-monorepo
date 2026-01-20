const base = process.env.SMOKE_BASE_URL ?? 'http://127.0.0.1:4173';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function mustOk(pathname) {
  const url = new URL(pathname, base).toString();
  let lastErr;
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return res;
      lastErr = new Error(`[smoke] ${url} -> ${res.status}`);
    } catch (e) {
      lastErr = e;
    }
    await sleep(200);
  }
  throw lastErr ?? new Error(`[smoke] ${url} -> unknown error`);
}

await mustOk('/');
const bundleRes = await mustOk('/3d/bundle.js');
const js = await bundleRes.text();
if (!js.includes('initBabylon')) {
  throw new Error('[smoke] /3d/bundle.js does not look like the 3d bundle (missing initBabylon)');
}

console.log('[smoke] ok');

