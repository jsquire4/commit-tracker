import { useEffect, useRef } from 'react';

/* ── Configuration ────────────────────────────────────────────────── */
const CELL_SIZE = 28;
const GAP = 5;
const STRIDE = CELL_SIZE + GAP;
const ROWS = 14;
const SIGNAL_INTERVAL = 800;
const ACCENT_R = 3;
const ACCENT_G = 106;
const ACCENT_B = 106;

/* ── Position-based opacity curve ─────────────────────────────────── */
const OPACITY_KEYS = [
  { x: 0.0, y: 0.55 },
  { x: 0.1, y: 0.45 },
  { x: 0.22, y: 0.1 },
  { x: 0.38, y: 0.1 },
  { x: 0.5, y: 0.35 },
  { x: 0.7, y: 0.7 },
  { x: 1.0, y: 1.0 },
];

function positionMultiplier(col: number, cols: number): number {
  if (cols <= 1) return 0.5;
  const t = col / (cols - 1);
  for (let i = 0; i < OPACITY_KEYS.length - 1; i++) {
    const cur = OPACITY_KEYS[i]!;
    const next = OPACITY_KEYS[i + 1]!;
    if (t <= next.x) {
      const segT = (t - cur.x) / (next.x - cur.x);
      const smooth = segT * segT * (3 - 2 * segT);
      return cur.y + (next.y - cur.y) * smooth;
    }
  }
  return OPACITY_KEYS[OPACITY_KEYS.length - 1]!.y;
}

/* ── Cell type ────────────────────────────────────────────────────── */
interface Cell {
  col: number;
  row: number;
  baseOpacity: number;
  currentOpacity: number;
  breathPhase: number;
  breathSpeed: number;
  breathAmp: number;
  signalTimer: number;
  signalBrightness: number;
}

interface Connection {
  fromCol: number;
  fromRow: number;
  toCol: number;
  toRow: number;
  life: number;
  maxLife: number;
}

function buildCells(cols: number, initialOpacity: 'zero' | 'base'): Cell[] {
  const hotX = cols * 0.72;
  const hotY = ROWS * 0.45;
  const maxDist = Math.sqrt(hotX * hotX + hotY * hotY);
  const cells: Cell[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < cols; c++) {
      const dx = c - hotX;
      const dy = r - hotY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const base = Math.max(0.03, 0.7 * Math.pow(1 - dist / maxDist, 2));
      cells.push({
        col: c, row: r, baseOpacity: base,
        currentOpacity: initialOpacity === 'zero' ? 0 : base,
        breathPhase: Math.random() * Math.PI * 2,
        breathSpeed: 0.3 + Math.random() * 0.4,
        breathAmp: 0.02 + Math.random() * 0.04,
        signalTimer: 0, signalBrightness: 0,
      });
    }
  }
  return cells;
}

export function GridCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const maybeCtx = canvas.getContext('2d');
    if (!maybeCtx) return;
    // Store in a const that TS knows is non-null inside closures
    const ctx: CanvasRenderingContext2D = maybeCtx;

    let animId = 0;
    let lastFrame = 0;
    let lastSignalTime = 0;
    const activeConnections: Connection[] = [];

    /* ── Setup ──────────────────────────────────────────────────────── */
    const viewportW = window.innerWidth;
    const cols = Math.ceil(viewportW / STRIDE) + 2;
    const totalW = cols * STRIDE - GAP;
    const totalH = ROWS * STRIDE - GAP;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = totalW * dpr;
    canvas.height = totalH * dpr;
    canvas.style.width = `${totalW}px`;
    canvas.style.height = `${totalH}px`;
    ctx.scale(dpr, dpr);

    /* ── Build cells ────────────────────────────────────────────────── */
    const cells: Cell[] = buildCells(cols, 'zero');

    /* ── Entrance ───────────────────────────────────────────────────── */
    const entranceTime = performance.now() + 500;

    /* ── Signal system ──────────────────────────────────────────────── */
    function triggerSignals(timestamp: number) {
      if (timestamp - lastSignalTime < SIGNAL_INTERVAL) return;
      lastSignalTime = timestamp;

      const count = 1 + Math.floor(Math.random() * 3);
      const flashed: number[] = [];
      for (let i = 0; i < count; i++) {
        const idx = Math.floor(Math.random() * cells.length);
        const cell = cells[idx]!;
        if (cell.baseOpacity > 0.15) {
          cell.signalTimer = 400;
          cell.signalBrightness = 0.5 + Math.random() * 0.3;
          flashed.push(idx);
        }
      }

      if (flashed.length >= 2 && Math.random() < 0.5) {
        const aIdx = flashed[0]!;
        const a = cells[aIdx]!;
        const neighbors: number[] = [];
        for (let di = -1; di <= 1; di++) {
          for (let dj = -1; dj <= 1; dj++) {
            if (di === 0 && dj === 0) continue;
            const nr = a.row + di;
            const nc = a.col + dj;
            if (nr >= 0 && nr < ROWS && nc >= 0 && nc < cols) {
              const nIdx = nr * cols + nc;
              if (cells[nIdx]!.baseOpacity > 0.1) neighbors.push(nIdx);
            }
          }
        }
        if (neighbors.length > 0) {
          const targetIdx = neighbors[Math.floor(Math.random() * neighbors.length)]!;
          const target = cells[targetIdx]!;
          activeConnections.push({
            fromCol: a.col,
            fromRow: a.row,
            toCol: target.col,
            toRow: target.row,
            life: 800,
            maxLife: 800,
          });
        }
      }
    }

    /* ── Render loop ────────────────────────────────────────────────── */
    function render(timestamp: number) {
      if (!lastFrame) lastFrame = timestamp;
      const dt = timestamp - lastFrame;
      lastFrame = timestamp;

      ctx.clearRect(0, 0, totalW, totalH);

      const elapsed = timestamp - entranceTime;
      if (elapsed > 0) triggerSignals(timestamp);

      for (let i = 0; i < cells.length; i++) {
        const cell = cells[i]!;
        const x = cell.col * STRIDE;
        const y = cell.row * STRIDE;

        // Entrance stagger
        if (elapsed > 0) {
          const distFromCenter =
            Math.abs(cell.row - ROWS / 2) + Math.abs(cell.col - cols / 2);
          const cellDelay = distFromCenter * 25;
          const progress = Math.max(0, Math.min(1, (elapsed - cellDelay) / 400));
          cell.currentOpacity = cell.baseOpacity * progress;

          // Breathing
          const breath =
            Math.sin(cell.breathPhase + timestamp * 0.001 * cell.breathSpeed) *
            cell.breathAmp;
          cell.currentOpacity = Math.max(0, Math.min(1, cell.currentOpacity + breath));
        }

        // Signal flash
        let flashAdd = 0;
        if (cell.signalTimer > 0) {
          cell.signalTimer -= dt;
          flashAdd = cell.signalBrightness * (cell.signalTimer / 400);
        }

        const posMult = positionMultiplier(cell.col, cols);
        const finalOpacity = Math.min(1, (cell.currentOpacity + flashAdd) * posMult);

        if (finalOpacity > 0.005) {
          let cr = ACCENT_R;
          let cg = ACCENT_G;
          let cb = ACCENT_B;
          if (flashAdd > 0.05) {
            cr = Math.round(ACCENT_R + (120 - ACCENT_R) * (flashAdd / 0.8));
            cg = Math.round(ACCENT_G + (220 - ACCENT_G) * (flashAdd / 0.8));
            cb = Math.round(ACCENT_B + (200 - ACCENT_B) * (flashAdd / 0.8));
          }
          ctx.fillStyle = `rgba(${cr},${cg},${cb},${finalOpacity.toFixed(3)})`;
          ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
        }
      }

      // Connections
      for (let j = activeConnections.length - 1; j >= 0; j--) {
        const conn = activeConnections[j]!;
        conn.life -= dt;
        if (conn.life <= 0) {
          activeConnections.splice(j, 1);
          continue;
        }
        const progress = conn.life / conn.maxLife;
        const alpha = (progress > 0.5 ? (1 - progress) * 2 : progress * 2) * 0.35;
        const fx = conn.fromCol * STRIDE + CELL_SIZE / 2;
        const fy = conn.fromRow * STRIDE + CELL_SIZE / 2;
        const tx = conn.toCol * STRIDE + CELL_SIZE / 2;
        const ty = conn.toRow * STRIDE + CELL_SIZE / 2;
        ctx.beginPath();
        ctx.moveTo(fx, fy);
        ctx.lineTo(tx, ty);
        ctx.strokeStyle = `rgba(3,140,140,${alpha.toFixed(3)})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      animId = requestAnimationFrame(render);
    }

    animId = requestAnimationFrame(render);

    // Resize handler — reinitialize canvas on window resize
    let resizeTimer: ReturnType<typeof setTimeout>;
    function handleResize() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (!canvas) return;
        cancelAnimationFrame(animId);
        const newW = window.innerWidth;
        const newCols = Math.ceil(newW / STRIDE) + 2;
        const newTotalW = newCols * STRIDE - GAP;
        const newTotalH = ROWS * STRIDE - GAP;
        const newDpr = window.devicePixelRatio || 1;
        canvas.width = newTotalW * newDpr;
        canvas.height = newTotalH * newDpr;
        canvas.style.width = `${newTotalW}px`;
        canvas.style.height = `${newTotalH}px`;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(newDpr, newDpr);

        // Rebuild cells for new column count
        cells.length = 0;
        const newCells = buildCells(newCols, 'base');
        for (const cell of newCells) cells.push(cell);
        activeConnections.length = 0;
        lastFrame = 0;
        animId = requestAnimationFrame(render);
      }, 150);
    }
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      clearTimeout(resizeTimer);
      window.removeEventListener('resize', handleResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="absolute inset-0 z-[1] overflow-hidden">
      <canvas
        ref={canvasRef}
        className="absolute left-0 top-1/2 -translate-y-1/2"
      />
    </div>
  );
}
