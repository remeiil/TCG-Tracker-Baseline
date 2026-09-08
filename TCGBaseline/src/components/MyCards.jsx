import React, { useState, useEffect, useCallback } from 'react';
import CardPriceHistory from './CardPriceHistory';
import CardPriceDisplay from './CardPriceDisplay';
import { useAuth } from './AuthContext';
import AddToCollectionModal from './AddToCollectionModal';
import CardDetailModal from './CardDetailModal';
import SearchBar from './SearchBar';

const API_BASE_URL = `http://localhost:3000`;

export default function MyCards() {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCard, setSelectedCard] = useState(null);
  const [cardToCollect, setCardToCollect] = useState(null);
  const [summary, setSummary] = useState({ total_cards_owned: 0, total_value_formatted: '0.00' });
  const [searchFilters, setSearchFilters] = useState({ query: '', rarity: '', supertype: '' });
  
  const { token } = useAuth();

  // Load summary stats on token load
  useEffect(() => {
    if (token) {
      fetchSummary();
    }
  }, [token]);

  const fetchSummary = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/inventory/summary`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success) {
        setSummary(json.data);
      }
    } catch (err) {
      console.error('Failed to load collection summary:', err);
    }
  };

  // Fetch user's inventory whenever searchFilters or token changes
  const fetchInventory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      if (searchFilters.query) queryParams.append('search', searchFilters.query);
      if (searchFilters.set_id) queryParams.append('set_id', searchFilters.set_id);
      if (searchFilters.rarity) queryParams.append('rarity', searchFilters.rarity);
      if (searchFilters.supertype) queryParams.append('supertype', searchFilters.supertype);

      const res = await fetch(`${API_BASE_URL}/inventory?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!res.ok) {
        throw new Error(`HTTP error! Status: ${res.status}`);
      }
      
      const json = await res.json();
      setInventory(json.data || []);
    } catch (err) {
      console.error('Failed to fetch inventory:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [searchFilters, token]);

  useEffect(() => {
    if (token) {
      fetchInventory();
    }
  }, [token, fetchInventory]);

  // SearchBar Callback
  const handleSearch = useCallback((filters) => {
    setSearchFilters(filters);
  }, []);

  // Handle Mobile Back Button for Modal
  useEffect(() => {
    if (!selectedCard) return;

    window.history.pushState({ modalOpen: true }, '', window.location.href);

    const handlePopState = () => {
      setSelectedCard(null);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [selectedCard]);

  const handleCloseModal = () => {
    if (selectedCard) {
      setSelectedCard(null);
      if (window.history.state?.modalOpen) {
        window.history.back();
      }
    }
  };

  // Handle Delete item from inventory
  const handleDeleteInventoryItem = async (inventoryId) => {
    if (!window.confirm('Are you sure you want to remove this card from your collection?')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/inventory/${inventoryId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete card');
      }

      setInventory((prev) => prev.filter((item) => item.inventory_id !== inventoryId));
      fetchSummary();

      if (selectedCard?.inventory_id === inventoryId) {
        handleCloseModal();
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const formatPrice = (priceCents, suffix = '') => {
    if (priceCents == null) return `0.00 ${suffix}`.trim();
    return `${(priceCents / 100).toFixed(2)} ${suffix}`.trim();
  };

  return (
    <div id="cards-container">
      {/* Collection Summary Banner */}
      <div className="row mb1 m-auto" style={{ maxWidth: '1200px' }}>
        <div className="col-sm-6 p05">
          <div className="border-sage br05 p1 bg-white text-center shadow-subtle">
            <span className="font-sage bold block uppercase" style={{ fontSize: '0.85rem' }}>
              Total Cards Owned
            </span>
            <h2 className="m0 font-amber-flame" style={{ fontSize: '2rem' }}>
              <i className="fa-solid fa-layer-group mr05"></i> {summary.total_cards_owned}
            </h2>
          </div>
        </div>

        <div className="col-sm-6 p05">
          <div className="border-sage br05 p1 bg-white text-center shadow-subtle">
            <span className="font-sage bold block uppercase" style={{ fontSize: '0.85rem' }}>
              Estimated Market Value
            </span>
            <h2 className="m0 font-medium-jungle" style={{ fontSize: '2rem' }}>
              <i className="fa-solid fa-sack-dollar mr05"></i> ${summary.total_value_formatted}
            </h2>
          </div>
        </div>
      </div>

      {/* Reusable Search Component */}
      <SearchBar 
        placeholder="Search my owned cards by name, illustrator, rarity..." 
        onSearch={handleSearch} 
      />

      {/* Indicators */}
      {loading && <div className="text-center p1">Loading your collection...</div>}
      {error && <div className="text-center p1 font-danger">Error loading inventory: {error}</div>}

      {/* Grid View */}
      {!loading && !error && inventory.length === 0 && (
        <div className="text-center p1">
          {searchFilters.query || searchFilters.rarity || searchFilters.supertype
            ? 'No owned cards matching your filter criteria.'
            : 'Your collection is currently empty.'}
        </div>
      )}

      {!loading && !error && (
        <div className="row m-auto" style={{ maxWidth: '1200px' }}>
          {inventory.map((item) => (
            <div
              key={item.inventory_id}
              className="card-item p05 col-sm-6 col-lg-2 border-sage br05 m025 bg-white cursor-pointer relative"
              onClick={() => setSelectedCard(item)}
            >
              <img className="br05" src={item.location} alt={item.name} width="100%" />

              <div className="justify-between">
                <div>
                  <h4>{item.name}</h4>
                  <p>{item.set_name} ({item.set_number})</p>
                  <p className="font-sage" style={{ fontSize: '0.85rem' }}>
                    Condition: <strong>{item.condition}</strong>              
                  </p>
                  
                  {item.container_name && (
                    <p className="font-sage" style={{ fontSize: '0.8rem' }}>
                      <i className="fa-solid fa-box-archive mr025"></i>{item.container_name}
                    </p>
                  )}
                </div>
              </div>
              
              <div className='justify-between'>
                <span>Owned: </span>
                <span
                  className="bg-amber-flame font-white br025 p025 bold"
                  style={{ fontSize: '0.8rem', zIndex: 1 }}
                >
                  x{item.quantity}
                </span>
              </div>

              <div className="justify-between mt05">
                <CardPriceDisplay card={item} formatPrice={formatPrice} />
                <button
                  type="button"
                  title="Add another copy"
                  className="btn bg-white font-medium-jungle"
                  style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: 25, height: 25, borderRadius: 50 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCardToCollect(item);
                  }}
                >
                  <i className="fa-solid fa-plus"></i>
                </button>
                <button
                  type="button"
                  title="Remove from collection"
                  className="btn bg-white font-flag-red"
                  style={{
                    display: 'flex',
                    justify: 'center',
                    alignItems: 'center',
                    width: 25,
                    height: 25,
                    borderRadius: 50
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteInventoryItem(item.inventory_id);
                  }}
                >
                  <i className="fa-solid fa-trash"></i>
                </button>
              </div>  
            </div>
          ))}
        </div>
      )}

      <CardDetailModal
        selectedCard={selectedCard}
        onClose={handleCloseModal}
        onOpenAddToCollection={(card) => setCardToCollect(card)}
        onDeleteInventoryItem={handleDeleteInventoryItem}
      />

      {cardToCollect && (
        <AddToCollectionModal
          card={cardToCollect}
          onClose={() => setCardToCollect(null)}
          onSuccess={() => {
            fetchSummary();
            fetchInventory();
          }}
        />
      )}
    </div>
  );
}