import React, { useState, useEffect } from 'react';
import CardPriceHistory from './CardPriceHistory';
import CardPriceDisplay from './CardPriceDisplay';
import { useAuth } from './AuthContext';
import AddToCollectionModal from './AddToCollectionModal';
import CardDetailModal from './CardDetailModal';

const API_BASE_URL = `http://localhost:3000`;

export default function MyCards() {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCard, setSelectedCard] = useState(null);
  const [cardToCollect, setCardToCollect] = useState(null);
  const { token } = useAuth();

  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  const [summary, setSummary] = useState({ total_cards_owned: 0, total_value_formatted: '0.00' });

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

  // 1. Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // 2. Fetch user's inventory
  useEffect(() => {
    async function fetchInventory() {
      setLoading(true);
      setError(null);
      try {
        const queryParams = new URLSearchParams();
        if (debouncedSearchTerm) {
          queryParams.append('name', debouncedSearchTerm);
        }

        const response = await fetch(`${API_BASE_URL}/inventory?${queryParams.toString()}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const responseData = await response.json();
        setInventory(responseData.data || []);
      } catch (err) {
        console.error('Failed to fetch inventory:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    if (token) {
      fetchInventory();
    }
  }, [debouncedSearchTerm, token]);

  // 3. Handle Mobile Back Button for Modal
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

  // 4. Handle Delete item from inventory
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

      // 1. Remove item from active UI inventory state
      setInventory((prev) => prev.filter((item) => item.inventory_id !== inventoryId));

      // 2. Refresh top banner summary metrics
      fetchSummary();

      // 3. If the modal for this card is currently open, close it
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
              <i className="fa-solid fa-layer-group mr05"></i>
              {summary.total_cards_owned}
            </h2>
          </div>
        </div>

        <div className="col-sm-6 p05">
          <div className="border-sage br05 p1 bg-white text-center shadow-subtle">
            <span className="font-sage bold block uppercase" style={{ fontSize: '0.85rem' }}>
              Estimated Market Value
            </span>
            <h2 className="m0 font-medium-jungle" style={{ fontSize: '2rem' }}>
              <i className="fa-solid fa-sack-dollar mr05"></i>
              ${summary.total_value_formatted}
            </h2>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="row m-auto mb-1 p025" style={{ maxWidth: '1200px' }}>
        <div className="col-12">
          <input
            type="text"
            className="p05 br05 border-sage"
            style={{ width: '100%', fontSize: '1rem' }}
            placeholder="Search my owned cards by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Indicators */}
      {loading && <div className="text-center p1">Loading your collection...</div>}
      {error && <div className="text-center p1 font-danger">Error loading inventory: {error}</div>}

      {/* Grid View */}
      {!loading && !error && inventory.length === 0 && (
        <div className="text-center p1">
          {debouncedSearchTerm
            ? `No owned cards matching "${debouncedSearchTerm}".`
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
                {/* Quick Delete Button in Grid Card */}
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
          onSuccess={() => fetchSummary()}
        />
      )}
    </div>
  );
}