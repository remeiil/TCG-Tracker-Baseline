// SearchBar.jsx
import React, { useState, useEffect } from 'react';

const API_BASE_URL = `https://tcg-server.remeil.co.nz`;

export default function SearchBar({ 
  placeholder = "Search by card name, set, illustrator, rarity...", 
  onSearch, 
  debounceMs = 300 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [rarity, setRarity] = useState('');
  const [supertype, setSupertype] = useState('');
  
  // Set Filter State
  const [sets, setSets] = useState([]);
  const [selectedSetId, setSelectedSetId] = useState('');

  // 1. Fetch available sets on mount
  useEffect(() => {
    async function fetchSets() {
      try {
        const res = await fetch(`${API_BASE_URL}/sets`);
        const json = await res.json();
        if (json.success) {
          setSets(json.data || []);
        }
      } catch (err) {
        console.error('Failed to load sets for search filter:', err);
      }
    }
    fetchSets();
  }, []);

  // 2. Debounce and notify parent of all filter selections
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch({
        query: searchTerm.trim(),
        set_id: selectedSetId,
        rarity,
        supertype
      });
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [searchTerm, selectedSetId, rarity, supertype, debounceMs, onSearch]);

  const handleClear = () => {
    setSearchTerm('');
    setSelectedSetId('');
    setRarity('');
    setSupertype('');
  };

  return (
    <div className="row m-auto mb1 p025" style={{ maxWidth: '1200px' }}>
      <div className="col-12 border-sage br05 p05 bg-white shadow-subtle">
        <div className="row align-center relative">
          <div className="col-sm-9 col-md-10 relative">
            <input
              type="text"
              className="p05 br05 border-sage"
              style={{ width: '100%', fontSize: '1rem', paddingRight: '2.5rem' }}
              placeholder={placeholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {(searchTerm || selectedSetId || rarity || supertype) && (
              <button
                type="button"
                className="btn font-sage cursor-pointer"
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  fontSize: '1rem'
                }}
                onClick={handleClear}
                title="Clear Search & Filters"
              >
                ✕
              </button>
            )}
          </div>

          <div className="col-sm-3 col-md-2 text-right mt05 mt-sm-0">
            <button
              type="button"
              className={`btn border cursor-pointer ${showFilters ? 'bg-amber-flame font-white' : 'bg-cream'}`}
              style={{ width: '100%', padding: '0.5rem' }}
              onClick={() => setShowFilters((prev) => !prev)}
            >
              <i className="fa-solid fa-sliders mr025"></i> Filters {showFilters ? '▲' : '▼'}
            </button>
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="row mt05 pt05 border-top">
            {/* Set Dropdown */}
            <div className="col-sm-4 p025">
              <label className="bold block font-sage" style={{ fontSize: '0.8rem' }}>Expansion Set</label>
              <select
                className="p05 br025 border-sage"
                style={{ width: '100%' }}
                value={selectedSetId}
                onChange={(e) => setSelectedSetId(e.target.value)}
              >
                <option value="">All Sets</option>
                {sets.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.era ? `(${s.era})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Supertype Dropdown */}
            <div className="col-sm-4 p025">
              <label className="bold block font-sage" style={{ fontSize: '0.8rem' }}>Supertype</label>
              <select
                className="p05 br025 border-sage"
                style={{ width: '100%' }}
                value={supertype}
                onChange={(e) => setSupertype(e.target.value)}
              >
                <option value="">All Supertypes</option>
                <option value="Pokémon">Pokémon</option>
                <option value="Trainer">Trainer</option>
                <option value="Energy">Energy</option>
              </select>
            </div>

            {/* Rarity Field */}
            <div className="col-sm-4 p025">
              <label className="bold block font-sage" style={{ fontSize: '0.8rem' }}>Rarity</label>
              <input
                type="text"
                className="p05 br025 border-sage"
                style={{ width: '100%' }}
                placeholder="e.g. Illustration Rare"
                value={rarity}
                onChange={(e) => setRarity(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}