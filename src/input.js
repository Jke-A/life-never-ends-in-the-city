const Input = (() => {
  const LEFT = ['ArrowLeft', 'KeyA'];
  const RIGHT = ['ArrowRight', 'KeyD'];
  const JUMP = ['Space', 'ArrowUp', 'KeyW'];
  const UP = ['ArrowUp', 'KeyW'];
  const DOWN = ['ArrowDown', 'KeyS'];
  const FIRE = ['Space', 'KeyX'];
  const GAME_KEYS = [...LEFT, ...RIGHT, ...JUMP, 'ArrowDown'];

  const down = new Set();
  const pressed = new Set(); // nedtryckta sedan förra uppdateringen
  let typed = ''; // senast skrivna bokstäver, för fuskkoder

  window.addEventListener('keydown', (e) => {
    if (GAME_KEYS.includes(e.code)) e.preventDefault();
    if (!e.repeat) pressed.add(e.code);
    if (!e.repeat && e.key.length === 1) typed = (typed + e.key.toLowerCase()).slice(-20);
    down.add(e.code);
  });
  window.addEventListener('keyup', (e) => down.delete(e.code));
  window.addEventListener('blur', () => down.clear());

  const any = (set, codes) => codes.some((c) => set.has(c));

  return {
    left: () => any(down, LEFT),
    right: () => any(down, RIGHT),
    jump: () => any(down, JUMP),
    // Helikoptern
    up: () => any(down, UP),
    down: () => any(down, DOWN),
    fire: () => any(down, FIRE),
    jumpPressed: () => any(pressed, JUMP),
    pressed: (...codes) => any(pressed, codes),
    // Sant en gång när ordet just har skrivits
    cheat(word) {
      if (!typed.endsWith(word)) return false;
      typed = '';
      return true;
    },
    endFrame: () => pressed.clear(),
  };
})();
