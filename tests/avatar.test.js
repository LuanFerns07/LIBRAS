import assert from 'node:assert/strict';
import { test } from 'node:test';
import { clips, neutralPose, sampleClip } from '../src/avatar/clips.js';
import { createPlayback } from '../src/avatar/playback.js';
import { createRig } from '../src/avatar/rig.js';

test('o catálogo cobre A–Z, a cedilha e os sinais da lição e apresentação', () => {
  for (const letter of 'abcdefghijklmnopqrstuvwxyzç') {
    assert.ok(clips[`letter-${letter}`], letter);
  }
  for (const name of ['cinco', 'espelho', 'amarelo', 'meu', 'nome']) {
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
  for (const [a, b] of ['gq', 'nu']) {
    assert.deepEqual(get(a).digits, get(b).digits, a + b);
    assert.notDeepEqual(get(a).rotation, get(b).rotation, a + b);
  }
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
      rig.applyPose(pose, neutralPose.digits);
      rig.model.updateMatrixWorld(true);
      rig.model.traverse((node) => assert.ok(node.matrixWorld.elements.every(Number.isFinite), id));
    }
  }
  rig.dispose();
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
  assert.ok(painted.some((pose) =>
    pose.wrist[0] > clips['letter-n'].frames[0].wrist[0] + 0.08 && pose.wrist[1] > 1.8,
  ));
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
