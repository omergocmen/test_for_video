// 2048 oyun mantığı: DOM'dan bağımsız saf fonksiyonlar.
// Izgara, satır satır 4x4 dizidir; her hücre null ya da { id, value } karosudur.
(function (root) {
  'use strict';

  var SIZE = 4;
  var WIN_VALUE = 2048;
  var DIRECTIONS = ['left', 'right', 'up', 'down'];

  function emptyGrid() {
    var grid = [];
    for (var r = 0; r < SIZE; r++) {
      grid.push([null, null, null, null]);
    }
    return grid;
  }

  function cloneGrid(grid) {
    return grid.map(function (row) { return row.slice(); });
  }

  // Verilen yöndeki k. hattın hücre koordinatları, karoların kaydığı uçtan başlayarak.
  function lineCoords(dir, k) {
    var coords = [];
    for (var i = 0; i < SIZE; i++) {
      if (dir === 'left') coords.push([k, i]);
      else if (dir === 'right') coords.push([k, SIZE - 1 - i]);
      else if (dir === 'up') coords.push([i, k]);
      else coords.push([SIZE - 1 - i, k]);
    }
    return coords;
  }

  // Bir hattı baştaki uca doğru kaydırır ve eşit komşuları birleştirir.
  // Bir karo bir hamlede yalnızca bir kez birleşir.
  function slideLine(line, nextId) {
    var tiles = line.filter(Boolean);
    var out = [];
    var score = 0;
    for (var i = 0; i < tiles.length; i++) {
      var t = tiles[i];
      var next = tiles[i + 1];
      if (next && next.value === t.value) {
        var value = t.value * 2;
        out.push({ id: nextId(), value: value, mergedFrom: [t.id, next.id] });
        score += value;
        i++;
      } else {
        out.push({ id: t.id, value: t.value });
      }
    }
    while (out.length < line.length) out.push(null);
    return { line: out, score: score };
  }

  // Tüm ızgarayı bir yöne kaydırır. Hiçbir şey değişmezse moved=false döner.
  function move(grid, dir, nextId) {
    var result = emptyGrid();
    var score = 0;
    var moved = false;
    var won = false;
    for (var k = 0; k < SIZE; k++) {
      var coords = lineCoords(dir, k);
      var line = coords.map(function (c) { return grid[c[0]][c[1]]; });
      var slid = slideLine(line, nextId);
      score += slid.score;
      coords.forEach(function (c, i) {
        var before = line[i];
        var after = slid.line[i];
        result[c[0]][c[1]] = after;
        if ((before ? before.id : null) !== (after ? after.id : null)) moved = true;
        if (after && after.mergedFrom && after.value === WIN_VALUE) won = true;
      });
    }
    return { grid: moved ? result : grid, moved: moved, score: score, won: won };
  }

  function emptyCells(grid) {
    var cells = [];
    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) {
        if (!grid[r][c]) cells.push([r, c]);
      }
    }
    return cells;
  }

  // Rastgele boş hücreye %90 ihtimalle 2, %10 ihtimalle 4 koyar.
  function addRandomTile(grid, rng, nextId) {
    var cells = emptyCells(grid);
    if (!cells.length) return grid;
    var cell = cells[Math.floor(rng() * cells.length)];
    var next = cloneGrid(grid);
    next[cell[0]][cell[1]] = { id: nextId(), value: rng() < 0.9 ? 2 : 4, isNew: true };
    return next;
  }

  function canMove(grid) {
    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) {
        var t = grid[r][c];
        if (!t) return true;
        if (c + 1 < SIZE && grid[r][c + 1] && grid[r][c + 1].value === t.value) return true;
        if (r + 1 < SIZE && grid[r + 1][c] && grid[r + 1][c].value === t.value) return true;
      }
    }
    return false;
  }

  function newGame(rng, nextId) {
    return addRandomTile(addRandomTile(emptyGrid(), rng, nextId), rng, nextId);
  }

  // Test kolaylığı: sayı dizileriyle çalışan sarmalayıcılar (0 = boş).
  function fromValues(values) {
    var id = 0;
    return values.map(function (row) {
      return row.map(function (v) { return v ? { id: 'v' + (id++), value: v } : null; });
    });
  }

  function toValues(grid) {
    return grid.map(function (row) {
      return row.map(function (t) { return t ? t.value : 0; });
    });
  }

  function idCounter(start) {
    var n = start || 0;
    return function () { return ++n; };
  }

  var api = {
    SIZE: SIZE,
    WIN_VALUE: WIN_VALUE,
    DIRECTIONS: DIRECTIONS,
    emptyGrid: emptyGrid,
    slideLine: slideLine,
    move: move,
    addRandomTile: addRandomTile,
    canMove: canMove,
    newGame: newGame,
    fromValues: fromValues,
    toValues: toValues,
    idCounter: idCounter
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Game2048 = api;
})(this);
