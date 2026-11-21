// Inledningen på sista banan: spelaren vaknar på sjukhuset efter giftglassen. Fönstret spricker
// och en jättehand slår sönder det: det är Godzilla! En dynamit faller från luften och spränger
// honom, men då blir Godzilla bara ännu mäktigare. Visas bara första gången man spelar banan.
class HospitalIntro extends Enemy {
  static WAKE = 40;
  static SIT = 140;
  static CRACK = 200;
  static SHATTER = 260;
  static RETREAT = 330;
  static OUTSIDE = 380;
  static DROP = 480;
  static BOOM = 530;
  static POWER = 600;
  static READY = 690;
  static FADE = 770;
  static END = 800;
  static FADE_IN = 30;

  static WINDOW = { x: 100, y: 36, w: 80, h: 76 };
  static CRACK_AT = { x: 146, y: 66 };
  static DYNAMITE_X = 166;
  static DYNAMITE_Y = 95;

  constructor() {
    super(0, 0, 0, 0);
    this.timer = 0;
    this.finished = false; // sätts när scenen visats, så att den inte visas igen vid nytt försök
    this.shards = [];
    this.smoke = [];
    this.skyStars = Array.from({ length: 14 }, () => ({ x: Math.random(), y: Math.random() * 0.6 }));
    // Sprickor som växer ut från stället där handen slår
    this.cracks = Array.from({ length: 8 }, (_, i) => {
      const a = (i / 8) * Math.PI * 2 + Math.random() * 0.5;
      const kink = a + (Math.random() - 0.5) * 0.8;
      const l1 = 8 + Math.random() * 10;
      const l2 = 8 + Math.random() * 16;
      const mid = { x: Math.cos(a) * l1, y: Math.sin(a) * l1 };
      return [mid, { x: mid.x + Math.cos(kink) * l2, y: mid.y + Math.sin(kink) * l2 }];
    });
  }

  // Anropas när banan startar, innan spelaren hunnit röra sig
  start(player) {
    player.captured = true;
    player.visible = false;
  }

  update(player) {
    const H = HospitalIntro;
    const t = ++this.timer;

    this.shake = 0;
    if (t < H.OUTSIDE - 20) {
      // Hjärtmonitorn piper, fortare när man blir rädd
      const rate = t >= H.CRACK ? 20 : 50;
      if (t % rate === 0) Sound.beep();
    }
    if (t >= H.CRACK && t < H.SHATTER && (t - H.CRACK) % 15 === 0) {
      Sound.crack();
      this.shake = 1;
    }
    if (t === H.SHATTER) {
      Sound.glass();
      Sound.thud();
      const W = H.WINDOW;
      for (let i = 0; i < 30; i++) {
        this.shards.push({
          x: W.x + Math.random() * W.w,
          y: W.y + Math.random() * W.h,
          vx: (Math.random() - 0.6) * 3,
          vy: -1 - Math.random() * 2,
          size: 1 + Math.floor(Math.random() * 3),
        });
      }
    }
    if (t >= H.SHATTER && t < H.SHATTER + 20) this.shake = 2;
    if (t === H.RETREAT + 20) Sound.roar();
    if (t === H.OUTSIDE + 20) Sound.roar();
    if (t > H.OUTSIDE && t < H.DROP && t % 40 === 0) Sound.thud();
    if (t >= H.DROP && t < H.BOOM && t % 6 === 0) Sound.fuse();
    if (t === H.DROP) Sound.whistle();
    if (t === H.BOOM) {
      Sound.boom();
      Sound.boom();
      for (let i = 0; i < 16; i++) {
        this.smoke.push({
          x: H.DYNAMITE_X + (Math.random() - 0.5) * 50,
          y: H.DYNAMITE_Y + (Math.random() - 0.5) * 40,
          r: 4 + Math.random() * 6,
          life: 60 + Math.random() * 40,
        });
      }
    }
    if (t >= H.BOOM && t < H.BOOM + 30) this.shake = 4;
    if (t === H.POWER) {
      Sound.roar();
      Sound.teleport();
    }
    if (t >= H.POWER && t < H.POWER + 40) this.shake = 2;

    for (const s of this.shards) {
      if (s.y >= 200) continue;
      s.x += s.vx;
      s.y += s.vy;
      s.vy += 0.2;
    }
    for (const s of this.smoke) {
      s.y -= 0.3;
      s.r += 0.15;
      s.life--;
    }
    this.smoke = this.smoke.filter((s) => s.life > 0);

    if (t === H.END) {
      player.captured = false;
      player.visible = true;
      player.facing = 1;
      this.finished = true;
    }
    if (t >= H.END + H.FADE_IN) this.removed = true;
  }

  // Ritas ovanpå allt annat, i skärmkoordinater.
  drawOverlay(ctx) {
    const H = HospitalIntro;
    const { WIDTH, HEIGHT } = CONFIG;
    const t = this.timer;

    if (t >= H.END) {
      ctx.fillStyle = `rgba(0, 0, 0, ${1 - (t - H.END) / H.FADE_IN})`;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      return;
    }

    ctx.save();
    if (this.shake) {
      ctx.translate(Math.round((Math.random() * 2 - 1) * this.shake), Math.round((Math.random() * 2 - 1) * this.shake));
    }
    if (t < H.OUTSIDE) this.drawRoom(ctx, t);
    else this.drawOutside(ctx, t);
    ctx.restore();

    this.drawCaption(ctx, t);

    // Toningar: in i början, ut/in vid bytet till utomhus, ut i slutet
    let black = 0;
    if (t < 30) black = 1 - t / 30;
    else if (t >= H.OUTSIDE - 20 && t < H.OUTSIDE) black = (t - (H.OUTSIDE - 20)) / 20;
    else if (t >= H.OUTSIDE && t < H.OUTSIDE + 15) black = 1 - (t - H.OUTSIDE) / 15;
    else if (t >= H.FADE) black = (t - H.FADE) / (H.END - H.FADE);
    if (black > 0) {
      ctx.fillStyle = `rgba(0, 0, 0, ${black})`;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
    }
  }

  drawRoom(ctx, t) {
    const H = HospitalIntro;
    const { WIDTH, HEIGHT } = CONFIG;
    const W = H.WINDOW;

    // Väggar och golv
    ctx.fillStyle = '#7ab08a';
    ctx.fillRect(-4, -4, WIDTH + 8, 184);
    ctx.fillStyle = '#5a8a6a';
    ctx.fillRect(-4, 150, WIDTH + 8, 6);
    ctx.fillStyle = '#9a8a7a';
    ctx.fillRect(-4, 176, WIDTH + 8, HEIGHT - 172);
    ctx.fillStyle = '#867664';
    for (let x = 0; x < WIDTH; x += 24) ctx.fillRect(x, 176, 1, HEIGHT - 176);
    ctx.fillRect(-4, 200, WIDTH + 8, 1);

    // Fönstret med natthimmel och eldsken från staden
    ctx.fillStyle = '#101830';
    ctx.fillRect(W.x, W.y, W.w, W.h);
    ctx.fillStyle = '#3a1c20';
    ctx.fillRect(W.x, W.y + W.h - 20, W.w, 20);
    ctx.fillStyle = '#7a2c18';
    ctx.fillRect(W.x, W.y + W.h - 8, W.w, 8);
    ctx.fillStyle = '#ffffff';
    for (const s of this.skyStars) ctx.fillRect(Math.round(W.x + s.x * W.w), Math.round(W.y + s.y * W.h), 1, 1);

    if (t >= H.RETREAT + 15) {
      // Ett jätteöga tittar in genom fönstret
      ctx.fillStyle = '#3c5236';
      ctx.fillRect(W.x, W.y, W.w, W.h);
      const cx = W.x + W.w / 2;
      const cy = W.y + W.h / 2;
      const blink = (t - H.RETREAT) % 60 > 54;
      ctx.fillStyle = '#28381f';
      ctx.fillRect(cx - 24, cy - 14, 48, 4);
      if (!blink) {
        ctx.fillStyle = '#f8d838';
        for (let dy = -8; dy <= 8; dy++) {
          const half = Math.round(18 * Math.sqrt(1 - (dy / 9) ** 2));
          ctx.fillRect(cx - half, cy + dy, half * 2, 1);
        }
        ctx.fillStyle = '#000000';
        ctx.fillRect(cx - 2, cy - 8, 4, 17);
      } else {
        ctx.fillStyle = '#0e140c';
        ctx.fillRect(cx - 18, cy, 36, 2);
      }
    }

    if (t < H.SHATTER) {
      // Hel ruta med spröjs och sprickor
      ctx.fillStyle = 'rgba(160, 200, 255, 0.15)';
      ctx.fillRect(W.x, W.y, W.w, W.h);
      ctx.fillStyle = '#e8e8e0';
      ctx.fillRect(W.x + W.w / 2 - 1, W.y, 2, W.h);
      ctx.fillRect(W.x, W.y + W.h / 2 - 1, W.w, 2);
      if (t >= H.CRACK) {
        const shown = Math.min(this.cracks.length, 2 + Math.floor((t - H.CRACK) / 15) * 2);
        ctx.fillStyle = '#ffffff';
        for (const [a, b] of this.cracks.slice(0, shown)) {
          this.line(ctx, H.CRACK_AT.x, H.CRACK_AT.y, H.CRACK_AT.x + a.x, H.CRACK_AT.y + a.y);
          this.line(ctx, H.CRACK_AT.x + a.x, H.CRACK_AT.y + a.y, H.CRACK_AT.x + b.x, H.CRACK_AT.y + b.y);
        }
      }
    } else {
      // Glasskärvor som sitter kvar i karmen
      ctx.fillStyle = '#c0e0ff';
      for (let i = 0; i < 6; i++) {
        const x = W.x + 6 + i * 13;
        ctx.beginPath();
        ctx.moveTo(x, W.y);
        ctx.lineTo(x + 8, W.y);
        ctx.lineTo(x + 3, W.y + 6 + (i % 3) * 4);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x, W.y + W.h);
        ctx.lineTo(x + 8, W.y + W.h);
        ctx.lineTo(x + 5, W.y + W.h - 5 - (i % 2) * 5);
        ctx.fill();
      }
    }

    // Fönsterkarm
    ctx.fillStyle = '#e8e8e0';
    ctx.fillRect(W.x - 4, W.y - 4, W.w + 8, 4);
    ctx.fillRect(W.x - 4, W.y + W.h, W.w + 8, 6);
    ctx.fillRect(W.x - 4, W.y, 4, W.h);
    ctx.fillRect(W.x + W.w, W.y, 4, W.h);

    // Hjärtmonitor
    ctx.fillStyle = '#5a5a64';
    ctx.fillRect(214, 110, 4, 66);
    ctx.fillRect(204, 174, 24, 3);
    ctx.fillStyle = '#c8c8d0';
    ctx.fillRect(196, 72, 44, 38);
    ctx.fillStyle = '#081808';
    ctx.fillRect(199, 75, 38, 28);
    ctx.fillStyle = '#58e020';
    const rate = t >= H.CRACK ? 20 : 50;
    for (let x = 0; x < 38; x++) {
      const phase = (x - t * 0.8) % rate;
      const p = (phase + rate) % rate;
      const y = p < 2 ? -8 : p < 4 ? 6 : 0;
      ctx.fillRect(199 + x, 89 + y, 1, 1);
    }
    ctx.fillStyle = t % rate < 6 ? '#f83800' : '#5a1a10';
    ctx.fillRect(232, 105, 3, 3);

    // Sjukhussäng
    ctx.fillStyle = '#9ca4b8';
    ctx.fillRect(14, 132, 4, 44);
    ctx.fillRect(98, 140, 4, 36);
    ctx.fillRect(14, 160, 88, 4);
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(18, 146, 82, 14);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(20, 138, 20, 8);

    // Spelaren: ligger först, sätter sig upp och hoppar till av skräck
    const sprite = Sprites.player[Level.current.outfit].idle.right;
    if (t < H.SIT) {
      ctx.save();
      ctx.translate(36, 146);
      ctx.rotate(-Math.PI / 2);
      ctx.drawImage(sprite, -8, -16);
      ctx.restore();
    } else {
      const jump = t >= H.SHATTER && t < H.SHATTER + 12 ? -Math.round(Math.sin(((t - H.SHATTER) / 12) * Math.PI) * 10) : 0;
      ctx.drawImage(sprite, 24, 128 + jump);
    }
    ctx.fillStyle = '#88aadd'; // filten
    ctx.fillRect(t < H.SIT ? 46 : 36, 144, t < H.SIT ? 54 : 64, 10);
    ctx.fillStyle = '#6a8abd';
    ctx.fillRect(t < H.SIT ? 46 : 36, 152, t < H.SIT ? 54 : 64, 2);

    if (t >= H.CRACK && t < H.RETREAT + 40) {
      ctx.fillStyle = '#f8d838';
      ctx.font = 'bold 12px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(t >= H.SHATTER ? '!!' : '?', 32, 124);
    }

    // Handen kommer in genom fönstret och drar sig sedan tillbaka
    if (t >= H.SHATTER && t < H.RETREAT + 15) {
      let s;
      if (t < H.RETREAT) s = 0.3 + 0.7 * Math.min(1, (t - H.SHATTER) / 20);
      else s = 1 - 0.8 * ((t - H.RETREAT) / 15);
      const hand = Sprites.godzillaHand;
      const cx = W.x + W.w / 2;
      const cy = W.y + W.h / 2 + (t < H.RETREAT ? Math.sin(t / 4) * 2 : 0);
      ctx.drawImage(hand, Math.round(cx - (hand.width * s) / 2), Math.round(cy - (hand.height * s) / 2), hand.width * s, hand.height * s);
    }

    ctx.fillStyle = '#c0e0ff';
    for (const s of this.shards) ctx.fillRect(Math.round(s.x), Math.round(s.y), s.size, s.size);
  }

  drawOutside(ctx, t) {
    const H = HospitalIntro;
    const { WIDTH } = CONFIG;
    const T = CONFIG.TILE;
    const groundY = Level.GROUND_Y;

    Background.draw(ctx, 0, 'ruins');
    const tiles = Sprites.tiles.ruins;
    for (let x = 0; x < WIDTH; x += T) {
      ctx.drawImage(tiles.top, x, groundY);
      ctx.drawImage(tiles.ground, x, groundY + T);
    }

    // Sjukhuset med rött kors och det krossade fönstret
    ctx.fillStyle = '#b8b8b0';
    ctx.fillRect(8, 88, 88, groundY - 88);
    ctx.fillStyle = '#d8d8d0';
    ctx.fillRect(8, 88, 88, 3);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(40, 64, 24, 24);
    ctx.fillStyle = '#d82818';
    ctx.fillRect(49, 67, 6, 18);
    ctx.fillRect(43, 73, 18, 6);
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        const x = 16 + col * 20;
        const y = 98 + row * 24;
        ctx.fillStyle = row === 1 && col === 3 ? '#101018' : row === 3 && (col === 1 || col === 2) ? '#5a4a3a' : '#f8d878';
        ctx.fillRect(x, y, 12, 14);
      }
    }
    // Spelaren tittar ut genom det trasiga fönstret
    ctx.drawImage(Sprites.player[Level.current.outfit].idle.right, 74, 106, 8, 8);
    ctx.fillStyle = '#c0e0ff';
    ctx.fillRect(76, 122, 2, 2);
    ctx.fillRect(80, 121, 1, 3);

    // Godzilla: vanlig före sprängningen, mäktigare efteråt
    const powered = t >= H.POWER;
    const set = Sprites.godzilla[powered ? 'power' : 'normal'];
    const roaring = (t >= H.OUTSIDE + 20 && t < H.OUTSIDE + 80) || (t >= H.POWER && t < H.POWER + 70);
    const walking = !roaring && t < H.DROP && Math.floor(t / 20) % 2;
    const frame = set[roaring ? 'roar' : walking ? 'walk' : 'idle'];
    const gx = 136;
    const gy = 80;
    if (powered) {
      ctx.globalAlpha = 0.35 + Math.random() * 0.25;
      for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2]]) ctx.drawImage(frame.glow.left, gx + dx, gy + dy);
      ctx.globalAlpha = 1;
    }
    ctx.drawImage(frame.left, gx, gy);

    // Dynamiten faller och snurrar
    if (t >= H.DROP && t < H.BOOM) {
      const k = (t - H.DROP) / (H.BOOM - H.DROP);
      const y = -20 + (H.DYNAMITE_Y + 20) * k * k;
      ctx.save();
      ctx.translate(H.DYNAMITE_X, y);
      ctx.rotate(t / 5);
      ctx.drawImage(Sprites.dynamite, -3, -6);
      ctx.restore();
      ctx.fillStyle = t % 4 < 2 ? '#f8d838' : '#f83800';
      ctx.fillRect(H.DYNAMITE_X - 1 + Math.round(Math.cos(t / 5 - Math.PI / 2) * 6), Math.round(y + Math.sin(t / 5 - Math.PI / 2) * 6) - 1, 2, 2);
    }

    // Explosionen och röken
    if (t >= H.BOOM && t < H.BOOM + 40) Effects.drawBlast(ctx, H.DYNAMITE_X, H.DYNAMITE_Y, t - H.BOOM, 44, 40);
    for (const s of this.smoke) {
      ctx.fillStyle = `rgba(70, 60, 70, ${Math.min(0.8, s.life / 60)})`;
      const r = Math.round(s.r);
      ctx.fillRect(Math.round(s.x - r), Math.round(s.y - r), r * 2, r * 2);
    }

    // Helikoptern flyger in, redo för strid
    if (t >= H.READY) {
      const k = Math.min(1, (t - H.READY) / 60);
      const x = -40 + 100 * (1 - (1 - k) ** 2);
      ctx.drawImage(Sprites.helicopter[Math.floor(t / 3) % 2].right, Math.round(x), 150 + Math.round(Math.sin(t / 10) * 2));
    }

    // Blixtar: vit vid smällen, lila när Godzilla blir mäktigare
    if (t >= H.BOOM && t < H.BOOM + 12) {
      ctx.fillStyle = `rgba(255, 255, 255, ${1 - (t - H.BOOM) / 12})`;
      ctx.fillRect(-4, -4, WIDTH + 8, CONFIG.HEIGHT + 8);
    }
    if (t >= H.POWER && t < H.POWER + 30 && t % 6 < 4) {
      ctx.fillStyle = `rgba(176, 112, 255, ${0.6 * (1 - (t - H.POWER) / 30)})`;
      ctx.fillRect(-4, -4, WIDTH + 8, CONFIG.HEIGHT + 8);
    }
  }

  drawCaption(ctx, t) {
    const H = HospitalIntro;
    const { WIDTH, HEIGHT } = CONFIG;
    const captions = [
      [0, 'YOU WAKE UP IN THE HOSPITAL...'],
      [90, 'WHAT HAPPENED? THAT ICE\nCREAM TASTED WEIRD...'],
      [H.CRACK, 'WHAT WAS THAT?!'],
      [H.SHATTER, 'A GIANT HAND!!!'],
      [H.RETREAT, "IT'S GODZILLA!!"],
      [H.DROP, 'WHAT IS FALLING...?\nDYNAMITE!'],
      [H.BOOM, 'BOOOOOM!'],
      [H.POWER + 10, 'NO! GODZILLA GOT\nEVEN STRONGER!'],
      [H.READY, 'GET IN THE HELICOPTER\nAND STOP HIM!'],
    ];
    let text = null;
    for (const [from, caption] of captions) if (t >= from) text = caption;
    if (!text || (t >= H.OUTSIDE - 20 && t < H.OUTSIDE + 15)) return;

    const lines = text.split('\n');
    const boxH = 10 + lines.length * 12;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(8, HEIGHT - boxH - 6, WIDTH - 16, boxH);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(8.5, HEIGHT - boxH - 5.5, WIDTH - 17, boxH - 1);
    ctx.font = 'bold 10px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#ffffff';
    lines.forEach((line, i) => ctx.fillText(line, WIDTH / 2, HEIGHT - boxH + i * 12));
  }

  // Pixellinje (för sprickorna i fönstret)
  line(ctx, x0, y0, x1, y1) {
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let i = 0; i <= steps; i++) {
      const k = steps ? i / steps : 0;
      ctx.fillRect(Math.round(x0 + (x1 - x0) * k), Math.round(y0 + (y1 - y0) * k), 1, 1);
    }
  }
}

Enemy.register('hospitalIntro', HospitalIntro);
