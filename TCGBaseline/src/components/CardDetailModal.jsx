import React, { useState, useEffect } from 'react';
import CardPriceHistory from './CardPriceHistory';
import CardPriceDisplay from './CardPriceDisplay';
import { useAuth } from './AuthContext';

const API_BASE_URL = `https://tcg-server.remeil.co.nz`;

export default function CardDetailModal({
  selectedCard,
  onClose,
  onOpenAddToCollection,
  onDeleteInventoryItem,
  ownedCount = null
}) {
  const { token } = useAuth();
  const [fullCardDetails, setFullCardDetails] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedCard) {
      setFullCardDetails(null);
      return;
    }

    const cardId = selectedCard.card_id || selectedCard.id;

    async function fetchFullDetails() {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/cards/${cardId}`);
        const json = await res.json();
        if (json.success && json.data) {
          setFullCardDetails(json.data);
        }
      } catch (err) {
        console.error('Failed to fetch full card details in modal:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchFullDetails();
  }, [selectedCard]);

  if (!selectedCard) return null;

  // Merge full endpoint data with preview data & inventory properties
  const card = {
    ...selectedCard,
    ...(fullCardDetails || {})
  };

  const formatPrice = (priceCents, suffix = '') => {
    if (priceCents == null) return `0.00 ${suffix}`.trim();
    return `${(priceCents / 100).toFixed(2)} ${suffix}`.trim();
  };

  return (
    <div className="modal-overlay bg-charcoal-transparent" onClick={onClose}>
      <div
        className="bg-white modal p1 m1 br05 row"
        style={{ width: '1200px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="modal-close-btn bg-amber-flame"
          onClick={onClose}
          aria-label="Close modal"
        >
          ✕
        </button>

        {/* Left Column: Image & Price Chart */}
        <div className="col-sm-12 col-md-6 col-lg-3">
          <img
            className="br05"
            src={card.location || card.image_url}
            alt={card.name}
            width="100%"
          />
          <CardPriceHistory cardId={card.id || card.card_id} cardName={card.name} />
        </div>

        {/* Right Column: Card Details */}
        <div className="col-sm-12 col-md-6 col-lg-9">
          {loading && (
            <div className="p05 font-sage italic" style={{ fontSize: '0.85rem' }}>
              Loading complete card details...
            </div>
          )}

          <h2>{card.name}</h2>
          <p>Pokédex #{card.pokemon_number}</p>

          {/* Render Ownership Box if viewing from MyCards / Inventory */}
          {card.inventory_id && (
            <div className="border-sage br05 p1 bg-cream mb1">
              <h4>My Ownership Details</h4>
              <div className="row">
                <div className="col-sm-6">
                  <p><strong>Quantity Owned:</strong> {card.quantity}</p>
                  <p><strong>Condition:</strong> {card.condition}</p>
                  <p>
                    <strong>Paid Price:</strong>{' '}
                    {card.purchase_price_cents != null
                      ? `$${formatPrice(card.purchase_price_cents)}`
                      : 'Not recorded'}
                  </p>
                </div>
                <div className="col-sm-6">
                  <p>
                    <strong>Container:</strong>{' '}
                    {card.container_name || 'Unassigned'}
                  </p>
                  <p>
                    <strong>Acquired:</strong>{' '}
                    {card.acquired_at ? new Date(card.acquired_at).toLocaleDateString() : 'N/A'}
                  </p>
                  {card.notes && <p><strong>Notes:</strong> {card.notes}</p>}
                </div>
              </div>
            </div>
          )}

          <p>
            {card.subtypes}{' '}
            {card.supertype === 'Pokémon' ? card.type_1 : ''}
            {card.supertype === 'Pokémon' && card.type2 != null ? card.type2 : ''}{' '}
            {card.supertype}
          </p>
          <p>{card.set_name} {card.era ? `(${card.era})` : ''}</p>
          <p>{card.rarity} - {card.set_number}</p>
          
          <div className="row align-center justify-between mb1">
            <div>
              <CardPriceDisplay card={card} formatPrice={formatPrice} />
              {token && ownedCount !== null && (
                <p className="mt05" style={{ fontSize: '0.9rem' }}>
                  <strong>In Collection:</strong>{' '}
                  <span className={`br05 p025 bold ${ownedCount > 0 ? 'bg-amber-flame font-white' : 'bg-sage font-black'}`}>
                    {ownedCount} {ownedCount === 1 ? 'copy' : 'copies'} owned
                  </span>
                </p>
              )}
            </div>
          </div>

          <h3 className="mt1">Card Particulars</h3>
          <p><strong>Card run:</strong> {card.run}</p>
          <p><strong>Print type:</strong> {card.foil}</p>
          {card.print_variant != null && <p><strong>Print variation:</strong> {card.print_variant}</p>}
          {card.stamp != null && <p><strong>Stamped:</strong> {card.stamp}</p>}
          <p><strong>HP:</strong> {card.hp}</p>
          <p><strong>Evolves from:</strong> {card.evolves_from}</p>
          {card.pokemon_category != null && <p><strong>Pokédex Category:</strong> {card.pokemon_category} Pokémon</p>}
          {card.height != null && <p><strong>Height:</strong> {card.height}</p>}
          {card.weight != null && <p><strong>Weight:</strong> {card.weight}</p>}

          {/* Abilities */}
          {card.abilities?.length > 0 && (
            <>
              {card.abilities.map((ability, idx) => (
                <p key={idx}>
                  <strong>{ability.type || 'Ability'}: {ability.name}</strong>{' '}
                  {ability.description || ability.text}
                </p>
              ))}
              <hr className="m05" />
            </>
          )}

          {/* Attacks */}
          {card.attacks?.map((attack, idx) => (
            <React.Fragment key={idx}>
              <div className="row">
                <div className="col-sm-2">
                  {attack.cost ? (
                    (Array.isArray(attack.cost) ? attack.cost.join(',') : attack.cost)
                      .split(',')
                      .map((type, i) => (
                        <span key={i} className={`type-icon ${type.trim().toLowerCase()} sm`}></span>
                      ))
                  ) : (
                    <span className="font-sage" style={{ fontStyle: 'italic' }}>Free</span>
                  )}
                </div>
                <div className="col-sm-3"><strong>{attack.name}</strong></div>
                <div className="col-sm-5">{attack.description || attack.text || ''}</div>
                <div className="col-sm-2"><strong>{attack.damage}</strong></div>
              </div>
              <hr className="m05" />
            </React.Fragment>
          ))}

          {/* Weakness, Resistance, Retreat */}
          {card.weakness_type != null && (
            <p>
              <strong>Weakness:</strong>{' '}
              <span className={`type-icon ${card.weakness_type.toLowerCase()} sm`}></span>{' '}
              {card.weakness_modifier}
            </p>
          )}
          {card.resistance_type != null && (
            <p>
              <strong>Resistance:</strong>{' '}
              <span className={`type-icon ${card.resistance_type.toLowerCase()} sm`}></span>{' '}
              {card.resistance_modifier}
            </p>
          )}
          
          <p>
            <strong>Retreat Cost:</strong>{' '}
            {Array.from({ length: card.retreat_cost || 0 }).map((_, index) => (
              <span key={index} className="type-icon colorless sm"></span>
            ))}
          </p>
          <p><strong>Pokédex entry text:</strong> {card.dex_entry}</p>
          <p><strong>Illustrator:</strong> {card.illustrator}</p>
          <p><strong>Copyright text:</strong> {card.copyright_text}</p>

          {/* Actions Row */}
          {token && (
            <div className="row justify-between mt1">
              {onOpenAddToCollection && (
                <button
                  type="button"
                  className="btn bg-white border-sage font-medium-jungle p05 br05 cursor-pointer"
                  onClick={() => onOpenAddToCollection(card)}
                >
                  <i className="fa-solid fa-plus mr025"></i>{' '}
                  {card.inventory_id ? 'Add Another Copy' : 'Add to Collection'}
                </button>
              )}

              {card.inventory_id && onDeleteInventoryItem && (
                <button
                  type="button"
                  className="btn bg-flag-red font-white p05 br05 cursor-pointer border"
                  onClick={() => onDeleteInventoryItem(card.inventory_id)}
                >
                  <i className="fa-solid fa-trash mr025"></i> Remove Entry
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}