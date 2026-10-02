const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const audioSource = fs.readFileSync(path.join(__dirname, '..', 'audio.js'), 'utf8');

function audioSession() {
  const listeners = new Map();
  const timers = [];
  const contexts = [];
  const document = {
    hidden: false,
    addEventListener(name, handler) { listeners.set(name, handler); },
  };
  const parameter = () => ({
    value: 0,
    targets: [],
    setValueAtTime(value) { this.value = value; },
    exponentialRampToValueAtTime(value) { this.value = value; },
    setTargetAtTime(value, _time, constant) { this.value = value; this.targets.push({ value, constant }); },
    cancelScheduledValues() {},
  });
  class AudioNode {
    constructor(kind) {
      this.kind = kind;
      this.gain = parameter();
      this.frequency = parameter();
      this.connections = [];
      this.starts = [];
      this.stops = [];
      this.disconnected = false;
    }
    connect(node) { this.connections.push(node); return node; }
    start(when) { this.starts.push(when); }
    stop(when) { this.stops.push(when); }
    disconnect() { this.disconnected = true; }
  }
  class MockAudioContext {
    constructor() {
      this.currentTime = 10;
      this.state = 'running';
      this.destination = new AudioNode('destination');
      this.nodes = [];
      this.resumeCalls = 0;
      this.suspendCalls = 0;
      contexts.push(this);
    }
    createGain() { const node = new AudioNode('gain'); this.nodes.push(node); return node; }
    createBiquadFilter() { const node = new AudioNode('filter'); this.nodes.push(node); return node; }
    createOscillator() { const node = new AudioNode('oscillator'); this.nodes.push(node); return node; }
    resume() { this.resumeCalls++; this.state = 'running'; return Promise.resolve(); }
    suspend() { this.suspendCalls++; this.state = 'suspended'; return Promise.resolve(); }
  }
  const window = {
    AudioContext: MockAudioContext,
    setTimeout(callback) { timers.push(callback); return timers.length; },
  };
  const context = vm.createContext({ document, window });
  vm.runInContext(audioSource, context);
  return {
    document,
    listeners,
    contexts,
    window,
    flushTimers() { while (timers.length) timers.shift()(); },
    oscillators() { return contexts.flatMap(audio => audio.nodes.filter(node => node.kind === 'oscillator')); },
    resonanceChords() {
      return this.oscillators().filter(node => node.frequency.targets.length === 0 && node.frequency.value >= 500 && node.frequency.value <= 1100 && node.stops.length > 0);
    },
  };
}

test('sound waits for a trusted gesture and resonance changes only once per state transition', () => {
  const audio = audioSession();
  audio.window.setOceanSound(true);
  audio.window.oceanSound('era');
  assert.equal(audio.contexts.length, 0, 'enabling sound must not create an AudioContext before a user gesture');
  audio.listeners.get('pointerdown')({ isTrusted: false });
  assert.equal(audio.contexts.length, 0, 'an untrusted event must not unlock audio');

  audio.listeners.get('pointerdown')({ isTrusted: true });
  assert.equal(audio.contexts.length, 1);
  const context = audio.contexts[0];
  const ambientVoices = audio.oscillators().filter(node => node.starts[0] === undefined);
  assert.equal(ambientVoices.length, 4, 'the first trusted gesture starts three ambient voices and one LFO');

  audio.window.updateOceanSound(2);
  audio.window.updateResonanceSound(true);
  const firstChordCount = audio.resonanceChords().length;
  assert.equal(firstChordCount, 4, 'one active transition plays one four-note resonance chord');
  assert.equal(ambientVoices[0].frequency.value, 130.81 * 1.15 * 1.125);
  const oscillatorCount = audio.oscillators().length;
  audio.window.updateResonanceSound(true);
  audio.window.updateResonanceSound(true);
  assert.equal(audio.resonanceChords().length, firstChordCount, 'repeated active updates must not replay the transition chord');
  assert.equal(audio.oscillators().length, oscillatorCount, 'repeated active updates must not duplicate ambient voices');
  assert.equal(audio.contexts.length, 1, 'repeated toggles reuse the unlocked context');

  audio.window.updateResonanceSound(false);
  assert.equal(ambientVoices[0].frequency.targets.at(-1).value, 130.81 * 1.15, 'leaving resonance returns the ambient tuning to the current era');
  const beforeReactivation = audio.resonanceChords().length;
  audio.window.updateResonanceSound(true);
  assert.equal(audio.resonanceChords().length, beforeReactivation + 4, 'a new inactive-to-active transition plays exactly one chord');
});

test('sound-off and hidden-page transitions stop ambience; a trusted return resumes resonance tuning', () => {
  const audio = audioSession();
  audio.window.setOceanSound(true);
  audio.listeners.get('pointerdown')({ isTrusted: true });
  audio.window.updateOceanSound(2);
  audio.window.updateResonanceSound(true);
  const firstContext = audio.contexts[0];
  const firstAmbient = audio.oscillators().filter(node => node.starts[0] === undefined);
  assert.equal(firstAmbient.length, 4);

  audio.document.hidden = true;
  audio.listeners.get('visibilitychange')();
  assert.equal(firstContext.suspendCalls, 1);
  audio.flushTimers();
  assert.ok(firstAmbient.every(node => node.stops.length === 1), 'hiding the page stops every ambient oscillator after its fade');
  const oscillatorCountWhileHidden = audio.oscillators().length;
  audio.listeners.get('pointerdown')({ isTrusted: true });
  assert.equal(audio.oscillators().length, oscillatorCountWhileHidden, 'a gesture while hidden must not restart ambience');

  audio.document.hidden = false;
  audio.listeners.get('pointerdown')({ isTrusted: true });
  assert.equal(audio.contexts.length, 1, 'returning from suspension reuses the same context');
  assert.equal(firstContext.resumeCalls, 1);
  const resumedAmbient = audio.oscillators().filter(node => node.starts[0] === undefined && node.stops.length === 0);
  assert.equal(resumedAmbient.length, 4);
  assert.equal(resumedAmbient[0].frequency.value, 130.81 * 1.15 * 1.125, 'the resonance tuning survives visibility suspension');

  audio.window.updateResonanceSound(false);
  assert.equal(resumedAmbient[0].frequency.targets.at(-1).value, 130.81 * 1.15, 'the resumed ambience returns to idle tuning cleanly');
  audio.window.setOceanSound(false);
  audio.flushTimers();
  assert.ok(resumedAmbient.every(node => node.stops.length === 1), 'turning sound off stops the resumed ambient voices');
});
