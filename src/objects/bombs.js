// Bombregn: med jämna mellanrum går flyglarmet och sedan regnar det bomber runt spelaren.
// Bomberna exploderar när de slår i marken, ett tak eller spelaren. Står man inne i ett
// hus är man skyddad.
class BombRain extends Enemy {
  static FIRST_CALM = 420;
  static CALM_MIN = 420;
  static CALM_MAX = 720;
  static WARNING = 120;
  static RAIN = 330;
  static SPAWN_GAP = 9;
  static SPREAD = 150; // hur långt från spelaren bomberna kan falla
  static RADIUS = 20; // explosionens räckvidd
  static BLAST_FRAMES = 24;

  constructor() {
    super(0, 0, 0, 0);
    this.state = 'calm';
    this.timer = BombRain.FIRST_CALM;
    this.bombs = [];
    this.blasts = [];
  }

  update(player, entities) {
    this.shake = Math.max(0, this.shake - 0.15);
    const houses = entities.filter((e) => e instanceof House);
    const targets = entities.filter((e) => e.bombable);

    for (const b of this.bombs) {
      b.vy = Math.min(b.vy + 0.06, 3);
      b.y += b.vy;
      if (b.y > CONFIG.HEIGHT) b.done = true;
      else if (this.hits(b, player, houses, targets)) this.explode(b, player, targets);
    }
    this.bombs = this.bombs.filter((b) => !b.done);
    for (const blast of this.blasts) blast.t++;
    this.blasts = this.blasts.filter((blast) => blast.t < BombRain.BLAST_FRAMES);

    if (!player.alive || player.dying || player.captured) return;

    const B = BombRain;
    this.timer--;
    if (this.state === 'calm') {
      if (this.timer <= 0) {
        this.setState('warning', B.WARNING);
        Sound.alarm();
      }
    } else if (this.state === 'warning') {
      if (this.timer === B.WARNING / 2) Sound.alarm();
      if (this.timer <= 0) this.setState('rain', B.RAIN);
    } else {
      if (this.timer % B.SPAWN_GAP === 0) this.spawn(player);
      if (this.timer <= 0) this.setState('calm', B.CALM_MIN + Math.floor(Math.random() * (B.CALM_MAX - B.CALM_MIN)));
    }
  }

  setState(state, timer) {
    this.state = state;
    this.timer = timer;
  }

  spawn(player) {
    const px = player.x + player.w / 2;
    // Var fjärde bomb siktar rakt på spelaren
    const spread = Math.random() < 0.25 ? 12 : BombRain.SPREAD;
    const x = px + (Math.random() * 2 - 1) * spread;
    this.bombs.push({ x: Math.max(8, Math.min(Level.WIDTH - 8, x)), y: -10, vy: 0.5, done: false });
    if (this.bombs.length % 3 === 0) Sound.whistle();
  }

  hits(b, player, houses, targets) {
    const exposed = player.alive && !player.dying && !player.hidden && !player.captured;
    if (exposed && this.touches(b, player)) return true;
    if (targets.some((e) => e.bombable && this.touches(b, e))) return true;
    if (houses.some((h) => b.x > h.x && b.x < h.x + h.w && b.y + 5 >= h.roofY(b.x))) return true;
    return Level.isSolid(Math.floor(b.x / CONFIG.TILE), Math.floor((b.y + 5) / CONFIG.TILE));
  }

  touches(b, box) {
    return b.x + 3 > box.x && b.x - 3 < box.x + box.w && b.y + 5 > box.y && b.y - 5 < box.y + box.h;
  }

  // Ligger någon del av box inom explosionens räckvidd?
  inBlast(b, box) {
    const nx = Math.max(box.x, Math.min(b.x, box.x + box.w));
    const ny = Math.max(box.y, Math.min(b.y, box.y + box.h));
    return (nx - b.x) ** 2 + (ny - b.y) ** 2 < BombRain.RADIUS ** 2;
  }

  explode(b, player, targets) {
    b.done = true;
    this.blasts.push({ x: b.x, y: b.y + 3, t: 0 });
    if (Math.abs(b.x - player.x) < CONFIG.WIDTH) {
      Sound.boom();
      this.shake = Math.max(this.shake, 2);
    }
    for (const e of targets) {
      if (e.bombable && this.inBlast(b, e)) e.die();
    }
    if (!player.alive || player.dying || player.hidden || player.captured) return;

    if (this.inBlast(b, player)) {
      player.kill(Math.sign(player.x + player.w / 2 - b.x) * 1.5);
      Sound.hit();
    }
  }

  draw(ctx, camX) {
    const T = CONFIG.TILE;
    for (const b of this.bombs) {
      // Skugga där bomben kommer att slå ner
      let row = Math.max(0, Math.floor(b.y / T));
      while (row < Level.ROWS && !Level.isSolid(Math.floor(b.x / T), row)) row++;
      ctx.fillStyle = 'rgba(0, 0, 32, 0.5)';
      ctx.fillRect(Math.round(b.x - 3 - camX), row * T - 1, 7, 2);
      ctx.drawImage(Sprites.bomb, Math.round(b.x - 3 - camX), Math.round(b.y - 5));
    }

    for (const blast of this.blasts) {
      const r = Math.min(BombRain.RADIUS, 4 + blast.t * 2);
      const fade = Math.max(0, (blast.t - 14) / 10);
      for (let dy = -r; dy <= r; dy += 2) {
        for (let dx = -r; dx <= r; dx += 2) {
          const d = Math.hypot(dx, dy);
          if (d > r || Math.random() < fade) continue;
          ctx.fillStyle = d < r * 0.4 ? '#fff8c0' : d < r * 0.7 ? '#f8b800' : '#f83800';
          ctx.fillRect(Math.round(blast.x + dx - camX), Math.round(blast.y + dy), 2, 2);
        }
      }
    }

    const { WIDTH, HEIGHT } = CONFIG;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = 'bold 10px "Courier New", monospace';
    if (this.state === 'warning' && this.timer % 20 < 12) {
      ctx.fillStyle = 'rgba(248, 56, 0, 0.12)';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = '#f83800';
      ctx.fillText('BOMB RAIN! HIDE IN A HOUSE!', WIDTH / 2, 8);
    } else if (this.state === 'rain') {
      ctx.fillStyle = '#f8d838';
      ctx.fillText('BOMB RAIN!', WIDTH / 2, 8);
    }
  }
}

Enemy.register('bombs', BombRain);
