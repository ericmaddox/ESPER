/**
 * ESPER 3D Geospatial Engine - 3D Line-of-Sight (LOS) & Overwatch Tool
 * Renders visual intervisibility rays and connects to profile HUD
 */

import { calculateLineOfSight } from '../services/elevationService';

export class TacticalLOSTool {
  constructor(map, layerManager, markerManager) {
    this.map = map;
    this.layerManager = layerManager;
    this.markerManager = markerManager;
    this.losData = null;
  }

  /**
   * Sets observer point preview marker on first click
   */
  setObserverPreview(observerPoint) {
    this.clear();
    if (this.markerManager) {
      const obsEl = document.createElement('div');
      obsEl.className =
        'w-6 h-6 rounded-full bg-cyan-500/30 border-2 border-cyan-400 flex items-center justify-center text-[9px] font-mono text-cyan-200 font-bold shadow-lg animate-pulse';
      obsEl.innerText = 'OBS';

      this.markerManager.addMarker('tactical-los-observer', {
        longitude: observerPoint.lng,
        latitude: observerPoint.lat,
        element: obsEl,
        popupContent: `
          <div style="font-family:monospace; padding:4px; font-size:11px; background:#090d16; color:#e2e8f0; border-radius:6px; border:1px solid #06b6d4;">
            <div style="color:#06b6d4; font-weight:bold;">OBSERVER SET</div>
            <div style="color:#94a3b8; font-size:10px;">Now click map to place Target point</div>
          </div>
        `
      });
    }
  }

  /**
   * Calculates and renders 3D Line-of-Sight between Observer and Target
   */
  async calculateAndRender(observerPoint, targetPoint) {
    if (!this.map || !this.layerManager) return null;

    this.clear();

    const losResult = await calculateLineOfSight(observerPoint, targetPoint, 40);
    this.losData = losResult;

    const sourceId = 'tactical-los-source';
    const lineLayerId = 'tactical-los-line';

    const rayCoordinates = [
      [observerPoint.lng, observerPoint.lat],
      [targetPoint.lng, targetPoint.lat]
    ];

    const rayGeoJSON = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {
            isClear: losResult.clearLineOfSight,
            color: losResult.clearLineOfSight ? '#22c55e' : '#ef4444'
          },
          geometry: {
            type: 'LineString',
            coordinates: rayCoordinates
          }
        }
      ]
    };

    // 1. Set GeoJSON Source for LOS Ray
    this.layerManager.setGeoJSONSource(sourceId, rayGeoJSON);

    // 2. Add LOS Line Layer
    this.layerManager.addLayer({
      id: lineLayerId,
      type: 'line',
      source: sourceId,
      paint: {
        'line-color': ['get', 'color'],
        'line-width': 3,
        'line-opacity': 0.95,
        'line-dasharray': losResult.clearLineOfSight ? [1, 0] : [2, 1]
      }
    });

    // 3. Place Observer and Target Markers
    if (this.markerManager) {
      const obsEl = document.createElement('div');
      obsEl.className =
        'w-5 h-5 rounded-full bg-cyan-500/30 border-2 border-cyan-400 flex items-center justify-center text-[9px] font-mono text-cyan-200 font-bold shadow-lg';
      obsEl.innerText = 'OBS';

      this.markerManager.addMarker('tactical-los-observer', {
        longitude: observerPoint.lng,
        latitude: observerPoint.lat,
        element: obsEl,
        popupContent: `
          <div style="font-family:monospace; padding:4px; font-size:11px; background:#090d16; color:#e2e8f0; border-radius:6px; border:1px solid #06b6d4;">
            <div style="color:#06b6d4; font-weight:bold;">OBSERVER / OVERWATCH</div>
            <div>ELEVATION: ${losResult.observerAltitude}m ASL</div>
          </div>
        `
      });

      const tgtEl = document.createElement('div');
      tgtEl.className = `w-5 h-5 rounded-full ${
        losResult.clearLineOfSight
          ? 'bg-emerald-500/30 border-2 border-emerald-400 text-emerald-200'
          : 'bg-red-500/30 border-2 border-red-500 text-red-200'
      } flex items-center justify-center text-[9px] font-mono font-bold shadow-lg`;
      tgtEl.innerText = 'TGT';

      this.markerManager.addMarker('tactical-los-target', {
        longitude: targetPoint.lng,
        latitude: targetPoint.lat,
        element: tgtEl,
        popupContent: `
          <div style="font-family:monospace; padding:4px; font-size:11px; background:#090d16; color:#e2e8f0; border-radius:6px; border:1px solid ${
            losResult.clearLineOfSight ? '#22c55e' : '#ef4444'
          };">
            <div style="color:${losResult.clearLineOfSight ? '#22c55e' : '#ef4444'}; font-weight:bold;">
              TARGET (${losResult.clearLineOfSight ? 'DIRECT SIGHT' : 'OCCLUDED'})
            </div>
            <div>ELEVATION: ${losResult.targetAltitude}m ASL</div>
            <div>DISTANCE: ${losResult.totalDistance}m</div>
          </div>
        `
      });

      // 4. Place Obstruction Marker if occluded
      if (!losResult.clearLineOfSight && losResult.firstObstruction) {
        const obsPointEl = document.createElement('div');
        obsPointEl.className =
          'w-4 h-4 rounded-full bg-red-600 border border-white flex items-center justify-center text-[8px] font-bold text-white shadow-xl animate-pulse';
        obsPointEl.innerText = 'X';

        this.markerManager.addMarker('tactical-los-obstruction', {
          longitude: losResult.firstObstruction.lng,
          latitude: losResult.firstObstruction.lat,
          element: obsPointEl,
          popupContent: `
            <div style="font-family:monospace; padding:4px; font-size:11px; background:#090d16; color:#e2e8f0; border-radius:6px; border:1px solid #ef4444;">
              <div style="color:#ef4444; font-weight:bold;">TERRAIN OBSTRUCTION</div>
              <div>DISTANCE: ${losResult.firstObstruction.distance}m</div>
              <div>BLOCK DEPTH: +${losResult.firstObstruction.depth}m</div>
            </div>
          `
        });
      }
    }

    return losResult;
  }

  /**
   * Clears active LOS ray, markers, and HUD data
   */
  clear() {
    if (this.layerManager) {
      this.layerManager.removeLayer('tactical-los-line');
      this.layerManager.removeSource('tactical-los-source');
    }

    if (this.markerManager) {
      this.markerManager.removeMarker('tactical-los-observer');
      this.markerManager.removeMarker('tactical-los-target');
      this.markerManager.removeMarker('tactical-los-obstruction');
    }

    this.losData = null;
  }

  getLOSData() {
    return this.losData;
  }
}
