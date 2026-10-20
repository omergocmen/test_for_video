(function () {
  'use strict';

  const { LEVELS, createGame, reveal, toggleFlag, chord } = window.Mines;

  const LONG_PRESS_MS = 400;
  const MOVE_TOLERANCE = 10;
  const LEVEL_KEY = 'mayin-tarlasi:level';
  const bestKey = (level) => 'mayin-tarlasi:best:' + level;

  const el = {
    board: document.getElementById('board'),
    wrap: document.getElementById('board-wrap'),
    minesLeft: document.getElementById('mines-left'),
    time: document.getElementById('time'),
    best: document.getElementById('best'),
    status: document.getElementById('status'),
    mode: document.getElementById('mode'),
    newGame: document.getElementById('new-game'),
    levels: Array.from(document.querySelectorAll('.level')),
  };

  function load(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  function save(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* gizli mod vb. */ }
  }

  let level = LEVELS[load(LEVEL_KEY)] ? load(LEVEL_KEY) : 'kolay';
  let game;
  let cellEls = [];
  let flagMode = false;
  let cursor = 0;
  let startedAt = 0;
  let elapsed = 0;
  let timerId = 0;

  // --- Oyun akışı -----------------------------------------------------------

  function newGame() {
    const cfg = LEVELS[level];
    game = createGame(cfg.rows, cfg.cols, cfg.mines);
    stopTimer();
    elapsed = 0;
    cursor = Math.min(cursor, cfg.rows * cfg.cols - 1);

    el.levels.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.level === level)));
    el.board.style.gridTemplateColumns = 'repeat(' + cfg.cols + ', var(--cell))';
    el.board.textContent = '';
    el.board.classList.remove('kbd');
    cellEls = game.cells.map((_, i) => {
      const div = document.createElement('div');
      div.className = 'cell';
      div.dataset.i = i;
      el.board.appendChild(div);
      return div;
    });

    setStatus('İlk tıklama her zaman güvenli.', '');
    fitBoard();
    render();
  }

  function act(i, kind) {
    const before = game.state;
    const cell = game.cells[i];
    if (cell.open) chord(game, i);
    else if (kind === 'flag') toggleFlag(game, i);
    else reveal(game, i);

    if (before === 'ready' && game.state !== 'ready') startTimer();
    if (game.state === 'won' || game.state === 'lost') finish();
    render();
  }

  function finish() {
    stopTimer();
    elapsed = Date.now() - startedAt;
    if (game.state === 'lost') {
      setStatus('💥 Mayına bastın! Yeniden dene.', 'lost');
      return;
    }
    const best = Number(load(bestKey(level))) || 0;
    const record = !best || elapsed < best;
    if (record) save(bestKey(level), String(elapsed));
    setStatus('🎉 Tebrikler, kazandın! Süre: ' + seconds(elapsed) + ' sn' + (record ? ' · Yeni rekor!' : ''), 'won');
  }

  function startTimer() {
    startedAt = Date.now();
    timerId = setInterval(() => {
      elapsed = Date.now() - startedAt;
      el.time.textContent = seconds(elapsed);
    }, 250);
  }

  function stopTimer() {
    clearInterval(timerId);
    timerId = 0;
  }

  function seconds(ms) {
    return String(Math.floor(ms / 1000));
  }

  function setStatus(text, cls) {
    el.status.textContent = text;
    el.status.className = 'status' + (cls ? ' ' + cls : '');
  }

  // --- Çizim ----------------------------------------------------------------

  function render() {
    const lost = game.state === 'lost';
    game.cells.forEach((cell, i) => {
      const div = cellEls[i];
      let cls = 'cell';
      let text = '';
      if (lost && cell.flag && !cell.mine) {
        cls += ' wrong';
        text = '✕';
      } else if (cell.flag) {
        text = '🚩';
      } else if (cell.open && cell.mine) {
        cls += ' mine' + (cell.exploded ? ' exploded' : '');
        text = '💣';
      } else if (cell.open) {
        cls += ' open';
        if (cell.count) { cls += ' n n' + cell.count; text = String(cell.count); }
      }
      if (i === cursor && el.board.classList.contains('kbd')) cls += ' cursor';
      if (div.className !== cls) div.className = cls;
      if (div.textContent !== text) div.textContent = text;
    });

    el.minesLeft.textContent = String(game.mines - game.flags);
    el.time.textContent = seconds(elapsed);
    const best = Number(load(bestKey(level))) || 0;
    el.best.textContent = best ? seconds(best) + ' sn' : '–';
  }

  // Hücre boyutunu ekrana göre ayarlar. Dar ekranda Zor ızgara sığmazsa
  // hücreler dokunulabilir boyutta kalır ve ızgara yatay kaydırılır.
  function fitBoard() {
    const cols = LEVELS[level].cols;
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    const min = coarse ? 28 : 22;
    const available = el.wrap.clientWidth - 2 - (cols - 1);
    const size = Math.max(min, Math.min(36, Math.floor(available / cols)));
    el.board.style.setProperty('--cell', size + 'px');
  }

  // --- Girdi: fare ve dokunmatik -------------------------------------------

  let press = null;

  function cellIndex(target) {
    const div = target.closest && target.closest('.cell');
    return div ? Number(div.dataset.i) : -1;
  }

  function cancelPress() {
    if (press) clearTimeout(press.timer);
    press = null;
  }

  const primaryKind = () => (flagMode ? 'flag' : 'open');
  const secondaryKind = () => (flagMode ? 'open' : 'flag');

  el.board.addEventListener('pointerdown', (e) => {
    const i = cellIndex(e.target);
    el.board.classList.remove('kbd');
    if (i < 0) return;

    if (e.pointerType === 'mouse') {
      if (e.button === 1) { e.preventDefault(); act(i, 'open'); return; }
      if (e.button === 2) { act(i, 'flag'); return; }
      if (e.button !== 0) return;
    }

    // İkinci parmak (zoom) basılı işlemi iptal eder.
    if (press) { cancelPress(); return; }

    press = { id: e.pointerId, i, x: e.clientX, y: e.clientY, fired: false, timer: 0 };
    if (e.pointerType !== 'mouse') {
      press.timer = setTimeout(() => {
        if (!press) return;
        press.fired = true;
        if (navigator.vibrate) navigator.vibrate(15);
        act(press.i, secondaryKind());
      }, LONG_PRESS_MS);
    }
  });

  el.board.addEventListener('pointermove', (e) => {
    if (!press || e.pointerId !== press.id) return;
    if (Math.hypot(e.clientX - press.x, e.clientY - press.y) > MOVE_TOLERANCE) cancelPress();
  });

  el.board.addEventListener('pointerup', (e) => {
    if (!press || e.pointerId !== press.id) return;
    const p = press;
    cancelPress();
    if (p.fired) return;
    // Fare ile basılan kareden başka kareye sürüklenip bırakılırsa açma.
    if (e.pointerType === 'mouse' && cellIndex(e.target) !== p.i) return;
    act(p.i, primaryKind());
  });

  el.board.addEventListener('pointercancel', cancelPress);
  el.wrap.addEventListener('scroll', cancelPress, { passive: true });
  el.board.addEventListener('contextmenu', (e) => e.preventDefault());

  // --- Klavye ---------------------------------------------------------------

  el.board.addEventListener('keydown', (e) => {
    const { rows, cols } = game;
    let r = Math.floor(cursor / cols);
    let c = cursor % cols;
    const moves = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
    if (moves[e.key]) {
      r = Math.min(rows - 1, Math.max(0, r + moves[e.key][0]));
      c = Math.min(cols - 1, Math.max(0, c + moves[e.key][1]));
      cursor = r * cols + c;
    } else if (e.key === ' ' || e.key === 'Enter') {
      act(cursor, 'open');
    } else if (e.key === 'f' || e.key === 'F') {
      act(cursor, 'flag');
    } else {
      return;
    }
    e.preventDefault();
    el.board.classList.add('kbd');
    render();
    cellEls[cursor].scrollIntoView({ block: 'nearest', inline: 'nearest' });
  });

  document.addEventListener('keydown', (e) => {
    if ((e.key === 'r' || e.key === 'R') && !e.ctrlKey && !e.metaKey && !e.altKey) newGame();
  });

  // --- Düğmeler -------------------------------------------------------------

  el.newGame.addEventListener('click', newGame);

  el.mode.addEventListener('click', () => {
    flagMode = !flagMode;
    el.mode.setAttribute('aria-pressed', String(flagMode));
    el.mode.textContent = flagMode ? '🚩 Bayrak' : '⛏️ Aç';
  });

  el.levels.forEach((b) => b.addEventListener('click', () => {
    level = b.dataset.level;
    save(LEVEL_KEY, level);
    newGame();
  }));

  window.addEventListener('resize', fitBoard);

  newGame();
})();
