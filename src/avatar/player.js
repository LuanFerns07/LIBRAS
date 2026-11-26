import {
  AmbientLight, CircleGeometry, Color, DirectionalLight, HemisphereLight,
  Mesh, MeshBasicMaterial, OrthographicCamera, Scene, WebGLRenderer,
} from 'three';
import { neutralPose } from './clips.js';
import { createPlayback } from './playback.js';
import { createRig } from './rig.js';

export const AVATAR_FRAME = Object.freeze({
  centerY: 1.26,
  halfHeight: 1.34,
  halfWidth: 1.23,
});

export function createPlayer(container, { onStep, onState } = {}) {
  const renderer = new WebGLRenderer({ antialias: true, powerPreference: 'low-power' });
  renderer.domElement.setAttribute('role', 'img');
  renderer.domElement.setAttribute('aria-label', 'Avatar 3D demonstrando sinais em Libras');
  renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;';
  const scene = new Scene();
  scene.background = new Color(0xeee9fb);
  const camera = new OrthographicCamera(-2, 2, 1.33, -1.33, 0.1, 20);
  camera.position.set(0, AVATAR_FRAME.centerY, 6);
  camera.lookAt(0, AVATAR_FRAME.centerY, 0);

  const rig = createRig();
  scene.add(rig.model);
  scene.add(new HemisphereLight(0xfff8f3, 0xc8b7ed, 1.45));
  scene.add(new AmbientLight(0xffffff, 0.55));
  const key = new DirectionalLight(0xffffff, 2.15);
  key.position.set(-3, 4, 5);
  scene.add(key);
  const rim = new DirectionalLight(0xded0ff, 1.18);
  rim.position.set(2, 3, -3);
  scene.add(rim);

  const circleGeometry = new CircleGeometry(1.12, 64);
  const circleMaterial = new MeshBasicMaterial({ color: 0xe5ddf8 });
  const circle = new Mesh(circleGeometry, circleMaterial);
  circle.position.set(0, 1.30, -1.30);
  scene.add(circle);

  function draw() {
    renderer.render(scene, camera);
  }

  function resize() {
    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);
    const ratio = width / height;
    const halfHeight = Math.max(AVATAR_FRAME.halfHeight, AVATAR_FRAME.halfWidth / ratio);
    camera.top = halfHeight;
    camera.bottom = -halfHeight;
    camera.left = -halfHeight * ratio;
    camera.right = halfHeight * ratio;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);
    draw();
  }

  function paint(pose) {
    rig.applyPose(pose, neutralPose.digits);
    draw();
  }

  rig.applyPose(neutralPose, neutralPose.digits);
  container.append(renderer.domElement);
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();

  const playback = createPlayback({
    paint, onStep, onState,
    requestFrame: (callback) => window.requestAnimationFrame(callback),
    cancelFrame: (id) => window.cancelAnimationFrame(id),
  });

  return {
    ...playback,
    dispose() {
      playback.dispose();
      observer.disconnect();
      rig.dispose();
      circleGeometry.dispose();
      circleMaterial.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}
