# ESPER ── Los Angeles 3D Digital Twin Command Center

> **Blade Runner-inspired 3D situational awareness & tactical GIS command center for Los Angeles, powered by MapLibre GL JS, OpenFreeMap, and live Caltrans DOT stream telemetry.**

---

## Overview

**ESPER** is a real-time, interactive 3D digital twin public safety platform designed for high-density urban situational awareness. Built with zero proprietary API key dependencies, ESPER streams vector tiles, 3D building extrusions, high-resolution DEM terrain, and live Caltrans HLS video feeds directly in the browser.

---

## Key Features

- **3D Urban Viewport**: Rendered using MapLibre GL JS with custom dark tactical styling and OpenFreeMap open-source vector tiles.
- **Elevation DEM Terrain**: Real 3D terrain elevation for the Los Angeles basin, Hollywood Hills, Griffith Park, and Santa Monica Mountains using AWS Terrarium DEM tiles.
- **150+ Live Caltrans HLS Feeds**: Direct HTTP Live Streaming (`.m3u8`) integration from Caltrans District 7 (Los Angeles & Ventura County) traffic cameras with cross-browser `hls.js` decryption.
- **Tactical Video Player**: Interactive PTZ controls (Pan, Tilt, Zoom) with Heads-Up Display (HUD) telemetry overlays and automatic live-snapshot fallback.
- **Interactive 3D Vision Cones**: GeoJSON-powered field-of-view (FOV) frustums projected onto the 3D map for every CCTV node.
- **Live Dispatch & Unit Tracking**: Real-time position tracking and telemetry for airborne LAPD Air Support (`AIR-1`) and ground units (`UNIT-12`, `ENG-11`).
- **Tactical Command Interface**: Glassmorphism sidebars, incident prioritization badges, preset location fly-overs, and full-screen tactical modes.

---

## Tech Stack

- **Frontend Core**: React 18 + Vite
- **Styling**: Tailwind CSS v4 + Glassmorphism HUD Design System
- **3D Map Engine**: MapLibre GL JS 5.1
- **Tile Architecture**: OpenFreeMap Vector Tiles + AWS Terrarium DEM
- **Video Decryption**: HLS.js (`.m3u8` HTTP Live Streaming)
- **Icons**: Lucide React

---

## Getting Started

### Prerequisites

- **Node.js**: `v18.0.0` or higher
- **npm**: `v9.0.0` or higher

### Installation

```bash
# Clone the repository
git clone https://github.com/ericmaddox/ESPER.git

# Navigate to project directory
cd ESPER

# Install dependencies
npm install
```

### Local Development

Launch the development server:

```bash
npm run dev
```

Open your browser and navigate to `http://localhost:5173`.

### Production Build

Compile the production-ready bundle:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

---

## Architecture & Project Structure

```
ESPER/
├── src/
│   ├── components/
│   │   ├── Header.jsx           # Top HUD navbar with metrics & clock
│   │   ├── MapView.jsx          # MapLibre GL JS 3D viewport & markers
│   │   ├── CommandSidebar.jsx   # Tactical dispatch panel & search
│   │   ├── LayerToolbar.jsx     # Tactical map layer toggles & presets
│   │   └── VideoFeedModal.jsx   # HLS .m3u8 video player & PTZ controls
│   ├── data/
│   │   └── mockData.js          # Scraped Caltrans D7 camera & incident feeds
│   ├── App.jsx                  # Main state orchestrator
│   ├── index.css                # Global styles, glassmorphism & HUD overlays
│   └── main.jsx                 # Application entrypoint
├── index.html                   # HTML shell & font definitions
├── vite.config.js               # Vite build configuration
└── package.json                 # Project dependencies & scripts
```

---

## Live Data Sources

| Data Stream | Provider | Format | Authentication |
|---|---|---|---|
| **Vector Tiles** | OpenFreeMap | OpenMapTiles Protocol | None (Open Source) |
| **Terrain DEM** | AWS Open Data | Terrarium PNG DEM | None (Public Domain) |
| **CCTV Video** | Caltrans District 7 | HLS (`.m3u8`) | None (Public DOT) |

---

## License

Distributed under the MIT License. See `LICENSE` for more information.
