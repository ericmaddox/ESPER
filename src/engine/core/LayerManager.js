/**
 * ESPER 3D Geospatial Engine - Layer & Data Source Manager
 */

export class LayerManager {
  constructor(map) {
    this.map = map;
  }

  /**
   * Adds or updates a GeoJSON data source on the map
   */
  setGeoJSONSource(sourceId, geojson) {
    if (!this.map) return;
    try {
      if (this.map.getSource(sourceId)) {
        this.map.getSource(sourceId).setData(geojson);
      } else {
        this.map.addSource(sourceId, {
          type: 'geojson',
          data: geojson
        });
      }
    } catch (err) {
      console.warn(`LayerManager: Error setting GeoJSON source "${sourceId}":`, err);
    }
  }

  /**
   * Safely adds a layer definition if it does not already exist
   */
  addLayer(layerConfig) {
    if (!this.map) return;
    try {
      if (!this.map.getLayer(layerConfig.id)) {
        this.map.addLayer(layerConfig);
      }
    } catch (err) {
      console.warn(`LayerManager: Error adding layer "${layerConfig.id}":`, err);
    }
  }

  /**
   * Safely removes a layer by ID
   */
  removeLayer(layerId) {
    if (!this.map) return;
    try {
      if (this.map.getLayer(layerId)) {
        this.map.removeLayer(layerId);
      }
    } catch (err) {
      console.warn(`LayerManager: Error removing layer "${layerId}":`, err);
    }
  }

  /**
   * Safely removes a source by ID
   */
  removeSource(sourceId) {
    if (!this.map) return;
    try {
      if (this.map.getSource(sourceId)) {
        this.map.removeSource(sourceId);
      }
    } catch (err) {
      console.warn(`LayerManager: Error removing source "${sourceId}":`, err);
    }
  }

  /**
   * Toggles visibility ('visible' | 'none') of a layer
   */
  setLayerVisibility(layerId, visible) {
    if (!this.map) return;
    try {
      if (this.map.getLayer(layerId)) {
        this.map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
      }
    } catch (err) {
      console.warn(`LayerManager: Error setting layer visibility "${layerId}":`, err);
    }
  }

  /**
   * Configures 3D Building Extrusions with height-based color graduation,
   * vertical gradient ambient occlusion, and tall building highlight layer
   */
  setup3DBuildings(enabled = true, color = '#152238', edgeColor = '#00f3ff', isSatellite = false) {
    if (!this.map) return;
    const opacity = isSatellite ? 0.55 : 0.88;
    try {
      // Safely remove existing building layers first for clean recreation
      this.removeLayer('3d-buildings-edges');
      this.removeLayer('3d-buildings-tall');
      this.removeLayer('3d-buildings');

      if (!enabled) return;

      // Position buildings below text labels if road-label exists
      const beforeId = this.map.getLayer('road-label') ? 'road-label' : undefined;

      // ── Primary 3D Building Extrusions (height-graduated color ramp) ──
      this.map.addLayer({
        id: '3d-buildings',
        source: 'openmaptiles',
        'source-layer': 'building',
        type: 'fill-extrusion',
        minzoom: 12,
        paint: {
          'fill-extrusion-color': [
            'interpolate', ['linear'], ['coalesce', ['get', 'render_height'], ['get', 'height'], 10],
            0,   color,                // Ground-level: base theme color
            20,  color,                // Low-rise: same base
            60,  this._lightenHex(color, 25),  // Mid-rise: slightly brighter
            120, this._lightenHex(color, 45),  // High-rise: noticeably brighter
            250, edgeColor             // Skyscraper: accent color glow
          ],
          'fill-extrusion-height': [
            'interpolate', ['linear'], ['zoom'],
            12, 0,
            14.5, ['coalesce', ['get', 'render_height'], ['get', 'height'], 10]
          ],
          'fill-extrusion-base': [
            'interpolate', ['linear'], ['zoom'],
            12, 0,
            14.5, ['coalesce', ['get', 'render_min_height'], ['get', 'min_height'], 0]
          ],
          'fill-extrusion-opacity': opacity,
          'fill-extrusion-vertical-gradient': true
        }
      }, beforeId);

      // ── Tall Building Highlight Layer (skyscrapers > 50m get accent edge glow) ──
      this.map.addLayer({
        id: '3d-buildings-tall',
        source: 'openmaptiles',
        'source-layer': 'building',
        type: 'fill-extrusion',
        minzoom: 12,
        filter: ['>', ['coalesce', ['get', 'render_height'], ['get', 'height'], 0], 50],
        paint: {
          'fill-extrusion-color': edgeColor,
          'fill-extrusion-height': [
            'interpolate', ['linear'], ['zoom'],
            12, 0,
            14.5, ['coalesce', ['get', 'render_height'], ['get', 'height'], 10]
          ],
          'fill-extrusion-base': [
            'interpolate', ['linear'], ['zoom'],
            12, 0,
            14.5, ['coalesce', ['get', 'render_min_height'], ['get', 'min_height'], 0]
          ],
          'fill-extrusion-opacity': 0.15,
          'fill-extrusion-vertical-gradient': true
        }
      }, beforeId);

      // ── 2D Building Footprint Edge Outlines ──
      this.map.addLayer({
        id: '3d-buildings-edges',
        source: 'openmaptiles',
        'source-layer': 'building',
        type: 'line',
        minzoom: 14,
        paint: {
          'line-color': edgeColor,
          'line-width': 0.6,
          'line-opacity': 0.35
        }
      }, beforeId);

    } catch (err) {
      console.warn('LayerManager: Error setting up 3D buildings:', err);
    }
  }

  /**
   * Toggles visibility of all label layers (street names, POI, place names)
   */
  setLabelsVisibility(enabled = true) {
    const labelLayers = ['road-label', 'poi-label', 'place-label'];
    for (const layerId of labelLayers) {
      this.setLayerVisibility(layerId, enabled);
    }
  }

  /**
   * Utility: Lighten a hex color by a percentage (0-100)
   */
  _lightenHex(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, (num >> 16) + Math.round(2.55 * percent));
    const g = Math.min(255, ((num >> 8) & 0x00FF) + Math.round(2.55 * percent));
    const b = Math.min(255, (num & 0x0000FF) + Math.round(2.55 * percent));
    return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
  }
}
