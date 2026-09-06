import React, { useState, useEffect } from 'react';
import CardPriceHistory from './CardPriceHistory';
import CardPriceDisplay from './CardPriceDisplay';
import { useAuth } from './AuthContext';
import AddToCollectionModal from './AddToCollectionModal';

export default function CardGallery() {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCard, setSelectedCard] = useState(null);
  const [cardToCollect, setCardToCollect] = useState(null);
  const { token } = useAuth();

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

  // 3. Handle Mobile Back Button for Modal
  useEffect(() => {
    if (!selectedCard) return;

    // Push state so back button has something to pop
    window.history.pushState({ modalOpen: true }, '', window.location.href);

    // Close state when user hits back button
    const handlePopState = () => {
      setSelectedCard(null);
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [selectedCard]);

  // Helper to close modal manually (via X button or backdrop click)
  const handleCloseModal = () => {
    if (selectedCard) {
      setSelectedCard(null);
      // Clean up history state if user clicked 'X' instead of Back button
      if (window.history.state?.modalOpen) {
        window.history.back();
      }
    }
  };

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
                </div>
              </div>
              <div className="justify-between">
                <CardPriceDisplay card={card} formatPrice={formatPrice} />
                {/* Quick Add Button on Hover / Mobile */}
                {token && (
                  <button
                    type="button"
                    title="Add to Collection"
                    className="btn bg-white border-sage font-medium-jungle"
                    style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: 25, height: 25, borderRadius: 50, zIndex: 2 }}
                    onClick={(e) => {
                      e.stopPropagation(); // Prevents opening the full detail modal
                      setCardToCollect(card);
                    }}
                  >
                    <i className="fa-solid fa-plus"></i>
                  </button>
                )}
              </div>  
            </div>
          ))}
        </div>
      )}

      {/* Single Modal Instance rendered conditionally */}
      {selectedCard && (
        <div
          className="modal-overlay bg-charcoal-transparent"
          onClick={handleCloseModal}
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
              onClick={handleCloseModal}
              aria-label="Close modal"
            >
              ✕
            </button>
            <div className="col-sm-12 col-md-6 col-lg-3">
              <img className="br05" src={selectedCard.location} alt={selectedCard.name} width="100%" />
              <CardPriceHistory 
                cardId={selectedCard.id} 
                cardName={selectedCard.name} 
              />
            </div>
            <div className="col-sm-12 col-md-6 col-lg-9">
              <h2>{selectedCard.name}</h2>
              <p>Pokédex #{selectedCard.pokemon_number}</p>
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
              <p className="font-sage" style={{ fontStyle: 'italic' }}>
                {selectedCard.recorded_at != null
                  ? `Last tracked: ${selectedCard.recorded_at}`
                  : 'Not currently being tracked'}
              </p>
              {/* add to collection button */}
              {token && (
                <button
                  type="button"
                  className="btn bg-white border-sage font-medium-jungle p05 br05 cursor-pointer"
                  onClick={() => setCardToCollect(selectedCard)}
                >
                  <i className="fa-solid fa-plus mr025"></i> Add to Collection
                </button>
              )}

              <h3>Card Particulars</h3>
              <p><strong>Card run:</strong> {selectedCard.run}</p>
              <p><strong>Print type:</strong> {selectedCard.foil}</p>
              {selectedCard.print_variant != null && (
                <p><strong>Print variation:</strong> {selectedCard.print_variant}</p>
              )}
              {selectedCard.stamp != null && <p><strong>Stamped:</strong> {selectedCard.stamp}</p>}
              <p><strong>HP:</strong> {selectedCard.hp}</p>
              <p><strong>Evolves from:</strong> {selectedCard.evolves_from}</p>
              {selectedCard.pokemon_category != null && (
                <p><strong>Pokédex Category:</strong> {selectedCard.pokemon_category} Pokémon</p>
              )}
              {selectedCard.height != null && <p><strong>Height:</strong> {selectedCard.height}</p>}
              {selectedCard.weight != null && <p><strong>Weight:</strong> {selectedCard.weight}</p>}

              {/* Abilities */}
              {selectedCard.abilities?.length > 0 && (
                <>
                  <p>
                    <strong>
                      {selectedCard.abilities[0].type}: {selectedCard.abilities[0].name}
                    </strong>{' '}
                    {selectedCard.abilities[0].description}
                  </p>
                  <hr className='m05' />
                </>
              )}

              {/* Attack 1 */}
              {selectedCard.attacks?.length > 0 && (
                <>
                  <div className='row'>
                    <div className='col-sm-2'>{selectedCard.attacks[0].cost ? (
                      selectedCard.attacks[0].cost.split(',').map((type, index) => {
                        const cleanType = type.trim().toLowerCase();
                        return (
                          <span
                            key={index}
                            className={`type-icon ${cleanType} sm`}
                          ></span>
                        );
                      })
                    ) : (
                      <span className="font-sage" style={{ fontStyle: 'italic' }}>Free</span>
                    )}</div>
                    <div className='col-sm-3'><strong>{selectedCard.attacks[0].name}</strong></div>
                    <div className='col-sm-5'>{selectedCard.attacks[0].description || ''}</div>
                    <div className='col-sm-2'><strong>{selectedCard.attacks[0].damage}</strong></div>
                  </div>
                  <hr className='m05' />
                </>
              )}

              {/* Attack 2 */}
              {selectedCard.attacks?.length > 1 && (
                <>
                  <div className='row'>
                    <div className='col-sm-2'>{selectedCard.attacks[1].cost ? (
                      selectedCard.attacks[1].cost.split(',').map((type, index) => {
                        const cleanType = type.trim().toLowerCase();
                        return (
                          <span
                            key={index}
                            className={`type-icon ${cleanType} sm`}
                          ></span>
                        );
                      })
                    ) : (
                      <span className="font-sage" style={{ fontStyle: 'italic' }}>Free</span>
                    )}</div>
                    <div className='col-sm-3'><strong>{selectedCard.attacks[1].name}</strong></div>
                    <div className='col-sm-5'>{selectedCard.attacks[1].description || ''}</div>
                    <div className='col-sm-2'><strong>{selectedCard.attacks[1].damage}</strong></div>
                  </div>
                  <hr className='m05' />
                </>
              )}
              {/* Attack 3 */}
              {selectedCard.attacks?.length > 2 && (
                <>
                  <div className='row'>
                    <div className='col-sm-2'>{selectedCard.attacks[2].cost ? (
                      selectedCard.attacks[2].cost.split(',').map((type, index) => {
                        const cleanType = type.trim().toLowerCase();
                        return (
                          <span
                            key={index}
                            className={`type-icon ${cleanType} sm`}
                          ></span>
                        );
                      })
                    ) : (
                      <span className="font-sage" style={{ fontStyle: 'italic' }}>Free</span>
                    )}</div>
                    <div className='col-sm-3'><strong>{selectedCard.attacks[2].name}</strong></div>
                    <div className='col-sm-5'>{selectedCard.attacks[2].description || ''}</div>
                    <div className='col-sm-2'><strong>{selectedCard.attacks[2].damage}</strong></div>
                  </div>
                  <hr className='m05' />
                </>
              )}

              {/* Weakness & Resistance */}
              {selectedCard.weakness_type != null && (
                <p>
                  <strong>Weakness:</strong>{' '}
                  <span className={`type-icon ${selectedCard.weakness_type.toLowerCase()} sm`}></span>{' '}
                  {selectedCard.weakness_modifier}
                </p>
              )}
              {selectedCard.resistance_type != null && (
                <p>
                  <strong>Resistance:</strong>{' '}
                  <span className={`type-icon ${selectedCard.resistance_type.toLowerCase()} sm`}></span>{' '}
                  {selectedCard.resistance_modifier}
                </p>
              )}
              
              <p><strong>Retreat Cost:</strong> {Array.from({ length: selectedCard.retreat_cost || 0 }).map((_, index) => (
                <span key={index} className="type-icon colorless sm"></span>
              ))}</p>
              <p><strong>Pokédex entry text:</strong> {selectedCard.dex_entry}</p>
              <p><strong>Illustrator:</strong> {selectedCard.illustrator}</p>
              <p><strong>Copyright text:</strong> {selectedCard.copyright_text}</p>
            </div>
          </div>
        </div>
      )}
      {cardToCollect && (
        <AddToCollectionModal
          card={cardToCollect}
          onClose={() => setCardToCollect(null)}
        />
      )}
    </div>
  );
}