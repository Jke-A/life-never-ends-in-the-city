// Sirenhead gömmer sig under marken och skjuter plötsligt upp när spelaren kommer nära.
// Den jagar spelaren en stund och sjunker sedan tillbaka. Fångar den spelaren
// stoppas spelaren in i sirenen.
class SirenHead extends Enemy {
  static W = 32;
  static H = 80;
  static TRIGGER = 72; // avstånd i pixlar som får den att dyka upp
  static RISE_FRAMES = 18;
  static ROAR_FRAMES = 45;
  static CHASE_FRAMES = 210;
  static SINK_FRAMES = 40;
  static SPEED = 1.0;
  // Fångstsekvensen (bildrutor)
  static REACH = 14;
  static LIFT = 50;
  static STUFF = 75;
  static DEATH = 165;

  constructor(x, groundY) {
    super(x, groundY - SirenHead.H, SirenHead.W, SirenHead.H);
    this.groundY = groundY;
    this.state = 'hidden';
    this.timer = 0;
    this.rise = 0; // 0 = under marken, 1 = helt uppe
    this.facing = -1;
    this.walkDist = 0;
    this.victim = null;
    this.grabFrom = null;
    this.hand = null;
  }

  get centerX() {
    return this.x + this.w / 2;
  }

  get top() {
    return this.groundY - this.h * this.rise;
  }

  // Omvandlar x i spriten (som är ritad åt höger) till världskoordinat.
  localX(lx) {
    return this.facing > 0 ? this.x + lx : this.x + this.w - 1 - lx;
  }

  shoulder() {
    return { x: this.localX(22), y: this.top + 26 };
  }

  setState(state) {
    this.state = state;
    this.timer = 0;
  }

  update(player) {
    const S = SirenHead;
    this.timer++;
    this.shake = Math.max(0, this.shake - 0.1);
    const dx = player.x + player.w / 2 - this.centerX;

    switch (this.state) {
      case 'hidden':
        if (player.alive && !player.captured && Math.abs(dx) < S.TRIGGER) {
          this.facing = Math.sign(dx) || -1;
          this.setState('rising');
          this.shake = 3;
          this.sound = Sound.siren();
        }
        break;
      case 'rising':
        this.rise = Math.min(1, this.timer / S.RISE_FRAMES);
        if (this.rise === 1) this.setState('roar');
        break;
      case 'roar':
        this.facing = Math.sign(dx) || this.facing;
        if (this.timer >= S.ROAR_FRAMES) this.setState('chase');
        break;
      case 'chase':
        this.facing = Math.sign(dx) || this.facing;
        this.x = Math.max(0, Math.min(Level.WIDTH - this.w, this.x + this.facing * S.SPEED));
        this.walkDist += S.SPEED;
        if (this.timer >= S.CHASE_FRAMES) {
          this.setState('sinking');
          this.sound?.stop(0.7);
        }
        break;
      case 'sinking':
        this.rise = Math.max(0, 1 - this.timer / S.SINK_FRAMES);
        if (this.rise === 0) this.setState('gone');
        break;
      case 'grab':
        this.updateGrab();
        return;
    }

    if (['rising', 'roar', 'chase'].includes(this.state) && this.canGrab(player)) {
      this.startGrab(player);
    }
  }

  canGrab(player) {
    if (!player.alive || player.captured || this.rise < 0.5) return false;
    const px = player.x + player.w / 2;
    return Math.abs(px - this.centerX) < 16 && player.y + player.h > this.top + 24;
  }

  startGrab(player) {
    this.victim = player;
    player.captured = true;
    player.vx = 0;
    player.vy = 0;
    player.onGround = false;
    this.facing = Math.sign(player.x + player.w / 2 - this.centerX) || this.facing;
    this.rise = 1;
    this.grabFrom = { x: player.x + player.w / 2, y: player.y + player.h / 2 };
    this.setState('grab');
  }

  updateGrab() {
    const S = SirenHead;
    const p = this.victim;
    const t = this.timer;
    const mouthY = this.top + 10;
    const outside = { x: this.localX(35), y: mouthY };
    const inside = { x: this.localX(24), y: mouthY };
    const lerp = (a, b, k) => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k });
    const ease = (k) => k * k * (3 - 2 * k);
    const holdPlayer = () => {
      p.x = this.hand.x - p.w / 2;
      p.y = this.hand.y - p.h / 2;
    };

    if (t <= S.REACH) {
      // Armen sträcker sig mot spelaren
      this.hand = lerp(this.shoulder(), this.grabFrom, ease(t / S.REACH));
    } else if (t <= S.LIFT) {
      // Lyfter upp spelaren till sirenen
      this.hand = lerp(this.grabFrom, outside, ease((t - S.REACH) / (S.LIFT - S.REACH)));
      holdPlayer();
    } else if (t <= S.STUFF) {
      // Stoppar in spelaren i sirenen
      const k = (t - S.LIFT) / (S.STUFF - S.LIFT);
      this.hand = lerp(outside, inside, k);
      holdPlayer();
      p.scale = 1 - 0.6 * k;
    } else if (this.hand) {
      this.hand = null;
      p.visible = false;
      this.shake = 2;
      if (!this.sound?.active) this.sound = Sound.siren(3);
    } else if (t >= S.DEATH) {
      p.alive = false;
    }
  }

  draw(ctx, camX) {
    if (this.state === 'hidden' || this.state === 'gone') return;

    let frame = 'idle';
    if (this.hand) frame = 'grab';
    else if (this.state === 'chase' && Math.floor(this.walkDist / 10) % 2) frame = 'walk';
    const img = Sprites.sirenHead[frame][this.facing > 0 ? 'right' : 'left'];
    const jitter = this.state === 'roar' ? Math.round(Math.random() * 2 - 1) : 0;

    // Klipp vid marknivån så att den ser ut att komma upp ur marken
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, CONFIG.WIDTH, this.groundY);
    ctx.clip();
    ctx.drawImage(img, Math.round(this.x - camX) + jitter, Math.round(this.top));
    ctx.restore();

    if (this.hand) this.drawArm(ctx, camX);
  }

  drawArm(ctx, camX) {
    const color = '#140d0b';
    const s = this.shoulder();
    const h = this.hand;
    const elbow = { x: (s.x + h.x) / 2, y: (s.y + h.y) / 2 + 8 };
    Sprites.pixelLine(ctx, s.x - camX, s.y, elbow.x - camX, elbow.y, color);
    Sprites.pixelLine(ctx, elbow.x - camX, elbow.y, h.x - camX, h.y, color);

    // Klor runt det den håller i
    const hx = Math.round(h.x - camX);
    const hy = Math.round(h.y);
    ctx.fillStyle = color;
    ctx.fillRect(hx - 2, hy - 1, 4, 3);
    ctx.fillRect(hx - 4, hy - 3, 1, 4);
    ctx.fillRect(hx + 3, hy - 3, 1, 4);
    ctx.fillRect(hx - 1, hy + 2, 1, 3);
  }
}

Enemy.register('sirenhead', SirenHead);
