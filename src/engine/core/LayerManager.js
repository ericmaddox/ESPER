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
   * Configures 3D Building Extrusions and Wireframe Edge layers
   */
  setup3DBuildings(enabled = true, color = '#152238') {
    if (!this.map) return;
    try {
      if (!this.map.getLayer('3d-buildings')) {
        this.map.addLayer({
          id: '3d-buildings',
          source: 'openmaptiles',
          'source-layer': 'building',
          type: 'fill-extrusion',
          minzoom: 13,
          paint: {
            'fill-extrusion-color': color,
            'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 13, 0, 15, ['get', 'render_height']],
            'fill-extrusion-base': ['get', 'render_min_height'],
            'fill-extrusion-opacity': 0.85
          }
        });
      }

      if (!this.map.getLayer('3d-buildings-edges')) {
        this.map.addLayer({
          id: '3d-buildings-edges',
          source: 'openmaptiles',
          'source-layer': 'building',
          type: 'line',
          minzoom: 14,
          paint: {
            'line-color': '#00f3ff',
            'line-width': 1,
            'line-opacity': 0.35
          }
        });
      }

      this.setLayerVisibility('3d-buildings', enabled);
      this.setLayerVisibility('3d-buildings-edges', enabled);
    } catch (err) {
      console.warn('LayerManager: Error setting up 3D buildings:', err);
    }
  }
}
