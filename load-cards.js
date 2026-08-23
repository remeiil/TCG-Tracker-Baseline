//load-cards.js
// Global or module-scoped cache of the current page's cards
let loadedCards = [];

async function loadCards() {
    const container = document.getElementById('cards-container');

    try {
        const response = await fetch('http://localhost:3000/cards');

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const responseData = await response.json();
        loadedCards = responseData.data; // Store array for quick lookup on click
        // console.log('API Response:', loadedCards);

        // Render card markup with data-card-id attribute and a clickable class
        container.innerHTML = `<div class="row m-auto" style="max-width: 1200px">` + loadedCards.map(card => `
        <div class="card-item p05 col-sm-6 col-lg-2 border-sage br05 m025 bg-white cursor-pointer" data-card-id="${card.id}">
            <img class="br05" src="${card.location}" width="100%">
            <div class="justify-between">
                <div  id="thumb${card.id}">
                <h4>${card.name}</h4>
                <p>${card.set_name}</p>
                <p>${card.set_number}</p>
                <p class="font-medium-jungle bold">$${card.price_cents != null ? (card.price_cents / 100).toFixed(2) : "0.00 undisclosed"}</p>
                </div>
            </div>
        </div>
        <div class="modal-overlay bg-charcoal-transparent hide" id="modal${card.id}">
            <div class="bg-white modal p1 m1 br05 row" style="width:1200px;">
                <div class="col-sm-12 col-md-6 col-lg-3">
                <img class="br05" src="${card.location}" width="100%">
                </div>
                <div class="col-sm-12 col-md-6">
                <h3>${card.name}</h3>
                <p>${card.subtypes} ${card.supertype == "Pokémon" ? card.type_1 : ""}${card.supertype == "Pokémon" && card.type2 != null ? card.type2 : ""} ${card.supertype}</p>
                <p>${card.set_name} (${card.era})</p>
                <p>${card.rarity} - ${card.set_number}</p>
                <p class="font-medium-jungle bold">$${card.price_cents != null ? (card.price_cents / 100).toFixed(2) + " NZD" : "0.00 NZD"} </p><p class="font-sage" style="font-style:italic;">${card.recorded_at != null? "Last tracked: " + card.recorded_at : "Not currently being tracked" }</p>
                <h4>Card Particulars</h4>
                <p>Pokémon Pokédex Number: ${card.pokemon_number}
                <p>Card run: ${card.run}</p>
                <p>Print type: ${card.foil}</p>
                ${card.print_variant != null ? "<p>Print variation: " + card.print_variant + "</p>": ""}
                ${card.stamp != null ? "<p>Stamped: " + card.stamp + "</p>": ""}
                <p>HP: ${card.hp}</p>
                <p>Evolves from: ${card.evolves_from}</p>
                ${card.pokemon_category != null ? "<p>Pokédex Category: " + card.pokemon_category + " Pokémon</p>": ""}
                ${card.height != null ? "<p>Height: " + card.height + "</p>": ""}
                ${card.weight != null ? "<p>Weight: " + card.weight + "</p>": ""}
                ${card.abilities.length > 0 ? "<p><strong>" + card.abilities[0].type + ": " + card.abilities[0].name + "</strong> " + card.abilities[0].description + "</p>" : ""}
                ${card.attacks.length > 0 ? "<p><strong>" + card.attacks[0].name + "</strong> " + (card.attacks[0].description != null? card.attacks[0].description : "") + " <strong>" + card.attacks[0].damage + "</strong></p><p>Cost: " + card.attacks[0].cost + "</p>" : ""}
                ${card.attacks.length > 1 ? "<p><strong>" + card.attacks[1].name + "</strong> " + (card.attacks[1].description != null? card.attacks[1].description : "") + " <strong>" + card.attacks[1].damage + "</strong></p><p>Cost: " + card.attacks[1].cost + "</p>" : ""}
                ${card.weakness_type != null ? "<p>Weakness: <span class=\"type-icon " + card.weakness_type + " sm\"></span> " + card.weakness_modifier + "</p>" : ""}
                ${card.resistance_type != null ? "<p>Resistance: <span class=\"type-icon " + card.resistance_type + " sm\"></span> " + card.resistance_modifier + "</p>" : ""}
                </div>
            </div>
        </div>
        `).join('') + `
        <div id="add-card-button" class="p05 col-sm-6 col-lg-2 border-sage br05 m025 bg-white cursor-pointer">
            <div class="center height80">
                <i class="fa-solid fa-plus center-v"></i>
            </div>
            <h4 class="center">Create a new card?</h4>
            </div></div>`;

    } catch (error) {
        console.error('Failed to fetch cards:', error);
    }
}

// Event Delegation setup
document.addEventListener('DOMContentLoaded', () => {
    loadCards();

    const container = document.getElementById('cards-container');

    container.addEventListener('click', (event) => {
        // 1. OPEN MODAL: Check if a card item was clicked
        const cardElement = event.target.closest('.card-item');
        if (cardElement) {
            const cardId = cardElement.dataset.cardId;
            const targetModal = document.getElementById(`modal${cardId}`);
            if (targetModal) {
                targetModal.classList.remove('hide');
            }
            return;
        }

        // 2. CLOSE MODAL: Check if clicking outside the modal content (on the overlay backdrop)
        if (event.target.classList.contains('modal-overlay')) {
            event.target.classList.add('hide');
        }
    });
});

// Execute the function after the page loads
document.addEventListener('DOMContentLoaded', loadCards);
