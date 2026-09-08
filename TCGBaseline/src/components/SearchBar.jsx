// SearchBar.jsx
import React, { useState, useEffect } from 'react';

export default function SearchBar({ 
  placeholder = "Search by card name, illustrator, rarity, HP, or Pokédex #...", 
  onSearch, 
  debounceMs = 300 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [rarity, setRarity] = useState('');
  const [supertype, setSupertype] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      // Pass both global term and column filters back to parent
      onSearch({
        query: searchTerm.trim(),
        rarity,
        supertype
      });
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [searchTerm, rarity, supertype, debounceMs, onSearch]);

  const handleClear = () => {
    setSearchTerm('');
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
            {searchTerm && (
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
                title="Clear Search"
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

        {/* Dynamic Column Filters Panel */}
        {showFilters && (
          <div className="row mt05 pt05 border-top">
            <div className="col-sm-6 p025">
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

            <div className="col-sm-6 p025">
              <label className="bold block font-sage" style={{ fontSize: '0.8rem' }}>Rarity</label>
              <input
                type="text"
                className="p05 br025 border-sage"
                style={{ width: '100%' }}
                placeholder="e.g. Illustration Rare, Holo Rare"
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