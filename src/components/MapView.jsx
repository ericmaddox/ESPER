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
    { id: 'background', type: 'background', paint: { 'background-color': '#080c16' } },
    { id: 'water', type: 'fill', source: 'openmaptiles', 'source-layer': 'water', paint: { 'fill-color': '#0a1628', 'fill-opacity': 0.9 } },
    { id: 'landuse-park', type: 'fill', source: 'openmaptiles', 'source-layer': 'landuse', filter: ['in', 'class', 'park', 'cemetery', 'grass'], paint: { 'fill-color': '#0b1a12', 'fill-opacity': 0.7 } },
    { id: 'landuse-other', type: 'fill', source: 'openmaptiles', 'source-layer': 'landuse', filter: ['!in', 'class', 'park', 'cemetery', 'grass'], paint: { 'fill-color': '#0d111d', 'fill-opacity': 0.5 } },
    { id: 'landcover', type: 'fill', source: 'openmaptiles', 'source-layer': 'landcover', paint: { 'fill-color': '#0b1a12', 'fill-opacity': 0.3 } },
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
        'fill-extrusion-height': ['coalesce', ['get', 'render_height'], 10],
        'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
        'fill-extrusion-opacity': 0.88
      }
    },
    {
      id: '3d-buildings-edges',
      type: 'fill-extrusion',
      source: 'openmaptiles',
      'source-layer': 'building',
      minzoom: 15,
      paint: {
        'fill-extrusion-color': '#0ea5e9',
        'fill-extrusion-height': ['coalesce', ['get', 'render_height'], 10],
        'fill-extrusion-base': ['-', ['coalesce', ['get', 'render_height'], 10], 1],
        'fill-extrusion-opacity': 0.25
      }
    },
    {
      id: 'road-label',
      type: 'symbol',
      source: 'openmaptiles',
      'source-layer': 'transportation_name',
      minzoom: 14,
      layout: { 'text-field': '{name}', 'text-font': ['Noto Sans Regular'], 'text-size': 10, 'symbol-placement': 'line', 'text-max-angle': 30 },
      paint: { 'text-color': '#3b5998', 'text-halo-color': '#080c16', 'text-halo-width': 1.5, 'text-opacity': 0.7 }
    },
    {
      id: 'place-label',
      type: 'symbol',
      source: 'openmaptiles',
      'source-layer': 'place',
      minzoom: 10,
      layout: { 'text-field': '{name}', 'text-font': ['Noto Sans Bold'], 'text-size': ['interpolate', ['linear'], ['zoom'], 10, 11, 16, 16], 'text-transform': 'uppercase', 'text-letter-spacing': 0.1, 'text-max-width': 8 },
      paint: { 'text-color': '#3888c8', 'text-halo-color': '#080c16', 'text-halo-width': 2, 'text-opacity': 0.8 }
    },
    {
      id: 'poi-label',
      type: 'symbol',
      source: 'openmaptiles',
      'source-layer': 'poi',
      minzoom: 15,
      layout: { 'text-field': '{name}', 'text-font': ['Noto Sans Regular'], 'text-size': 9, 'text-max-width': 7 },
      paint: { 'text-color': '#4a6e9e', 'text-halo-color': '#080c16', 'text-halo-width': 1, 'text-opacity': 0.6 }
    }
  ]
};

const LA_CENTER = [-118.2570, 34.0460];

const MapView = forwardRef(({
  incidents,
  cameras,
  units,
  skydioDrones = [],
  dedroneSensors = [],
  rogueDrones = [],
  citizenStreams = [],
  layers,
  onSelectCamera,
  onSelectIncident
}, ref) => {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const droneAnimRefs = useRef([]);
  const searchMarkerRef = useRef(null);
  const heliAnimRef = useRef(null);

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
    },
    showSearchLocation: (loc) => {
      if (!mapRef.current) return;

      if (searchMarkerRef.current) {
        searchMarkerRef.current.remove();
        searchMarkerRef.current = null;
      }

      mapRef.current.flyTo({
        center: [loc.longitude, loc.latitude],
        zoom: 17.5,
        pitch: 60,
        bearing: 35,
        duration: 2200,
        essential: true
      });

      const el = document.createElement('div');
      el.className = 'search-target-marker';
      el.innerHTML = `
        <div style="position:relative; width:44px; height:44px;">
          <div class="pulse-ring" style="position:absolute; inset:0; border-radius:50%; border:2px solid #00f3ff;"></div>
          <div style="position:absolute; inset:6px; background:rgba(0,243,255,0.25); border:2px solid #00f3ff; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow: 0 0 15px #00f3ff;">
            <div style="width:10px; height:10px; background:#00f3ff; border-radius:50%;"></div>
          </div>
        </div>
      `;

      const popup = new maplibregl.Popup({ offset: 25, closeButton: true })
        .setHTML(`
          <div style="min-width:200px">
            <div style="color:#00f3ff; font-weight:700; font-size:12px; margin-bottom:2px;">📍 ${loc.name}</div>
            <div style="color:#94a3b8; font-size:10px; word-break:break-word;">${loc.address}</div>
            <div style="color:#64748b; font-size:9px; margin-top:4px;">GPS: ${loc.latitude.toFixed(5)}, ${loc.longitude.toFixed(5)}</div>
          </div>
        `);

      const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([loc.longitude, loc.latitude])
        .setPopup(popup)
        .addTo(mapRef.current);

      marker.togglePopup();
      searchMarkerRef.current = marker;
    }
  }));

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
      droneAnimRefs.current.forEach(refId => cancelAnimationFrame(refId));
      markersRef.current.forEach(m => m.remove());
      if (searchMarkerRef.current) searchMarkerRef.current.remove();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) {
      const onLoad = () => updateMarkers();
      map?.once('style.load', onLoad);
      return;
    }
    updateMarkers();

    function updateMarkers() {
      try {
        markersRef.current.forEach(m => m.remove());
        markersRef.current = [];
        if (heliAnimRef.current) {
          cancelAnimationFrame(heliAnimRef.current);
          heliAnimRef.current = null;
        }
        droneAnimRefs.current.forEach(refId => cancelAnimationFrame(refId));
        droneAnimRefs.current = [];

      if (map.getLayer('3d-buildings')) {
        map.setLayoutProperty('3d-buildings', 'visibility', layers.buildings ? 'visible' : 'none');
      }
      if (map.getLayer('3d-buildings-edges')) {
        map.setLayoutProperty('3d-buildings-edges', 'visibility', layers.buildings ? 'visible' : 'none');
      }

      // Incidents
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

      // Cameras
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
              paint: { 'fill-color': '#00f3ff', 'fill-opacity': 0.12 }
            });
            map.addLayer({
              id: 'camera-cones-outline',
              type: 'line',
              source: 'camera-cones',
              paint: { 'line-color': '#00f3ff', 'line-width': 1.5, 'line-opacity': 0.5 }
            });
          }
        } else {
          if (map.getLayer('camera-cones-fill')) map.removeLayer('camera-cones-fill');
          if (map.getLayer('camera-cones-outline')) map.removeLayer('camera-cones-outline');
          if (map.getSource('camera-cones')) map.removeSource('camera-cones');
        }
      }

      // Skydio Autonomous DFR Drones Layer
      if (layers.drones && skydioDrones) {
        skydioDrones.forEach((drone, idx) => {
          const el = document.createElement('div');
          el.style.cursor = 'pointer';
          el.className = 'skydio-drone-marker';
          el.innerHTML = `
            <div style="width:34px; height:34px; background:rgba(10,25,45,0.95); border:2px solid #38bdf8; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow: 0 0 14px rgba(56,189,248,0.6);">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="12 2 19 21 12 17 5 21 12 2"></polygon>
              </svg>
            </div>
          `;

          const popup = new maplibregl.Popup({ offset: 22, closeButton: true })
            .setHTML(`
              <div style="min-width:200px">
                <div style="color:#38bdf8; font-weight:700; font-size:12px; margin-bottom:2px;">🚁 ${drone.callsign}</div>
                <div style="color:#94a3b8; font-size:10px;">MISSION: ${drone.mission}</div>
                <div style="color:#cbd5e1; font-size:10px; margin-top:4px;">ALT: <strong>${drone.altitude}m AGL</strong> | SPEED: <strong>${drone.speed}</strong></div>
                <div style="color:#84cc16; font-size:10px; margin-top:2px;">BATTERY: <strong>${drone.battery}</strong> | AUTONOMY: <strong>${drone.autonomyMode}</strong></div>
                <div style="color:#38bdf8; font-size:10px; margin-top:4px; font-weight:600;">PAYLOAD: ${drone.payload}</div>
              </div>
            `);

          const droneMarker = new maplibregl.Marker({ element: el, anchor: 'center' })
            .setLngLat([drone.longitude, drone.latitude])
            .setPopup(popup)
            .addTo(map);

          markersRef.current.push(droneMarker);

          // Animate Skydio flight path
          const centerLng = drone.longitude;
          const centerLat = drone.latitude;
          const radius = 0.0035 * (idx + 1);
          let angle = idx * 1.5;

          const animateDrone = () => {
            angle += 0.004;
            const lng = centerLng + radius * Math.cos(angle);
            const lat = centerLat + radius * Math.sin(angle);
            droneMarker.setLngLat([lng, lat]);
            const animId = requestAnimationFrame(animateDrone);
            droneAnimRefs.current.push(animId);
          };
          animateDrone();
        });
      }

      // Dedrone Counter-UAS Sensors & Detection Domes
      if (layers.dedrone && dedroneSensors) {
        dedroneSensors.forEach(sensor => {
          const el = document.createElement('div');
          el.style.cursor = 'pointer';
          el.className = 'dedrone-sensor-marker';
          el.innerHTML = `
            <div style="width:34px; height:34px; background:rgba(20,10,35,0.95); border:2px solid #a855f7; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow: 0 0 14px rgba(168,85,247,0.6);">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a855f7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z"></path>
                <circle cx="12" cy="12" r="3" fill="#a855f7"></circle>
              </svg>
            </div>
          `;

          const popup = new maplibregl.Popup({ offset: 22, closeButton: true })
            .setHTML(`
              <div style="min-width:210px">
                <div style="color:#a855f7; font-weight:700; font-size:12px; margin-bottom:2px;">📡 ${sensor.name}</div>
                <div style="color:#94a3b8; font-size:10px;">TYPE: ${sensor.type}</div>
                <div style="color:#cbd5e1; font-size:10px; margin-top:4px;">RF SPECTRUM: <strong>${sensor.frequencyBands}</strong></div>
                <div style="color:#a855f7; font-size:10px; margin-top:2px;">COVERAGE: <strong>${sensor.detectionRadiusMeters}m RF Sphere</strong></div>
                <div style="color:#34d399; font-size:10px; margin-top:4px; font-weight:600;">STATUS: ${sensor.status} (${sensor.detectedThreatsCount} THREATS DETECTED)</div>
              </div>
            `);

          const sensorMarker = new maplibregl.Marker({ element: el, anchor: 'center' })
            .setLngLat([sensor.longitude, sensor.latitude])
            .setPopup(popup)
            .addTo(map);

          markersRef.current.push(sensorMarker);
        });

        // Dedrone RF Detection Coverage Domes (GeoJSON polygons)
        const sensorCircles = dedroneSensors.map(sensor => {
          const circlePoints = generateGeoCircle(sensor.longitude, sensor.latitude, sensor.detectionRadiusMeters);
          return {
            type: 'Feature',
            geometry: { type: 'Polygon', coordinates: [circlePoints] },
            properties: { id: sensor.id }
          };
        });

        if (map.getSource('dedrone-coverage')) {
          map.getSource('dedrone-coverage').setData({ type: 'FeatureCollection', features: sensorCircles });
        } else {
          map.addSource('dedrone-coverage', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: sensorCircles }
          });
          map.addLayer({
            id: 'dedrone-coverage-outline',
            type: 'line',
            source: 'dedrone-coverage',
            paint: { 'line-color': '#a855f7', 'line-width': 1.5, 'line-dasharray': [3, 3], 'line-opacity': 0.7 }
          });
        }
      } else {
        if (map.getLayer('dedrone-coverage-outline')) map.removeLayer('dedrone-coverage-outline');
        if (map.getSource('dedrone-coverage')) map.removeSource('dedrone-coverage');
      }

      // Dedrone Detected Unauthorized UAS Markers (Dedrone C-UAS Purple Theme)
      if (layers.dedrone && rogueDrones) {
        rogueDrones.forEach(rogue => {
          const el = document.createElement('div');
          el.style.cursor = 'pointer';
          el.className = 'dedrone-target-marker';
          el.innerHTML = `
            <div style="position:relative; width:38px; height:38px;">
              <div class="pulse-ring" style="position:absolute; inset:0; border-radius:50%; border:2px solid #a855f7;"></div>
              <div style="position:absolute; inset:3px; background:rgba(20,10,35,0.92); border:2px solid #a855f7; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 0 16px rgba(168,85,247,0.7);">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c084fc" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z"></path>
                  <circle cx="12" cy="12" r="3" fill="#c084fc"></circle>
                </svg>
              </div>
            </div>
          `;

          const popup = new maplibregl.Popup({ offset: 22, closeButton: true })
            .setHTML(`
              <div style="width:280px; box-sizing:border-box; font-family:'JetBrains Mono',monospace; font-size:11px; color:#e2e8f0; line-height:1.45; overflow:hidden;">
                
                <div style="display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid rgba(168,85,247,0.4); padding-bottom:4px; margin-bottom:6px;">
                  <span style="color:#c084fc; font-weight:700; font-size:11px;">📡 DEDRONE TRACK: ${rogue.id}</span>
                  <span style="color:#e9d5ff; font-weight:700; font-size:9px; background:rgba(168,85,247,0.25); padding:2px 6px; border-radius:4px; border:1px solid rgba(168,85,247,0.5);">
                    ${rogue.threatLevel}
                  </span>
                </div>
                
                <div style="color:#e9d5ff; font-weight:700; font-size:11px; margin-bottom:6px; word-break:break-word;">
                  ${rogue.classification}
                </div>
                
                <div style="background:rgba(20,10,35,0.85); padding:8px; border-radius:6px; border:1px solid rgba(168,85,247,0.3); margin-bottom:6px; box-sizing:border-box;">
                  <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
                    <span style="color:#94a3b8;">SERIAL SN:</span>
                    <strong style="color:#38bdf8;">${rogue.serialNumber}</strong>
                  </div>
                  <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
                    <span style="color:#94a3b8;">REMOTE ID:</span>
                    <strong style="color:#c084fc;">FAA Direct RF</strong>
                  </div>
                  <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
                    <span style="color:#94a3b8;">FAA REG:</span>
                    <strong style="color:#f59e0b;">${rogue.faaRegistration}</strong>
                  </div>
                  <div style="display:flex; justify-content:space-between;">
                    <span style="color:#94a3b8;">MAC ADDR:</span>
                    <strong style="color:#cbd5e1;">${rogue.macAddress}</strong>
                  </div>
                </div>

                <div style="display:grid; grid-template-columns:1fr 1fr; gap:4px; margin-bottom:6px; background:rgba(15,23,42,0.6); padding:6px; border-radius:4px; border:1px solid rgba(255,255,255,0.05); box-sizing:border-box;">
                  <div>
                    <div style="color:#64748b; font-size:9px;">ALTITUDE</div>
                    <div style="color:#f43f5e; font-weight:700;">${rogue.altitude}m AGL</div>
                  </div>
                  <div>
                    <div style="color:#64748b; font-size:9px;">CLIMB RATE</div>
                    <div style="color:#cbd5e1; font-weight:600;">${rogue.verticalRate}</div>
                  </div>
                  <div>
                    <div style="color:#64748b; font-size:9px;">SPEED</div>
                    <div style="color:#cbd5e1; font-weight:600;">${rogue.speed}</div>
                  </div>
                  <div>
                    <div style="color:#64748b; font-size:9px;">RF SIGNAL</div>
                    <div style="color:#34d399; font-weight:600;">${rogue.signalDb}</div>
                  </div>
                </div>

                <div style="background:rgba(168,85,247,0.12); padding:8px; border-radius:6px; border:1px solid rgba(168,85,247,0.3); margin-bottom:6px; box-sizing:border-box;">
                  <div style="color:#d8b4fe; font-weight:700; font-size:10px; margin-bottom:2px;">📍 PILOT ESTIMATE:</div>
                  <div style="color:#f3e8ff; font-size:10px; font-weight:600; word-break:break-word;">${rogue.pilotLocationEst}</div>
                  <div style="color:#d8b4fe; font-size:9px; margin-top:2px;">RANGE: ${rogue.pilotDistance}</div>
                  <div style="color:#d8b4fe; font-size:9px; word-break:break-word;">HOME: ${rogue.homePoint}</div>
                </div>

                <div style="display:flex; align-items:center; justify-content:space-between; font-size:9px; border-top:1px solid rgba(255,255,255,0.1); padding-top:4px;">
                  <span style="color:#94a3b8;">SENSORS: LAPD HQ & City Hall</span>
                  <span style="color:#a855f7; font-weight:700;">JAMMER ARMED</span>
                </div>

              </div>
            `);

          const rogueMarker = new maplibregl.Marker({ element: el, anchor: 'center' })
            .setLngLat([rogue.longitude, rogue.latitude])
            .setPopup(popup)
            .addTo(map);

          markersRef.current.push(rogueMarker);
        });
      }

      // Citizen App Live Mobile Video Streams
      if (layers.citizen && citizenStreams) {
        citizenStreams.forEach(stream => {
          const el = document.createElement('div');
          el.style.cursor = 'pointer';
          el.className = 'citizen-stream-marker';
          el.innerHTML = `
            <div style="position:relative; width:36px; height:36px;">
              <div class="pulse-ring" style="position:absolute; inset:0; border-radius:50%; border:2px solid #f97316;"></div>
              <div style="position:absolute; inset:3px; background:rgba(25,15,10,0.92); border:2px solid #f97316; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 0 14px rgba(249,115,22,0.6);">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f97316" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M23 7l-7 5 7 5V7z"></path>
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                </svg>
              </div>
            </div>
          `;

          el.addEventListener('click', () => onSelectCamera({
            id: stream.id,
            name: `${stream.title} (${stream.broadcaster})`,
            location: stream.address,
            videoUrl: stream.videoUrl,
            status: `LIVE CITIZEN BROADCAST (${stream.viewersCount} VIEWERS)`,
            network: 'Citizen Crowdsourced Mobile Video Network',
            height: 15,
            fov: 75
          }));

          const popup = new maplibregl.Popup({ offset: 20, closeButton: true })
            .setHTML(`
              <div style="min-width:200px font-family:'JetBrains Mono',monospace;">
                <div style="color:#f97316; font-weight:700; font-size:12px; margin-bottom:2px;">📱 ${stream.id}</div>
                <div style="color:#fdba74; font-weight:700; font-size:11px;">${stream.title}</div>
                <div style="color:#94a3b8; font-size:10px; margin-top:2px;">${stream.address}</div>
                <div style="color:#cbd5e1; font-size:10px; margin-top:4px;">BROADCASTER: <strong style="color:#f97316">${stream.broadcaster}</strong></div>
                <div style="color:#84cc16; font-size:10px; margin-top:2px; font-weight:600;">● ${stream.status} (${stream.viewersCount} VIEWERS)</div>
              </div>
            `);

          const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
            .setLngLat([stream.longitude, stream.latitude])
            .setPopup(popup)
            .addTo(map);

          markersRef.current.push(marker);
        });
      }

      // Ground Unit markers
      if (layers.units && units) {
        units.forEach(unit => {
          if (unit.id === 'AIR-1') {
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
      } catch (err) {
        console.error('Error updating map markers:', err);
      }
    }
  }, [incidents, cameras, units, skydioDrones, dedroneSensors, rogueDrones, citizenStreams, layers]);

  return (
    <div className="absolute inset-0 z-0">
      <div ref={containerRef} className="w-full h-full" />

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

// Generate circular polygon points for Dedrone C-UAS RF coverage dome
function generateGeoCircle(centerLng, centerLat, radiusMeters, steps = 36) {
  const points = [];
  const metersPerDegreeLng = 111320 * Math.cos(centerLat * Math.PI / 180);
  const metersPerDegreeLat = 110540;
  const rLng = radiusMeters / metersPerDegreeLng;
  const rLat = radiusMeters / metersPerDegreeLat;

  for (let i = 0; i <= steps; i++) {
    const angleRad = (i * 360 / steps) * Math.PI / 180;
    const lng = centerLng + rLng * Math.cos(angleRad);
    const lat = centerLat + rLat * Math.sin(angleRad);
    points.push([lng, lat]);
  }

  return points;
}
