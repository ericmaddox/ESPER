/**
 * ESPER 3D Geospatial Engine - Map Theme & Style Manager
 */

export const MAP_STYLES = {
  DARK_TACTICAL: {
    id: 'dark-tactical',
    name: 'Dark Tactical',
    backgroundColor: '#080c16',
    skyColor: '#0a0e1a',
    horizonColor: '#0c1525',
    fogColor: '#080c16',
    waterColor: '#0a1628',
    parkColor: '#0b1a12',
    accentColor: '#00f3ff',
    style: {
      version: 8,
      name: 'ESPER Dark Tactical',
      sources: {
        openmaptiles: {
          type: 'vector',
          url: 'https://tiles.openfreemap.org/planet'
        },
        terrain: {
          type: 'raster-dem',
          tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
          tileSize: 256,
          encoding: 'terrarium',
          maxzoom: 15
        }
      },
      glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
      sprite: 'https://tiles.openfreemap.org/sprites/liberty',
      terrain: {
        source: 'terrain',
        exaggeration: 1.3
      },
      sky: {
        'sky-color': '#0a0e1a',
        'horizon-color': '#0c1525',
        'fog-color': '#080c16',
        'sky-horizon-blend': 0.5
      },
      layers: [
        { id: 'background', type: 'background', paint: { 'background-color': '#080c16' } },
        { id: 'water', type: 'fill', source: 'openmaptiles', 'source-layer': 'water', paint: { 'fill-color': '#0a1628', 'fill-opacity': 0.9 } },
        { id: 'landuse-park', type: 'fill', source: 'openmaptiles', 'source-layer': 'landuse', filter: ['in', 'class', 'park', 'cemetery', 'grass'], paint: { 'fill-color': '#0b1a12', 'fill-opacity': 0.7 } },
        { id: 'landuse-other', type: 'fill', source: 'openmaptiles', 'source-layer': 'landuse', filter: ['!in', 'class', 'park', 'cemetery', 'grass'], paint: { 'fill-color': '#0d111d', 'fill-opacity': 0.5 } },
        { id: 'landcover', type: 'fill', source: 'openmaptiles', 'source-layer': 'landcover', paint: { 'fill-color': '#0b1a12', 'fill-opacity': 0.3 } },
        { id: 'road-casing', type: 'line', source: 'openmaptiles', 'source-layer': 'transportation', filter: ['==', '$type', 'LineString'], minzoom: 10, paint: { 'line-color': '#000000', 'line-width': 2, 'line-opacity': 0.6 } },
        { id: 'road', type: 'line', source: 'openmaptiles', 'source-layer': 'transportation', filter: ['==', '$type', 'LineString'], minzoom: 8, paint: { 'line-color': '#1e293b', 'line-width': ['interpolate', ['linear'], ['zoom'], 10, 1, 15, 4, 18, 10] } },
        { id: 'road-motorway', type: 'line', source: 'openmaptiles', 'source-layer': 'transportation', filter: ['==', 'class', 'motorway'], minzoom: 6, paint: { 'line-color': '#0f2b3e', 'line-width': ['interpolate', ['linear'], ['zoom'], 6, 1, 12, 3, 16, 8] } }
      ]
    }
  },

  NIGHT_VISION: {
    id: 'night-vision',
    name: 'Night Vision (NVG)',
    backgroundColor: '#03140a',
    skyColor: '#021a0c',
    horizonColor: '#042b14',
    fogColor: '#03140a',
    waterColor: '#052912',
    parkColor: '#083a1b',
    accentColor: '#22c55e',
    style: {
      version: 8,
      name: 'ESPER Night Vision',
      sources: {
        openmaptiles: {
          type: 'vector',
          url: 'https://tiles.openfreemap.org/planet'
        },
        terrain: {
          type: 'raster-dem',
          tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
          tileSize: 256,
          encoding: 'terrarium',
          maxzoom: 15
        }
      },
      glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
      sprite: 'https://tiles.openfreemap.org/sprites/liberty',
      terrain: {
        source: 'terrain',
        exaggeration: 1.3
      },
      sky: {
        'sky-color': '#021a0c',
        'horizon-color': '#042b14',
        'fog-color': '#03140a',
        'sky-horizon-blend': 0.6
      },
      layers: [
        { id: 'background', type: 'background', paint: { 'background-color': '#03140a' } },
        { id: 'water', type: 'fill', source: 'openmaptiles', 'source-layer': 'water', paint: { 'fill-color': '#052912', 'fill-opacity': 0.9 } },
        { id: 'landuse-park', type: 'fill', source: 'openmaptiles', 'source-layer': 'landuse', filter: ['in', 'class', 'park', 'cemetery', 'grass'], paint: { 'fill-color': '#083a1b', 'fill-opacity': 0.7 } },
        { id: 'road', type: 'line', source: 'openmaptiles', 'source-layer': 'transportation', filter: ['==', '$type', 'LineString'], minzoom: 8, paint: { 'line-color': '#0a4220', 'line-width': ['interpolate', ['linear'], ['zoom'], 10, 1, 15, 4, 18, 10] } }
      ]
    }
  },

  HIGH_CONTRAST: {
    id: 'high-contrast',
    name: 'High Contrast',
    backgroundColor: '#020617',
    skyColor: '#0f172a',
    horizonColor: '#1e293b',
    fogColor: '#020617',
    waterColor: '#0284c7',
    parkColor: '#064e3b',
    accentColor: '#f59e0b',
    style: {
      version: 8,
      name: 'ESPER High Contrast',
      sources: {
        openmaptiles: {
          type: 'vector',
          url: 'https://tiles.openfreemap.org/planet'
        },
        terrain: {
          type: 'raster-dem',
          tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
          tileSize: 256,
          encoding: 'terrarium',
          maxzoom: 15
        }
      },
      glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
      sprite: 'https://tiles.openfreemap.org/sprites/liberty',
      terrain: {
        source: 'terrain',
        exaggeration: 1.3
      },
      sky: {
        'sky-color': '#0f172a',
        'horizon-color': '#1e293b',
        'fog-color': '#020617',
        'sky-horizon-blend': 0.4
      },
      layers: [
        { id: 'background', type: 'background', paint: { 'background-color': '#020617' } },
        { id: 'water', type: 'fill', source: 'openmaptiles', 'source-layer': 'water', paint: { 'fill-color': '#0284c7', 'fill-opacity': 0.85 } },
        { id: 'landuse-park', type: 'fill', source: 'openmaptiles', 'source-layer': 'landuse', filter: ['in', 'class', 'park', 'cemetery', 'grass'], paint: { 'fill-color': '#064e3b', 'fill-opacity': 0.6 } },
        { id: 'road', type: 'line', source: 'openmaptiles', 'source-layer': 'transportation', filter: ['==', '$type', 'LineString'], minzoom: 8, paint: { 'line-color': '#334155', 'line-width': ['interpolate', ['linear'], ['zoom'], 10, 1, 15, 4, 18, 10] } }
      ]
    }
  }
};
