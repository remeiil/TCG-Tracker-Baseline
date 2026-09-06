import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const API_BASE_URL = `http://192.168.1.20:3000`;

export default function ContainerManager() {
  const [containers, setContainers] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const { token } = useAuth();
  

  useEffect(() => {
    fetchContainers();
  }, []);

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
      }
    } catch (err) {
      console.error('Error creating container:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p1 m-auto" style={{ maxWidth: '1200px' }}>
      <div className="row justify-between align-center mb1">
        <h2>My Binders & Boxes</h2>
        <button className="btn border bg-amber-flame" onClick={() => setShowCreateModal(true)}>
          + Create Container
        </button>
      </div>

      {/* Container Cards */}
      <div className="row">
        {containers.map((c) => (
          <div key={c.id} className="col-sm-12 col-md-4 p05">
            <div className="border-sage br05 p1 bg-white shadow-subtle">
              <h4><i className="fa-solid fa-box-archive mr05"></i>{c.name}</h4>
              <p className="font-sage" style={{ minHeight: '2.5rem' }}>{c.description || 'No description provided.'}</p>
              <hr />
              <div className="row justify-between align-center">
                <span className="bold">{c.total_cards} Cards</span>
                <span className="font-sage" style={{ fontSize: '0.8rem' }}>
                  Created {new Date(c.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showCreateModal && (
        <div className="modal-overlay bg-charcoal-transparent" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white modal p1 br05" style={{ width: '400px' }} onClick={(e) => e.stopPropagation()}>
            <h3>New Container</h3>
            <form onSubmit={handleCreate}>
              <label>Name</label>
              <input type="text" placeholder="e.g. Binder #1, Bulk Box A" value={name} onChange={(e) => setName(e.target.value)} required />
              <label>Description</label>
              <textarea placeholder="e.g. Scarlet & Violet Master Set" value={description} onChange={(e) => setDescription(e.target.value)} rows="3" />
              <button type="submit" disabled={loading} className="btn border bg-amber-flame mt1" style={{ width: '100%' }}>
                {loading ? 'Creating...' : 'Create Container'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}