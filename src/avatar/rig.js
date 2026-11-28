import {
  CapsuleGeometry, CatmullRomCurve3, CylinderGeometry, Euler, Group, LatheGeometry,
  Mesh, MeshStandardMaterial, SphereGeometry, TubeGeometry, Vector2, Vector3,
} from 'three';
import { leftRest } from './clips.js';

const upperLength = 0.65;
const foreLength = 0.60;
const vertical = new Vector3(0, 1, 0);
const radians = Math.PI / 180;
const sphere = new SphereGeometry(1, 28, 20);
const tube = new CylinderGeometry(1, 1, 1, 20);

function mesh(parent, geometry, material, position, scale) {
  const part = new Mesh(geometry, material);
  part.position.fromArray(position);
  part.scale.fromArray(scale);
  parent.add(part);
  return part;
}

function ellipse(parent, material, position, scale) {
  return mesh(parent, sphere, material, position, scale);
}

function line(parent, material, positions, radius) {
  const points = positions.map((position) => new Vector3(...position));
  const shape = new TubeGeometry(new CatmullRomCurve3(points), 16, radius, 8);
  return mesh(parent, shape, material, [0, 0, 0], [1, 1, 1]);
}

function coat(parent, fabric, rib) {
  const profile = [
    [0, 0.10], [0.43, 0.10], [0.48, 0.18], [0.49, 0.37], [0.51, 0.63],
    [0.53, 0.87], [0.55, 1.18], [0.58, 1.36], [0.55, 1.45], [0.46, 1.52],
    [0.34, 1.57], [0.19, 1.59], [0.17, 1.54],
  ].map(([x, y]) => new Vector2(x, y));
  const body = new LatheGeometry(profile, 48);
  mesh(parent, body, fabric, [0, 0, 0], [1, 1, 0.56]);
  const collar = new LatheGeometry([
    [0.179, 1.565], [0.202, 1.552], [0.218, 1.570], [0.206, 1.590], [0.179, 1.593],
  ].map(([x, y]) => new Vector2(x, y)), 40);
  mesh(parent, collar, rib, [0, 0, 0], [1, 1, 0.78]);
}

function face(parent, palette, style) {
  const { skin, lip, freckles, hair, brow, sclera, iris, pupil, shine } = palette;
  ellipse(parent, skin, [0, 1.674, 0.015], [0.133, 0.19, 0.125]);
  ellipse(parent, skin, [0, 2.066, 0.015], [0.272, 0.357, 0.246]);
  ellipse(parent, skin, [0, 1.943, 0.09], [0.213, 0.213, 0.186]);
  for (const side of [-1, 1]) {
    ellipse(parent, skin, [side * 0.263, 2.033, 0.003], [0.050, 0.092, 0.055]);
    ellipse(parent, lip, [side * 0.283, 2.034, 0.042], [0.019, 0.042, 0.015]);
    ellipse(parent, sclera, [side * 0.103, 2.099, 0.243], [0.054, 0.029, 0.022]);
    ellipse(parent, iris, [side * 0.103, 2.098, 0.263], [0.024, 0.024, 0.0095]);
    ellipse(parent, pupil, [side * 0.103, 2.098, 0.271], [0.012, 0.015, 0.006]);
    ellipse(parent, shine, [side * 0.103 + 0.007, 2.107, 0.275], [0.0055, 0.0055, 0.0025]);
    line(parent, brow, [
      [side * 0.051, 2.152, 0.245],
      [side * 0.104, 2.162, 0.236],
      [side * 0.155, 2.151, 0.216],
    ], 0.010);
    if (style.freckles) {
      for (const i of [0, 1, 2]) {
        ellipse(parent, freckles, [side * (0.126 + 0.019 * i), 2.049 - 0.004 * i, 0.235 - 0.012 * i], [0.0041, 0.0034, 0.003]);
      }
    }
    if (style.lashes) {
      line(parent, brow, [
        [side * 0.060, 2.112, 0.252],
        [side * 0.104, 2.124, 0.262],
        [side * 0.152, 2.114, 0.244],
      ], 0.0055);
    }
    if (style.earrings) {
      ellipse(parent, palette.earring, [side * 0.277, 1.970, 0.030], [0.017, 0.017, 0.017]);
    }
  }
  ellipse(parent, skin, [0, 2.034, 0.25], [0.041, 0.071, 0.042]);
  ellipse(parent, skin, [0, 2.001, 0.281], [0.048, 0.032, 0.042]);
  line(parent, lip, [[-0.068, 1.933, 0.253], [0, 1.916, 0.274], [0.069, 1.936, 0.253]], style.fullLips ? 0.012 : 0.009);
  if (style.fullLips) ellipse(parent, lip, [0, 1.905, 0.262], [0.050, 0.016, 0.018]);
  if (style.hair === 'curly') curlyHair(parent, hair);
  else shortHair(parent, hair);
}

function shortHair(parent, hair) {
  ellipse(parent, hair, [-0.017, 2.282, -0.048], [0.278, 0.188, 0.248]);
  const fringe = ellipse(parent, hair, [-0.070, 2.320, 0.097], [0.224, 0.097, 0.181]);
  fringe.rotation.z = 0.23;
  const sideSweep = ellipse(parent, hair, [0.124, 2.302, 0.079], [0.152, 0.086, 0.164]);
  sideSweep.rotation.z = -0.39;
}

// Cabelo cacheado volumoso até a altura do queixo: um volume base e cachos esféricos
// distribuídos por sorteio determinístico, deixando o rosto livre.
function curlyHair(parent, hair) {
  ellipse(parent, hair, [0, 2.150, -0.090], [0.400, 0.350, 0.330]);
  let seed = 7;
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const center = [0, 2.060, -0.050];
  const radii = [0.450, 0.450, 0.390];
  let placed = 0;
  for (let attempt = 0; attempt < 1600 && placed < 300; attempt++) {
    const u = random() * 2 - 1;
    const angle = random() * Math.PI * 2;
    const ring = Math.sqrt(1 - u * u);
    const direction = [ring * Math.cos(angle), u, ring * Math.sin(angle)];
    const point = direction.map((value, axis) => center[axis] + value * radii[axis]);
    const [x, y, z] = point;
    if (y < 1.72) continue;
    const front = z > 0.06;
    if (front && y < 2.245 && Math.abs(x) < 0.30) continue;
    if (front && y < 2.0) continue;
    const size = 0.066 + random() * 0.034;
    ellipse(parent, hair, point, [size, size * 0.92, size]);
    placed++;
  }
}

const characters = {
  homem: {
    colors: { skin: 0xc47e56, nail: 0xcf936d, lip: 0x84442f, freckles: 0xa26346, hair: 0x2a1f1a, brow: 0x33241e, iris: 0x795243 },
    style: { hair: 'short', freckles: true },
  },
  // Mulher brasileira parda, de cabelo cacheado.
  mulher: {
    colors: { skin: 0x9c603f, nail: 0xb47a5a, lip: 0x76392a, freckles: 0x86502f, hair: 0x1f1510, brow: 0x1f1510, iris: 0x4a2c1c },
    style: { hair: 'curly', lashes: true, earrings: true, fullLips: true },
  },
};

export const avatarCharacters = Object.freeze(Object.keys(characters));

const digitGeometry = [
  { root: [0.09, 0.073, 0.002], lengths: [0.097, 0.085, 0.066], thickness: 0.037 },
  { root: [0.086, 0.229, 0.0], lengths: [0.099, 0.069, 0.058], thickness: 0.030 },
  { root: [0.030, 0.247, 0.0], lengths: [0.110, 0.075, 0.060], thickness: 0.030 },
  { root: [-0.027, 0.236, 0.0], lengths: [0.099, 0.068, 0.053], thickness: 0.028 },
  { root: [-0.081, 0.210, 0.001], lengths: [0.082, 0.054, 0.045], thickness: 0.025 },
];

function hand(parent, { skin, nail }) {
  const wrist = new Group();
  parent.add(wrist);
  ellipse(wrist, skin, [0, 0.028, 0], [0.076, 0.068, 0.050]);
  ellipse(wrist, skin, [0.004, 0.13, 0], [0.116, 0.149, 0.054]);
  ellipse(wrist, skin, [0.065, 0.098, 0.021], [0.060, 0.079, 0.045]);
  const digits = digitGeometry.map(({ root, lengths, thickness }) => {
    const base = new Group();
    base.position.fromArray(root);
    wrist.add(base);
    let parent = base;
    return lengths.map((length, index) => {
      const joint = new Group();
      if (index > 0) joint.position.y = lengths[index - 1];
      parent.add(joint);
      parent = joint;
      const radius = thickness * (1 - 0.115 * index);
      const segment = new CapsuleGeometry(radius, Math.max(0.005, length - radius * 0.7), 6, 12);
      mesh(joint, segment, skin, [0, length / 2, 0], [1, 1, 0.85]);
      if (index === lengths.length - 1) {
        ellipse(joint, nail, [0, length * 0.73, -radius * 0.78], [radius * 0.60, length * 0.36, radius * 0.19]);
      }
      return joint;
    });
  });

  return {
    wrist,
    setDigits(shape) {
      digits.forEach(([base, middle, tip], index) => {
        const [bend, fold, curl, opening] = shape[index];
        base.rotation.set(bend * radians, 0, opening * radians, 'ZXY');
        middle.rotation.x = fold * radians;
        tip.rotation.x = curl * radians;
      });
    },
  };
}

function segment(mesh, from, to, width, start = 0, finish = 1) {
  const span = new Vector3().subVectors(to, from);
  mesh.position.copy(from).addScaledVector(span, (start + finish) / 2);
  mesh.quaternion.setFromUnitVectors(vertical, span.clone().normalize());
  mesh.scale.set(width, span.length() * (finish - start), width);
}

function ellipseAlong(mesh, from, to, widths) {
  const span = new Vector3().subVectors(to, from);
  mesh.position.copy(from).addScaledVector(span, 0.50);
  mesh.quaternion.setFromUnitVectors(vertical, span.clone().normalize());
  mesh.scale.set(widths[0], span.length() * 0.59, widths[1]);
}

function arm(parent, side, palette) {
  const shoulder = new Vector3(side * 0.48, 1.38, 0);
  ellipse(parent, palette.fabric, shoulder.toArray(), [0.154, 0.160, 0.147]);
  const sleeve = mesh(parent, tube, palette.fabric, [0, 0, 0], [1, 1, 1]);
  const cuff = mesh(parent, tube, palette.rib, [0, 0, 0], [1, 1, 1]);
  const upper = ellipse(parent, palette.skin, [0, 0, 0], [1, 1, 1]);
  const elbow = ellipse(parent, palette.skin, [0, 0, 0], [0.086, 0.086, 0.080]);
  const fore = ellipse(parent, palette.skin, [0, 0, 0], [1, 1, 1]);
  const joint = ellipse(parent, palette.skin, [0, 0, 0], [0.066, 0.062, 0.049]);
  const { wrist, setDigits } = hand(parent, palette);
  const pole = new Vector3(side * 0.66, -0.72, -0.25).normalize();

  if (side > 0) wrist.scale.x = -1;

  return (position, rotation, digits, elbowLift = 0) => {
    const requestedWrist = new Vector3(...position);
    const axis = new Vector3().subVectors(requestedWrist, shoulder);
    const distance = Math.min(upperLength + foreLength - 0.001, Math.max(0.06, axis.length()));
    axis.normalize();
    const wristPoint = shoulder.clone().addScaledVector(axis, distance);
    const elbowOffset = (upperLength ** 2 + distance ** 2 - foreLength ** 2) / (2 * distance);
    const height = Math.sqrt(Math.max(0, upperLength ** 2 - elbowOffset ** 2));
    const bendDirection = pole.clone().addScaledVector(vertical, elbowLift);
    const elbowBend = bendDirection.addScaledVector(axis, -axis.dot(bendDirection)).normalize();
    const elbowPoint = shoulder.clone().addScaledVector(axis, elbowOffset).addScaledVector(elbowBend, height);

    segment(sleeve, shoulder, elbowPoint, 0.139, 0, 0.61);
    segment(cuff, shoulder, elbowPoint, 0.143, 0.56, 0.63);
    ellipseAlong(upper, shoulder, elbowPoint, [0.096, 0.087]);
    elbow.position.copy(elbowPoint);
    ellipseAlong(fore, elbowPoint, wristPoint, [0.083, 0.073]);
    joint.position.copy(wristPoint);
    wrist.position.copy(wristPoint);
    const [pitch, yaw, roll] = rotation.map((angle) => angle * radians);
    wrist.rotation.copy(new Euler(pitch, yaw, roll, 'YXZ'));
    setDigits(digits);
  };
}

export function createRig(character = 'homem') {
  const model = new Group();
  const matte = (color) => new MeshStandardMaterial({ color, roughness: 0.80 });
  const { colors, style } = characters[character] ?? characters.homem;
  const palette = {
    fabric: matte(0x2b2830), rib: matte(0x1c1a20), skin: matte(colors.skin), nail: matte(colors.nail),
    lip: matte(colors.lip), freckles: matte(colors.freckles), hair: matte(colors.hair), brow: matte(colors.brow),
    sclera: matte(0xfff0e9), iris: matte(colors.iris), pupil: matte(0x1e1814), shine: matte(0xffffff),
    earring: new MeshStandardMaterial({ color: 0xd9a441, roughness: 0.35, metalness: 0.6 }),
  };
  coat(model, palette.fabric, palette.rib);
  face(model, palette, style);
  const rightArm = arm(model, -1, palette);
  const leftArm = arm(model, 1, palette);

  return {
    model,
    applyPose({ wrist, rotation, digits, elbowLift, left = leftRest }) {
      rightArm(wrist, rotation, digits, elbowLift);
      leftArm(left.wrist, left.rotation, left.digits, left.elbowLift);
    },
    dispose() {
      const geometries = new Set();
      model.traverse((child) => {
        if (child.isMesh && child.geometry !== sphere && child.geometry !== tube) {
          geometries.add(child.geometry);
        }
      });
      for (const geometry of geometries) geometry.dispose();
      for (const material of Object.values(palette)) material.dispose();
    },
  };
}
