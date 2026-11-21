// Herobrine hemsöker banan: när spelaren har passerat startpunkten teleporterar han sig
// fram nära spelaren, stirrar med sina vita ögon, går mot hen och försvinner sedan igen.
// Hoppar man på honom eller träffas han av en bomb dör han, men han kommer alltid tillbaka.
// Gömmer man sig i ett hus försvinner han direkt.
class Herobrine extends Enemy {
  static W = 10;
  static H = 28;
  static SPRITE_OFFSET = 3;
  static SPEED = 0.8;
  static FIRST_DELAY = 60;
  static AWAY_MIN = 180;
  static AWAY_MAX = 360;
  static STARE = 60;
  static WALK = 180;
  static STOMP_MARGIN = 6;

  constructor(x, groundY) {
    super(x, groundY - Herobrine.H, Herobrine.W, Herobrine.H);
    this.state = 'waiting';
    this.timer = 0;
    this.facing = -1;
    this.walkDist = 0;
    this.particles = [];
  }

  get visible() {
    return this.state === 'stare' || this.state === 'walk';
  }

  get bombable() {
    return this.visible;
  }

  // Dör med blod och spöke, men återuppstår efter en stund.
  die() {
    Effects.death(this.x + this.w / 2, this.y + this.h / 2);
    this.goAway();
  }

  update(player) {
    for (const p of this.particles) {
      p.y += p.vy;
      p.life--;
    }
    this.particles = this.particles.filter((p) => p.life > 0);

    if (!player.alive || player.dying || player.captured) return;

    if (this.state === 'waiting') {
      if (player.x >= this.x) this.setState('away', Herobrine.FIRST_DELAY);
      return;
    }
    if (this.visible && player.hidden) {
      this.vanish();
      return;
    }

    this.timer--;
    if (this.state === 'away') {
      if (this.timer <= 0 && !player.hidden) this.appear(player);
    } else if (this.state === 'stare') {
      if (this.timer <= 0) this.setState('walk', Herobrine.WALK);
    } else if (this.state === 'walk') {
      this.facing = Math.sign(player.x + player.w / 2 - (this.x + this.w / 2)) || this.facing;
      if (!this.blocked()) {
        this.x += this.facing * Herobrine.SPEED;
        this.walkDist += Herobrine.SPEED;
      }
      if (this.timer <= 0) this.vanish();
    }

    if (this.visible && this.stompCheck(player, Herobrine.STOMP_MARGIN)) this.die();
  }

  setState(state, timer) {
    this.state = state;
    this.timer = timer;
  }

  // Dyker upp en bit ifrån spelaren på en ledig plats på marken. Hittas ingen
  // plats provar han igen nästa bildruta.
  appear(player) {
    const T = CONFIG.TILE;
    const side = Math.random() < 0.5 ? -1 : 1;
    for (const s of [side, -side]) {
      const x = player.x + player.w / 2 + s * (64 + Math.random() * 40) - this.w / 2;
      if (x < 0 || x + this.w > Level.WIDTH) continue;
      const cols = [Math.floor(x / T), Math.floor((x + this.w - 1) / T)];
      const rows = [Level.GROUND_ROW - 1, Level.GROUND_ROW - 2];
      if (cols.some((c) => rows.some((r) => Level.isSolid(c, r)))) continue;
      this.x = x;
      this.setState('stare', Herobrine.STARE);
      this.puff();
      Sound.teleport();
      return;
    }
  }

  vanish() {
    this.puff();
    Sound.teleport();
    this.goAway();
  }

  goAway() {
    const H = Herobrine;
    this.setState('away', H.AWAY_MIN + Math.floor(Math.random() * (H.AWAY_MAX - H.AWAY_MIN)));
  }

  puff() {
    for (let i = 0; i < 16; i++) {
      this.particles.push({
        x: this.x + Math.random() * this.w,
        y: this.y + Math.random() * this.h,
        vy: -0.3 - Math.random() * 0.6,
        life: 30 + Math.floor(Math.random() * 20),
        color: i % 2 ? '#8a3cc8' : '#1a0a24',
      });
    }
  }

  draw(ctx, camX) {
    for (const p of this.particles) {
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x - camX), Math.round(p.y), 2, 2);
    }
    if (!this.visible) return;

    const moving = this.state === 'walk' && Math.floor(this.walkDist / 8) % 2;
    const img = Sprites.herobrine[moving ? 'walk' : 'idle'];
    const x = Math.round(this.x - Herobrine.SPRITE_OFFSET - camX);
    const y = Math.round(this.y);
    ctx.drawImage(img, x, y);

    // Lysande ögon
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.fillRect(x + 4, y + 3, 4, 3);
    ctx.fillRect(x + 8, y + 3, 4, 3);
  }
}

Enemy.register('herobrine', Herobrine);
