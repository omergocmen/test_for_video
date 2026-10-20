// 2048 arayüzü: girişleri dinler, mantık katmanını çağırır, karoları DOM'da çizer.
(function () {
  'use strict';

  var L = window.Game2048;
  var BEST_KEY = 'oyunlar.2048.best';
  var MOVE_MS = 110;

  var tilesEl = document.getElementById('tiles');
  var boardEl = document.getElementById('board');
  var scoreEl = document.getElementById('score');
  var bestEl = document.getElementById('best');
  var overlayEl = document.getElementById('overlay');
  var overlayTitleEl = document.getElementById('overlay-title');
  var keepGoingBtn = document.getElementById('keep-going');

  var nextId = L.idCounter();
  var state = { grid: null, score: 0, best: loadBest(), won: false, keepPlaying: false, over: false };
  var tileEls = {};   // karo id -> DOM öğesi
  var leaving = [];   // birleşip kaybolacak öğeler

  function loadBest() {
    try {
      return parseInt(window.localStorage.getItem(BEST_KEY), 10) || 0;
    } catch (e) {
      return 0;
    }
  }

  function saveBest(value) {
    try {
      window.localStorage.setItem(BEST_KEY, String(value));
    } catch (e) {
      // Gizli mod vb. durumlarda en iyi skor yalnızca bu oturumda tutulur.
    }
  }

  function setPosition(el, r, c) {
    el.style.setProperty('--x', c);
    el.style.setProperty('--y', r);
  }

  function createTileEl(tile, r, c, extraClass) {
    var el = document.createElement('div');
    var digits = String(tile.value).length;
    el.className = 'tile ' + (tile.value > L.WIN_VALUE ? 'vsuper' : 'v' + tile.value) +
      (digits >= 3 ? ' digits-' + Math.min(digits, 5) : '') + (extraClass ? ' ' + extraClass : '');
    var inner = document.createElement('div');
    inner.className = 'tile-inner';
    inner.textContent = tile.value;
    el.appendChild(inner);
    setPosition(el, r, c);
    tilesEl.appendChild(el);
    return el;
  }

  function render() {
    leaving.forEach(function (el) { el.remove(); });
    leaving = [];

    var seen = {};
    var fresh = {};
    var grid = state.grid;
    for (var r = 0; r < L.SIZE; r++) {
      for (var c = 0; c < L.SIZE; c++) {
        var tile = grid[r][c];
        if (!tile) continue;
        seen[tile.id] = true;
        if (tileEls[tile.id]) {
          setPosition(tileEls[tile.id], r, c);
        } else if (tile.mergedFrom) {
          // Kaynak karolar hedefe kayar, ardından birleşik karo belirir.
          tile.mergedFrom.forEach(function (srcId) {
            var src = tileEls[srcId];
            if (!src) return;
            setPosition(src, r, c);
            leaving.push(src);
            delete tileEls[srcId];
          });
          fresh[tile.id] = createTileEl(tile, r, c, 'merged');
        } else {
          fresh[tile.id] = createTileEl(tile, r, c, tile.isNew ? 'new' : '');
        }
      }
    }

    Object.keys(tileEls).forEach(function (id) {
      if (!seen[id]) {
        tileEls[id].remove();
        delete tileEls[id];
      }
    });
    Object.keys(fresh).forEach(function (id) { tileEls[id] = fresh[id]; });

    if (leaving.length) {
      var batch = leaving;
      setTimeout(function () {
        batch.forEach(function (el) { el.remove(); });
      }, MOVE_MS);
    }

    scoreEl.textContent = state.score;
    bestEl.textContent = state.best;
    renderOverlay();
  }

  function renderOverlay() {
    if (state.over) {
      showOverlay('Oyun bitti!', false);
    } else if (state.won && !state.keepPlaying) {
      showOverlay('Kazandın!', true);
    } else {
      overlayEl.hidden = true;
    }
  }

  function showOverlay(title, win) {
    overlayTitleEl.textContent = title;
    overlayEl.classList.toggle('win', win);
    keepGoingBtn.hidden = !win;
    overlayEl.hidden = false;
  }

  function startGame() {
    state.grid = L.newGame(Math.random, nextId);
    state.score = 0;
    state.won = false;
    state.keepPlaying = false;
    state.over = false;
    render();
  }

  function handleMove(dir) {
    if (state.over || (state.won && !state.keepPlaying)) return;
    var result = L.move(state.grid, dir, nextId);
    if (!result.moved) return;

    state.grid = L.addRandomTile(result.grid, Math.random, nextId);
    state.score += result.score;
    if (state.score > state.best) {
      state.best = state.score;
      saveBest(state.best);
    }
    if (result.won && !state.keepPlaying) state.won = true;
    if (!L.canMove(state.grid)) state.over = true;
    render();
  }

  var KEYS = {
    ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
    a: 'left', d: 'right', w: 'up', s: 'down',
    A: 'left', D: 'right', W: 'up', S: 'down'
  };

  document.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'r' || e.key === 'R') {
      startGame();
      return;
    }
    var dir = KEYS[e.key];
    if (!dir) return;
    e.preventDefault();
    handleMove(dir);
  });

  // Dokunmatik / fare ile kaydırma.
  var SWIPE_MIN = 24;
  var start = null;

  boardEl.addEventListener('pointerdown', function (e) {
    if (e.target.closest('button')) return;
    start = { x: e.clientX, y: e.clientY, id: e.pointerId };
  });

  boardEl.addEventListener('pointerup', function (e) {
    if (!start || start.id !== e.pointerId) return;
    var dx = e.clientX - start.x;
    var dy = e.clientY - start.y;
    start = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_MIN) return;
    if (Math.abs(dx) > Math.abs(dy)) handleMove(dx > 0 ? 'right' : 'left');
    else handleMove(dy > 0 ? 'down' : 'up');
  });

  boardEl.addEventListener('pointercancel', function () { start = null; });

  // iOS Safari'de ızgara üzerinde sayfanın kaymasını engelle.
  boardEl.addEventListener('touchmove', function (e) { e.preventDefault(); }, { passive: false });

  document.getElementById('new-game').addEventListener('click', startGame);
  document.getElementById('retry').addEventListener('click', startGame);
  keepGoingBtn.addEventListener('click', function () {
    state.keepPlaying = true;
    renderOverlay();
  });

  startGame();
})();
