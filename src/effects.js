// Effekter: blod och spöken när fiender dör, explosioner och plask när spelaren hoppar i vattnet.
const Effects = (() => {
  const T = CONFIG.TILE;
  const BLAST_FRAMES = 24;
  let blood = [];
  let ghosts = [];
  let blasts = [];

  // scale gör blodet och spöket större (för stora fiender).
  function death(x, y, scale = 1) {
    spray(x, y, 40 * scale, ['#d01020', '#d01020', '#7a0010'], 2.5, 240, true);
    ghosts.push({ x, y, t: 0, scale });
    Sound.splat();
    Sound.ghost();
  }

  function blast(x, y, radius = 20) {
    blasts.push({ x, y, t: 0, radius });
  }

  // Ritar en explosion i skärmkoordinater. t = bildrutor sedan den började.
  function drawBlast(ctx, x, y, t, maxR, frames = BLAST_FRAMES) {
    const r = Math.min(maxR, 4 + (t * maxR) / 8);
    const fade = Math.max(0, (t - frames * 0.6) / (frames * 0.4));
    for (let dy = -r; dy <= r; dy += 2) {
      for (let dx = -r; dx <= r; dx += 2) {
        const d = Math.hypot(dx, dy);
        if (d > r || Math.random() < fade) continue;
        ctx.fillStyle = d < r * 0.4 ? '#fff8c0' : d < r * 0.7 ? '#f8b800' : '#f83800';
        ctx.fillRect(Math.round(x + dx), Math.round(y + dy), 2, 2);
      }
    }
  }

  // Stank av kloakvatten när spelaren hoppar i eller upp ur vattnet.
  function splash(x, y) {
    spray(x, y, 16, ['#7a9a50', '#a8c878', '#d0e8a8'], 2, 30, false);
  }

  // Partiklar som sprutar uppåt. stick = stannar kvar en stund där de landar.
  function spray(x, y, count, colors, maxSpeed, life, stick) {
    for (let i = 0; i < count; i++) {
      const angle = -Math.PI / 2 + (Math.random() * 2 - 1) * 1.3;
      const speed = 1 + Math.random() * maxSpeed;
      blood.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() < 0.3 ? 2 : 1,
        stick,
        stuck: false,
        life: life + Math.floor(Math.random() * life * 0.5),
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
  }

  function update() {
    for (const p of blood) {
      p.life--;
      if (p.stuck) continue;
      p.vy = Math.min(p.vy + 0.15, 4);
      p.x += p.vx;
      p.y += p.vy;
      const row = Math.floor(p.y / T);
      if (p.stick && p.vy > 0 && Level.isSolid(Math.floor(p.x / T), row)) {
        p.stuck = true; // blodet stannar kvar på marken en stund
        p.y = row * T - 1;
      }
      if (p.y > CONFIG.HEIGHT) p.life = 0;
    }
    blood = blood.filter((p) => p.life > 0);

    for (const g of ghosts) {
      g.t++;
      g.y -= 0.7;
    }
    ghosts = ghosts.filter((g) => g.y > -20 * g.scale);

    for (const b of blasts) b.t++;
    blasts = blasts.filter((b) => b.t < BLAST_FRAMES);
  }

  function draw(ctx, camX) {
    for (const b of blasts) drawBlast(ctx, b.x - camX, b.y, b.t, b.radius);
    for (const p of blood) {
      ctx.globalAlpha = Math.min(1, p.life / 60);
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x - camX), Math.round(p.y), p.size, p.size);
    }
    const img = Sprites.ghost;
    for (const g of ghosts) {
      ctx.globalAlpha = 0.8 * Math.min(1, g.t / 20);
      const w = img.width * g.scale;
      const h = img.height * g.scale;
      const x = g.x + Math.sin(g.t / 10) * 4 * g.scale - w / 2;
      ctx.drawImage(img, Math.round(x - camX), Math.round(g.y - h / 2), w, h);
    }
    ctx.globalAlpha = 1;
  }

  function clear() {
    blood = [];
    ghosts = [];
    blasts = [];
  }

  return { death, splash, blast, drawBlast, update, draw, clear };
})();
