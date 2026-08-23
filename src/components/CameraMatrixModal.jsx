import React, { useState } from 'react';
import { X, Video, Maximize2, Radio } from 'lucide-react';
import VideoFeedModal from './VideoFeedModal';

export default function CameraMatrixModal({ incident, cameras = [], onClose }) {
  const [selectedSingleCamera, setSelectedSingleCamera] = useState(null);

  if (!incident) return null;

  // Filter top 4 closest live cameras
  const nearbyCameras = cameras.filter((c) => c.status === 'LIVE').slice(0, 4);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in font-mono">
      <div className="relative w-full max-w-5xl glass-panel rounded-2xl border border-cyan-500/40 shadow-2xl overflow-hidden bg-slate-950/95 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 py-3 border-b border-cyan-500/30 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                  SURVEILLANCE CAMERA MATRIX
                </h2>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold flex items-center space-x-1">
                  <Radio className="w-3 h-3 animate-pulse text-emerald-400" />
                  <span>QUAD LIVE FEEDS</span>
                </span>
              </div>
              <p className="text-[11px] text-cyan-400">
                ACTIVE TARGET: <strong className="text-white">{incident.type}</strong> —{' '}
                {incident.address}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 4-Up Video Grid */}
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3 overflow-y-auto custom-scrollbar">
          {nearbyCameras.map((camera, index) => (
            <div
              key={camera.id}
              className="relative rounded-xl border border-slate-800 bg-slate-900/90 overflow-hidden flex flex-col group hover:border-cyan-500/50 transition-all shadow-lg"
            >
              {/* Camera Header Bar */}
              <div className="px-3 py-1.5 bg-slate-950/80 border-b border-slate-800/80 flex items-center justify-between text-[10px]">
                <div className="flex items-center space-x-1.5 truncate">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="font-bold text-slate-200 truncate">
                    CAM {index + 1}: {camera.name || camera.location}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedSingleCamera(camera)}
                  className="px-1.5 py-0.5 rounded bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-300 border border-cyan-500/30 text-[9px] flex items-center space-x-1"
                >
                  <Maximize2 className="w-2.5 h-2.5" />
                  <span>EXPAND</span>
                </button>
              </div>

              {/* Video Stream Container */}
              <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
                {camera.posterUrl ? (
                  <img
                    src={camera.posterUrl}
                    alt={camera.name}
                    className="w-full h-full object-cover opacity-85 group-hover:opacity-100 transition-opacity"
                  />
                ) : (
                  <div className="text-slate-600 flex flex-col items-center space-y-1">
                    <Video className="w-8 h-8" />
                    <span className="text-[10px]">FEED INITIALIZING</span>
                  </div>
                )}

                {/* Tactical HUD Overlay */}
                <div className="absolute inset-0 pointer-events-none p-2 flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <span className="px-1.5 py-0.5 rounded bg-slate-950/80 text-emerald-400 text-[9px] border border-emerald-500/30 font-bold">
                      LIVE HLS • 1080P
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-950/80 text-slate-400 text-[9px] border border-slate-800">
                      ID: {camera.id}
                    </span>
                  </div>

                  <div className="flex justify-between items-end text-[9px] text-cyan-400 bg-slate-950/70 px-2 py-1 rounded backdrop-blur-sm border border-cyan-500/20">
                    <span>
                      GPS: {camera.latitude.toFixed(4)}, {camera.longitude.toFixed(4)}
                    </span>
                    <span className="text-amber-300 font-bold">PTZ ONLINE</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-2.5 bg-slate-900/60 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <span>Surveillance feeds filtered by proximity to active incident cordon</span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all font-bold"
          >
            DISMISS MATRIX
          </button>
        </div>
      </div>

      {/* Expanded Single Camera PTZ Modal */}
      {selectedSingleCamera && (
        <VideoFeedModal
          camera={selectedSingleCamera}
          onClose={() => setSelectedSingleCamera(null)}
        />
      )}
    </div>
  );
}
