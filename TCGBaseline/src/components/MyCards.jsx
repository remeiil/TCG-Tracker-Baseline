// MyCards.jsx
import React, { useState, useEffect } from 'react';
import CardPriceHistory from './CardPriceHistory';
import CardPriceDisplay from './CardPriceDisplay';
import { useAuth } from './AuthContext';
import AddToCollectionModal from './AddToCollectionModal';

const API_BASE_URL = `http://192.168.1.20:3000`;

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

      // 2. If the modal for this card is currently open, close it
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
                    e.stopPropagation(); // Prevents opening modal
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

      {/* Detail Modal */}
      {selectedCard && (
        <div className="modal-overlay bg-charcoal-transparent" onClick={handleCloseModal}>
          <div
            className="bg-white modal p1 m1 br05 row"
            style={{ width: '1200px' }}
            onClick={(e) => e.stopPropagation()}
          >
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
              <CardPriceHistory cardId={selectedCard.id} cardName={selectedCard.name} />
            </div>

            <div className="col-sm-12 col-md-6 col-lg-9">
              <h2>{selectedCard.name}</h2>
              <p>Pokédex #{selectedCard.pokemon_number}</p>
              
              {/* Inventory Details Box */}
              <div className="border-sage br05 p1 bg-cream mb1">
                <h4>My Ownership Details</h4>
                <div className="row">
                  <div className="col-sm-6">
                    <p><strong>Quantity Owned:</strong> {selectedCard.quantity}</p>
                    <p><strong>Condition:</strong> {selectedCard.condition}</p>
                    <p>
                      <strong>Paid Price:</strong>{' '}
                      {selectedCard.purchase_price_cents != null
                        ? `$${formatPrice(selectedCard.purchase_price_cents)}`
                        : 'Not recorded'}
                    </p>
                  </div>
                  <div className="col-sm-6">
                    <p>
                      <strong>Container:</strong>{' '}
                      {selectedCard.container_name || 'Unassigned'}
                    </p>
                    <p>
                      <strong>Acquired:</strong>{' '}
                      {new Date(selectedCard.acquired_at).toLocaleDateString()}
                    </p>
                    {selectedCard.notes && <p><strong>Notes:</strong> {selectedCard.notes}</p>}
                  </div>
                </div>
              </div>

              <p>
                {selectedCard.subtypes}{' '}
                {selectedCard.supertype === 'Pokémon' ? selectedCard.type_1 : ''}
                {selectedCard.supertype === 'Pokémon' && selectedCard.type2 != null ? selectedCard.type2 : ''}{' '}
                {selectedCard.supertype}
              </p>
              <p>{selectedCard.set_name} ({selectedCard.era})</p>
              <p>{selectedCard.rarity} - {selectedCard.set_number}</p>
              <CardPriceDisplay card={selectedCard} formatPrice={formatPrice} />            

              <h3 className="mt1">Card Particulars</h3>
              <p><strong>Card run:</strong> {selectedCard.run}</p>
              <p><strong>Print type:</strong> {selectedCard.foil}</p>
              {selectedCard.print_variant != null && <p><strong>Print variation:</strong> {selectedCard.print_variant}</p>}
              {selectedCard.stamp != null && <p><strong>Stamped:</strong> {selectedCard.stamp}</p>}
              <p><strong>HP:</strong> {selectedCard.hp}</p>
              <p><strong>Evolves from:</strong> {selectedCard.evolves_from}</p>
              {selectedCard.pokemon_category != null && <p><strong>Pokédex Category:</strong> {selectedCard.pokemon_category} Pokémon</p>}
              {selectedCard.height != null && <p><strong>Height:</strong> {selectedCard.height}</p>}
              {selectedCard.weight != null && <p><strong>Weight:</strong> {selectedCard.weight}</p>}

              {/* Abilities */}
              {selectedCard.abilities?.length > 0 && (
                <>
                  <p>
                    <strong>{selectedCard.abilities[0].type}: {selectedCard.abilities[0].name}</strong>{' '}
                    {selectedCard.abilities[0].description}
                  </p>
                  <hr className="m05" />
                </>
              )}

              {/* Attacks */}
              {selectedCard.attacks?.map((attack, idx) => (
                <React.Fragment key={idx}>
                  <div className="row">
                    <div className="col-sm-2">
                      {attack.cost ? (
                        attack.cost.split(',').map((type, i) => (
                          <span key={i} className={`type-icon ${type.trim().toLowerCase()} sm`}></span>
                        ))
                      ) : (
                        <span className="font-sage" style={{ fontStyle: 'italic' }}>Free</span>
                      )}
                    </div>
                    <div className="col-sm-3"><strong>{attack.name}</strong></div>
                    <div className="col-sm-5">{attack.description || ''}</div>
                    <div className="col-sm-2"><strong>{attack.damage}</strong></div>
                  </div>
                  <hr className="m05" />
                </React.Fragment>
              ))}

              {/* Weakness, Resistance, Retreat */}
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
              
              <p>
                <strong>Retreat Cost:</strong>{' '}
                {Array.from({ length: selectedCard.retreat_cost || 0 }).map((_, index) => (
                  <span key={index} className="type-icon colorless sm"></span>
                ))}
              </p>
              <p><strong>Pokédex entry text:</strong> {selectedCard.dex_entry}</p>
              <p><strong>Illustrator:</strong> {selectedCard.illustrator}</p>
              <p><strong>Copyright text:</strong> {selectedCard.copyright_text}</p>
              {/* Modal Action Row */}
              <div className="row justify-between mt1 m2">
                <button
                  type="button"
                  className="btn bg-white border-sage font-medium-jungle p05 br05 cursor-pointer"
                  onClick={() => setCardToCollect(selectedCard)}
                >
                  <i className="fa-solid fa-plus mr025"></i> Add Another Copy
                </button>

                <button
                  type="button"
                  className="btn bg-flag-red font-white p05 br05 cursor-pointer border"
                  onClick={() => handleDeleteInventoryItem(selectedCard.inventory_id)}
                >
                  <i className="fa-solid fa-trash mr025"></i> Remove Entry
                </button>
              </div>
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