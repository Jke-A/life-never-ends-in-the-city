// Glasskiosk i slutet av "The hard level". Spelaren får en glass, men den är förgiftad:
// spelaren blir grön, svimmar och banan är klar.
class IceCream extends Enemy {
  static W = 40;
  static H = 40;
  static SERVE = 30;
  static EAT = 72;
  static SICK = 80;
  static FAINT = 30;
  static OUT = 160;

  constructor(x, groundY) {
    super(x, groundY - IceCream.H, IceCream.W, IceCream.H);
    this.state = 'waiting';
    this.timer = 0;
    this.victim = null;
    this.tinted = null;
  }

  next(state) {
    this.state = state;
    this.timer = 0;
  }

  update(player) {
    const I = IceCream;
    this.timer++;

    if (this.state === 'waiting') {
      if (player.onGround && !player.inWater && player.alive && !player.dying && !player.captured &&
        player.x + player.w > this.x - 8) {
        this.victim = player;
        player.captured = true;
        player.visible = false;
        player.vx = 0;
        player.vy = 0;
        player.facing = 1;
        player.x = this.x - 8 - player.w;
        this.next('serve');
      }
      return;
    }

    const t = this.timer;
    if (this.state === 'serve' && t >= I.SERVE) this.next('eat');
    else if (this.state === 'eat') {
      if (t % 12 === 0) Sound.nom();
      if (t >= I.EAT) {
        this.next('sick');
        Sound.sick();
      }
    } else if (this.state === 'sick' && t >= I.SICK) this.next('faint');
    else if (this.state === 'faint' && t >= I.FAINT) {
      Sound.stomp();
      this.shake = 1;
      this.next('out');
    } else if (this.state === 'out') {
      this.shake = 0;
      if (t >= I.OUT) this.levelDone = true;
    }
  }

  // Spelarens sprite helt grönfärgad, för att tona in illamåendet.
  greenSprite(img) {
    if (!this.tinted) {
      this.tinted = Sprites.createCanvas(img.width, img.height);
      const g = this.tinted.getContext('2d');
      g.drawImage(img, 0, 0);
      g.globalCompositeOperation = 'source-atop';
      g.fillStyle = 'rgba(80, 220, 40, 0.75)';
      g.fillRect(0, 0, img.width, img.height);
    }
    return this.tinted;
  }

  draw(ctx, camX) {
    const I = IceCream;
    const x = Math.round(this.x - camX);
    const y = Math.round(this.y);
    ctx.drawImage(Sprites.kiosk, x, y);
    const counter = { x: x + 17, y: y + 12 };

    if (this.state === 'waiting') {
      ctx.drawImage(Sprites.cone, counter.x, counter.y + Math.round(Math.sin(this.timer / 15)));
      return;
    }

    const p = this.victim;
    const t = this.timer;
    const px = Math.round(p.x + p.w / 2 - camX);
    const feet = Math.round(p.y + p.h);
    const hand = { x: px + 5, y: feet - 20 };
    const sprite = Sprites.player[Level.current.outfit].idle.right;

    let angle = 0;
    let green = 0;
    let wobble = 0;
    if (this.state === 'sick') {
      green = t / I.SICK;
      wobble = Math.round(Math.sin(t / 3) * green * 2);
    } else if (this.state === 'faint') {
      green = 1;
      const k = t / I.FAINT;
      angle = (-Math.PI / 2) * k * k;
    } else if (this.state === 'out') {
      green = 1;
      angle = -Math.PI / 2;
    }

    // Spelaren, som till slut faller baklänges och blir liggande
    ctx.save();
    ctx.translate(px + wobble, feet + 8 * Math.sin(angle));
    ctx.rotate(angle);
    ctx.drawImage(sprite, -8, -16);
    if (green > 0) {
      ctx.globalAlpha = green;
      ctx.drawImage(this.greenSprite(sprite), -8, -16);
    }
    ctx.restore();

    if (this.state === 'serve') {
      // Försäljaren räcker över glassen
      const k = t / I.SERVE;
      const cx = counter.x + (hand.x - counter.x) * k;
      const cy = counter.y + (hand.y - counter.y) * k - Math.sin(k * Math.PI) * 10;
      ctx.drawImage(Sprites.cone, Math.round(cx), Math.round(cy));
    } else if (this.state === 'eat') {
      // Glassen blir mindre för varje tugga
      const bitten = Math.min(5, Math.floor((t / I.EAT) * 6));
      const h = Sprites.cone.height - bitten;
      ctx.drawImage(Sprites.cone, 0, bitten, 6, h, hand.x, hand.y + bitten, 6, h);
    }

    if (this.state === 'out') {
      // Stjärnor som snurrar runt huvudet och snarkande Z
      const head = { x: px - 12, y: feet - 8 };
      ctx.fillStyle = '#f8d838';
      for (let i = 0; i < 3; i++) {
        const a = t / 8 + (i * Math.PI * 2) / 3;
        ctx.fillRect(Math.round(head.x + Math.cos(a) * 7), Math.round(head.y - 6 + Math.sin(a) * 2), 2, 2);
      }
      ctx.font = 'bold 8px "Courier New", monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      for (let i = 0; i < 3; i++) {
        const zt = (t + i * 20) % 60;
        ctx.globalAlpha = 1 - zt / 60;
        ctx.fillStyle = '#ffffff';
        ctx.fillText('Z', head.x + 4 + zt / 6, head.y - 10 - zt / 2);
      }
      ctx.globalAlpha = 1;
    }

    if (this.state !== 'serve' && this.state !== 'eat') {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.font = 'bold 12px "Courier New", monospace';
      ctx.fillStyle = '#58e020';
      ctx.fillText('THE ICE CREAM WAS POISONED!', CONFIG.WIDTH / 2, 12);
      if (this.state === 'out') {
        ctx.font = 'bold 10px "Courier New", monospace';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('YOU PASSED OUT...', CONFIG.WIDTH / 2, 28);
      }
    } else if (this.state === 'eat') {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.font = 'bold 12px "Courier New", monospace';
      ctx.fillStyle = '#f878b8';
      ctx.fillText('MMM, ICE CREAM!', CONFIG.WIDTH / 2, 12);
    }
  }
}

Enemy.register('icecream', IceCream);
