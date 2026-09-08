import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const API_BASE_URL = `http://localhost:3000`;

export default function AddToCollectionModal({ card, onClose, onSuccess }) {
  const [quantity, setQuantity] = useState(1);
  const [condition, setCondition] = useState('Near Mint');
  const [dollars, setDollars] = useState('');
  const [notes, setNotes] = useState('');
  const [containers, setContainers] = useState([]);
  const [selectedContainerId, setSelectedContainerId] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const { token } = useAuth();

  useEffect(() => {
    async function fetchContainers() {
      try {
        const res = await fetch(`${API_BASE_URL}/containers`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const json = await res.json();
        if (json.success) setContainers(json.data);
      } catch (err) {
        console.error('Failed to load containers:', err);
      }
    }
    fetchContainers();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const priceCents = dollars ? Math.round(parseFloat(dollars) * 100) : null;

    try {
      // 1. Add to user inventory
      const invRes = await fetch(`${API_BASE_URL}/inventory`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          card_id: card.id,
          quantity: parseInt(quantity, 10),
          condition,
          purchase_price_cents: priceCents,
          notes
        })
      });
      const invJson = await invRes.json();
      if (!invRes.ok) throw new Error(invJson.error || 'Failed to add card');

      // 2. Assign to container if selected
      if (selectedContainerId) {
        await fetch(`${API_BASE_URL}/containers/${selectedContainerId}/items`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            inventory_id: invJson.inventory_id,
            quantity: parseInt(quantity, 10)
          })
        });
      }

      // 3. Refresh collection total cards and market value banner
      if (onSuccess) {
        onSuccess();
      }

      setMessage({ type: 'success', text: `Added ${card.name} to collection!` });
      setTimeout(onClose, 1200);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay bg-charcoal-transparent" onClick={onClose}>
      <div 
        className="bg-white modal p1 br05" 
        style={{ width: '500px', maxWidth: '90vw', position: 'relative' }} 
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="modal-close-btn" onClick={onClose}>✕</button>
        <h3>Add to Collection</h3>
        <p className="bold">{card.name} ({card.set_name})</p>

        {message && (
          <div className={`p05 mb1 br05 ${message.type === 'error' ? 'bg-flag-red font-white' : 'bg-sage'}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="form">
          <div className="row">
            <div className="col-6">
              <label>Quantity</label>
              <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
            </div>
            <div className="col-6">
              <label>Condition</label>
              <select value={condition} onChange={(e) => setCondition(e.target.value)}>
                <option value="Near Mint">Near Mint (NM)</option>
                <option value="Lightly Played">Lightly Played (LP)</option>
                <option value="Moderately Played">Moderately Played (MP)</option>
                <option value="Heavily Played">Heavily Played (HP)</option>
                <option value="Damaged">Damaged</option>
                <option value="Graded">Graded</option>
              </select>
            </div>
          </div>

          <label>Purchase Price ($)</label>
          <input type="number" step="0.01" placeholder="0.00" value={dollars} onChange={(e) => setDollars(e.target.value)} />

          <label>Assign to Container / Binder</label>
          <select value={selectedContainerId} onChange={(e) => setSelectedContainerId(e.target.value)}>
            <option value="">-- None (Unassigned) --</option>
            {containers.map((c) => (
              <option key={c.id} value={c.id}>{c.name} ({c.total_cards} cards)</option>
            ))}
          </select>

          <label>Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Swapped with John, First Edition, etc." rows="2" />

          <button type="submit" disabled={loading} className="btn border bg-amber-flame mt1" style={{ width: '100%' }}>
            {loading ? 'Adding...' : 'Save to Collection'}
          </button>
        </form>
      </div>
    </div>
  );
}