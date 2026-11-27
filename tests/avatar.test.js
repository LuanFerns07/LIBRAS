import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Box3, Euler, Vector3 } from 'three';
import { clips, interpolatePose, leftRest, neutralPose, sampleClip } from '../src/avatar/clips.js';
import { createPlayback } from '../src/avatar/playback.js';
import { AVATAR_FRAME } from '../src/avatar/player.js';
import { createRig } from '../src/avatar/rig.js';

test('o catálogo cobre A–Z, a cedilha e os sinais da lição e apresentação', () => {
  for (const letter of 'abcdefghijklmnopqrstuvwxyzç') {
    assert.ok(clips[`letter-${letter}`], letter);
  }
  for (const name of ['cinco', 'espelho', 'amarelo', 'meu', 'nome', 'aluno', 'aluno-fortaleza-historico', 'bom', 'dia']) {
    assert.ok(clips[`signal-${name}`], name);
  }
  assert.equal(clips['letter-ç'], clips['letter-cedilha']);
});

test('cada letra tem pose, posição, orientação ou trajetória própria', () => {
  const letterAnimations = [...'abcdefghijklmnopqrstuvwxyzç'].map((letter) => clips[`letter-${letter}`]);
  assert.equal(new Set(letterAnimations.map(({ frames }) => JSON.stringify(frames))).size, 27);
  for (const letter of 'hjkpwxyzç') {
    const { frames } = clips[`letter-${letter}`];
    assert.ok(frames.length >= 2, letter);
    assert.notDeepEqual(frames[0].rotation.concat(frames[0].wrist),
      frames.at(-1).rotation.concat(frames.at(-1).wrist), letter);
  }
});

test('as formas manuais permanecem distintas em pares próximos', () => {
  const get = (letter) => sampleClip(clips[`letter-${letter}`], 0);
  for (const [a, b] of ['as', 'co', 'dg', 'ft', 'ij', 'lr', 'mn', 'uv']) {
    if (a === 'i') {
      assert.deepEqual(get(a).digits, get(b).digits);
      continue;
    }
    assert.notDeepEqual(get(a).digits, get(b).digits, a + b);
  }
  assert.deepEqual(get('g').digits, get('q').digits);
  assert.notDeepEqual(get('g').rotation, get('q').rotation);
});

test('M e N exibem o dorso e os dedos voltados para baixo, e U exibe a palma', () => {
  const [m, n, u] = ['m', 'n', 'u'].map((letter) => sampleClip(clips[`letter-${letter}`], 0));
  const radians = Math.PI / 180;
  for (const pose of [m, n, u]) {
    const [pitch, yaw, roll] = pose.rotation.map(degrees => degrees * radians);
    const wrist = new Euler(pitch, yaw, roll, 'YXZ');
    const palm = new Vector3(0, 0, 1).applyEuler(wrist);
    const axis = new Vector3(1, 0, 0);
    for (const [bend] of pose.digits.slice(1, 3)) {
      const finger = new Vector3(0, 1, 0).applyAxisAngle(axis, bend * radians).applyEuler(wrist);
      if (pose === u) {
        assert.ok(finger.y > 0.9 && palm.z > 0.7);
      } else {
        assert.ok(finger.y < -0.9 && finger.z > 0.2 && palm.z < -0.7);
        assert.ok(bend > 10 && bend < 30);
      }
    }
  }
  assert.deepEqual(m.digits.slice(1, 3), n.digits.slice(1, 3));
  assert.deepEqual(m.digits[3], m.digits[2]);
  assert.ok(n.digits[3][0] > 45 && u.digits[3][0] > 45);
  assert.equal(interpolatePose(n, u, 0.5).elbowLift, n.elbowLift / 2);
});

test('todos os quadros amostrados produzem articulações e coordenadas finitas', () => {
  const rig = createRig();
  for (const [id, clip] of Object.entries(clips)) {
    assert.equal(clip.frames[0].t, 0, id);
    if (clip.frames.length > 1) assert.equal(clip.frames.at(-1).t, 1, id);
    assert.ok(clip.frames.every(({ t }, index) => !index || t > clip.frames[index - 1].t), id);
    for (const fraction of [0, 0.24, 0.5, 0.76, 1]) {
      const pose = sampleClip(clip, fraction);
      assert.equal(pose.digits.length, 5, id);
      assert.ok(pose.digits.every((digit) => digit.length === 4), id);
      rig.applyPose(pose);
      rig.model.updateMatrixWorld(true);
      rig.model.traverse((node) => assert.ok(node.matrixWorld.elements.every(Number.isFinite), id));
    }
  }
  rig.dispose();
});

test('o enquadramento mínimo contém o corpo e as mãos nos quadros amostrados', () => {
  const rig = createRig();
  const { centerY, halfHeight, halfWidth } = AVATAR_FRAME;
  const box = new Box3();
  for (const [id, clip] of Object.entries(clips)) {
    for (let position = 0; position <= 20; position++) {
      const progress = position / 20;
      rig.applyPose(sampleClip(clip, progress));
      const { min, max } = box.setFromObject(rig.model, true);
      assert.ok(min.x >= -halfWidth && max.x <= halfWidth, `${id} em ${progress} no eixo X`);
      assert.ok(min.y >= centerY - halfHeight && max.y <= centerY + halfHeight,
        `${id} em ${progress} no eixo Y`);
    }
  }
  rig.dispose();
});

test('a variante histórica de aluno articula as duas mãos com trajetória espelhada', () => {
  const animation = clips['signal-aluno-fortaleza-historico'];
  const start = sampleClip(animation, 0);
  const end = sampleClip(animation, 1);
  assert.ok(end.wrist[0] < start.wrist[0]);
  for (const t of [0, 0.23, 0.6, 1]) {
    const { wrist, left } = sampleClip(animation, t);
    assert.ok(Math.abs(wrist[0] + left.wrist[0]) < 1e-10);
    assert.deepEqual(wrist.slice(1), left.wrist.slice(1));
  }

  const oneHanded = sampleClip(clips['signal-aluno'], 1);
  assert.equal(oneHanded.left, undefined);
  assert.deepEqual(interpolatePose(oneHanded, start, 0).left, leftRest);
  const halfway = interpolatePose(oneHanded, start, 0.5);
  assert.ok(halfway.left.wrist[1] > leftRest.wrist[1]);
  assert.ok(halfway.left.wrist[1] < start.left.wrist[1]);
});

function setup() {
  let time = 0;
  let lastFrame = 0;
  const scheduled = new Map();
  const states = [];
  const painted = [];
  const steps = [];
  const playback = createPlayback({
    paint: (pose) => painted.push(pose),
    requestFrame: (callback) => {
      lastFrame++;
      scheduled.set(lastFrame, callback);
      return lastFrame;
    },
    cancelFrame: (id) => scheduled.delete(id),
    onStep: (step, index) => steps.push([step?.id ?? null, index]),
    onState: (state) => states.push(state),
  });

  return {
    playback, states, painted, steps, scheduled,
    advance(frames, interval = 50) {
      for (let i = 0; i < frames; i++) {
        time += interval;
        for (const [key, callback] of [...scheduled]) {
          scheduled.delete(key);
          callback(time);
        }
      }
    },
  };
}

test('a soletração mantém letras repetidas e pausas na ordem', () => {
  const { playback, states, steps, painted, advance } = setup();
  playback.setSequence([
    { id: 'letter-n', label: 'N' },
    { id: 'letter-n', label: 'N' },
    { id: 'pause', label: 'Pausa' },
    { id: 'letter-a', label: 'A' },
  ]);
  assert.deepEqual(steps, [['letter-n', 0]]);
  playback.play();
  advance(75);
  assert.deepEqual(steps, [['letter-n', 0], ['letter-n', 1], ['pause', 2], ['letter-a', 3]]);
  assert.deepEqual(states, ['paused', 'playing', 'finished']);
  const n = sampleClip(clips['letter-n'], 0);
  assert.ok(painted.some(pose =>
    pose.wrist[0] > n.wrist[0] + 0.08 && pose.elbowLift === n.elbowLift));
});

test('pausar, alterar velocidade, repetir e trocar de sequência afetam o relógio', () => {
  const { playback, states, steps, advance, scheduled } = setup();
  playback.setSequence([{ id: 'letter-j', label: 'J' }]);
  playback.setSpeed(0.5);
  playback.play();
  advance(25);
  assert.equal(states.at(-1), 'playing');
  playback.pause();
  assert.equal(scheduled.size, 0);
  advance(10);
  assert.equal(states.at(-1), 'paused');
  playback.play();
  advance(27);
  assert.equal(states.at(-1), 'finished');

  playback.restart();
  assert.equal(scheduled.size, 1);
  assert.deepEqual(steps.at(-1), ['letter-j', 0]);
  assert.throws(() => playback.setSequence([{ id: 'toString' }]), RangeError);
  assert.equal(scheduled.size, 1);
  playback.restart();
  assert.equal(scheduled.size, 1);
  playback.setSequence([{ id: 'signal-cinco', label: 'Cinco' }]);
  assert.equal(scheduled.size, 0);
  assert.deepEqual(steps.at(-1), ['signal-cinco', 0]);
  playback.play();
  playback.dispose();
  assert.equal(scheduled.size, 0);
});

test('uma fila vazia volta à posição de repouso', () => {
  const { playback, states, steps, painted, scheduled } = setup();
  playback.setSequence([]);
  playback.play();
  assert.deepEqual(steps, [[null, -1]]);
  assert.deepEqual(states, ['paused']);
  assert.equal(painted.at(-1), neutralPose);
  assert.equal(scheduled.size, 0);
});
