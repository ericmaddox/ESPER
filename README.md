# ESPER ── 3D Geospatial Engine & Tactical Command Center

> **Blade Runner-inspired 3D geospatial mapping platform & tactical GIS command center powered by MapLibre GL JS, OpenFreeMap, AWS Terrarium DEM 3D elevation, real-time astronomical solar lighting, and multi-region telemetry.**

---

![ESPER 3D Digital Twin Command Center Viewport](./docs/hero-map.png)

---

## Overview

**ESPER** is a high-performance 3D geospatial mapping platform and digital twin engine built with zero proprietary API key dependencies. ESPER streams vector tiles, 3D building extrusions, high-resolution DEM terrain, real-time solar positioning, and live Caltrans HLS video feeds directly in the browser. 

The application architecture features a decoupled **3D Geospatial Engine (`src/engine/`)** that provides a pristine, zero-noise WebGL canvas for GIS analysis, multi-city exploration (Los Angeles, Atlanta GA, Bremen GA), drag-and-drop spatial data ingestion, and custom tactical applications.

---

### Live Tactical Video Telemetry & PTZ Controls

![Live Caltrans HLS Stream Modal](./docs/camera-stream-modal.png)

---

## Key Features

- **🌐 Modular 3D Geospatial Engine Core (`src/engine/`)**: Clean, decoupled WebGL engine providing declarative layer management (`LayerManager`), marker lifecycle tracking (`MarkerManager`), map style switching (`StyleManager`), and spatial mathematics (`geoMath`).
- **🏙️ Multi-Region Spatial Support**: Instant HUD city switching and smooth 3D camera fly-to transitions between **Greater Los Angeles**, **Atlanta Metro Area, GA**, and **Bremen & Haralson County, GA**.
- **☀️ Real-Time Astronomical Solar Lighting**: Calculates solar azimuth, altitude, and WebGL directional building lighting based on `new Date()` and real clock time — automatically updating every 60 seconds with zero manual sliders.
- **📂 Drag-and-Drop Spatial Data Ingestion**: Drag any `.geojson`, `.json`, or `.kml` file directly onto the 3D map canvas. The engine parses features, plots dynamic vector layers, and automatically fits 3D camera bounds (`map.fitBounds`).
- **📐 3D Tilt & Pitch Controls**: Direct mouse/keyboard 3D tilt (Right-Click Drag or `Ctrl + Drag`) plus quick-angle HUD buttons (`0° 2D`, `45°`, `60° 3D`, `75°`).
- **📍 Spatial Click Inspector**: Click anywhere on the 3D map or building rooftops to inspect WGS84 GPS coordinates, elevation, and reverse-geocoded addresses, with 1-click pin clearing.
- **🔍 Universal Global Address Search**: High-resolution address & landmark search powered by OpenStreetMap Nominatim with active region fallback biasing.
- **⛰️ Elevation DEM Terrain**: Real 3D terrain elevation powered by AWS Terrarium DEM raster tiles (`1.3x` exaggeration).
- **📹 150+ Live Caltrans HLS Feeds**: Direct HTTP Live Streaming (`.m3u8`) from District 7 DOT traffic cameras with `hls.js` video playback and PTZ controls.
- **🎛️ Dual Workspace Modes**: Seamlessly toggle between **`CLEAN ENGINE CANVAS`** (Pristine 3D GIS Platform) and **`DEMO SCENARIO`** (Public Safety Command Center).

---

## Tech Stack

- **Frontend Core**: React 18 + Vite 6
- **Styling**: Tailwind CSS v4 + Glassmorphism HUD Design System
- **3D Map Engine**: MapLibre GL JS 5.1
- **Tile Architecture**: OpenFreeMap Vector Tiles + AWS Terrarium DEM
- **Video Decryption**: HLS.js (`.m3u8` HTTP Live Streaming)
- **Geocoding API**: OpenStreetMap Nominatim
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
├── docs/
│   ├── hero-map.png             # Main 3D viewport screenshot
│   └── camera-stream-modal.png  # Live HLS CCTV stream modal screenshot
├── src/
│   ├── engine/                  # 🌐 Modular 3D Geospatial Engine Core
│   │   ├── core/
│   │   │   ├── EngineViewport.jsx # WebGL MapLibre 3D viewport orchestrator
│   │   │   ├── LayerManager.js   # Declarative GeoJSON & 3D extrusion layer manager
│   │   │   ├── MarkerManager.js  # Safe DOM marker & popup lifecycle manager
│   │   │   └── StyleManager.js   # Map style themes (Dark Tactical, NVG, High Contrast)
│   │   ├── math/
│   │   │   ├── geoMath.js        # Spatial math (geodesic circles, FOV cones, distance)
│   │   │   └── solarMath.js      # Astronomical solar position algorithm (azimuth/altitude)
│   │   ├── services/
│   │   │   └── geocodingService.js # OpenStreetMap Nominatim spatial search API
│   │   ├── hooks/
│   │   │   └── useEngine.js      # React hook interface for engine controls
│   │   └── index.js              # Core engine barrel exports
│   ├── components/
│   │   ├── CleanEngineCanvas.jsx # Pristine, zero-noise 3D geospatial canvas UI
│   │   ├── DragDropOverlay.jsx   # Drag-and-drop spatial file dropzone overlay
│   │   ├── EngineToolbar.jsx     # Engine controls (Terrain, 3D extrusions, themes, tilt)
│   │   ├── Header.jsx           # Top HUD navbar with workspace mode & region switcher
│   │   ├── RegionSelector.jsx   # Multi-city region dropdown selector (LA, Atlanta, Bremen)
│   │   ├── AddressSearch.jsx    # Universal global address geocoding search bar
│   │   ├── MapView.jsx          # Demo scenario 3D map viewport
│   │   ├── CommandSidebar.jsx   # Tactical dispatch panel & search
│   │   ├── LayerToolbar.jsx     # Collapsible tactical map layer toggles & presets
│   │   └── VideoFeedModal.jsx   # HLS .m3u8 video player & PTZ controls
│   ├── data/
│   │   └── mockData.js          # Multi-city presets (LA, Atlanta, Bremen) & camera feeds
│   ├── App.jsx                  # Main application orchestrator & workspace mode state
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
| **Address Search** | OpenStreetMap | Nominatim Geocoding API | None (Open Source) |

---

## License

Distributed under the MIT License. See `LICENSE` for more information.
