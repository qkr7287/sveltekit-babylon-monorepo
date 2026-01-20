import {
  ArcRotateCamera,
  Color4,
  Color3,
  DefaultRenderingPipeline,
  DirectionalLight,
  DynamicTexture,
  Engine,
  HemisphericLight,
  MeshBuilder,
  PBRMaterial,
  Scene,
  ShadowGenerator,
  StandardMaterial,
  GlowLayer,
  Vector3
} from '@babylonjs/core';

export type BabylonHandle = {
  engine: Engine;
  scene: Scene;
  dispose: () => void;
};

/**
 * web(SvelteKit)에서 정적으로 로드되는 3D 번들의 진입점입니다.
 * - web은 이 모듈을 `import('/3d/bundle.js')`로 가져오고
 * - onMount에서 canvas를 전달해 초기화합니다.
 */
export function initBabylon(canvas: HTMLCanvasElement): BabylonHandle {
  // 렌더링 품질/성능 균형: DPR 반영 + AA
  const engine = new Engine(canvas, true, {
    adaptToDeviceRatio: true,
    antialias: true
  });
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.035, 0.04, 0.06, 1);

  // 톤매핑/노출을 약간 “영화처럼”
  scene.imageProcessingConfiguration.toneMappingEnabled = true;
  scene.imageProcessingConfiguration.exposure = 1.25;
  scene.imageProcessingConfiguration.contrast = 1.15;

  const camera = new ArcRotateCamera('camera', Math.PI / 2, Math.PI / 3, 8, new Vector3(0, 1.1, 0), scene);
  camera.attachControl(canvas, true);
  camera.wheelPrecision = 55;
  camera.pinchPrecision = 160;
  camera.panningSensibility = 0;
  camera.inertia = 0.85;
  camera.lowerRadiusLimit = 4.5;
  camera.upperRadiusLimit = 14;
  camera.lowerBetaLimit = 0.2;
  camera.upperBetaLimit = 1.45;

  // 라이트 1) 전체 베이스
  const hemi = new HemisphericLight('hemi', new Vector3(0, 1, 0), scene);
  hemi.intensity = 0.55;
  hemi.groundColor = new Color3(0.06, 0.06, 0.08);

  // 라이트 2) 키 라이트 + 그림자
  const sun = new DirectionalLight('sun', new Vector3(-0.65, -1, -0.35), scene);
  sun.position = new Vector3(6, 10, 6);
  sun.intensity = 2.2;

  // 바닥(그리드 텍스처를 코드로 생성해서 외부 에셋 없이 “퀄리티” 확보)
  const ground = MeshBuilder.CreateGround('ground', { width: 18, height: 18, subdivisions: 2 }, scene);
  ground.receiveShadows = true;

  const gridTex = new DynamicTexture('gridTex', { width: 1024, height: 1024 }, scene, false);
  gridTex.hasAlpha = true;
  const ctx = gridTex.getContext();
  ctx.clearRect(0, 0, 1024, 1024);
  ctx.fillStyle = 'rgba(12, 14, 20, 1)';
  ctx.fillRect(0, 0, 1024, 1024);

  // 그리드 라인
  const drawGrid = (step: number, alpha: number) => {
    ctx.strokeStyle = `rgba(165, 190, 255, ${alpha})`;
    ctx.lineWidth = 2;
    for (let i = 0; i <= 1024; i += step) {
      ctx.beginPath();
      ctx.moveTo(i + 0.5, 0);
      ctx.lineTo(i + 0.5, 1024);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i + 0.5);
      ctx.lineTo(1024, i + 0.5);
      ctx.stroke();
    }
  };
  drawGrid(64, 0.06);
  drawGrid(256, 0.14);

  // 중앙 십자 라인(살짝 강조)
  ctx.strokeStyle = 'rgba(120, 200, 255, 0.20)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(512.5, 0);
  ctx.lineTo(512.5, 1024);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, 512.5);
  ctx.lineTo(1024, 512.5);
  ctx.stroke();

  gridTex.update();
  gridTex.uScale = 1;
  gridTex.vScale = 1;

  const groundMat = new PBRMaterial('groundMat', scene);
  groundMat.albedoTexture = gridTex;
  groundMat.roughness = 0.92;
  groundMat.metallic = 0.0;
  groundMat.albedoColor = new Color3(0.9, 0.95, 1.0);
  groundMat.useAlphaFromAlbedoTexture = false;
  ground.material = groundMat;

  // 메인 오브젝트: 토러스 매듭(하이라이트가 잘 살아서 “예뻐 보임”)
  const knot = MeshBuilder.CreateTorusKnot(
    'knot',
    { radius: 1.15, tube: 0.35, radialSegments: 160, tubularSegments: 64, p: 2, q: 3 },
    scene
  );
  knot.position = new Vector3(0, 1.55, 0);

  const knotMat = new PBRMaterial('knotMat', scene);
  knotMat.albedoColor = new Color3(0.55, 0.7, 1.0);
  knotMat.metallic = 0.95;
  knotMat.roughness = 0.18;
  knotMat.emissiveColor = new Color3(0.05, 0.08, 0.13);
  knot.material = knotMat;

  // 포인트 라이트 느낌의 “빛나는 링”
  const ring = MeshBuilder.CreateTorus('ring', { diameter: 4.9, thickness: 0.08, tessellation: 120 }, scene);
  ring.position = new Vector3(0, 0.9, 0);
  ring.rotation.x = Math.PI / 2;

  const ringMat = new StandardMaterial('ringMat', scene);
  ringMat.emissiveColor = new Color3(0.25, 0.8, 1.0);
  ringMat.alpha = 0.95;
  ring.material = ringMat;

  // 작은 오브젝트들(리듬감)
  const satellites: { meshName: string; mesh: ReturnType<typeof MeshBuilder.CreateSphere>; phase: number }[] = [];
  for (let i = 0; i < 10; i++) {
    const s = MeshBuilder.CreateSphere(`sat_${i}`, { diameter: 0.22, segments: 16 }, scene);
    const angle = (i / 10) * Math.PI * 2;
    const radius = 3.2;
    s.position = new Vector3(Math.cos(angle) * radius, 1.05 + (i % 2) * 0.18, Math.sin(angle) * radius);

    const m = new PBRMaterial(`satMat_${i}`, scene);
    m.albedoColor = new Color3(0.85, 0.9, 1.0);
    m.metallic = 0.1;
    m.roughness = 0.25;
    m.emissiveColor = new Color3(0.03, 0.06, 0.09);
    s.material = m;

    satellites.push({ meshName: s.name, mesh: s, phase: angle });
  }

  // 그림자: 메인 오브젝트와 위성만 “고급스럽게” 받게 설정
  const shadowGen = new ShadowGenerator(2048, sun);
  shadowGen.usePercentageCloserFiltering = true;
  shadowGen.filteringQuality = ShadowGenerator.QUALITY_HIGH;
  shadowGen.bias = 0.0004;
  shadowGen.normalBias = 0.02;
  shadowGen.addShadowCaster(knot, true);
  satellites.forEach(({ mesh }) => shadowGen.addShadowCaster(mesh, true));

  // 후처리: 블룸 + FXAA
  const pipeline = new DefaultRenderingPipeline('pipeline', true, scene, [camera]);
  pipeline.fxaaEnabled = true;
  pipeline.bloomEnabled = true;
  pipeline.bloomThreshold = 0.72;
  pipeline.bloomWeight = 0.6;
  pipeline.bloomKernel = 64;
  pipeline.bloomScale = 0.5;

  // 글로우: emissive가 있는 애들만 은은하게
  const glow = new GlowLayer('glow', scene, { blurKernelSize: 24 });
  glow.intensity = 0.55;

  engine.resize();
  const startMs = performance.now();
  engine.runRenderLoop(() => {
    const t = (performance.now() - startMs) / 1000;

    // 애니메이션: “살아있는” 느낌만(과하지 않게)
    knot.rotation.y = t * 0.65;
    knot.rotation.x = Math.sin(t * 0.6) * 0.06;
    knot.position.y = 1.55 + Math.sin(t * 1.15) * 0.10;
    ring.rotation.z = t * 0.12;

    satellites.forEach(({ mesh, phase }, idx) => {
      const a = t * (0.35 + idx * 0.012) + phase;
      const r = 3.2 + Math.sin(t * 0.8 + phase) * 0.08;
      mesh.position.x = Math.cos(a) * r;
      mesh.position.z = Math.sin(a) * r;
      mesh.position.y = 1.05 + Math.sin(t * 1.7 + phase) * 0.12;
    });

    scene.render();
  });

  const onResize = () => engine.resize();
  window.addEventListener('resize', onResize);

  return {
    engine,
    scene,
    dispose: () => {
      window.removeEventListener('resize', onResize);
      engine.stopRenderLoop();
      glow.dispose();
      pipeline.dispose();
      shadowGen.dispose();
      scene.dispose();
      engine.dispose();
    }
  };
}

