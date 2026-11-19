/**
 * src/m2xfe-renderer.js — Read-Only 9x9 Spectral Heatmap & Tension Renderer (Ledger 2)
 * Renders each lattice cell's Q16.16 scalar as a thermal gradient with numeric
 * readouts and coordinate markers without modifying kernel state.
 *
 * Signed-off-by: Borealis Serenity Hedling <chguard-sentinel@vaked.dev>
 */

import { fromQ16 } from "./core.js";
import { GRID_DIM, idxOf } from "./m2xfe-kernel.js";

function tensionToColor(val) {
  // Smooth color ramp: calm slate-blue (0.15) -> teal/amber (0.6) -> crimson-white (1.4+)
  const t = Math.max(0, Math.min(1, (val - 0.1) / 1.3));
  if (t < 0.35) {
    const k = t / 0.35;
    const r = Math.round(15 + k * 25);
    const g = Math.round(35 + k * 145);
    const b = Math.round(75 + k * 125);
    return `rgb(${r}, ${g}, ${b})`;
  }
  if (t < 0.72) {
    const k = (t - 0.35) / 0.37;
    const r = Math.round(40 + k * 205);
    const g = Math.round(180 - k * 35);
    const b = Math.round(200 - k * 165);
    return `rgb(${r}, ${g}, ${b})`;
  }
  const k = (t - 0.72) / 0.28;
  const r = Math.round(245 + k * 10);
  const g = Math.round(145 - k * 85);
  const b = Math.round(35 + k * 65);
  return `rgb(${r}, ${g}, ${b})`;
}

export function renderM2xfeGrid(ctx, state) {
  const { width, height } = ctx.canvas;
  const pad = 18;
  const gridSize = Math.min(width, height) - pad * 2;
  const cellSize = gridSize / GRID_DIM;

  ctx.fillStyle = "#070b14";
  ctx.fillRect(0, 0, width, height);

  for (let r = 0; r < GRID_DIM; r++) {
    for (let c = 0; c < GRID_DIM; c++) {
      const val = fromQ16(state.grid[idxOf(r, c)]);
      const x = pad + c * cellSize;
      const y = pad + r * cellSize;

      ctx.fillStyle = tensionToColor(val);
      ctx.fillRect(x + 2, y + 2, cellSize - 4, cellSize - 4);

      ctx.strokeStyle = "rgba(148, 163, 184, 0.25)";
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 2, y + 2, cellSize - 4, cellSize - 4);

      // Numeric tension value inside cell
      ctx.fillStyle = val > 0.75 ? "#ffffff" : "#e2e8f0";
      ctx.font = "bold 11px monospace";
      ctx.textAlign = "center";
      ctx.fillText(val.toFixed(2), x + cellSize / 2, y + cellSize / 2 + 4);

      // Subtle (r,c) index in top-left corner
      ctx.fillStyle = "rgba(226, 232, 240, 0.55)";
      ctx.font = "9px monospace";
      ctx.textAlign = "left";
      ctx.fillText(`${r},${c}`, x + 5, y + 12);
    }
  }

  ctx.textAlign = "left";
}
