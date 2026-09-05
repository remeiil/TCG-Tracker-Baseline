import React, { useState, useEffect } from 'react';
import CardPriceHistory from './CardPriceHistory';
import CardPriceDisplay from './CardPriceDisplay';

export default function CardGallery() {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCard, setSelectedCard] = useState(null);

  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  // 1. Debounce search input to avoid hitting the API on every keypress
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300); // 300ms delay

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // 2. Fetch cards when debounced query changes
  useEffect(() => {
    async function fetchCards() {
      setLoading(true);
      setError(null);
      try {
        const queryParams = new URLSearchParams();
        if (debouncedSearchTerm) {
          queryParams.append('name', debouncedSearchTerm);
        }

        const url = `http://192.168.1.20:3000/cards?${queryParams.toString()}`;
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const responseData = await response.json();
        setCards(responseData.data || []);
      } catch (err) {
        console.error('Failed to fetch cards:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchCards();
  }, [debouncedSearchTerm]);

  const formatPrice = (priceCents, suffix = '') => {
    if (priceCents == null) return `0.00 ${suffix}`.trim();
    return `${(priceCents / 100).toFixed(2)} ${suffix}`.trim();
  };

  return (
    <div id="cards-container">
      {/* Search Input Bar */}
      <div className="row m-auto mb-1 p025" style={{ maxWidth: '1200px' }}>
        <div className="col-12">
          <input
            type="text"
            className="p05 br05 border-sage"
            style={{ width: '100%', fontSize: '1rem' }}
            placeholder="Search cards by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Loading & Error Indicators */}
      {loading && <div className="text-center p1">Loading cards...</div>}
      {error && <div className="text-center p1 font-danger">Error loading cards: {error}</div>}

      {/* Card Grid */}
      {!loading && !error && cards.length === 0 && (
        <div className="text-center p1">No cards found matching "{debouncedSearchTerm}".</div>
      )}

      {!loading && !error && (
        <div className="row m-auto" style={{ maxWidth: '1200px' }}>
          {cards.map((card) => (
            <div
              key={card.id}
              className="card-item p05 col-sm-6 col-lg-2 border-sage br05 m025 bg-white cursor-pointer"
              onClick={() => setSelectedCard(card)}
            >
              <img className="br05" src={card.location} alt={card.name} width="100%" />
              <div className="justify-between">
                <div id={`thumb${card.id}`}>
                  <h4>{card.name}</h4>
                  <p>{card.set_name}</p>
                  <p>{card.set_number}</p>
                  <CardPriceDisplay card={card} formatPrice={formatPrice} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Single Modal Instance rendered conditionally */}
      {selectedCard && (
        <div
          className="modal-overlay bg-charcoal-transparent"
          onClick={() => setSelectedCard(null)}
        >
          <div
            className="bg-white modal p1 m1 br05 row"
            style={{ width: '1200px' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile Close Button (X) */}
            <button
              type="button"
              className="modal-close-btn bg-amber-flame"
              onClick={() => setSelectedCard(null)}
              aria-label="Close modal"
            >
              ✕
            </button>
            <div className="col-sm-12 col-md-6 col-lg-3">
              <img className="br05" src={selectedCard.location} alt={selectedCard.name} width="100%" />
            </div>
            <div className="col-sm-12 col-md-6">
              <h3>{selectedCard.name}</h3>
              <p>
                {selectedCard.subtypes}{' '}
                {selectedCard.supertype === 'Pokémon' ? selectedCard.type_1 : ''}
                {selectedCard.supertype === 'Pokémon' && selectedCard.type2 != null
                  ? selectedCard.type2
                  : ''}{' '}
                {selectedCard.supertype}
              </p>
              <p>
                {selectedCard.set_name} ({selectedCard.era})
              </p>
              <p>
                {selectedCard.rarity} - {selectedCard.set_number}
              </p>
              <CardPriceDisplay card={selectedCard} formatPrice={formatPrice} />
              <CardPriceHistory 
                cardId={selectedCard.id} 
                cardName={selectedCard.name} 
              />
              <p className="font-sage" style={{ fontStyle: 'italic' }}>
                {selectedCard.recorded_at != null
                  ? `Last tracked: ${selectedCard.recorded_at}`
                  : 'Not currently being tracked'}
              </p>

              <h4>Card Particulars</h4>
              <p>Pokémon Pokédex Number: {selectedCard.pokemon_number}</p>
              <p>Card run: {selectedCard.run}</p>
              <p>Print type: {selectedCard.foil}</p>
              {selectedCard.print_variant != null && (
                <p>Print variation: {selectedCard.print_variant}</p>
              )}
              {selectedCard.stamp != null && <p>Stamped: {selectedCard.stamp}</p>}
              <p>HP: {selectedCard.hp}</p>
              <p>Evolves from: {selectedCard.evolves_from}</p>
              {selectedCard.pokemon_category != null && (
                <p>Pokédex Category: {selectedCard.pokemon_category} Pokémon</p>
              )}
              {selectedCard.height != null && <p>Height: {selectedCard.height}</p>}
              {selectedCard.weight != null && <p>Weight: {selectedCard.weight}</p>}

              {/* Abilities */}
              {selectedCard.abilities?.length > 0 && (
                <p>
                  <strong>
                    {selectedCard.abilities[0].type}: {selectedCard.abilities[0].name}
                  </strong>{' '}
                  {selectedCard.abilities[0].description}
                </p>
              )}

              {/* Attack 1 */}
              {selectedCard.attacks?.length > 0 && (
                <>
                  <p>
                    <strong>{selectedCard.attacks[0].name}</strong>{' '}
                    {selectedCard.attacks[0].description || ''}{' '}
                    <strong>{selectedCard.attacks[0].damage}</strong>
                  </p>
                  <p>Cost: {selectedCard.attacks[0].cost}</p>
                </>
              )}

              {/* Attack 2 */}
              {selectedCard.attacks?.length > 1 && (
                <>
                  <p>
                    <strong>{selectedCard.attacks[1].name}</strong>{' '}
                    {selectedCard.attacks[1].description || ''}{' '}
                    <strong>{selectedCard.attacks[1].damage}</strong>
                  </p>
                  <p>Cost: {selectedCard.attacks[1].cost}</p>
                </>
              )}

              {/* Weakness & Resistance */}
              {selectedCard.weakness_type != null && (
                <p>
                  Weakness:{' '}
                  <span className={`type-icon ${selectedCard.weakness_type} sm`}></span>{' '}
                  {selectedCard.weakness_modifier}
                </p>
              )}
              {selectedCard.resistance_type != null && (
                <p>
                  Resistance:{' '}
                  <span className={`type-icon ${selectedCard.resistance_type} sm`}></span>{' '}
                  {selectedCard.resistance_modifier}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}