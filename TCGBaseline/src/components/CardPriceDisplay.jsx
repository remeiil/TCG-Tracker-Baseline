// CardPriceDisplay.jsx
import React from 'react';

export default function CardPriceDisplay({ card, formatPrice }) {
  const { price_cents, previous_price_cents } = card;

  let trendClass = '';
  if (price_cents != null && previous_price_cents != null) {
    const diff = price_cents - previous_price_cents;
    if (diff > 0) trendClass = 'font-medium-jungle';
    if (diff < 0) trendClass = 'font-flag-red';
  }

  return (
    <p className={`${trendClass} bold`.trim()}>
      ${formatPrice(price_cents)}
    </p>
  );
}