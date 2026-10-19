# SIH 26247: AI-Enabled Drone & Counter-Drone Threat Simulation Trainer

[![SIH Problem Statement 26247](https://img.shields.io/badge/SIH%202024-Problem%2026247-blue.svg)](https://sih.gov.in)
[![Ministry of Defence](https://img.shields.io/badge/Sponsor-Ministry%20of%20Defence-003366.svg)](#)
[![DSSC](https://img.shields.io/badge/Department-Defence%20Services%20Staff%20College-darkgreen.svg)](#)
[![Architecture](https://img.shields.io/badge/Architecture-Local--First%20%2F%20Zero--Hardware%20Dep-orange.svg)](#)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

> **Software-based simulation platform to train defence personnel in recognizing, classifying, and responding to drone/swarm threats across varied, realistic scenarios with zero specialized hardware dependency.**

---

## 📌 Problem Statement Overview (PS ID: 26247)
* **Organization:** Ministry of Defence (MoD)
* **Department:** Defence Services Staff College (DSSC)
* **Category:** Software
* **Theme:** Robotics and Drones

### The Operational Challenge
Recent conflicts demonstrate that low-cost commercial and military-grade drones—deployed individually and in coordinated swarms—have become decisive tactical factors. Existing training relies heavily on classroom lectures and limited live-fire drills, which are:
* **Costly:** Destroying target drones per drill is economically unsustainable at scale.
* **Weather-Dependent:** High winds, rain, or low visibility cancel physical field drills.
* **Lacks Repetition:** Units do not get the hundreds of daily decision repetitions needed to build fast cognitive recognition.

---

## 🎯 Solution Architecture & Core Features

This platform provides a high-repetition, unit-deployable synthetic training environment that runs on standard laptops without requiring VR headsets, physical sensors, or external GPU servers.

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                       SIMULATOR ARCHITECTURE & TRAINING PIPELINE                        │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│  1. PROCEDURAL SCENARIO DNA ENGINE                                                      │
│     • Seed-reproducible 3D & 2D tactical arenas                                         │
│     • Day/Night, Urban/Rural/Open/Infrastructure terrains                               │
│     • Synthetic degraded sensor conditions (Noise, Visibility, Sensor Health)           │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│  2. MULTI-SENSOR PERCEPTION SUITE                                                       │
│     • Synthetic Radar PPI Scope (Range, bearing, velocity vectors)                      │
│     • Visual EO Feed (Optical daylight/night surveillance)                              │
│     • Thermal-like LWIR Feed (Heat signature contrast)                                  │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│  3. DECISION-TREE BASED EVALUATION CORE                                                 │
│     • Detection Latency: Response time from target entry to acquisition                 │
│     • Classification Accuracy: Multi-class assessment (Benign / Unknown / Unusual)      │
│     • Tactical Action Alignment: Abstract engagement decisions (Monitor/Escalate/Resolve│
│     • Confidence Calibration: Penalties for over-confident incorrect answers            │
│     • Track Continuity: Rewarding continuous track maintenance through dropouts         │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│  4. AFTER-ACTION REVIEW (AAR) & UNIT ANALYTICS                                          │
│     • Keyframe replay and millisecond-accurate timeline event logs                      │
│     • Automated strengths and mistakes coaching diagnostics                             │
│     • Unit-level longitudinal skill retention tracking over repeated sessions           │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## ⚡ 1-Click Quickstart (Run Immediately)

### Option A: Python 1-Click Launcher (Zero Node/npm Dependencies Required)
If you have Python installed on your machine, launch the complete interactive trainer with one command:
```bash
python3 launch_demo.py
```
*Automatically serves the trainer at `http://127.0.0.1:8080` and opens your default browser.*

### Option B: Node / Vite Web Experience
For full Babylon.js 3D WebGL/WebGPU desktop rendering:
```bash
npm install
npm run dev
```

---

## 📂 Repository Structure

```
├── launch_demo.py              # Zero-dependency 1-click Python demo launcher
├── mobile-demo/                # Standalone lightweight canvas trainer (runs offline anywhere)
│   └── index.html              # Complete self-contained training cockpit
├── docs/                       # Technical specs, scoring algorithms, and AAR blueprints
│   ├── aar.md                  # After-Action Review architecture
│   ├── scoring.md              # Deterministic scoring formulations
│   ├── simulation.md           # Fixed-step procedural simulation engine
│   └── v5-architecture.md      # Data boundaries and persistence model
├── public/                     # Static media clips and web manifests
├── src/                        # Full React 19 + TypeScript + Babylon.js source code
│   ├── components/             # Tactical UI panels, Radar scope, AAR replay views
│   ├── simulation/             # Procedural generator, scoring, local classifier
│   └── store/                  # Client-side state management (Zustand & Dexie DB)
├── server/                     # Optional local loopback sync API
└── tests/                      # Automated test suite (scoring, tracking, fusion)
```

---

## 🛡️ Alignment with DSSC / MoD Evaluation Rubric

1. **Deterministic, Cheat-Proof Scoring:** Ground truth entity classifications are strictly decoupled from trainee responses. Trainee guesses can never mutate the scenario ground truth.
2. **Anti-Rote Learning (Seeded DNA):** Every training session generates randomized trajectories and noise perturbations derived from pseudorandom seeds, ensuring personnel cannot memorize patterns.
3. **Unit-Level Accessibility:** Built with local-first persistence (IndexedDB / Dexie), allowing deployed units in forward areas without internet connectivity to train seamlessly.

---

## 📄 License
This project is open-source under the [MIT License](LICENSE).
