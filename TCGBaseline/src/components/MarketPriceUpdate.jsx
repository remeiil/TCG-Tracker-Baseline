import React, { useState, useEffect } from 'react';

const API_BASE_URL = 'http://192.168.1.20:3000';

export default function Market() {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  
  const [selectedCard, setSelectedCard] = useState(null);
  const [dollarAmount, setDollarAmount] = useState('');
  const [source, setSource] = useState('TCGPlayer');
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch matching cards when debounced term changes
  useEffect(() => {
    if (!debouncedSearch.trim()) {
      setSearchResults([]);
      return;
    }

    async function fetchCards() {
      setSearching(true);
      try {
        const query = new URLSearchParams({ name: debouncedSearch.trim() });
        const res = await fetch(`${API_BASE_URL}/cards?${query}`);
        const json = await res.json();
        if (json.success) {
          setSearchResults(json.data || []);
        }
      } catch (err) {
        console.error('Failed to search cards:', err);
      } finally {
        setSearching(false);
      }
    }

    fetchCards();
  }, [debouncedSearch]);

  const handleSelectCard = (card) => {
    setSelectedCard(card);
    setSearchResults([]);
    setSearchTerm('');
    setMessage(null);
  };

  const handleSubmitPrice = async (e) => {
    e.preventDefault();
    setMessage(null);

    if (!selectedCard) {
      setMessage({ type: 'error', text: 'Please search and select a card first.' });
      return;
    }

    const numericDollars = parseFloat(dollarAmount);
    if (isNaN(numericDollars) || numericDollars < 0) {
      setMessage({ type: 'error', text: 'Please enter a valid positive price.' });
      return;
    }

    // Convert dollars to integer cents
    const priceCents = Math.round(numericDollars * 100);

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/cards/market`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          card_id: selectedCard.id,
          price_cents: priceCents,
          source: source.trim() || 'Manual Entry'
        })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to record market price.');

      setMessage({
        type: 'success',
        text: `Price recorded: $${numericDollars.toFixed(2)} for ${selectedCard.name} (${selectedCard.set_name || 'Set ID: ' + selectedCard.set_id})`
      });

      // Reset price inputs
      setDollarAmount('');
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '2rem auto', padding: '1.5rem', border: '1px solid #ccc', borderRadius: '8px', fontFamily: 'sans-serif' }}>
      <h2>Log Market Price</h2>

      {message && (
        <div style={{
          padding: '0.75rem',
          marginBottom: '1rem',
          borderRadius: '4px',
          backgroundColor: message.type === 'error' ? '#f8d7da' : '#d4edda',
          color: message.type === 'error' ? '#721c24' : '#155724'
        }}>
          {message.text}
        </div>
      )}

      {/* 1. SEARCH INPUT */}
      <div style={{ marginBottom: '1.5rem', position: 'relative' }}>
        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}>1. Find Card</label>
        <input
          type="text"
          placeholder="Search card by name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }}
        />

        {searching && <p style={{ fontSize: '0.85rem', color: '#666' }}>Searching...</p>}

        {/* Dropdown Search Results */}
        {searchResults.length > 0 && (
          <ul style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            backgroundColor: '#fff',
            border: '1px solid #ccc',
            borderRadius: '4px',
            maxHeight: '200px',
            overflowY: 'auto',
            listStyle: 'none',
            padding: 0,
            margin: 0,
            zIndex: 10
          }}>
            {searchResults.map((card) => (
              <li
                key={card.id}
                onClick={() => handleSelectCard(card)}
                style={{
                  padding: '0.5rem 0.75rem',
                  borderBottom: '1px solid #eee',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <span><strong>{card.name}</strong> ({card.set_name || `Set #${card.set_id}`})</span>
                <span style={{ fontSize: '0.85rem', color: '#666' }}>#{card.set_number}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 2. SELECTED CARD DISPLAY */}
      {selectedCard ? (
        <div style={{ padding: '0.75rem', backgroundColor: '#f8f9fa', border: '1px solid #e9ecef', borderRadius: '4px', marginBottom: '1.5rem' }}>
          <p style={{ margin: 0 }}><strong>Selected:</strong> {selectedCard.name}</p>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: '#555' }}>
            Set: {selectedCard.set_name} | Number: {selectedCard.set_number} | ID: {selectedCard.id}
          </p>
        </div>
      ) : (
        <p style={{ color: '#888', fontStyle: 'italic' }}>No card selected yet.</p>
      )}

      {/* 3. PRICE ENTRY FORM */}
      <form onSubmit={handleSubmitPrice} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.25rem' }}>Price ($ NZD)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={dollarAmount}
            onChange={(e) => setDollarAmount(e.target.value)}
            disabled={!selectedCard}
            style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.25rem' }}>Source</label>
          <input
            type="text"
            placeholder="e.g. TCGPlayer, eBay, Cardmarket"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            disabled={!selectedCard}
            style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }}
          />
        </div>

        <button
          type="submit"
          disabled={loading || !selectedCard || !dollarAmount}
          style={{
            padding: '0.75rem',
            backgroundColor: selectedCard && dollarAmount ? '#2ca02c' : '#ccc',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            fontSize: '1rem',
            cursor: selectedCard && dollarAmount ? 'pointer' : 'not-allowed'
          }}
        >
          {loading ? 'Saving Price...' : 'Submit Price Track Record'}
        </button>
      </form>
    </div>
  );
}