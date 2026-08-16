--baseline-card-db-schema.sql for tcgbaseline.db
-- pokemon card
CREATE TABLE pokemon_card (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    run TEXT,
    foil TEXT,
    print_variant TEXT,
    stamp TEXT,
    rarity TEXT,
    supertype TEXT, -- e.g., 'Pokémon', 'Trainer', 'Energy'
    subtypes TEXT, -- e.g., 'Basic', 'Stage 1', 'Item', 'Supporter'
    type_1 TEXT,
    type_2 TEXT,
    hp INTEGER,
    evolves_from TEXT,
    pokemon_number INTEGER,
    pokemon_category TEXT,
    height TEXT,
    weight TEXT,
    weakness_type TEXT,
    weakness_modifier TEXT, -- e.g., 'x2', '+20'
    resistance_type TEXT,
    resistance_modifier TEXT,
    retreat_cost INTEGER,
    illustrator TEXT,
    set_id INTEGER NOT NULL,
    set_number TEXT,
    dex_entry TEXT,
    copyright_text TEXT,
    FOREIGN KEY (set_id) REFERENCES pokemon_set(id) ON DELETE CASCADE
);
-- Separate table for Card Abilities (1-to-Many)
CREATE TABLE card_ability (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    card_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    type TEXT, -- e.g., 'Ability', 'Poké-Power', 'Poké-Body'
    description TEXT,
    FOREIGN KEY (card_id) REFERENCES pokemon_card(id) ON DELETE CASCADE
);
-- Separate table for Card Attacks (1-to-Many)
CREATE TABLE card_attack (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    card_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    cost TEXT, -- e.g., 'Fire,Colorless'
    converted_energy_cost INTEGER,
    damage TEXT, -- e.g., '30+', '50'
    description TEXT,
    FOREIGN KEY (card_id) REFERENCES pokemon_card(id) ON DELETE CASCADE
);
-- Card images
CREATE TABLE card_image (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    card_id INTEGER NOT NULL,
    location TEXT NOT NULL,
    FOREIGN KEY (card_id) REFERENCES pokemon_card(id) ON DELETE CASCADE
);


-- pokemon set
CREATE TABLE pokemon_set (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    era TEXT,
    total INTEGER, -- this is the total advertised on the cards
    complete_total INTEGER, -- this is the total + any secret rare cards, they will have a number above the set total eg 207/165
    master_total INTEGER, -- this is the complete_total + reverse holos
    grandmaster_total INTEGER, -- master + promos (typically ETBs) + cosmo holos (blister packs)
    stamped_grandmaster_total INTEGER, -- grandmaster total + all stamped variations (eg. e3, pokemon centre, prize packs, tournament)
    release_date DATE
);
-- users
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    external_auth_id TEXT UNIQUE,
    username TEXT NOT NULL,
    name TEXT NOT NULL,
    created DATETIME DEFAULT CURRENT_TIMESTAMP
);
-- users cards
CREATE TABLE users_cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    card_id INTEGER NOT NULL,
    quantity_owned INTEGER DEFAULT 0,
    purchased_price INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (card_id) REFERENCES pokemon_card(id)
);


-- 1. OVERALL INVENTORY / WAREHOUSE
-- Represents every individual card batch a user logs into their overall collection
CREATE TABLE user_card_inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    card_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    condition TEXT DEFAULT 'Near Mint', -- e.g., 'NM', 'LP', 'MP', 'HP', 'Graded'
    purchase_price_cents INTEGER,       -- What the user paid
    market_price_at_addition_cents INTEGER, -- Market price snapshot when added
    acquired_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (card_id) REFERENCES pokemon_card(id) ON DELETE CASCADE
);

-- 2. BOXES / SUBSETS (The Container metadata)
-- Users can create named containers (e.g., "Charizard Collection", "Box A", "Main Deck")
CREATE TABLE user_collection_container (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,                -- e.g., "Binder 1", "Shoebox A", "Trade Binder"
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. CONTAINER ITEMS (Assigning Cards to Boxes)
-- Junction table mapping inventory items to specific containers
CREATE TABLE container_inventory_item (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    container_id INTEGER NOT NULL,
    inventory_id INTEGER NOT NULL,
    quantity_in_container INTEGER NOT NULL DEFAULT 1 CHECK (quantity_in_container > 0),
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (container_id) REFERENCES user_collection_container(id) ON DELETE CASCADE,
    FOREIGN KEY (inventory_id) REFERENCES user_card_inventory(id) ON DELETE CASCADE,

    -- Prevents assigning the same inventory record to the same box twice
    UNIQUE (container_id, inventory_id)
);

-- 4. SEPARATE MARKET PRICE HISTORICAL LOG (Optional but highly recommended)
-- Allows tracking card values independently of user actions
CREATE TABLE card_market_price (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    card_id INTEGER NOT NULL,
    price_cents INTEGER NOT NULL,
    source TEXT DEFAULT 'User entered',   -- e.g., 'TCGPlayer', 'Ebay', 'PriceCharting'
    recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (card_id) REFERENCES pokemon_card(id) ON DELETE CASCADE
);
