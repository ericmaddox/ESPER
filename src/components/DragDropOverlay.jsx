import React, { useState, useEffect } from 'react';
import { UploadCloud, FileText, CheckCircle, AlertCircle } from 'lucide-react';

export default function DragDropOverlay({ onFileDrop }) {
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    let dragCounter = 0;

    const handleDragEnter = (e) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter++;
      if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
        setIsDragging(true);
      }
    };

    const handleDragLeave = (e) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter--;
      if (dragCounter === 0) {
        setIsDragging(false);
      }
    };

    const handleDragOver = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDrop = async (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      dragCounter = 0;

      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        const file = files[0];
        parseAndEmitFile(file);
      }
    };

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, []);

  const parseAndEmitFile = (file) => {
    const fileName = file.name;
    const ext = fileName.split('.').pop().toLowerCase();

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target.result;

        if (ext === 'geojson' || ext === 'json') {
          const geojson = JSON.parse(content);
          if (onFileDrop) {
            onFileDrop({
              fileName,
              type: 'GeoJSON',
              data: geojson
            });
          }
        } else if (ext === 'kml') {
          const geojson = parseKMLToGeoJSON(content);
          if (onFileDrop) {
            onFileDrop({
              fileName,
              type: 'KML',
              data: geojson
            });
          }
        } else {
          alert(`Unsupported spatial file type ".${ext}". Please drop a .geojson, .json, or .kml file.`);
        }
      } catch (err) {
        console.error('Error parsing dropped spatial file:', err);
        alert(`Failed to parse file "${fileName}". Ensure it contains valid GeoJSON or KML structure.`);
      }
    };

    reader.readAsText(file);
  };

  if (!isDragging) return null;

  return (
    <div className="absolute inset-0 z-50 bg-slate-950/85 backdrop-blur-md border-4 border-dashed border-cyan-400 flex flex-col items-center justify-center text-cyan-300 font-mono pointer-events-none animate-fade-in">
      <div className="p-6 rounded-2xl glass-panel border border-cyan-500/40 text-center space-y-3 shadow-2xl">
        <UploadCloud className="w-16 h-16 text-cyan-400 mx-auto animate-bounce" />
        <div>
          <h3 className="text-lg font-bold uppercase tracking-wider text-slate-100">
            DROP SPATIAL DATA FILE HERE
          </h3>
          <p className="text-xs text-cyan-400 mt-1">
            Supports <strong className="text-white">.geojson</strong>, <strong className="text-white">.json</strong>, and <strong className="text-white">.kml</strong> formats
          </p>
        </div>
        <div className="text-[10px] text-slate-400 border-t border-slate-800 pt-2">
          Engine will automatically parse features, plot 3D vector layer, and fit camera bounds.
        </div>
      </div>
    </div>
  );
}

// Basic KML placemark to GeoJSON FeatureCollection converter
function parseKMLToGeoJSON(kmlString) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(kmlString, 'text/xml');
  const placemarks = xmlDoc.getElementsByTagName('Placemark');
  const features = [];

  for (let i = 0; i < placemarks.length; i++) {
    const pm = placemarks[i];
    const nameEl = pm.getElementsByTagName('name')[0];
    const name = nameEl ? nameEl.textContent : `Feature ${i + 1}`;

    const pointEl = pm.getElementsByTagName('Point')[0];
    if (pointEl) {
      const coordsEl = pointEl.getElementsByTagName('coordinates')[0];
      if (coordsEl) {
        const parts = coordsEl.textContent.trim().split(',');
        const lng = parseFloat(parts[0]);
        const lat = parseFloat(parts[1]);
        if (!isNaN(lng) && !isNaN(lat)) {
          features.push({
            type: 'Feature',
            properties: { name },
            geometry: {
              type: 'Point',
              coordinates: [lng, lat]
            }
          });
        }
      }
    }
  }

  return {
    type: 'FeatureCollection',
    features
  };
}
