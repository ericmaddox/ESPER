import React, { useState } from 'react';
import { 
  AlertTriangle, Eye, Navigation, MapPin, ChevronLeft, ChevronRight, 
  Radio, Shield, Search, ExternalLink, Play, Crosshair, Sparkles
} from 'lucide-react';

export default function CommandSidebar({
  incidents,
  cameras,
  units,
  laPresets,
  onFlyToPreset,
  onSelectCamera,
  onFlyToIncident,
  selectedIncident,
  selectedCamera
}) {
  const [activeTab, setActiveTab] = useState('incidents');
  const [collapsed, setCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredIncidents = incidents.filter(inc => 
    inc.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inc.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inc.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCameras = cameras.filter(cam =>
    cam.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cam.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cam.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div 
      className={`absolute top-16 left-4 bottom-6 z-20 transition-all duration-300 flex ${
        collapsed ? 'w-12' : 'w-96'
      }`}
    >
      {/* Sidebar Main Panel */}
      <div className={`w-full h-full glass-panel rounded-xl flex flex-col overflow-hidden border border-cyan-500/20 shadow-2xl transition-all duration-300 ${collapsed ? 'hidden' : 'flex'}`}>
        
        {/* Panel Header & Search */}
        <div className="p-3 border-b border-cyan-500/20 bg-slate-900/60">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center space-x-2">
              <Shield className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                COMMAND FEED & DISPATCH
              </span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
              LA DIVISION
            </span>
          </div>

          {/* Quick Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search incidents, cameras, LA addresses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-950/80 border border-slate-800 rounded text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 font-sans"
            />
          </div>
        </div>

        {/* Tab Selection Navigation */}
        <div className="grid grid-cols-4 border-b border-cyan-500/20 bg-slate-950/40 text-[11px] font-mono">
          <button
            onClick={() => setActiveTab('incidents')}
            className={`py-2 px-1 flex flex-col items-center justify-center border-b-2 transition-all ${
              activeTab === 'incidents'
                ? 'border-red-500 text-red-400 bg-red-500/10 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <div className="flex items-center space-x-1">
              <AlertTriangle className="w-3 h-3" />
              <span>CALLS</span>
            </div>
            <span className="text-[9px] text-slate-500">({incidents.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('cameras')}
            className={`py-2 px-1 flex flex-col items-center justify-center border-b-2 transition-all ${
              activeTab === 'cameras'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-500/10 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <div className="flex items-center space-x-1">
              <Eye className="w-3 h-3" />
              <span>CCTV</span>
            </div>
            <span className="text-[9px] text-slate-500">({cameras.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('units')}
            className={`py-2 px-1 flex flex-col items-center justify-center border-b-2 transition-all ${
              activeTab === 'units'
                ? 'border-amber-400 text-amber-300 bg-amber-500/10 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <div className="flex items-center space-x-1">
              <Radio className="w-3 h-3" />
              <span>UNITS</span>
            </div>
            <span className="text-[9px] text-slate-500">({units.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('presets')}
            className={`py-2 px-1 flex flex-col items-center justify-center border-b-2 transition-all ${
              activeTab === 'presets'
                ? 'border-purple-400 text-purple-300 bg-purple-500/10 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <div className="flex items-center space-x-1">
              <MapPin className="w-3 h-3" />
              <span>PRESETS</span>
            </div>
            <span className="text-[9px] text-slate-500">({laPresets.length})</span>
          </button>
        </div>

        {/* Tab Body Content */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
          
          {/* TAB 1: INCIDENTS / 911 CALLS */}
          {activeTab === 'incidents' && (
            <div className="space-y-2">
              {filteredIncidents.map((inc) => {
                const isSelected = selectedIncident && selectedIncident.id === inc.id;
                const borderClass = inc.severity === 'critical' ? 'border-red-500/40 hover:border-red-500' :
                                    inc.severity === 'warning' ? 'border-amber-500/40 hover:border-amber-500' : 'border-cyan-500/30';
                
                return (
                  <div
                    key={inc.id}
                    className={`p-3 rounded-lg border bg-slate-900/70 backdrop-blur-md transition-all duration-150 ${borderClass} ${
                      isSelected ? 'ring-2 ring-red-500 bg-red-950/20' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        inc.severity === 'critical' ? 'bg-red-500/20 text-red-400 border border-red-500/40' :
                        inc.severity === 'warning' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' :
                        'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                      }`}>
                        {inc.id}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">{inc.time}</span>
                    </div>

                    <h3 className="text-xs font-bold text-slate-100 flex items-center justify-between">
                      <span>{inc.type}</span>
                      <span className="text-[10px] font-normal text-slate-400 uppercase">[{inc.status}]</span>
                    </h3>

                    <p className="text-[11px] text-slate-300 font-mono mt-1 flex items-center space-x-1">
                      <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                      <span className="truncate">{inc.address}</span>
                    </p>

                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {inc.description}
                    </p>

                    <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between">
                      <div className="flex items-center space-x-1 text-[10px] font-mono text-slate-400">
                        <span>UNITS:</span>
                        {inc.unitsAssigned.map(u => (
                          <span key={u} className="px-1 py-0.2 rounded bg-slate-800 text-cyan-300 font-bold">{u}</span>
                        ))}
                      </div>

                      <button
                        onClick={() => onFlyToIncident(inc)}
                        className="px-2.5 py-1 rounded bg-red-500/20 hover:bg-red-500/40 border border-red-500/40 text-red-300 text-[10px] font-mono font-bold flex items-center space-x-1 transition-all"
                      >
                        <Crosshair className="w-3 h-3 text-red-400" />
                        <span>FLY TO 3D</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 2: CCTV CAMERAS */}
          {activeTab === 'cameras' && (
            <div className="space-y-2">
              {filteredCameras.map((cam) => (
                <div
                  key={cam.id}
                  className="p-3 rounded-lg border border-cyan-500/20 bg-slate-900/70 hover:border-cyan-500/50 transition-all"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                      {cam.id}
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 flex items-center space-x-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span>{cam.status}</span>
                    </span>
                  </div>

                  <h3 className="text-xs font-bold text-slate-100">{cam.name}</h3>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">{cam.location}</p>
                  
                  <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span>ALT: {cam.height}m | FOV: {cam.fov}°</span>
                    <button
                      onClick={() => onSelectCamera(cam)}
                      className="px-2.5 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/40 border border-cyan-500/40 text-cyan-300 font-bold flex items-center space-x-1 transition-all"
                    >
                      <Play className="w-3 h-3 text-cyan-300" />
                      <span>VIEW FEED</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: FIELD UNITS */}
          {activeTab === 'units' && (
            <div className="space-y-2">
              {units.map((unit) => (
                <div
                  key={unit.id}
                  className="p-3 rounded-lg border border-amber-500/30 bg-slate-900/70"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      {unit.id}
                    </span>
                    <span className="text-[10px] font-mono text-amber-400 font-bold">{unit.status}</span>
                  </div>
                  <h3 className="text-xs font-bold text-slate-100">{unit.callsign}</h3>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">{unit.type}</p>

                  <div className="mt-2 pt-2 border-t border-slate-800 grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-300">
                    <div>ALTITUDE: <span className="text-amber-300 font-bold">{unit.altitude}m</span></div>
                    <div>SPEED: <span className="text-amber-300 font-bold">{unit.speed}</span></div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 4: LA 3D PRESETS */}
          {activeTab === 'presets' && (
            <div className="space-y-2">
              {laPresets.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => onFlyToPreset(preset)}
                  className="w-full p-3 rounded-lg border border-purple-500/30 bg-slate-900/70 hover:bg-purple-950/30 hover:border-purple-500/60 text-left transition-all flex items-center justify-between group"
                >
                  <div>
                    <h3 className="text-xs font-bold text-slate-100 group-hover:text-purple-300 transition-colors">
                      {preset.name}
                    </h3>
                    <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                      ALT: {preset.height}m | HEADING: {preset.heading}°
                    </p>
                  </div>
                  <Navigation className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
                </button>
              ))}
            </div>
          )}

        </div>
      </div>

      {/* Collapse Toggle Handle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="h-10 w-6 glass-panel rounded-r-lg border-l-0 my-auto flex items-center justify-center text-cyan-400 hover:text-cyan-300 transition-colors border border-cyan-500/20"
        title={collapsed ? "Expand Command Sidebar" : "Collapse Sidebar"}
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </div>
  );
}
