import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import CardDetailModal from './CardDetailModal';

const API_BASE_URL = `https://tcg-server.remeil.co.nz`;

export default function ContainerManager() {
  const [containers, setContainers] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [expandedContainerId, setExpandedContainerId] = useState(null);
  const [selectedCard, setSelectedCard] = useState(null);
  const [loadingCard, setLoadingCard] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState(null);
  const { token } = useAuth();

  useEffect(() => {
    if (token) {
      fetchContainers();
    }
  }, [token]);

  async function fetchContainers() {
    setFetching(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/containers/details`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success) {
        setContainers(json.data || []);
      } else {
        throw new Error(json.error || 'Failed to fetch container details');
      }
    } catch (err) {
      console.error('Failed to load containers:', err);
      setError(err.message);
    } finally {
      setFetching(false);
    }
  }

  // Explicitly accept containerId to ensure accurate metadata mapping
  const handleCardClick = async (item, containerId) => {
    setLoadingCard(true);
    const parentContainer = containers.find((c) => c.id === containerId);

    try {
      const res = await fetch(`${API_BASE_URL}/cards/${item.card_id}`);
      const json = await res.json();
      
      if (json.data) {
        setSelectedCard({
          ...json.data,
          inventory_id: item.inventory_id,
          container_id: containerId,
          quantity: item.quantity,
          condition: item.condition,
          container_name: parentContainer?.name || ''
        });
      } else {
        setSelectedCard({
          ...item,
          container_id: containerId,
          container_name: parentContainer?.name || ''
        });
      }
    } catch (err) {
      console.error('Failed to fetch full card details:', err);
      setSelectedCard({
        ...item,
        container_id: containerId,
        container_name: parentContainer?.name || ''
      });
    } finally {
      setLoadingCard(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/containers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name, description })
      });
      const json = await res.json();
      if (json.success) {
        setName('');
        setDescription('');
        setShowCreateModal(false);
        fetchContainers();
      } else {
        alert(`Error: ${json.error}`);
      }
    } catch (err) {
      console.error('Error creating container:', err);
      alert('Failed to create container');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id) => {
    setExpandedContainerId((prev) => (prev === id ? null : id));
  };

  const handleDeleteContainer = async (containerId, containerName) => {
    if (!window.confirm(`Are you sure you want to delete "${containerName}"? Cards inside will remain in your collection, but will become unassigned.`)) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/containers/${containerId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Failed to delete container');
      }

      setContainers((prev) => prev.filter((c) => c.id !== containerId));
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleUnassignCard = async (containerId, inventoryId) => {
    if (!window.confirm('Remove this card from this container? (It will remain in your collection)')) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/containers/${containerId}/items/${inventoryId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to remove item from container');

      setContainers((prev) =>
        prev.map((c) => {
          if (c.id !== containerId) return c;

          const removedItem = c.items.find((i) => i.inventory_id === inventoryId);
          const removedQty = removedItem ? removedItem.quantity : 1;

          return {
            ...c,
            total_cards: Math.max(0, c.total_cards - removedQty),
            items: c.items.filter((i) => i.inventory_id !== inventoryId)
          };
        })
      );

      if (selectedCard?.inventory_id === inventoryId) {
        setSelectedCard(null);
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  return (
    <div className="p1 m-auto" style={{ maxWidth: '1200px' }}>
      <div className="row justify-between align-center mb1">
        <h2>My Binders & Boxes</h2>
        <button
          className="btn border bg-amber-flame cursor-pointer"
          onClick={() => setShowCreateModal(true)}
        >
          + Create Container
        </button>
      </div>

      {fetching && <div className="p1 text-center">Loading containers...</div>}
      {error && <div className="p1 text-center font-danger">Error: {error}</div>}

      {!fetching && !error && containers.length === 0 && (
        <div className="p1 text-center font-sage">
          You haven't created any storage containers yet.
        </div>
      )}

      {/* Container Cards List */}
      {!fetching && !error && (
        <div className="row">
          {containers.map((c) => {
            const isExpanded = expandedContainerId === c.id;

            return (
              <div key={c.id} className="col-sm-12 p05">
                <div className="border-sage br05 p1 bg-white shadow-subtle">
                  <div className="row justify-between align-center">
                    <div>
                      <h3>
                        <i className="fa-solid fa-box-archive mr05"></i>
                        {' ' + c.name}
                      </h3>
                      <p className="font-sage m0">
                        {c.description || 'No description provided.'}
                      </p>
                    </div>
                    
                    <div className="text-right">
                      <span className="bold block mr1" style={{ fontSize: '1.1rem' }}>
                        {c.total_cards} {c.total_cards === 1 ? 'card ' : 'cards '}
                      </span>
                      <button
                        type="button"
                        className="btn border bg-amber-flame mt05 cursor-pointer"
                        onClick={() => toggleExpand(c.id)}
                      >
                        {isExpanded ? 'Hide Contents ▲' : 'View Contents ▼'}
                      </button>
                      {' '}
                      <button
                        type="button"
                        className="btn border bg-flag-red font-white cursor-pointer"
                        title="Delete Container"
                        onClick={() => handleDeleteContainer(c.id, c.name)}
                      >
                        <i className="fa-solid fa-trash"></i>
                      </button>
                    </div>
                  </div>

                  {/* Expandable Inner Card Grid */}
                  {isExpanded && (
                    <div className="mt1 pt1 border-top">
                      <h4>Stored Cards</h4>

                      {c.items.length === 0 ? (
                        <p className="font-sage italic">This container is currently empty.</p>
                      ) : (
                        <div className="row">
                          {c.items.map((item) => (
                            <div
                              key={item.inventory_id}
                              className="col-sm-6 col-md-3 col-lg-2 p05"
                            >
                              <div
                                className="border-sage br05 p05 bg-cream text-center relative cursor-pointer"
                                onClick={() => handleCardClick(item, c.id)}
                              >
                                <img
                                  src={item.image_url}
                                  alt={item.name}
                                  width="100%"
                                  className="br05"
                                />
                                <h5 className="m0 mt05">{item.name}</h5>
                                <p className="font-sage m0" style={{ fontSize: '0.8rem' }}>
                                  {item.set_name} ({item.set_number})
                                </p>
                                <p className="font-sage m0" style={{ fontSize: '0.75rem' }}>
                                  {item.condition}
                                </p>

                                <div className="row justify-between align-center mt05">
                                  <span className="bg-amber-flame font-white br025 p025 bold" style={{ fontSize: '0.8rem' }}>
                                    x{item.quantity}
                                  </span>
                                  <button
                                    type="button"
                                    className="btn bg-white border-sage font-flag-red p025 br025 cursor-pointer"
                                    title="Remove from container"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleUnassignCard(c.id, item.inventory_id);
                                    }}
                                  >
                                    <i className="fa-solid fa-arrow-right-from-bracket"></i>
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Container Modal */}
      {showCreateModal && (
        <div
          className="modal-overlay bg-charcoal-transparent"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="bg-white modal p1 br05"
            style={{ width: '400px', position: 'relative' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="modal-close-btn"
              onClick={() => setShowCreateModal(false)}
            >
              ✕
            </button>
            <h3>New Container</h3>
            <form onSubmit={handleCreate} className='form'>
              <label>Name</label>
              <input
                type="text"
                placeholder="e.g. Binder #1, Bulk Box A"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <label>Description</label>
              <textarea
                placeholder="e.g. Scarlet & Violet Master Set"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows="3"
              />
              <button
                type="submit"
                disabled={loading}
                className="btn border bg-amber-flame mt1"
                style={{ width: '100%' }}
              >
                {loading ? 'Creating...' : 'Create Container'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Card Detail Modal */}
      {selectedCard && (
        <CardDetailModal
          selectedCard={selectedCard}
          onClose={() => setSelectedCard(null)}
          onDeleteInventoryItem={() => handleUnassignCard(selectedCard.container_id, selectedCard.inventory_id)}
        />
      )}
    </div>
  );
}