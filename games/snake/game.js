(function () {
  'use strict';

  var L = window.SnakeLogic;
  var COLS = 20, ROWS = 20;
  var BEST_KEY = 'snake.best';

  var board = document.getElementById('board');
  var canvas = document.getElementById('canvas');
  var ctx = canvas.getContext('2d');
  var scoreEl = document.getElementById('score');
  var bestEl = document.getElementById('best');
  var overlay = document.getElementById('overlay');
  var overlayTitle = document.getElementById('overlay-title');
  var overlayText = document.getElementById('overlay-text');
  var actionBtn = document.getElementById('action');
  var pauseBtn = document.getElementById('pause-btn');

  var state = L.createGame(COLS, ROWS);
  var mode = 'ready';   // ready | running | paused | over
  var best = readBest();
  var acc = 0, lastTime = 0;
  var cell = 0, size = 0;

  function readBest() {
    try { return parseInt(localStorage.getItem(BEST_KEY), 10) || 0; } catch (e) { return 0; }
  }
  function writeBest(v) {
    try { localStorage.setItem(BEST_KEY, String(v)); } catch (e) { /* gizli mod */ }
  }

  function colors() {
    var s = getComputedStyle(document.documentElement);
    return {
      bg: s.getPropertyValue('--board').trim(),
      grid: s.getPropertyValue('--grid').trim(),
      snake: s.getPropertyValue('--snake').trim(),
      head: s.getPropertyValue('--head').trim(),
      food: s.getPropertyValue('--food').trim()
    };
  }
  var palette = colors();
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    var onScheme = function () { palette = colors(); draw(); };
    if (mq.addEventListener) mq.addEventListener('change', onScheme);
  }

  function resize() {
    var w = Math.floor(board.clientWidth);
    cell = Math.max(1, Math.floor(w / COLS));
    size = cell * COLS;
    var dpr = window.devicePixelRatio || 1;
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function draw() {
    if (!size) return;
    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, size, size);

    ctx.fillStyle = palette.grid;
    for (var y = 0; y < ROWS; y++) {
      for (var x = (y % 2); x < COLS; x += 2) ctx.fillRect(x * cell, y * cell, cell, cell);
    }

    if (state.food) {
      ctx.fillStyle = palette.food;
      ctx.beginPath();
      ctx.arc((state.food.x + 0.5) * cell, (state.food.y + 0.5) * cell, cell * 0.38, 0, Math.PI * 2);
      ctx.fill();
    }

    var pad = Math.max(1, cell * 0.08);
    for (var i = state.snake.length - 1; i >= 0; i--) {
      var p = state.snake[i];
      ctx.fillStyle = i === 0 ? palette.head : palette.snake;
      roundRect(p.x * cell + pad, p.y * cell + pad, cell - pad * 2, cell - pad * 2, cell * 0.25);
      ctx.fill();
    }
  }

  function updateScore() {
    scoreEl.textContent = state.score;
    if (state.score > best) { best = state.score; writeBest(best); }
    bestEl.textContent = best;
  }

  function showOverlay(title, text, button) {
    overlayTitle.textContent = title;
    overlayText.textContent = text;
    actionBtn.textContent = button;
    overlay.hidden = false;
  }

  function start() {
    if (mode === 'over' || mode === 'ready') {
      if (mode === 'over') state = L.createGame(COLS, ROWS);
      updateScore();
    }
    mode = 'running';
    overlay.hidden = true;
    pauseBtn.textContent = '❚❚';
    pauseBtn.setAttribute('aria-label', 'Duraklat');
    acc = 0;
    lastTime = 0;
    board.focus({ preventScroll: true });
    draw();
  }

  function pause() {
    if (mode !== 'running') return;
    mode = 'paused';
    pauseBtn.textContent = '▶';
    pauseBtn.setAttribute('aria-label', 'Devam et');
    showOverlay('Duraklatıldı', 'Devam etmek için Boşluk / P ya da butona bas.', 'Devam et');
  }

  function togglePause() {
    if (mode === 'running') pause();
    else start();
  }

  function gameOver() {
    mode = 'over';
    updateScore();
    var text = 'Skor: ' + state.score + ' · En iyi: ' + best;
    showOverlay(state.won ? 'Kazandın!' : 'Oyun bitti', text, 'Tekrar oyna');
  }

  function loop(t) {
    requestAnimationFrame(loop);
    if (mode !== 'running') return;
    if (!lastTime) lastTime = t;
    acc += Math.min(250, t - lastTime);
    lastTime = t;
    var step = 1000 / L.ticksPerSecond(state.score);
    var changed = false;
    while (acc >= step && mode === 'running') {
      acc -= step;
      var before = state.score;
      L.tick(state);
      changed = true;
      if (state.score !== before) {
        updateScore();
        step = 1000 / L.ticksPerSecond(state.score);
      }
      if (state.over) gameOver();
    }
    if (changed) draw();
  }

  function turn(dir) {
    if (mode === 'paused') return;
    if (mode === 'ready' || mode === 'over') {
      start();
    }
    L.queueDir(state, dir);
  }

  var KEYS = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    w: 'up', s: 'down', a: 'left', d: 'right',
    W: 'up', S: 'down', A: 'left', D: 'right'
  };

  document.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var dir = KEYS[e.key];
    if (dir) {
      e.preventDefault();
      turn(dir);
      return;
    }
    if (e.key === ' ' || e.key === 'p' || e.key === 'P' || e.key === 'Enter') {
      if (e.key === 'Enter' && document.activeElement && document.activeElement.tagName === 'BUTTON') return;
      e.preventDefault();
      togglePause();
    }
  });

  // Dokunmatik kaydırma
  var touchStart = null;
  board.addEventListener('touchstart', function (e) {
    if (e.touches.length !== 1) return;
    touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, { passive: true });
  board.addEventListener('touchmove', function (e) {
    e.preventDefault();
  }, { passive: false });
  board.addEventListener('touchend', function (e) {
    if (!touchStart) return;
    var t = e.changedTouches[0];
    var dx = t.clientX - touchStart.x, dy = t.clientY - touchStart.y;
    touchStart = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
    if (e.target.closest && e.target.closest('button')) return;
    e.preventDefault();
    if (Math.abs(dx) > Math.abs(dy)) turn(dx > 0 ? 'right' : 'left');
    else turn(dy > 0 ? 'down' : 'up');
  }, { passive: false });

  document.querySelectorAll('.pad-btn[data-dir]').forEach(function (btn) {
    btn.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      turn(btn.getAttribute('data-dir'));
    });
  });
  pauseBtn.addEventListener('click', togglePause);
  actionBtn.addEventListener('click', start);

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) pause();
  });
  window.addEventListener('blur', pause);
  window.addEventListener('resize', resize);

  bestEl.textContent = best;
  resize();
  requestAnimationFrame(loop);
})();
