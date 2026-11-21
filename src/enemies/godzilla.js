// Slutbossen: Godzilla, som blivit ännu mäktigare av dynamiten. Spelaren flyger helikopter
// och skjuter på honom. Godzilla sprutar lila atomeld och stampar så att stenar regnar ner.
// Han använder inte flaggan dead (då skulle han inte komma tillbaka när man försöker igen).
class Godzilla extends Enemy {
  static W = 60;
  static H = 114;
  static HP = 80;
  static MIN_X = 104;
  static MAX_X = 170;
  static HINT = 300; // bildrutor som styrtipset visas

  constructor(x, groundY) {
    super(x, groundY - Godzilla.H, Godzilla.W, Godzilla.H);
    this.groundY = groundY;
    this.facing = -1;
    this.hp = Godzilla.HP;
    this.enraged = false;
    this.state = 'walk';
    this.timer = 100; // tid kvar till nästa attack
    this.targetX = x;
    this.walked = 0;
    this.flash = 0;
    this.lift = 0; // hur högt han hoppar när han stampar
    this.sink = 0; // sjunker ner i marken när han dör
    this.active = 0; // bildrutor som striden pågått
    this.rageText = 0;
    this.shots = [];
    this.rocks = [];
  }

  get spriteX() {
    return this.facing < 0 ? this.x - 12 : this.x - 24;
  }

  get mouth() {
    const sx = this.spriteX;
    return { x: this.facing < 0 ? sx + 8 : sx + 88, y: this.groundY - 128 + 36 - this.lift };
  }

  setState(state, timer) {
    this.state = state;
    this.timer = timer;
  }

  update(player) {
    this.shake = Math.max(0, this.shake - 0.2);
    if (this.flash > 0) this.flash--;
    if (this.rageText > 0) this.rageText--;

    if (this.state === 'dying') {
      this.updateDying();
      return;
    }
    if (player.captured || player.dying || !player.alive) return;
    this.active++;

    this.checkBullets(player);
    if (this.state === 'dying') return;

    if (this.state === 'walk') this.updateWalk(player);
    else if (this.state === 'charge') this.updateCharge(player);
    else if (this.state === 'stomp') this.updateStomp();

    this.updateProjectiles(player);
    if (this.overlaps(player)) player.kill(this.facing * 2);
  }

  updateWalk(player) {
    const G = Godzilla;
    const center = this.x + this.w / 2;
    this.facing = player.x + player.w / 2 < center ? -1 : 1;

    const speed = this.enraged ? 0.6 : 0.4;
    const dx = this.targetX - this.x;
    if (Math.abs(dx) <= speed) {
      this.targetX = G.MIN_X + Math.random() * (G.MAX_X - G.MIN_X);
    } else {
      this.x += Math.sign(dx) * speed;
      this.walked += speed;
      if (this.walked >= 24) {
        this.walked = 0;
        this.shake = 2;
        Sound.thud();
      }
    }

    this.timer--;
    if (this.timer <= 0) {
      if (Math.random() < 0.6) {
        this.setState('charge', this.enraged ? 35 : 50);
        Sound.growl();
      } else {
        this.setState('stomp', 50);
      }
    }
  }

  updateCharge(player) {
    this.timer--;
    if (this.timer > 0) return;
    // Atomeld: en solfjäder av lila eldklot mot spelaren
    const m = this.mouth;
    const count = this.enraged ? 5 : 3;
    const speed = this.enraged ? 2.8 : 2.2;
    const aim = Math.atan2(player.y + player.h / 2 - m.y, player.x + player.w / 2 - m.x);
    for (let i = 0; i < count; i++) {
      const a = aim + (i - (count - 1) / 2) * 0.18;
      this.shots.push({ x: m.x, y: m.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed });
    }
    Sound.breath();
    this.setState('walk', this.enraged ? 70 : 110);
  }

  updateStomp() {
    this.timer--;
    const t = 50 - this.timer;
    this.lift = t < 25 ? Math.sin((t / 25) * Math.PI) * 16 : 0;
    if (t === 25) {
      this.shake = 5;
      Sound.boom();
      Sound.thud();
      this.dropRocks();
    }
    if (this.timer <= 0) this.setState('walk', this.enraged ? 70 : 110);
  }

  // Stenar faller från himlen överallt utom där Godzilla själv står
  dropRocks() {
    const count = this.enraged ? 8 : 5;
    for (let i = 0; i < count; i++) {
      let x;
      do {
        x = 8 + Math.random() * (Level.WIDTH - 16);
      } while (x > this.x - 8 && x < this.x + this.w + 8);
      this.rocks.push({ x, y: -10 - i * 24, vy: 0, size: 6 + Math.floor(Math.random() * 4) });
    }
  }

  updateProjectiles(player) {
    const hits = (x, y, r) =>
      x + r > player.x && x - r < player.x + player.w && y + r > player.y && y - r < player.y + player.h;

    for (const s of this.shots) {
      s.x += s.vx;
      s.y += s.vy;
      if (hits(s.x, s.y, 3)) player.kill(Math.sign(s.vx) * 2);
    }
    this.shots = this.shots.filter((s) => s.x > -10 && s.x < Level.WIDTH + 10 && s.y > -10 && s.y < this.groundY);

    for (const r of this.rocks) {
      r.vy = Math.min(r.vy + 0.12, 4);
      r.y += r.vy;
      if (r.y > 0 && hits(r.x, r.y, r.size / 2)) player.kill();
    }
    this.rocks = this.rocks.filter((r) => r.y < this.groundY - r.size / 2);
  }

  checkBullets(player) {
    const top = this.y - this.lift;
    for (const b of player.bullets) {
      if (b.done || b.x < this.x || b.x > this.x + this.w || b.y < top || b.y > this.groundY) continue;
      b.done = true;
      this.hurt();
      if (this.state === 'dying') return;
    }
  }

  hurt() {
    this.hp--;
    this.flash = 3;
    Sound.bossHit();
    if (!this.enraged && this.hp <= Godzilla.HP / 2) {
      this.enraged = true;
      this.rageText = 120;
      this.shake = 3;
      Sound.roar();
    }
    if (this.hp <= 0) {
      this.setState('dying', 0);
      this.shots = [];
      this.rocks = [];
      this.lift = 0;
      Sound.roar();
    }
  }

  updateDying() {
    const t = ++this.timer;
    if (t <= 120) {
      this.shake = 3;
      if (t % 7 === 0) {
        Effects.blast(this.x + Math.random() * this.w, this.y + Math.random() * this.h * 0.8, 14 + Math.random() * 10);
        if (t % 14 === 0) Sound.boom();
      }
    }
    if (t === 120) {
      const cx = this.x + this.w / 2;
      Effects.death(cx, this.y + 30, 3);
      Effects.death(cx - 20, this.y + 60);
      Effects.death(cx + 20, this.y + 60);
      Sound.thud();
    }
    if (t > 120) this.sink = Math.min(128, (t - 120) * 0.8);
    if (t === 300) this.levelDone = true;
  }

  get frameName() {
    if (this.state === 'charge' || (this.state === 'dying' && this.timer <= 120)) return 'roar';
    if (this.state === 'walk' && Math.abs(this.targetX - this.x) > 0.6) return Math.floor(this.x / 6) % 2 ? 'walk' : 'idle';
    return 'idle';
  }

  draw(ctx, camX) {
    // Skuggor där stenarna kommer att landa
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    for (const r of this.rocks) {
      if (r.y > -40) ctx.fillRect(Math.round(r.x - r.size / 2 - camX), this.groundY - 2, r.size, 2);
    }

    const frame = Sprites.godzilla.power[this.frameName];
    const dir = this.facing < 0 ? 'left' : 'right';
    const sx = Math.round(this.spriteX - camX);
    const sy = Math.round(this.groundY - 128 - this.lift + this.sink);

    ctx.save();
    if (this.sink > 0) {
      ctx.beginPath();
      ctx.rect(-16, -200, CONFIG.WIDTH + 32, this.groundY + 200);
      ctx.clip();
    }
    // Lila sken runt kroppen som fladdrar
    ctx.globalAlpha = (this.enraged ? 0.45 : 0.3) + Math.random() * 0.2;
    const glow = this.enraged ? 3 : 2;
    for (const [dx, dy] of [[-glow, 0], [glow, 0], [0, -glow], [0, glow]]) {
      ctx.drawImage(frame.glow[dir], sx + dx, sy + dy);
    }
    ctx.globalAlpha = 1;
    ctx.drawImage(this.flash > 0 ? frame.flash[dir] : frame[dir], sx, sy);
    ctx.restore();

    // Atomeld
    for (const s of this.shots) {
      const x = Math.round(s.x - camX);
      const y = Math.round(s.y);
      ctx.fillStyle = '#9a50ff';
      ctx.fillRect(x - 4, y - 2, 8, 4);
      ctx.fillRect(x - 2, y - 4, 4, 8);
      ctx.fillStyle = '#f0d8ff';
      ctx.fillRect(x - 1, y - 1, 2, 2);
    }

    // Stenar
    for (const r of this.rocks) {
      const x = Math.round(r.x - r.size / 2 - camX);
      const y = Math.round(r.y - r.size / 2);
      ctx.fillStyle = '#5a4a44';
      ctx.fillRect(x, y, r.size, r.size);
      ctx.fillStyle = '#8a7a70';
      ctx.fillRect(x + 1, y + 1, r.size - 3, 2);
    }
  }

  // Livmätare och styrtips, i skärmkoordinater
  drawOverlay(ctx) {
    const G = Godzilla;
    if (this.state === 'dying' && this.timer > 120) return;
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 8px "Courier New", monospace';
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('GODZILLA', 84, 12);
    ctx.fillStyle = '#000000';
    ctx.fillRect(87, 7, 162, 10);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(88, 8, 160, 8);
    ctx.fillStyle = '#3a0808';
    ctx.fillRect(89, 9, 158, 6);
    ctx.fillStyle = this.enraged ? '#b050ff' : '#f83800';
    ctx.fillRect(89, 9, Math.round((158 * Math.max(0, this.hp)) / G.HP), 6);

    ctx.textAlign = 'center';
    if (this.active < G.HINT) {
      ctx.fillStyle = '#ffffff';
      ctx.fillText('ARROWS: FLY   SPACE/X: SHOOT', CONFIG.WIDTH / 2, CONFIG.HEIGHT - 10);
    }
    if (this.rageText > 0 && this.rageText % 20 < 14) {
      ctx.font = 'bold 12px "Courier New", monospace';
      ctx.fillStyle = '#d070ff';
      ctx.fillText('GODZILLA IS FURIOUS!', CONFIG.WIDTH / 2, 32);
    }
  }
}

Enemy.register('godzilla', Godzilla);
