/**
 * ESPER 3D Geospatial Engine - Marker & Popup Lifecycle Manager
 */

import maplibregl from 'maplibre-gl';

export class MarkerManager {
  constructor(map) {
    this.map = map;
    this.markers = new Map();
  }

  /**
   * Adds or updates a custom DOM marker on the 3D map
   */
  addMarker(id, { longitude, latitude, element, popupContent, onClick, anchor = 'center' }) {
    if (!this.map) return null;
    try {
      this.removeMarker(id);

      if (onClick && element) {
        element.addEventListener('click', (e) => {
          e.stopPropagation();
          onClick({ id, longitude, latitude });
        });
      }

      const marker = new maplibregl.Marker({ element, anchor })
        .setLngLat([longitude, latitude]);

      if (popupContent) {
        const popup = new maplibregl.Popup({ offset: 20, closeButton: true })
          .setHTML(popupContent);
        marker.setPopup(popup);
      }

      marker.addTo(this.map);
      this.markers.set(id, marker);
      return marker;
    } catch (err) {
      console.warn(`MarkerManager: Error adding marker "${id}":`, err);
      return null;
    }
  }

  /**
   * Removes a specific marker by ID
   */
  removeMarker(id) {
    if (this.markers.has(id)) {
      try {
        const marker = this.markers.get(id);
        marker.remove();
        this.markers.delete(id);
      } catch (err) {
        console.warn(`MarkerManager: Error removing marker "${id}":`, err);
      }
    }
  }

  /**
   * Clears all markers registered in this manager
   */
  clearAll() {
    this.markers.forEach((marker) => {
      try {
        marker.remove();
      } catch (err) {
        // silent catch
      }
    });
    this.markers.clear();
  }
}
