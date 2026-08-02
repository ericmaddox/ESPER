import React, { useState, useRef, useImperativeHandle, forwardRef } from 'react';
import EngineViewport from '../engine/core/EngineViewport';
import EngineToolbar from './EngineToolbar';
import { MAP_STYLES, reverseGeocode } from '../engine';
import { LA_PRESETS } from '../data/mockData';
import { Compass, MapPin, Eye, MousePointer } from 'lucide-react';

const CleanEngineCanvas = forwardRef(({ activeRegion, onSelectSearchLocation }, ref) => {
  const engineRef = useRef(null);
  const [activeStyle, setActiveStyle] = useState(MAP_STYLES.DARK_TACTICAL);
  const [show3DBuildings, setShow3DBuildings] = useState(true);
  const [showTerrain, setShowTerrain] = useState(true);

  const regionPresets = activeRegion?.presets || LA_PRESETS;

  // Live spatial cursor state
  const [cameraMetrics, setCameraMetrics] = useState({
    lng: activeRegion?.center ? activeRegion.center[0] : -118.2437,
    lat: activeRegion?.center ? activeRegion.center[1] : 34.0522,
    zoom: activeRegion?.zoom || 15.5,
    pitch: activeRegion?.pitch || 60,
    bearing: activeRegion?.bearing || 35
  });

  const [clickedLocation, setClickedLocation] = useState(null);

  useImperativeHandle(ref, () => ({
    flyToLocation: (latitude, longitude, zoom = 17, pitch = 55, bearing = 30) => {
      if (engineRef.current) {
        engineRef.current.flyToLocation(latitude, longitude, zoom, pitch, bearing);
      }
    },
    setCameraView: (preset) => {
      if (engineRef.current) {
        engineRef.current.setCameraView(preset);
      }
    },
    showSearchLocation: (loc) => {
      const lat = loc.latitude;
      const lng = loc.longitude;
      if (engineRef.current) {
        engineRef.current.flyToLocation(lat, lng, 17.5, 60, 35);
      }
      setClickedLocation({
        lng,
        lat,
        address: loc.address || loc.name,
        building: null,
        city: activeRegion?.name || ''
      });

      const markerMgr = engineRef.current?.getMarkerManager();
      if (markerMgr) {
        markerMgr.removeMarker('inspect-target');
        const el = document.createElement('div');
        el.innerHTML = `
          <div style="position:relative; width:36px; height:36px;">
            <div class="pulse-ring" style="position:absolute; inset:0; border-radius:50%; border:2px solid ${activeStyle.accentColor};"></div>
            <div style="position:absolute; inset:4px; background:rgba(8,12,22,0.9); border:2px solid ${activeStyle.accentColor}; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 0 12px ${activeStyle.accentColor};">
              <div style="width:8px; height:8px; background:${activeStyle.accentColor}; border-radius:50%;"></div>
            </div>
          </div>
        `;
        const popupHtml = `
          <div style="min-width:210px; font-family:'JetBrains Mono',monospace; font-size:11px;">
            <div style="color:${activeStyle.accentColor}; font-weight:700; font-size:12px; margin-bottom:2px;">📍 SEARCHED LOCATION</div>
            <div style="color:#e2e8f0; font-size:11px; margin-bottom:4px;">${loc.address || loc.name}</div>
            <div style="color:#94a3b8; font-size:10px;">LAT: ${lat.toFixed(5)}</div>
            <div style="color:#94a3b8; font-size:10px;">LNG: ${lng.toFixed(5)}</div>
          </div>
        `;
        markerMgr.addMarker('inspect-target', {
          longitude: lng,
          latitude: lat,
          element: el,
          popupContent: popupHtml
        });
      }
    }
  }));

  const handleMapClick = async ({ lng, lat }) => {
    const markerMgr = engineRef.current?.getMarkerManager();
    if (!markerMgr) return;

    markerMgr.removeMarker('inspect-target');

    // Create target inspection pin
    const el = document.createElement('div');
    el.innerHTML = `
      <div style="position:relative; width:36px; height:36px;">
        <div class="pulse-ring" style="position:absolute; inset:0; border-radius:50%; border:2px solid ${activeStyle.accentColor};"></div>
        <div style="position:absolute; inset:4px; background:rgba(8,12,22,0.9); border:2px solid ${activeStyle.accentColor}; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 0 12px ${activeStyle.accentColor};">
          <div style="width:8px; height:8px; background:${activeStyle.accentColor}; border-radius:50%;"></div>
        </div>
      </div>
    `;

    const geocodeResult = await reverseGeocode(lat, lng);

    setClickedLocation({
      lng,
      lat,
      address: geocodeResult.address,
      building: geocodeResult.building,
      city: geocodeResult.city
    });

    const popupHtml = `
      <div style="min-width:210px; font-family:'JetBrains Mono',monospace; font-size:11px;">
        <div style="color:${activeStyle.accentColor}; font-weight:700; font-size:12px; margin-bottom:2px;">📍 SPATIAL INSPECTION</div>
        <div style="color:#e2e8f0; font-size:11px; margin-bottom:4px;">${geocodeResult.address}</div>
        <div style="color:#94a3b8; font-size:10px;">LAT: ${lat.toFixed(5)}</div>
        <div style="color:#94a3b8; font-size:10px;">LNG: ${lng.toFixed(5)}</div>
        <div style="color:#cbd5e1; font-size:10px; margin-top:4px;">PROJECTION: WGS 84 / Web Mercator</div>
      </div>
    `;

    markerMgr.addMarker('inspect-target', {
      longitude: lng,
      latitude: lat,
      element: el,
      popupContent: popupHtml
    });
  };

  const handleSelectStyle = (style) => {
    setActiveStyle(style);
    if (engineRef.current) {
      engineRef.current.setStyle(style);
    }
  };

  const handleToggle3DBuildings = () => {
    const nextState = !show3DBuildings;
    setShow3DBuildings(nextState);
    const layerMgr = engineRef.current?.getLayerManager();
    if (layerMgr) {
      layerMgr.setLayerVisibility('3d-buildings', nextState);
      layerMgr.setLayerVisibility('3d-buildings-edges', nextState);
    }
  };

  const handleToggleTerrain = () => {
    const nextState = !showTerrain;
    setShowTerrain(nextState);
    const map = engineRef.current?.getMap();
    if (map) {
      map.setTerrain(nextState ? { source: 'terrain', exaggeration: 1.3 } : null);
    }
  };

  const handleSelectPreset = (preset) => {
    if (engineRef.current) {
      engineRef.current.setCameraView(preset);
    }
  };

  const handleClearInspection = () => {
    setClickedLocation(null);
    const markerMgr = engineRef.current?.getMarkerManager();
    if (markerMgr) {
      markerMgr.removeMarker('inspect-target');
    }
  };

  return (
    <div className="relative w-full h-full bg-slate-950 overflow-hidden">
      {/* 3D WebGL Engine Viewport */}
      <EngineViewport
        ref={engineRef}
        stylePreset={activeStyle}
        initialCenter={activeRegion ? activeRegion.center : [-118.2437, 34.0522]}
        initialZoom={activeRegion?.zoom || 15.5}
        initialPitch={activeRegion?.pitch || 60}
        initialBearing={activeRegion?.bearing || 35}
        enable3DBuildings={show3DBuildings}
        enableTerrain={showTerrain}
        onCameraMove={setCameraMetrics}
        onMapClick={handleMapClick}
      />

      {/* Engine Controls Toolbar */}
      <EngineToolbar
        activeStyle={activeStyle}
        onSelectStyle={handleSelectStyle}
        show3DBuildings={show3DBuildings}
        onToggle3DBuildings={handleToggle3DBuildings}
        showTerrain={showTerrain}
        onToggleTerrain={handleToggleTerrain}
        currentPitch={cameraMetrics.pitch}
        onSetPitch={(pitch) => engineRef.current?.setPitch(pitch)}
        presets={regionPresets}
        onSelectPreset={handleSelectPreset}
      />

      {/* Bottom Telemetry & Coordinate HUD */}
      <div className="absolute bottom-4 left-4 right-4 z-40 pointer-events-none flex items-end justify-between font-mono text-xs">
        {/* Left Coordinates HUD */}
        <div className="glass-panel rounded-xl border border-cyan-500/30 p-3 shadow-2xl space-y-1 backdrop-blur-md pointer-events-auto">
          <div className="flex items-center space-x-2 text-cyan-400 font-bold text-[11px] mb-1">
            <Compass className="w-4 h-4 animate-spin-slow" />
            <span>3D GEOSPATIAL ENGINE TELEMETRY</span>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[10px] text-slate-300">
            <div>LNG: <span className="text-cyan-300 font-bold">{cameraMetrics.lng.toFixed(5)}°</span></div>
            <div>LAT: <span className="text-cyan-300 font-bold">{cameraMetrics.lat.toFixed(5)}°</span></div>
            <div>ZOOM: <span className="text-emerald-400 font-bold">{cameraMetrics.zoom.toFixed(1)}x</span></div>
            <div>PITCH: <span className="text-amber-400 font-bold">{cameraMetrics.pitch.toFixed(0)}°</span></div>
            <div>BEARING: <span className="text-cyan-300 font-bold">{cameraMetrics.bearing.toFixed(0)}°</span></div>
            <div>PROJECTION: <span className="text-slate-400">EPSG:3857</span></div>
          </div>
        </div>

        {/* Right Active Inspection Banner */}
        {clickedLocation && (
          <div className="glass-panel rounded-xl border border-cyan-500/40 p-3 shadow-2xl max-w-sm backdrop-blur-md pointer-events-auto animate-fade-in space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-cyan-300">
              <span className="flex items-center space-x-1">
                <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                <span>INSPECTED TARGET LOCATION</span>
              </span>
              <button
                onClick={handleClearInspection}
                className="text-slate-400 hover:text-white p-0.5 rounded hover:bg-slate-800 transition-colors"
                title="Clear Pin & Card"
              >
                ✕
              </button>
            </div>
            <p className="text-[10px] text-slate-200 truncate">{clickedLocation.address}</p>
            <div className="mt-1 flex items-center justify-between text-[9px] font-mono border-t border-slate-800 pt-1.5">
              <span className="text-slate-400">{clickedLocation.lng.toFixed(5)}, {clickedLocation.lat.toFixed(5)}</span>
              <button
                onClick={handleClearInspection}
                className="px-2 py-0.5 rounded bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-300 border border-cyan-500/40 font-bold transition-all"
              >
                CLEAR PIN
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

export default CleanEngineCanvas;
