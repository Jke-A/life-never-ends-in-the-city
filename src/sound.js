// Enkla 8-bitsljud via Web Audio. Ljudet låses upp vid första tangenttryckningen.
const Sound = (() => {
  let ac = null;

  function context() {
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ac = new AC();
    }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }

  window.addEventListener('keydown', context, { once: true });

  // Lägg en egen ljudfil här så används den i stället för det syntetiska ljudet.
  const SIREN_FILE = 'assets/sounds/sirenhead.mp3';
  let sirenClip = null;
  const clip = new Audio();
  clip.preload = 'auto';
  clip.addEventListener('canplaythrough', () => (sirenClip = clip), { once: true });
  clip.src = SIREN_FILE;

  const CLIP_VOLUME = 0.7;
  const playing = new Set();

  // Ger ett handtag med stop(fadeSekunder) och active, och håller koll på allt som spelas.
  function track(stopFn) {
    const handle = {
      active: true,
      stop(fade = 0.6) {
        if (!handle.active) return;
        handle.active = false;
        playing.delete(handle);
        stopFn(fade);
      },
    };
    playing.add(handle);
    return handle;
  }

  // Spelar sirenen tills stop() anropas eller ljudet tar slut.
  // duration används bara för det syntetiska ljudet.
  function siren(duration = 6) {
    if (sirenClip) {
      const a = sirenClip.cloneNode();
      a.volume = CLIP_VOLUME;
      a.play().catch(() => {});
      const handle = track((fade) => {
        if (fade <= 0) return a.pause();
        const steps = 12;
        let i = 0;
        const id = setInterval(() => {
          a.volume = CLIP_VOLUME * Math.max(0, 1 - ++i / steps);
          if (i >= steps) {
            clearInterval(id);
            a.pause();
          }
        }, (fade * 1000) / steps);
      });
      a.addEventListener('ended', () => handle.stop(0));
      return handle;
    }

    return trackNode(synthSiren(duration), duration);
  }

  // Gör ett stoppbart handtag av en gain-nod som spelar i `duration` sekunder.
  function trackNode(out, duration) {
    const handle = track((fade) => {
      if (!out) return;
      const now = out.context.currentTime;
      out.gain.cancelScheduledValues(now);
      out.gain.setValueAtTime(out.gain.value, now);
      out.gain.linearRampToValueAtTime(0, now + Math.max(fade, 0.01));
    });
    setTimeout(() => handle.stop(0), duration * 1000);
    return handle;
  }

  function stopAll(fade = 0.2) {
    for (const handle of [...playing]) handle.stop(fade);
  }

  function distortionCurve(k) {
    const n = 1024;
    const curve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      curve[i] = ((1 + k) * x) / (1 + k * Math.abs(x));
    }
    return curve;
  }

  // Luftvärnssiren som stiger långsamt, ligger kvar och sjunker, med distorsion och radiobrus.
  function synthSiren(duration) {
    const a = context();
    if (!a) return null;
    const t = a.currentTime;
    const end = t + duration;
    const riseEnd = t + duration * 0.4;
    const fallStart = end - duration * 0.35;

    const out = a.createGain();
    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(0.12, t + 0.15);
    out.gain.setValueAtTime(0.12, end - 0.4);
    out.gain.exponentialRampToValueAtTime(0.0001, end);
    out.connect(a.destination);

    // Distorsion och resonant lågpass ger en sliten, metallisk tratt
    const shaper = a.createWaveShaper();
    shaper.curve = distortionCurve(30);
    const horn = a.createBiquadFilter();
    horn.type = 'lowpass';
    horn.frequency.value = 1800;
    horn.Q.value = 4;
    shaper.connect(horn).connect(out);

    // Mekaniskt fladder i tonhöjden
    const flutter = a.createOscillator();
    flutter.frequency.value = 6;
    const flutterDepth = a.createGain();
    flutterDepth.gain.value = 25; // cent
    flutter.connect(flutterDepth);
    flutter.start(t);
    flutter.stop(end);

    // Två svävande sågtandsvågor plus en oktav ner för tyngd
    for (const [ratio, type, level] of [[1, 'sawtooth', 0.5], [1.006, 'sawtooth', 0.5], [0.5, 'square', 0.3]]) {
      const osc = a.createOscillator();
      osc.type = type;
      const f = osc.frequency;
      f.setValueAtTime(110 * ratio, t);
      f.exponentialRampToValueAtTime(520 * ratio, riseEnd);
      f.setValueAtTime(520 * ratio, fallStart);
      f.exponentialRampToValueAtTime(90 * ratio, end);
      flutterDepth.connect(osc.detune);

      const g = a.createGain();
      g.gain.value = level;
      osc.connect(g).connect(shaper);
      osc.start(t);
      osc.stop(end);
    }

    // Radiobrus
    const buffer = a.createBuffer(1, Math.ceil(a.sampleRate * duration), a.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const noise = a.createBufferSource();
    noise.buffer = buffer;
    const radio = a.createBiquadFilter();
    radio.type = 'bandpass';
    radio.frequency.value = 2500;
    radio.Q.value = 0.8;
    const noiseGain = a.createGain();
    noiseGain.gain.value = 0.25;
    noise.connect(radio).connect(noiseGain).connect(out);
    noise.start(t);
    return out;
  }

  // Kort 8-bitsljud där tonen glider från `from` till `to` Hz.
  function blip(type, from, to, duration, volume, delay = 0) {
    const a = context();
    if (!a) return;
    const t = a.currentTime + delay;
    const osc = a.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(to, t + duration);
    const gain = a.createGain();
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(gain).connect(a.destination);
    osc.start(t);
    osc.stop(t + duration);
  }

  // Lågfrekvent muller (raketmotor, tåg som dundrar förbi).
  function rumble(duration) {
    const a = context();
    if (!a) return trackNode(null, duration);
    const t = a.currentTime;
    const buffer = a.createBuffer(1, Math.ceil(a.sampleRate * duration), a.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = a.createBufferSource();
    src.buffer = buffer;
    const lp = a.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 180;
    const out = a.createGain();
    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(0.5, t + 0.4);
    out.gain.setValueAtTime(0.5, t + Math.max(0.4, duration - 0.5));
    out.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    src.connect(lp).connect(out).connect(a.destination);
    src.start(t);
    return trackNode(out, duration);
  }

  // Tågtuta: två sågtandstoner i ett dissonant intervall.
  function horn() {
    const a = context();
    if (!a) return;
    const t = a.currentTime;
    const out = a.createGain();
    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(0.06, t + 0.05);
    out.gain.setValueAtTime(0.06, t + 0.7);
    out.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    const lp = a.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1400;
    lp.connect(out).connect(a.destination);
    for (const f of [311, 370]) {
      const osc = a.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = f;
      osc.connect(lp);
      osc.start(t);
      osc.stop(t + 0.9);
    }
  }

  // Brusstöt där ett filter glider från `from` till `to` Hz (explosion, plask).
  function noiseBurst(d, from, to, volume) {
    const a = context();
    if (!a) return;
    const t = a.currentTime;
    const buffer = a.createBuffer(1, Math.ceil(a.sampleRate * d), a.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = a.createBufferSource();
    src.buffer = buffer;
    const lp = a.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(from, t);
    lp.frequency.exponentialRampToValueAtTime(to, t + d);
    const out = a.createGain();
    out.gain.setValueAtTime(volume, t);
    out.gain.exponentialRampToValueAtTime(0.0001, t + d);
    src.connect(lp).connect(out).connect(a.destination);
    src.start(t);
  }

  // Helikopterrotor: brus som hackas upp av en fyrkantsvåg. Spelar tills stop() anropas.
  function rotor() {
    const a = context();
    if (!a) return track(() => {});
    const buffer = a.createBuffer(1, a.sampleRate, a.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = a.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    const lp = a.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 400;
    const chop = a.createGain();
    chop.gain.value = 0.5;
    const lfo = a.createOscillator();
    lfo.type = 'square';
    lfo.frequency.value = 14;
    const depth = a.createGain();
    depth.gain.value = 0.5;
    lfo.connect(depth).connect(chop.gain);
    const out = a.createGain();
    out.gain.value = 0.15;
    src.connect(lp).connect(chop).connect(out).connect(a.destination);
    src.start();
    lfo.start();
    return track((fade) => {
      const now = a.currentTime;
      const end = now + Math.max(fade, 0.01);
      out.gain.cancelScheduledValues(now);
      out.gain.setValueAtTime(out.gain.value, now);
      out.gain.linearRampToValueAtTime(0, end);
      src.stop(end + 0.05);
      lfo.stop(end + 0.05);
    });
  }

  // Polissiren som växlar mellan två toner.
  function policeSiren(duration) {
    const a = context();
    if (!a) return trackNode(null, duration);
    const t = a.currentTime;
    const osc = a.createOscillator();
    osc.type = 'square';
    for (let i = 0; i * 0.4 < duration; i++) osc.frequency.setValueAtTime(i % 2 ? 700 : 950, t + i * 0.4);
    const out = a.createGain();
    out.gain.value = 0.04;
    osc.connect(out).connect(a.destination);
    osc.start(t);
    osc.stop(t + duration);
    return trackNode(out, duration);
  }

  const boom = () => noiseBurst(0.6, 1200, 80, 0.3); // explosion
  const splash = () => noiseBurst(0.35, 4000, 500, 0.15); // plask i vattnet
  const swim = () => blip('sine', 200, 420, 0.12, 0.05); // simtag
  const sputter = () => blip('square', 120, 50, 0.08, 0.08); // raketmotorn hackar
  const nom = () => blip('square', 420, 280, 0.06, 0.06); // äter glass
  const sick = () => blip('sawtooth', 320, 70, 1.4, 0.06); // giftet verkar
  const death = () => { // spelaren dör: sorgsen fallande melodi
    [494, 440, 392, 330].forEach((f, i) => blip('square', f, f * 0.97, i === 3 ? 0.9 : 0.22, 0.09, i * 0.25));
    blip('triangle', 110, 55, 1.0, 0.12, 0.75);
  };
  const shoot = () => blip('square', 900, 300, 0.06, 0.035); // helikopterns kulspruta
  const bossHit = () => blip('square', 180, 110, 0.05, 0.05); // skott träffar Godzilla
  const roar = () => { // Godzilla vålar
    blip('sawtooth', 190, 55, 1.4, 0.09);
    blip('sawtooth', 130, 40, 1.4, 0.07);
    noiseBurst(1.4, 1400, 150, 0.22);
  };
  const breath = () => blip('sawtooth', 500, 1500, 0.4, 0.05); // atomeld
  const thud = () => blip('sine', 90, 35, 0.3, 0.25); // tunga steg
  const beep = () => blip('sine', 1000, 1000, 0.08, 0.05); // hjärtmonitor
  const crack = () => noiseBurst(0.12, 7000, 1500, 0.2); // fönstret spricker
  const glass = () => { // fönstret krossas
    noiseBurst(0.6, 9000, 2500, 0.25);
    [0, 1, 2].forEach((i) => blip('triangle', 2600 + i * 500, 2000, 0.15, 0.03, 0.05 + i * 0.08));
  };
  const fuse = () => noiseBurst(0.08, 9000, 5000, 0.03); // dynamitens ståntråd
  const click = () => blip('square', 2200, 1800, 0.03, 0.05); // handfängsel

  const boing = () => blip('square', 150, 900, 0.5, 0.1); // studsmatta
  const stomp = () => blip('square', 500, 60, 0.15, 0.12); // hopp på fiende
  const hit = () => blip('sawtooth', 300, 40, 0.4, 0.12); // spelaren träffas
  const growl = () => blip('sawtooth', 160, 70, 0.3, 0.08); // Venom hoppar
  const splat = () => blip('sawtooth', 220, 40, 0.25, 0.1); // blod sprutar
  const ghost = () => { // spöke stiger upp
    blip('sine', 300, 700, 0.6, 0.05);
    blip('sine', 700, 350, 0.6, 0.05, 0.6);
  };
  const teleport = () => blip('sine', 1500, 100, 0.4, 0.1); // Herobrine dyker upp/försvinner
  const whistle = () => blip('sine', 1800, 400, 1.0, 0.025); // fallande bomb
  const giggle = () => // Momo får syn på spelaren
    [0, 1, 2, 3].forEach((i) => blip('triangle', 700 + i * 120, 600 + i * 120, 0.09, 0.07, i * 0.1));
  const alarm = () => // flyglarm
    [0, 1, 2, 3].forEach((i) => blip('square', i % 2 ? 660 : 880, i % 2 ? 660 : 880, 0.2, 0.05, i * 0.22));
  const fanfare = () =>
    [523, 659, 784, 1047, 784, 1047].forEach((f, i) =>
      blip('square', f, f * 1.01, i === 5 ? 0.7 : 0.14, 0.08, i * 0.15));

  return {
    siren, stopAll, boing, stomp, hit, rumble, horn, fanfare,
    boom, growl, teleport, whistle, giggle, alarm, splat, ghost,
    splash, swim, sputter, nom, sick,
    rotor, policeSiren, death, shoot, bossHit, roar, breath, thud, beep, crack, glass, fuse, click,
  };
})();
