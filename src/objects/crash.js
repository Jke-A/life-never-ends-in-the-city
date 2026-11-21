// Inledningen på "The hard level": raketen är på väg hem mot jorden men motorn börjar
// hacka, raketen exploderar och spelaren faller ner mot jorden... rakt ner i kloaken.
// Visas som en egen scen över hela skärmen och bara första gången man spelar banan.
class CrashIntro extends Enemy {
  static BREAK = 90; // motorn börjar hacka
  static EXPLODE = 150;
  static FADE = 215;
  static END = 245; // spelaren släpps ner i kloaken
  static FADE_IN = 30;

  constructor() {
    super(0, 0, 0, 0);
    this.timer = 0;
    this.finished = false; // sätts när scenen visats, så att den inte visas igen vid nytt försök
    this.pieces = [];
    this.smoke = [];
    this.blast = null;
    this.stars = Background.makeStars(CONFIG.WIDTH, 77, 90, ['#ffffff', '#a0c8ff', '#ffe8a0']);
    this.earth = Background.makeEarth(182, 91, 91, 90, 11);
  }

  get rocketPos() {
    return { x: CONFIG.WIDTH / 2, y: 70 + this.timer * 0.15 };
  }

  update(player) {
    const C = CrashIntro;
    if (this.timer === 0) {
      player.captured = true;
      player.visible = false;
      this.sound = Sound.rumble(5);
    }
    this.timer++;
    const t = this.timer;
    const r = this.rocketPos;

    if (t >= C.BREAK && t < C.EXPLODE) {
      if (t % 12 === 0) Sound.sputter();
      if (t % 4 === 0) this.smoke.push({ x: r.x + Math.random() * 8 - 4, y: r.y - 24, r: 2, life: 40 });
    }

    if (t === C.EXPLODE) {
      this.sound?.stop(0.1);
      Sound.boom();
      Sound.whistle();
      this.blast = { x: r.x, y: r.y };
      const colors = ['#f83800', '#f8f8f8', '#9ca4b8', '#c02000', '#3cbcfc'];
      for (let i = 0; i < 10; i++) {
        const a = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 2.5;
        this.pieces.push({
          x: r.x, y: r.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
          rot: 0, vr: (Math.random() - 0.5) * 0.4, size: 3 + Math.floor(Math.random() * 6),
          color: colors[i % colors.length],
        });
      }
    }

    for (const p of this.pieces) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.04;
      p.rot += p.vr;
    }
    for (const s of this.smoke) {
      s.y -= 1;
      s.r += 0.2;
      s.life--;
    }
    this.smoke = this.smoke.filter((s) => s.life > 0);

    if (t === C.END) {
      player.captured = false;
      player.visible = true;
      player.facing = 1;
      player.x = 3 * CONFIG.TILE;
      player.y = -CONFIG.TILE;
      player.vx = 0;
      player.vy = 1;
      this.finished = true;
    }
    if (t >= C.END + C.FADE_IN) this.removed = true;
  }

  // Ritas ovanpå allt annat, i skärmkoordinater.
  drawOverlay(ctx) {
    const C = CrashIntro;
    const { WIDTH, HEIGHT } = CONFIG;
    const t = this.timer;

    if (t >= C.END) {
      // Tonar in kloaken
      ctx.fillStyle = `rgba(0, 0, 0, ${1 - (t - C.END) / C.FADE_IN})`;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      return;
    }

    ctx.save();
    const shake = t >= C.EXPLODE && t < C.EXPLODE + 30 ? 3 : t >= C.BREAK && t < C.EXPLODE ? 1 : 0;
    if (shake) ctx.translate(Math.round((Math.random() * 2 - 1) * shake), Math.round((Math.random() * 2 - 1) * shake));

    // Rymden med stjärnor som rusar förbi uppåt och jorden som kommer allt närmare
    ctx.fillStyle = '#07071c';
    ctx.fillRect(-4, -4, WIDTH + 8, HEIGHT + 8);
    const off = Math.floor(t * 2) % 200;
    for (let y = -off; y < HEIGHT; y += 200) ctx.drawImage(this.stars, 0, y);
    const size = 182 * (1.1 + (t / C.END) * 1.4);
    ctx.drawImage(this.earth, 0, 0, 182, 182, Math.round(WIDTH / 2 - size / 2), Math.round(290 - size / 2), size, size);

    for (const s of this.smoke) {
      ctx.fillStyle = `rgba(90, 90, 100, ${s.life / 50})`;
      const r = Math.round(s.r);
      ctx.fillRect(Math.round(s.x - r), Math.round(s.y - r), r * 2, r * 2);
    }

    const r = this.rocketPos;
    if (t < C.EXPLODE) {
      ctx.save();
      ctx.translate(r.x, r.y);
      ctx.rotate(Math.PI * 0.92 + (t >= C.BREAK ? Math.sin(t / 3) * 0.2 : 0));
      if (t < C.BREAK || t % 8 < 3) {
        const flame = 10 + Math.random() * 6;
        ctx.fillStyle = '#f87800';
        ctx.fillRect(-4, 30, 8, flame);
        ctx.fillStyle = '#f8d838';
        ctx.fillRect(-2, 30, 4, flame * 0.6);
      }
      ctx.drawImage(Sprites.rocket, -16, -30);
      ctx.restore();
    } else {
      // Spelaren tumlar ner mot jorden
      const ft = t - C.EXPLODE;
      const scale = Math.max(0.4, 1.4 - ft / 60);
      ctx.save();
      ctx.translate(r.x + Math.sin(ft / 15) * 10, r.y + ft * 1.2);
      ctx.rotate(ft * 0.2);
      ctx.scale(scale, scale);
      ctx.drawImage(Sprites.player[Level.current.outfit].jump.right, -8, -8);
      ctx.restore();
    }

    for (const p of this.pieces) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, Math.max(2, p.size / 2));
      ctx.restore();
    }

    if (this.blast && t < C.EXPLODE + 25) {
      const bt = t - C.EXPLODE;
      const radius = Math.min(28, 6 + bt * 3);
      for (let dy = -radius; dy <= radius; dy += 2) {
        for (let dx = -radius; dx <= radius; dx += 2) {
          const d = Math.hypot(dx, dy);
          if (d > radius || Math.random() < bt / 25) continue;
          ctx.fillStyle = d < radius * 0.4 ? '#fff8c0' : d < radius * 0.7 ? '#f8b800' : '#f83800';
          ctx.fillRect(Math.round(this.blast.x + dx), Math.round(this.blast.y + dy), 2, 2);
        }
      }
    }
    ctx.restore();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = 'bold 12px "Courier New", monospace';
    if (t < C.BREAK) {
      ctx.fillStyle = '#ffffff';
      ctx.fillText('ON THE WAY HOME TO EARTH...', WIDTH / 2, 12);
    } else if (t < C.EXPLODE) {
      if (t % 16 < 10) {
        ctx.fillStyle = '#f83800';
        ctx.fillText('THE ROCKET IS BREAKING!', WIDTH / 2, 12);
      }
    } else {
      ctx.fillStyle = '#f8d838';
      ctx.fillText('AAAAAAAH!', WIDTH / 2, 12);
    }

    if (t >= C.FADE) {
      ctx.fillStyle = `rgba(0, 0, 0, ${(t - C.FADE) / (C.END - C.FADE)})`;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
    }
  }
}

Enemy.register('crashIntro', CrashIntro);
