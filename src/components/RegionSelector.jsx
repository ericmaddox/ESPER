import React, { useState } from 'react';
import { MapPin, ChevronDown, Check } from 'lucide-react';
import { CITY_REGIONS } from '../data/mockData';

export default function RegionSelector({ activeRegion = CITY_REGIONS[0], onSelectRegion }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative font-mono text-xs">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-2.5 py-1 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-400/50 transition-all font-bold"
        title="Select 3D Mapping Region"
      >
        <MapPin className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
        <span>{activeRegion.badge}</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1.5 w-60 glass-panel rounded-xl border border-cyan-500/40 p-1.5 shadow-2xl z-50 animate-fade-in space-y-1">
          <div className="px-2 py-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
            SELECT 3D MAPPING REGION
          </div>

          {CITY_REGIONS.map((region) => (
            <button
              key={region.id}
              onClick={() => {
                onSelectRegion(region);
                setIsOpen(false);
              }}
              className={`w-full px-2.5 py-2 rounded text-left flex items-center justify-between transition-all ${
                activeRegion.id === region.id
                  ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-400/40 font-bold'
                  : 'hover:bg-slate-900/80 text-slate-300 hover:text-white border border-transparent'
              }`}
            >
              <div>
                <div className="text-xs font-bold">{region.name}</div>
                <div className="text-[9px] text-slate-400 font-mono">
                  {region.presets.length} 3D Camera Presets
                </div>
              </div>

              {activeRegion.id === region.id && (
                <Check className="w-4 h-4 text-cyan-400" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
