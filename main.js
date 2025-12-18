// --- Config ---
const GRID_W = 30;
const GRID_H = 20;
const CELL = 32;
const TICK_MS = 500;

// --- State ---
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const grid = Array.from({ length: GRID_H }, () => Array(GRID_W).fill(null));
const resources = { iron: 0, gear: 0, energy: 0, money: 50, research: 0 };
const unlocks = { belts: false, storage: false, circuits: false };
const buttons = [...document.querySelectorAll('#toolbar button')];
let selected = 'miner';
let hoverCell = null;
const keys = {};

// --- Buildings ---
const BUILDINGS = {
  miner: {
    name: 'Miner',
    cost: 10,
    color: '#4caf50',
    tick: (b) => {
      // Produces iron every tick
      resources.iron += 1;
      b.buffer.iron = (b.buffer.iron || 0) + 1;
    },
    requires: () => true,
  },

  smelter: {
    name: 'Smelter',
    cost: 20,
    color: '#ff9800',
    tick: (b) => {
      // Consumes iron to produce energy (simple prototype logic)
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
    tick: (b) => {
      // Iron + energy -> gears
      if (resources.iron >= 1 && resources.energy >= 1) {
        resources.iron -= 1;
        resources.energy -= 1;
        resources.gear += 1;
      }
    },
    requires: () => true,
  },

  researchlab: {
    name: 'Research Lab',
    cost: 50,
    color: '#9c27b0',
    tick: (b) => {
      // Consume gears to generate research points
      if (resources.gear >= 2) {
        resources.gear -= 2;
        resources.research += 1;

        // Unlock checks
        if (resources.research >= 10 && !unlocks.belts) {
          unlocks.belts = true;
          alert('Unlocked Conveyor Belts!');
          updateUnlocks();
        }
        if (resources.research >= 20 && !unlocks.storage) {
          unlocks.storage = true;
          alert('Unlocked Storage!');
          updateUnlocks();
        }
        if (resources.research >= 40 && !unlocks.circuits) {
          unlocks.circuits = true;
          alert('Unlocked Circuit Factory!');
          updateUnlocks();
        }
      }
    },
    requires: () => true,
  },

  belt: {
    name: 'Belt',
    cost: 15,
    color: '#607d8b',
    tick: (b) => {
      // Move one iron unit in the belt's direction if present
      const dir = b.dir || { x: 1, y: 0 };
      const nx = b.x + dir.x;
      const ny = b.y + dir.y;
      const target = grid[ny]?.[nx];
      if (target && b.buffer.iron > 0) {
        b.buffer.iron -= 1;
        target.buffer.iron = (target.buffer.iron || 0) + 1;
      }
    },
    requires: () => true,
  },

  storage: {
    name: 'Storage',
    cost: 25,
    color: '#795548',
    tick: (b) => {
      // Pull iron from global pool into this storage buffer
      if (resources.iron > 0) {
        resources.iron -= 1;
        b.buffer.iron = (b.buffer.iron || 0) + 1;
      }
    },
    requires: () => true,
  },
};

// --- Unlock updater ---
function updateUnlocks() {
  const beltBtn = document.querySelector('[data-building="belt"]');
  const storageBtn = document.querySelector('[data-building="storage"]');
  const circuitBtn = document.querySelector('[data-building="circuit"]'); // future

  if (beltBtn) beltBtn.disabled = !unlocks.belts;
  if (storageBtn) storageBtn.disabled = !unlocks.storage;
  if (circuitBtn) circuitBtn.disabled = !unlocks.circuits;
}

// --- UI events ---
buttons.forEach((btn) => {
  btn.addEventListener('click', () => {
    buttons.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    selected = btn.dataset.building;
  });
});

// Placement handler (click to place/delete)
canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left) / CELL);
  const y = Math.floor((e.clientY - rect.top) / CELL);

  if (x < 0 || y < 0 || x >= GRID_W || y >= GRID_H) return;

  if (selected === 'delete') {
    grid[y][x] = null;
    return;
  }

  const def = BUILDINGS[selected];
  if (!def) return;

  if (resources.money >= def.cost && !grid[y][x]) {
    resources.money -= def.cost;

    // Directional belts based on arrow keys
    let dir = undefined;
    if (selected === 'belt') {
      dir = { x: 1, y: 0 }; // default right
      if (keys['ArrowUp']) dir = { x: 0, y: -1 };
      if (keys['ArrowDown']) dir = { x: 0, y: 1 };
      if (keys['ArrowLeft']) dir = { x: -1, y: 0 };
      if (keys['ArrowRight']) dir = { x: 1, y: 0 };
    }

    grid[y][x] = { type: selected, buffer: {}, x, y, dir };
  }
});

// Keyboard tracking for belt direction
window.addEventListener('keydown', (e) => {
  keys[e.key] = true;
});
window.addEventListener('keyup', (e) => {
  keys[e.key] = false;
});

// Mouse hover for tooltip + ghost
canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left) / CELL);
  const y = Math.floor((e.clientY - rect.top) / CELL);
  hoverCell = { x, y };

  const b = grid[y]?.[x];
  const tooltip = document.getElementById('tooltip');
  if (!tooltip) return;

  if (b) {
    const name = BUILDINGS[b.type]?.name || 'Unknown';
    const ironBuf = b.buffer.iron || 0;
    tooltip.style.display = 'block';
    tooltip.style.left = `${e.clientX + 10}px`;
    tooltip.style.top = `${e.clientY + 10}px`;
    let extra = '';
    if (b.type === 'belt') {
      const d = b.dir || { x: 1, y: 0 };
      const arrow =
        d.y === -1 ? '↑' : d.y === 1 ? '↓' : d.x === -1 ? '←' : '→';
      extra = ` | dir:${arrow}`;
    }
    tooltip.textContent = `${name} | iron:${ironBuf}${extra}`;
  } else {
    tooltip.style.display = 'none';
  }
});

// --- Game loop ---
let lastFrame = performance.now();
function loop(now) {
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
  // Background
  ctx.fillStyle = '#0d0d0d';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Grid
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

  // Build preview ghost
  if (hoverCell && selected && selected !== 'delete') {
    const def = BUILDINGS[selected];
    const color = def?.color || '#fff';
    // translucent fill using the building's color
    const rgba = hexToRgba(color, 0.3);
    ctx.fillStyle = rgba;
    ctx.fillRect(hoverCell.x * CELL + 2, hoverCell.y * CELL + 2, CELL - 4, CELL - 4);
  }

  // Buildings
  ctx.font = '12px monospace';
  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      const b = grid[y][x];
      if (!b) continue;
      const def = BUILDINGS[b.type];
      ctx.fillStyle = def.color;
      ctx.fillRect(x * CELL + 2, y * CELL + 2, CELL - 4, CELL - 4);

      // Label (first letter)
      ctx.fillStyle = '#fff';
      ctx.fillText(def.name[0], x * CELL + CELL / 2 - 4, y * CELL + CELL / 2 + 4);

      // Belt direction arrow
      if (b.type === 'belt') {
        const d = b.dir || { x: 1, y: 0 };
        const arrow =
          d.y === -1 ? '↑' : d.y === 1 ? '↓' : d.x === -1 ? '←' : '→';
        ctx.fillText(arrow, x * CELL + CELL / 2 - 4, y * CELL + CELL / 2 + 16);
      }
    }
  }
}

// --- HUD + persistence ---
function updateHud() {
  document.getElementById('res-iron').textContent = `Iron: ${resources.iron}`;
  document.getElementById('res-gear').textContent = `Gears: ${resources.gear}`;
  document.getElementById('res-energy').textContent = `Energy: ${resources.energy}`;
  document.getElementById('res-research').textContent = `Research: ${resources.research}`;

  // Calculate stored iron by summing buffers of storage buildings
  let storedIron = 0;
  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      const b = grid[y][x];
      if (b?.type === 'storage') storedIron += b.buffer.iron || 0;
    }
  }
  const storageSpan = document.getElementById('res-storage');
  if (storageSpan) storageSpan.textContent = `Stored Iron: ${storedIron}`;
}

function save() {
  localStorage.setItem('factorySave', JSON.stringify({ grid, resources, unlocks }));
}

function load() {
  const raw = localStorage.getItem('factorySave');
  if (!raw) return;
  const data = JSON.parse(raw);

  // Restore resources and unlocks
  Object.assign(resources, data.resources || {});
  Object.assign(unlocks, data.unlocks || {});

  // Restore grid safely
  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      const cell = data.grid?.[y]?.[x] || null;
      if (cell) {
        // Recreate object to avoid prototype issues
        grid[y][x] = {
          type: cell.type,
          buffer: cell.buffer || {},
          x: cell.x ?? x,
          y: cell.y ?? y,
          dir: cell.dir || undefined,
        };
      } else {
        grid[y][x] = null;
      }
    }
  }

  updateHud();
  updateUnlocks();
}
load();
updateHud();

// --- Helpers ---
function hexToRgba(hex, alpha = 1) {
  // Supports #rgb and #rrggbb
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
