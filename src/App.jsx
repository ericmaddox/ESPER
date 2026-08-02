import React, { useState, useRef } from 'react';
import Header from './components/Header';
import MapView from './components/MapView';
import CommandSidebar from './components/CommandSidebar';
import LayerToolbar from './components/LayerToolbar';
import VideoFeedModal from './components/VideoFeedModal';
import CleanEngineCanvas from './components/CleanEngineCanvas';

import {
  MOCK_INCIDENTS,
  MOCK_CAMERAS,
  MOCK_UNITS,
  MOCK_SKYDIO_DRONES,
  MOCK_CUAS_SENSORS,
  MOCK_ROGUE_DRONES,
  MOCK_CITIZEN_STREAMS,
  CITY_REGIONS,
  LA_PRESETS
} from './data/mockData';

export default function App() {
  const mapRef = useRef(null);

  // Active Spatial Region (Los Angeles, Atlanta GA, Bremen GA)
  const [activeRegion, setActiveRegion] = useState(CITY_REGIONS[0]);

  // Workspace Mode: 'clean' (Pristine 3D Engine Canvas) or 'demo' (Public Safety PoC)
  const [workspaceMode, setWorkspaceMode] = useState('clean');

  const [incidents] = useState(MOCK_INCIDENTS);
  const [cameras] = useState(MOCK_CAMERAS);
  const [units] = useState(MOCK_UNITS);
  const [skydioDrones] = useState(MOCK_SKYDIO_DRONES);
  const [cuasSensors] = useState(MOCK_CUAS_SENSORS);
  const [rogueDrones] = useState(MOCK_ROGUE_DRONES);
  const [citizenStreams] = useState(MOCK_CITIZEN_STREAMS);

  const [selectedCamera, setSelectedCamera] = useState(null);
  const [selectedIncident, setSelectedIncident] = useState(null);

  const handleSelectRegion = (region) => {
    setActiveRegion(region);
    if (mapRef.current) {
      mapRef.current.flyToLocation(region.center[1], region.center[0], region.zoom, region.pitch, region.bearing);
    }
  };

  // Map layer toggle states for Demo mode
  const [layers, setLayers] = useState({
    buildings: true,
    cameras: true,
    cameraCones: true,
    incidents: true,
    units: true,
    drones: true,
    cuas: true,
    citizen: true
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
        mode={workspaceMode}
        onToggleMode={setWorkspaceMode}
        activeRegion={activeRegion}
        onSelectRegion={handleSelectRegion}
        activeIncidentsCount={incidents.length}
        activeCamerasCount={cameras.filter(c => c.status === 'LIVE').length}
        activeUnitsCount={units.length + skydioDrones.length}
        toggleFullscreen={toggleFullscreen}
        onSelectLocation={handleSelectSearchLocation}
      />

      {workspaceMode === 'clean' ? (
        /* Pristine 3D Geospatial Engine Workspace (Zero Demo Noise) */
        <CleanEngineCanvas 
          key={activeRegion.id}
          activeRegion={activeRegion} 
          onSelectSearchLocation={handleSelectSearchLocation} 
        />
      ) : (
        /* Public Safety Demo Scenario Workspace */
        <>
          <MapView
            ref={mapRef}
            incidents={incidents}
            cameras={cameras}
            units={units}
            skydioDrones={skydioDrones}
            cuasSensors={cuasSensors}
            rogueDrones={rogueDrones}
            citizenStreams={citizenStreams}
            layers={layers}
            onSelectCamera={setSelectedCamera}
            onSelectIncident={setSelectedIncident}
          />

          <CommandSidebar
            incidents={incidents}
            cameras={cameras}
            units={units}
            skydioDrones={skydioDrones}
            cuasSensors={cuasSensors}
            rogueDrones={rogueDrones}
            citizenStreams={citizenStreams}
            laPresets={LA_PRESETS}
            onFlyToPreset={handleFlyToPreset}
            onSelectCamera={setSelectedCamera}
            onFlyToIncident={handleFlyToIncident}
            onFlyToLocation={handleFlyToLocation}
            selectedIncident={selectedIncident}
            selectedCamera={selectedCamera}
          />

          <LayerToolbar
            layers={layers}
            onToggleLayer={handleToggleLayer}
            onFlyToPreset={handleFlyToPreset}
            laPresets={LA_PRESETS}
          />

          {selectedCamera && (
            <VideoFeedModal
              camera={selectedCamera}
              onClose={() => setSelectedCamera(null)}
            />
          )}
        </>
      )}
    </div>
  );
}
