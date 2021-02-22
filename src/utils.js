import * as THREE from 'three';
export function createPerspectiveCamera({
  fov = 75,
  aspect = 2,
  near = 0.1,
  far = 5
} = {}) {
  const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  return camera;
}
export function resizeRendererToDisplaySize(renderer) {
  const canvas = renderer.domElement;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const needResize = canvas.width !== width || canvas.height !== height;

  if (needResize) {
    renderer.setSize(width, height, false);
  }

  return needResize;
}
export function updateCameraAspect(camera, canvas) {
  camera.aspect = canvas.clientWidth / canvas.clientHeight;
  camera.updateProjectionMatrix();
}
export function normalizedXYCoordinate(x, y, width, height) {
  const nx = x / width * 2 - 1;
  const ny = -(y / height) * 2 + 1;
  return {
    x: nx,
    y: ny
  };
}

export function createBox(width = 1, height = 1, depth = 1) {
  const geometry = new THREE.BoxGeometry(width, height, depth);
  const material = new THREE.MeshPhongMaterial({
    color: 0x808080
  });
  const mesh = new THREE.Mesh(geometry, material);
  return mesh;
}

export function createSphere(radius = 1, widthSegment = 8, heightSegment = 8) {
  const geometry = new THREE.SphereGeometry(radius, widthSegment, heightSegment);
  const material = new THREE.MeshPhongMaterial({
    color: 0x808080
  });
  const mesh = new THREE.Mesh(geometry, material);
  return mesh;
}

export function mapRangeToAnotherRange(x, in_min, in_max, out_min, out_max) {
  return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}

export function createRadialTexture(hue = 210, w = 512, h = 512) {
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  const cx = w / 2;
  const cy = h / 2;
  const x = cx;
  const y = cy;
  const r = w * 0.5;
  const radialGradient = ctx.createRadialGradient(x, y, 0, x, y, r);

  radialGradient.addColorStop(0, `hsla(${hue}, 100%, 50%, 1)`);
  // radialGradient.addColorStop(0.4, `hsla(${hue}, 100%, 50%, 0.8)`);
  radialGradient.addColorStop(1, `hsla(${hue}, 100%, 0%, 0)`);

  c.width = w;
  c.height = h;

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = radialGradient;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.closePath();

  return c;
}