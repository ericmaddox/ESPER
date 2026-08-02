import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, X, Loader2 } from 'lucide-react';

export default function AddressSearch({ activeRegion, onSelectLocation }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const searchRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced address search fetch using Nominatim API (Universal Global Search)
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const timer = setTimeout(async () => {
      try {
        // Universal search for exact query string
        let searchUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=6&addressdetails=1`;

        let response = await fetch(searchUrl, {
          headers: {
            'User-Agent': 'ESPER-3D-DigitalTwin/2.0'
          }
        });

        if (response.ok) {
          let data = await response.json();
          
          // If no global match found and query has no comma, try biasing with active region context
          if (data.length === 0 && activeRegion && !query.includes(',')) {
            const biasedQuery = `${query}, ${activeRegion.name}`;
            const fallbackUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(biasedQuery)}&limit=6&addressdetails=1`;
            const fallbackRes = await fetch(fallbackUrl, {
              headers: { 'User-Agent': 'ESPER-3D-DigitalTwin/2.0' }
            });
            if (fallbackRes.ok) {
              data = await fallbackRes.json();
            }
          }

          setResults(data);
          setIsOpen(true);
        }
      } catch (err) {
        console.error('Geocoding search failed:', err);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, activeRegion]);

  const handleSelect = (item) => {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    const displayName = item.display_name;

    if (onSelectLocation) {
      onSelectLocation({
        latitude: lat,
        longitude: lng,
        name: item.name || displayName.split(',')[0],
        address: displayName
      });
    }

    setIsOpen(false);
    setQuery(item.name || displayName.split(',')[0]);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
  };

  return (
    <div ref={searchRef} className="relative w-64 md:w-80 pointer-events-auto font-mono text-xs">
      <div className="relative flex items-center">
        <Search className="absolute left-3 w-3.5 h-3.5 text-cyan-400 pointer-events-none" />
        
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder="SEARCH ADDRESS / LANDMARK..."
          className="w-full pl-8 pr-8 py-1.5 bg-slate-900/80 hover:bg-slate-900 border border-cyan-500/30 focus:border-cyan-400 rounded-lg text-slate-100 placeholder-slate-500 outline-none transition-all shadow-inner text-[11px]"
        />

        {isLoading ? (
          <Loader2 className="absolute right-2.5 w-3.5 h-3.5 text-cyan-400 animate-spin" />
        ) : query ? (
          <button
            onClick={handleClear}
            className="absolute right-2.5 p-0.5 text-slate-400 hover:text-white rounded"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : null}
      </div>

      {/* Autocomplete Results Dropdown */}
      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1.5 glass-panel rounded-lg border border-cyan-500/40 shadow-2xl overflow-hidden z-50 max-h-72 overflow-y-auto divide-y divide-slate-800/60">
          <div className="px-3 py-1 bg-slate-900/90 text-[10px] text-cyan-400 font-bold uppercase tracking-wider">
            SEARCH RESULTS ({results.length})
          </div>

          {results.map((item, idx) => (
            <button
              key={item.place_id || idx}
              onClick={() => handleSelect(item)}
              className="w-full px-3 py-2 text-left hover:bg-cyan-500/10 transition-colors flex items-start space-x-2 group"
            >
              <MapPin className="w-3.5 h-3.5 text-cyan-400 group-hover:text-cyan-300 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <div className="text-slate-100 font-bold text-[11px] truncate group-hover:text-cyan-300">
                  {item.name || item.display_name.split(',')[0]}
                </div>
                <div className="text-slate-400 text-[10px] truncate leading-tight">
                  {item.display_name}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
