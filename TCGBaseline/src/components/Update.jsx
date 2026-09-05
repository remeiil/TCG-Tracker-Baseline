import React, { useState, useEffect } from 'react';

const API_BASE_URL = 'http://192.168.1.20:3000';

export default function Update() {
  const [step, setStep] = useState(1); // 1: Set, 2: Card, 3: Image Upload
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // --- SET STATE ---
  const [sets, setSets] = useState([]);
  const [selectedSetId, setSelectedSetId] = useState('');
  const [isCreatingNewSet, setIsCreatingNewSet] = useState(false);
  const [newSetData, setNewSetData] = useState({
    name: '', era: '', total: '', complete_total: '',
    master_total: '', grandmaster_total: '', stamped_grandmaster_total: '', release_date: ''
  });

  // --- CARD STATE ---
  const [activeCardId, setActiveCardId] = useState(null); // Retains card_id for Step 3
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

  // --- STEP 1: SET HANDLERS ---
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
        headers: { 'Content-Type': 'application/json' },
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

  // --- STEP 2: CARD HANDLERS ---
  const handleCheckCard = async () => {
    if (!cardData.name.trim()) {
      setMessage({ type: 'error', text: 'Enter a card name to check.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const query = new URLSearchParams({
        set_id: selectedSetId,
        name: cardData.name.trim()
      });

      const res = await fetch(`${API_BASE_URL}/cards?${query}`);
      const json = await res.json();

      if (json.success && json.data.length > 0) {
        const matchedCard = json.data.find(
          c => c.name.toLowerCase() === cardData.name.trim().toLowerCase()
        ) || json.data[0];

        setExistingCardFound(matchedCard);
        setActiveCardId(matchedCard.id);
        setMessage({
          type: 'info',
          text: `Card "${matchedCard.name}" exists (ID: ${matchedCard.id}). You can attach an image directly or proceed to edit.`
        });
      } else {
        setExistingCardFound(null);
        setActiveCardId(null);
        setMessage({ type: 'success', text: 'Card not found in set. You can add its full details below.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to verify card presence.' });
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();

      if (!res.ok) throw new Error(json.error || 'Failed to create card.');

      setActiveCardId(json.data.id);
      setMessage({ type: 'success', text: `Card "${cardData.name}" created! Proceed to upload image.` });
      setStep(3); // Proceed to Step 3: Image Upload
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  // --- STEP 3: IMAGE HANDLERS ---
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleImageUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setMessage({ type: 'error', text: 'Please select an image file to upload.' });
      return;
    }
    if (!activeCardId) {
      setMessage({ type: 'error', text: 'No card selected to attach this image to.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    const formData = new FormData();
    formData.append('card_id', activeCardId);
    formData.append('image', selectedFile);

    try {
      const res = await fetch(`${API_BASE_URL}/cards/image`, {
        method: 'POST',
        body: formData // Content-Type header set automatically by browser
      });
      const json = await res.json();

      if (!res.ok) throw new Error(json.error || 'Failed to upload image.');

      setMessage({ type: 'success', text: 'Card image uploaded and linked successfully!' });
      
      // Cleanup Step State
      setSelectedFile(null);
      setImagePreview(null);
      setExistingCardFound(null);
      setActiveCardId(null);
      setCardData({
        name: '', run: '', foil: '', print_variant: '', stamp: '', rarity: '',
        supertype: 'Pokémon', subtypes: '', type_1: '', type_2: '', hp: '',
        evolves_from: '', pokemon_number: '', pokemon_category: '', height: '',
        weight: '', weakness_type: '', weakness_modifier: '', resistance_type: '',
        resistance_modifier: '', retreat_cost: '', illustrator: '', set_number: '',
        dex_entry: '', copyright_text: '', abilities: [], attacks: []
      });
      setStep(2); // Loop back to card entry
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  // --- DYNAMIC FIELD HANDLERS ---
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

  return (
    <div style={{ maxWidth: '800px', margin: '2rem auto', padding: '1.5rem', border: '1px solid #ccc', borderRadius: '8px', fontFamily: 'sans-serif' }}>
      <h2>Card Tracker Entry Manager</h2>

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
              <p className='col-sm-12'><strong>Total Base Cards</strong> is the total number on the card for example 102  for Base Set or 182 for Destined Rivals</p>
              <input className='col-sm-12 p05' type="number" placeholder="Total Base Cards" value={newSetData.total} onChange={(e) => setNewSetData({ ...newSetData, total: e.target.value })} style={{ padding: '0.5rem' }} />
              <p className='col-sm-12'>The <strong>Complete Total</strong> is the count of all cards officially released for the set</p>
              <input className='col-sm-12 p05' type="number" placeholder="Complete Total" value={newSetData.complete_total} onChange={(e) => setNewSetData({ ...newSetData, complete_total: e.target.value })} style={{ padding: '0.5rem' }} />
              <p className='col-sm-12'>The <strong>Master Total</strong> is the Complete Total + a count for each reverse holo</p>
              <input className='col-sm-12 p05' type="number" placeholder="Master Total" value={newSetData.master_total} onChange={(e) => setNewSetData({ ...newSetData, master_total: e.target.value })} style={{ padding: '0.5rem' }} />
              <p className='col-sm-12'>The <strong>Grandmaster Total</strong> is the Master Total + Promos (typically from ETBs) + cosmo holos (typically from Blister Packs)</p>
              <input className='col-sm-12 p05' type="number" placeholder="Grandmaster Total" value={newSetData.grandmaster_total} onChange={(e) => setNewSetData({ ...newSetData, grandmaster_total: e.target.value })} style={{ padding: '0.5rem' }} />
              <p className='col-sm-12'>The <strong>Stamped Grandmaster Total</strong> is the Grandmaster Total + any stamped variants.</p>
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

      {/* STEP 2: CARD SETUP */}
      {step === 2 && (
        <div>
          <button className='mb1 btn border' onClick={() => setStep(1)}><i className="fa-solid fa-left-long"></i> Back to Set Selection</button>
          <h3>Step 2: Card Search & Comprehensive Creation</h3>

          <div className='row mb1'>
            <input className='col-sm-8 p05' type="text" placeholder="Card Name to Check..." value={cardData.name} onChange={(e) => setCardData({ ...cardData, name: e.target.value })} />
            <button className='col-sm-4 btn border' type="button" onClick={handleCheckCard} disabled={loading} style={{ padding: '0.5rem 1rem' }}>Check Database</button>
          </div>

          {existingCardFound && (
            <div style={{ padding: '1rem', border: '1px solid #17a2b8', borderRadius: '4px', marginBottom: '1rem' }}>
              <h4>Card Already Exists</h4>
              <p><strong>Name:</strong> {existingCardFound.name}</p>
              <p><strong>Set Number:</strong> {existingCardFound.set_number}</p>
              <p><strong>Rarity:</strong> {existingCardFound.rarity}</p>
              <button 
                type="button" 
                onClick={() => setStep(3)} 
                style={{ padding: '0.5rem 1rem', backgroundColor: '#17a2b8', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                Attach Image to Existing Card →
              </button>
            </div>
          )}

          {!existingCardFound && (
            <form onSubmit={handleCardSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              {/* General Information */}
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

              {/* Printing & Variants */}
              <fieldset style={{ padding: '1rem', border: '1px solid #ddd', borderRadius: '4px' }}>
                <legend><strong>Printing & Variants</strong></legend>
                <div className='row'>
                  <input className='col-sm-6 col-md-3 p05' type="text" placeholder="Run" value={cardData.run} onChange={(e) => setCardData({ ...cardData, run: e.target.value })} />
                  <input className='col-sm-6 col-md-3 p05' type="text" placeholder="Foil" value={cardData.foil} onChange={(e) => setCardData({ ...cardData, foil: e.target.value })} />
                  <input className='col-sm-6 col-md-3 p05' type="text" placeholder="Print Variant" value={cardData.print_variant} onChange={(e) => setCardData({ ...cardData, print_variant: e.target.value })} />
                  <input className='col-sm-6 col-md-3 p05' type="text" placeholder="Stamp" value={cardData.stamp} onChange={(e) => setCardData({ ...cardData, stamp: e.target.value })} />
                </div>
              </fieldset>

              {/* Pokémon Stats */}
              <fieldset style={{ padding: '1rem', border: '1px solid #ddd', borderRadius: '4px' }}>
                <legend><strong>Pokémon Stats</strong></legend>
                <div className='row'>
                  <input className='col-sm-6 col-md-4 p05' type="text" placeholder="Primary Type (type_1)" value={cardData.type_1} onChange={(e) => setCardData({ ...cardData, type_1: e.target.value })} />
                  <input className='col-sm-6 col-md-4 p05' type="text" placeholder="Secondary Type (type_2)" value={cardData.type_2} onChange={(e) => setCardData({ ...cardData, type_2: e.target.value })} />
                  <input className='col-sm-6 col-md-4 p05' type="number" placeholder="HP" value={cardData.hp} onChange={(e) => setCardData({ ...cardData, hp: e.target.value })} />
                  <input className='col-sm-6 col-md-4 p05' type="text" placeholder="Evolves From" value={cardData.evolves_from} onChange={(e) => setCardData({ ...cardData, evolves_from: e.target.value })} />
                  <input className='col-sm-6 col-md-4 p05' type="number" placeholder="National Dex Number" value={cardData.pokemon_number} onChange={(e) => setCardData({ ...cardData, pokemon_number: e.target.value })} />
                  <input className='col-sm-6 col-md-4 p05' type="text" placeholder="Category (e.g. Mouse)" value={cardData.pokemon_category} onChange={(e) => setCardData({ ...cardData, pokemon_category: e.target.value })} />
                  <input className='col-sm-6 col-md-4 p05' type="text" placeholder="Height" value={cardData.height} onChange={(e) => setCardData({ ...cardData, height: e.target.value })} />
                  <input className='col-sm-6 col-md-4 p05' type="text" placeholder="Weight" value={cardData.weight} onChange={(e) => setCardData({ ...cardData, weight: e.target.value })} />
                  <input className='col-sm-6 col-md-4 p05' type="text" placeholder="Retreat Cost" value={cardData.retreat_cost} onChange={(e) => setCardData({ ...cardData, retreat_cost: e.target.value })} />
                </div>
              </fieldset>

              {/* Combat Modifiers */}
              <fieldset style={{ padding: '1rem', border: '1px solid #ddd', borderRadius: '4px' }}>
                <legend><strong>Combat Modifiers</strong></legend>
                <div className='row'>
                  <input className='col-sm-6 col-md-3 p05' type="text" placeholder="Weakness Type" value={cardData.weakness_type} onChange={(e) => setCardData({ ...cardData, weakness_type: e.target.value })} />
                  <input className='col-sm-6 col-md-3 p05' type="text" placeholder="Weakness Modifier (e.g. x2)" value={cardData.weakness_modifier} onChange={(e) => setCardData({ ...cardData, weakness_modifier: e.target.value })} />
                  <input className='col-sm-6 col-md-3 p05' type="text" placeholder="Resistance Type" value={cardData.resistance_type} onChange={(e) => setCardData({ ...cardData, resistance_type: e.target.value })} />
                  <input className='col-sm-6 col-md-3 p05' type="text" placeholder="Resistance Modifier (e.g. -30)" value={cardData.resistance_modifier} onChange={(e) => setCardData({ ...cardData, resistance_modifier: e.target.value })} />
                </div>
              </fieldset>

              {/* Dynamic Abilities Section */}
              <fieldset style={{ padding: '1rem', border: '1px solid #ddd', borderRadius: '4px' }}>
                <legend><strong>Abilities</strong></legend>
                {cardData.abilities.map((ability, index) => (
                  <div key={index} className='row'>
                    <div className='col-sm-12'>
                      <div className='row'>
                      <input className='col-sm-6 p05' type="text" placeholder="Ability Name" value={ability.name} onChange={(e) => handleAbilityChange(index, 'name', e.target.value)} />
                      <input className='col-sm-5 p05' type="text" placeholder="Ability Type" value={ability.type} onChange={(e) => handleAbilityChange(index, 'type', e.target.value)} />
                      <button className='btn border col-sm-1 p05 font-white bg-flag-red' type="button" onClick={() => handleRemoveAbility(index)}>✕</button>
                      </div>
                    </div>
                    <textarea className='col-sm-12 mb05 p05' placeholder="Ability Description" value={ability.description} onChange={(e) => handleAbilityChange(index, 'description', e.target.value)} />
                  </div>
                ))}
                <button className='btn border' type="button" onClick={handleAddAbility}>Add Ability <i className="fa-solid fa-plus"></i></button>
              </fieldset>

              {/* Dynamic Attacks Section */}
              <fieldset style={{ padding: '1rem', border: '1px solid #ddd', borderRadius: '4px' }}>
                <legend><strong>Attacks</strong></legend>
                {cardData.attacks.map((attack, index) => (
                  <div key={index} className='row'>
                    <div className='col-sm-12'>
                      <div className='row'>
                      <input className='col-sm-6 col-md-4 p05' type="text" placeholder="Attack Name" value={attack.name} onChange={(e) => handleAttackChange(index, 'name', e.target.value)} />
                      <input className='col-sm-6 col-md-4 p05' type="text" placeholder="Cost" value={attack.cost} onChange={(e) => handleAttackChange(index, 'cost', e.target.value)} />
                      <input className='col-sm-6 col-md-1 p05' type="number" placeholder="Energy Count" value={attack.converted_energy_cost} onChange={(e) => handleAttackChange(index, 'converted_energy_cost', e.target.value)} />
                      <input className='col-sm-5 col-md-2 p05' type="text" placeholder="Damage" value={attack.damage} onChange={(e) => handleAttackChange(index, 'damage', e.target.value)} />
                      <button className='btn border col-sm-1 col-md-1 p05 font-white bg-flag-red' type="button" onClick={() => handleRemoveAttack(index)}>✕</button>
                      </div>
                    </div>
                    <textarea className='col-sm-12 mb05 p05' placeholder="Attack Description" value={attack.description} onChange={(e) => handleAttackChange(index, 'description', e.target.value)} />
                  </div>
                ))}
                <button className='btn border' type="button" onClick={handleAddAttack}>Add Attack <i className="fa-solid fa-plus"></i></button>
              </fieldset>

              {/* Text & Lore */}
              <fieldset style={{ padding: '1rem', border: '1px solid #ddd', borderRadius: '4px' }}>
                <legend><strong>Text & Lore</strong></legend>
                <div className='row'>
                  <textarea className='col-sm-12 p05' placeholder="Pokedex Entry" value={cardData.dex_entry} onChange={(e) => setCardData({ ...cardData, dex_entry: e.target.value })} />
                  <input className='col-sm-12 p05' type="text" placeholder="Copyright Text" value={cardData.copyright_text} onChange={(e) => setCardData({ ...cardData, copyright_text: e.target.value })} />
                </div>
              </fieldset>

              <button className='btn bg-medium-jungle font-white p1' type="submit" disabled={loading} >
                {loading ? 'Inserting Card into Database...' : <>Save Card & Proceed to Image Upload <i className="fa-solid fa-right-long"></i></> }
              </button>
            </form>
          )}
        </div>
      )}

      {/* STEP 3: IMAGE UPLOAD */}
      {step === 3 && (
        <div>
          <button className='btn border' onClick={() => setStep(2)} style={{ marginBottom: '1rem' }}><i class="fa-solid fa-left-long"></i> Back to Card Details</button>
          <h3>Step 3: Card Image Upload</h3>
          <p>Attaching image for Card ID: <strong>{activeCardId}</strong></p>

          <form onSubmit={handleImageUpload} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <input type="file" accept="image/*" onChange={handleFileChange} />

            {imagePreview && (
              <div>
                <p><strong>Preview:</strong></p>
                <img src={imagePreview} alt="Card Preview" style={{ maxWidth: '200px', borderRadius: '8px', border: '1px solid #ccc' }} />
              </div>
            )}

            <button className='btn bg-blue-green font-white p05' type="submit" disabled={loading || !selectedFile} >
              {loading ? 'Uploading Image...' : 'Upload Image & Complete Card Entry'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}