# 🏮 Lan Giao Bánh Chưng — Tết Dân Gian Remix (3D Web Game)

> 🏆 **Creativity Award Winner — IT Game Jam HUSC 2026**  
> Built in **2.5 hours (150 minutes)** by a **3-member team** under the theme *"Dân Gian Remix"* (Vietnamese Folklore Remix).

🎮 **Play Live:** https://meocam-lazy.github.io/Lan-giao-banh-chung/

<!-- Sau này chụp 1-2 ảnh gameplay bỏ vào thư mục docs/ rồi mở dòng dưới -->
<!-- ![Gameplay Preview](docs/preview.png) -->

---

## 💡 The Idea & Creative Mashup

Instead of building a static folklore quiz or generic 2D runner, our team remixed three cultural hooks into one fast-paced arcade loop:

1. **Arcade Shipper Loop:** Timed delivery mechanics under traffic pressure.
2. **Vietnamese Tết Folklore:** New Year's Eve (`23:50 → 00:00`) atmosphere with Bánh Chưng, Peach/Apricot Blossoms, Lucky Money, Red Lanterns, and roaming **3D Lion Dance troupes (Múa Lân)**.
3. **Vietnamese Internet Meme ("Lan đạp xe 300km/h"):** Turning the viral bicycle-speed meme into the core player fantasy — cycling at breakneck speed through festive streets to deliver offerings before midnight.

---

## 🧠 Product & Technical Decisions

Within a strict **2.5-hour hackathon window**, every engineering choice was an intentional trade-off:

- **Web-Based & Zero-Build (Accessibility First):** Built with native ES Modules and deployed directly on GitHub Pages (`.nojekyll`). Judges and players can click the link and play immediately in the browser with zero downloads or setup friction.
- **3D with Three.js (`three@0.180.0`) for Visual Differentiation:** While most jam entries default to 2D under tight time limits, choosing 3D delivered immediate visual depth and memorability.
- **Smart Asset Strategy — Polyfork Kit + Procedural Tết Props:** Rather than spending 2 hours modeling buildings in Blender, we used modular `.mjs` urban assets from **Polyfork** (`Little Tokyo Kit`) as our base canvas, then wrote **custom procedural 3D Vietnamese Tết props** (`src/tet_props.js` — sin-wave Lion Dance troupes, Bánh Chưng, lanterns, and 3D fireworks) to transform the cultural identity of the scene.
- **Draw-Call Batching & Smooth Browser FPS:** The 57-part urban environment (`524` scene placements via `buildKit`) is statically merged into minimal draw calls, paired with custom `stage('dusk')` lighting and convex-hull collision (`place.blocked`).
- **Zero-Asset Procedural Audio (`src/audio.js`):** Synthesized Vietnamese pentatonic remix BGM, lion drums, bike bells, and fireworks directly via the **Web Audio API** — zero external `.mp3`/`.wav` assets.
- **Spec-Driven AI Workflow (`GAME_SPEC.md`):** Anchored the 5-pillar game design, color palette, and scope boundaries in a single spec document so our 3-person team could orchestrate AI-assisted engineering rapidly without context drift.

---

## 🎮 Gameplay & Controls

- **Core Loop (`90s` countdown from `23:50` to `00:00`):** Walk to the bicycle (`ON_FOOT`) → Ride (`ON_BIKE`) → Pick up Tết offerings → Dodge taxis & vans → Deliver to glowing houses.
- **Signature Twist:** Approach the roaming Red/Gold **3D Lion Dance troupes** and press **`Space`** to trigger **Phúc Lộc Tết** — restoring 100% offering freshness, launching 3D fireworks, and activating a `2×` score multiplier for 8 seconds.

| Key | Action |
| :--- | :--- |
| `W A S D` / `Arrow Keys` | Move / Steer & Ride |
| `Space` | Interact with Lion Dance / Ring Bell / Trigger Bonus |
| `F2` | Jump to Midnight Climax (`23:58`) |
| `R` | Restart Run |
| `M` | Toggle Procedural Audio |

---

## 🏗️ Project Architecture

```text
├── index.html          # Semantic Tết HUD, live 2D Minimap canvas & overlays
├── style.css           # Festive palette (#E11D48, #FACC15, #16A34A, #0F172A)
├── GAME_SPEC.md        # Single-source-of-truth spec for 150-minute rapid delivery
├── assets/             # Modular 3D urban kit sourced from Polyfork (.mjs modules)
└── src/
    ├── game.js         # Core loop (rAF), FSM (ON_FOOT/ON_BIKE), physics, traffic & scoring
    ├── tet_props.js    # Procedural 3D Vietnamese Tết props (Lion Dance, Bánh Chưng, Fireworks)
    └── audio.js        # Procedural Web Audio API synthesizer (Pentatonic Remix & SFX)
```

---

## 🚀 Run Locally

Serve the directory with any static HTTP server (required for native ES Modules):

```bash
# Python
python -m http.server 8000

# or Node.js
npx serve .
```

Open `http://localhost:8000` in your browser.

---

## 📜 Credits & Licensing

- **3D Urban Base Kit:** *Little Tokyo Kit* by [Polyfork](https://polyfork.dev/kit/japanese-suburban-city-street-baa482). Full model attributions and license terms are preserved in [`assets/CREDITS.txt`](./assets/CREDITS.txt) and [`assets/LICENSE.txt`](./assets/LICENSE.txt). *(Included strictly to run the live web game demo; please do not redistribute `assets/` as a standalone asset pack.)*
- **Game Logic, Procedural Tết 3D Props & Procedural Web Audio:** Built by our 3-member team at **IT Game Jam HUSC 2026**.
