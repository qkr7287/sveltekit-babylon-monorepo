import {
  ArcRotateCamera,
  Color4,
  Engine,
  HemisphericLight,
  MeshBuilder,
  Scene,
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
  const engine = new Engine(canvas, true);
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.05, 0.05, 0.07, 1);

  const camera = new ArcRotateCamera('camera', Math.PI / 2, Math.PI / 3, 6, Vector3.Zero(), scene);
  camera.attachControl(canvas, true);

  new HemisphericLight('light', new Vector3(0, 1, 0), scene);

  const sphere = MeshBuilder.CreateSphere('sphere', { diameter: 2 }, scene);
  sphere.position.y = 1;

  MeshBuilder.CreateGround('ground', { width: 10, height: 10 }, scene);

  engine.resize();
  engine.runRenderLoop(() => scene.render());

  const onResize = () => engine.resize();
  window.addEventListener('resize', onResize);

  return {
    engine,
    scene,
    dispose: () => {
      window.removeEventListener('resize', onResize);
      scene.dispose();
      engine.dispose();
    }
  };
}

