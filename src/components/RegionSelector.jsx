import React, { useState, useRef, useEffect } from 'react';
import { MapPin, ChevronDown, Check, Search, Globe2 } from 'lucide-react';
import { CITY_REGIONS } from '../data/mockData';

export default function RegionSelector({ activeRegion = CITY_REGIONS[0], onSelectRegion }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef(null);
  const searchRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Auto-focus search when dropdown opens
      setTimeout(() => searchRef.current?.focus(), 50);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const filtered = CITY_REGIONS.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.badge.toLowerCase().includes(search.toLowerCase()) ||
    r.state?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative font-mono text-xs" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => { setIsOpen(!isOpen); setSearch(''); }}
        className="flex items-center space-x-2 px-2.5 py-1 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-400/50 transition-all font-bold group"
        title="Select 3D Mapping Region"
      >
        <MapPin className="w-3.5 h-3.5 text-cyan-400 group-hover:animate-pulse" />
        <span>{activeRegion.badge}</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-72 glass-panel rounded-xl border border-cyan-500/40 shadow-2xl shadow-cyan-900/30 z-50 animate-fade-in overflow-hidden">
          
          {/* Header */}
          <div className="px-3 py-2 border-b border-slate-700/60 bg-slate-950/60">
            <div className="flex items-center space-x-2 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
              <Globe2 className="w-3 h-3 text-cyan-500" />
              <span>SELECT 3D MAPPING REGION</span>
              <span className="ml-auto text-slate-500">{CITY_REGIONS.length} CITIES</span>
            </div>
          </div>

          {/* Search Filter */}
          <div className="px-2.5 py-2 border-b border-slate-800/50">
            <div className="flex items-center space-x-2 px-2 py-1.5 rounded-lg bg-slate-900/80 border border-slate-700/50 focus-within:border-cyan-500/40 transition-colors">
              <Search className="w-3 h-3 text-slate-500 flex-shrink-0" />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search cities..."
                className="bg-transparent text-xs text-slate-200 placeholder-slate-500 outline-none w-full font-mono"
              />
            </div>
          </div>

          {/* Scrollable City List */}
          <div className="max-h-64 overflow-y-auto overscroll-contain custom-scrollbar px-1.5 py-1.5 space-y-0.5">
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-center text-slate-500 text-[10px]">
                No regions match "{search}"
              </div>
            ) : (
              filtered.map((region) => {
                const isActive = activeRegion.id === region.id;
                return (
                  <button
                    key={region.id}
                    onClick={() => {
                      onSelectRegion(region);
                      setIsOpen(false);
                      setSearch('');
                    }}
                    className={`w-full px-2.5 py-2 rounded-lg text-left flex items-center justify-between transition-all duration-150 group/item ${
                      isActive
                        ? 'bg-cyan-500/20 border border-cyan-400/40'
                        : 'hover:bg-slate-800/60 border border-transparent hover:border-slate-700/50'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                        isActive 
                          ? 'bg-cyan-400 shadow-sm shadow-cyan-400/50' 
                          : 'bg-slate-600 group-hover/item:bg-slate-400'
                      }`} />
                      <div className="min-w-0">
                        <div className={`text-xs font-bold truncate ${
                          isActive ? 'text-cyan-200' : 'text-slate-300 group-hover/item:text-white'
                        }`}>
                          {region.name}
                        </div>
                        <div className="text-[9px] text-slate-500 font-mono">
                          {region.presets.length} presets · {region.badge}
                        </div>
                      </div>
                    </div>

                    {isActive && (
                      <Check className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-3 py-1.5 border-t border-slate-800/50 bg-slate-950/40">
            <p className="text-[8px] text-slate-500 font-mono text-center uppercase tracking-wider">
              {filtered.length} of {CITY_REGIONS.length} regions
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
