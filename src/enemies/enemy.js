// Basklass för fiender och andra interaktiva objekt. Nya typer ärver från Enemy och
// registreras med Enemy.register, sedan kan de placeras ut i banorna i level.js.
class Enemy {
  static types = {};

  static register(type, cls) {
    Enemy.types[type] = cls;
  }

  static create(type, x, groundY) {
    const Cls = Enemy.types[type];
    if (!Cls) throw new Error(`Okänd fiendetyp: ${type}`);
    return new Cls(x, groundY);
  }

  constructor(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.shake = 0; // skärmskakning som fienden orsakar
    this.removed = false; // sätts till true när fienden ska tas bort ur banan
    this.levelDone = false; // sätts till true när objektet avslutar banan (t.ex. raketen)
  }

  update(player, entities) {}

  draw(ctx, camX) {}

  // Fiender som kan dö sätter this.dead = false i konstruktorn. De kan dödas av bomber.
  get bombable() {
    return this.dead === false;
  }

  // Fienden dör: blod sprutar och ett spöke stiger upp ur kroppen.
  die() {
    if (this.dead) return;
    this.dead = true;
    Effects.death(this.x + this.w / 2, this.y + this.h / 2);
  }

  // Vägg framför eller ingen mark att gå på i riktningen this.facing?
  blocked() {
    const T = CONFIG.TILE;
    const ahead = this.facing > 0 ? this.x + this.w + 1 : this.x - 1;
    const col = Math.floor(ahead / T);
    const top = Math.floor(this.y / T);
    const bottom = Math.floor((this.y + this.h - 1) / T);
    for (let row = top; row <= bottom; row++) {
      if (Level.isSolid(col, row)) return true;
    }
    return !Level.isSolid(col, bottom + 1);
  }

  overlaps(player) {
    return (
      player.x < this.x + this.w &&
      player.x + player.w > this.x &&
      player.y < this.y + this.h &&
      player.y + player.h > this.y
    );
  }

  // Hoppar spelaren ner på fienden studsar spelaren och true returneras.
  // Rör spelaren fienden på annat sätt dör spelaren.
  stompCheck(player, margin) {
    if (!player.alive || player.dying || player.captured || player.launched || player.hidden) return false;
    if (!this.overlaps(player)) return false;
    const prevBottom = player.y + player.h - player.vy;
    if (player.vy > 0 && prevBottom <= this.y + margin) {
      Sound.stomp();
      player.bounce();
      return true;
    }
    player.kill();
    return false;
  }
}
