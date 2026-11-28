const Input = (() => {
  const LEFT = ['ArrowLeft', 'KeyA'];
  const RIGHT = ['ArrowRight', 'KeyD'];
  const JUMP = ['Space', 'ArrowUp', 'KeyW'];
  const UP = ['ArrowUp', 'KeyW'];
  const DOWN = ['ArrowDown', 'KeyS'];
  const FIRE = ['Space', 'KeyX'];
  const GAME_KEYS = [...LEFT, ...RIGHT, ...JUMP, 'ArrowDown'];

  const down = new Set();
  const touchDown = new Set();
  let gamepadDown = new Set();
  const pressed = new Set(); // nedtryckta sedan förra uppdateringen
  let typed = ''; // senast skrivna bokstäver, för fuskkoder
  const touchPointers = new Map();

  const touchControls = {
    left: LEFT,
    right: RIGHT,
    up: UP,
    down: DOWN,
    jump: ['Space'],
    fire: ['KeyX'],
  };

  window.addEventListener('keydown', (e) => {
    if (GAME_KEYS.includes(e.code)) e.preventDefault();
    if (!e.repeat) pressed.add(e.code);
    if (!e.repeat && e.key.length === 1) typed = (typed + e.key.toLowerCase()).slice(-20);
    down.add(e.code);
  });
  window.addEventListener('keyup', (e) => down.delete(e.code));
  window.addEventListener('blur', () => {
    down.clear();
    touchDown.clear();
    touchPointers.clear();
  });

  document.querySelectorAll('[data-control]').forEach((button) => {
    const codes = touchControls[button.dataset.control];
    if (!codes) return;

    button.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      const pointers = touchPointers.get(button.dataset.control) || new Set();
      if (pointers.size === 0) {
        codes.forEach((code) => {
          touchDown.add(code);
          pressed.add(code);
        });
      }
      pointers.add(e.pointerId);
      touchPointers.set(button.dataset.control, pointers);
      button.setPointerCapture(e.pointerId);
    });

    const release = (e) => {
      const pointers = touchPointers.get(button.dataset.control);
      if (!pointers?.delete(e.pointerId) || pointers.size > 0) return;
      touchPointers.delete(button.dataset.control);
      codes.forEach((code) => touchDown.delete(code));
    };
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('lostpointercapture', release);
  });

  const any = (codes) => codes.some((c) =>
    down.has(c) || touchDown.has(c) || gamepadDown.has(c));

  function updateGamepad() {
    const next = new Set();
    for (const pad of navigator.getGamepads?.() || []) {
      if (!pad?.connected) continue;
      const x = pad.axes[0] || 0;
      const y = pad.axes[1] || 0;
      if (x < -0.35 || pad.buttons[14]?.pressed) next.add('ArrowLeft');
      if (x > 0.35 || pad.buttons[15]?.pressed) next.add('ArrowRight');
      if (y < -0.35 || pad.buttons[12]?.pressed) next.add('ArrowUp');
      if (y > 0.35 || pad.buttons[13]?.pressed) next.add('ArrowDown');
      if (pad.buttons[0]?.pressed) next.add('Space');
      if (pad.buttons[2]?.pressed) next.add('KeyX');
    }

    next.forEach((code) => {
      if (!gamepadDown.has(code)) pressed.add(code);
    });
    gamepadDown = next;
  }

  return {
    update: updateGamepad,
    left: () => any(LEFT),
    right: () => any(RIGHT),
    jump: () => any(JUMP),
    // Helikoptern
    up: () => any(UP),
    down: () => any(DOWN),
    fire: () => any(FIRE),
    jumpPressed: () => JUMP.some((code) => pressed.has(code)),
    pressed: (...codes) => codes.some((code) => pressed.has(code)),
    // Sant en gång när ordet just har skrivits
    cheat(word) {
      if (!typed.endsWith(word)) return false;
      typed = '';
      return true;
    },
    endFrame: () => pressed.clear(),
  };
})();
