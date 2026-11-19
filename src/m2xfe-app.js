/**
 * src/m2xfe-app.js — Interactive 9x9 Pipeline Controller & Provenance Exporter
 * Connects pointer/click cell shock injection, single-step and continuous
 * relaxation cycles, battle scenario presets, CAUSA readouts, and SHA-256 export.
 *
 * Signed-off-by: Borealis Serenity Hedling <chguard-sentinel@vaked.dev>
 */

import { toQ16 } from "./core.js";
import {
  GRID_DIM,
  FLOP_CEILING,
  createBaselineState,
  injectShock,
  stepRelaxationCycle,
  computeSpectralMetrics,
  buildProvenanceManifest,
} from "./m2xfe-kernel.js";
import { M2XFE_BATTLE_PRESETS } from "./m2xfe-presets.js";
import { renderM2xfeGrid } from "./m2xfe-renderer.js";

function initM2xfeToy() {
  const canvas = document.getElementById("m2xfe-canvas");
  const ctx = canvas ? canvas.getContext("2d") : null;

  const els = {
    stage: document.getElementById("hud-stage"),
    cycle: document.getElementById("hud-cycle"),
    peak: document.getElementById("val-peak"),
    energy: document.getElementById("val-energy"),
    residual: document.getElementById("val-residual"),
    flops: document.getElementById("val-flops"),
    flopBar: document.getElementById("bar-flops"),
    causa: document.getElementById("hud-causa"),
    manifestBox: document.getElementById("manifest-output"),
    autoBtn: document.getElementById("btn-auto"),
  };

  let state = createBaselineState();
  let autoRelaxTimer = null;

  const refreshView = () => {
    if (ctx) renderM2xfeGrid(ctx, state);
    const m = computeSpectralMetrics(state);

    if (els.stage) els.stage.textContent = `Stage: ${state.stage}`;
    if (els.cycle) els.cycle.textContent = `Cycle: ${state.cycle}`;
    if (els.peak) els.peak.textContent = m.peakTension.toFixed(4);
    if (els.energy) els.energy.textContent = m.dirichletEnergy.toFixed(4);
    if (els.residual) els.residual.textContent = m.meanResidual.toFixed(4);
    if (els.flops) {
      els.flops.textContent = `${m.lastCycleFlops} / ${FLOP_CEILING} FLOPs (Total: ${state.totalFlops})`;
    }
    if (els.flopBar) {
      const pct = Math.min(100, (m.lastCycleFlops / FLOP_CEILING) * 100);
      els.flopBar.style.width = `${pct}%`;
    }
    if (els.causa) {
      els.causa.textContent = `[CAUSA ADVISORY] ${m.causaDiagnosis}`;
      els.causa.className = `causa-banner ${m.severity}`;
    }
  };

  const stopAuto = () => {
    if (autoRelaxTimer) {
      clearInterval(autoRelaxTimer);
      autoRelaxTimer = null;
      if (els.autoBtn) els.autoBtn.textContent = "Run Auto-Relaxation";
    }
  };

  // Interactive cell click/tap on 9x9 grid injects localized shock
  canvas?.addEventListener("pointerdown", (ev) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const px = (ev.clientX - rect.left) * scaleX;
    const py = (ev.clientY - rect.top) * scaleY;

    const pad = 18;
    const gridSize = Math.min(canvas.width, canvas.height) - pad * 2;
    const cellSize = gridSize / GRID_DIM;

    const col = Math.floor((px - pad) / cellSize);
    const row = Math.floor((py - pad) / cellSize);
    if (row >= 0 && row < GRID_DIM && col >= 0 && col < GRID_DIM) {
      state = injectShock(state, row, col, toQ16(0.85));
      refreshView();
    }
  });

  // Pipeline Controls
  document.getElementById("btn-baseline")?.addEventListener("click", () => {
    stopAuto();
    state = createBaselineState();
    if (els.manifestBox) els.manifestBox.value = "";
    refreshView();
  });

  document.getElementById("btn-step")?.addEventListener("click", () => {
    state = stepRelaxationCycle(state);
    refreshView();
  });

  document.getElementById("btn-step10")?.addEventListener("click", () => {
    for (let i = 0; i < 10; i++) {
      state = stepRelaxationCycle(state);
    }
    refreshView();
  });

  els.autoBtn?.addEventListener("click", () => {
    if (autoRelaxTimer) {
      stopAuto();
    } else {
      els.autoBtn.textContent = "Pause Relaxation";
      autoRelaxTimer = setInterval(() => {
        state = stepRelaxationCycle(state);
        refreshView();
      }, 160);
    }
  });

  // Battle of M2-XFE Scenario Presets
  document.querySelectorAll("[data-preset]").forEach((btn) => {
    btn.addEventListener("click", () => {
      stopAuto();
      const preset = M2XFE_BATTLE_PRESETS[btn.getAttribute("data-preset")];
      if (!preset) return;
      state = createBaselineState();
      for (const imp of preset.impulses) {
        state = injectShock(state, imp.row, imp.col, imp.magnitudeQ16);
      }
      if (els.causa) {
        els.causa.textContent = `[SCENARIO LOADED] ${preset.name}: ${preset.summary}`;
      }
      refreshView();
    });
  });

  // Provenance Receipt Exporter
  document.getElementById("btn-manifest")?.addEventListener("click", () => {
    const manifest = buildProvenanceManifest(state);
    if (els.manifestBox) {
      els.manifestBox.value = JSON.stringify(manifest, null, 2);
    }
  });

  refreshView();
}

window.addEventListener("DOMContentLoaded", initM2xfeToy);
