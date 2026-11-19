/**
 * test/m2xfe-kernel.test.mjs — Deterministic 9x9 Kernel, FLOP Ceiling & Energy Tests
 * Run: node --test test/m2xfe-kernel.test.mjs
 *
 * Signed-off-by: Borealis Serenity Hedling <chguard-sentinel@vaked.dev>
 */

import test from "node:test";
import assert from "node:assert/strict";

import { toQ16 } from "../src/core.js";
import {
  CELL_COUNT,
  FLOP_CEILING,
  createBaselineState,
  injectShock,
  stepRelaxationCycle,
  computeSpectralMetrics,
  buildProvenanceManifest,
} from "../src/m2xfe-kernel.js";

test("1. Baseline Equilibrium & Zero Dirichlet Gradient Energy", () => {
  const base = createBaselineState();
  assert.equal(base.grid.length, CELL_COUNT);
  const metrics = computeSpectralMetrics(base);
  assert.equal(metrics.dirichletEnergy, 0);
  assert.equal(metrics.meanResidual, 0);
});

test("2. Shock Injection & Strict <= 2000 FLOP Governance Ceiling", () => {
  let state = createBaselineState();
  state = injectShock(state, 4, 4, toQ16(1.0));
  const afterShock = computeSpectralMetrics(state);
  assert.ok(afterShock.peakTension > 1.0);
  assert.ok(afterShock.dirichletEnergy > 0);

  state = stepRelaxationCycle(state);
  assert.equal(state.lastCycleFlops, 729);
  assert.ok(state.lastCycleFlops <= FLOP_CEILING);
});

test("3. Monotonic Dirichlet Energy Dissipation & Bit-Exact SHA-256 Determinism", () => {
  const runScenario = () => {
    let s = createBaselineState();
    s = injectShock(s, 4, 4, toQ16(1.0));
    const e0 = computeSpectralMetrics(s).dirichletEnergy;

    for (let i = 0; i < 15; i++) {
      s = stepRelaxationCycle(s);
    }
    const e15 = computeSpectralMetrics(s).dirichletEnergy;
    assert.ok(e15 < e0, `Expected Dirichlet energy to decay: ${e15} < ${e0}`);
    return buildProvenanceManifest(s);
  };

  const m1 = runScenario();
  const m2 = runScenario();
  assert.equal(m1.sha256, m2.sha256);
  assert.equal(m1.sha256.length, 64);
});
