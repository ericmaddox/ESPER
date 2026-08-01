import React, { useState, useRef } from 'react';
import Header from './components/Header';
import MapView from './components/MapView';
import CommandSidebar from './components/CommandSidebar';
import LayerToolbar from './components/LayerToolbar';
import VideoFeedModal from './components/VideoFeedModal';

import {
  MOCK_INCIDENTS,
  MOCK_CAMERAS,
  MOCK_UNITS,
  MOCK_SKYDIO_DRONES,
  MOCK_DEDRONE_SENSORS,
  MOCK_ROGUE_DRONES,
  LA_PRESETS
} from './data/mockData';

export default function App() {
  const mapRef = useRef(null);

  const [incidents] = useState(MOCK_INCIDENTS);
  const [cameras] = useState(MOCK_CAMERAS);
  const [units] = useState(MOCK_UNITS);
  const [skydioDrones] = useState(MOCK_SKYDIO_DRONES);
  const [dedroneSensors] = useState(MOCK_DEDRONE_SENSORS);
  const [rogueDrones] = useState(MOCK_ROGUE_DRONES);

  const [selectedCamera, setSelectedCamera] = useState(null);
  const [selectedIncident, setSelectedIncident] = useState(null);

  // Map layer toggle states
  const [layers, setLayers] = useState({
    buildings: true,
    cameras: true,
    cameraCones: true,
    incidents: true,
    units: true,
    drones: true,
    dedrone: true
  });

  const handleToggleLayer = (layerKey) => {
    setLayers(prev => ({
      ...prev,
      [layerKey]: !prev[layerKey]
    }));
  };

  const handleFlyToIncident = (inc) => {
    setSelectedIncident(inc);
    if (mapRef.current) {
      mapRef.current.flyToLocation(inc.latitude, inc.longitude, 17, 55, 30);
    }
  };

  const handleFlyToLocation = (lat, lng, zoom = 17) => {
    if (mapRef.current) {
      mapRef.current.flyToLocation(lat, lng, zoom, 55, 30);
    }
  };

  const handleFlyToPreset = (preset) => {
    if (mapRef.current) {
      mapRef.current.setCameraView(preset);
    }
  };

  const handleSelectSearchLocation = (loc) => {
    if (mapRef.current) {
      mapRef.current.showSearchLocation(loc);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => console.error(err));
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950">
      {/* Top HUD Header */}
      <Header
        activeIncidentsCount={incidents.length}
        activeCamerasCount={cameras.filter(c => c.status === 'LIVE').length}
        activeUnitsCount={units.length + skydioDrones.length}
        toggleFullscreen={toggleFullscreen}
        onSelectLocation={handleSelectSearchLocation}
      />

      {/* 3D MapLibre Map Viewport */}
      <MapView
        ref={mapRef}
        incidents={incidents}
        cameras={cameras}
        units={units}
        skydioDrones={skydioDrones}
        dedroneSensors={dedroneSensors}
        rogueDrones={rogueDrones}
        layers={layers}
        onSelectCamera={setSelectedCamera}
        onSelectIncident={setSelectedIncident}
      />

      {/* Left FususONE Command Sidebar */}
      <CommandSidebar
        incidents={incidents}
        cameras={cameras}
        units={units}
        skydioDrones={skydioDrones}
        dedroneSensors={dedroneSensors}
        rogueDrones={rogueDrones}
        laPresets={LA_PRESETS}
        onFlyToPreset={handleFlyToPreset}
        onSelectCamera={setSelectedCamera}
        onFlyToIncident={handleFlyToIncident}
        onFlyToLocation={handleFlyToLocation}
        selectedIncident={selectedIncident}
        selectedCamera={selectedCamera}
      />

      {/* Right Layer & Camera Toolbar */}
      <LayerToolbar
        layers={layers}
        onToggleLayer={handleToggleLayer}
        onFlyToPreset={handleFlyToPreset}
        laPresets={LA_PRESETS}
      />

      {/* Tactical CCTV Video Feed Modal */}
      {selectedCamera && (
        <VideoFeedModal
          camera={selectedCamera}
          onClose={() => setSelectedCamera(null)}
        />
      )}
    </div>
  );
}
