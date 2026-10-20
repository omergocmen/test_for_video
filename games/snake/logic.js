// Yılan oyununun DOM'dan bağımsız mantığı. Durum düz nesnedir; tick() yeni durum döndürür.
(function (root) {
  'use strict';

  var DIRS = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 }
  };
  var OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };

  var BASE_TICKS = 8;      // başlangıç hızı (tick/sn)
  var MAX_TICKS = 16;
  var FOODS_PER_SPEEDUP = 5;

  function randomFreeCell(cols, rows, snake, rand) {
    var taken = {};
    snake.forEach(function (p) { taken[p.x + ',' + p.y] = true; });
    var free = [];
    for (var y = 0; y < rows; y++) {
      for (var x = 0; x < cols; x++) {
        if (!taken[x + ',' + y]) free.push({ x: x, y: y });
      }
    }
    if (!free.length) return null;
    return free[Math.floor((rand || Math.random)() * free.length)];
  }

  function createGame(cols, rows, rand) {
    var cx = Math.floor(cols / 2), cy = Math.floor(rows / 2);
    var snake = [{ x: cx, y: cy }, { x: cx - 1, y: cy }, { x: cx - 2, y: cy }];
    return {
      cols: cols,
      rows: rows,
      snake: snake,          // snake[0] baş
      dir: 'right',
      queue: [],             // bekleyen yön değişiklikleri
      food: randomFreeCell(cols, rows, snake, rand),
      score: 0,
      over: false,
      won: false
    };
  }

  // Yönü kuyruğa ekler. Kuyruktaki son yöne (yoksa mevcut yöne) göre ters ya da aynı yön yok sayılır.
  function queueDir(state, dir) {
    if (!DIRS[dir] || state.over) return false;
    var last = state.queue.length ? state.queue[state.queue.length - 1] : state.dir;
    if (dir === last || dir === OPPOSITE[last]) return false;
    if (state.queue.length >= 3) return false;
    state.queue.push(dir);
    return true;
  }

  function tick(state, rand) {
    if (state.over) return state;
    var dir = state.queue.length ? state.queue.shift() : state.dir;
    state.dir = dir;
    var d = DIRS[dir];
    var head = state.snake[0];
    var next = { x: head.x + d.x, y: head.y + d.y };
    var eats = state.food && next.x === state.food.x && next.y === state.food.y;

    if (next.x < 0 || next.y < 0 || next.x >= state.cols || next.y >= state.rows) {
      state.over = true;
      return state;
    }
    // Yemezse kuyruk bu tick'te çekileceği için kuyruk karesine girmek serbesttir.
    var body = eats ? state.snake : state.snake.slice(0, -1);
    for (var i = 0; i < body.length; i++) {
      if (body[i].x === next.x && body[i].y === next.y) {
        state.over = true;
        return state;
      }
    }

    state.snake.unshift(next);
    if (eats) {
      state.score += 1;
      state.food = randomFreeCell(state.cols, state.rows, state.snake, rand);
      if (!state.food) { state.over = true; state.won = true; }
    } else {
      state.snake.pop();
    }
    return state;
  }

  function ticksPerSecond(score) {
    return Math.min(MAX_TICKS, BASE_TICKS + Math.floor(score / FOODS_PER_SPEEDUP));
  }

  var api = {
    createGame: createGame,
    queueDir: queueDir,
    tick: tick,
    ticksPerSecond: ticksPerSecond,
    randomFreeCell: randomFreeCell
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SnakeLogic = api;
})(this);
