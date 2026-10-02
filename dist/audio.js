(() => {
  'use strict';

  const NOTES = [130.81, 146.83, 164.81, 196.00];
  const ACTIONS = {
    pulse: [440, 660],
    purchase: [523.25, 659.25],
    buy: [523.25, 659.25],
    discovery: [392, 523.25, 783.99],
    conquest: [329.63, 493.88, 659.25],
    composition: [392, 493.88, 587.33, 783.99],
    renaissance: [261.63, 392, 523.25, 783.99],
    era: [349.23, 440, 587.33],
    resonance: [523.25, 659.25, 783.99, 1046.5]
  };
  let enabled = false;
  let gestureUnlocked = false;
  let context = null;
  let master = null;
  let ambient = null;
  let activeEra = 0;
  let resonanceActive = false;

  function ambientPitch(base) {
    return base * (1 + activeEra * 0.075) * (resonanceActive ? 1.125 : 1);
  }

  function ambientFilterFrequency() {
    return 950 + activeEra * 150 + (resonanceActive ? 240 : 0);
  }

  function ambientGain() {
    return resonanceActive ? 0.041 : 0.035;
  }

  function AudioContextConstructor() {
    return window.AudioContext || window.webkitAudioContext || null;
  }

  function makeContext() {
    if (!gestureUnlocked) return null;
    if (context) return context;
    const Context = AudioContextConstructor();
    if (!Context) return null;
    try {
      context = new Context();
      master = context.createGain();
      master.gain.value = 0.72;
      master.connect(context.destination);
      return context;
    } catch {
      context = null;
      master = null;
      return null;
    }
  }

  function startAmbient() {
    if (!context || !master || ambient || !enabled || document.hidden) return;
    const now = context.currentTime;
    const bus = context.createGain();
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = ambientFilterFrequency();
    bus.gain.setValueAtTime(0.0001, now);
    const targetGain = ambientGain();
    bus.gain.exponentialRampToValueAtTime(targetGain, now + 1.8);
    filter.connect(bus);
    bus.connect(master);
    const voices = [];
    const tones = NOTES.slice(0, 3).map((base, index) => {
      const oscillator = context.createOscillator();
      const voice = context.createGain();
      oscillator.type = index === 1 ? 'triangle' : 'sine';
      oscillator.frequency.value = ambientPitch(base);
      voice.gain.value = index === 0 ? 0.38 : 0.2;
      oscillator.connect(voice);
      voice.connect(filter);
      oscillator.start();
      voices.push({ oscillator, voice, base });
      return oscillator;
    });
    const lfo = context.createOscillator();
    const lfoGain = context.createGain();
    lfo.type = 'sine';
    lfo.frequency.value = resonanceActive ? 0.09 : 0.07;
    lfoGain.gain.value = resonanceActive ? 0.012 : 0.008;
    lfo.connect(lfoGain);
    lfoGain.connect(bus.gain);
    lfo.start();
    ambient = { bus, filter, voices, lfo, lfoGain, tones };
  }

  function setEra(era) {
    const numeric = Number(era);
    const nextEra = Number.isFinite(numeric) ? Math.max(0, Math.min(3, numeric)) : 0;
    if (nextEra === activeEra) return;
    activeEra = nextEra;
    if (!context || !ambient) return;
    const now = context.currentTime;
    ambient.voices.forEach(({ oscillator, base }, index) => {
      const frequency = ambientPitch(base);
      oscillator.frequency.cancelScheduledValues(now);
      oscillator.frequency.setTargetAtTime(frequency, now, 0.65 + index * 0.15);
    });
    ambient.filter.frequency.setTargetAtTime(ambientFilterFrequency(), now, 0.8);
  }

  function updateResonanceSound(active) {
    const nextActive = Boolean(active);
    if (nextActive === resonanceActive) return;
    resonanceActive = nextActive;
    if (context && ambient) {
      const now = context.currentTime;
      ambient.voices.forEach(({ oscillator, base }, index) => {
        oscillator.frequency.cancelScheduledValues(now);
        oscillator.frequency.setTargetAtTime(ambientPitch(base), now, 0.7 + index * 0.12);
      });
      ambient.filter.frequency.setTargetAtTime(ambientFilterFrequency(), now, 0.9);
      ambient.bus.gain.setTargetAtTime(ambientGain(), now, 1.15);
      ambient.lfo.frequency.setTargetAtTime(resonanceActive ? 0.09 : 0.07, now, 1.1);
      ambient.lfoGain.gain.setTargetAtTime(resonanceActive ? 0.012 : 0.008, now, 1.1);
    }
    if (nextActive && enabled && gestureUnlocked && !document.hidden && context?.state === 'running') {
      oceanSound('resonance');
    }
  }

  function silenceAmbient() {
    if (!context || !ambient) return;
    const current = ambient;
    ambient = null;
    const now = context.currentTime;
    current.bus.gain.cancelScheduledValues(now);
    current.bus.gain.setTargetAtTime(0.0001, now, 0.16);
    window.setTimeout(() => {
      current.voices.forEach(({ oscillator }) => { try { oscillator.stop(); } catch {} });
      try { current.lfo.stop(); } catch {}
      try { current.bus.disconnect(); } catch {}
    }, 900);
  }

  function resumeFromGesture(event) {
    if (!event?.isTrusted) return;
    gestureUnlocked = true;
    if (!enabled) return;
    const audio = makeContext();
    if (!audio) return;
    if (audio.state === 'suspended') audio.resume().catch(() => {});
    if (audio.state !== 'closed') startAmbient();
  }

  function setOceanSound(value) {
    enabled = Boolean(value);
    if (enabled && gestureUnlocked && !document.hidden) {
      const audio = makeContext();
      if (!audio) return;
      if (audio.state === 'suspended') audio.resume().catch(() => {});
      if (audio.state !== 'closed') startAmbient();
    }
    else silenceAmbient();
  }

  function oceanSound(event) {
    if (!enabled || !gestureUnlocked || document.hidden) return;
    const audio = makeContext();
    if (!audio || audio.state !== 'running' || !master) return;
    const name = typeof event === 'string' ? event : event?.type;
    const chord = ACTIONS[name];
    if (!chord) return;
    const now = audio.currentTime;
    const bus = audio.createGain();
    bus.gain.setValueAtTime(0.0001, now);
    bus.gain.exponentialRampToValueAtTime(name === 'pulse' ? 0.055 : 0.075, now + 0.025);
    bus.gain.exponentialRampToValueAtTime(0.0001, now + (name === 'pulse' ? 0.24 : 0.58));
    bus.connect(master);
    chord.forEach((frequency, index) => {
      const oscillator = audio.createOscillator();
      const voice = audio.createGain();
      oscillator.type = index === 0 ? 'sine' : 'triangle';
      oscillator.frequency.setValueAtTime(frequency * (1 + activeEra * 0.025), now);
      voice.gain.value = 0.18 / Math.sqrt(chord.length);
      oscillator.connect(voice);
      voice.connect(bus);
      oscillator.start(now + index * 0.035);
      oscillator.stop(now + (name === 'pulse' ? 0.26 : 0.62));
    });
    window.setTimeout(() => { try { bus.disconnect(); } catch {} }, 900);
  }

  document.addEventListener('pointerdown', resumeFromGesture, { passive: true });
  document.addEventListener('keydown', resumeFromGesture);
  document.addEventListener('visibilitychange', () => {
    if (!context) return;
    if (document.hidden) {
      silenceAmbient();
      if (context.state === 'running') context.suspend().catch(() => {});
    }
    // Audio resumes on the next user gesture after returning to the page.
  });

  window.setOceanSound = setOceanSound;
  window.oceanSound = oceanSound;
  window.updateOceanSound = setEra;
  window.updateResonanceSound = updateResonanceSound;
})();
