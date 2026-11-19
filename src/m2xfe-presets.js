/**
 * src/m2xfe-presets.js — Declarative "Battle of M2-XFE" Shock Scenarios
 * Provides reproducible multi-point impulse presets for pedagogical exploration.
 *
 * Signed-off-by: Borealis Serenity Hedling <chguard-sentinel@vaked.dev>
 */

import { toQ16 } from "./core.js";

export const M2XFE_BATTLE_PRESETS = {
  centerPulse: {
    id: "centerPulse",
    name: "1. Center Core Impulse (4, 4)",
    summary: "Single symmetric shock at the manifold center demonstrating radial Neumann diffusion.",
    impulses: [{ row: 4, col: 4, magnitudeQ16: toQ16(1.0) }],
  },
  flankPincer: {
    id: "flankPincer",
    name: "2. Dual Flank Pincer (2, 1) & (6, 7)",
    summary: "Asymmetric opposing shocks generating constructive wave interference across the central ridge.",
    impulses: [
      { row: 2, col: 1, magnitudeQ16: toQ16(0.9) },
      { row: 6, col: 7, magnitudeQ16: toQ16(0.9) },
    ],
  },
  battleFrontline: {
    id: "battleFrontline",
    name: "3. Battle of M2-XFE — Full Frontline Surge",
    summary: "Three-node cascading shock along the diagonal corridor testing rapid Dirichlet energy dissipation.",
    impulses: [
      { row: 1, col: 2, magnitudeQ16: toQ16(0.85) },
      { row: 4, col: 4, magnitudeQ16: toQ16(1.1) },
      { row: 7, col: 6, magnitudeQ16: toQ16(0.85) },
    ],
  },
};
