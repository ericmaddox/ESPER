import React, { useState } from 'react';
import { Layers, Mountain, Building2, Palette, Navigation, Crosshair, ChevronRight, ChevronLeft } from 'lucide-react';
import { MAP_STYLES } from '../engine';

export default function EngineToolbar({
  activeStyle,
  onSelectStyle,
  show3DBuildings,
  onToggle3DBuildings,
  showTerrain,
  onToggleTerrain,
  presets = [],
  onSelectPreset
}) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="absolute top-20 right-4 z-40 flex flex-col items-end pointer-events-auto">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2.5 rounded-lg glass-panel border border-cyan-500/30 text-cyan-300 hover:bg-slate-900/90 transition-all shadow-xl flex items-center space-x-2"
        title="Toggle Engine Toolbar"
      >
        <Layers className="w-4 h-4 text-cyan-400" />
        <span className="text-xs font-mono font-bold uppercase tracking-wider">ENGINE CONTROLS</span>
        {isOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      {isOpen && (
        <div className="mt-2 w-64 glass-panel rounded-xl border border-cyan-500/30 p-3 shadow-2xl space-y-3 animate-fade-in font-mono text-xs">
          
          {/* Map Themes */}
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center space-x-1">
              <Palette className="w-3.5 h-3.5 text-cyan-400" />
              <span>MAP ENGINE THEMES</span>
            </div>
            <div className="grid grid-cols-1 gap-1">
              {Object.values(MAP_STYLES).map((style) => (
                <button
                  key={style.id}
                  onClick={() => onSelectStyle(style)}
                  className={`w-full px-2.5 py-1.5 rounded text-left flex items-center justify-between transition-all ${
                    activeStyle.id === style.id
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                      : 'bg-slate-900/40 text-slate-400 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  <span>{style.name}</span>
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: style.accentColor }}></span>
                </button>
              ))}
            </div>
          </div>

          {/* 3D Features Toggles */}
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center space-x-1">
              <Building2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>3D SPATIAL LAYERS</span>
            </div>

            <div className="space-y-1">
              <button
                onClick={onToggle3DBuildings}
                className={`w-full px-2.5 py-1.5 rounded flex items-center justify-between transition-all ${
                  show3DBuildings
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                    : 'bg-slate-900/40 text-slate-500 hover:text-slate-300 border border-transparent'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>3D Building Extrusions</span>
                </div>
                <span className="text-[10px]">{show3DBuildings ? 'ON' : 'OFF'}</span>
              </button>

              <button
                onClick={onToggleTerrain}
                className={`w-full px-2.5 py-1.5 rounded flex items-center justify-between transition-all ${
                  showTerrain
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                    : 'bg-slate-900/40 text-slate-500 hover:text-slate-300 border border-transparent'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Mountain className="w-3.5 h-3.5 text-emerald-400" />
                  <span>AWS Terrarium DEM 3D</span>
                </div>
                <span className="text-[10px]">{showTerrain ? 'ON' : 'OFF'}</span>
              </button>
            </div>
          </div>

          {/* 3D Camera Presets */}
          {presets.length > 0 && (
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center space-x-1">
                <Navigation className="w-3.5 h-3.5 text-cyan-400" />
                <span>3D CAMERA FLY-TO PRESETS</span>
              </div>
              <div className="space-y-1">
                {presets.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => onSelectPreset(preset)}
                    className="w-full px-2 py-1 rounded bg-slate-900/60 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-cyan-300 flex items-center justify-between transition-all"
                  >
                    <span>{preset.name}</span>
                    <Crosshair className="w-3 h-3 text-cyan-400" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
