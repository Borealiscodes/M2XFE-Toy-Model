> ### ✅ RELEASE v1.0.0 — 9×9 SPECTRAL-TENSION TOY MODEL VERIFIED (`3/3` PASSING)
> **Status:** `v1.0.0` Live & Verified • Zero Randomness • FLOP-Bounded (`729 / 2,000 FLOPs/cycle`)  
> 
> **Release Highlights (Nov 2026):** All four pedagogical milestones (`v0.1`–`v1.0.0`) are live and verified (`node --test`: **3/3 passing** on ARM64 hardware). Features interactive 9×9 cell shock injection, three *Battle of M2-XFE* scenario presets, Neumann-boundary discrete Laplacian relaxation (`729 FLOPs/cycle`), live Dirichlet gradient energy metrics, read-only `CAUSA` diagnostics, and one-click `SHA-256` run manifest export.

# 🌌 EcoGrid M2-XFE Toy Model — 9×9 Spectral-Tension Simulation Baseline

**An interactive, pedagogical browser reconstruction of the *Battle of M2-XFE* simulation pipeline from [`Ecogrid-Manifold-Engine/runtime/simulation/m2xfe`](https://github.com)—built to make deterministic discrete PDE relaxation, compute-budget governance, and cryptographic run receipts transparent and inspectable.**

[![License: MIT](https://shields.io)](LICENSE)
[![Runtime: Zero-Bundler ESM](https://shields.io)](#-repository-structure)
[![Compute: 729 / 2000 FLOPs](https://shields.io)](#-mathematical-substrate--flop-governance)
[![Tests: 3/3 Passing](https://shields.io)](#-quickstart--verification)

---

## 🎯 Purpose & Pedagogical Scope

Complex multi-layer grid engines can feel opaque when studied only through static schemas and logs. This toy model isolates the core physics and governance invariants of the **9×9 M2-XFE spectral grid** into a self-contained browser lab with:

1. **Zero Randomness:** Identical shock coordinates and relaxation cycles yield bit-identical state trajectories across runs and hardware architectures.
2. **Strict Compute Governance (`≤ 2,000 FLOPs/cycle`):** Every relaxation step explicitly accounts for its arithmetic operations (`729 FLOPs/cycle`, well within the `2,000 FLOP` ceiling) to model edge-compute constraints.
3. **Read-Only Advisory Telemetry (`CAUSA` / `Ledger 2`):** Thermal heatmaps, scenario descriptions, and stability classifications observe the lattice without mutating kernel state (`Ledger 1`).

---

## 📐 Mathematical Substrate & FLOP Governance

### 1. Discrete State Space (`Q16.16` Fixed-Point)
The battlefield is discretized as a 2D square lattice \(\Omega = \{0, 1, \dots, 8\}^2\) of N = 81 cells. Each cell stores a signed 32-bit fixed-point scalar \(u_{i,j}^{(t)}\) in **`Q16.16` format** (\(1.0 \equiv 65536\)), eliminating IEEE-754 floating-point drift across devices:

\[\text{toQ16}(x) = \operatorname{round}(x \cdot 2^{16}), \qquad a \otimes_{Q16.16} b = \left\lfloor \frac{\operatorname{int64}(a) \cdot \operatorname{int64}(b)}{2^{16}} \right\rfloor.\]

### 2. Baseline Equilibrium & 5-Point Radial Shock Stencil
* **Baseline Run (`Calm`):** Initializes every lattice cell to uniform equilibrium \(u_{i,j}^{(0)} = u_{\text{base}} = 0.15\).
* **Shock Run (`Impact`):** Injecting a localized impulse of magnitude Δ U at (r, c) applies a compact 5-point radial stencil:

\[u_{r,c} \leftarrow \min(2.5,\, u_{r,c} + \Delta U), \qquad u_{r \pm 1,\, c},\; u_{r,\, c \pm 1} \leftarrow \min(2.5,\, u + 0.45\,\Delta U).\]

### 3. Discrete Laplacian Relaxation (Neumann Boundaries)
During each relaxation cycle t → t+1, tension ripples diffuse across the grid under **zero-flux (Neumann) boundary conditions** (\(u_{-1,j} = u_{0,j}\), \(u_{9,j} = u_{8,j}\), etc.) with Courant–Friedrichs–Lewy (CFL) diffusion rate α = 0.18 < 0.25 and radiative damping η = 0.96:

\[\Delta_h u_{i,j}^{(t)} = u_{i-1,j}^{(t)} + u_{i+1,j}^{(t)} + u_{i,j-1}^{(t)} + u_{i,j+1}^{(t)} - 4\,u_{i,j}^{(t)},\]

\[u_{i,j}^{(t+1)} = u_{\text{base}} + \eta \cdot \Bigl(\bigl(u_{i,j}^{(t)} + \alpha\,\Delta_h u_{i,j}^{(t)}\bigr) - u_{\text{base}}\Bigr).\]

### 4. Spectral Diagnostics & Exact FLOP Budget
After each step, the kernel evaluates three global invariants:
* **Peak Tension:** \(U_{\max}^{(t)} = \max_{i,j} u_{i,j}^{(t)}\)
* **Discrete Dirichlet Gradient Energy:** \(\mathcal{E}(u^{(t)}) = \frac{1}{2} \sum_{\langle p, q \rangle} \bigl(u_p^{(t)} - u_q^{(t)}\bigr)^2\) (monotonically decaying during relaxation)
* **Mean L1 Residual:** \(\bar{r}^{(t)} = \frac{1}{81} \sum_{i,j} \bigl\vert{}u_{i,j}^{(t)} - u_{\text{base}}\bigr\vert{}\)

**FLOP Governance Proof:** Each cell update requires 4 neighbor additions, 1 center shift/subtraction, 1 diffusion product (\(\alpha \cdot \Delta_h u\)), 1 baseline offset, 1 damping product (η ⋅ excess), and 1 re-anchoring addition—**9 operations per cell × 81 cells = 729 FLOPs/cycle ≤ 2,000 FLOPs**.

---

## 🧪 Pipeline Stages Modeled

1. **Manifold Schema & Adapter (`src/core.js`):** Configures the 9×9 `Q16.16` lattice and deterministic arithmetic primitives.
2. **Baseline Run (`Calm`):** Resets the manifold to uniform equilibrium (`Cycle 0`, zero Dirichlet energy).
3. **Shock Run (`Impact`):** Supports interactive cell-click impulses or preset *Battle of M2-XFE* multi-node scenarios (`Center Core Pulse`, `Dual Flank Pincer`, `Full Frontline Surge`).
4. **Relaxation Cycles (`Ripples Settling`):** Advances single steps (`+1 Cycle`), batch bursts (`+10 Cycles`), or continuous auto-relaxation.
5. **Spectral Metrics & Provenance (`Lab Notebook`):** Displays live energy decay, FLOP budget utilization, read-only `CAUSA` diagnostics, and canonical `SHA-256` run manifests.

---

## 📁 Repository Structure

```text
M2XFE-Toy-Model/
├── index.html                        # Interactive 9×9 viewport, pipeline controls & FLOP meter
├── style.css                         # Lab-notebook & spectral heatmap styling
├── package.json                      # Zero-dependency ESM manifest (`npm test` -> `node --test`)
├── LICENSE                           # MIT License
├── README.md                         # Mathematical formulation, FLOP proof & release notes
├── src/
│   ├── core.js                       # Zero-float Q16.16 arithmetic & synchronous SHA-256 receipt
│   ├── m2xfe-kernel.js               # 9×9 baseline, shock stencil, Laplacian & 2000-FLOP counter
│   ├── m2xfe-presets.js              # Declarative Battle of M2-XFE shock scenarios
│   ├── m2xfe-renderer.js             # Read-only 9×9 spectral heatmap Canvas renderer (Ledger 2)
│   └── m2xfe-app.js                  # Step/auto-relaxation loop, cell click shock & manifest exporter
└── test/
    └── m2xfe-kernel.test.mjs         # Built-in `node --test` suite verifying <=2000 FLOPs & energy decay
```

---

## 🚀 Quickstart & Verification

```bash
# 1. Run deterministic 9x9 kernel, FLOP ceiling & SHA-256 verification tests
node --test test/m2xfe-kernel.test.mjs

# 2. Launch locally in browser (Python or zero-dependency Node static server)
python3 -m http.server 8080
```

Open **`http://localhost:8080`**, click any cell on the **9×9 spectral lattice** (or load a **Battle of M2-XFE** scenario preset), step through relaxation cycles, and click **Generate Run Manifest & SHA-256** to inspect the cryptographic state digest.

---

## 🛠️ Completed Release Roadmap (`v0.1` → `v1.0.0`)

* **◈ Phase 1 (`v0.1` — Complete ✅):** Core 9×9 kernel, `Q16.16` lattice, Neumann Laplacian relaxation (`729 FLOPs/step`), and `node --test` verification.
* **◈ Phase 2 (`v0.2` — Complete ✅):** Interactive 9×9 thermal heatmap canvas and preset *Battle of M2-XFE* shock scenarios.
* **◈ Phase 3 (`v0.3` — Complete ✅):** Live Dirichlet gradient energy decay readouts, FLOP meter, and read-only `CAUSA` stability diagnostics.
* **◈ Phase 4 (`v1.0.0` — Complete ✅):** One-click canonical JSON + `SHA-256` provenance manifest export (`3/3` tests passing on ARM64).

---

## ⚠️ Governance, Provenance & License

* **Upstream Specification:** Educational reconstruction of [`Borealiscodes/Ecogrid-Manifold-Engine/runtime/simulation/m2xfe`](https://github.com) (`v0.1.0`).
* **Advisory Boundary:** `CAUSA` diagnostic notes and heatmap colors execute strictly in `Ledger 2` and remain advisory-only.
* **Author & License:** Borealis Serenity Hedling (`NDH-RESEARCH-PILOT` • Dublin, Ireland) • MIT License • `Signed-off-by: Borealis Serenity Hedling <chguard-sentinel@vaked.dev>`
