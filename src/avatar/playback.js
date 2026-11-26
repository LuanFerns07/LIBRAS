import { clips, interpolatePose, neutralPose, sampleClip } from './clips.js';

const transitionSeconds = 0.18;

export function createPlayback({
  paint, requestFrame, cancelFrame, onStep = () => {}, onState = () => {},
}) {
  let steps = [];
  let index = 0;
  let elapsed = 0;
  let lastTime;
  let frame;
  let speed = 1;
  let state = 'paused';
  let disposed = false;

  function setState(next) {
    state = next;
    onState(state);
  }

  function halt() {
    if (frame !== undefined) cancelFrame(frame);
    frame = undefined;
    lastTime = undefined;
  }

  function currentPose() {
    if (!steps.length) return neutralPose;
    const active = steps[index].clip;
    if (index === 0) return sampleClip(active, elapsed / active.seconds);
    if (elapsed >= transitionSeconds) {
      return sampleClip(active, (elapsed - transitionSeconds) / active.seconds);
    }

    const previous = steps[index - 1].clip;
    const movement = elapsed / transitionSeconds;
    const eased = movement * movement * (3 - 2 * movement);
    const pose = interpolatePose(sampleClip(previous, 1), sampleClip(active, 0), eased);

    // Um deslocamento breve torna visíveis letras consecutivas iguais.
    if (previous === active && active !== clips.pause) {
      pose.wrist[0] += 0.10 * Math.sin(movement * Math.PI);
      pose.wrist[1] -= 0.04 * Math.sin(movement * Math.PI);
    }
    return pose;
  }

  function notifyStep() {
    onStep(steps[index]?.step ?? null, steps.length ? index : -1);
  }

  function tick(now) {
    frame = undefined;
    if (state !== 'playing' || disposed) return;

    if (lastTime !== undefined) {
      elapsed += Math.min(0.10, Math.max(0, (now - lastTime) / 1000)) * speed;
    }
    lastTime = now;

    const duration = steps[index].clip.seconds + (index > 0 ? transitionSeconds : 0);
    if (elapsed >= duration) {
      if (index === steps.length - 1) {
        elapsed = duration;
        paint(currentPose());
        halt();
        setState('finished');
        return;
      }
      elapsed -= duration;
      index += 1;
      notifyStep();
    }
    paint(currentPose());
    if (!disposed && state === 'playing') frame = requestFrame(tick);
  }

  function play() {
    if (disposed || state === 'playing' || steps.length === 0) return;
    if (state === 'finished') {
      elapsed = 0;
      index = 0;
      paint(currentPose());
      notifyStep();
    }
    setState('playing');
    if (!disposed && state === 'playing') frame = requestFrame(tick);
  }

  return {
    setSequence(sequence) {
      if (disposed) return;
      const prepared = sequence.map((step) => {
        if (!step || !Object.hasOwn(clips, step.id)) {
          throw new RangeError('Animação fora do catálogo.');
        }
        return { step: { ...step }, clip: clips[step.id] };
      });
      halt();
      steps = prepared;
      elapsed = 0;
      index = 0;
      paint(currentPose());
      setState('paused');
      notifyStep();
    },
    play,
    pause() {
      if (disposed || state !== 'playing') return;
      halt();
      setState('paused');
    },
    restart() {
      if (disposed || steps.length === 0) return;
      halt();
      index = 0;
      elapsed = 0;
      paint(currentPose());
      const wasPlaying = state === 'playing';
      state = 'paused';
      notifyStep();
      if (wasPlaying && state === 'paused') {
        state = 'playing';
        frame = requestFrame(tick);
      } else {
        play();
      }
    },
    setSpeed(value) {
      if (!Number.isFinite(value) || value < 0.25 || value > 2) {
        throw new RangeError('Use uma velocidade entre 0,25 e 2.');
      }
      speed = value;
    },
    dispose() {
      disposed = true;
      halt();
    },
  };
}
