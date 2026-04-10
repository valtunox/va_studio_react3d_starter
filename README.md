<p align="center">
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=white" alt="React 18" />
  <img src="https://img.shields.io/badge/Three.js-r170-000000?style=for-the-badge&logo=threedotjs&logoColor=white" alt="Three.js" />
  <img src="https://img.shields.io/badge/React_Three_Fiber-8-000000?style=for-the-badge&logo=threedotjs&logoColor=white" alt="R3F" />
  <img src="https://img.shields.io/badge/Vite-6-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite 6" />
  <img src="https://img.shields.io/badge/Use_Cases-14-8B5CF6?style=for-the-badge" alt="14 Use Cases" />
  <img src="https://img.shields.io/badge/License-MIT-22C55E?style=for-the-badge" alt="MIT License" />
</p>

<h1 align="center">🌐 VA Studio React 3D Starter</h1>

<p align="center">
  <strong>14 interactive 3D visualizations and games — globes, simulations, and playable experiences — all in one starter.</strong>
</p>

<p align="center">
  Part of the <a href="https://github.com/valtunox">VA Studio</a> open-source vibe coding platform.<br/>
  Build full-stack apps with AI through natural language — frontend, backend, and now 3D.
</p>

<p align="center">
  <a href="#-quick-start">Quick Start</a> &bull;
  <a href="#-use-cases">Use Cases</a> &bull;
  <a href="#-features">Features</a> &bull;
  <a href="#%EF%B8%8F-tech-stack">Tech Stack</a> &bull;
  <a href="#-the-va-studio-ecosystem">Ecosystem</a> &bull;
  <a href="#-contributing">Contributing</a>
</p>

---

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/valtunox/va_studio_react3d_starter.git
cd va_studio_react3d_starter

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3011](http://localhost:3011) and use the use-case switcher on the right side to browse all 14 visualizations.

---

## 🎮 Use Cases

### 🌍 Globe Visualizations

| Use Case | Description |
|:---------|:------------|
| **Earth Explorer** | Geographic explorer with country polygons, city markers, zoom, and heatmap overlays |
| **Health Monitor** | Global health dashboard with WHO regions, outbreak tracking, and supply chain routes |
| **Global Markets** | Financial markets visualization with stock exchanges, GDP data, and capital flow arcs |
| **Orbital Sim** | Space simulation with satellites, ISS tracking, and orbital debris fields |

### 🔬 3D Simulations

| Use Case | Description |
|:---------|:------------|
| **Robotics Lab** | Industrial 6-DOF robot arm with conveyor belt, AGV fleet, and programmable motion sequences |
| **Cardiology** | Anatomical 3D beating heart with real-time ECG, blood flow particles, and chamber anatomy |
| **Nutrition** | Interactive digestive system with nutrient particle flow and meal builder interface |
| **Chip Architecture** | AI chip die visualization with core grids, data flow paths, and GPU/TPU/CPU/NPU presets |
| **Data Center** | 3D server rack environment with heat map overlays, network traffic, and cooling simulation |

### 🕹️ Games

| Use Case | Description |
|:---------|:------------|
| **Creature Battle** | Turn-based RPG combat with animated creatures and ability systems |
| **Chess** | Full 3D chess board with AI opponent |
| **Blackjack** | Casino-style card game with 3D card animations |
| **Tower Stacker** | Physics-based block stacking with slice mechanics and combo scoring |
| **Memory Match** | Chip-themed 3D memory card matching game |

---

## ✨ Features

- **14 Self-Contained Use Cases** — Each visualization is a complete, independent module
- **Lazy Loading** — Every use case is code-split for fast initial page load
- **Use-Case Switcher** — Sticky right-side panel to browse and switch instantly at runtime
- **Globe + 3D Engine** — Dual rendering: `react-globe.gl` for geographic data, `@react-three/fiber` for 3D scenes
- **Dark Space Aesthetic** — Deep-space dark theme with violet accent glow across all use cases
- **D3 Integration** — TopoJSON + D3 for geographic data processing and projections
- **Zero API Dependencies** — All use cases run with built-in mock data, ready to connect to your backend
- **Backend Proxy** — Pre-configured Vite proxy to `localhost:5112` for seamless [VA Studio Backend](https://github.com/valtunox/va_studio_backend_starter) integration

---

## ⚙️ Tech Stack

| Layer | Technology |
|:------|:-----------|
| **Framework** | React 18 |
| **3D Engine** | Three.js r170 + @react-three/fiber 8 + @react-three/drei 9 |
| **Globe** | react-globe.gl 2.27 |
| **Data Viz** | D3 7 + TopoJSON Client |
| **Build** | Vite 6 |
| **Styling** | Tailwind CSS 3.4 |
| **Icons** | Lucide React |
| **Fonts** | Inter (Google Fonts) |

---

## 📁 Project Structure

```
va_studio_react3d_starter/
├── src/
│   ├── App.jsx                     # Router + use-case registry (lazy loading)
│   ├── main.jsx                    # React entry point
│   ├── index.css                   # Global styles + Tailwind
│   ├── components/
│   │   └── UsecaseSwitcher.jsx     # Right-side panel for switching use cases
│   └── usecases/                   # 14 self-contained 3D use cases
│       ├── earth/                  # 🌍 Geographic explorer
│       ├── health/                 # 🏥 Health monitor
│       ├── finance/                # 💹 Global markets
│       ├── simulation/             # 🛰️ Orbital simulation
│       ├── robotics/               # 🤖 Robotics lab
│       ├── cardiology/             # 🫀 Heart visualization
│       ├── nutrition/              # 🥗 Digestive system
│       ├── chiparch/               # 🧠 Chip architecture
│       ├── datacenter/             # 🏢 Data center
│       ├── game-pokemon/           # ⚔️ Creature battle
│       ├── game-chess/             # ♟ 3D chess
│       ├── game-cards/             # 🃏 Blackjack
│       ├── game-physics/           # 🏗️ Tower stacker
│       └── game-memory/            # 🧩 Memory match
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
└── postcss.config.js
```

---

## ➕ Adding a New Use Case

1. Create a new directory under `src/usecases/`:

```bash
mkdir src/usecases/myusecase
```

2. Create `src/usecases/myusecase/App.jsx`:

```jsx
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'

export default function MyUsecase() {
  return (
    <div className="w-full h-screen bg-[#000011]">
      <Canvas camera={{ position: [0, 2, 5] }}>
        <ambientLight intensity={0.5} />
        <OrbitControls />
        {/* Your 3D content */}
        <mesh>
          <boxGeometry />
          <meshStandardMaterial color="mediumpurple" />
        </mesh>
      </Canvas>
    </div>
  )
}
```

3. Register it in `src/App.jsx`:

```js
const usecases = {
  // ...existing use cases
  myusecase: lazy(() => import('./usecases/myusecase/App.jsx')),
}
```

4. Add it to `src/components/UsecaseSwitcher.jsx`:

```js
{ id: 'myusecase', label: 'My Usecase', icon: '🎯', desc: 'Short description' },
```

---

## 📜 Scripts

```bash
npm run dev       # Start dev server on port 3011
npm run build     # Production build to /build
npm run preview   # Preview production build locally
```

---

## 🌐 The VA Studio Ecosystem

VA Studio is an open-source **vibe coding** platform — build full-stack applications through AI and natural language. The ecosystem has three starter repos, each independently useful and designed to work together:

| Repository | Description | Stack |
|:-----------|:------------|:------|
| [**va_studio_frontend_starter**](https://github.com/valtunox/va_studio_frontend_starter) | 20 production-ready React UI templates — SaaS, dashboard, CRM, e-commerce, and more | React 18, Vite, Tailwind CSS, shadcn/ui |
| [**va_studio_backend_starter**](https://github.com/valtunox/va_studio_backend_starter) | Multi-use-case FastAPI backend — auth, billing, blog, AI agents, analytics | FastAPI, PostgreSQL, Redis, Celery |
| **va_studio_react3d_starter** _(you are here)_ | 14 interactive 3D visualizations and games — globes, simulations, playable experiences | React 18, Three.js, R3F, D3 |

### How They Connect

```
┌─────────────────────────────────────────────────────────────┐
│                     VA Studio Platform                       │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │   Frontend    │  │   React 3D   │  │     Backend      │   │
│  │   Starter     │  │   Starter    │  │     Starter      │   │
│  │              │  │              │  │                  │   │
│  │  20 UI       │  │  14 3D       │  │  FastAPI +       │   │
│  │  Templates   │  │  Use Cases   │  │  PostgreSQL      │   │
│  │  :3008       │  │  :3011       │  │  :5112           │   │
│  └──────┬───────┘  └──────┬───────┘  └────────▲─────────┘   │
│         │                 │                    │             │
│         └─────────────────┴────────────────────┘             │
│                     API Proxy (/api)                          │
└─────────────────────────────────────────────────────────────┘
```

Each starter works standalone. Pair any frontend with the backend for a full-stack app.

---

## 🤝 Contributing

Contributions are welcome! Whether it's a new 3D use case, a bug fix, or a performance improvement — we'd love your help.

1. Fork the repository
2. Create your feature branch (`git checkout -b feat/amazing-usecase`)
3. Commit your changes (`git commit -m 'feat: add amazing 3D usecase'`)
4. Push to the branch (`git push origin feat/amazing-usecase`)
5. Open a Pull Request

### 💡 Contribution Ideas

- New 3D use cases (weather, astronomy, architecture, music visualizer, etc.)
- WebXR / VR support for existing use cases
- Performance optimizations (instanced meshes, LOD, GPU compute)
- Mobile touch controls and responsive layouts
- Accessibility improvements
- Additional game modes or mechanics
- Shader effects and post-processing

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

<p align="center">
  Built with 💜 by the <a href="https://github.com/valtunox">VA Studio</a> team and contributors.
</p>
