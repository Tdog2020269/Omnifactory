// --- Config ---
const GRID_W = 30;  // cells across
const GRID_H = 20;  // cells down
const CELL = 32;    // px per cell
const TICK_MS = 500; // production tick

// --- State ---
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const grid = Array.from({ length: GRID_H }, () => Array(GRID_W).fill(null));
const resources = { iron: 0, gear: 0, energy: 0, money: 50 };
const buttons = [...document.querySelectorAll('#toolbar button')];
let selected = 'miner';

// --- Building definitions ---
const BUILDINGS = {
  miner: {
    name: 'Miner',
    cost: 10,
    color: '#4caf50',
    tick: (b) => { resources.iron += 1; b.buffer.iron = (b.buffer.iron || 0) + 1; },
    requires: () => resources.energy >= 0,
  },
  smelter: {
    name: 'Smelter',
    cost: 20,
    color: '#ff9800',
    tick: (b) => {
      if (resources.iron >= 2) {
        resources.iron -= 2;
        resources.energy += 1;
      }
    },
    requires: () => true,
  },
  assembler: {
    name: 'Assembler',
    cost: 30,
    color: '#3f51b5',
    tick: () => {
      if (resources.iron >= 1 && resources.energy >= 1) {
        resources.iron -= 1;
        resources.energy -= 1;
        resources.gear += 1;
      }
    },
    requires: () => true,
  }
};

// --- UI events ---
buttons.forEach(btn => {
  btn.addEventListener('click', () => {
    buttons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selected = btn.dataset.building;
  });
});

canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left) / CELL);
  const y = Math.floor((e.clientY - rect.top) / CELL);

  if (selected === 'delete') {
    grid[y][x] = null;
    return;
  }

  const def = BUILDINGS[selected];
  if (!def) return;

  if (resources.money >= def.cost && !grid[y][x]) {
    resources.money -= def.cost;
    grid[y][x] = { type: selected, buffer: {} };
  }
});

// --- Game loop ---
let lastFrame = performance.now();
function loop(now) {
  const dt = now - lastFrame;
  lastFrame = now;
  draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// --- Production tick ---
setInterval(() => {
  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      const b = grid[y][x];
      if (!b) continue;
      const def = BUILDINGS[b.type];
      if (def && def.requires(b)) def.tick(b);
    }
  }
  updateHud();
  save();
}, TICK_MS);

// --- Rendering ---
function draw() {
  // background
  ctx.fillStyle = '#0d0d0d';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // grid
  ctx.strokeStyle = '#222';
  for (let x = 0; x <= GRID_W; x++) {
    ctx.beginPath();
    ctx.moveTo(x * CELL, 0);
    ctx.lineTo(x * CELL, GRID_H * CELL);
    ctx.stroke();
  }
  for (let y = 0; y <= GRID_H; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * CELL);
    ctx.lineTo(GRID_W * CELL, y * CELL);
    ctx.stroke();
  }

  // buildings
  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      const b = grid[y][x];
      if (!b) continue;
      const def = BUILDINGS[b.type];
      ctx.fillStyle = def.color;
      ctx.fillRect(x * CELL + 2, y * CELL + 2, CELL - 4, CELL - 4);
      ctx.fillStyle = '#fff';
      ctx.font = '12px monospace';
      ctx.fillText(def.name[0], x * CELL + CELL / 2 - 4, y * CELL + CELL / 2 + 4);
    }
  }
}

// --- HUD + persistence ---
function updateHud() {
  document.getElementById('res-iron').textContent = `Iron: ${resources.iron}`;
  document.getElementById('res-gear').textContent = `Gears: ${resources.gear}`;
  document.getElementById('res-energy').textContent = `Energy: ${resources.energy}`;
}

function save() {
  localStorage.setItem('factorySave', JSON.stringify({ grid, resources }));
}

function load() {
  const raw = localStorage.getItem('factorySave');
  if (!raw) return;
  const data = JSON.parse(raw);
  resources.iron = data.resources.iron || 0;
  resources.gear = data.resources.gear || 0;
  resources.energy = data.resources.energy || 0;
  resources.money = data.resources.money ?? 50;
  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      grid[y][x] = data.grid?.[y]?.[x] || null;
    }
  }
  updateHud();
}
load();
updateHud();
