import React, { useState, useEffect } from 'react';
import { Shield, Eye, AlertTriangle, Maximize2, Activity } from 'lucide-react';
import AddressSearch from './AddressSearch';
import RegionSelector from './RegionSelector';

export default function Header({ 
  mode = 'clean', 
  onToggleMode, 
  activeRegion,
  onSelectRegion,
  activeIncidentsCount, 
  activeCamerasCount, 
  activeUnitsCount, 
  toggleFullscreen, 
  onSelectLocation 
}) {
  const [time, setTime] = useState('');
  const [date, setDate] = useState('');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setDate(now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: '2-digit', year: 'numeric' }));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="absolute top-0 left-0 right-0 z-20 h-14 px-4 glass-panel border-b border-cyan-500/20 flex items-center justify-between pointer-events-auto">
      {/* Brand & System Title */}
      <div className="flex items-center space-x-3">
        <div className="relative flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-400/40 text-cyan-400">
          <Shield className="w-5 h-5 text-cyan-300" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-base font-bold tracking-wider text-slate-100 uppercase">
              ESP<span className="text-cyan-400">ER</span>
            </h1>

            {/* Region Selector */}
            {onSelectRegion && (
              <RegionSelector activeRegion={activeRegion} onSelectRegion={onSelectRegion} />
            )}
            
            {/* Workspace Mode Switcher */}
            {onToggleMode && (
              <div className="flex items-center bg-slate-950 p-0.5 rounded border border-cyan-500/30 text-[10px] font-mono">
                <button
                  onClick={() => onToggleMode('clean')}
                  className={`px-2 py-0.5 rounded transition-all font-bold ${
                    mode === 'clean'
                      ? 'bg-cyan-500/30 text-cyan-200 border border-cyan-400/50 shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  CLEAN ENGINE
                </button>
                <button
                  onClick={() => onToggleMode('demo')}
                  className={`px-2 py-0.5 rounded transition-all font-bold ${
                    mode === 'demo'
                      ? 'bg-purple-500/30 text-purple-200 border border-purple-400/50 shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  DEMO SCENARIO
                </button>
              </div>
            )}
          </div>
          <p className="text-[11px] text-slate-400 font-mono tracking-tight hidden xl:block">
            {mode === 'clean' ? 'PRISTINE 3D GEOSPATIAL ENGINE CANVAS' : 'REAL-TIME 3D SITUATIONAL AWARENESS DEMO'}
          </p>
        </div>
      </div>

      {/* Address Search Bar */}
      <div className="mx-2 flex-1 max-w-md flex justify-center">
        <AddressSearch activeRegion={activeRegion} onSelectLocation={onSelectLocation} />
      </div>

      {/* Telemetry Metrics (Visible in Demo mode) */}
      {mode === 'demo' && (
        <div className="hidden lg:flex items-center space-x-4 text-xs font-mono">
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded bg-slate-900/60 border border-slate-800">
            <AlertTriangle className="w-4 h-4 text-red-400 animate-pulse" />
            <div>
              <span className="text-slate-400 text-[10px] uppercase block leading-none">ACTIVE INCIDENTS</span>
              <span className="text-red-400 font-bold text-sm leading-tight">{activeIncidentsCount}</span>
            </div>
          </div>

          <div className="flex items-center space-x-2 px-3 py-1.5 rounded bg-slate-900/60 border border-slate-800">
            <Eye className="w-4 h-4 text-cyan-400" />
            <div>
              <span className="text-slate-400 text-[10px] uppercase block leading-none">CCTV NODES</span>
              <span className="text-cyan-400 font-bold text-sm leading-tight">{activeCamerasCount} ONLINE</span>
            </div>
          </div>
        </div>
      )}

      {/* Time & Quick Actions */}
      <div className="flex items-center space-x-3">
        <div className="text-right font-mono hidden sm:block">
          <div className="text-sm font-bold text-cyan-300 tracking-wider leading-none">{time} <span className="text-[10px] text-slate-400">PST</span></div>
          <div className="text-[10px] text-slate-400 leading-tight uppercase">{date}</div>
        </div>

        <button
          onClick={toggleFullscreen}
          title="Toggle Fullscreen Mode"
          className="p-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-cyan-500/30 text-cyan-400 hover:text-cyan-300 transition-all duration-150 active:scale-95"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
