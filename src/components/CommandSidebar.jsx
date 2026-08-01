import React, { useState } from 'react';
import { 
  AlertTriangle, Eye, Navigation, MapPin, ChevronLeft, ChevronRight, 
  Radio, Shield, Search, Play, Crosshair, Radar, ShieldAlert, Cpu
} from 'lucide-react';

export default function CommandSidebar({
  incidents,
  cameras,
  units,
  skydioDrones = [],
  dedroneSensors = [],
  rogueDrones = [],
  laPresets,
  onFlyToPreset,
  onSelectCamera,
  onFlyToIncident,
  onFlyToLocation,
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
        <div className="grid grid-cols-5 border-b border-cyan-500/20 bg-slate-950/40 text-[10px] font-mono">
          <button
            onClick={() => setActiveTab('incidents')}
            className={`py-2 px-0.5 flex flex-col items-center justify-center border-b-2 transition-all ${
              activeTab === 'incidents'
                ? 'border-red-500 text-red-400 bg-red-500/10 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <div className="flex items-center space-x-0.5">
              <AlertTriangle className="w-3 h-3" />
              <span>CALLS</span>
            </div>
            <span className="text-[9px] text-slate-500">({incidents.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('cameras')}
            className={`py-2 px-0.5 flex flex-col items-center justify-center border-b-2 transition-all ${
              activeTab === 'cameras'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-500/10 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <div className="flex items-center space-x-0.5">
              <Eye className="w-3 h-3" />
              <span>CCTV</span>
            </div>
            <span className="text-[9px] text-slate-500">({cameras.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('drones')}
            className={`py-2 px-0.5 flex flex-col items-center justify-center border-b-2 transition-all ${
              activeTab === 'drones'
                ? 'border-sky-400 text-sky-300 bg-sky-500/10 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <div className="flex items-center space-x-0.5">
              <Radar className="w-3 h-3 text-sky-400" />
              <span>UAS</span>
            </div>
            <span className="text-[9px] text-slate-500">({skydioDrones.length + rogueDrones.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('units')}
            className={`py-2 px-0.5 flex flex-col items-center justify-center border-b-2 transition-all ${
              activeTab === 'units'
                ? 'border-amber-400 text-amber-300 bg-amber-500/10 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <div className="flex items-center space-x-0.5">
              <Radio className="w-3 h-3" />
              <span>UNITS</span>
            </div>
            <span className="text-[9px] text-slate-500">({units.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('presets')}
            className={`py-2 px-0.5 flex flex-col items-center justify-center border-b-2 transition-all ${
              activeTab === 'presets'
                ? 'border-purple-400 text-purple-300 bg-purple-500/10 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <div className="flex items-center space-x-0.5">
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

          {/* TAB 3: SKYDIO DFR & DEDRONE C-UAS */}
          {activeTab === 'drones' && (
            <div className="space-y-3 font-mono">
              
              {/* SECTION: Dedrone Detected Unauthorized UAS */}
              <div>
                <div className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-1.5 flex items-center space-x-1">
                  <ShieldAlert className="w-3.5 h-3.5 animate-pulse" />
                  <span>DEDRONE DETECTED UNAUTHORIZED UAS ({rogueDrones.length})</span>
                </div>

                {rogueDrones.map(rogue => (
                  <div key={rogue.id} className="p-3 rounded-lg border border-red-500/50 bg-red-950/20 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500/30 text-red-300 border border-red-500/50">
                        🚨 {rogue.id}
                      </span>
                      <span className="text-[10px] text-red-400 font-bold animate-pulse">
                        {rogue.threatLevel} THREAT
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-slate-100">{rogue.classification}</h4>
                    <p className="text-[10px] text-red-300 font-semibold">{rogue.violation}</p>

                    <div className="p-2 rounded bg-slate-950/80 border border-red-500/30 space-y-1 text-[10px]">
                      <div>SN: <strong className="text-sky-400">{rogue.serialNumber}</strong></div>
                      <div>REMOTE ID: <strong className="text-purple-400">{rogue.remoteIdBroadcast}</strong></div>
                      <div>MAC ADDR: <strong className="text-slate-400">{rogue.macAddress}</strong></div>
                      <div>FAA REG: <strong className="text-amber-400">{rogue.faaRegistration}</strong></div>
                    </div>

                    <div className="pt-1 grid grid-cols-2 gap-1 text-[10px] text-slate-300">
                      <div>ALTITUDE: <span className="text-red-400 font-bold">{rogue.altitude}m AGL ({rogue.altitudeMsl}m MSL)</span></div>
                      <div>CLIMB: <span className="text-slate-300 font-bold">{rogue.verticalRate}</span></div>
                      <div>SPEED: <span className="text-red-400 font-bold">{rogue.speed}</span></div>
                      <div>RF FREQ: <span className="text-purple-300">{rogue.rfFrequency}</span></div>
                    </div>

                    <div className="text-[10px] text-amber-300 bg-slate-950/90 p-2 rounded border border-amber-500/30 space-y-0.5">
                      <div className="font-bold text-amber-400">📍 PILOT LOC: {rogue.pilotLocationEst}</div>
                      <div className="text-slate-400">BEARING & RANGE: {rogue.pilotDistance}</div>
                      <div className="text-slate-400">HOME POINT: {rogue.homePoint}</div>
                    </div>

                    <button
                      onClick={() => onFlyToLocation && onFlyToLocation(rogue.latitude, rogue.longitude, 18)}
                      className="w-full mt-1 py-1 rounded bg-red-500/20 hover:bg-red-500/40 border border-red-500/40 text-red-300 text-[10px] font-bold flex items-center justify-center space-x-1 transition-all"
                    >
                      <Crosshair className="w-3 h-3 text-red-400" />
                      <span>TRACK UNAUTHORIZED UAS IN 3D</span>
                    </button>
                  </div>
                ))}
              </div>

              {/* SECTION: Skydio DFR Autonomous Fleet */}
              <div>
                <div className="text-[10px] font-bold text-sky-400 uppercase tracking-wider mb-1.5 flex items-center space-x-1">
                  <Cpu className="w-3.5 h-3.5" />
                  <span>SKYDIO DFR FLEET ({skydioDrones.length})</span>
                </div>

                {skydioDrones.map(drone => (
                  <div key={drone.id} className="p-3 rounded-lg border border-sky-500/30 bg-slate-900/70 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/40">
                        🚁 {drone.id}
                      </span>
                      <span className="text-[10px] text-emerald-400 font-bold">{drone.status}</span>
                    </div>

                    <h4 className="text-xs font-bold text-slate-100">{drone.callsign}</h4>
                    <p className="text-[10px] text-slate-400">{drone.mission}</p>

                    <div className="pt-1.5 border-t border-slate-800 grid grid-cols-2 gap-1 text-[10px] text-slate-300">
                      <div>ALT: <span className="text-sky-300 font-bold">{drone.altitude}m</span></div>
                      <div>SPEED: <span className="text-sky-300 font-bold">{drone.speed}</span></div>
                      <div>BATTERY: <span className="text-emerald-400 font-bold">{drone.battery}</span></div>
                      <div>AUTONOMY: <span className="text-sky-400 font-bold">{drone.autonomyMode}</span></div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <button
                        onClick={() => onSelectCamera && onSelectCamera({
                          id: drone.id,
                          name: drone.callsign,
                          videoUrl: drone.videoUrl,
                          latitude: drone.latitude,
                          longitude: drone.longitude,
                          height: drone.altitude,
                          fov: 80,
                          status: 'LIVE SKYDIO EO/IR',
                          network: 'Skydio DFR Fleet Link'
                        })}
                        className="px-2 py-1 rounded bg-sky-500/20 hover:bg-sky-500/40 border border-sky-500/40 text-sky-300 text-[10px] font-bold flex items-center space-x-1"
                      >
                        <Play className="w-3 h-3 text-sky-300" />
                        <span>PAYLOAD FEED</span>
                      </button>

                      <button
                        onClick={() => onFlyToLocation && onFlyToLocation(drone.latitude, drone.longitude, 17.5)}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-[10px] font-bold flex items-center space-x-1"
                      >
                        <Crosshair className="w-3 h-3 text-sky-400" />
                        <span>FLY TO 3D</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* SECTION: Dedrone RF Sensor Grid */}
              <div>
                <div className="text-[10px] font-bold text-purple-400 uppercase tracking-wider mb-1.5 flex items-center space-x-1">
                  <Radar className="w-3.5 h-3.5 text-purple-400" />
                  <span>DEDRONE C-UAS SENSOR GRID ({dedroneSensors.length})</span>
                </div>

                {dedroneSensors.map(sensor => (
                  <div key={sensor.id} className="p-2.5 rounded-lg border border-purple-500/30 bg-slate-900/70 text-[10px]">
                    <div className="flex items-center justify-between font-bold text-purple-300">
                      <span>{sensor.name}</span>
                      <span className="text-emerald-400">● {sensor.status}</span>
                    </div>
                    <div className="text-slate-400 mt-0.5">{sensor.location}</div>
                    <div className="text-slate-400 mt-1 flex justify-between">
                      <span>RF RADIUS: <strong className="text-purple-300">{sensor.detectionRadiusMeters}m</strong></span>
                      <span>THREATS: <strong className="text-red-400">{sensor.detectedThreatsCount}</strong></span>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          )}

          {/* TAB 4: FIELD UNITS */}
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

          {/* TAB 5: LA 3D PRESETS */}
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
