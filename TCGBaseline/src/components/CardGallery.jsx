import React, { useState, useEffect, useCallback } from 'react';
import CardPriceHistory from './CardPriceHistory';
import CardPriceDisplay from './CardPriceDisplay';
import { useAuth } from './AuthContext';
import AddToCollectionModal from './AddToCollectionModal';
import CardDetailModal from './CardDetailModal';
import SearchBar from './SearchBar';

const API_BASE_URL = `http://localhost:3000`;

export default function CardGallery() {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCard, setSelectedCard] = useState(null);
  const [ownedCount, setOwnedCount] = useState(0);
  const [cardToCollect, setCardToCollect] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilters, setSearchFilters] = useState({ query: '', rarity: '', supertype: '' });
  
  const { token } = useAuth();

  // Fetch cards whenever searchQuery changes
  const fetchCards = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
    if (searchFilters.query) queryParams.append('search', searchFilters.query);
    if (searchFilters.set_id) queryParams.append('set_id', searchFilters.set_id);
    if (searchFilters.rarity) queryParams.append('rarity', searchFilters.rarity);
    if (searchFilters.supertype) queryParams.append('supertype', searchFilters.supertype);

    const res = await fetch(`${API_BASE_URL}/cards?${queryParams.toString()}`);
    const json = await res.json();
    setCards(json.data || []);
    } catch (err) {
      console.error('Failed to fetch cards:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [searchFilters]);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  // SearchBar Callback
  const handleSearch = useCallback((filters) => {
    setSearchFilters(filters);
  }, []);

  // Fetch owned count whenever a card is opened in the modal
  useEffect(() => {
    async function fetchOwnedCount() {
      if (!selectedCard || !token) {
        setOwnedCount(0);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/cards/${selectedCard.id}/owned-count`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json();
        if (data.success) {
          setOwnedCount(data.owned_count);
        }
      } catch (err) {
        console.error('Error fetching owned count:', err);
      }
    }

    fetchOwnedCount();
  }, [selectedCard, token]);

  // Handle Mobile Back Button for Modal
  useEffect(() => {
    if (!selectedCard) return;

    window.history.pushState({ modalOpen: true }, '', window.location.href);

    const handlePopState = () => {
      setSelectedCard(null);
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [selectedCard]);

  const handleCloseModal = () => {
    if (selectedCard) {
      setSelectedCard(null);
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
      {/* Reusable Search Component */}
      <SearchBar 
        placeholder="Search my owned cards by name, illustrator, rarity..." 
        onSearch={handleSearch} 
      />

      {/* Loading & Error Indicators */}
      {loading && <div className="text-center p1">Loading cards...</div>}
      {error && <div className="text-center p1 font-danger">Error loading cards: {error}</div>}

      {/* Card Grid */}
      {!loading && !error && cards.length === 0 && (
        <div className="text-center p1">
          {searchQuery ? `No cards found matching "${searchQuery}".` : 'No cards found.'}
        </div>
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
                      e.stopPropagation();
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
      <CardDetailModal
        selectedCard={selectedCard}
        onClose={handleCloseModal}
        onOpenAddToCollection={(card) => setCardToCollect(card)}
        ownedCount={ownedCount}
      />
      {cardToCollect && (
        <AddToCollectionModal
          card={cardToCollect}
          onClose={() => setCardToCollect(null)}
        />
      )}
    </div>
  );
}