// Banorna. Varje bana har tema (grafik), dräkt för spelaren, egen fysik, hinder och fiender.
// Level.load(i) byter till bana i.
const Level = (() => {
  const T = CONFIG.TILE;
  const ROWS = CONFIG.HEIGHT / T; // 15
  const GROUND_ROW = ROWS - 2;

  const EMPTY = 0;
  const GROUND = 1;
  const BLOCK = 2;
  const TRAMPOLINE = 3;

  const LEVELS = [
    {
      name: 'THE CITY',
      theme: 'city',
      outfit: 'normal',
      cols: 128,
      // Lådor: [kolumn, antal staplade]
      blocks: [
        [12, 1], [18, 2], [24, 1], [25, 1], [32, 3],
        [40, 1], [41, 2], [42, 3], [50, 2], [58, 1],
        [59, 1], [60, 1], [68, 2], [69, 2], [78, 3],
        [79, 2], [80, 1], [90, 1], [98, 2], [106, 3],
        [114, 1], [115, 2],
      ],
      // Svävande plattformar: [kolumn, rad, längd]
      platforms: [],
      trampoline: 121, // studsar spelaren vidare till nästa bana
      // Fiender: typ (registrerad med Enemy.register), kolumn och ev. raden de står på
      enemies: [
        { type: 'sirenhead', col: 46 },
        { type: 'sirenhead', col: 85 },
      ],
    },
    {
      name: 'OUTER SPACE',
      theme: 'space',
      outfit: 'space',
      cols: 128,
      dropIn: true, // spelaren svävar ner uppifrån
      physics: { GRAVITY: 0.12, MAX_FALL: 2.5, JUMP_SPEED: -6.1, JUMP_CUT: 0.6 },
      blocks: [
        [14, 2], [30, 4], [31, 4], [46, 3], [62, 4],
        [80, 2], [81, 4], [100, 3], [118, 4],
      ],
      platforms: [
        [22, 9, 4], [36, 8, 5], [52, 9, 4], [68, 7, 6],
        [86, 9, 4], [92, 6, 4], [108, 8, 5],
      ],
      enemies: [
        { type: 'wither', col: 22 },
        { type: 'wither', col: 38, row: 8 },
        { type: 'wither', col: 40 },
        { type: 'wither', col: 56 },
        { type: 'wither', col: 70, row: 7 },
        { type: 'wither', col: 74 },
        { type: 'wither', col: 92 },
        { type: 'wither', col: 110 },
        { type: 'wither', col: 114 },
      ],
      // Objekt som inte är fiender, skapas på samma sätt
      objects: [{ type: 'rocket', col: 121 }],
    },
    {
      name: 'THE SUBWAY',
      theme: 'subway',
      outfit: 'normal',
      walkStyle: 'goofy',
      cols: 220,
      blocks: [],
      platforms: [],
      enemies: [{ type: 'trains', col: 0 }], // klar när alla tåg är överlevda
    },
    {
      name: 'THE NEW GALAXY',
      theme: 'bluesun',
      outfit: 'space',
      cols: 160,
      arriveByRocket: true, // spelaren sitter i raketen som landar i början
      physics: { GRAVITY: 0.2, MAX_FALL: 4, JUMP_SPEED: -7.1, JUMP_CUT: 0.55 },
      blocks: [
        [24, 1], [44, 2], [62, 1], [63, 2], [84, 1],
        [102, 2], [120, 1], [121, 2], [138, 1],
      ],
      platforms: [[58, 10, 4], [98, 10, 4], [124, 10, 4]],
      enemies: [
        { type: 'venom', col: 30 },
        { type: 'momo', col: 48 },
        { type: 'venom', col: 68 },
        { type: 'momo', col: 88 },
        { type: 'venom', col: 106 },
        { type: 'momo', col: 128 },
        { type: 'herobrine', col: 20 }, // börjar hemsöka när spelaren passerat kolumnen
      ],
      objects: [
        { type: 'landingRocket', col: 1 },
        { type: 'house', col: 12 },
        { type: 'house', col: 32 },
        { type: 'house', col: 52 },
        { type: 'house', col: 74 },
        { type: 'house', col: 92 },
        { type: 'house', col: 112 },
        { type: 'house', col: 132 },
        { type: 'house', col: 146 },
        { type: 'rocket', col: 152 }, // raketen hem
        { type: 'bombs', col: 0 }, // sist så att bomberna ritas ovanpå husen
      ],
    },
    {
      name: 'THE HARD LEVEL',
      theme: 'sewer',
      outfit: 'normal',
      cols: 176,
      dropIn: true,
      water: 4, // vattenytan ligger överst på rad 4, allt under är kloakvatten
      // Fysik i vattnet. Hopp = simtag, vid ytan blir det ett vanligt hopp upp ur vattnet.
      swim: {
        GRAVITY: 0.05, MAX_FALL: 1.2, WALK_ACCEL: 0.08, AIR_ACCEL: 0.08,
        FRICTION: 0.05, MAX_WALK: 1.3, SWIM_SPEED: -1.9,
      },
      blocks: [
        [18, 3], [19, 3], [34, 5], [52, 2], [53, 4], [70, 6], [86, 3], [87, 3],
        [104, 5], [122, 4], [123, 6], [140, 3],
        ...Array.from({ length: 16 }, (_, i) => [160 + i, 10]), // kanten man kliver upp på
      ],
      platforms: [[26, 6, 5], [60, 7, 5], [94, 6, 6], [130, 7, 5]],
      enemies: [
        { type: 'piranha', col: 28, row: 12 },
        { type: 'piranha', col: 46, row: 9 },
        { type: 'piranha', col: 78, row: 12 },
        { type: 'piranha', col: 112, row: 8 },
        { type: 'piranha', col: 134, row: 12 },
      ],
      objects: [
        { type: 'crashIntro', col: 0 }, // raketen går sönder på väg till jorden
        { type: 'icecream', col: 167, row: 3 },
      ],
    },
    {
      // Sista banan: spelaren vaknar på sjukhuset och slåss mot Godzilla i en helikopter
      name: 'GODZILLA',
      theme: 'ruins',
      outfit: 'normal',
      vehicle: 'helicopter',
      cols: 16,
      startRow: 5,
      blocks: [],
      platforms: [],
      enemies: [{ type: 'godzilla', col: 9 }],
      objects: [{ type: 'hospitalIntro', col: 0 }],
    },
  ];

  let index = 0;
  let def, tiles, cols, physics, waterY, waterPhysics;
  let squashUntil = 0;

  function load(i) {
    index = i;
    def = LEVELS[i];
    cols = def.cols;
    physics = { ...CONFIG, ...def.physics };
    waterY = def.water !== undefined ? def.water * T : null;
    waterPhysics = { ...physics, ...def.swim };
    tiles = Array.from({ length: ROWS }, (_, row) =>
      new Array(cols).fill(row >= GROUND_ROW ? GROUND : EMPTY)
    );
    for (const [col, height] of def.blocks) {
      for (let k = 0; k < height; k++) tiles[GROUND_ROW - 1 - k][col] = BLOCK;
    }
    for (const [col, row, length] of def.platforms) {
      for (let k = 0; k < length; k++) tiles[row][col + k] = BLOCK;
    }
    if (def.trampoline !== undefined) tiles[GROUND_ROW - 1][def.trampoline] = TRAMPOLINE;
  }

  function isSolid(col, row) {
    if (col < 0 || col >= cols) return true; // osynliga väggar i banans kanter
    if (row < 0 || row >= ROWS) return false;
    return tiles[row][col] !== EMPTY;
  }

  function isTrampoline(col, row) {
    return row >= 0 && row < ROWS && tiles[row][col] === TRAMPOLINE;
  }

  function squashTrampoline() {
    squashUntil = performance.now() + 250;
  }

  function draw(ctx, camX) {
    const set = Sprites.tiles[def.theme];
    const first = Math.max(0, Math.floor(camX / T));
    const last = Math.min(cols - 1, Math.floor((camX + CONFIG.WIDTH) / T));
    for (let row = 0; row < ROWS; row++) {
      for (let col = first; col <= last; col++) {
        const t = tiles[row][col];
        if (t === EMPTY) continue;
        let img = set.block;
        if (t === GROUND) img = row === GROUND_ROW ? set.top : set.ground;
        else if (t === TRAMPOLINE) {
          img = performance.now() < squashUntil ? Sprites.trampoline.squashed : Sprites.trampoline.normal;
        }
        ctx.drawImage(img, col * T - camX, row * T);
      }
    }
  }

  // Grumligt kloakvatten med vågor och bubblor. Ritas ovanpå allt som är under ytan.
  function drawWater(ctx, camX) {
    if (waterY === null) return;
    const { WIDTH, HEIGHT } = CONFIG;
    const t = performance.now() / 1000;
    ctx.fillStyle = 'rgba(70, 100, 30, 0.5)';
    ctx.fillRect(0, waterY, WIDTH, HEIGHT - waterY);

    ctx.fillStyle = '#9ab858';
    for (let x = 0; x < WIDTH; x += 2) {
      const wave = Math.round(Math.sin((x + camX) / 9 + t * 3) * 1.5);
      ctx.fillRect(x, waterY + wave - 1, 2, 2);
    }

    ctx.fillStyle = 'rgba(200, 230, 150, 0.6)';
    const bottom = GROUND_ROW * T;
    const depth = bottom - waterY;
    for (let i = 0; i * 71 < cols * T; i++) {
      const x = i * 71 - camX + Math.sin(t * 2 + i) * 2;
      if (x < -2 || x > WIDTH) continue;
      ctx.fillRect(Math.round(x), Math.round(bottom - ((t * 20 + i * 53) % depth)), 2, 2);
    }
  }

  load(0);

  return {
    ROWS,
    GROUND_ROW,
    GROUND_Y: GROUND_ROW * T,
    get index() { return index; },
    get count() { return LEVELS.length; },
    get names() { return LEVELS.map((l) => l.name); },
    get current() { return def; },
    get physics() { return physics; },
    get waterY() { return waterY; }, // null om banan saknar vatten
    get waterPhysics() { return waterPhysics; },
    get WIDTH() { return cols * T; },
    load,
    isSolid,
    isTrampoline,
    squashTrampoline,
    draw,
    drawWater,
  };
})();
