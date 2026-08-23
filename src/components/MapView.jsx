import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import maplibregl from 'maplibre-gl';
import {
  MAP_STYLES,
  LayerManager,
  MarkerManager,
  TacticalPerimeterTool,
  TacticalLOSTool,
  getSolarPosition
} from '../engine';
import EngineToolbar from './EngineToolbar';
import DragDropOverlay from './DragDropOverlay';
import TacticalPerimeterHUD from './TacticalPerimeterHUD';
import LOSProfileHUD from './LOSProfileHUD';
import { LA_PRESETS } from '../data/mockData';
import { Eye } from 'lucide-react';

const LA_CENTER = [-118.257, 34.046];

const MapView = forwardRef(
  (
    {
      activeRegion,
      incidents,
      cameras,
      units,
      skydioDrones = [],
      cuasSensors = [],
      rogueDrones = [],
      citizenStreams = [],
      layers,
      onSelectCamera,
      onSelectIncident
    },
    ref
  ) => {
    const containerRef = useRef(null);
    const mapRef = useRef(null);
    const layerManagerRef = useRef(null);
    const markerManagerRef = useRef(null);
    const perimeterToolRef = useRef(null);
    const losToolRef = useRef(null);
    const markersRef = useRef([]);
    const droneAnimRefs = useRef([]);
    const searchMarkerRef = useRef(null);
    const heliAnimRef = useRef(null);

    // Engine theme & 3D spatial layer state
    const [activeStyle, setActiveStyle] = useState(MAP_STYLES.DARK_TACTICAL);
    const [show3DBuildings, setShow3DBuildings] = useState(true);
    const [showTerrain, setShowTerrain] = useState(true);
    const [showLabels, setShowLabels] = useState(true);
    const [_importedFile, setImportedFile] = useState(null);

    // Tactical Tool States
    const [isCordonMode, setIsCordonMode] = useState(false);
    const [activePerimeter, setActivePerimeter] = useState(null);
    const [cordonConfig, setCordonConfig] = useState({
      hotRadius: 150,
      warmRadius: 300,
      coldRadius: 600,
      label: 'SWAT Barricade / High Threat'
    });

    const [isLOSMode, setIsLOSMode] = useState(false);
    const [losPoints, setLosPoints] = useState({ observer: null, target: null });
    const [losData, setLosData] = useState(null);

    const regionPresets = activeRegion?.presets || LA_PRESETS;

    const [cameraMetrics, setCameraMetrics] = useState({
      lng: activeRegion?.center ? activeRegion.center[0] : -118.2437,
      lat: activeRegion?.center ? activeRegion.center[1] : 34.0522,
      zoom: activeRegion?.zoom || 15.5,
      pitch: activeRegion?.pitch || 60,
      bearing: activeRegion?.bearing || 35
    });

    useImperativeHandle(ref, () => ({
      getLayerManager: () => layerManagerRef.current,
      getMap: () => mapRef.current,
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

        const popup = new maplibregl.Popup({ offset: 25, closeButton: true }).setHTML(`
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
      },
      deployCordonAtIncident: (inc) => {
        if (!mapRef.current) return;
        mapRef.current.flyTo({
          center: [inc.longitude, inc.latitude],
          zoom: 17,
          pitch: 55,
          bearing: 30,
          duration: 2000,
          essential: true
        });
        if (perimeterToolRef.current) {
          const res = perimeterToolRef.current.deployPerimeter(
            inc.longitude,
            inc.latitude,
            cordonConfig.hotRadius,
            cordonConfig.warmRadius,
            cordonConfig.coldRadius,
            `${inc.type} CORDON`
          );
          setActivePerimeter(res);
          setIsCordonMode(false);
        }
      },
      checkLOSAtIncident: async (inc) => {
        if (!mapRef.current) return;
        mapRef.current.flyTo({
          center: [inc.longitude, inc.latitude],
          zoom: 17,
          pitch: 60,
          bearing: 35,
          duration: 2000,
          essential: true
        });
        const tgt = { lng: inc.longitude, lat: inc.latitude, heightAboveGround: 2 };
        const obs = {
          lng: inc.longitude + 0.0025,
          lat: inc.latitude + 0.002,
          heightAboveGround: 45
        };
        setLosPoints({ observer: obs, target: tgt });
        if (losToolRef.current) {
          const res = await losToolRef.current.calculateAndRender(obs, tgt);
          setLosData(res);
        }
      },
      clearCordon: () => {
        if (perimeterToolRef.current) perimeterToolRef.current.clearPerimeter();
        setActivePerimeter(null);
        setIsCordonMode(false);
      },
      clearLOS: () => {
        if (losToolRef.current) losToolRef.current.clear();
        setLosPoints({ observer: null, target: null });
        setLosData(null);
        setIsLOSMode(false);
      }
    }));

    // Handlers for Engine Controls Toolbar
    const handleSelectStyle = (style) => {
      setActiveStyle(style);
      const map = mapRef.current;
      if (!map) return;

      const applyTheme = () => {
        if (layerManagerRef.current) {
          layerManagerRef.current.setup3DBuildings(
            show3DBuildings,
            style.buildingColor,
            style.buildingEdgeColor,
            style.isSatellite
          );
          layerManagerRef.current.setLabelsVisibility(showLabels);
        }
        if (map.getSource('terrain')) {
          try {
            map.setTerrain({ source: 'terrain', exaggeration: showTerrain ? 1.3 : 0 });
          } catch (_e) {}
        }
      };

      map.once('style.load', applyTheme);
      map.setStyle(style.style);
    };

    const handleToggle3DBuildings = () => {
      const nextState = !show3DBuildings;
      setShow3DBuildings(nextState);
      if (layerManagerRef.current) {
        layerManagerRef.current.setLayerVisibility('3d-buildings', nextState);
        layerManagerRef.current.setLayerVisibility('3d-buildings-tall', nextState);
        layerManagerRef.current.setLayerVisibility('3d-buildings-edges', nextState);
      }
    };

    const handleToggleTerrain = () => {
      const nextState = !showTerrain;
      setShowTerrain(nextState);
      const map = mapRef.current;
      if (!map) return;

      if (!map.getSource('terrain')) {
        try {
          map.addSource('terrain', {
            type: 'raster-dem',
            tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
            tileSize: 256,
            encoding: 'terrarium',
            maxzoom: 15
          });
        } catch (_e) {}
      }

      try {
        if (nextState) {
          map.setTerrain({ source: 'terrain', exaggeration: 1.3 });
        } else {
          map.setTerrain({ source: 'terrain', exaggeration: 0 });
        }
      } catch (e) {
        console.warn('Error setting terrain:', e);
      }
    };

    const handleToggleLabels = () => {
      const nextState = !showLabels;
      setShowLabels(nextState);
      if (layerManagerRef.current) {
        layerManagerRef.current.setLabelsVisibility(nextState);
      }
    };

    const handleSetPitch = (pitch) => {
      if (mapRef.current) {
        mapRef.current.easeTo({ pitch, duration: 800 });
      }
    };

    const handleSelectPreset = (preset) => {
      if (!mapRef.current) return;
      mapRef.current.flyTo({
        center: [preset.longitude, preset.latitude],
        zoom: preset.height < 400 ? 17 : preset.height < 600 ? 16 : 15,
        pitch: Math.abs(preset.pitch),
        bearing: preset.heading,
        duration: 2500,
        essential: true
      });
    };

    // Drag & drop file ingestion handler
    const handleFileDrop = ({ fileName, type, data }) => {
      const layerMgr = layerManagerRef.current;
      const map = mapRef.current;
      if (!layerMgr || !map || !data) return;

      const sourceId = 'user-drop-source';
      const layerId = 'user-drop-layer';
      const outlineLayerId = 'user-drop-outline';

      layerMgr.setGeoJSONSource(sourceId, data);
      layerMgr.addLayer({
        id: layerId,
        type: 'circle',
        source: sourceId,
        paint: {
          'circle-radius': 7,
          'circle-color': activeStyle.accentColor,
          'circle-opacity': 0.85,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#080c16'
        }
      });

      layerMgr.addLayer({
        id: outlineLayerId,
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': activeStyle.accentColor,
          'line-width': 2,
          'line-opacity': 0.7
        }
      });

      try {
        const bounds = new maplibregl.LngLatBounds();
        const features = data.features || (data.type === 'Feature' ? [data] : []);
        features.forEach((feat) => {
          if (feat.geometry) {
            if (feat.geometry.type === 'Point') {
              bounds.extend(feat.geometry.coordinates);
            } else if (feat.geometry.type === 'LineString' || feat.geometry.type === 'MultiPoint') {
              feat.geometry.coordinates.forEach((c) => bounds.extend(c));
            } else if (feat.geometry.type === 'Polygon') {
              feat.geometry.coordinates[0].forEach((c) => bounds.extend(c));
            }
          }
        });

        if (!bounds.isEmpty()) {
          map.fitBounds(bounds, { padding: 80, maxZoom: 17, duration: 2000 });
        }
      } catch (e) {
        console.warn('Could not compute bounds for imported data:', e);
      }

      setImportedFile({
        name: fileName,
        type,
        count: data.features?.length || 1,
        sourceId,
        layerId,
        outlineLayerId
      });
    };

    const handleMapClick = async ({ lng, lat }) => {
      if (isCordonMode) {
        if (perimeterToolRef.current) {
          const res = perimeterToolRef.current.deployPerimeter(
            lng,
            lat,
            cordonConfig.hotRadius,
            cordonConfig.warmRadius,
            cordonConfig.coldRadius,
            cordonConfig.label
          );
          setActivePerimeter(res);
        }
        setIsCordonMode(false);
        return;
      }

      if (isLOSMode) {
        if (!losPoints.observer) {
          const obs = { lng, lat, heightAboveGround: 25 };
          setLosPoints({ observer: obs, target: null });
          if (losToolRef.current) {
            losToolRef.current.setObserverPreview(obs);
          }
        } else if (!losPoints.target) {
          const obs = losPoints.observer;
          const tgt = { lng, lat, heightAboveGround: 2 };
          setLosPoints({ observer: obs, target: tgt });

          if (losToolRef.current) {
            const res = await losToolRef.current.calculateAndRender(obs, tgt);
            setLosData(res);
          }
          setIsLOSMode(false);
        }
        return;
      }
    };

    const onMapClickRef = useRef(handleMapClick);
    onMapClickRef.current = handleMapClick;

    useEffect(() => {
      if (!containerRef.current || mapRef.current) return;

      const map = new maplibregl.Map({
        container: containerRef.current,
        style: activeStyle.style,
        center: activeRegion ? activeRegion.center : LA_CENTER,
        zoom: activeRegion ? activeRegion.zoom : 15.5,
        pitch: activeRegion ? activeRegion.pitch : 60,
        bearing: activeRegion ? activeRegion.bearing : 35,
        antialias: true,
        maxPitch: 85
      });

      map.addControl(
        new maplibregl.NavigationControl({
          visualizePitch: true
        }),
        'bottom-right'
      );

      mapRef.current = map;
      layerManagerRef.current = new LayerManager(map);
      markerManagerRef.current = new MarkerManager(map);
      perimeterToolRef.current = new TacticalPerimeterTool(
        map,
        layerManagerRef.current,
        markerManagerRef.current
      );
      losToolRef.current = new TacticalLOSTool(
        map,
        layerManagerRef.current,
        markerManagerRef.current
      );

      const updateSolarLighting = () => {
        if (!mapRef.current) return;
        const center = mapRef.current.getCenter();
        const solar = getSolarPosition(new Date(), center.lat, center.lng);
        try {
          mapRef.current.setLight({
            anchor: 'map',
            color: '#ffffff',
            intensity: 0.15,
            position: [1.15, solar.azimuth || 210, 30]
          });
        } catch (_e) {
          // Light property ignored on basic styles
        }
      };

      map.on('load', () => {
        if (layerManagerRef.current) {
          layerManagerRef.current.setup3DBuildings(
            show3DBuildings,
            activeStyle.buildingColor,
            activeStyle.buildingEdgeColor,
            activeStyle.isSatellite
          );
          layerManagerRef.current.setLabelsVisibility(showLabels);
        }
        updateSolarLighting();
      });

      map.on('move', () => {
        const center = map.getCenter();
        setCameraMetrics({
          lng: center.lng,
          lat: center.lat,
          zoom: map.getZoom(),
          pitch: map.getPitch(),
          bearing: map.getBearing()
        });
      });

      map.on('click', (e) => {
        if (onMapClickRef.current) {
          onMapClickRef.current({
            lng: e.lngLat.lng,
            lat: e.lngLat.lat,
            point: e.point
          });
        }
      });

      const solarInterval = setInterval(updateSolarLighting, 60000);
      const currentHeliAnim = heliAnimRef.current;

      return () => {
        clearInterval(solarInterval);
        if (currentHeliAnim) cancelAnimationFrame(currentHeliAnim);
        if (droneAnimRefs.current)
          droneAnimRefs.current.forEach((refId) => cancelAnimationFrame(refId));
        if (markersRef.current) markersRef.current.forEach((m) => m.remove());
        if (searchMarkerRef.current) searchMarkerRef.current.remove();
        map.remove();
        mapRef.current = null;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
      const map = mapRef.current;
      if (!map) return;

      if (!map.isStyleLoaded()) {
        const onLoad = () => updateMarkers();
        map.once('style.load', onLoad);
        return;
      }
      updateMarkers();

      function updateMarkers() {
        // Clear previous markers
        markersRef.current.forEach((m) => m.remove());
        markersRef.current = [];

        // Clear previous drone animation frames
        droneAnimRefs.current.forEach((refId) => cancelAnimationFrame(refId));
        droneAnimRefs.current = [];

        if (heliAnimRef.current) cancelAnimationFrame(heliAnimRef.current);

        try {
          // ── Incident Markers ──
          incidents.forEach((inc) => {
            const el = document.createElement('div');
            el.className = 'incident-marker cursor-pointer';

            let icon = '🔥';
            let color = '#ef4444';
            if (inc.type.includes('Drone') || inc.type.includes('UAV')) {
              icon = '🛸';
              color = '#a855f7';
            } else if (inc.type.includes('Shots') || inc.type.includes('Robbery')) {
              icon = '⚠️';
              color = '#f97316';
            } else if (inc.type.includes('Medical')) {
              icon = '🚑';
              color = '#3b82f6';
            }

            el.innerHTML = `
            <div style="position:relative; width:36px; height:36px;">
              <div class="pulse-ring" style="position:absolute; inset:0; border-radius:50%; border:2px solid ${color};"></div>
              <div style="position:absolute; inset:4px; background:rgba(15,23,42,0.9); border:2px solid ${color}; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow: 0 0 12px ${color}88;">
                <span style="font-size:14px;">${icon}</span>
              </div>
            </div>
          `;

            const popup = new maplibregl.Popup({ offset: 20, closeButton: true }).setHTML(`
              <div style="min-width:200px">
                <div style="color:${color}; font-weight:700; font-size:12px; margin-bottom:2px;">${icon} ${inc.type} (${inc.id})</div>
                <div style="color:#f8fafc; font-size:11px; font-weight:600;">${inc.address}</div>
                <div style="color:#94a3b8; font-size:10px; margin-top:2px;">REPORTED: ${inc.time}</div>
                <div style="color:#cbd5e1; font-size:10px; margin-top:4px;">${inc.details || ''}</div>
                <div style="margin-top:8px; font-size:9px; color:#64748b; font-family:monospace;">UNITS RESPONDING: ${(inc.units || []).join(', ')}</div>
              </div>
            `);

            const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
              .setLngLat([inc.longitude, inc.latitude])
              .setPopup(popup)
              .addTo(map);

            el.addEventListener('click', () => {
              if (onSelectIncident) onSelectIncident(inc);
            });

            markersRef.current.push(marker);
          });

          // ── Camera Markers & FOV Cones ──
          if (layers?.cameras) {
            cameras.forEach((cam) => {
              const conePoints = generateConeFan(
                cam.longitude,
                cam.latitude,
                cam.heading,
                cam.fov,
                140
              );
              const sourceId = `cam-fov-${cam.id}`;
              const layerId = `cam-fov-layer-${cam.id}`;

              if (!map.getSource(sourceId)) {
                map.addSource(sourceId, {
                  type: 'geojson',
                  data: {
                    type: 'Feature',
                    geometry: { type: 'Polygon', coordinates: [conePoints] }
                  }
                });

                map.addLayer({
                  id: layerId,
                  type: 'fill',
                  source: sourceId,
                  paint: {
                    'fill-color': cam.status === 'alert' ? '#ef4444' : '#00f3ff',
                    'fill-opacity': 0.18
                  }
                });
              }

              const el = document.createElement('div');
              el.className = 'camera-marker cursor-pointer';
              const color = cam.status === 'alert' ? '#ef4444' : '#00f3ff';
              el.innerHTML = `
              <div style="width:28px; height:28px; background:rgba(15,23,42,0.9); border:2px solid ${color}; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow: 0 0 10px ${color}aa;">
                <span style="font-size:12px;">📷</span>
              </div>
            `;

              const popup = new maplibregl.Popup({ offset: 15, closeButton: true }).setHTML(`
                <div style="min-width:180px">
                  <div style="color:${color}; font-weight:700; font-size:11px;">📷 ${cam.name}</div>
                  <div style="color:#94a3b8; font-size:10px;">ID: ${cam.id} | HEADING: ${cam.heading}°</div>
                  <div style="color:#cbd5e1; font-size:10px; margin-top:2px;">STREAM: ${cam.streamUrl ? 'LIVE CALTRANS HLS' : 'SIMULATION'}</div>
                  <div style="margin-top:6px; color:#00f3ff; font-size:10px; font-weight:600;">CLICK TO LAUNCH FEED</div>
                </div>
              `);

              const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
                .setLngLat([cam.longitude, cam.latitude])
                .setPopup(popup)
                .addTo(map);

              el.addEventListener('click', () => {
                if (onSelectCamera) onSelectCamera(cam);
              });

              markersRef.current.push(marker);
            });
          }

          // ── Skydio Autonomous Drones ──
          if (layers?.drones) {
            skydioDrones.forEach((drone) => {
              const el = document.createElement('div');
              el.className = 'skydio-drone-marker cursor-pointer';
              el.innerHTML = `
              <div style="position:relative; width:34px; height:34px;">
                <div class="pulse-ring" style="position:absolute; inset:-2px; border-radius:50%; border:2px solid #38bdf8;"></div>
                <div style="position:absolute; inset:0; background:rgba(15,23,42,0.95); border:2px solid #38bdf8; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 0 14px rgba(56,189,248,0.6);">
                  <span style="font-size:14px;">🛸</span>
                </div>
              </div>
            `;

              const popup = new maplibregl.Popup({ offset: 20, closeButton: true }).setHTML(`
                <div style="min-width:190px">
                  <div style="color:#38bdf8; font-weight:700; font-size:12px;">🛸 ${drone.callsign} (${drone.model})</div>
                  <div style="color:#94a3b8; font-size:10px;">BATTERY: ${drone.battery}% | ALT: ${drone.altitude}m</div>
                  <div style="color:#cbd5e1; font-size:10px; margin-top:2px;">SPEED: ${drone.speed} kts</div>
                  <div style="color:#38bdf8; font-size:10px; margin-top:4px; font-weight:600;">MISSION: ${drone.mission}</div>
                </div>
              `);

              const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
                .setLngLat([drone.longitude, drone.latitude])
                .setPopup(popup)
                .addTo(map);

              markersRef.current.push(marker);
            });
          }

          // ── C-UAS RF Sensor Domes & Rogue Drones ──
          if (layers?.cuas) {
            cuasSensors.forEach((sensor) => {
              const circlePoints = generateGeoCircle(
                sensor.longitude,
                sensor.latitude,
                sensor.rangeMeters
              );
              const sourceId = `cuas-dome-${sensor.id}`;
              const layerId = `cuas-dome-layer-${sensor.id}`;
              const borderLayerId = `cuas-dome-border-${sensor.id}`;

              if (!map.getSource(sourceId)) {
                map.addSource(sourceId, {
                  type: 'geojson',
                  data: {
                    type: 'Feature',
                    geometry: { type: 'Polygon', coordinates: [circlePoints] }
                  }
                });

                map.addLayer({
                  id: layerId,
                  type: 'fill',
                  source: sourceId,
                  paint: {
                    'fill-color': sensor.status === 'TRACKING_HOSTILE' ? '#ef4444' : '#a855f7',
                    'fill-opacity': 0.12
                  }
                });

                map.addLayer({
                  id: borderLayerId,
                  type: 'line',
                  source: sourceId,
                  paint: {
                    'line-color': sensor.status === 'TRACKING_HOSTILE' ? '#ef4444' : '#c084fc',
                    'line-width': 1.5,
                    'line-dasharray': [2, 2]
                  }
                });
              }

              const el = document.createElement('div');
              el.className = 'cuas-sensor-marker cursor-pointer';
              el.innerHTML = `
              <div style="width:30px; height:30px; background:rgba(15,23,42,0.92); border:2px solid #c084fc; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow: 0 0 12px rgba(192,132,252,0.5);">
                <span style="font-size:13px;">📡</span>
              </div>
            `;

              const popup = new maplibregl.Popup({ offset: 18, closeButton: true }).setHTML(`
                <div style="min-width:190px">
                  <div style="color:#c084fc; font-weight:700; font-size:11px;">📡 C-UAS RF SENSOR (${sensor.name})</div>
                  <div style="color:#94a3b8; font-size:10px;">BAND: ${sensor.frequencyBand} | RANGE: ${sensor.rangeMeters}m</div>
                  <div style="color:#ef4444; font-size:10px; margin-top:3px; font-weight:700;">STATUS: ${sensor.status}</div>
                </div>
              `);

              const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
                .setLngLat([sensor.longitude, sensor.latitude])
                .setPopup(popup)
                .addTo(map);

              markersRef.current.push(marker);
            });

            rogueDrones.forEach((drone) => {
              const el = document.createElement('div');
              el.className = 'rogue-drone-marker cursor-pointer';
              el.innerHTML = `
              <div style="position:relative; width:34px; height:34px;">
                <div class="pulse-ring" style="position:absolute; inset:-2px; border-radius:50%; border:2px solid #ef4444;"></div>
                <div style="position:absolute; inset:0; background:rgba(15,23,42,0.95); border:2px solid #ef4444; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 0 16px rgba(239,68,68,0.8);">
                  <span style="font-size:14px;">👾</span>
                </div>
              </div>
            `;

              const popup = new maplibregl.Popup({ offset: 20, closeButton: true }).setHTML(`
                <div style="min-width:200px">
                  <div style="color:#ef4444; font-weight:700; font-size:12px;">👾 ROGUE UAV INTRUSION</div>
                  <div style="color:#fca5a5; font-size:10px; font-weight:600;">FREQ: ${drone.freq} | ALT: ${drone.alt}m</div>
                  <div style="color:#cbd5e1; font-size:10px; margin-top:2px;">SPEED: ${drone.speed} kts</div>
                  <div style="color:#ef4444; font-size:10px; margin-top:4px; font-weight:700;">THREAT: ${drone.threatLevel}</div>
                </div>
              `);

              const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
                .setLngLat([drone.longitude, drone.latitude])
                .setPopup(popup)
                .addTo(map);

              markersRef.current.push(marker);
            });
          }

          // ── Units / Patrol Vehicles ──
          if (layers?.units) {
            units.forEach((unit) => {
              const el = document.createElement('div');
              el.style.cursor = 'pointer';
              el.className = 'unit-marker';

              let iconSymbol = '🚓';
              let color = '#3b82f6';
              if (unit.type === 'FIRE ENGINE' || unit.type === 'FIRE LADDER') {
                iconSymbol = '🚒';
                color = '#ef4444';
              } else if (unit.type === 'RESCUE AMBULANCE') {
                iconSymbol = '🚑';
                color = '#10b981';
              } else if (unit.type === 'AIR SUPPORT') {
                iconSymbol = '🚁';
                color = '#eab308';
              }

              el.innerHTML = `
              <div style="width:32px; height:32px; background:rgba(15,23,42,0.92); border:2px solid ${color}; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow: 0 0 12px ${color}88;">
                <span style="font-size:14px;">${iconSymbol}</span>
              </div>
            `;

              const popup = new maplibregl.Popup({ offset: 20, closeButton: true }).setHTML(`
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
            });
          }
        } catch (err) {
          console.error('Error updating map markers:', err);
        }
      }
    }, [
      incidents,
      cameras,
      units,
      skydioDrones,
      cuasSensors,
      rogueDrones,
      citizenStreams,
      layers,
      onSelectCamera,
      onSelectIncident
    ]);

    return (
      <div className="relative w-full h-full bg-slate-950 overflow-hidden">
        {/* Drag & Drop Visual Dropzone Overlay */}
        <DragDropOverlay onFileDrop={handleFileDrop} />

        {/* 3D Map Viewport */}
        <div ref={containerRef} className="w-full h-full" />

        {/* Engine Controls Toolbar */}
        <EngineToolbar
          activeStyle={activeStyle}
          onSelectStyle={handleSelectStyle}
          show3DBuildings={show3DBuildings}
          onToggle3DBuildings={handleToggle3DBuildings}
          showTerrain={showTerrain}
          onToggleTerrain={handleToggleTerrain}
          showLabels={showLabels}
          onToggleLabels={handleToggleLabels}
          currentPitch={cameraMetrics.pitch}
          onSetPitch={handleSetPitch}
          presets={regionPresets}
          onSelectPreset={handleSelectPreset}
        />

        {/* Tactical Perimeter Cordon HUD */}
        <TacticalPerimeterHUD
          isDeployMode={isCordonMode}
          onToggleDeployMode={() => {
            setIsCordonMode(!isCordonMode);
            setIsLOSMode(false);
          }}
          activePerimeter={activePerimeter}
          onDeployPerimeter={(lng, lat, hot, warm, cold, label) => {
            if (perimeterToolRef.current) {
              const res = perimeterToolRef.current.deployPerimeter(
                lng,
                lat,
                hot,
                warm,
                cold,
                label
              );
              setActivePerimeter(res);
            }
            setIsCordonMode(false);
          }}
          onClearPerimeter={() => {
            if (perimeterToolRef.current) perimeterToolRef.current.clearPerimeter();
            setActivePerimeter(null);
          }}
          onConfigChange={setCordonConfig}
          zIndex="z-10"
        />

        {/* 3D Line-of-Sight & Overwatch Toggle Button */}
        <div className="absolute top-32 left-4 z-10">
          <button
            onClick={() => {
              setIsLOSMode(!isLOSMode);
              setIsCordonMode(false);
              if (losData && losToolRef.current) {
                losToolRef.current.clear();
                setLosPoints({ observer: null, target: null });
                setLosData(null);
              }
            }}
            className={`px-3 py-2 rounded-lg border flex items-center space-x-2 transition-all shadow-xl font-mono text-xs ${
              isLOSMode
                ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200 animate-pulse font-bold'
                : 'glass-panel border-cyan-500/30 text-cyan-300 hover:bg-slate-900/90'
            }`}
          >
            <Eye className="w-4 h-4 text-emerald-400" />
            <span className="uppercase tracking-wider font-bold">
              {isLOSMode
                ? !losPoints.observer
                  ? 'CLICK OBSERVER (ROOFTOP)'
                  : 'CLICK TARGET (POINT B)'
                : '3D LINE-OF-SIGHT'}
            </span>
          </button>
        </div>

        {/* 3D Elevation Cross-Section & LOS Slide-up HUD */}
        {losData && (
          <LOSProfileHUD
            losData={losData}
            onClose={() => {
              if (losToolRef.current) losToolRef.current.clear();
              setLosPoints({ observer: null, target: null });
              setLosData(null);
              setIsLOSMode(false);
            }}
          />
        )}

        {/* Subtle Tactical Crosshair Reticle Overlay */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.08]">
          <div className="w-52 h-52 border border-cyan-400/40 rounded-full flex items-center justify-center">
            <div className="w-36 h-36 border border-cyan-400/20 rounded-full"></div>
            <div className="absolute w-px h-52 bg-cyan-400/30"></div>
            <div className="absolute h-px w-52 bg-cyan-400/30"></div>
          </div>
        </div>
      </div>
    );
  }
);

MapView.displayName = 'MapView';

export default MapView;

// Helper: Generate FOV Cone Fan
function generateConeFan(lng, lat, headingDeg, fovDeg, rangeMtrs) {
  const points = [];
  const halfFov = fovDeg / 2;
  const steps = 16;
  const metersPerDegreeLng = 111320 * Math.cos((lat * Math.PI) / 180);
  const metersPerDegreeLat = 110540;
  const rangeInDegLng = rangeMtrs / metersPerDegreeLng;
  const rangeInDegLat = rangeMtrs / metersPerDegreeLat;

  points.push([lng, lat]);

  for (let i = 0; i <= steps; i++) {
    const angleDeg = headingDeg - halfFov + (fovDeg * i) / steps;
    const angleRad = ((angleDeg - 90) * Math.PI) / 180;
    const dx = Math.cos(angleRad) * rangeInDegLng;
    const dy = Math.sin(angleRad) * rangeInDegLat;
    points.push([lng + dx, lat + dy]);
  }

  points.push([lng, lat]);
  return points;
}

// Helper: Generate Circular GeoJSON Ring
function generateGeoCircle(centerLng, centerLat, radiusMeters, steps = 36) {
  const points = [];
  const metersPerDegreeLng = 111320 * Math.cos((centerLat * Math.PI) / 180);
  const metersPerDegreeLat = 110540;
  const rLng = radiusMeters / metersPerDegreeLng;
  const rLat = radiusMeters / metersPerDegreeLat;

  for (let i = 0; i <= steps; i++) {
    const angleRad = (((i * 360) / steps) * Math.PI) / 180;
    const lng = centerLng + rLng * Math.cos(angleRad);
    const lat = centerLat + rLat * Math.sin(angleRad);
    points.push([lng, lat]);
  }

  return points;
}
