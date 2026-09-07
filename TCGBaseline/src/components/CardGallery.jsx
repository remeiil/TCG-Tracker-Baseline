import React, { useState, useEffect } from 'react';
import CardPriceHistory from './CardPriceHistory';
import CardPriceDisplay from './CardPriceDisplay';
import { useAuth } from './AuthContext';
import AddToCollectionModal from './AddToCollectionModal';
import CardDetailModal from './CardDetailModal';

const API_BASE_URL = `http://192.168.1.20:3000`;

export default function CardGallery() {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCard, setSelectedCard] = useState(null);
  const [ownedCount, setOwnedCount] = useState(0);
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

        const url = `${API_BASE_URL}/cards?${queryParams.toString()}`;
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