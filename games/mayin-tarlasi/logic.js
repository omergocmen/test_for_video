// Mayın Tarlası oyun mantığı. DOM'a bağlı değildir; Node'da da test edilebilir.
(function (root) {
  'use strict';

  const LEVELS = {
    kolay: { name: 'Kolay', rows: 9, cols: 9, mines: 10 },
    orta: { name: 'Orta', rows: 16, cols: 16, mines: 40 },
    zor: { name: 'Zor', rows: 16, cols: 30, mines: 99 },
  };

  function createGame(rows, cols, mines) {
    const cells = [];
    for (let i = 0; i < rows * cols; i++) {
      cells.push({ mine: false, count: 0, open: false, flag: false, exploded: false });
    }
    return {
      rows, cols, mines, cells,
      placed: false,
      state: 'ready', // ready | playing | won | lost
      opened: 0,
      flags: 0,
    };
  }

  function neighbors(game, i) {
    const r = Math.floor(i / game.cols);
    const c = i % game.cols;
    const out = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < game.rows && nc >= 0 && nc < game.cols) out.push(nr * game.cols + nc);
      }
    }
    return out;
  }

  // Mayınları ilk açılan karenin dışına yerleştirir. Yer yeterliyse karenin
  // 8 komşusu da boş bırakılır, böylece ilk tıklama her zaman bir alan açar.
  function placeMines(game, safe, rng) {
    rng = rng || Math.random;
    const excluded = new Set([safe]);
    const around = neighbors(game, safe);
    if (game.cells.length - 1 - around.length >= game.mines) around.forEach((n) => excluded.add(n));

    const pool = [];
    for (let i = 0; i < game.cells.length; i++) if (!excluded.has(i)) pool.push(i);
    for (let k = 0; k < game.mines; k++) {
      const j = k + Math.floor(rng() * (pool.length - k));
      [pool[k], pool[j]] = [pool[j], pool[k]];
      game.cells[pool[k]].mine = true;
    }
    for (let i = 0; i < game.cells.length; i++) {
      game.cells[i].count = neighbors(game, i).filter((n) => game.cells[n].mine).length;
    }
    game.placed = true;
    game.state = 'playing';
  }

  function finished(game) {
    return game.state === 'won' || game.state === 'lost';
  }

  function lose(game, i) {
    game.state = 'lost';
    game.cells[i].exploded = true;
    game.cells.forEach((cell) => { if (cell.mine && !cell.flag) cell.open = true; });
  }

  function checkWin(game) {
    if (game.opened === game.cells.length - game.mines) {
      game.state = 'won';
      game.cells.forEach((cell) => {
        if (cell.mine && !cell.flag) { cell.flag = true; game.flags++; }
      });
    }
  }

  // Kareyi açar; 0 ise çevresini yığınla (özyinelemesiz) açar.
  // Açılan güvenli kare sayısını döndürür.
  function reveal(game, i, rng) {
    if (finished(game)) return 0;
    const cell = game.cells[i];
    if (cell.open || cell.flag) return 0;
    if (!game.placed) placeMines(game, i, rng);
    if (cell.mine) { lose(game, i); return 0; }

    let count = 0;
    const stack = [i];
    while (stack.length) {
      const k = stack.pop();
      const c = game.cells[k];
      if (c.open || c.flag || c.mine) continue;
      c.open = true;
      count++;
      if (c.count === 0) neighbors(game, k).forEach((n) => { if (!game.cells[n].open) stack.push(n); });
    }
    game.opened += count;
    checkWin(game);
    return count;
  }

  function toggleFlag(game, i) {
    if (finished(game)) return false;
    const cell = game.cells[i];
    if (cell.open) return false;
    cell.flag = !cell.flag;
    game.flags += cell.flag ? 1 : -1;
    return true;
  }

  // Açık bir sayının çevresindeki bayrak sayısı sayıya eşitse kalan komşuları açar.
  function chord(game, i) {
    if (finished(game)) return false;
    const cell = game.cells[i];
    if (!cell.open || cell.count === 0) return false;
    const around = neighbors(game, i);
    const flagged = around.filter((n) => game.cells[n].flag).length;
    if (flagged !== cell.count) return false;
    let changed = false;
    for (const n of around) {
      const c = game.cells[n];
      if (c.open || c.flag) continue;
      changed = true;
      if (c.mine) { lose(game, n); return true; }
      reveal(game, n);
    }
    return changed;
  }

  const api = { LEVELS, createGame, neighbors, placeMines, reveal, toggleFlag, chord };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Mines = api;
})(this);
