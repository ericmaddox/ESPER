/**
 * ESPER 3D Geospatial Engine - Tactical Perimeter & Cordon Tool
 * Deploys multi-tier containment zones, standoff buffers, and traffic control points
 */

import { generateTacticalPerimeterGeoJSON } from '../math/geoMath';

export class TacticalPerimeterTool {
  constructor(map, layerManager, markerManager) {
    this.map = map;
    this.layerManager = layerManager;
    this.markerManager = markerManager;
    this.activePerimeter = null;
    this.checkpointMarkers = [];
  }

  /**
   * Deploys multi-tier tactical cordon on the map
   */
  deployPerimeter(
    centerLng,
    centerLat,
    hotRadius = 150,
    warmRadius = 300,
    coldRadius = 600,
    label = 'ACTIVE CORDON'
  ) {
    if (!this.map || !this.layerManager) return;

    const geojson = generateTacticalPerimeterGeoJSON(
      centerLng,
      centerLat,
      hotRadius,
      warmRadius,
      coldRadius
    );

    const sourceId = 'tactical-perimeter-source';
    const fillLayerId = 'tactical-perimeter-fill';
    const lineLayerId = 'tactical-perimeter-line';

    // 1. Register GeoJSON Source
    this.layerManager.setGeoJSONSource(sourceId, geojson);

    // 2. Add Tactical Fill Layer
    this.layerManager.addLayer({
      id: fillLayerId,
      type: 'fill',
      source: sourceId,
      paint: {
        'fill-color': ['get', 'color'],
        'fill-opacity': ['get', 'fillOpacity']
      }
    });

    // 3. Add Tactical Boundary Lines
    this.layerManager.addLayer({
      id: lineLayerId,
      type: 'line',
      source: sourceId,
      paint: {
        'line-color': ['get', 'color'],
        'line-width': ['case', ['==', ['get', 'zone'], 'hot'], 2.5, 1.8],
        'line-opacity': 0.9,
        'line-dasharray': ['case', ['==', ['get', 'zone'], 'cold'], [3, 2], [1, 0]]
      }
    });

    // 4. Place Perimeter Center Pin
    if (this.markerManager) {
      const centerEl = document.createElement('div');
      centerEl.className = 'relative flex items-center justify-center';
      centerEl.innerHTML = `
        <div class="w-6 h-6 rounded-full bg-red-500/30 border-2 border-red-500 flex items-center justify-center animate-ping absolute"></div>
        <div class="w-3.5 h-3.5 rounded-full bg-red-500 border border-white shadow-lg relative flex items-center justify-center text-[8px] font-mono text-white font-bold">!</div>
      `;

      this.markerManager.addMarker('tactical-perimeter-center', {
        longitude: centerLng,
        latitude: centerLat,
        element: centerEl,
        popupContent: `
          <div style="font-family:monospace; padding:4px; font-size:11px; background:#090d16; color:#e2e8f0; border-radius:6px; border:1px solid rgba(239,68,68,0.4);">
            <div style="color:#ef4444; font-weight:bold; font-size:12px; margin-bottom:2px;">${label}</div>
            <div>HOT ZONE: ${hotRadius}m</div>
            <div>STAGING: ${warmRadius}m</div>
            <div>OUTER CORDON: ${coldRadius}m</div>
          </div>
        `
      });
    }

    this.activePerimeter = {
      center: [centerLng, centerLat],
      hotRadius,
      warmRadius,
      coldRadius,
      label
    };

    return this.activePerimeter;
  }

  /**
   * Clears active tactical perimeter and all associated checkpoints
   */
  clearPerimeter() {
    if (this.layerManager) {
      this.layerManager.removeLayer('tactical-perimeter-line');
      this.layerManager.removeLayer('tactical-perimeter-fill');
      this.layerManager.removeSource('tactical-perimeter-source');
    }

    if (this.markerManager) {
      this.markerManager.removeMarker('tactical-perimeter-center');
    }

    this.checkpointMarkers.forEach((m) => {
      try {
        m.remove();
      } catch (_e) {}
    });
    this.checkpointMarkers = [];
    this.activePerimeter = null;
  }

  /**
   * Returns current active perimeter state
   */
  getActivePerimeter() {
    return this.activePerimeter;
  }
}
