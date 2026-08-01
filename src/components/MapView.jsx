import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import maplibregl from 'maplibre-gl';

// Custom dark style built on top of OpenFreeMap tiles
const DARK_STYLE = {
  version: 8,
  name: 'VirtualScape Dark',
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
    // Background
    {
      id: 'background',
      type: 'background',
      paint: { 'background-color': '#080c16' }
    },
    // Water
    {
      id: 'water',
      type: 'fill',
      source: 'openmaptiles',
      'source-layer': 'water',
      paint: { 'fill-color': '#0a1628', 'fill-opacity': 0.9 }
    },
    // Land use (parks, etc.)
    {
      id: 'landuse-park',
      type: 'fill',
      source: 'openmaptiles',
      'source-layer': 'landuse',
      filter: ['in', 'class', 'park', 'cemetery', 'grass'],
      paint: { 'fill-color': '#0b1a12', 'fill-opacity': 0.7 }
    },
    {
      id: 'landuse-other',
      type: 'fill',
      source: 'openmaptiles',
      'source-layer': 'landuse',
      filter: ['!in', 'class', 'park', 'cemetery', 'grass'],
      paint: { 'fill-color': '#0d111d', 'fill-opacity': 0.5 }
    },
    // Land cover
    {
      id: 'landcover',
      type: 'fill',
      source: 'openmaptiles',
      'source-layer': 'landcover',
      paint: { 'fill-color': '#0b1a12', 'fill-opacity': 0.3 }
    },
    // Roads — casing (dark outline)
    {
      id: 'road-casing',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'transportation',
      filter: ['==', '$type', 'LineString'],
      minzoom: 10,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': '#0d1425',
        'line-width': ['interpolate', ['exponential', 1.5], ['zoom'], 10, 1, 18, 18],
        'line-opacity': 0.6
      }
    },
    // Roads — fill
    {
      id: 'road',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'transportation',
      filter: ['==', '$type', 'LineString'],
      minzoom: 10,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': [
          'match', ['get', 'class'],
          'motorway', '#142240',
          'trunk', '#131d36',
          'primary', '#111a2e',
          'secondary', '#0f1726',
          'tertiary', '#0d1420',
          '#0c1220'
        ],
        'line-width': ['interpolate', ['exponential', 1.5], ['zoom'], 10, 0.5, 18, 14],
        'line-opacity': 0.85
      }
    },
    // Highway glow lines
    {
      id: 'road-motorway-glow',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'transportation',
      filter: ['in', 'class', 'motorway', 'trunk'],
      minzoom: 8,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': '#0e4d6e',
        'line-width': ['interpolate', ['exponential', 1.5], ['zoom'], 8, 0.5, 18, 3],
        'line-opacity': 0.5,
        'line-blur': 3
      }
    },
    // Building footprints (2D flat, dark)
    {
      id: 'building-2d',
      type: 'fill',
      source: 'openmaptiles',
      'source-layer': 'building',
      minzoom: 13,
      maxzoom: 14,
      paint: {
        'fill-color': '#0e1a30',
        'fill-opacity': 0.7,
        'fill-outline-color': '#162545'
      }
    },
    // 3D Buildings — the main feature
    {
      id: '3d-buildings',
      type: 'fill-extrusion',
      source: 'openmaptiles',
      'source-layer': 'building',
      minzoom: 14,
      paint: {
        'fill-extrusion-color': [
          'interpolate', ['linear'],
          ['coalesce', ['get', 'render_height'], 10],
          0, '#0c1a30',
          10, '#0e2445',
          25, '#0d6080',
          50, '#0891b2',
          100, '#06b6d4',
          200, '#22d3ee',
          350, '#67e8f9'
        ],
        'fill-extrusion-height': [
          'coalesce', ['get', 'render_height'], 10
        ],
        'fill-extrusion-base': [
          'coalesce', ['get', 'render_min_height'], 0
        ],
        'fill-extrusion-opacity': 0.88
      }
    },
    // Building edges glow
    {
      id: '3d-buildings-edges',
      type: 'fill-extrusion',
      source: 'openmaptiles',
      'source-layer': 'building',
      minzoom: 15,
      paint: {
        'fill-extrusion-color': '#0ea5e9',
        'fill-extrusion-height': [
          'coalesce', ['get', 'render_height'], 10
        ],
        'fill-extrusion-base': [
          '-', ['coalesce', ['get', 'render_height'], 10], 1
        ],
        'fill-extrusion-opacity': 0.25
      }
    },
    // Road labels
    {
      id: 'road-label',
      type: 'symbol',
      source: 'openmaptiles',
      'source-layer': 'transportation_name',
      minzoom: 14,
      layout: {
        'text-field': '{name}',
        'text-font': ['Noto Sans Regular'],
        'text-size': 10,
        'symbol-placement': 'line',
        'text-max-angle': 30
      },
      paint: {
        'text-color': '#3b5998',
        'text-halo-color': '#080c16',
        'text-halo-width': 1.5,
        'text-opacity': 0.7
      }
    },
    // Place labels (neighborhoods, cities)
    {
      id: 'place-label',
      type: 'symbol',
      source: 'openmaptiles',
      'source-layer': 'place',
      minzoom: 10,
      layout: {
        'text-field': '{name}',
        'text-font': ['Noto Sans Bold'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 10, 11, 16, 16],
        'text-transform': 'uppercase',
        'text-letter-spacing': 0.1,
        'text-max-width': 8
      },
      paint: {
        'text-color': '#3888c8',
        'text-halo-color': '#080c16',
        'text-halo-width': 2,
        'text-opacity': 0.8
      }
    },
    // POI labels
    {
      id: 'poi-label',
      type: 'symbol',
      source: 'openmaptiles',
      'source-layer': 'poi',
      minzoom: 15,
      layout: {
        'text-field': '{name}',
        'text-font': ['Noto Sans Regular'],
        'text-size': 9,
        'text-max-width': 7
      },
      paint: {
        'text-color': '#4a6e9e',
        'text-halo-color': '#080c16',
        'text-halo-width': 1,
        'text-opacity': 0.6
      }
    }
  ]
};

// Downtown LA coordinates
const LA_CENTER = [-118.2570, 34.0460];

const MapView = forwardRef(({
  incidents,
  cameras,
  units,
  layers,
  onSelectCamera,
  onSelectIncident
}, ref) => {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const heliAnimRef = useRef(null);

  // Expose fly-to methods to parent
  useImperativeHandle(ref, () => ({
    flyToLocation: (latitude, longitude, zoom = 17, pitch = 55, bearing = 30) => {
      if (!mapRef.current) return;
      mapRef.current.flyTo({
        center: [longitude, latitude],
        zoom,
        pitch,
        bearing,
        duration: 2000,
        essential: true
      });
    },
    setCameraView: (preset) => {
      if (!mapRef.current) return;
      mapRef.current.flyTo({
        center: [preset.longitude, preset.latitude],
        zoom: preset.height < 400 ? 17 : preset.height < 600 ? 16 : 15,
        pitch: Math.abs(preset.pitch),
        bearing: preset.heading,
        duration: 2500,
        essential: true
      });
    }
  }));

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: DARK_STYLE,
      center: LA_CENTER,
      zoom: 15.5,
      pitch: 60,
      bearing: 35,
      antialias: true,
      maxPitch: 85
    });

    map.addControl(new maplibregl.NavigationControl({
      visualizePitch: true
    }), 'bottom-right');

    mapRef.current = map;

    return () => {
      if (heliAnimRef.current) cancelAnimationFrame(heliAnimRef.current);
      markersRef.current.forEach(m => m.remove());
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update markers & layers when data or visibility changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) {
      const onLoad = () => updateMarkers();
      map?.once('style.load', onLoad);
      return;
    }
    updateMarkers();

    function updateMarkers() {
      // Clear existing markers
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
      if (heliAnimRef.current) {
        cancelAnimationFrame(heliAnimRef.current);
        heliAnimRef.current = null;
      }

      // Toggle 3D buildings visibility
      if (map.getLayer('3d-buildings')) {
        map.setLayoutProperty('3d-buildings', 'visibility', layers.buildings ? 'visible' : 'none');
      }
      if (map.getLayer('3d-buildings-edges')) {
        map.setLayoutProperty('3d-buildings-edges', 'visibility', layers.buildings ? 'visible' : 'none');
      }

      // Incident markers
      if (layers.incidents && incidents) {
        incidents.forEach(inc => {
          const color = inc.severity === 'critical' ? '#ef4444' :
                        inc.severity === 'warning' ? '#f59e0b' : '#06b6d4';

          const el = document.createElement('div');
          el.className = 'incident-marker';
          el.innerHTML = `
            <div style="position:relative; width:36px; height:36px;">
              <div class="pulse-ring" style="position:absolute; inset:0; border-radius:50%; border:2px solid ${color};"></div>
              <div style="position:absolute; inset:4px; background:${color}22; border:2px solid ${color}; border-radius:50%; display:flex; align-items:center; justify-content:center;">
                <div style="width:8px; height:8px; background:${color}; border-radius:50%;"></div>
              </div>
            </div>
          `;

          el.addEventListener('click', () => onSelectIncident(inc));

          const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
            .setLngLat([inc.longitude, inc.latitude])
            .setPopup(new maplibregl.Popup({ offset: 20, closeButton: true })
              .setHTML(`
                <div style="min-width:180px">
                  <div style="color:${color}; font-weight:700; font-size:12px; margin-bottom:4px;">${inc.id}: ${inc.type}</div>
                  <div style="color:#94a3b8; font-size:10px;">${inc.address}</div>
                  <div style="color:#64748b; font-size:10px; margin-top:4px;">${inc.description.substring(0, 80)}...</div>
                  <div style="color:${color}; font-size:10px; margin-top:4px; font-weight:600;">STATUS: ${inc.status}</div>
                </div>
              `))
            .addTo(map);

          markersRef.current.push(marker);
        });
      }

      // Camera markers
      if (layers.cameras && cameras) {
        cameras.forEach(cam => {
          const el = document.createElement('div');
          el.className = 'camera-marker';
          el.innerHTML = `
            <div style="width:30px; height:30px; background:rgba(10,15,29,0.9); border:2px solid #00f3ff; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow: 0 0 10px rgba(0,243,255,0.4);">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00f3ff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="m22 8-6 4 6 4V8Z"></path><rect width="14" height="12" x="2" y="6" rx="2" ry="2"></rect>
              </svg>
            </div>
          `;

          el.addEventListener('click', () => onSelectCamera(cam));

          const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
            .setLngLat([cam.longitude, cam.latitude])
            .addTo(map);

          markersRef.current.push(marker);
        });

        // Camera vision cone GeoJSON
        if (layers.cameraCones) {
          const coneFeatures = cameras.map(cam => {
            const conePoints = generateConeFan(cam.longitude, cam.latitude, cam.heading, cam.fov, cam.range);
            return {
              type: 'Feature',
              geometry: { type: 'Polygon', coordinates: [conePoints] },
              properties: { id: cam.id }
            };
          });

          if (map.getSource('camera-cones')) {
            map.getSource('camera-cones').setData({ type: 'FeatureCollection', features: coneFeatures });
          } else {
            map.addSource('camera-cones', {
              type: 'geojson',
              data: { type: 'FeatureCollection', features: coneFeatures }
            });
            map.addLayer({
              id: 'camera-cones-fill',
              type: 'fill',
              source: 'camera-cones',
              paint: {
                'fill-color': '#00f3ff',
                'fill-opacity': 0.12
              }
            });
            map.addLayer({
              id: 'camera-cones-outline',
              type: 'line',
              source: 'camera-cones',
              paint: {
                'line-color': '#00f3ff',
                'line-width': 1.5,
                'line-opacity': 0.5
              }
            });
          }
        } else {
          if (map.getLayer('camera-cones-fill')) map.removeLayer('camera-cones-fill');
          if (map.getLayer('camera-cones-outline')) map.removeLayer('camera-cones-outline');
          if (map.getSource('camera-cones')) map.removeSource('camera-cones');
        }
      }

      // Unit markers (including animated helicopter & ground units)
      if (layers.units && units) {
        units.forEach(unit => {
          if (unit.id === 'AIR-1') {
            // Animated helicopter marker
            const el = document.createElement('div');
            el.style.cursor = 'pointer';
            el.innerHTML = `
              <div style="width:38px; height:38px; background:rgba(15,23,42,0.92); border:2.5px solid #eab308; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow: 0 0 15px rgba(234,179,8,0.5); font-family:'JetBrains Mono',monospace; font-size:9px; font-weight:700; color:#eab308;">
                AIR1
              </div>
            `;

            const popup = new maplibregl.Popup({ offset: 20, closeButton: true })
              .setHTML(`
                <div style="min-width:180px">
                  <div style="color:#eab308; font-weight:700; font-size:12px; margin-bottom:4px;">🚁 ${unit.callsign} (${unit.id})</div>
                  <div style="color:#94a3b8; font-size:10px;">TYPE: ${unit.type}</div>
                  <div style="color:#cbd5e1; font-size:10px; margin-top:2px;">ALT: ${unit.altitude}m | SPEED: ${unit.speed}</div>
                  <div style="color:#84cc16; font-size:10px; margin-top:2px;">FUEL: ${unit.fuel}</div>
                  <div style="color:#eab308; font-size:10px; margin-top:4px; font-weight:600;">STATUS: ${unit.status}</div>
                </div>
              `);

            const heliMarker = new maplibregl.Marker({ element: el, anchor: 'center' })
              .setLngLat([unit.longitude, unit.latitude])
              .setPopup(popup)
              .addTo(map);

            markersRef.current.push(heliMarker);

            // Animate in circle
            const centerLng = -118.2570;
            const centerLat = 34.0460;
            const radius = 0.006;
            let angle = 0;
            const animateHeli = () => {
              angle += 0.003;
              const lng = centerLng + radius * Math.cos(angle);
              const lat = centerLat + radius * Math.sin(angle);
              heliMarker.setLngLat([lng, lat]);
              heliAnimRef.current = requestAnimationFrame(animateHeli);
            };
            animateHeli();
          } else {
            // Ground unit marker (patrol car, fire engine)
            const isEngine = unit.id.startsWith('ENG');
            const color = isEngine ? '#ef4444' : '#84cc16';
            const iconSymbol = isEngine ? '🚒' : '🚔';

            const el = document.createElement('div');
            el.style.cursor = 'pointer';
            el.className = 'unit-marker';
            el.innerHTML = `
              <div style="width:32px; height:32px; background:rgba(15,23,42,0.92); border:2px solid ${color}; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow: 0 0 12px ${color}88;">
                <span style="font-size:14px;">${iconSymbol}</span>
              </div>
            `;

            const popup = new maplibregl.Popup({ offset: 20, closeButton: true })
              .setHTML(`
                <div style="min-width:180px">
                  <div style="color:${color}; font-weight:700; font-size:12px; margin-bottom:4px;">${iconSymbol} ${unit.callsign} (${unit.id})</div>
                  <div style="color:#94a3b8; font-size:10px;">TYPE: ${unit.type}</div>
                  <div style="color:#cbd5e1; font-size:10px; margin-top:2px;">SPEED: ${unit.speed}</div>
                  ${unit.driver ? `<div style="color:#cbd5e1; font-size:10px; margin-top:2px;">CREW: ${unit.driver}</div>` : ''}
                  ${unit.captain ? `<div style="color:#cbd5e1; font-size:10px; margin-top:2px;">COMMANDER: ${unit.captain}</div>` : ''}
                  <div style="color:${color}; font-size:10px; margin-top:4px; font-weight:600;">STATUS: ${unit.status}</div>
                </div>
              `);

            const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
              .setLngLat([unit.longitude, unit.latitude])
              .setPopup(popup)
              .addTo(map);

            markersRef.current.push(marker);
          }
        });
      }
    }
  }, [incidents, cameras, units, layers]);

  return (
    <div className="absolute inset-0 z-0">
      <div ref={containerRef} className="w-full h-full" />

      {/* HUD Crosshair overlay */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.08]">
        <div className="w-52 h-52 border border-cyan-400/40 rounded-full flex items-center justify-center">
          <div className="w-36 h-36 border border-cyan-400/20 rounded-full"></div>
          <div className="absolute w-px h-52 bg-cyan-400/30"></div>
          <div className="absolute h-px w-52 bg-cyan-400/30"></div>
        </div>
      </div>
    </div>
  );
});

export default MapView;

// Generate a fan-shaped cone polygon for camera FOV visualization
function generateConeFan(lng, lat, headingDeg, fovDeg, rangeMtrs) {
  const points = [];
  const halfFov = fovDeg / 2;
  const steps = 16;
  const metersPerDegreeLng = 111320 * Math.cos(lat * Math.PI / 180);
  const metersPerDegreeLat = 110540;
  const rangeInDegLng = rangeMtrs / metersPerDegreeLng;
  const rangeInDegLat = rangeMtrs / metersPerDegreeLat;

  points.push([lng, lat]);

  for (let i = 0; i <= steps; i++) {
    const angleDeg = headingDeg - halfFov + (fovDeg * i / steps);
    const angleRad = (angleDeg - 90) * Math.PI / 180;
    const dx = Math.cos(angleRad) * rangeInDegLng;
    const dy = Math.sin(angleRad) * rangeInDegLat;
    points.push([lng + dx, lat + dy]);
  }

  points.push([lng, lat]);
  return points;
}
