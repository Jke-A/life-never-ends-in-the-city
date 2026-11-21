// All grafik genereras i kod som pixel-art och förrenderas till små canvas-bilder.
const Sprites = (() => {
  function createCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }

  // Ritar en sprite från textrader där varje tecken mappas mot en färg i paletten.
  function fromRows(rows, palette, flip = false) {
    const w = Math.max(...rows.map((r) => r.length));
    const c = createCanvas(w, rows.length);
    const g = c.getContext('2d');
    rows.forEach((row, y) => {
      [...row].forEach((ch, x) => {
        const color = palette[ch];
        if (!color) return;
        g.fillStyle = color;
        g.fillRect(flip ? w - 1 - x : x, y, 1, 1);
      });
    });
    return c;
  }

  // Ritar en sprite där färgen för varje pixel bestäms av en funktion (null = genomskinlig).
  function makeSprite(w, h, colorAt) {
    const c = createCanvas(w, h);
    const g = c.getContext('2d');
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const color = colorAt(x, y);
        if (!color) continue;
        g.fillStyle = color;
        g.fillRect(x, y, 1, 1);
      }
    }
    return c;
  }

  const makeTile = (colorAt) => makeSprite(CONFIG.TILE, CONFIG.TILE, colorAt);

  // --- Spelaren -----------------------------------------------------------
  const PLAYER_PALETTE = {
    C: '#f83800', // keps
    H: '#6b3a1e', // hår
    S: '#fcb894', // hud
    K: '#000000', // öga
    J: '#1e9e8c', // jacka
    Y: '#f8d838', // knappar
    P: '#2c4cb8', // jeans
    B: '#3c2414', // skor
  };

  const TOP = [
    '.....CCCCC......',
    '....CCCCCCCCC...',
    '....HHHSSKS.....',
    '...HSHSSSKSSS...',
    '...HSHHSSSSSSS..',
    '...HHSSSSSSS....',
    '.....SSSSSS.....',
    '....JJJJJJJ.....',
    '...JJJJJJJJJ....',
    '..SSJJJJJJJSS...',
    '..SSJJYJJYJSS...',
  ];

  const LEGS = {
    idle: [
      '....PPPPPPP.....',
      '....PPP.PPP.....',
      '....PPP.PPP.....',
      '...BBB...BBB....',
      '..BBBB...BBBB...',
    ],
    walk: [
      '....PPPPPPP.....',
      '...PPP...PPP....',
      '..PPP.....PPP...',
      '..BBB.....BBB...',
      '.BBBB.....BBBB..',
    ],
    jump: [
      '....PPPPPPP.....',
      '...PPPP.PPPP....',
      '..BBPP...PPBB...',
      '..BBB.....BBB...',
      '................',
    ],
  };

  // Rymddräkt
  const SPACE_PALETTE = {
    W: '#f0f0f0', // dräkt
    G: '#9ca4b8', // sömmar
    V: '#2850c8', // visir
    L: '#a0d8ff', // visirets glans
    O: '#f87800', // märke
    K: '#505868', // ryggsäck
    B: '#687088', // stövlar
  };

  const SPACE_TOP = [
    '....GGGGGG......',
    '...GWWWWWWG.....',
    '..GWWWWVVVVG....',
    '..GWWWVVLLVG....',
    '..GWWWVVVVVG....',
    '..GWWWWWWWWG....',
    '...GWWWWWWG.....',
    '.KKGWWWWWWG.....',
    '.KKWWWOOWWWW....',
    '.KKWWWWWWWWWW...',
    '.KKGWWGOGWWW....',
  ];

  const SPACE_LEGS = {
    idle: [
      '...GWWWWWWG.....',
      '...WWWW.WWW.....',
      '...WWW..WWW.....',
      '...BBB..BBB.....',
      '..BBBB..BBBB....',
    ],
    walk: [
      '...GWWWWWWG.....',
      '..WWW....WWW....',
      '.WWW......WWW...',
      '.BBB......BBB...',
      'BBBB......BBBB..',
    ],
    jump: [
      '...GWWWWWWG.....',
      '..WWWW..WWWW....',
      '..BBWW...WWBB...',
      '..BBB.....BBB...',
      '................',
    ],
  };

  function buildOutfit(top, legsByFrame, palette) {
    const frames = {};
    for (const [name, legs] of Object.entries(legsByFrame)) {
      const rows = [...top, ...legs];
      frames[name] = { right: fromRows(rows, palette), left: fromRows(rows, palette, true) };
    }
    return frames;
  }

  const player = {
    normal: buildOutfit(TOP, LEGS, PLAYER_PALETTE),
    space: buildOutfit(SPACE_TOP, SPACE_LEGS, SPACE_PALETTE),
  };

  // Goofy gångstil: höga sparkar, flaxande armar och breda kliv.
  const ARMS_UP_TOP = [
    ...TOP.slice(0, 6),
    'SS...SSSSSS...SS',
    '.JJ.JJJJJJJ.JJ..',
    '..JJJJJJJJJJJ...',
    '....JJJJJJJ.....',
    '....JJYJJYJ.....',
  ];

  const GOOFY_LEGS = {
    kickFront: [
      '....PPPPPPPPBB..',
      '....PPP....BB...',
      '....PPP.........',
      '...BBB..........',
      '..BBBB..........',
    ],
    splay: [
      '...PPPPPPPPP....',
      '..PPP.....PPP...',
      '.PPP.......PPP..',
      'BBB.........BBB.',
      'BBBB.......BBBB.',
    ],
    kickBack: [
      '..BBPPPPPPPP....',
      '...BB....PPP....',
      '.........PPP....',
      '.........BBB....',
      '.........BBBB...',
    ],
  };

  const goofyWalk = [
    [ARMS_UP_TOP, GOOFY_LEGS.kickFront],
    [TOP, GOOFY_LEGS.splay],
    [ARMS_UP_TOP, GOOFY_LEGS.kickBack],
    [TOP, GOOFY_LEGS.splay],
  ].map(([top, legs]) => ({
    right: fromRows([...top, ...legs], PLAYER_PALETTE),
    left: fromRows([...top, ...legs], PLAYER_PALETTE, true),
  }));

  // --- Tiles --------------------------------------------------------------
  // Trottoar (översta marklagret)
  const groundTop = makeTile((x, y) => {
    if (y === 0) return '#e8e8e8';
    if (y === 1) return '#c8c8c8';
    if (x === 15 || y === 15) return '#606060';
    if ((x * 7 + y * 13) % 23 === 0) return '#8a8a8a';
    return '#a8a8a8';
  });

  // Tegel under trottoaren
  const ground = makeTile((x, y) => {
    const row = Math.floor(y / 4);
    const offset = (row % 2) * 4;
    if (y % 4 === 3 || (x + offset) % 8 === 7) return '#5c1c00';
    if (y % 4 === 0) return '#e86c3c';
    return '#c84c0c';
  });

  // Trälåda
  const crate = makeTile((x, y) => {
    if (x === 0 || y === 0 || x === 15 || y === 15) return '#3a1e06';
    if (x <= 2 || y <= 2 || x >= 13 || y >= 13) {
      return x === 1 || y === 1 ? '#f0b060' : '#c07830';
    }
    const d1 = x - y;
    const d2 = x + y - 15;
    if (d1 === 0 || d2 === 0) return '#c07830';
    if (d1 === 1 || d2 === 1) return '#3a1e06';
    if (y % 4 === 3) return '#7a4214';
    return '#9a5a20';
  });

  // Månyta (översta marklagret i rymden)
  const moonTop = makeTile((x, y) => {
    if (y === 0) return '#d8d8e0';
    if (y === 1) return '#b8b8c4';
    const h = (x * 31 + y * 17) % 29;
    if (h === 0) return '#6c6c7a';
    if (h === 7) return '#c8c8d4';
    return '#9c9cac';
  });

  // Månsten med kratrar
  const moonRock = makeTile((x, y) => {
    const crater = (cx, cy, r) => {
      const d = (x - cx) ** 2 + (y - cy) ** 2;
      if (d <= r * r * 0.5) return '#3c3c48';
      if (d <= r * r) return y < cy ? '#7c7c8c' : '#4c4c5a';
      return null;
    };
    const c = crater(5, 6, 3) || crater(12, 12, 2);
    if (c) return c;
    return (x * 13 + y * 7) % 19 === 0 ? '#4c4c5a' : '#5c5c6c';
  });

  // Metallcontainer med varningsrand
  const spaceBlock = makeTile((x, y) => {
    if (x === 0 || y === 0 || x === 15 || y === 15) return '#1c2030';
    if (x === 1 || y === 1) return '#c8d0e0';
    if (x === 14 || y === 14) return '#4c5468';
    if ((x === 3 || x === 12) && (y === 3 || y === 12)) return '#1c2030';
    if (y >= 6 && y <= 9) return (x + y) % 4 < 2 ? '#f8c800' : '#1c2030';
    return '#8890a4';
  });

  // Räls med syllar och makadam
  const railTop = makeTile((x, y) => {
    if (y === 0) return '#e0e4ec';
    if (y <= 2) return '#808898';
    if (y === 3) return '#404650';
    if (y <= 6 && x % 8 < 5) return y === 4 ? '#7a5230' : '#5a3a1e';
    const h = (x * 7 + y * 11) % 13;
    if (h < 3) return '#5a5a64';
    return h < 7 ? '#45454e' : '#383840';
  });

  // Tunnelgolv i betong
  const tunnelFloor = makeTile((x, y) => {
    if (y === 15) return '#1c1c22';
    return (x * 5 + y * 9) % 11 < 2 ? '#34343c' : '#2a2a32';
  });

  // Ytan på den blå solen: glödande plasma
  const sunTop = makeTile((x, y) => {
    if (y === 0) return '#e8ffff';
    if (y === 1) return '#a8f0ff';
    if (y === 2) return '#68d0ff';
    const h = (x * 31 + y * 17) % 23;
    if (h === 0) return '#e0f8ff';
    if (h < 5) return '#58b8ff';
    return '#3898f8';
  });

  // Granuler (konvektionsceller) under ytan: ljus mitt och mörka kanter
  const sunCore = makeTile((x, y) => {
    const gx = x % 8;
    const gy = (y + (Math.floor(x / 8) % 2) * 4) % 8;
    const d = Math.max(Math.abs(gx - 3.5), Math.abs(gy - 3.5));
    if (d > 3) return '#0c3c9c';
    if (d > 2) return '#1c5cd0';
    if ((x * 7 + y * 3) % 11 === 0) return '#a0e0ff';
    return '#3c88f0';
  });

  // Isblått kristallblock
  const sunCrystal = makeTile((x, y) => {
    if (x === 0 || y === 0 || x === 15 || y === 15) return '#081848';
    if (x + y < 6 || x === 1 || y === 1) return '#e8faff';
    if (x === 14 || y === 14) return '#2858b8';
    if ((x - y + 16) % 8 === 0) return '#c0ecff';
    return x + y < 16 ? '#80d0ff' : '#58a8f0';
  });

  // Slemmig kullersten i kloaken
  const sewerTop = makeTile((x, y) => {
    if (y === 0) return '#6a8a3a';
    if (y === 1) return x % 5 === 0 ? '#2e3c22' : '#4e6a2c';
    const sx = (x + (Math.floor(y / 5) % 2) * 4) % 8;
    if (y % 5 === 1 || sx === 7) return '#1c2216';
    return (x * 3 + y * 7) % 9 === 0 ? '#5a6050' : '#454b3c';
  });

  // Mörkt, fuktigt tegel
  const sewerBrick = makeTile((x, y) => {
    const offset = (Math.floor(y / 4) % 2) * 4;
    if (y % 4 === 3 || (x + offset) % 8 === 7) return '#14180f';
    if ((x * 5 + y * 11) % 17 === 0) return '#3c5226';
    return y % 4 === 0 ? '#3e4234' : '#30342a';
  });

  // Mossig stenkloss
  const sewerBlock = makeTile((x, y) => {
    if (x === 0 || y === 15 || x === 15) return '#141810';
    if (y <= 2) return (x * 7) % 5 < 3 ? '#5a8a2a' : '#3e6a1e';
    if (y === 3 && x % 3 === 0) return '#3e6a1e'; // mossa som rinner ner
    if (x === 1) return '#6a7064';
    if (y === 8 && x > 1 && x < 15) return '#20261a';
    return (x + y) % 7 === 0 ? '#4c5244' : '#585e50';
  });

  const tiles = {
    city: { top: groundTop, ground, block: crate },
    space: { top: moonTop, ground: moonRock, block: spaceBlock },
    subway: { top: railTop, ground: tunnelFloor, block: crate },
    bluesun: { top: sunTop, ground: sunCore, block: sunCrystal },
    sewer: { top: sewerTop, ground: sewerBrick, block: sewerBlock },
    ruins: { top: groundTop, ground, block: crate },
  };

  // Studsmatta. matY = var mattan sitter (lägre värde = mindre ihoptryckt).
  function trampolineTile(matY) {
    return makeTile((x, y) => {
      if (y === matY || y === matY + 1) return Math.floor(x / 2) % 2 ? '#f8f8f8' : '#e01818';
      if (y === matY + 2) return '#801010';
      if (y > matY + 2 && y < 13) {
        const spring = y % 2 ? [3, 12] : [4, 11];
        return spring.includes(x) ? '#c0c0c8' : null;
      }
      if (y === 13) return '#505868';
      if (y > 13 && (x < 2 || x > 13)) return '#303848';
      return null;
    });
  }

  const trampoline = { normal: trampolineTile(0), squashed: trampolineTile(7) };

  // --- Sirenhead (32x80, ritad åt höger) ----------------------------------
  function pixelLine(g, x0, y0, x1, y1, color, size = 2) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    g.fillStyle = color;
    for (let i = 0; i <= n; i++) {
      g.fillRect(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), size, size);
    }
  }

  function mirror(src) {
    const c = createCanvas(src.width, src.height);
    const g = c.getContext('2d');
    g.translate(src.width, 0);
    g.scale(-1, 1);
    g.drawImage(src, 0, 0);
    return c;
  }

  const SH = { K: '#140d0b', D: '#2e1c16', R: '#5e2a1c', F: '#8c4630', W: '#dedad2' };

  function buildSirenHead({ walk = false, frontArm = true }) {
    const c = createCanvas(32, 80);
    const g = c.getContext('2d');
    const p = (color, x, y, w = 1, h = 1) => {
      g.fillStyle = color;
      g.fillRect(x, y, w, h);
    };

    // Siren: smal ände i (nx, cy), vidgar sig i riktning dir
    function horn(nx, cy, dir) {
      for (let i = 0; i < 10; i++) {
        const x = nx + dir * i;
        const h = 1 + Math.floor(i / 3);
        p(SH.K, x, cy - h, 1, 2 * h + 1);
        if (i % 3 === 1) p(SH.R, x, cy - h, 1, 1);
      }
      p(SH.D, nx + dir * 10, cy - 5, 1, 11);
      p(SH.R, nx + dir * 10, cy - 5, 1, 1);
      p(SH.K, nx + dir * 11, cy - 5, 1, 11);
    }

    function leg(hipX, footX) {
      pixelLine(g, hipX, 47, footX, 63, SH.K);
      p(SH.R, hipX, 50, 1, 4);
      p(SH.K, footX - 1, 64, 4, 13);
      p(SH.W, footX, 65, 2, 11);
      p(SH.K, footX - 1, 77, 5, 3);
    }

    function arm(sx, ex, hx) {
      pixelLine(g, sx, 25, ex, 44, SH.K);
      pixelLine(g, ex, 44, hx, 60, SH.K);
      p(SH.R, ex, 36, 1, 6);
      p(SH.K, hx - 1, 60, 3, 3);
      p(SH.R, hx, 61, 1, 2);
      p(SH.K, hx - 1, 63, 1, 5);
      p(SH.K, hx + 1, 63, 1, 6);
      p(SH.K, hx + 2, 62, 1, 4);
    }

    // Ben
    leg(12, walk ? 10 : 12);
    leg(18, walk ? 20 : 18);

    // Bakre arm (bakom kroppen)
    arm(9, 7, walk ? 7 : 5);

    // Bål som smalnar av mot höfterna
    for (let y = 24; y < 46; y++) {
      const inset = y < 27 ? 0 : Math.floor((y - 27) / 6);
      p(SH.K, 10 + inset, y, 12 - 2 * inset, 1);
    }
    g.clearRect(10, 24, 1, 1);
    g.clearRect(21, 24, 1, 1);
    p(SH.R, 15, 24, 2, 8);
    for (const y of [29, 31, 33, 35]) {
      p(SH.R, 12, y, 3, 1);
      p(SH.R, 17, y, 3, 1);
      p(SH.F, 13, y, 1, 1);
      p(SH.F, 18, y, 1, 1);
    }
    p(SH.K, 12, 44, 8, 4);
    p(SH.R, 12, 40, 1, 5);
    p(SH.R, 19, 40, 1, 5);

    // Hals som delar sig mot de två sirenerna
    p(SH.D, 15, 12, 2, 13);
    p(SH.R, 16, 14, 1, 9);
    p(SH.D, 14, 8, 1, 4);
    p(SH.D, 13, 6, 1, 2);
    p(SH.D, 17, 11, 1, 2);
    horn(13, 5, -1); // bakre sirenen
    horn(18, 10, 1); // främre sirenen (munnen)

    // Främre arm (ritas dynamiskt när den griper)
    if (frontArm) arm(21, 23, walk ? 23 : 25);

    return c;
  }

  const sirenHead = {};
  for (const [name, opts] of Object.entries({
    idle: {},
    walk: { walk: true },
    grab: { frontArm: false },
  })) {
    const right = buildSirenHead(opts);
    sirenHead[name] = { right, left: mirror(right) };
  }

  // --- Wither-skelett (22x28, ritad åt höger) ------------------------------
  const WITHER_PALETTE = {
    K: '#101014', // kontur
    B: '#46464f', // ben
    L: '#82828f', // ljusare ben
    R: '#ff3030', // glödande ögon
    D: '#5a1414', // släckta ögon
  };

  const WITHER_TOP = [
    '....KKKKKK',
    '...KBBBBBBK',
    '...KBLLLLBK',
    '...KBRRBRRK',
    '...KBBBBBBK',
    '...KBKBKBKK',
    '....KBBBBK',
    '......BB',
    '...LBBBBBBL',
    '..BB.L..L.BB',
    '..B.BBBBBB.B',
    '..B..L..L..B',
    '..B..BBBBB..B',
    '..B...LL....B',
    '..B...BB.....B',
    '.KK...BB.....KK',
    '......BB',
    '....BBBBBB',
  ];

  const WITHER_LEGS = {
    idle: [
      '....B....B',
      '....B....B',
      '....L....L',
      '....B....B',
      '....B....B',
      '....B....B',
      '....L....L',
      '....B....B',
      '....BB...BB',
      '....BBB..BBB',
    ],
    walk: [
      '....B....B',
      '...B......B',
      '...L......L',
      '..B........B',
      '..B........B',
      '..B........B',
      '..L........L',
      '..B........B',
      '..BB.......BB',
      '..BBB......BBB',
    ],
  };

  // Benhög när skelettet blivit nerhoppat
  const WITHER_DEAD = [
    '.....KKKKKK',
    '....KBBBBBBK',
    '....KBDDBDDK',
    '....KBKBKBKK',
    '.L...KKKKK..L..B',
    '..B.L..BB.B..LB.',
    '.BBLBBLBBBBLBBBL',
    'LBBBBBBLBBBBBBBB',
  ];

  const pad = (rows, w = 22) => rows.map((r) => r.padEnd(w, '.'));

  function buildWither(legs) {
    const c = fromRows(pad([...WITHER_TOP, ...legs]), WITHER_PALETTE);
    const g = c.getContext('2d');
    pixelLine(g, 15, 12, 20, 1, '#26262c', 2); // svartsvärdets blad
    pixelLine(g, 16, 11, 21, 2, '#8a8a96', 1); // egg
    pixelLine(g, 13, 12, 17, 14, '#6a4422', 1); // parerstång
    return c;
  }

  const witherSkeleton = {};
  for (const [name, legs] of Object.entries(WITHER_LEGS)) {
    const right = buildWither(legs);
    witherSkeleton[name] = { right, left: mirror(right) };
  }
  const deadRight = fromRows(pad(WITHER_DEAD), WITHER_PALETTE);
  witherSkeleton.dead = { right: deadRight, left: mirror(deadRight) };

  // --- Rymdraket (32x60) ----------------------------------------------------
  const rocket = makeSprite(32, 60, (x, y) => {
    const dx = Math.abs(x - 15.5);
    if (y < 16) {
      const hw = ((y + 1) * 6) / 16; // noskonen vidgar sig nedåt
      if (dx > hw) return null;
      if (dx > hw - 1) return '#a01010';
      return x < 16 ? '#f83800' : '#c02000';
    }
    if (y < 52 && dx <= 6) {
      const w = (x - 15.5) ** 2 + (y - 26) ** 2;
      if (w <= 6) return (x + y) % 5 === 0 ? '#c8f0ff' : '#3cbcfc';
      if (w <= 13) return '#606878';
      if (dx > 5) return '#9ca4b8';
      if (y >= 38 && y <= 40) return '#f83800';
      return x > 17 ? '#c8ccd8' : '#f8f8f8';
    }
    if (y >= 36 && y < 58 && dx > 6 && dx <= 6 + Math.min(Math.floor((y - 36) / 3), 7)) {
      return y === 57 ? '#801010' : '#d02000';
    }
    if (y >= 52 && y < 60 && dx <= 3 + (y - 52) / 3) return y % 2 ? '#505868' : '#687088';
    return null;
  });

  // --- Tunnelbanetåg (vagnar 64x36, hytter 40x36) ---------------------------
  const TR = {
    outline: '#141c34', roof: '#a8b0c0', roofDark: '#6c7488', body: '#2c64dc', bodyDark: '#1e48a8',
    stripe: '#f0f0f0', window: '#ffe680', windowDark: '#c8a840', under: '#2c303a', wheel: '#18181c', hub: '#9ca4b8',
  };

  // Gemensamma delar för vagn och hytt: tak, rand, underrede och hjul.
  function trainBase(x, y, w) {
    if (y >= 31) {
      for (const wx of [9, 20, w - 21, w - 10]) {
        const d = (x - wx) ** 2 + (y - 32) ** 2;
        if (d <= 1) return TR.hub;
        if (d <= 12) return TR.wheel;
      }
      return null;
    }
    if (y >= 28) return TR.under;
    if (y === 0) return TR.outline;
    if (y <= 3) return y === 1 ? TR.roof : TR.roofDark;
    if (y === 20 || y === 21) return TR.stripe;
    if (y === 27) return TR.bodyDark;
    return null;
  }

  function trainWindow(x, y, x0, x1) {
    if (x < x0 || x > x1 || y < 7 || y > 16) return null;
    if (x === x0 || x === x1 || y === 7 || y === 16) return TR.outline;
    return y < 10 ? TR.windowDark : TR.window;
  }

  const trainCar = makeSprite(64, 36, (x, y) => {
    const base = trainBase(x, y, 64);
    if (y >= 28) return base;
    if (x === 0 || x === 63) return TR.outline;
    if (base) return base;
    const wx = x % 16;
    return trainWindow(wx, y, 3, 12) || TR.body;
  });

  // Hytt med fronten åt vänster. light = strålkastarens färg.
  function trainCab(light) {
    return makeSprite(40, 36, (x, y) => {
      const base = trainBase(x, y, 40);
      if (y >= 28) return base;
      const slope = Math.max(0, 8 - y); // avfasad nos
      if (x < slope) return null;
      if (x === slope || x === 39 || y === 0) return TR.outline;
      if (base) return base;
      if (x >= 3 && x <= 13 && y >= 6 && y <= 16) {
        if (x === 3 || x === 13 || y === 6 || y === 16) return TR.outline;
        return (x + y) % 9 === 0 ? '#6888c8' : '#1c2848';
      }
      if (x >= 2 && x <= 5 && y >= 23 && y <= 25) return light;
      return trainWindow(x, y, 20, 33) || TR.body;
    });
  }

  const train = { front: trainCab('#fff8c0'), car: trainCar, rear: mirror(trainCab('#f83800')) };

  // Bygger en figur med bildrutor { namn: rader } åt båda hållen.
  function buildCreature(top, frames, palette, w) {
    const result = {};
    for (const [name, rows] of Object.entries(frames)) {
      const right = fromRows(pad(top ? [...top, ...rows] : rows, w), palette);
      result[name] = { right, left: mirror(right) };
    }
    return result;
  }

  // --- Venom (20x28, ritad åt höger) ---------------------------------------
  const VENOM_PALETTE = {
    K: '#0a0a10', // svart symbiot
    G: '#3a4468', // glans
    W: '#f4f4f4', // ögon och spindelmärke
    T: '#e8e8d8', // tänder
    M: '#3a0610', // gap
    R: '#c8183a', // tunga
  };

  const VENOM_TOP = [
    '.....KKKKKKKK.......',
    '...KKKKKKKKKKKK.....',
    '..KKGGKKKKKKKKKK....',
    '..KGKKWWKKKKKWWKK...',
    '.KKKKWWWWKKKWWWWK...',
    '.KKKKKWWWWKWWWWKK...',
    '.KKKKKKWWKKKWWKKK...',
    '.KKKKKKKKKKKKKKKKK..',
    '.KKKKMTTMTTMTTMTTK..',
    '..KKKMMMMMMMMMMMMMK.',
    '..KKKMMRRRRRRRRRRRR.',
    '..KKKMTTMTTMTTMRRRRR',
    '...KKKKKKKKKKKKK.RR.',
    '....KKKKKKKKKKK.....',
    '.KKKKKKKKKKKKKKK....',
    'KKKGKKKKKKKKKKGKK...',
    'KKGKKWWKKKKWWKKGKK..',
    'KK.KKKWWWWWWKKK.KK..',
    'KK.KKKKWWWWKKKK.KK..',
    'KK.KKKWWKKWWKKK.KK..',
    'WW.KKKKKKKKKKKK.WW..',
    'W..KKKKKKKKKKKK..W..',
  ];

  const venom = buildCreature(VENOM_TOP, {
    idle: [
      '...KKKKK.KKKKK......',
      '...KKKK...KKKK......',
      '...KKK.....KKK......',
      '...KKK.....KKK......',
      '..KKKK.....KKKK.....',
      '..KKKK.....KKKK.....',
    ],
    walk: [
      '...KKKKK.KKKKK......',
      '..KKKK.....KKKK.....',
      '.KKK.........KKK....',
      '.KKK.........KKK....',
      'KKKK.........KKKK...',
      'KKKK.........KKKK...',
    ],
  }, VENOM_PALETTE, 20);
  Object.assign(venom, buildCreature(null, {
    dead: [
      '......KKKKKK........',
      '...KKKWWKKWWKKK.....',
      '.KKKKKKKKKKKKKKKKK..',
      'KKKGKKKKKKKKKKKGKKKK',
    ],
  }, VENOM_PALETTE, 20));

  // Venom är stor: förstora alla bildrutor två gånger (40x56)
  function scaleUp(src, k) {
    const c = createCanvas(src.width * k, src.height * k);
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.drawImage(src, 0, 0, c.width, c.height);
    return c;
  }
  for (const frame of Object.values(venom)) {
    frame.right = scaleUp(frame.right, 2);
    frame.left = scaleUp(frame.left, 2);
  }

  // --- Herobrine (16x28, Steve framifrån med vita ögon) ---------------------
  const HEROBRINE_PALETTE = {
    H: '#2b1d0e', // hår
    S: '#c4946c', // hud
    N: '#6a3e24', // näsa och mun
    E: '#ffffff', // tomma vita ögon
    C: '#00a8a8', // tröja
    c: '#008c8c',
    B: '#3a3ab0', // byxor
    b: '#28287c',
    G: '#585858', // skor
  };

  const HEROBRINE_TOP = [
    '....HHHHHHHH....',
    '....HHHHHHHH....',
    '....HSSSSSSH....',
    '....SSSSSSSS....',
    '....SEESSEES....',
    '....SSSNNSSS....',
    '....SSNSSNSS....',
    '....SSNNNNSS....',
    'CCCCCCCCCCCCCCCC',
    'CCCCCCCCCCCCCCCC',
    'CCCCcCCCCCCcCCCC',
    'SSSSCCCCCCCCSSSS',
    'SSSSCCCCCCCCSSSS',
    'SSSSCCCCCCCCSSSS',
    'SSSSCCCCCCCCSSSS',
    'SSSSCCCCCCCCSSSS',
    'SSSSBBBBBBBBSSSS',
    'SSSSBBBBBBBBSSSS',
    'SSSSBBBBBBBBSSSS',
    '....BBBBBBBB....',
  ];

  const herobrine = {
    idle: fromRows([...HEROBRINE_TOP,
      '....BBBBbBBB....',
      '....BBBBbBBB....',
      '....BBBBbBBB....',
      '....BBBBbBBB....',
      '....BBBBbBBB....',
      '....BBBBbBBB....',
      '....GGGGGGGG....',
      '....GGGGGGGG....',
    ], HEROBRINE_PALETTE),
    walk: fromRows([...HEROBRINE_TOP,
      '....BBBBbBBB....',
      '....BBBBbBBB....',
      '....BBBBbBBB....',
      '....BBBBbBBB....',
      '....GGGGbBBB....',
      '....GGGGbBBB....',
      '........GGGG....',
      '........GGGG....',
    ], HEROBRINE_PALETTE),
  };

  // --- Momo (24x30): stora utstående ögon, brett flin, svart hår och fågelben --
  const MOMO_PALETTE = {
    H: '#0a0a0e', // hår
    h: '#2a2a36',
    S: '#e6d2c4', // blek hud
    s: '#c4a898',
    R: '#9a6a60', // rödaktiga ögonkanter
    E: '#f6f6f0', // ögonvitor
    P: '#0c0c0c', // pupiller
    N: '#7a4a44', // näsborrar
    L: '#d88c8c', // läppar
    M: '#2a0808', // mun
    Y: '#c09a78', // fjälliga fågelben
    y: '#7c5a3e',
    C: '#1a1a1a', // klor
  };

  const MOMO_TOP = [
    '......HHHHHHHHHH........',
    '....HHHHHHHHHHHHHH......',
    '...HHHHHHSSSSSSHHHH.....',
    '..HHHHSSSSSSSSSSSSHH....',
    '..HHHSRRRRRSSRRRRRSH....',
    '..HHHREEEEESSEEEEERH....',
    '..HHHREPPEESSEEPPERH....',
    '..HHHREPPEESSEEPPERH....',
    '..HHHSREEERSSREEERSH....',
    '..HHHSSRRRSSSSRRRSSH....',
    // Utdraget flin med mungipor som nästan når ögonen
    '..HHHMSSSSSNNSSSSSMH....',
    '..HHHLMSSSSSSSSSSMLH....',
    '..HHHSLMLLLLLLLLMLSH....',
    '..HHHSSLMMMMMMMMLSSH....',
    '..HHHSSLLLLLLLLLLSSH....',
    '..HHHHSSLLLLLLLLSSHH....',
    '..HHhHHSSssssssSSHH.....',
    '..HhHHHHH.SSSS.HHH......',
    '.HHHhHHH...SSSS..HHH....',
    '.HHHHHhSSSSSSSSSSSHH....',
    '.HHH.HSSSSSSSSSSSSSHH...',
    '.HH..HSSSSSSSSSSSSSSH...',
    '.H...HSSSSSSSSSSSSSS....',
    '......sSSSSSSSSSSSSs....',
    '.......ssSSSSSSSSss.....',
  ];

  const momo = buildCreature(MOMO_TOP, {
    idle: [
      '.........YY....YY.......',
      '.........Yy....Yy.......',
      '.........YY....YY.......',
      '........yYy...yYy.......',
      '.......CYYYC.CYYYC......',
      '......C.C.C.C.C.C.......',
    ],
    walk: [
      '.........YY....YY.......',
      '........Yy......Yy......',
      '.......YY........YY.....',
      '......yYy........yYy....',
      '.....CYYYC......CYYYC...',
      '....C.C.C......C.C.C....',
    ],
  }, MOMO_PALETTE, 24);
  Object.assign(momo, buildCreature(null, {
    dead: [
      '.....HHHHHHHHHHHHHH.....',
      '...HHHSEESSSSSSEESHHH...',
      '..HHHSSEPSSSSSSPESSHHH..',
      '.HHHHHSSSLMMMMLSSSHHHHH.',
      'YyYHHHHHHHHHHHHHHHHHHyYy',
    ],
  }, MOMO_PALETTE, 24));

  // --- Litet hus att gömma sig i (48x40) -------------------------------------
  const house = makeSprite(48, 40, (x, y) => {
    const dx = Math.abs(x - 23.5);
    if (y < 14) {
      // Tak som vidgar sig nedåt
      const hw = 4 + (y * 20) / 13;
      if (dx > hw) return null;
      if (dx > hw - 1.5 || y === 13) return '#2a1440';
      return (y + Math.floor(x / 4)) % 4 === 0 ? '#5a2a8a' : '#7a3cb0';
    }
    if (x < 4 || x > 43) return null;
    const edge = '#3a2a1c';
    if (x === 4 || x === 43 || y === 39) return edge;
    // Öppen dörr
    if (x >= 18 && x <= 29 && y >= 22) {
      if (x === 18 || x === 29 || y === 22) return edge;
      return '#120a18';
    }
    // Fönster med lampsken
    if (y >= 20 && y <= 27 && ((x >= 8 && x <= 14) || (x >= 33 && x <= 39))) {
      if (x === 8 || x === 14 || x === 33 || x === 39 || y === 20 || y === 27) return edge;
      if (x === 11 || x === 36 || y === 23) return edge;
      return '#f8d878';
    }
    return y % 4 === 0 ? '#b88a5a' : '#d8a870';
  });

  // --- Bomb (7x10) -----------------------------------------------------------
  const bomb = fromRows([
    '.K.K.K.',
    '.KKKKK.',
    '..KKK..',
    '.KKKKK.',
    'KKGKKKK',
    'KGKKKKK',
    'KKKKKKK',
    'KKKKKKK',
    '.KKKKK.',
    '..KRK..',
  ], { K: '#1c1c24', G: '#6c6c80', R: '#f83800' });

  // --- Spöke som stiger upp ur döda fiender (10x12) ---------------------------
  const ghost = fromRows([
    '...WWWW...',
    '.WWWWWWWW.',
    'WWWWWWWWWW',
    'WKKWWWWKKW',
    'WKKWWWWKKW',
    'WWWWWWWWWW',
    'WWWWKKWWWW',
    'WWWKKKKWWW',
    'WWWWKKWWWW',
    'WWWWWWWWWW',
    'WW.WWWW.WW',
    'W...WW...W',
  ], { W: '#e8f0ff', K: '#20203a' });

  // --- Piraya (16x10, ritad åt höger) ---------------------------------------
  const PIRANHA_PALETTE = {
    G: '#4a5a4a', // rygg
    g: '#6a7c68',
    F: '#34402f', // fenor
    R: '#d02818', // röd buk
    r: '#901008',
    Y: '#f8d838', // öga
    K: '#000000',
    W: '#f0f0e0', // tänder
    M: '#300808', // gap
  };

  const PIRANHA_BACK = [
    '.....FFFF.......',
    '....GGGGGGG.....',
    'F..GGGGGGGGGG...',
    'FF.GgGGGGGGYKGG.',
  ];

  const piranha = buildCreature(PIRANHA_BACK, {
    closed: [
      'FFGGgGGGGGGGGGGG',
      'FFGRRRRRRRRRW.W.',
      'FF.RRRRRRRRR.W.W',
      'F..rRRRRRRRRRRR.',
      '....rrRRRRRRr...',
      '.....F...F......',
    ],
    open: [
      'FFGGgGGGGGGGGW.W',
      'FFGRRRRRRRRRMM..',
      'FF.RRRRRRRRRMM..',
      'F..rRRRRRRRRRW.W',
      '....rrRRRRRRr...',
      '.....F...F......',
    ],
  }, PIRANHA_PALETTE, 16);

  // --- Glasskiosk (40x40) med en skum glassförsäljare ----------------------
  const kiosk = makeSprite(40, 40, (x, y) => {
    const stripe = Math.floor(x / 5) % 2 ? '#f8f8f8' : '#f878b8';
    if (y === 0) return '#601040';
    if (y < 7) return stripe;
    if (y < 10) return ((x % 5) - 2) ** 2 + (y - 6) ** 2 <= 5 ? stripe : null; // markisens bågkant
    if (y < 24) {
      if (x <= 1 || x >= 38) return '#c8c8d0';
      const head = (x - 20) ** 2 + (y - 14) ** 2;
      if ((x === 18 || x === 22) && y === 14) return '#ff3030'; // röda ögon
      if (y === 16 && x >= 18 && x <= 22) return '#e8e8e8'; // flin
      if (head <= 8) return '#0c0810';
      if (head <= 22 || (y >= 18 && x >= 14 && x <= 26)) return '#4a2c60'; // luva och kappa
      return '#1c1824';
    }
    if (y < 27) return y === 24 ? '#f8f8f8' : '#d0d0d8'; // disk
    if (x === 0 || x === 39 || y === 39) return '#3a2a40';
    if (y >= 29 && y <= 35 && x >= 8 && x <= 31) {
      if (y === 29 || y === 35 || x === 8 || x === 31) return '#f8f8f8';
      return (x + y) % 4 === 0 ? '#f8f8f8' : '#f878b8';
    }
    return x % 4 === 0 ? '#88c8e8' : '#a8e0f8';
  });

  // --- Glass med grönt "strössel" (6x12) -------------------------------------
  const cone = fromRows([
    '.PPPP.',
    'PWPGPP',
    'PPPPGP',
    'PGPPPP',
    '.PPPP.',
    'CCCCCC',
    'CcCcCC',
    '.CCcC.',
    '.CcCC.',
    '..CC..',
    '..Cc..',
    '..C...',
  ], { P: '#f878b8', W: '#ffd0e8', G: '#58e020', C: '#d8a050', c: '#a06820' });

  // Färgar alla synliga pixlar i en bild med en färg (sken runt Godzilla, vit blinkning vid träff).
  function tint(src, color) {
    const c = createCanvas(src.width, src.height);
    const g = c.getContext('2d');
    g.drawImage(src, 0, 0);
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = color;
    g.fillRect(0, 0, c.width, c.height);
    return c;
  }

  // Ritar ellipser { cx, cy, rx, ry, color } med en gemensam kontur runt hela formen.
  function paintBlobs(g, parts, outline) {
    for (const grow of [1, 0]) {
      for (const { cx, cy, rx, ry, color } of parts) {
        g.fillStyle = grow ? outline : color;
        const ax = rx + grow;
        const ay = ry + grow;
        for (let y = Math.floor(cy - ay); y <= Math.ceil(cy + ay); y++) {
          for (let x = Math.floor(cx - ax); x <= Math.ceil(cx + ax); x++) {
            if (((x + 0.5 - cx) / ax) ** 2 + ((y + 0.5 - cy) / ay) ** 2 <= 1) g.fillRect(x, y, 1, 1);
          }
        }
      }
    }
  }

  // Fyller en triangel pixel för pixel så att kanterna blir skarpa.
  function fillTriangle(g, [a, b, c], color) {
    const xs = [a[0], b[0], c[0]];
    const ys = [a[1], b[1], c[1]];
    const side = (p, q, x, y) => (q[0] - p[0]) * (y - p[1]) - (q[1] - p[1]) * (x - p[0]);
    g.fillStyle = color;
    for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) {
      for (let x = Math.floor(Math.min(...xs)); x <= Math.ceil(Math.max(...xs)); x++) {
        const s = [side(a, b, x + 0.5, y + 0.5), side(b, c, x + 0.5, y + 0.5), side(c, a, x + 0.5, y + 0.5)];
        if (s.every((v) => v >= 0) || s.every((v) => v <= 0)) g.fillRect(x, y, 1, 1);
      }
    }
  }

  // --- Godzilla (96x128, ritad åt vänster i halv upplösning och förstorad) ----
  const GZ_NORMAL = {
    outline: '#0e140c', skin: '#3c5236', dark: '#28381f', belly: '#6c7a56', bellyDark: '#4e5a3e',
    spine: '#c8c8b0', spineHi: '#ffffff', eye: '#f8d838', mouth: '#3a0808', claw: '#e8e8d8',
  };
  // Efter dynamiten: mörkare skinn, glödande lila taggar och röda ögon
  const GZ_POWER = {
    outline: '#06040c', skin: '#2c2c42', dark: '#1c1c2c', belly: '#4c4c68', bellyDark: '#36364c',
    spine: '#9a50ff', spineHi: '#f0d8ff', eye: '#ff2020', mouth: '#d070ff', claw: '#e8e8ff',
  };

  function buildGodzilla(C, { mouth = false, step = 0 }) {
    const c = createCanvas(48, 64);
    const g = c.getContext('2d');
    const px = (color, x, y, w = 1, h = 1) => {
      g.fillStyle = color;
      g.fillRect(x, y, w, h);
    };
    const blob = (cx, cy, rx, ry, color = C.skin) => ({ cx, cy, rx, ry, color });

    paintBlobs(g, [
      blob(33, 50, 6, 6), blob(38.5, 55, 5, 4.5), blob(42.5, 58.5, 4, 3.5), blob(46, 61, 2.5, 2.2), // svans
      blob(31 + step, 53, 5, 7, C.dark), blob(30 + step, 60.5, 6, 2.5, C.dark), // bakre ben
      blob(26, 37, 11, 15), // kropp
      blob(21, 22, 6.5, 8), // hals
      blob(15, 13, 7, 5.5), // huvud
      blob(8.5, 15, 5, 3.5), // nos
      ...(mouth ? [blob(10, 20.5, 5, 2)] : []), // underkäke
    ], C.outline);

    // Randig buk
    for (let y = 28; y <= 51; y++) {
      for (let x = 15; x <= 27; x++) {
        if (((x + 0.5 - 21) / 5.5) ** 2 + ((y + 0.5 - 40) / 11) ** 2 <= 1) px(y % 3 ? C.belly : C.bellyDark, x, y);
      }
    }

    // Ryggtaggar: [x, y, riktning ut från ryggen, storlek]
    for (const [bx, by, nx, ny, s] of [
      [20.5, 9.5, 0.6, -1, 3], [25.5, 16.5, 1, -0.7, 4], [28.5, 23, 1, -0.4, 4.5], [33, 28, 1, -0.5, 5.5],
      [36.5, 35, 1, -0.15, 6], [36.5, 43, 1, 0.15, 5], [37.5, 48.5, 0.6, -1, 4], [42, 53.5, 0.5, -1, 3],
    ]) {
      const len = Math.hypot(nx, ny);
      const ux = nx / len;
      const uy = ny / len;
      const at = (d, k) => [bx + ux * s * d - uy * s * k, by + uy * s * d + ux * s * k];
      fillTriangle(g, [at(0, 0.5), at(0, -0.5), at(1.4, 0)], C.spine);
      fillTriangle(g, [at(0.7, 0.2), at(0.7, -0.2), at(1.4, 0)], C.spineHi);
    }

    // Främre ben och arm får egen kontur så att de syns mot kroppen
    paintBlobs(g, [blob(20 - step, 53, 5.5, 7), blob(19 - step, 60.5, 6.5, 2.5)], C.outline);
    paintBlobs(g, [blob(15, 31, 4, 2)], C.outline);

    // Klor
    for (const fx of [20 - step, 31 + step]) {
      for (const dx of [-6, -4, -2]) px(C.claw, fx + dx, 63);
    }
    px(C.claw, 10, 31);
    px(C.claw, 10, 33);

    // Ansikte
    px(C.outline, 10, 10, 4, 1);
    px(C.eye, 11, 11, 2, 1);
    px(C.outline, 4, 13);
    if (mouth) {
      px(C.mouth, 4, 18, 10, 2);
      for (const x of [5, 7, 9, 11]) px(C.claw, x, 18);
      for (const x of [6, 8, 10]) px(C.claw, x, 19);
    } else {
      px(C.outline, 4, 17, 9, 1);
      px(C.claw, 6, 18);
      px(C.claw, 9, 18);
    }
    return c;
  }

  function godzillaSet(colors) {
    const set = {};
    for (const [name, opts] of Object.entries({ idle: {}, walk: { step: 2 }, roar: { mouth: true } })) {
      const left = scaleUp(buildGodzilla(colors, opts), 2);
      const right = mirror(left);
      set[name] = {
        left,
        right,
        glow: { left: tint(left, '#b070ff'), right: tint(right, '#b070ff') },
        flash: { left: tint(left, '#ffffff'), right: tint(right, '#ffffff') },
      };
    }
    return set;
  }

  const godzilla = { normal: godzillaSet(GZ_NORMAL), power: godzillaSet(GZ_POWER) };

  // Godzillas hand som tar sönder sjukhusfönstret (96x80)
  const godzillaHand = (() => {
    const c = createCanvas(48, 40);
    const g = c.getContext('2d');
    const fingers = [[10, 24, 9], [19, 27, 9], [28, 27, 9], [37, 24, 8]];
    paintBlobs(g, [
      { cx: 24, cy: 12, rx: 14, ry: 10, color: GZ_NORMAL.skin },
      ...fingers.map(([cx, cy, ry]) => ({ cx, cy, rx: 4, ry, color: GZ_NORMAL.skin })),
    ], GZ_NORMAL.outline);
    for (const [cx, cy, ry] of fingers) {
      g.fillStyle = GZ_NORMAL.dark;
      g.fillRect(cx - 2, cy - 2, 4, 1); // knogar
      g.fillRect(cx - 2, cy + 3, 4, 1);
      g.fillStyle = GZ_NORMAL.claw;
      g.fillRect(cx - 1, cy + ry, 3, 2);
      g.fillRect(cx, cy + ry + 2, 1, 2);
    }
    return scaleUp(c, 2);
  })();

  // --- Dynamit (6x13) ------------------------------------------------------
  const dynamite = fromRows([
    '...F..',
    '..F...',
    '...F..',
    '.KKKK.',
    'RRRRRR',
    'RrRRRR',
    'RrRRRR',
    'WWWWWW',
    'RrRRRR',
    'RrRRRR',
    'RrRRRR',
    'RRRRRR',
    '.KKKK.',
  ], { F: '#c8a878', K: '#3a1a0a', R: '#d82818', r: '#f86848', W: '#f8f0d0' });

  // --- Helikopter (32x14, ritad åt höger, spelaren i cockpit) ----------------
  const HELI_BODY = [
    '...............KK...............',
    '.............GGGGGGG............',
    '...........GGGGGGGGGWW..........',
    '..........GGGGGGGGGWWWW.........',
    'T.........GGGGGGGGWWCCCW........',
    'TT........GGGGGGGGWWSSSWW.......',
    'TTGGGGGGGGGGGGGGGGWWSSKWWW......',
    'TTGGGGGGGGGGGGGGGGGGGGGGGGGG....',
    'T.......DGGGGGGGGGGGGGGGGGGGG...',
    '........DDGGGGYGGGGGGGGGGGGG....',
    '..........DDDDDDDDDDDDDDDDD.....',
    '............K.........K.........',
    '..........KKKKKKKKKKKKKKKKKK....',
  ];
  const HELI_PALETTE = {
    G: '#3c6e2a', D: '#244418', W: '#a0d8ff', C: '#f83800', S: '#fcb894', K: '#18181c', Y: '#f8d838',
  };
  // Två bildrutor med rotorn i olika lägen
  const helicopter = [
    ['...KKKKKKKKKKKKKKKKKKKKKKKKKKK..', '#303034'],
    ['..........KKKKKKKKKKKK..........', '#9098a0'],
  ].map(([rotor, tail]) => {
    const rows = [rotor, ...HELI_BODY];
    const palette = { ...HELI_PALETTE, T: tail };
    return { right: fromRows(rows, palette), left: fromRows(rows, palette, true) };
  });

  // --- Slutscenen: polisen, glassmannen och polisbilen ----------------------
  const figure = (rows, palette) => ({ right: fromRows(rows, palette), left: fromRows(rows, palette, true) });

  const police = figure([
    '.....CCCCCC.....',
    '....KKKKKKKKK...',
    '.....SSSSKS.....',
    '.....SSSSSS.....',
    '......SSSS......',
    '....BBBBBBB.....',
    '...BBBBBYBBB....',
    '...BBBBBBBBB....',
    '..SBBBBBBBBBS...',
    '...BBBBBBBBB....',
    '....KKKKKKK.....',
    '....NNNNNNN.....',
    '....NNN.NNN.....',
    '....NNN.NNN.....',
    '....NNN.NNN.....',
    '...KKKK.KKKK....',
  ], { C: '#1c2c5c', K: '#101018', S: '#fcb894', B: '#2848a8', Y: '#f8d838', N: '#1c2c5c' });

  const iceCreamMan = figure([
    '.....PPPPP......',
    '....PPPPPPP.....',
    '....PKKKKKP.....',
    '....PKRKRKP.....',
    '....PKWWWKP.....',
    '...PPPPPPPPP....',
    '...PPWWWWWPP....',
    '..PPPWWWWWPPP...',
    '..SPPWWWWWPPS...',
    '...PPWWWWWPP....',
    '...PPPPPPPPP....',
    '....PPPPPPP.....',
    '....PPP.PPP.....',
    '....PPP.PPP.....',
    '....PPP.PPP.....',
    '...KKKK.KKKK....',
  ], { P: '#4a2c60', K: '#0c0810', R: '#ff3030', W: '#e8e8e8', S: '#c8a0a0' });

  // Svensk polisbil med blågul rutmönstrad rand (48x22, framsidan åt höger)
  const policeCar = makeSprite(48, 22, (x, y) => {
    if (y < 3) {
      if (x < 19 || x > 28) return null;
      if (y === 0 || x === 19 || x === 28) return '#101018';
      return x < 24 ? '#2050f8' : '#f82020';
    }
    if (y < 10) {
      const l = 14 - (y - 3);
      const r = 33 + (y - 3);
      if (x < l || x > r) return null;
      if (x === l || x === r || y === 3 || x === 23 || x === 24) return '#101018';
      return '#a0d8ff';
    }
    const d1 = (x - 11) ** 2 + (y - 18) ** 2;
    const d2 = (x - 37) ** 2 + (y - 18) ** 2;
    if (d1 <= 3 || d2 <= 3) return '#9ca4b8';
    if (d1 <= 12 || d2 <= 12) return '#18181c';
    if (y > 17 || x < 1 || x > 46) return null;
    if (y === 10 || y === 17 || x === 1 || x === 46) return '#101018';
    if (y >= 13 && y <= 15) return (Math.floor(x / 3) + y) % 2 ? '#1838a0' : '#e8f020';
    if (y === 12 && x >= 43) return '#fff8c0';
    if (y === 12 && x <= 3) return '#f83800';
    return '#f0f0f0';
  });

  return {
    player, goofyWalk, tiles, trampoline, sirenHead, witherSkeleton, rocket, train,
    venom, herobrine, momo, house, bomb, ghost, piranha, kiosk, cone,
    godzilla, godzillaHand, dynamite, helicopter, police, iceCreamMan, policeCar,
    createCanvas, pixelLine,
  };
})();
