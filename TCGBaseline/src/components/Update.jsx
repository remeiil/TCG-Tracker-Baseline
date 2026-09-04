import React, { useState, useEffect } from 'react';

const API_BASE_URL = 'http://localhost:3000';

export default function Update() {
  const [step, setStep] = useState(1); // 1: Select/Create Set, 2: Check/Create Card
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // --- SET STATE ---
  const [sets, setSets] = useState([]);
  const [selectedSetId, setSelectedSetId] = useState('');
  const [isCreatingNewSet, setIsCreatingNewSet] = useState(false);
  const [newSetData, setNewSetData] = useState({
    name: '',
    era: '',
    total: '',
    complete_total: '',
    master_total: '',
    grandmaster_total: '',
    stamped_grandmaster_total: '',
    release_date: ''
  });

  // --- CARD STATE ---
  const [existingCardFound, setExistingCardFound] = useState(null);
  const [cardData, setCardData] = useState({
    name: '',
    run: '',
    foil: '',
    print_variant: '',
    stamp: '',
    rarity: '',
    supertype: 'Pokémon',
    subtypes: '',
    type_1: '',
    type_2: '',
    hp: '',
    evolves_from: '',
    pokemon_number: '',
    pokemon_category: '',
    height: '',
    weight: '',
    weakness_type: '',
    weakness_modifier: '',
    resistance_type: '',
    resistance_modifier: '',
    retreat_cost: '',
    illustrator: '',
    set_number: '',
    dex_entry: '',
    copyright_text: '',
    abilities: [],
    attacks: []
  });

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

  // --- STEP 1 HANDLERS: SET CREATION / SELECTION ---
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
      // Cast numeric strings to numbers or null before posting
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

  // --- STEP 2 HANDLERS: CARD CHECK & CREATION ---
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
        setMessage({
          type: 'info',
          text: `Card "${matchedCard.name}" already exists in this set (ID: ${matchedCard.id}).`
        });
      } else {
        setExistingCardFound(null);
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
      // Cast integers and clean array payloads
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

      setMessage({ type: 'success', text: `Card "${cardData.name}" added successfully!` });

      // Reset Card Form
      setCardData({
        name: '', run: '', foil: '', print_variant: '', stamp: '', rarity: '',
        supertype: 'Pokémon', subtypes: '', type_1: '', type_2: '', hp: '',
        evolves_from: '', pokemon_number: '', pokemon_category: '', height: '',
        weight: '', weakness_type: '', weakness_modifier: '', resistance_type: '',
        resistance_modifier: '', retreat_cost: '', illustrator: '', set_number: '',
        dex_entry: '', copyright_text: '', abilities: [], attacks: []
      });
      setExistingCardFound(null);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  // --- DYNAMIC ABILITY HANDLERS ---
  const handleAddAbility = () => {
    setCardData({
      ...cardData,
      abilities: [...cardData.abilities, { name: '', type: 'Ability', description: '' }]
    });
  };

  const handleAbilityChange = (index, field, value) => {
    const updated = [...cardData.abilities];
    updated[index][field] = value;
    setCardData({ ...cardData, abilities: updated });
  };

  const handleRemoveAbility = (index) => {
    setCardData({
      ...cardData,
      abilities: cardData.abilities.filter((_, i) => i !== index)
    });
  };

  // --- DYNAMIC ATTACK HANDLERS ---
  const handleAddAttack = () => {
    setCardData({
      ...cardData,
      attacks: [...cardData.attacks, { name: '', cost: '', converted_energy_cost: '', damage: '', description: '' }]
    });
  };

  const handleAttackChange = (index, field, value) => {
    const updated = [...cardData.attacks];
    updated[index][field] = value;
    setCardData({ ...cardData, attacks: updated });
  };

  const handleRemoveAttack = (index) => {
    setCardData({
      ...cardData,
      attacks: cardData.attacks.filter((_, i) => i !== index)
    });
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
              <input type="text" placeholder="Set Name *" value={newSetData.name} onChange={(e) => setNewSetData({ ...newSetData, name: e.target.value })} style={{ padding: '0.5rem' }} />
              <input type="text" placeholder="Era (e.g. Scarlet & Violet)" value={newSetData.era} onChange={(e) => setNewSetData({ ...newSetData, era: e.target.value })} style={{ padding: '0.5rem' }} />
              
              <input type="number" placeholder="Total Base Cards" value={newSetData.total} onChange={(e) => setNewSetData({ ...newSetData, total: e.target.value })} style={{ padding: '0.5rem' }} />
              <input type="number" placeholder="Complete Total" value={newSetData.complete_total} onChange={(e) => setNewSetData({ ...newSetData, complete_total: e.target.value })} style={{ padding: '0.5rem' }} />
              
              <input type="number" placeholder="Master Total" value={newSetData.master_total} onChange={(e) => setNewSetData({ ...newSetData, master_total: e.target.value })} style={{ padding: '0.5rem' }} />
              <input type="number" placeholder="Grandmaster Total" value={newSetData.grandmaster_total} onChange={(e) => setNewSetData({ ...newSetData, grandmaster_total: e.target.value })} style={{ padding: '0.5rem' }} />
              
              <input type="number" placeholder="Stamped Grandmaster Total" value={newSetData.stamped_grandmaster_total} onChange={(e) => setNewSetData({ ...newSetData, stamped_grandmaster_total: e.target.value })} style={{ padding: '0.5rem' }} />
              <div>
                <label style={{ fontSize: '0.8rem', display: 'block' }}>Release Date</label>
                <input type="date" value={newSetData.release_date} onChange={(e) => setNewSetData({ ...newSetData, release_date: e.target.value })} style={{ width: '100%', padding: '0.4rem' }} />
              </div>
            </div>
          )}

          <button type="submit" disabled={loading} style={{ padding: '0.5rem 1rem' }}>
            {loading ? 'Saving Set...' : 'Continue to Card Form →'}
          </button>
        </form>
      )}

      {/* STEP 2: CARD SETUP */}
      {step === 2 && (
        <div>
          <button onClick={() => setStep(1)} style={{ marginBottom: '1rem' }}>← Back to Set Selection</button>
          <h3>Step 2: Card Search & Comprehensive Creation</h3>

          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <input type="text" placeholder="Card Name to Check..." value={cardData.name} onChange={(e) => setCardData({ ...cardData, name: e.target.value })} style={{ flex: 1, padding: '0.5rem' }} />
            <button type="button" onClick={handleCheckCard} disabled={loading} style={{ padding: '0.5rem 1rem' }}>Check Database</button>
          </div>

          {existingCardFound && (
            <div style={{ padding: '1rem', border: '1px solid #17a2b8', borderRadius: '4px', marginBottom: '1rem' }}>
              <h4>Card Already Exists</h4>
              <p><strong>Name:</strong> {existingCardFound.name}</p>
              <p><strong>Set Number:</strong> {existingCardFound.set_number}</p>
              <p><strong>Rarity:</strong> {existingCardFound.rarity}</p>
            </div>
          )}

          {!existingCardFound && (
            <form onSubmit={handleCardSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              {/* General Information */}
              <fieldset style={{ padding: '1rem', border: '1px solid #ddd', borderRadius: '4px' }}>
                <legend><strong>General Information</strong></legend>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                  <input type="text" placeholder="Card Name *" value={cardData.name} onChange={(e) => setCardData({ ...cardData, name: e.target.value })} style={{ padding: '0.4rem' }} />
                  <input type="text" placeholder="Set Number (e.g. 001/198)" value={cardData.set_number} onChange={(e) => setCardData({ ...cardData, set_number: e.target.value })} style={{ padding: '0.4rem' }} />
                  <input type="text" placeholder="Supertype (e.g. Pokémon)" value={cardData.supertype} onChange={(e) => setCardData({ ...cardData, supertype: e.target.value })} style={{ padding: '0.4rem' }} />
                  <input type="text" placeholder="Subtypes (e.g. Stage 1)" value={cardData.subtypes} onChange={(e) => setCardData({ ...cardData, subtypes: e.target.value })} style={{ padding: '0.4rem' }} />
                  <input type="text" placeholder="Rarity" value={cardData.rarity} onChange={(e) => setCardData({ ...cardData, rarity: e.target.value })} style={{ padding: '0.4rem' }} />
                  <input type="text" placeholder="Illustrator" value={cardData.illustrator} onChange={(e) => setCardData({ ...cardData, illustrator: e.target.value })} style={{ padding: '0.4rem' }} />
                </div>
              </fieldset>

              {/* Printing & Variants */}
              <fieldset style={{ padding: '1rem', border: '1px solid #ddd', borderRadius: '4px' }}>
                <legend><strong>Printing & Variants</strong></legend>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.5rem' }}>
                  <input type="text" placeholder="Run" value={cardData.run} onChange={(e) => setCardData({ ...cardData, run: e.target.value })} style={{ padding: '0.4rem' }} />
                  <input type="text" placeholder="Foil" value={cardData.foil} onChange={(e) => setCardData({ ...cardData, foil: e.target.value })} style={{ padding: '0.4rem' }} />
                  <input type="text" placeholder="Print Variant" value={cardData.print_variant} onChange={(e) => setCardData({ ...cardData, print_variant: e.target.value })} style={{ padding: '0.4rem' }} />
                  <input type="text" placeholder="Stamp" value={cardData.stamp} onChange={(e) => setCardData({ ...cardData, stamp: e.target.value })} style={{ padding: '0.4rem' }} />
                </div>
              </fieldset>

              {/* Pokémon Stats */}
              <fieldset style={{ padding: '1rem', border: '1px solid #ddd', borderRadius: '4px' }}>
                <legend><strong>Pokémon Stats</strong></legend>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                  <input type="text" placeholder="Primary Type (type_1)" value={cardData.type_1} onChange={(e) => setCardData({ ...cardData, type_1: e.target.value })} style={{ padding: '0.4rem' }} />
                  <input type="text" placeholder="Secondary Type (type_2)" value={cardData.type_2} onChange={(e) => setCardData({ ...cardData, type_2: e.target.value })} style={{ padding: '0.4rem' }} />
                  <input type="number" placeholder="HP" value={cardData.hp} onChange={(e) => setCardData({ ...cardData, hp: e.target.value })} style={{ padding: '0.4rem' }} />
                  <input type="text" placeholder="Evolves From" value={cardData.evolves_from} onChange={(e) => setCardData({ ...cardData, evolves_from: e.target.value })} style={{ padding: '0.4rem' }} />
                  <input type="number" placeholder="National Dex Number" value={cardData.pokemon_number} onChange={(e) => setCardData({ ...cardData, pokemon_number: e.target.value })} style={{ padding: '0.4rem' }} />
                  <input type="text" placeholder="Category (e.g. Mouse)" value={cardData.pokemon_category} onChange={(e) => setCardData({ ...cardData, pokemon_category: e.target.value })} style={{ padding: '0.4rem' }} />
                  <input type="text" placeholder="Height" value={cardData.height} onChange={(e) => setCardData({ ...cardData, height: e.target.value })} style={{ padding: '0.4rem' }} />
                  <input type="text" placeholder="Weight" value={cardData.weight} onChange={(e) => setCardData({ ...cardData, weight: e.target.value })} style={{ padding: '0.4rem' }} />
                  <input type="text" placeholder="Retreat Cost" value={cardData.retreat_cost} onChange={(e) => setCardData({ ...cardData, retreat_cost: e.target.value })} style={{ padding: '0.4rem' }} />
                </div>
              </fieldset>

              {/* Combat Modifiers */}
              <fieldset style={{ padding: '1rem', border: '1px solid #ddd', borderRadius: '4px' }}>
                <legend><strong>Combat Modifiers</strong></legend>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.5rem' }}>
                  <input type="text" placeholder="Weakness Type" value={cardData.weakness_type} onChange={(e) => setCardData({ ...cardData, weakness_type: e.target.value })} style={{ padding: '0.4rem' }} />
                  <input type="text" placeholder="Weakness Modifier (e.g. x2)" value={cardData.weakness_modifier} onChange={(e) => setCardData({ ...cardData, weakness_modifier: e.target.value })} style={{ padding: '0.4rem' }} />
                  <input type="text" placeholder="Resistance Type" value={cardData.resistance_type} onChange={(e) => setCardData({ ...cardData, resistance_type: e.target.value })} style={{ padding: '0.4rem' }} />
                  <input type="text" placeholder="Resistance Modifier (e.g. -30)" value={cardData.resistance_modifier} onChange={(e) => setCardData({ ...cardData, resistance_modifier: e.target.value })} style={{ padding: '0.4rem' }} />
                </div>
              </fieldset>

              {/* Dynamic Abilities Section */}
              <fieldset style={{ padding: '1rem', border: '1px solid #ddd', borderRadius: '4px' }}>
                <legend><strong>Abilities</strong></legend>
                {cardData.abilities.map((ability, index) => (
                  <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '0.75rem', padding: '0.5rem', backgroundColor: '#f9f9f9', borderRadius: '4px' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input type="text" placeholder="Ability Name" value={ability.name} onChange={(e) => handleAbilityChange(index, 'name', e.target.value)} style={{ flex: 1, padding: '0.3rem' }} />
                      <input type="text" placeholder="Ability Type (default: Ability)" value={ability.type} onChange={(e) => handleAbilityChange(index, 'type', e.target.value)} style={{ flex: 1, padding: '0.3rem' }} />
                      <button type="button" onClick={() => handleRemoveAbility(index)} style={{ color: 'red' }}>✕</button>
                    </div>
                    <textarea placeholder="Ability Description" value={ability.description} onChange={(e) => handleAbilityChange(index, 'description', e.target.value)} style={{ padding: '0.3rem', height: '50px' }} />
                  </div>
                ))}
                <button type="button" onClick={handleAddAbility}>+ Add Ability</button>
              </fieldset>

              {/* Dynamic Attacks Section */}
              <fieldset style={{ padding: '1rem', border: '1px solid #ddd', borderRadius: '4px' }}>
                <legend><strong>Attacks</strong></legend>
                {cardData.attacks.map((attack, index) => (
                  <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '0.75rem', padding: '0.5rem', backgroundColor: '#f9f9f9', borderRadius: '4px' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input type="text" placeholder="Attack Name" value={attack.name} onChange={(e) => handleAttackChange(index, 'name', e.target.value)} style={{ flex: 2, padding: '0.3rem' }} />
                      <input type="text" placeholder="Cost (e.g. Fire, Colorless)" value={attack.cost} onChange={(e) => handleAttackChange(index, 'cost', e.target.value)} style={{ flex: 2, padding: '0.3rem' }} />
                      <input type="number" placeholder="Energy Count" value={attack.converted_energy_cost} onChange={(e) => handleAttackChange(index, 'converted_energy_cost', e.target.value)} style={{ flex: 1, padding: '0.3rem' }} />
                      <input type="text" placeholder="Damage" value={attack.damage} onChange={(e) => handleAttackChange(index, 'damage', e.target.value)} style={{ flex: 1, padding: '0.3rem' }} />
                      <button type="button" onClick={() => handleRemoveAttack(index)} style={{ color: 'red' }}>✕</button>
                    </div>
                    <textarea placeholder="Attack Description" value={attack.description} onChange={(e) => handleAttackChange(index, 'description', e.target.value)} style={{ padding: '0.3rem', height: '50px' }} />
                  </div>
                ))}
                <button type="button" onClick={handleAddAttack}>+ Add Attack</button>
              </fieldset>

              {/* Miscellaneous Info */}
              <fieldset style={{ padding: '1rem', border: '1px solid #ddd', borderRadius: '4px' }}>
                <legend><strong>Text & Lore</strong></legend>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <textarea placeholder="Pokedex Entry" value={cardData.dex_entry} onChange={(e) => setCardData({ ...cardData, dex_entry: e.target.value })} style={{ padding: '0.4rem', height: '60px' }} />
                  <input type="text" placeholder="Copyright Text" value={cardData.copyright_text} onChange={(e) => setCardData({ ...cardData, copyright_text: e.target.value })} style={{ padding: '0.4rem' }} />
                </div>
              </fieldset>

              <button type="submit" disabled={loading} style={{ padding: '0.75rem', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '1rem', cursor: 'pointer' }}>
                {loading ? 'Inserting Card into Database...' : 'Save Complete Card Record'}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}