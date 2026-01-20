import './style.css';
import { initBabylon } from './bundle';

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div style="display:flex; flex-direction:column; gap:12px;">
    <h1>3D Dev Playground (Babylon)</h1>
    <p>이 페이지는 <code>3d</code> 패키지 단독 개발용입니다. 실제 앱은 <code>web</code>에서 번들을 로드합니다.</p>
    <canvas id="canvas" style="width: 900px; height: 520px; border-radius: 12px; border: 1px solid #2a2a2a;"></canvas>
  </div>
`;

const canvas = document.querySelector<HTMLCanvasElement>('#canvas')!;
initBabylon(canvas);
