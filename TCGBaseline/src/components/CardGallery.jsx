import React, { useState, useEffect } from 'react';

export default function CardGallery() {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCard, setSelectedCard] = useState(null);

  useEffect(() => {
    async function fetchCards() {
      try {
        const response = await fetch('http://localhost:3000/cards');
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
  }, []);

  const formatPrice = (priceCents, suffix = '') => {
    if (priceCents == null) return `0.00 ${suffix}`.trim();
    return `${(priceCents / 100).toFixed(2)} ${suffix}`.trim();
  };

  if (loading) return <div>Loading cards...</div>;
  if (error) return <div>Error loading cards: {error}</div>;

  return (
    <div id="cards-container">
      <div className="row m-auto" style={{ maxWidth: '1200px' }}>
        {/* Card Grid */}
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
                <p className="bold">${formatPrice(card.price_cents)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Single Modal Instance rendered conditionally */}
      {selectedCard && (
        <div
          className="modal-overlay bg-charcoal-transparent"
          onClick={() => setSelectedCard(null)}
        >
          <div
            className="bg-white modal p1 m1 br05 row"
            style={{ width: '1200px' }}
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside content
          >
            <div className="col-sm-12 col-md-6 col-lg-3">
              <img className="br05" src={selectedCard.location} alt={selectedCard.name} width="100%" />
            </div>
            <div className="col-sm-12 col-md-6">
              <h3>{selectedCard.name}</h3>
              <p>
                {selectedCard.subtypes}{' '}
                {selectedCard.supertype === 'Pokémon' ? selectedCard.type_1 : ''}
                {selectedCard.supertype === 'Pokémon' && selectedCard.type2 != null
                  ? selectedCard.type2
                  : ''}{' '}
                {selectedCard.supertype}
              </p>
              <p>
                {selectedCard.set_name} ({selectedCard.era})
              </p>
              <p>
                {selectedCard.rarity} - {selectedCard.set_number}
              </p>
              <p className="font-medium-jungle bold">
                ${formatPrice(selectedCard.price_cents, 'NZD')}
              </p>
              <p className="font-sage" style={{ fontStyle: 'italic' }}>
                {selectedCard.recorded_at != null
                  ? `Last tracked: ${selectedCard.recorded_at}`
                  : 'Not currently being tracked'}
              </p>

              <h4>Card Particulars</h4>
              <p>Pokémon Pokédex Number: {selectedCard.pokemon_number}</p>
              <p>Card run: {selectedCard.run}</p>
              <p>Print type: {selectedCard.foil}</p>
              {selectedCard.print_variant != null && (
                <p>Print variation: {selectedCard.print_variant}</p>
              )}
              {selectedCard.stamp != null && <p>Stamped: {selectedCard.stamp}</p>}
              <p>HP: {selectedCard.hp}</p>
              <p>Evolves from: {selectedCard.evolves_from}</p>
              {selectedCard.pokemon_category != null && (
                <p>Pokédex Category: {selectedCard.pokemon_category} Pokémon</p>
              )}
              {selectedCard.height != null && <p>Height: {selectedCard.height}</p>}
              {selectedCard.weight != null && <p>Weight: {selectedCard.weight}</p>}

              {/* Abilities */}
              {selectedCard.abilities?.length > 0 && (
                <p>
                  <strong>
                    {selectedCard.abilities[0].type}: {selectedCard.abilities[0].name}
                  </strong>{' '}
                  {selectedCard.abilities[0].description}
                </p>
              )}

              {/* Attack 1 */}
              {selectedCard.attacks?.length > 0 && (
                <>
                  <p>
                    <strong>{selectedCard.attacks[0].name}</strong>{' '}
                    {selectedCard.attacks[0].description || ''}{' '}
                    <strong>{selectedCard.attacks[0].damage}</strong>
                  </p>
                  <p>Cost: {selectedCard.attacks[0].cost}</p>
                </>
              )}

              {/* Attack 2 */}
              {selectedCard.attacks?.length > 1 && (
                <>
                  <p>
                    <strong>{selectedCard.attacks[1].name}</strong>{' '}
                    {selectedCard.attacks[1].description || ''}{' '}
                    <strong>{selectedCard.attacks[1].damage}</strong>
                  </p>
                  <p>Cost: {selectedCard.attacks[1].cost}</p>
                </>
              )}

              {/* Weakness & Resistance */}
              {selectedCard.weakness_type != null && (
                <p>
                  Weakness:{' '}
                  <span className={`type-icon ${selectedCard.weakness_type} sm`}></span>{' '}
                  {selectedCard.weakness_modifier}
                </p>
              )}
              {selectedCard.resistance_type != null && (
                <p>
                  Resistance:{' '}
                  <span className={`type-icon ${selectedCard.resistance_type} sm`}></span>{' '}
                  {selectedCard.resistance_modifier}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}