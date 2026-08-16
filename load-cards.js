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
        console.log('API Response:', loadedCards);

        // Render card markup with data-card-id attribute and a clickable class
        container.innerHTML = `<div class="row m-auto" style="max-width: 1200px">` + loadedCards.map(card => `
        <div class="card-item p05 col-sm-6 col-lg-2 border-sage br05 m025 bg-white cursor-pointer" data-card-id="${card.id}">
            <img class="br05" src="${card.location}" width="100%">
            <div class="justify-between">
                <div>
                <h4>${card.name}</h4>
                <p>${card.set_name}</p>
                <p>${card.set_number}</p>
                <p class="font-medium-jungle bold">$${(card.price_cents != null) ? (card.price_cents / 100).toFixed(2) : "0.00 undisclosed"}</p>
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

// Function to handle opening and populating your modal
function openCardModal(card) {
    console.log('Selected Card Details:', card);

    // TODO: Plug into your modal DOM elements here
    // e.g., document.getElementById('modal-title').textContent = card.name;
    // e.g., render card.attacks array if present

    // Example: Show your modal backdrop/wrapper
    // const modal = document.getElementById('card-modal');
    // modal.classList.add('active');
}

// Event listener setup
document.addEventListener('DOMContentLoaded', () => {
    loadCards();

    // Event delegation on the parent container
    const container = document.getElementById('cards-container');

    container.addEventListener('click', (event) => {
        // Find if a card element (or any of its children) was clicked
        const cardElement = event.target.closest('.card-item');

        if (cardElement) {
            const cardId = parseInt(cardElement.dataset.cardId, 10);

            // Look up full card object from local array (includes nested attacks/abilities)
            const selectedCard = loadedCards.find(card => card.id === cardId);

            if (selectedCard) {
                openCardModal(selectedCard);
            }
        }
    });
});

// Execute the function after the page loads
document.addEventListener('DOMContentLoaded', loadCards);
