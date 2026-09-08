import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const API_BASE_URL = 'http://localhost:3000';

export default function Update() {
  const { token } = useAuth();
  const [currentImageUrl, setCurrentImageUrl] = useState(null);

  // Top-Level Mode: 'create' | 'edit-set' | 'edit-card'
  const [activeWorkflow, setActiveWorkflow] = useState('create');

  const [step, setStep] = useState(1); // For creation wizard
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // --- SHARED SET STATE ---
  const [sets, setSets] = useState([]);
  const [selectedSetId, setSelectedSetId] = useState('');
  const [isCreatingNewSet, setIsCreatingNewSet] = useState(false);
  const [newSetData, setNewSetData] = useState({
    name: '', era: '', total: '', complete_total: '',
    master_total: '', grandmaster_total: '', stamped_grandmaster_total: '', release_date: ''
  });

  // --- SHARED CARD STATE ---
  const [cardsInSet, setCardsInSet] = useState([]);
  const [selectedCardId, setSelectedCardId] = useState('');
  const [activeCardId, setActiveCardId] = useState(null);
  const [existingCardFound, setExistingCardFound] = useState(null);
  const [cardData, setCardData] = useState({
    name: '', run: '', foil: '', print_variant: '', stamp: '', rarity: '',
    supertype: 'Pokémon', subtypes: '', type_1: '', type_2: '', hp: '',
    evolves_from: '', pokemon_number: '', pokemon_category: '', height: '',
    weight: '', weakness_type: '', weakness_modifier: '', resistance_type: '',
    resistance_modifier: '', retreat_cost: '', illustrator: '', set_number: '',
    dex_entry: '', copyright_text: '', abilities: [], attacks: []
  });

  // --- IMAGE UPLOAD STATE ---
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  useEffect(() => {
    fetchSets();
  }, []);

  const fetchSets = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/sets`);
      const json = await res.json();
      if (json.success) setSets(json.data);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to load sets from server.' });
    }
  };

  // --- WORKFLOW SWITCHING ---
  const handleWorkflowChange = (workflow) => {
    setActiveWorkflow(workflow);
    setMessage(null);
    setSelectedSetId('');
    setSelectedCardId('');
    setStep(1);
    resetCardData();
  };

  const resetCardData = () => {
    setCardData({
      name: '', run: '', foil: '', print_variant: '', stamp: '', rarity: '',
      supertype: 'Pokémon', subtypes: '', type_1: '', type_2: '', hp: '',
      evolves_from: '', pokemon_number: '', pokemon_category: '', height: '',
      weight: '', weakness_type: '', weakness_modifier: '', resistance_type: '',
      resistance_modifier: '', retreat_cost: '', illustrator: '', set_number: '',
      dex_entry: '', copyright_text: '', abilities: [], attacks: []
    });
  };

  // --- MODE 2: EDIT SET HANDLERS ---
  const handleSelectSetToEdit = (setId) => {
    setSelectedSetId(setId);
    const targetSet = sets.find((s) => s.id === parseInt(setId, 10));
    if (targetSet) {
      setNewSetData({
        name: targetSet.name || '',
        era: targetSet.era || '',
        total: targetSet.total ?? '',
        complete_total: targetSet.complete_total ?? '',
        master_total: targetSet.master_total ?? '',
        grandmaster_total: targetSet.grandmaster_total ?? '',
        stamped_grandmaster_total: targetSet.stamped_grandmaster_total ?? '',
        release_date: targetSet.release_date || ''
      });
    }
  };

  const handleUpdateSetSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSetId) return;

    setLoading(true);
    setMessage(null);

    try {
      const payload = {
        ...newSetData,
        total: newSetData.total !== '' ? parseInt(newSetData.total, 10) : null,
        complete_total: newSetData.complete_total !== '' ? parseInt(newSetData.complete_total, 10) : null,
        master_total: newSetData.master_total !== '' ? parseInt(newSetData.master_total, 10) : null,
        grandmaster_total: newSetData.grandmaster_total !== '' ? parseInt(newSetData.grandmaster_total, 10) : null,
        stamped_grandmaster_total: newSetData.stamped_grandmaster_total !== '' ? parseInt(newSetData.stamped_grandmaster_total, 10) : null
      };

      const res = await fetch(`${API_BASE_URL}/sets/${selectedSetId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update set');

      setMessage({ type: 'success', text: 'Set updated successfully!' });
      fetchSets();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  // --- MODE 3: EDIT CARD HANDLERS ---
  const handleSelectSetForCardEdit = async (setId) => {
    setSelectedSetId(setId);
    setSelectedCardId('');
    resetCardData();

    if (!setId) return;

    try {
      const res = await fetch(`${API_BASE_URL}/cards?set_id=${setId}`);
      const json = await res.json();
      if (json.success) setCardsInSet(json.data);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to fetch cards for this set.' });
    }
  };

  const handleSelectCardToEdit = async (cardId) => {
    setSelectedCardId(cardId);
    setSelectedFile(null);
    setImagePreview(null);

    if (!cardId) {
      resetCardData();
      setCurrentImageUrl(null);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/cards/${cardId}`);
      const json = await res.json();
      const card = json.data;

      if (card) {
        // Store current image location (if available)
        setCurrentImageUrl(card.location || card.image_url || null);

        setCardData({
          name: card.name || '',
          run: card.run || '',
          foil: card.foil || '',
          print_variant: card.print_variant || '',
          stamp: card.stamp || '',
          rarity: card.rarity || '',
          supertype: card.supertype || 'Pokémon',
          subtypes: card.subtypes || '',
          type_1: card.type_1 || '',
          type_2: card.type_2 || '',
          hp: card.hp ?? '',
          evolves_from: card.evolves_from || '',
          pokemon_number: card.pokemon_number ?? '',
          pokemon_category: card.pokemon_category || '',
          height: card.height || '',
          weight: card.weight || '',
          weakness_type: card.weakness_type || '',
          weakness_modifier: card.weakness_modifier || '',
          resistance_type: card.resistance_type || '',
          resistance_modifier: card.resistance_modifier || '',
          retreat_cost: card.retreat_cost ?? '',
          illustrator: card.illustrator || '',
          set_number: card.set_number || '',
          dex_entry: card.dex_entry || '',
          copyright_text: card.copyright_text || '',
          abilities: card.abilities || [],
          attacks: card.attacks || []
        });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to load card details.' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCardSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCardId) return;

    setLoading(true);
    setMessage(null);

    try {
      const payload = {
        ...cardData,
        set_id: parseInt(selectedSetId, 10),
        hp: cardData.hp !== '' ? parseInt(cardData.hp, 10) : null,
        pokemon_number: cardData.pokemon_number !== '' ? parseInt(cardData.pokemon_number, 10) : null,
        abilities: cardData.abilities.map(a => ({
          name: a.name,
          type: a.type || 'Ability',
          description: a.description
        })),
        attacks: cardData.attacks.map(a => ({
          name: a.name,
          cost: a.cost,
          converted_energy_cost: a.converted_energy_cost !== '' ? parseInt(a.converted_energy_cost, 10) : 0,
          damage: a.damage,
          description: a.description
        }))
      };

      const res = await fetch(`${API_BASE_URL}/cards/${selectedCardId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update card.');

      setMessage({ type: 'success', text: `Card "${cardData.name}" updated successfully!` });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };
  const handleFileChange = (e) => {
  const file = e.target.files[0];
  if (file) {
      setSelectedFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleReplaceImage = async () => {
    if (!selectedFile || !selectedCardId) return;

    setLoading(true);
    setMessage(null);

    const formData = new FormData();
    formData.append('card_id', selectedCardId);
    formData.append('image', selectedFile);

    try {
      const res = await fetch(`${API_BASE_URL}/cards/image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      const json = await res.json();

      if (!res.ok) throw new Error(json.error || 'Failed to replace image.');

      setMessage({ type: 'success', text: 'Card image updated successfully!' });
      setCurrentImageUrl(json.location);
      setSelectedFile(null);
      setImagePreview(null);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  // --- CREATION HANDLERS (STEP 1 & 2) ---
  const handleSetSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);

    if (!isCreatingNewSet) {
      if (!selectedSetId) {
        setMessage({ type: 'error', text: 'Please select a set.' });
        return;
      }
      setStep(2);
      return;
    }

    if (!newSetData.name.trim()) {
      setMessage({ type: 'error', text: 'Set name is required.' });
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...newSetData,
        name: newSetData.name.trim(),
        total: newSetData.total !== '' ? parseInt(newSetData.total, 10) : null,
        complete_total: newSetData.complete_total !== '' ? parseInt(newSetData.complete_total, 10) : null,
        master_total: newSetData.master_total !== '' ? parseInt(newSetData.master_total, 10) : null,
        grandmaster_total: newSetData.grandmaster_total !== '' ? parseInt(newSetData.grandmaster_total, 10) : null,
        stamped_grandmaster_total: newSetData.stamped_grandmaster_total !== '' ? parseInt(newSetData.stamped_grandmaster_total, 10) : null,
      };

      const res = await fetch(`${API_BASE_URL}/sets`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      const json = await res.json();

      if (!res.ok) throw new Error(json.error || 'Failed to create set.');

      setMessage({ type: 'success', text: `Set "${newSetData.name}" created!` });
      await fetchSets();
      setSelectedSetId(json.data.id);
      setIsCreatingNewSet(false);
      setStep(2);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCardSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);

    if (!cardData.name.trim()) {
      setMessage({ type: 'error', text: 'Card name is required.' });
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...cardData,
        name: cardData.name.trim(),
        set_id: parseInt(selectedSetId, 10),
        hp: cardData.hp !== '' ? parseInt(cardData.hp, 10) : null,
        pokemon_number: cardData.pokemon_number !== '' ? parseInt(cardData.pokemon_number, 10) : null,
        abilities: cardData.abilities.map(a => ({
          name: a.name,
          type: a.type || 'Ability',
          description: a.description
        })),
        attacks: cardData.attacks.map(a => ({
          name: a.name,
          cost: a.cost,
          converted_energy_cost: a.converted_energy_cost !== '' ? parseInt(a.converted_energy_cost, 10) : 0,
          damage: a.damage,
          description: a.description
        }))
      };

      const res = await fetch(`${API_BASE_URL}/cards`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      const json = await res.json();

      if (!res.ok) throw new Error(json.error || 'Failed to create card.');

      setActiveCardId(json.data.id);
      setMessage({ type: 'success', text: `Card "${cardData.name}" created! Proceed to upload image.` });
      setStep(3);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  // --- DYNAMIC ABILITIES & ATTACKS ---
  const handleAddAbility = () => {
    setCardData({ ...cardData, abilities: [...cardData.abilities, { name: '', type: 'Ability', description: '' }] });
  };
  const handleAbilityChange = (index, field, value) => {
    const updated = [...cardData.abilities];
    updated[index][field] = value;
    setCardData({ ...cardData, abilities: updated });
  };
  const handleRemoveAbility = (index) => {
    setCardData({ ...cardData, abilities: cardData.abilities.filter((_, i) => i !== index) });
  };

  const handleAddAttack = () => {
    setCardData({ ...cardData, attacks: [...cardData.attacks, { name: '', cost: '', converted_energy_cost: '', damage: '', description: '' }] });
  };
  const handleAttackChange = (index, field, value) => {
    const updated = [...cardData.attacks];
    updated[index][field] = value;
    setCardData({ ...cardData, attacks: updated });
  };
  const handleRemoveAttack = (index) => {
    setCardData({ ...cardData, attacks: cardData.attacks.filter((_, i) => i !== index) });
  };

  if (!token) {
  return (
    <div style={{ maxWidth: '800px', margin: '2rem auto', textAlign: 'center' }}>
      <h2>Access Denied</h2>
      <p>Please log in with an authorized account to manage sets and cards.</p>
    </div>
  );
}

  return (
    <div style={{ maxWidth: '800px', margin: '2rem auto', padding: '1.5rem', border: '1px solid #ccc', borderRadius: '8px', fontFamily: 'sans-serif' }}>
      <h2>Card Tracker Entry Manager</h2>

      {/* WORKFLOW TABS */}
      <div className="row mb1 justify-between">
        <button
          type="button"
          className={`btn border col-sm-4 ${activeWorkflow === 'create' ? 'bg-amber-flame bold' : 'bg-white'}`}
          onClick={() => handleWorkflowChange('create')}
        >
          1. Create Set / Card
        </button>
        <button
          type="button"
          className={`btn border col-sm-4 ${activeWorkflow === 'edit-set' ? 'bg-amber-flame bold' : 'bg-white'}`}
          onClick={() => handleWorkflowChange('edit-set')}
        >
          2. Edit Set
        </button>
        <button
          type="button"
          className={`btn border col-sm-4 ${activeWorkflow === 'edit-card' ? 'bg-amber-flame bold' : 'bg-white'}`}
          onClick={() => handleWorkflowChange('edit-card')}
        >
          3. Edit Card
        </button>
      </div>

      {message && (
        <div style={{
          padding: '0.75rem',
          marginBottom: '1rem',
          borderRadius: '4px',
          backgroundColor: message.type === 'error' ? '#f8d7da' : message.type === 'success' ? '#d4edda' : '#cce5ff',
          color: message.type === 'error' ? '#721c24' : message.type === 'success' ? '#155724' : '#004085'
        }}>
          {message.text}
        </div>
      )}

      {/* ========================================================= */}
      {/* WORKFLOW 1: CREATE (EXISTING WIZARD) */}
      {/* ========================================================= */}
      {activeWorkflow === 'create' && (
        <>
          {/* STEP 1: SET SETUP */}
          {step === 1 && (
            <form onSubmit={handleSetSubmit}>
              <h3>Step 1: Set Selection & Metadata</h3>
              <div style={{ marginBottom: '1rem' }}>
                <label>
                  <input type="radio" name="setOption" checked={!isCreatingNewSet} onChange={() => setIsCreatingNewSet(false)} />
                  Select Existing Set
                </label>
                <label style={{ marginLeft: '1rem' }}>
                  <input type="radio" name="setOption" checked={isCreatingNewSet} onChange={() => setIsCreatingNewSet(true)} />
                  Create New Set
                </label>
              </div>

              {!isCreatingNewSet ? (
                <div style={{ marginBottom: '1rem' }}>
                  <select value={selectedSetId} onChange={(e) => setSelectedSetId(e.target.value)} style={{ width: '100%', padding: '0.5rem' }}>
                    <option value="">-- Choose Set --</option>
                    {sets.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} {s.era ? `(${s.era})` : ''}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className='row mb1'>
                  <p className='col-sm-12'>The <strong>Set Name</strong> is just the name of the set, for example "Destined Rivals"</p>
                  <input className='col-sm-12 p05' type="text" placeholder="Set Name *" value={newSetData.name} onChange={(e) => setNewSetData({ ...newSetData, name: e.target.value })} />
                  <p className='col-sm-12'>The <strong>Era</strong> is the overarching group of card sets like "Neo" or "Scarlet & Violet"</p>
                  <input className='col-sm-12 p05' type="text" placeholder="Era (e.g. Scarlet & Violet)" value={newSetData.era} onChange={(e) => setNewSetData({ ...newSetData, era: e.target.value })} style={{ padding: '0.5rem' }} />
                  <p className='col-sm-12'><strong>Total Base Cards</strong> is the total number on the card for example 102 for Base Set or 182 for Destined Rivals</p>
                  <input className='col-sm-12 p05' type="number" placeholder="Total Base Cards" value={newSetData.total} onChange={(e) => setNewSetData({ ...newSetData, total: e.target.value })} style={{ padding: '0.5rem' }} />
                  <p className='col-sm-12'>The <strong>Complete Total</strong> is the count of all cards officially released for the set</p>
                  <input className='col-sm-12 p05' type="number" placeholder="Complete Total" value={newSetData.complete_total} onChange={(e) => setNewSetData({ ...newSetData, complete_total: e.target.value })} style={{ padding: '0.5rem' }} />
                  <p className='col-sm-12'>The <strong>Master Total</strong> is the Complete Total + a count for each reverse holo</p>
                  <input className='col-sm-12 p05' type="number" placeholder="Master Total" value={newSetData.master_total} onChange={(e) => setNewSetData({ ...newSetData, master_total: e.target.value })} style={{ padding: '0.5rem' }} />
                  <p className='col-sm-12'>The <strong>Grandmaster Total</strong> is the Master Total + Promos + cosmo holos</p>
                  <input className='col-sm-12 p05' type="number" placeholder="Grandmaster Total" value={newSetData.grandmaster_total} onChange={(e) => setNewSetData({ ...newSetData, grandmaster_total: e.target.value })} style={{ padding: '0.5rem' }} />
                  <p className='col-sm-12'>The <strong>Stamped Grandmaster Total</strong> is the Grandmaster Total + stamped variants.</p>
                  <input className='col-sm-12 p05' type="number" placeholder="Stamped Grandmaster Total" value={newSetData.stamped_grandmaster_total} onChange={(e) => setNewSetData({ ...newSetData, stamped_grandmaster_total: e.target.value })} style={{ padding: '0.5rem' }} />

                  <label className='col-sm-12'>Release Date</label>
                  <input className='col-sm-12 p05' type="date" value={newSetData.release_date} onChange={(e) => setNewSetData({ ...newSetData, release_date: e.target.value })} />
                </div>
              )}

              <button type="submit" disabled={loading} className='btn border br025 bg-amber-flame'>
                {loading ? 'Saving Set...' : <>Continue to Card Entry <i className="fa-solid fa-right-long"></i></>}
              </button>
            </form>
          )}

          {/* STEP 2: CARD CREATION */}
          {step === 2 && (
            <form onSubmit={handleCardSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <button className='mb1 btn border' type="button" onClick={() => setStep(1)}><i className="fa-solid fa-left-long"></i> Back to Set Selection</button>
              <h3>Step 2: Card Creation</h3>

              <fieldset style={{ padding: '1rem', border: '1px solid #ddd', borderRadius: '4px' }}>
                <legend><strong>General Information</strong></legend>
                <div className='row'>
                  <input className='col-sm-6 col-md-4 p05' type="text" placeholder="Card Name *" value={cardData.name} onChange={(e) => setCardData({ ...cardData, name: e.target.value })} />
                  <input className='col-sm-6 col-md-4 p05' type="text" placeholder="Set Number (e.g. 001/198)" value={cardData.set_number} onChange={(e) => setCardData({ ...cardData, set_number: e.target.value })} />
                  <input className='col-sm-6 col-md-4 p05' type="text" placeholder="Supertype (e.g. Pokémon)" value={cardData.supertype} onChange={(e) => setCardData({ ...cardData, supertype: e.target.value })} />
                  <input className='col-sm-6 col-md-4 p05' type="text" placeholder="Subtypes (e.g. Stage 1)" value={cardData.subtypes} onChange={(e) => setCardData({ ...cardData, subtypes: e.target.value })} />
                  <input className='col-sm-6 col-md-4 p05' type="text" placeholder="Rarity" value={cardData.rarity} onChange={(e) => setCardData({ ...cardData, rarity: e.target.value })} />
                  <input className='col-sm-6 col-md-4 p05' type="text" placeholder="Illustrator" value={cardData.illustrator} onChange={(e) => setCardData({ ...cardData, illustrator: e.target.value })} />
                </div>
              </fieldset>

              <button className='btn bg-medium-jungle font-white p1' type="submit" disabled={loading}>
                {loading ? 'Inserting Card...' : <>Save Card & Proceed <i className="fa-solid fa-right-long"></i></>}
              </button>
            </form>
          )}
        </>
      )}

      {/* ========================================================= */}
      {/* WORKFLOW 2: EDIT SET */}
      {/* ========================================================= */}
      {activeWorkflow === 'edit-set' && (
        <form onSubmit={handleUpdateSetSubmit}>
          <h3>Edit Existing Set</h3>
          <div style={{ marginBottom: '1rem' }}>
            <select
              value={selectedSetId}
              onChange={(e) => handleSelectSetToEdit(e.target.value)}
              style={{ width: '100%', padding: '0.5rem' }}
            >
              <option value="">-- Choose Set to Edit --</option>
              {sets.map((s) => (
                <option key={s.id} value={s.id}>{s.name} {s.era ? `(${s.era})` : ''}</option>
              ))}
            </select>
          </div>

          {selectedSetId && (
            <div className='row mb1'>
              <input className='col-sm-12 p05' type="text" placeholder="Set Name *" value={newSetData.name} onChange={(e) => setNewSetData({ ...newSetData, name: e.target.value })} />
              <input className='col-sm-12 p05' type="text" placeholder="Era" value={newSetData.era} onChange={(e) => setNewSetData({ ...newSetData, era: e.target.value })} />
              <input className='col-sm-12 p05' type="number" placeholder="Total Base Cards" value={newSetData.total} onChange={(e) => setNewSetData({ ...newSetData, total: e.target.value })} />
              <input className='col-sm-12 p05' type="number" placeholder="Complete Total" value={newSetData.complete_total} onChange={(e) => setNewSetData({ ...newSetData, complete_total: e.target.value })} />
              <input className='col-sm-12 p05' type="number" placeholder="Master Total" value={newSetData.master_total} onChange={(e) => setNewSetData({ ...newSetData, master_total: e.target.value })} />
              <input className='col-sm-12 p05' type="number" placeholder="Grandmaster Total" value={newSetData.grandmaster_total} onChange={(e) => setNewSetData({ ...newSetData, grandmaster_total: e.target.value })} />
              <input className='col-sm-12 p05' type="number" placeholder="Stamped Grandmaster Total" value={newSetData.stamped_grandmaster_total} onChange={(e) => setNewSetData({ ...newSetData, stamped_grandmaster_total: e.target.value })} />
              <label className='col-sm-12'>Release Date</label>
              <input className='col-sm-12 p05' type="date" value={newSetData.release_date} onChange={(e) => setNewSetData({ ...newSetData, release_date: e.target.value })} />

              <button type="submit" disabled={loading} className='btn border br025 bg-amber-flame mt1 col-sm-12'>
                {loading ? 'Updating Set...' : 'Save Changes to Set'}
              </button>
            </div>
          )}
        </form>
      )}

      {/* ========================================================= */}
      {/* WORKFLOW 3: EDIT CARD */}
      {/* ========================================================= */}
      {activeWorkflow === 'edit-card' && (
        <form onSubmit={handleUpdateCardSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3>Edit Existing Card</h3>

          {/* Select Set First */}
          <div style={{ marginBottom: '0.5rem' }}>
            <label className="bold block mb025">1. Select Set:</label>
            <select
              value={selectedSetId}
              onChange={(e) => handleSelectSetForCardEdit(e.target.value)}
              style={{ width: '100%', padding: '0.5rem' }}
            >
              <option value="">-- Choose Set --</option>
              {sets.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Select Card Second */}
          {selectedSetId && (
            <div style={{ marginBottom: '1rem' }}>
              <label className="bold block mb025">2. Select Card to Edit:</label>
              <select
                value={selectedCardId}
                onChange={(e) => handleSelectCardToEdit(e.target.value)}
                style={{ width: '100%', padding: '0.5rem' }}
              >
                <option value="">-- Choose Card --</option>
                {cardsInSet.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.set_number})</option>
                ))}
              </select>
            </div>
          )}

          {/* Card Edit Form Fields */}
          {selectedCardId && (
            <>
              <fieldset style={{ padding: '1rem', border: '1px solid #ddd', borderRadius: '4px' }}>
                <legend><strong>Card Artwork / Image</strong></legend>
                
                <div className="row align-center">
                  {/* Current Image */}
                  <div className="col-sm-6 text-center">
                    <p className="bold m0 mb05">Current Image:</p>
                    {currentImageUrl ? (
                      <img src={currentImageUrl} alt="Current Card" style={{ maxWidth: '160px', borderRadius: '6px', border: '1px solid #ccc' }} />
                    ) : (
                      <p className="font-sage italic">No image currently attached.</p>
                    )}
                  </div>

                  {/* New File Upload Preview */}
                  <div className="col-sm-6 text-center">
                    <p className="bold m0 mb05">New Image Preview:</p>
                    {imagePreview ? (
                      <img src={imagePreview} alt="New Preview" style={{ maxWidth: '160px', borderRadius: '6px', border: '1px solid #17a2b8' }} />
                    ) : (
                      <p className="font-sage italic">Select a new image file below to preview.</p>
                    )}
                  </div>
                </div>

                <div className="mt1">
                  <input type="file" accept="image/*" onChange={handleFileChange} />
                  {selectedFile && (
                    <button
                      type="button"
                      className="btn bg-blue-green font-white p05 mt05 cursor-pointer"
                      onClick={handleReplaceImage}
                      disabled={loading}
                    >
                      {loading ? 'Uploading...' : 'Replace Card Image'}
                    </button>
                  )}
                </div>
              </fieldset>
              <fieldset style={{ padding: '1rem', border: '1px solid #ddd', borderRadius: '4px' }}>
                <legend><strong>General Information</strong></legend>
                <div className='row'>
                  <input className='col-sm-6 col-md-4 p05' type="text" placeholder="Card Name *" value={cardData.name} onChange={(e) => setCardData({ ...cardData, name: e.target.value })} />
                  <input className='col-sm-6 col-md-4 p05' type="text" placeholder="Set Number" value={cardData.set_number} onChange={(e) => setCardData({ ...cardData, set_number: e.target.value })} />
                  <input className='col-sm-6 col-md-4 p05' type="text" placeholder="Supertype" value={cardData.supertype} onChange={(e) => setCardData({ ...cardData, supertype: e.target.value })} />
                  <input className='col-sm-6 col-md-4 p05' type="text" placeholder="Rarity" value={cardData.rarity} onChange={(e) => setCardData({ ...cardData, rarity: e.target.value })} />
                  <input className='col-sm-6 col-md-4 p05' type="text" placeholder="Illustrator" value={cardData.illustrator} onChange={(e) => setCardData({ ...cardData, illustrator: e.target.value })} />
                </div>
              </fieldset>

              {/* Dynamic Abilities */}
              <fieldset style={{ padding: '1rem', border: '1px solid #ddd', borderRadius: '4px' }}>
                <legend><strong>Abilities</strong></legend>
                {cardData.abilities.map((ability, index) => (
                  <div key={index} className='row mb05'>
                    <input className='col-sm-6 p05' type="text" placeholder="Ability Name" value={ability.name} onChange={(e) => handleAbilityChange(index, 'name', e.target.value)} />
                    <input className='col-sm-5 p05' type="text" placeholder="Ability Type" value={ability.type} onChange={(e) => handleAbilityChange(index, 'type', e.target.value)} />
                    <button className='btn border col-sm-1 p05 font-white bg-flag-red' type="button" onClick={() => handleRemoveAbility(index)}>✕</button>
                    <textarea className='col-sm-12 p05 mt025' placeholder="Description" value={ability.description} onChange={(e) => handleAbilityChange(index, 'description', e.target.value)} />
                  </div>
                ))}
                <button className='btn border' type="button" onClick={handleAddAbility}>+ Add Ability</button>
              </fieldset>

              {/* Dynamic Attacks */}
              <fieldset style={{ padding: '1rem', border: '1px solid #ddd', borderRadius: '4px' }}>
                <legend><strong>Attacks</strong></legend>
                {cardData.attacks.map((attack, index) => (
                  <div key={index} className='row mb05'>
                    <input className='col-sm-4 p05' type="text" placeholder="Attack Name" value={attack.name} onChange={(e) => handleAttackChange(index, 'name', e.target.value)} />
                    <input className='col-sm-4 p05' type="text" placeholder="Cost (Fire,Colorless)" value={attack.cost} onChange={(e) => handleAttackChange(index, 'cost', e.target.value)} />
                    <input className='col-sm-3 p05' type="text" placeholder="Damage" value={attack.damage} onChange={(e) => handleAttackChange(index, 'damage', e.target.value)} />
                    <button className='btn border col-sm-1 p05 font-white bg-flag-red' type="button" onClick={() => handleRemoveAttack(index)}>✕</button>
                    <textarea className='col-sm-12 p05 mt025' placeholder="Description" value={attack.description} onChange={(e) => handleAttackChange(index, 'description', e.target.value)} />
                  </div>
                ))}
                <button className='btn border' type="button" onClick={handleAddAttack}>+ Add Attack</button>
              </fieldset>

              <button className='btn bg-amber-flame p1' type="submit" disabled={loading}>
                {loading ? 'Updating Card...' : 'Save Changes to Card'}
              </button>
            </>
          )}
          
        </form>
      )}
    </div>
  );
}