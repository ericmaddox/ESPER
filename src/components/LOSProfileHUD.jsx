import React from 'react';
import { Eye, EyeOff, X, Mountain, Crosshair } from 'lucide-react';
import { formatDistance } from '../engine';

export default function LOSProfileHUD({ losData, onClose }) {
  if (!losData || !losData.profile || losData.profile.length === 0) return null;

  const {
    clearLineOfSight,
    totalDistance,
    slopeAngle,
    observerAltitude,
    targetAltitude,
    maxObstructionDepth,
    firstObstruction,
    profile
  } = losData;

  // Chart dimensions & scaling
  const minElev = Math.min(...profile.map((p) => Math.min(p.elevation, p.rayAltitude))) - 10;
  const maxElev = Math.max(...profile.map((p) => Math.max(p.elevation, p.rayAltitude))) + 15;
  const elevRange = Math.max(1, maxElev - minElev);

  const svgWidth = 500;
  const svgHeight = 90;

  // Build SVG Path for terrain
  const points = profile.map((p, i) => {
    const x = (i / (profile.length - 1)) * svgWidth;
    const y = svgHeight - ((p.elevation - minElev) / elevRange) * (svgHeight - 15) - 5;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const areaPath = `M0,${svgHeight} L${points.join(' L')} L${svgWidth},${svgHeight} Z`;
  const linePath = `M${points.join(' L')}`;

  // Direct Line-of-Sight Ray Coordinates
  const rayY1 = svgHeight - ((observerAltitude - minElev) / elevRange) * (svgHeight - 15) - 5;
  const rayY2 = svgHeight - ((targetAltitude - minElev) / elevRange) * (svgHeight - 15) - 5;

  return (
    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-40 w-full max-w-2xl px-4 pointer-events-auto font-mono text-xs animate-slide-up">
      <div className="glass-panel rounded-2xl border border-cyan-500/40 p-4 shadow-2xl backdrop-blur-xl bg-slate-950/90 text-slate-200 space-y-3">
        {/* Header Status Bar */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center space-x-2">
            {clearLineOfSight ? (
              <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold flex items-center space-x-1 text-[11px]">
                <Eye className="w-3.5 h-3.5 text-emerald-400" />
                <span>DIRECT LINE OF SIGHT — CLEAR</span>
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded bg-red-500/20 text-red-300 border border-red-500/40 font-bold flex items-center space-x-1 text-[11px] animate-pulse">
                <EyeOff className="w-3.5 h-3.5 text-red-400" />
                <span>OCCLUDED — OBSTRUCTION DETECTED (+{maxObstructionDepth}m)</span>
              </span>
            )}
            <span className="text-[10px] text-slate-400 hidden sm:inline">
              SLOPE:{' '}
              <strong className="text-cyan-300">
                {slopeAngle > 0 ? `+${slopeAngle}°` : `${slopeAngle}°`}
              </strong>
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-[10px] text-slate-400">
              DISTANCE: <strong className="text-amber-300">{formatDistance(totalDistance)}</strong>
            </span>
            <button
              onClick={onClose}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
              title="Close LOS Analysis"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 3D Elevation Cross-Section SVG Chart */}
        <div className="relative bg-slate-900/80 rounded-xl p-2 border border-slate-800 overflow-hidden">
          <div className="flex justify-between text-[9px] text-slate-500 mb-1 px-1">
            <span className="flex items-center space-x-1 text-cyan-400 font-bold">
              <Crosshair className="w-2.5 h-2.5" />
              <span>OBSERVER ({observerAltitude}m ASL)</span>
            </span>
            <span className="flex items-center space-x-1 text-slate-400">
              <Mountain className="w-2.5 h-2.5" />
              <span>TERRAIN PROFILE (DEM)</span>
            </span>
            <span className="flex items-center space-x-1 text-amber-400 font-bold">
              <span>TARGET ({targetAltitude}m ASL)</span>
            </span>
          </div>

          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-24 overflow-visible">
            <defs>
              <linearGradient id="terrainGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#0891b2" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#0891b2" stopOpacity="0.05" />
              </linearGradient>
            </defs>

            {/* Terrain Silhouette Fill */}
            <path d={areaPath} fill="url(#terrainGrad)" />
            {/* Terrain Ridgeline Stroke */}
            <path d={linePath} fill="none" stroke="#22d3ee" strokeWidth="2" />

            {/* Direct Line-of-Sight Beam */}
            <line
              x1="0"
              y1={rayY1}
              x2={svgWidth}
              y2={rayY2}
              stroke={clearLineOfSight ? '#22c55e' : '#ef4444'}
              strokeWidth="2.5"
              strokeDasharray={clearLineOfSight ? 'none' : '4 3'}
              strokeOpacity="0.95"
            />

            {/* Observer Origin Pin */}
            <circle cx="0" cy={rayY1} r="4" fill="#06b6d4" stroke="#ffffff" strokeWidth="1.5" />
            {/* Target Destination Pin */}
            <circle
              cx={svgWidth}
              cy={rayY2}
              r="4"
              fill={clearLineOfSight ? '#22c55e' : '#ef4444'}
              stroke="#ffffff"
              strokeWidth="1.5"
            />
          </svg>

          {firstObstruction && (
            <div className="mt-1 text-[10px] text-red-400 flex items-center justify-between border-t border-slate-800/80 pt-1 px-1">
              <span>
                PRIMARY BLOCK AT: <strong>{firstObstruction.distance}m</strong>
              </span>
              <span>
                TERRAIN: <strong>{firstObstruction.terrainAltitude}m</strong> (BEAM:{' '}
                {firstObstruction.rayAltitude}m)
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
