import React, { useState } from 'react';
import { ShieldAlert, AlertTriangle, Radio, X, Disc, Sliders } from 'lucide-react';
import { STANDOFF_PRESETS, formatDistance, formatArea } from '../engine';

export default function TacticalPerimeterHUD({
  isDeployMode,
  onToggleDeployMode,
  activePerimeter,
  onDeployPerimeter,
  onClearPerimeter,
  onConfigChange
}) {
  const [selectedPresetId, setSelectedPresetId] = useState('swat-barricade');
  const [customHot, setCustomHot] = useState(150);
  const [customWarm, setCustomWarm] = useState(300);
  const [customCold, setCustomCold] = useState(600);
  const [showSliders, setShowSliders] = useState(false);

  const selectedPreset = Object.values(STANDOFF_PRESETS).find((p) => p.id === selectedPresetId);

  const hotRadius = showSliders ? customHot : selectedPreset?.hotRadius || 150;
  const warmRadius = showSliders ? customWarm : selectedPreset?.warmRadius || 300;
  const coldRadius = showSliders ? customCold : selectedPreset?.coldRadius || 600;

  const handleSelectPreset = (preset) => {
    setSelectedPresetId(preset.id);
    setCustomHot(preset.hotRadius);
    setCustomWarm(preset.warmRadius);
    setCustomCold(preset.coldRadius);

    if (onConfigChange) {
      onConfigChange({
        hotRadius: preset.hotRadius,
        warmRadius: preset.warmRadius,
        coldRadius: preset.coldRadius,
        label: preset.name
      });
    }

    if (activePerimeter) {
      onDeployPerimeter(
        activePerimeter.center[0],
        activePerimeter.center[1],
        preset.hotRadius,
        preset.warmRadius,
        preset.coldRadius,
        preset.name
      );
    }
  };

  const handleRadiusSliderChange = (type, val) => {
    let nextHot = customHot;
    let nextWarm = customWarm;
    let nextCold = customCold;

    if (type === 'hot') {
      nextHot = val;
      setCustomHot(val);
    } else if (type === 'warm') {
      nextWarm = val;
      setCustomWarm(val);
    } else if (type === 'cold') {
      nextCold = val;
      setCustomCold(val);
    }

    if (onConfigChange) {
      onConfigChange({
        hotRadius: nextHot,
        warmRadius: nextWarm,
        coldRadius: nextCold,
        label: 'CUSTOM CORDON'
      });
    }

    if (activePerimeter) {
      onDeployPerimeter(
        activePerimeter.center[0],
        activePerimeter.center[1],
        nextHot,
        nextWarm,
        nextCold,
        'CUSTOM CORDON'
      );
    }
  };

  return (
    <div className="absolute top-20 left-4 z-40 flex flex-col items-start pointer-events-auto font-mono text-xs max-w-xs">
      {/* Primary Toggle Header Button */}
      <div className="flex items-center space-x-2">
        <button
          onClick={onToggleDeployMode}
          className={`px-3 py-2 rounded-lg border flex items-center space-x-2 transition-all shadow-xl ${
            isDeployMode
              ? 'bg-red-500/25 border-red-500 text-red-200 animate-pulse font-bold'
              : 'glass-panel border-cyan-500/30 text-cyan-300 hover:bg-slate-900/90'
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-red-400" />
          <span className="uppercase tracking-wider font-bold">
            {isDeployMode ? 'CLICK MAP TO DROP CORDON' : 'TACTICAL CORDON'}
          </span>
        </button>

        {activePerimeter && (
          <button
            onClick={onClearPerimeter}
            className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/40 border border-red-500/40 text-red-300 transition-all"
            title="Clear Active Perimeter"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Cordon Configuration Panel */}
      {(isDeployMode || activePerimeter) && (
        <div className="mt-2 w-72 glass-panel rounded-xl border border-red-500/30 p-3 shadow-2xl space-y-3 animate-fade-in text-slate-200">
          <div className="flex items-center justify-between border-b border-red-500/20 pb-2">
            <div className="flex items-center space-x-1.5 text-red-400 font-bold text-[11px] uppercase tracking-wider">
              <Radio className="w-3.5 h-3.5 animate-spin text-red-400" />
              <span>CONTAINMENT CONFIG</span>
            </div>
            <button
              onClick={() => setShowSliders(!showSliders)}
              className="text-[10px] text-cyan-400 hover:text-cyan-200 flex items-center space-x-1"
            >
              <Sliders className="w-3 h-3" />
              <span>{showSliders ? 'PRESETS' : 'CUSTOM'}</span>
            </button>
          </div>

          {!showSliders ? (
            /* Tactical Presets Selector */
            <div className="space-y-1">
              {Object.values(STANDOFF_PRESETS).map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handleSelectPreset(preset)}
                  className={`w-full px-2.5 py-1.5 rounded text-left transition-all flex items-center justify-between ${
                    selectedPresetId === preset.id
                      ? 'bg-red-500/25 text-red-200 border border-red-500/50 font-bold'
                      : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  <div className="truncate pr-2">
                    <div className="text-[11px] truncate">{preset.name}</div>
                    <div className="text-[9px] text-slate-500">
                      Hot: {preset.hotRadius}m | Outer: {preset.coldRadius}m
                    </div>
                  </div>
                  <Disc
                    className={`w-3 h-3 flex-shrink-0 ${
                      selectedPresetId === preset.id ? 'text-red-400' : 'text-slate-600'
                    }`}
                  />
                </button>
              ))}
            </div>
          ) : (
            /* Custom Radius Sliders */
            <div className="space-y-2.5 text-[10px]">
              <div>
                <div className="flex justify-between text-red-400 font-bold mb-1">
                  <span>INNER HOT ZONE:</span>
                  <span>{customHot} m</span>
                </div>
                <input
                  type="range"
                  min="25"
                  max="500"
                  step="25"
                  value={customHot}
                  onChange={(e) => handleRadiusSliderChange('hot', parseInt(e.target.value))}
                  className="w-full accent-red-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-amber-400 font-bold mb-1">
                  <span>WARM STAGING ZONE:</span>
                  <span>{customWarm} m</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="1000"
                  step="50"
                  value={customWarm}
                  onChange={(e) => handleRadiusSliderChange('warm', parseInt(e.target.value))}
                  className="w-full accent-amber-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-cyan-400 font-bold mb-1">
                  <span>OUTER CORDON:</span>
                  <span>{customCold} m</span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="3000"
                  step="100"
                  value={customCold}
                  onChange={(e) => handleRadiusSliderChange('cold', parseInt(e.target.value))}
                  className="w-full accent-cyan-500"
                />
              </div>
            </div>
          )}

          {/* Active Cordon Metric Summary */}
          {activePerimeter && (
            <div className="border-t border-slate-800 pt-2 space-y-1 text-[10px] text-slate-400">
              <div className="flex justify-between">
                <span>OUTER CORDON:</span>
                <span className="text-cyan-300 font-bold">{formatDistance(coldRadius)}</span>
              </div>
              <div className="flex justify-between">
                <span>STAGING BUFFER:</span>
                <span className="text-amber-300 font-bold">{formatDistance(warmRadius)}</span>
              </div>
              <div className="flex justify-between">
                <span>CONTAINED AREA:</span>
                <span className="text-emerald-300 font-bold">
                  {formatArea(Math.PI * coldRadius * coldRadius)}
                </span>
              </div>
              <div className="flex justify-between text-red-400">
                <span>HOT THREAT ZONE:</span>
                <span className="font-bold">{formatDistance(hotRadius)}</span>
              </div>
            </div>
          )}

          {isDeployMode && !activePerimeter && (
            <div className="text-[10px] text-cyan-400/90 text-center border-t border-slate-800 pt-2 flex items-center justify-center space-x-1">
              <AlertTriangle className="w-3 h-3 text-amber-400 flex-shrink-0" />
              <span>Click anywhere on the 3D map to deploy cordon at target</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
