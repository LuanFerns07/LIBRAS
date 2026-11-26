export const ANIMATION_VERSION = '0.1.0-preliminar';

// Cada dedo usa graus: flexão da base, articulação média, distal e abertura lateral.
const straight = [2, 3, 2, 0];
const closed = [68, 92, 64, 0];
const curved = [22, 41, 31, 0];
const hooked = [6, 83, 45, 0];
const thumbSide = [8, 10, 9, -19];
const thumbAcross = [37, 22, 18, 43];
const thumbOut = [3, 6, 5, -77];
const thumbOpen = [5, 10, 5, -45];

function spread(finger, angle) {
  return [...finger.slice(0, 3), angle];
}

function fingers(thumb, index, middle, ring, little) {
  return [thumb, index, middle, ring, little];
}

const a = fingers(thumbSide, closed, closed, closed, closed);
const b = fingers(thumbAcross, straight, straight, straight, straight);
const c = fingers([11, 18, 11, -65], curved, curved, curved, curved);
const d = fingers([28, 15, 25, 24], straight, [47, 61, 35, 0], curved, curved);
const e = fingers([35, 16, 13, 47], hooked, hooked, hooked, hooked);
const f = fingers([14, 14, 26, -23], [31, 55, 30, -10], straight, straight, straight);
const g = fingers(thumbSide, straight, closed, closed, closed);
const h = fingers([27, 11, 8, 17], spread(straight, -17), spread(straight, 7), closed, closed);
const i = fingers(thumbAcross, closed, closed, closed, straight);
const l = fingers(thumbOut, straight, closed, closed, closed);
const m = fingers(thumbAcross, straight, straight, straight, closed);
const n = fingers(thumbAcross, straight, straight, closed, closed);
const o = fingers([8, 25, 25, -50], [42, 59, 34, 0], [42, 59, 34, 0], [43, 60, 36, 0], curved);
const r = fingers(thumbAcross, spread(straight, 22), [10, 3, 2, -15], closed, closed);
const s = fingers(thumbAcross, closed, closed, closed, closed);
const t = fingers([38, 28, 23, 27], [33, 61, 25, -8], straight, straight, straight);
const v = fingers(thumbAcross, spread(straight, -20), spread(straight, 13), closed, closed);
const w = fingers(thumbAcross, spread(straight, -22), straight, spread(straight, 22), closed);
const x = fingers([5, 15, 12, -56], spread(hooked, 0), closed, closed, closed);
const y = fingers(thumbOut, closed, closed, closed, spread(straight, 12));

const relaxed = fingers(thumbOpen, curved, curved, curved, curved);
const open = fingers(
  thumbOpen,
  spread(straight, -10),
  straight,
  spread(straight, 8),
  spread(straight, 19),
);
const five = fingers(
  thumbAcross,
  spread(hooked, -14),
  spread(hooked, 8),
  closed,
  closed,
);

const letterWrist = [-0.63, 1.61, 0.48];
const front = [0, 0, 0];
const down = [47, 0, 180];

function pose(digits, wrist = letterWrist, rotation = front) {
  return { digits, wrist, rotation };
}

export const neutralPose = pose(relaxed, [-0.62, 0.45, 0.15], [10, 35, 162]);

function hold(bodyPose, seconds = 0.82) {
  return { seconds, frames: [{ t: 0, ...bodyPose }] };
}

function motion(seconds, frames) {
  return { seconds, frames: frames.map(([time, bodyPose]) => ({ t: time, ...bodyPose })) };
}

const cedilla = motion(0.99, [
  [0, pose(c, letterWrist, [0, 65, 0])],
  [0.25, pose(c, [-0.65, 1.57, 0.48], [0, 56, -7])],
  [0.46, pose(c, [-0.61, 1.53, 0.48], [0, 75, 6])],
  [0.69, pose(c, [-0.65, 1.49, 0.48], [0, 56, -7])],
  [1, pose(c, [-0.63, 1.46, 0.48], [0, 65, 0])],
]);

export const clips = {
  'letter-a': hold(pose(a)),
  'letter-b': hold(pose(b)),
  'letter-c': hold(pose(c, letterWrist, [0, 65, 0])),
  'letter-ç': cedilla,
  'letter-cedilha': cedilla,
  'letter-d': hold(pose(d, letterWrist, [0, 10, 0])),
  'letter-e': hold(pose(e)),
  'letter-f': hold(pose(f, letterWrist, [0, -11, 0])),
  'letter-g': hold(pose(g)),
  'letter-h': motion(0.98, [
    [0, pose(h, letterWrist, [0, -16, -6])],
    [0.34, pose(h, letterWrist, [0, 61, 4])],
    [0.68, pose(h, letterWrist, [0, 5, -3])],
    [1, pose(h, letterWrist, [0, 5, -3])],
  ]),
  'letter-i': hold(pose(i)),
  'letter-j': motion(1.16, [
    [0, pose(i)],
    [0.31, pose(i, [-0.67, 1.48, 0.49], [25, 0, 96])],
    [0.54, pose(i, [-0.58, 1.45, 0.49], [30, 0, 175])],
    [0.84, pose(i, [-0.49, 1.62, 0.49], [10, 165, 16])],
    [1, pose(i, [-0.49, 1.62, 0.49], [10, 170, 4])],
  ]),
  'letter-k': motion(0.98, [
    [0, pose(h, [-0.65, 1.45, 0.47], [0, 4, 32])],
    [0.35, pose(h, [-0.67, 1.56, 0.49], [0, 4, 18])],
    [0.78, pose(h, [-0.61, 1.69, 0.49], [0, 3, -5])],
    [1, pose(h, [-0.61, 1.69, 0.49], [0, 3, -5])],
  ]),
  'letter-l': hold(pose(l)),
  'letter-m': hold(pose(m, [-0.63, 1.9, 0.61], down)),
  'letter-n': hold(pose(n, [-0.63, 1.9, 0.61], down)),
  'letter-o': hold(pose(o, letterWrist, [0, 64, 0])),
  'letter-p': motion(0.97, [
    [0, pose(h, letterWrist, [-13, 3, 56])],
    [0.71, pose(h, [-0.60, 1.52, 0.53], [17, 7, 103])],
    [1, pose(h, [-0.60, 1.52, 0.53], [17, 7, 103])],
  ]),
  'letter-q': hold(pose(g, [-0.63, 1.9, 0.61], down)),
  'letter-r': hold(pose(r)),
  'letter-s': hold(pose(s)),
  'letter-t': hold(pose(t, letterWrist, [0, -11, 0])),
  'letter-u': hold(pose(n)),
  'letter-v': hold(pose(v)),
  'letter-w': motion(1.04, [
    [0, pose(m, [-0.63, 1.89, 0.57], down)],
    [0.34, pose(w, [-0.66, 1.70, 0.62], [40, 0, 125])],
    [0.76, pose(w, [-0.61, 1.69, 0.48], front)],
    [1, pose(w, [-0.61, 1.69, 0.48], front)],
  ]),
  'letter-x': motion(0.92, [
    [0, pose(x, [-0.66, 1.78, 0.56], [31, -10, 89])],
    [0.73, pose(x, [-0.43, 1.78, 0.56], [31, -10, 89])],
    [1, pose(x, [-0.43, 1.78, 0.56], [31, -10, 89])],
  ]),
  'letter-y': motion(1, [
    [0, pose(y, [-0.62, 1.81, 0.55], [42, 0, 174])],
    [0.75, pose(y, [-0.60, 1.66, 0.51], front)],
    [1, pose(y, [-0.60, 1.66, 0.51], front)],
  ]),
  'letter-z': motion(1.18, [
    [0, pose(g, [-0.72, 1.72, 0.52])],
    [0.25, pose(g, [-0.46, 1.72, 0.52])],
    [0.53, pose(g, [-0.72, 1.56, 0.52])],
    [0.84, pose(g, [-0.46, 1.56, 0.52])],
    [1, pose(g, [-0.46, 1.56, 0.52])],
  ]),
  pause: hold(neutralPose, 0.36),
  'signal-cinco': hold(pose(five, [-0.48, 1.33, 0.63], [0, -12, -6]), 1.42),
  'signal-amarelo': motion(1.32, [
    [0, pose(d, [-0.10, 1.83, 0.31], [6, 75, -1])],
    [0.23, pose(d, [-0.10, 1.80, 0.34], [6, 75, -1])],
    [0.74, pose(d, [-0.09, 1.55, 0.42], [8, 73, -3])],
    [1, pose(d, [-0.09, 1.55, 0.42], [8, 73, -3])],
  ]),
  'signal-espelho': motion(1.37, [
    [0, pose(open, [-0.14, 1.76, 0.59], [-5, 151, -6])],
    [0.30, pose(open, [-0.14, 1.76, 0.59], [-5, 201, 4])],
    [0.62, pose(open, [-0.14, 1.76, 0.59], [-5, 151, -6])],
    [0.86, pose(open, [-0.14, 1.76, 0.59], [-5, 195, 1])],
    [1, pose(open, [-0.14, 1.76, 0.59], [-5, 181, 0])],
  ]),
  'signal-meu': motion(1.06, [
    [0, pose(b, [-0.39, 1.40, 0.47], [3, 180, 69])],
    [0.37, pose(b, [-0.37, 1.40, 0.36], [3, 180, 69])],
    [0.61, pose(b, [-0.37, 1.40, 0.36], [3, 180, 69])],
    [1, pose(b, [-0.39, 1.40, 0.44], [3, 180, 69])],
  ]),
  'signal-nome': motion(1.09, [
    [0, pose(n, [-0.15, 1.39, 0.44], [0, 32, -39])],
    [0.67, pose(n, [-0.63, 1.45, 0.48], [0, 1, 12])],
    [1, pose(n, [-0.63, 1.45, 0.48], [0, 1, 12])],
  ]),
};

export function interpolatePose(start, end, amount) {
  const lerp = (a, b) => a + (b - a) * amount;
  return {
    wrist: start.wrist.map((value, index) => lerp(value, end.wrist[index])),
    rotation: start.rotation.map((value, index) => {
      const offset = ((end.rotation[index] - value + 540) % 360) - 180;
      return value + offset * amount;
    }),
    digits: start.digits.map((joint, finger) =>
      joint.map((value, axis) => lerp(value, end.digits[finger][axis])),
    ),
  };
}

export function sampleClip(clip, progress) {
  const frames = clip.frames;
  if (progress <= 0 || frames.length === 1) return frames[0];
  if (progress >= 1) return frames.at(-1);
  const endIndex = frames.findIndex(({ t }) => t >= progress);
  const start = frames[endIndex - 1];
  const end = frames[endIndex];
  const fraction = (progress - start.t) / (end.t - start.t);
  return interpolatePose(start, end, fraction);
}
