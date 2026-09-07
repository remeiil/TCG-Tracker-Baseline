import React from 'react';
import CardPriceHistory from './CardPriceHistory';
import CardPriceDisplay from './CardPriceDisplay';
import { useAuth } from './AuthContext';

export default function CardDetailModal({
  selectedCard,
  onClose,
  onOpenAddToCollection,
  onDeleteInventoryItem,
  ownedCount = null
}) {
  const { token } = useAuth();

  if (!selectedCard) return null;

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
            src={selectedCard.location || selectedCard.image_url}
            alt={selectedCard.name}
            width="100%"
          />
          <CardPriceHistory cardId={selectedCard.id || selectedCard.card_id} cardName={selectedCard.name} />
        </div>

        {/* Right Column: Card Details */}
        <div className="col-sm-12 col-md-6 col-lg-9">
          <h2>{selectedCard.name}</h2>
          <p>Pokédex #{selectedCard.pokemon_number}</p>

          {/* Render Ownership Box if viewing from MyCards / Inventory */}
          {selectedCard.inventory_id && (
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
                    {selectedCard.acquired_at ? new Date(selectedCard.acquired_at).toLocaleDateString() : 'N/A'}
                  </p>
                  {selectedCard.notes && <p><strong>Notes:</strong> {selectedCard.notes}</p>}
                </div>
              </div>
            </div>
          )}

          <p>
            {selectedCard.subtypes}{' '}
            {selectedCard.supertype === 'Pokémon' ? selectedCard.type_1 : ''}
            {selectedCard.supertype === 'Pokémon' && selectedCard.type2 != null ? selectedCard.type2 : ''}{' '}
            {selectedCard.supertype}
          </p>
          <p>{selectedCard.set_name} ({selectedCard.era})</p>
          <p>{selectedCard.rarity} - {selectedCard.set_number}</p>
          
          <div className="row align-center justify-between mb1">
            <div>
              <CardPriceDisplay card={selectedCard} formatPrice={formatPrice} />
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

          {/* Actions Row */}
          {token && (
            <div className="row justify-between mt1">
              {onOpenAddToCollection && (
                <button
                  type="button"
                  className="btn bg-white border-sage font-medium-jungle p05 br05 cursor-pointer"
                  onClick={() => onOpenAddToCollection(selectedCard)}
                >
                  <i className="fa-solid fa-plus mr025"></i>{' '}
                  {selectedCard.inventory_id ? 'Add Another Copy' : 'Add to Collection'}
                </button>
              )}

              {selectedCard.inventory_id && onDeleteInventoryItem && (
                <button
                  type="button"
                  className="btn bg-flag-red font-white p05 br05 cursor-pointer border"
                  onClick={() => onDeleteInventoryItem(selectedCard.inventory_id)}
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