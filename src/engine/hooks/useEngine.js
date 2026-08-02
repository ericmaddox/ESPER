/**
 * ESPER 3D Geospatial Engine - React Hook for Engine Controls
 */

import { useRef, useCallback } from 'react';

export function useEngine() {
  const engineRef = useRef(null);

  const flyToLocation = useCallback((lat, lng, zoom = 17, pitch = 55, bearing = 30) => {
    if (engineRef.current) {
      engineRef.current.flyToLocation(lat, lng, zoom, pitch, bearing);
    }
  }, []);

  const setCameraView = useCallback((preset) => {
    if (engineRef.current) {
      engineRef.current.setCameraView(preset);
    }
  }, []);

  const setStyle = useCallback((styleConfig) => {
    if (engineRef.current) {
      engineRef.current.setStyle(styleConfig);
    }
  }, []);

  return {
    engineRef,
    flyToLocation,
    setCameraView,
    setStyle
  };
}
