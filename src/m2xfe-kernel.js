/**
 * src/m2xfe-kernel.js — 9x9 Spectral-Tension Kernel & FLOP-Bounded Relaxation
 * Implements the deterministic EcoGrid M2-XFE runtime stages:
 *   1. Baseline Run (uniform Q16.16 equilibrium)
 *   2. Shock Run (5-point radial impulse stencil)
 *   3. Relaxation Cycles (Neumann-boundary discrete Laplacian, 729 FLOPs/cycle <= 2000)
 *   4. Spectral Metrics (Peak Tension, Dirichlet Energy, Mean Residual)
 *   5. Provenance Receipt (SHA-256 manifest digest)
 *
 * Signed-off-by: Borealis Serenity Hedling <chguard-sentinel@vaked.dev>
 */

import { Q_ONE, qAdd, qSub, qMul, toQ16, fromQ16, sha256Hex } from "./core.js";

export const GRID_DIM = 9;
export const CELL_COUNT = GRID_DIM * GRID_DIM; // 81 cells
export const FLOP_CEILING = 2000;
export const FLOPS_PER_CELL = 9; // 4 neighbor reads + 1 center mul + 1 diff + 1 alpha mul + 1 add + 1 eta mul

export const DEFAULT_BASELINE_Q16 = toQ16(0.15);
export const DEFAULT_ALPHA_Q16 = toQ16(0.18);   // CFL diffusion rate (< 0.25)
export const DEFAULT_DAMPING_Q16 = toQ16(0.96); // Radiative relaxation factor

export function idxOf(row, col) {
  return row * GRID_DIM + col;
}

/**
 * Stage 1: Baseline Run — Create calm 9x9 equilibrium state.
 */
export function createBaselineState(baselineQ16 = DEFAULT_BASELINE_Q16) {
  const grid = new Int32Array(CELL_COUNT);
  grid.fill(baselineQ16 | 0);

  return {
    stage: "BASELINE",
    cycle: 0,
    baselineQ16: baselineQ16 | 0,
    alphaQ16: DEFAULT_ALPHA_Q16,
    dampingQ16: DEFAULT_DAMPING_Q16,
    grid,
    lastCycleFlops: 0,
    totalFlops: 0,
    shockLog: [],
  };
}

/**
 * Stage 2: Shock Run — Inject localized 5-point radial impulse at (row, col).
 * Center receives +magnitude; cardinal neighbors receive +0.45 * magnitude.
 */
export function injectShock(state, row, col, magnitudeQ16 = toQ16(0.85)) {
  const r = Math.max(0, Math.min(GRID_DIM - 1, row | 0));
  const c = Math.max(0, Math.min(GRID_DIM - 1, col | 0));
  const nextGrid = new Int32Array(state.grid);

  const neighborWeightQ16 = toQ16(0.45);
  const sideDelta = qMul(magnitudeQ16, neighborWeightQ16);
  const maxTensionQ16 = toQ16(2.5);

  const applyCell = (rr, cc, delta) => {
    if (rr < 0 || rr >= GRID_DIM || cc < 0 || cc >= GRID_DIM) return;
    const idx = idxOf(rr, cc);
    const updated = qAdd(nextGrid[idx], delta);
    nextGrid[idx] = Math.min(maxTensionQ16, Math.max(0, updated));
  };

  applyCell(r, c, magnitudeQ16);
  applyCell(r - 1, c, sideDelta);
  applyCell(r + 1, c, sideDelta);
  applyCell(r, c - 1, sideDelta);
  applyCell(r, c + 1, sideDelta);

  return {
    ...state,
    stage: "SHOCK_INJECTED",
    grid: nextGrid,
    shockLog: [
      ...state.shockLog,
      { cycle: state.cycle, row: r, col: c, magnitude: Number(fromQ16(magnitudeQ16).toFixed(3)) },
    ],
  };
}

/**
 * Stage 3: Relaxation Cycle — Advance one deterministic discrete Laplacian step
 * with Neumann (zero-flux) boundary conditions and explicit FLOP accounting.
 */
export function stepRelaxationCycle(state) {
  const cycleFlops = CELL_COUNT * FLOPS_PER_CELL; // 81 * 9 = 729 FLOPs
  if (cycleFlops > FLOP_CEILING) {
    throw new Error(`FLOP governance violation: ${cycleFlops} > ${FLOP_CEILING}`);
  }

  const u = state.grid;
  const next = new Int32Array(CELL_COUNT);
  const base = state.baselineQ16;
  const alpha = state.alphaQ16;
  const eta = state.dampingQ16;

  for (let r = 0; r < GRID_DIM; r++) {
    const rUp = r > 0 ? r - 1 : r;
    const rDn = r < GRID_DIM - 1 ? r + 1 : r;

    for (let c = 0; c < GRID_DIM; c++) {
      const cLt = c > 0 ? c - 1 : c;
      const cRt = c < GRID_DIM - 1 ? c + 1 : c;

      const idx = idxOf(r, c);
      const center = u[idx];

      // 5-point discrete Laplacian: (N + S + W + E - 4 * C)
      const neighborSum = qAdd(
        qAdd(u[idxOf(rUp, c)], u[idxOf(rDn, c)]),
        qAdd(u[idxOf(r, cLt)], u[idxOf(r, cRt)])
      );
      const laplacian = qSub(neighborSum, center << 2);

      // Diffuse and damp excess tension relative to baseline equilibrium
      const diffused = qAdd(center, qMul(alpha, laplacian));
      const excess = qSub(diffused, base);
      const dampedExcess = qMul(eta, excess);

      next[idx] = Math.max(0, qAdd(base, dampedExcess));
    }
  }

  return {
    ...state,
    stage: "RELAXATION",
    cycle: state.cycle + 1,
    grid: next,
    lastCycleFlops: cycleFlops,
    totalFlops: state.totalFlops + cycleFlops,
  };
}

/**
 * Stage 4: Spectral Metrics — Compute Peak Tension, Discrete Dirichlet Gradient Energy,
 * Mean Residual, and advisory CAUSA stability classification (read-only).
 */
export function computeSpectralMetrics(state) {
  const u = state.grid;
  const base = state.baselineQ16;

  let peakQ16 = 0;
  let residualSum = 0;
  let dirichletEnergy = 0;

  for (let r = 0; r < GRID_DIM; r++) {
    for (let c = 0; c < GRID_DIM; c++) {
      const val = u[idxOf(r, c)];
      if (val > peakQ16) peakQ16 = val;

      const valF = fromQ16(val);
      const baseF = fromQ16(base);
      residualSum += Math.abs(valF - baseF);

      if (r < GRID_DIM - 1) {
        const diffDown = valF - fromQ16(u[idxOf(r + 1, c)]);
        dirichletEnergy += 0.5 * diffDown * diffDown;
      }
      if (c < GRID_DIM - 1) {
        const diffRight = valF - fromQ16(u[idxOf(r, c + 1)]);
        dirichletEnergy += 0.5 * diffRight * diffRight;
      }
    }
  }

  const peakTension = fromQ16(peakQ16);
  const meanResidual = residualSum / CELL_COUNT;

  let causaDiagnosis = "EQUILIBRIUM — Manifold calm within baseline envelope.";
  let severity = "calm";
  if (peakTension >= 1.1 || dirichletEnergy >= 1.2) {
    causaDiagnosis = "CRITICAL SHOCK FRONT — High spectral gradient; relaxation cycles active.";
    severity = "critical";
  } else if (peakTension >= 0.35 || dirichletEnergy >= 0.08) {
    causaDiagnosis = "TRANSIENT RIPPLE — Wavefronts diffusing across Neumann boundaries.";
    severity = "ripple";
  }

  return {
    peakTension,
    dirichletEnergy,
    meanResidual,
    lastCycleFlops: state.lastCycleFlops,
    flopCeiling: FLOP_CEILING,
    causaDiagnosis,
    severity,
  };
}

/**
 * Stage 5: Provenance Manifest — Build canonical JSON & SHA-256 digest.
 */
export function buildProvenanceManifest(state) {
  const metrics = computeSpectralMetrics(state);
  const payload = {
    schema: "ecogrid.m2xfe.toy.v1",
    stage: state.stage,
    cycle: state.cycle,
    gridDim: GRID_DIM,
    flopCeiling: FLOP_CEILING,
    lastCycleFlops: state.lastCycleFlops,
    totalFlops: state.totalFlops,
    metrics: {
      peakTension: Number(metrics.peakTension.toFixed(6)),
      dirichletEnergy: Number(metrics.dirichletEnergy.toFixed(6)),
      meanResidual: Number(metrics.meanResidual.toFixed(6)),
    },
    shockLog: state.shockLog,
    latticeQ16: Array.from(state.grid),
  };

  const canonical = JSON.stringify(payload);
  return {
    ...payload,
    sha256: sha256Hex(canonical),
  };
}
