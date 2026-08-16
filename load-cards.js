//load-cards.js
async function loadCards() {
    const container = document.getElementById('cards-container'); // Change to match your wrapper ID

    try {
        const response = await fetch('http://localhost:3000/cards');

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const responseData = await response.json();
        const cards = responseData.data;
        console.log('API Response:', cards); // Check what this prints in F12 Console

        // Map each card object to the template string and inject into the DOM
        container.innerHTML = `<div class="row m-auto" style="max-width: 1200px">` + cards.map(card => `
        <div class="p05 col-sm-6 col-lg-2 border-sage br05 m025 bg-white">
            <img class="br05" src="${card.location}" width="100%">
            <div class="justify-between">
                <div>
                <h4>${card.name}</h4>
                <p>${card.set_name}</p>
                <p>${card.set_number}</p>
                <p class="font-medium-jungle bold">$${(card.price_cents != null) ? Math.round((card.price_cents / 100) * 100) / 100 : "0.00 undisclosed"}</p>
                </div>
            </div>
        </div>
        `).join('') + `
        <div class="p05 col-sm-6 col-lg-2 border-sage br05 m025 bg-white">
        <div class="center height80">
            <i class="fa-solid fa-plus center-v"></i>
        </div>
        <h4 class="center">Create a new card?</h4>
        </div>`;

    } catch (error) {
        console.error('Failed to fetch cards:', error);
    }
}

// Execute the function after the page loads
document.addEventListener('DOMContentLoaded', loadCards);
