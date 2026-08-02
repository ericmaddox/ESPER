/**
 * ESPER 3D Geospatial Engine - Core MapLibre Viewport Component
 */

import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import maplibregl from 'maplibre-gl';
import { MAP_STYLES } from './StyleManager';
import { LayerManager } from './LayerManager';
import { MarkerManager } from './MarkerManager';
import { getSolarPosition } from '../math/solarMath';

const DEFAULT_CENTER = [-118.2437, 34.0522]; // DTLA Center

const EngineViewport = forwardRef(({
  stylePreset = MAP_STYLES.DARK_TACTICAL,
  initialCenter = DEFAULT_CENTER,
  initialZoom = 15.5,
  initialPitch = 60,
  initialBearing = 35,
  enableTerrain = true,
  enable3DBuildings = true,
  onMapLoad,
  onCameraMove,
  onMapClick,
  onSolarUpdate,
  className = 'w-full h-full'
}, ref) => {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const layerManagerRef = useRef(null);
  const markerManagerRef = useRef(null);

  useImperativeHandle(ref, () => ({
    getMap: () => mapRef.current,
    getLayerManager: () => layerManagerRef.current,
    getMarkerManager: () => markerManagerRef.current,

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
        pitch: Math.abs(preset.pitch || 60),
        bearing: preset.heading || 35,
        duration: 2200,
        essential: true
      });
    },

    setPitch: (pitchAngle) => {
      if (!mapRef.current) return;
      mapRef.current.easeTo({
        pitch: pitchAngle,
        duration: 1000
      });
    },

    setStyle: (styleConfig) => {
      const map = mapRef.current;
      if (!map) return;

      const applyTheme = () => {
        if (layerManagerRef.current && enable3DBuildings) {
          const buildingColor = styleConfig.buildingColor || '#152238';
          const edgeColor = styleConfig.buildingEdgeColor || '#00f3ff';
          layerManagerRef.current.setup3DBuildings(true, buildingColor, edgeColor);
        }
        if (enableTerrain) {
          map.setTerrain({ source: 'terrain', exaggeration: 1.3 });
        }
      };

      map.once('style.load', applyTheme);
      map.setStyle(styleConfig.style);
    }
  }));

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const activeStyle = stylePreset.style || MAP_STYLES.DARK_TACTICAL.style;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: activeStyle,
      center: initialCenter,
      zoom: initialZoom,
      pitch: initialPitch,
      bearing: initialBearing,
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

    const updateSolarLighting = () => {
      if (!mapRef.current) return;
      const center = mapRef.current.getCenter();
      const solar = getSolarPosition(new Date(), center.lat, center.lng);
      
      // Clamp polar angle so light source is always above horizon (10° to 82°)
      const clampedAltitude = Math.max(8, solar.altitude);
      const polarAngle = Math.min(82, Math.max(10, 90 - clampedAltitude));

      try {
        mapRef.current.setLight({
          anchor: 'viewport',
          color: solar.lightColor,
          intensity: solar.intensity,
          position: [1.5, solar.azimuth, polarAngle]
        });
      } catch (e) {
        // Light property ignored on basic styles
      }

      if (onSolarUpdate) onSolarUpdate(solar);
    };

    map.on('load', () => {
      if (enable3DBuildings && layerManagerRef.current) {
        layerManagerRef.current.setup3DBuildings(true);
      }
      updateSolarLighting();
      if (onMapLoad) onMapLoad(map, layerManagerRef.current, markerManagerRef.current);
    });

    const solarInterval = setInterval(updateSolarLighting, 60000);

    map.on('move', () => {
      if (onCameraMove) {
        const center = map.getCenter();
        onCameraMove({
          lng: center.lng,
          lat: center.lat,
          zoom: map.getZoom(),
          pitch: map.getPitch(),
          bearing: map.getBearing()
        });
      }
    });

    map.on('click', (e) => {
      if (onMapClick) {
        onMapClick({
          lng: e.lngLat.lng,
          lat: e.lngLat.lat,
          point: e.point
        });
      }
    });

    return () => {
      clearInterval(solarInterval);
      if (markerManagerRef.current) markerManagerRef.current.clearAll();
      map.remove();
      mapRef.current = null;
      layerManagerRef.current = null;
      markerManagerRef.current = null;
    };
  }, []);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className={className} />
    </div>
  );
});

export default EngineViewport;
