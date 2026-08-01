import React from 'react';
import { Layers, Building2, Eye, Cone, AlertTriangle, Radio, Sun, Moon, Compass, Compass as Drone } from 'lucide-react';

export default function LayerToolbar({ layers, onToggleLayer, onFlyToPreset, laPresets }) {
  return (
    <div className="absolute top-16 right-4 z-20 flex flex-col space-y-2 pointer-events-auto">
      
      {/* 3D Map Layers Panel */}
      <div className="glass-panel p-2.5 rounded-xl border border-cyan-500/20 shadow-xl w-48 font-mono text-xs">
        <div className="flex items-center space-x-1.5 pb-2 mb-2 border-b border-cyan-500/20 text-cyan-400 font-bold uppercase text-[11px]">
          <Layers className="w-4 h-4" />
          <span>MAP LAYERS</span>
        </div>

        <div className="space-y-1.5">
          <button
            onClick={() => onToggleLayer('buildings')}
            className={`w-full px-2.5 py-1.5 rounded flex items-center justify-between transition-all ${
              layers.buildings
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                : 'bg-slate-900/40 text-slate-500 hover:text-slate-300 border border-transparent'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Building2 className="w-3.5 h-3.5" />
              <span>3D Buildings</span>
            </div>
            <span className="text-[10px]">{layers.buildings ? 'ON' : 'OFF'}</span>
          </button>

          <button
            onClick={() => onToggleLayer('cameras')}
            className={`w-full px-2.5 py-1.5 rounded flex items-center justify-between transition-all ${
              layers.cameras
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                : 'bg-slate-900/40 text-slate-500 hover:text-slate-300 border border-transparent'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Eye className="w-3.5 h-3.5" />
              <span>CCTV Pins</span>
            </div>
            <span className="text-[10px]">{layers.cameras ? 'ON' : 'OFF'}</span>
          </button>

          <button
            onClick={() => onToggleLayer('cameraCones')}
            className={`w-full px-2.5 py-1.5 rounded flex items-center justify-between transition-all ${
              layers.cameraCones
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                : 'bg-slate-900/40 text-slate-500 hover:text-slate-300 border border-transparent'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Cone className="w-3.5 h-3.5" />
              <span>3D Vision Cones</span>
            </div>
            <span className="text-[10px]">{layers.cameraCones ? 'ON' : 'OFF'}</span>
          </button>

          <button
            onClick={() => onToggleLayer('incidents')}
            className={`w-full px-2.5 py-1.5 rounded flex items-center justify-between transition-all ${
              layers.incidents
                ? 'bg-red-500/20 text-red-300 border border-red-500/40 font-bold'
                : 'bg-slate-900/40 text-slate-500 hover:text-slate-300 border border-transparent'
            }`}
          >
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>911 Calls</span>
            </div>
            <span className="text-[10px]">{layers.incidents ? 'ON' : 'OFF'}</span>
          </button>

          <button
            onClick={() => onToggleLayer('units')}
            className={`w-full px-2.5 py-1.5 rounded flex items-center justify-between transition-all ${
              layers.units
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                : 'bg-slate-900/40 text-slate-500 hover:text-slate-300 border border-transparent'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Radio className="w-3.5 h-3.5" />
              <span>Field Units</span>
            </div>
            <span className="text-[10px]">{layers.units ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </div>

      {/* Quick Camera Angle Presets */}
      <div className="glass-panel p-2 rounded-xl border border-cyan-500/20 shadow-xl w-48 font-mono text-xs space-y-1">
        <div className="px-1 text-[10px] text-slate-400 uppercase tracking-wider mb-1">CAMERA MODES</div>
        
        <button
          onClick={() => onFlyToPreset(laPresets[0])} // DTLA Overhead
          className="w-full px-2.5 py-1.5 rounded bg-slate-900/60 hover:bg-slate-800 text-slate-300 border border-slate-800 flex items-center space-x-2 text-[11px]"
        >
          <Compass className="w-3.5 h-3.5 text-cyan-400" />
          <span>Tactical Overhead</span>
        </button>

        <button
          onClick={() => onFlyToPreset(laPresets[1])} // Crypto Arena Street Level
          className="w-full px-2.5 py-1.5 rounded bg-slate-900/60 hover:bg-slate-800 text-slate-300 border border-slate-800 flex items-center space-x-2 text-[11px]"
        >
          <Drone className="w-3.5 h-3.5 text-purple-400" />
          <span>Street Level View</span>
        </button>
      </div>

    </div>
  );
}
