// Bakgrund med parallax: moln + två lager stadssiluett.
const Background = (() => {
  const T = CONFIG.TILE;
  const HORIZON = CONFIG.HEIGHT - 2 * T; // där marken börjar

  // Deterministisk slump så att staden ser likadan ut varje gång.
  function seededRandom(seed) {
    return () => {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function makeSkyline({ width, seed, color, windows, minH, maxH }) {
    const c = Sprites.createCanvas(width, CONFIG.HEIGHT);
    const g = c.getContext('2d');
    const rand = seededRandom(seed);
    let x = 0;
    while (x < width) {
      const w = Math.min(24 + Math.floor(rand() * 5) * 8, width - x);
      const h = minH + Math.floor(rand() * (maxH - minH));
      const top = HORIZON - h;

      g.fillStyle = color;
      g.fillRect(x, top, w, h);

      if (rand() < 0.35) g.fillRect(x + Math.floor(w / 2), top - 8, 1, 8); // antenn

      for (let wy = top + 5; wy < HORIZON - 6; wy += 8) {
        for (let wx = x + 4; wx + 2 <= x + w - 4; wx += 6) {
          if (rand() < 0.5) {
            g.fillStyle = windows[Math.floor(rand() * windows.length)];
            g.fillRect(wx, wy, 2, 3);
          }
        }
      }
      x += w + Math.floor(rand() * 3) * 4;
    }
    return c;
  }

  function makeClouds(width, seed) {
    const c = Sprites.createCanvas(width, CONFIG.HEIGHT);
    const g = c.getContext('2d');
    const rand = seededRandom(seed);
    for (let i = 0; i < 4; i++) {
      const cx = Math.floor((i * width) / 4 + rand() * 60);
      const cy = 20 + Math.floor(rand() * 50);
      g.fillStyle = '#ffffff';
      g.fillRect(cx + 4, cy, 16, 4);
      g.fillRect(cx, cy + 4, 32, 8);
      g.fillRect(cx + 20, cy - 4, 8, 8);
      g.fillStyle = '#d0e4ff';
      g.fillRect(cx, cy + 10, 32, 2);
    }
    return c;
  }

  function makeStars(width, seed, count, colors) {
    const c = Sprites.createCanvas(width, CONFIG.HEIGHT);
    const g = c.getContext('2d');
    const rand = seededRandom(seed);
    for (let i = 0; i < count; i++) {
      const x = Math.floor(rand() * width);
      const y = Math.floor(rand() * (HORIZON - 8));
      g.fillStyle = colors[Math.floor(rand() * colors.length)];
      if (rand() < 0.1) {
        g.fillRect(x - 1, y, 3, 1);
        g.fillRect(x, y - 1, 1, 3);
      } else {
        g.fillRect(x, y, 1, 1);
      }
    }
    return c;
  }

  // Jorden sedd från rymden, med en skuggad nattsida.
  function makeEarth(width, cx, cy, r, seed) {
    const c = Sprites.createCanvas(width, CONFIG.HEIGHT);
    const g = c.getContext('2d');
    const rand = seededRandom(seed);
    const CELL = 4;
    const n = Math.ceil((2 * r) / CELL) + 1;
    const grid = Array.from({ length: n }, () => Array.from({ length: n }, () => rand()));

    for (let y = -r; y <= r; y++) {
      for (let x = -r; x <= r; x++) {
        const d = Math.sqrt(x * x + y * y);
        if (d > r) continue;
        const v = grid[Math.floor((y + r) / CELL)][Math.floor((x + r) / CELL)];
        const night = x * 0.8 + y * 0.6 > r * 0.45;
        let color;
        if (d > r - 1) color = night ? '#30508c' : '#9cd0ff';
        else if (v > 0.88) color = night ? '#7a8496' : '#f4f4f4';
        else if (v < 0.38) color = night ? '#1c4a24' : '#44b04c';
        else color = night ? '#142c64' : '#2c64dc';
        g.fillStyle = color;
        g.fillRect(cx + x, cy + y, 1, 1);
      }
    }
    return c;
  }

  // Kaklad tunnelvägg med lysrör och tunnelbaneskyltar. Bredden går jämnt upp i mönstren.
  function makeTunnel(width) {
    const c = Sprites.createCanvas(width, CONFIG.HEIGHT);
    const g = c.getContext('2d');

    for (let y = 24; y < HORIZON; y += 8) {
      for (let x = 0; x < width; x += 8) {
        g.fillStyle = (x + y) % 16 ? '#3a3e4c' : '#363a48';
        g.fillRect(x, y, 8, 8);
        g.fillStyle = '#2a2d38';
        g.fillRect(x, y + 7, 8, 1);
        g.fillRect(x + 7, y, 1, 8);
      }
    }
    g.fillStyle = '#1a1c24';
    g.fillRect(0, 0, width, 24);
    g.fillStyle = '#22242c';
    g.fillRect(0, HORIZON - 10, width, 10);

    for (let x = 32; x < width; x += 96) {
      g.fillStyle = 'rgba(255, 240, 180, 0.07)';
      g.beginPath();
      g.moveTo(x, 26);
      g.lineTo(x + 16, 26);
      g.lineTo(x + 48, HORIZON - 10);
      g.lineTo(x - 32, HORIZON - 10);
      g.closePath();
      g.fill();
      g.fillStyle = '#fff4c0';
      g.fillRect(x, 24, 16, 2);
    }

    for (let cx = 80; cx < width; cx += 192) {
      const cy = 72;
      for (let y = -7; y <= 7; y++) {
        for (let x = -7; x <= 7; x++) {
          const d = x * x + y * y;
          if (d > 52) continue;
          g.fillStyle = d > 40 ? '#ffffff' : '#1e5ab4';
          g.fillRect(cx + x, cy + y, 1, 1);
        }
      }
      g.fillStyle = '#ffffff';
      g.fillRect(cx - 4, cy - 4, 9, 2);
      g.fillRect(cx - 1, cy - 4, 3, 9);
    }
    return c;
  }

  // Avlägsen spiralgalax med två armar.
  function makeGalaxy(width, cx, cy, seed) {
    const c = Sprites.createCanvas(width, CONFIG.HEIGHT);
    const g = c.getContext('2d');
    const rand = seededRandom(seed);
    for (let i = 0; i < 700; i++) {
      const t = rand() * 3.2;
      const r = 3 + t * 9;
      const a = t + (i % 2) * Math.PI + (rand() - 0.5) * 0.6;
      g.fillStyle = r < 8 ? '#fff0ff' : rand() < 0.5 ? '#c890ff' : '#ff90d8';
      g.fillRect(Math.round(cx + Math.cos(a) * r * 1.6), Math.round(cy + Math.sin(a) * r * 0.7), 1, 1);
    }
    g.fillStyle = '#ffffff';
    g.fillRect(cx - 2, cy - 1, 5, 3);
    return c;
  }

  // Sken som stiger upp från horisonten (blå solkorona, eldsken över staden).
  function makeCorona(width, rgb = '56, 152, 248') {
    const c = Sprites.createCanvas(width, CONFIG.HEIGHT);
    const g = c.getContext('2d');
    const BANDS = 12;
    for (let i = 0; i < BANDS; i++) {
      const t = (i + 1) / BANDS;
      g.fillStyle = `rgba(${rgb}, ${(t * t * 0.55).toFixed(3)})`;
      g.fillRect(0, HORIZON - (BANDS - i) * 4, width, 4);
    }
    return c;
  }

  // Solutbrott: glödande plasmabågar vid horisonten.
  function makeFlares(width, seed) {
    const c = Sprites.createCanvas(width, CONFIG.HEIGHT);
    const g = c.getContext('2d');
    const rand = seededRandom(seed);
    const arcs = [];
    for (let x = 30; x < width - 40; x += 90 + Math.floor(rand() * 60)) {
      arcs.push({ x, r: 10 + Math.floor(rand() * 18), stretch: 1 + rand() * 0.8 });
    }
    for (const [color, size] of [['#4ab4ff', 3], ['#d8f8ff', 1]]) {
      g.fillStyle = color;
      for (const { x, r, stretch } of arcs) {
        for (let k = 0; k <= 60; k++) {
          const a = (Math.PI * k) / 60;
          const px = Math.round(x + Math.cos(a) * r);
          const py = Math.round(HORIZON - Math.sin(a) * r * stretch);
          g.fillRect(px - (size >> 1), py - (size >> 1), size, size);
        }
      }
    }
    return c;
  }

  // Kloakvägg med valv, slem och rör som spolar ut smutsvatten.
  function makeSewer(width) {
    const c = Sprites.createCanvas(width, CONFIG.HEIGHT);
    const g = c.getContext('2d');
    const rand = seededRandom(13);

    for (let y = 0; y < CONFIG.HEIGHT; y += 6) {
      const offset = (y / 6) % 2 ? 6 : 0;
      for (let x = -offset; x < width; x += 12) {
        g.fillStyle = rand() < 0.15 ? '#262c20' : '#20251b';
        g.fillRect(x, y, 11, 5);
      }
    }

    // Valv som leder vidare in i mörkret
    for (let cx = 64; cx < width; cx += 192) {
      for (let y = 20; y < CONFIG.HEIGHT; y++) {
        for (let x = -28; x <= 28; x++) {
          const inside = y >= 48 || x * x + (y - 48) ** 2 <= 28 * 28;
          if (!inside) continue;
          const edge = y < 48 ? x * x + (y - 48) ** 2 > 24 * 24 : Math.abs(x) > 24;
          g.fillStyle = edge ? '#3a4030' : '#070905';
          g.fillRect(cx + x, y, 1, 1);
        }
      }
    }

    // Taket och slem som droppar från det
    g.fillStyle = '#10130c';
    g.fillRect(0, 0, width, 10);
    for (let x = 0; x < width; x += 3 + Math.floor(rand() * 9)) {
      g.fillStyle = '#4e7a22';
      g.fillRect(x, 10, 2, 2 + Math.floor(rand() * 14));
    }

    // Rör med utlopp som rinner ner i vattnet
    g.fillStyle = '#4a4e44';
    g.fillRect(0, 26, width, 8);
    g.fillStyle = '#6a7064';
    g.fillRect(0, 27, width, 2);
    for (let x = 160; x < width; x += 192) {
      g.fillStyle = '#2a2e26';
      g.fillRect(x - 1, 24, 2, 12);
      g.fillStyle = '#5a5e54';
      g.fillRect(x + 20, 34, 10, 6);
      g.fillStyle = '#7aa040';
      g.fillRect(x + 22, 40, 6, 24);
      g.fillStyle = '#a8c868';
      g.fillRect(x + 24, 40, 2, 24);
    }
    return c;
  }

  const themes = {
    city: {
      sky: CONFIG.SKY_COLOR,
      layers: [
        { img: makeClouds(512, 7), factor: 0.1 },
        {
          img: makeSkyline({ width: 512, seed: 42, color: '#7aa2e8', windows: ['#a8c4f4'], minH: 70, maxH: 150 }),
          factor: 0.25,
        },
        {
          img: makeSkyline({ width: 480, seed: 1337, color: '#3a5a9c', windows: ['#ffe680', '#ffe680', '#6a8acc'], minH: 40, maxH: 110 }),
          factor: 0.5,
        },
      ],
    },
    space: {
      sky: '#07071c',
      layers: [
        { img: makeStars(512, 3, 140, ['#4a4a7a', '#7070a0']), factor: 0.05 },
        { img: makeEarth(512, 190, 60, 22, 11), factor: 0.08 },
        { img: makeStars(480, 9, 50, ['#ffffff', '#ffe8a0', '#a0c8ff']), factor: 0.2 },
      ],
    },
    subway: {
      sky: '#0c0c12',
      layers: [{ img: makeTunnel(384), factor: 0.6 }],
    },
    bluesun: {
      sky: '#04061a',
      layers: [
        { img: makeStars(512, 21, 140, ['#3a3a6a', '#6a5a9a']), factor: 0.05 },
        { img: makeGalaxy(512, 330, 64, 5), factor: 0.07 },
        { img: makeStars(480, 33, 50, ['#ffffff', '#c8e8ff', '#ffd0f0']), factor: 0.2 },
        { img: makeCorona(256), factor: 0 },
        { img: makeFlares(384, 8), factor: 0.35 },
      ],
    },
    sewer: {
      sky: '#090b07',
      layers: [{ img: makeSewer(384), factor: 0.5 }],
    },
    // Staden på natten med eldsken efter Godzillas framfart
    ruins: {
      sky: '#160a12',
      layers: [
        { img: makeStars(256, 51, 40, ['#5a3a4a', '#8a6a7a']), factor: 0 },
        { img: makeCorona(256, '248, 88, 24'), factor: 0 },
        { img: makeSkyline({ width: 512, seed: 99, color: '#2c1620', windows: ['#4a2028'], minH: 70, maxH: 150 }), factor: 0.25 },
        {
          img: makeSkyline({ width: 480, seed: 404, color: '#120a0e', windows: ['#f87800', '#f8b800', '#3a2028'], minH: 40, maxH: 110 }),
          factor: 0.5,
        },
      ],
    },
  };

  function draw(ctx, camX, theme) {
    const { sky, layers } = themes[theme];
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
    for (const { img, factor } of layers) {
      const start = -(Math.floor(camX * factor) % img.width);
      for (let x = start; x < CONFIG.WIDTH; x += img.width) {
        ctx.drawImage(img, x, 0);
      }
    }
  }

  return { draw, makeEarth, makeStars };
})();
