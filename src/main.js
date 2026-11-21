(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const T = CONFIG.TILE;
  const { WIDTH, HEIGHT } = CONFIG;
  const FADE = 30; // bildrutor för in-/uttoning vid banbyte
  const TITLE = 90; // bildrutor som banans namn visas
  let player, entities, camX, deathTimer;
  let transition = null;
  let winTimer = -1; // >= 0 när spelet är klart
  let killed = new Set(); // fiender som dött på banan, de kommer inte tillbaka när man försöker igen
  let selector = null; // nivåväljaren (fuskkod "william")

  function startLevel(index) {
    Sound.stopAll();
    Effects.clear();
    Level.load(index);
    const level = Level.current;
    const row = level.startRow ?? Level.GROUND_ROW - 1;
    player = new Player(3 * T, level.dropIn ? -T : row * T);
    if (level.arriveByRocket) {
      player.captured = true; // släpps ut när raketen har landat
      player.visible = false;
    }
    entities = [];
    [...level.enemies, ...(level.objects || [])].forEach(({ type, col, row = Level.GROUND_ROW }, i) => {
      if (killed.has(i)) return;
      const entity = Enemy.create(type, col * T, row * T);
      entity.spawnId = i;
      entities.push(entity);
    });
    for (const entity of entities) entity.start?.(player); // t.ex. mellansekvenser som tar kontroll direkt
    camX = 0;
    deathTimer = 0;
  }

  // Tonar ut, byter bana, visar banans namn och tonar in.
  function changeLevel(index) {
    Sound.stopAll();
    killed = new Set();
    transition = { timer: 0, next: index };
  }

  function updateSelector() {
    const n = Level.count;
    if (Input.pressed('ArrowUp', 'KeyW')) selector.choice = (selector.choice + n - 1) % n;
    if (Input.pressed('ArrowDown', 'KeyS')) selector.choice = (selector.choice + 1) % n;
    if (Input.pressed('Escape')) {
      selector = null;
    } else if (Input.pressed('Enter', 'Space')) {
      winTimer = -1;
      changeLevel(selector.choice);
      selector = null;
    }
  }

  function update() {
    if (!transition && Input.cheat('william')) selector = { choice: Level.index };
    if (selector) {
      updateSelector();
      return;
    }

    if (transition) {
      transition.timer++;
      if (transition.timer === FADE) startLevel(transition.next);
      if (transition.timer >= 2 * FADE + TITLE) transition = null;
      return;
    }

    if (winTimer >= 0) {
      winTimer++;
      Ending.update(winTimer);
      if (winTimer > Ending.DONE && Input.jumpPressed()) {
        winTimer = -1;
        changeLevel(0);
      }
      return;
    }

    const wasAlive = player.alive && !player.dying;
    player.update();
    player.hidden = entities.some((e) => e.shelters?.(player));
    for (const entity of entities) entity.update(player, entities);
    for (const entity of entities) if (entity.dead || entity.finished) killed.add(entity.spawnId);
    entities = entities.filter((e) => !e.removed);
    Effects.update();
    if (wasAlive && (!player.alive || player.dying)) Sound.death();

    const target = player.x + player.w / 2 - WIDTH / 2;
    camX = Math.max(0, Math.min(target, Level.WIDTH - WIDTH));

    // Banan är klar när studsmattan skjutit upp spelaren ur bild eller ett objekt (raket, tåg) säger det
    const launchedOut = player.launched && player.y + player.h < 0;
    if (launchedOut || entities.some((e) => e.levelDone)) {
      if (Level.index === Level.count - 1) {
        Sound.stopAll();
        winTimer = 0; // slutscenen med polisen
      } else {
        changeLevel(Level.index + 1);
      }
      return;
    }

    if (!player.alive) {
      deathTimer++;
      if (deathTimer > 40 && Input.jumpPressed()) startLevel(Level.index);
    }
  }

  function render() {
    const cam = Math.round(camX);
    const shake = Math.max(0, ...entities.map((e) => e.shake));

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.save();
    if (shake > 0) {
      ctx.translate(Math.round((Math.random() * 2 - 1) * shake), Math.round((Math.random() * 2 - 1) * shake));
    }
    Background.draw(ctx, cam, Level.current.theme);
    Level.draw(ctx, cam);
    player.draw(ctx, cam);
    for (const entity of entities) entity.draw(ctx, cam);
    Level.drawWater(ctx, cam);
    Effects.draw(ctx, cam);
    ctx.restore();
    for (const entity of entities) entity.drawOverlay?.(ctx); // mellansekvenser över hela skärmen

    if (!player.alive) drawGameOver();
    if (winTimer >= 0) Ending.draw(ctx, winTimer);
    if (transition) drawTransition();
    if (selector) drawSelector();
  }

  function drawSelector() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 16px "Courier New", monospace';
    ctx.fillStyle = '#f8d838';
    ctx.fillText('SELECT LEVEL', WIDTH / 2, 40);

    ctx.font = 'bold 10px "Courier New", monospace';
    ctx.textAlign = 'left';
    Level.names.forEach((name, i) => {
      const y = 76 + i * 18;
      const active = i === selector.choice;
      ctx.fillStyle = active ? '#f8d838' : '#a8a8b8';
      ctx.fillText(`${active ? '>' : ' '} ${i + 1}. ${name}`, 48, y);
    });

    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.fillText('↑↓: SELECT  JUMP/ENTER: START', WIDTH / 2, HEIGHT - 36);
    ctx.fillText('ESC: CANCEL', WIDTH / 2, HEIGHT - 22);
  }

  function drawTransition() {
    const t = transition.timer;
    let alpha = 1;
    if (t < FADE) alpha = t / FADE;
    else if (t > FADE + TITLE) alpha = 1 - (t - FADE - TITLE) / FADE;
    ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    if (t < FADE || t > FADE + TITLE) return;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 12px "Courier New", monospace';
    ctx.fillStyle = '#fff';
    ctx.fillText(`LEVEL ${Level.index + 1}`, WIDTH / 2, HEIGHT / 2 - 14);
    ctx.font = 'bold 20px "Courier New", monospace';
    ctx.fillStyle = '#f8d838';
    ctx.fillText(Level.current.name, WIDTH / 2, HEIGHT / 2 + 8);
  }

  function drawGameOver() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 24px "Courier New", monospace';
    ctx.fillStyle = '#f83800';
    ctx.fillText('YOU DIED', WIDTH / 2, HEIGHT / 2 - 12);
    if (deathTimer > 40 && Math.floor(deathTimer / 30) % 2 === 0) {
      ctx.font = 'bold 10px "Courier New", monospace';
      ctx.fillStyle = '#fff';
      ctx.fillText('PRESS JUMP TO TRY AGAIN', WIDTH / 2, HEIGHT / 2 + 16);
    }
  }

  startLevel(0);
  transition = { timer: FADE, next: 0 }; // visa banans namn vid start

  // Fast tidssteg (60 Hz) så att fysiken beter sig likadant oavsett skärmens uppdateringsfrekvens.
  const STEP = 1000 / 60;
  let acc = 0;
  let last = performance.now();

  function frame(now) {
    acc += Math.min(now - last, 250);
    last = now;
    while (acc >= STEP) {
      update();
      Input.endFrame();
      acc -= STEP;
    }
    render();
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
})();
