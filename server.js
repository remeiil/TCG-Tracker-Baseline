// server.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const db = require('./db'); // Assuming sqlite3 instance
const { verifyToken } = require('./auth');

const app = express();

const cors = require('cors');
const allowedOrigins = [
    "http://192.168.1.20",
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:8000",
    "http://localhost:8002",
    "https://healer.remeil.co.nz",
    "https://remeil.co.nz"
];
app.use(cors(
    // {
    // origin: function (origin, callback) {
    //     // allow requests with no origin (like curl, Postman)
    //     if (origin) return callback(null, true); //change to !origin for production
    //     if (allowedOrigins.includes(origin)) {
    //         return callback(null, true);
    //     } else {
    //         return callback(new Error("Not allowed by CORS"));
    //     }
    // },
    // credentials: true   // if you want cookies / sessions
    // }
));

// Parse JSON bodies (builtin to Express 4.16+)
app.use(express.json());

// Default path health check
app.get('/', (req, res) => {
    res.send('Baseline up and ready to show you your cards!');
});

// Authentication routes will go here

/**
 * GET /cards
 * Query Params:
 *   - page: page number (default: 1)
 *   - limit: items per page (default: 20, max: 100)
 */

// Supported query parameters: name, set_id, rarity, type, page, limit
app.get('/cards', (req, res) => {
    // 1. Extract and sanitize query parameters
    const { name, set_id, rarity, type } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    let limit = parseInt(req.query.limit, 10) || 20;
    if (limit > 100) limit = 100;

    const offset = (page - 1) * limit;

    // Build dynamic SQL WHERE clause (prefix columns with pc. to avoid ambiguity)
    const conditions = [];
    const params = [];

    if (name) {
        conditions.push(`pc.name LIKE ?`);
        params.push(`%${name}%`);
    }
    if (set_id) {
        conditions.push(`pc.set_id = ?`);
        params.push(set_id);
    }
    if (rarity) {
        conditions.push(`pc.rarity = ?`);
        params.push(rarity);
    }
    if (type) {
        conditions.push(`(pc.type_1 = ? OR pc.type_2 = ?)`);
        params.push(type, type);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // 2. Count UNIQUE cards for accurate pagination
    const countSql = `SELECT COUNT(DISTINCT pc.id) AS total FROM pokemon_card pc ${whereClause}`;

    db.get(countSql, params, (err, countResult) => {
        if (err) {
            return res.status(500).json({ error: 'Database error counting cards: ' + err.message });
        }

        const totalItems = countResult.total;
        const totalPages = Math.ceil(totalItems / limit);

// 3. Paginate UNIQUE card IDs first, then JOIN child tables
        const dataSql = `
        WITH paginated_cards AS (
            SELECT pc.id
            FROM pokemon_card pc
            ${whereClause}
            ORDER BY pc.set_id ASC, pc.set_number ASC
            LIMIT ? OFFSET ?
        ),
        ranked_prices AS (
            SELECT 
                card_id,
                price_cents,
                recorded_at,
                LAG(price_cents) OVER (PARTITION BY card_id ORDER BY datetime(recorded_at) ASC) AS previous_price_cents,
                ROW_NUMBER() OVER (PARTITION BY card_id ORDER BY datetime(recorded_at) DESC) AS rn
            FROM card_market_price
        )
        SELECT
        pc.*,
        ci.location,
        cs.name AS set_name,
        cs.era,
        cs.total AS set_total,
        cs.complete_total,
        cs.master_total,
        cs.grandmaster_total,
        cs.stamped_grandmaster_total,
        cs.release_date,
        cab.id AS ability_id,
        cab.name AS ability_name,
        cab.type AS ability_type,
        cab.description AS ability_description,
        cat.id AS attack_id,
        cat.name AS atack_name,
        cat.cost AS atack_cost,
        cat.converted_energy_cost,
        cat.damage,
        cat.description AS atack_description,
        cmp.price_cents,
        cmp.previous_price_cents,
        cmp.recorded_at
        FROM paginated_cards p
        JOIN pokemon_card pc ON p.id = pc.id
        LEFT JOIN card_image ci ON pc.id = ci.card_id
        LEFT JOIN pokemon_set cs ON pc.set_id = cs.id
        LEFT JOIN card_ability cab ON pc.id = cab.card_id
        LEFT JOIN card_attack cat ON pc.id = cat.card_id
        LEFT JOIN ranked_prices cmp ON pc.id = cmp.card_id AND cmp.rn = 1
        ORDER BY pc.set_id ASC, pc.set_number ASC;
        `;

        const queryParams = [...params, limit, offset];

        db.all(dataSql, queryParams, (err, rows) => {
            if (err) {
                return res.status(500).json({ error: 'Database error fetching cards: ' + err.message });
            }

            // 4. Group row duplicates into a single card object with an attacks array
            const cardsMap = new Map();

            rows.forEach(row => {
                if (!cardsMap.has(row.id)) {
                    // Extract base card fields
                    const {
                        ability_id, ability_name, ability_type, ability_description,
                        attack_id, atack_name, atack_cost, converted_energy_cost, damage, atack_description,
                        ...cardData
                    } = row;

                    cardsMap.set(row.id, {
                        ...cardData,
                        abilities: [],
                        attacks: []
                    });
                }

                const card = cardsMap.get(row.id);

                // Add attack if present and not already added
                if (row.attack_id && !card.attacks.some(a => a.id === row.attack_id)) {
                    card.attacks.push({
                        id: row.attack_id,
                        name: row.atack_name,
                        cost: row.atack_cost,
                        converted_energy_cost: row.converted_energy_cost,
                        damage: row.damage,
                        description: row.atack_description
                    });
                }

                // Add ability if present and not already added
                if (row.ability_id && !card.abilities.some(a => a.id === row.ability_id)) {
                    card.abilities.push({
                        id: row.ability_id,
                        name: row.ability_name,
                        type: row.ability_type,
                        description: row.ability_description
                    });
                }
            });

            res.json({
                success: true,
                pagination: {
                    totalItems,
                    totalPages,
                    currentPage: page,
                    pageSize: limit,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1
                },
                filtersApplied: {
                    name: name || null,
                    set_id: set_id ? parseInt(set_id, 10) : null,
                     rarity: rarity || null,
                     type: type || null
                },
                data: Array.from(cardsMap.values())
            });
        });
    });
});

/**
 * POST /sets
 * Creates a new set (e.g., Base Set, Scarlet & Violet)
 */
app.post('/sets', verifyToken, (req, res) => {
    const {
        name,
        era,
        total,
        complete_total,
        master_total,
        grandmaster_total,
        stamped_grandmaster_total,
        release_date
    } = req.body;

    // Basic Validation: Name is required
    if (!name || name.trim() === '') {
        return res.status(400).json({ error: 'Set name is required.' });
    }

    const sql = `
    INSERT INTO pokemon_set (
        name, era, total, complete_total, master_total,
        grandmaster_total, stamped_grandmaster_total, release_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
        name.trim(),
         era || null,
         total || 0,
         complete_total || 0,
         master_total || 0,
         grandmaster_total || 0,
         stamped_grandmaster_total || 0,
         release_date || null
    ];

    // Note: Do NOT use arrow function callback here if you need `this.lastID`
    db.run(sql, params, function (err) {
        if (err) {
            return res.status(500).json({ error: 'Failed to insert set: ' + err.message });
        }

        res.status(201).json({
            success: true,
            message: 'Set created successfully',
            data: {
                id: this.lastID, // ID generated by SQLite
                name,
                era,
                release_date
            }
        });
    });
});

/**
 * POST /cards
 * Inserts a Pokémon card along with its associated abilities and attacks inside a single transaction.
 */
app.post('/cards', verifyToken, (req, res) => {
    const {
        set_id,
        name,
        set_number,
        rarity,
        supertype,
        subtypes,
        type_1,
        type_2,
        hp,
        evolves_from,
        pokemon_number,
        pokemon_category,
        height,
        weight,
        run,
        foil,
        print_variant,
        stamp,
        weakness_type,
        weakness_modifier,
        resistance_type,
        resistance_modifier,
        retreat_cost,
        illustrator,
        dex_entry,
        copyright_text,
        // Arrays for relational tables
        abilities = [],
        attacks = []
    } = req.body;

    // Validation
    if (!set_id) {
        return res.status(400).json({ error: 'set_id is required.' });
    }
    if (!name || name.trim() === '') {
        return res.status(400).json({ error: 'Card name is required.' });
    }

    // Begin SQLite Transaction
    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        const cardSql = `
        INSERT INTO pokemon_card (
            set_id, name, set_number, rarity, supertype, subtypes,
            type_1, type_2, hp, evolves_from, pokemon_number,
            pokemon_category, height, weight, run, foil, print_variant,
            stamp, weakness_type, weakness_modifier, resistance_type,
            resistance_modifier, retreat_cost, illustrator, dex_entry,
            copyright_text
        ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
        `;

        const cardParams = [
            set_id, name.trim(), set_number || null, rarity || null,
                 supertype || 'Pokémon', subtypes || null, type_1 || null,
                 type_2 || null, hp || null, evolves_from || null,
                 pokemon_number || null, pokemon_category || null, height || null,
                 weight || null, run || null, foil || null, print_variant || null,
                 stamp || null, weakness_type || null, weakness_modifier|| null,
                 resistance_type || null, resistance_modifier || null, retreat_cost || null,
                 illustrator || null, dex_entry || null, copyright_text || null
        ];

        // 1. Insert Base Card
        db.run(cardSql, cardParams, function (err) {
            if (err) {
                db.run('ROLLBACK');
                if (err.message.includes('FOREIGN KEY constraint failed')) {
                    return res.status(400).json({ error: `Invalid set_id (${set_id}). Set does not exist.` });
                }
                return res.status(500).json({ error: 'Failed to insert card: ' + err.message });
            }

            const cardId = this.lastID; // Primary Key generated for the card

            // Prepared Statements for Child Inserts
            const abilityStmt = db.prepare(`
            INSERT INTO card_ability (card_id, name, type, description)
            VALUES (?, ?, ?, ?)
            `);

            const attackStmt = db.prepare(`
            INSERT INTO card_attack (card_id, name, cost, converted_energy_cost, damage, description)
            VALUES (?, ?, ?, ?, ?, ?)
            `);

            let hasError = false;

            // 2. Insert Abilities
            for (const ability of abilities) {
                if (!ability.name) continue; // Skip malformed entries
                abilityStmt.run([
                    cardId,
                    ability.name,
                    ability.type || 'Ability',
                    ability.description || null
                ], (err) => {
                    if (err) hasError = err;
                });
                    if (hasError) break;
            }

            // 3. Insert Attacks (only if abilities insertion hasn't failed)
            if (!hasError) {
                for (const attack of attacks) {
                    if (!attack.name) continue; // Skip malformed entries
                    attackStmt.run([
                        cardId,
                        attack.name,
                        attack.cost || null,
                        attack.converted_energy_cost || 0,
                        attack.damage || null,
                        attack.description || null
                    ], (err) => {
                        if (err) hasError = err;
                    });
                        if (hasError) break;
                }
            }

            // Finalize Prepared Statements
            abilityStmt.finalize();
            attackStmt.finalize();

            // 4. Evaluate Transaction Outcome
            if (hasError) {
                db.run('ROLLBACK');
                return res.status(500).json({ error: 'Failed to insert card details: ' + hasError.message });
            }

            // Commit Transaction if everything succeeded
            db.run('COMMIT', (err) => {
                if (err) {
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: 'Commit failed: ' + err.message });
                }

                res.status(201).json({
                    success: true,
                    message: 'Card, abilities, and attacks inserted successfully',
                    data: {
                        id: cardId,
                        name,
                        set_id,
                        abilities_count: abilities.length,
                        attacks_count: attacks.length
                    }
                });
            });
        });
    });
});

// PUT /sets/:id
app.put('/sets/:id', verifyToken, (req, res) => {
  const setId = req.params.id;
  const { name, era, total, complete_total, master_total, grandmaster_total, stamped_grandmaster_total, release_date } = req.body;

  const sql = `
    UPDATE pokemon_set 
    SET name = ?, era = ?, total = ?, complete_total = ?, master_total = ?, 
        grandmaster_total = ?, stamped_grandmaster_total = ?, release_date = ?
    WHERE id = ?
  `;

  db.run(sql, [name, era, total, complete_total, master_total, grandmaster_total, stamped_grandmaster_total, release_date, setId], function(err) {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, message: 'Set updated successfully' });
  });
});

// PUT /cards/:id
app.put('/cards/:id', verifyToken, (req, res) => {
  const cardId = req.params.id;
  const { name, set_id, hp, pokemon_number, rarity, illustrator, set_number, abilities, attacks } = req.body;

  const sql = `
    UPDATE pokemon_card 
    SET name = ?, set_id = ?, hp = ?, pokemon_number = ?, rarity = ?, illustrator = ?, set_number = ?
    WHERE id = ?
  `;

  db.run(sql, [name, set_id, hp, pokemon_number, rarity, illustrator, set_number, cardId], function(err) {
    if (err) return res.status(500).json({ success: false, error: err.message });

    // Replace abilities and attacks inside a transaction
    db.serialize(() => {
      db.run(`DELETE FROM card_ability WHERE card_id = ?`, [cardId]);
      db.run(`DELETE FROM card_attack WHERE card_id = ?`, [cardId]);

      if (abilities?.length) {
        const abStmt = db.prepare(`INSERT INTO card_ability (card_id, name, type, description) VALUES (?, ?, ?, ?)`);
        abilities.forEach(a => abStmt.run(cardId, a.name, a.type, a.description));
        abStmt.finalize();
      }

      if (attacks?.length) {
        const atkStmt = db.prepare(`INSERT INTO card_attack (card_id, name, cost, converted_energy_cost, damage, description) VALUES (?, ?, ?, ?, ?, ?)`);
        attacks.forEach(a => atkStmt.run(cardId, a.name, a.cost, a.converted_energy_cost, a.damage, a.description));
        atkStmt.finalize();
      }

      res.json({ success: true, message: 'Card updated successfully' });
    });
  });
});

app.get('/sets', (req, res) => {
    const sql = `
        SELECT 
            id,
            name,
            era,
            total,
            complete_total,
            master_total,
            grandmaster_total,
            stamped_grandmaster_total,
            release_date
        FROM pokemon_set
        ORDER BY release_date DESC
    `;

    db.all(sql, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to fetch sets: ' + err.message });
        }

        res.status(200).json({
            success: true,
            count: rows.length,
            data: rows
        });
    });
});

// Serve uploaded images static folder
app.use('/uploads', express.static('uploads'));

// Configure Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './TCGBaseline/public/img'); // Ensure this folder exists on your root server dir
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `card-${req.body.card_id || 'img'}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({ storage });

/**
 * POST /cards/image
 * Body: Multipart FormData containing 'card_id' and 'image' file
 */
app.post('/cards/image', verifyToken, upload.single('image'), (req, res) => {
  const { card_id } = req.body;
  if (!req.file || !card_id) {
    return res.status(400).json({ success: false, error: 'Card ID and image file are required.' });
  }

  // Construct saved file path
  const imageLocation = `/uploads/${req.file.filename}`;

  // Check if image already exists for this card
  db.get(`SELECT id FROM card_image WHERE card_id = ?`, [card_id], (err, row) => {
    if (err) return res.status(500).json({ success: false, error: err.message });

    if (row) {
      // Overwrite/Update existing image path
      const updateSql = `UPDATE card_image SET location = ? WHERE card_id = ?`;
      db.run(updateSql, [imageLocation, card_id], function(updateErr) {
        if (updateErr) return res.status(500).json({ success: false, error: updateErr.message });
        res.json({ success: true, location: imageLocation, message: 'Card image updated successfully!' });
      });
    } else {
      // Insert new image record
      const insertSql = `INSERT INTO card_image (card_id, location) VALUES (?, ?)`;
      db.run(insertSql, [card_id, imageLocation], function(insertErr) {
        if (insertErr) return res.status(500).json({ success: false, error: insertErr.message });
        res.json({ success: true, location: imageLocation, message: 'Card image uploaded successfully!' });
      });
    }
  });
});

/* POST /cards/market */
app.post('/cards/market', (req, res) => {
  const { card_id, price_cents, source } = req.body;

  // Validation
  if (!card_id || price_cents == null) {
    return res.status(400).json({ 
      error: 'card_id and price_cents are required.' 
    });
  }

  const parsedCardId = parseInt(card_id, 10);
  const parsedPriceCents = parseInt(price_cents, 10);
  const priceSource = source ? source.trim() : 'Manual Entry';

  if (isNaN(parsedCardId) || isNaN(parsedPriceCents)) {
    return res.status(400).json({ 
      error: 'card_id and price_cents must be valid integers.' 
    });
  }

  const sql = `
    INSERT INTO card_market_price (card_id, price_cents, source, recorded_at) 
    VALUES (?, ?, ?, datetime('now'))
  `;

  db.run(sql, [parsedCardId, parsedPriceCents, priceSource], function (err) {
    if (err) {
      return res.status(500).json({ error: 'Database insertion error: ' + err.message });
    }

    res.json({
      success: true,
      data: {
        id: this.lastID,
        card_id: parsedCardId,
        price_cents: parsedPriceCents,
        source: priceSource,
        recorded_at: new Date().toISOString()
      }
    });
  });
});

// GET /cards/:id
app.get('/cards/:id', (req, res) => {
  const cardId = req.params.id;

  const sql = `
    SELECT 
      pc.*,
      cs.name AS set_name,
      cs.era,
      ci.location,
      COALESCE(
        (SELECT price_cents FROM card_market_price WHERE card_id = pc.id ORDER BY recorded_at DESC LIMIT 1),
        0
      ) AS price_cents
    FROM pokemon_card pc
    LEFT JOIN pokemon_set cs ON pc.set_id = cs.id
    LEFT JOIN card_image ci ON pc.id = ci.card_id
    WHERE pc.id = ?
  `;

  db.get(sql, [cardId], (err, cardRow) => {
    if (err) {
      console.error('Error fetching single card:', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }

    if (!cardRow) {
      return res.status(404).json({ success: false, error: 'Card not found' });
    }

    // Fetch associated abilities and attacks
    db.all(`SELECT * FROM card_ability WHERE card_id = ?`, [cardId], (err, abilities) => {
      db.all(`SELECT * FROM card_attack WHERE card_id = ?`, [cardId], (err, attacks) => {
        res.json({
          success: true,
          data: {
            ...cardRow,
            abilities: abilities || [],
            attacks: attacks || []
          }
        });
      });
    });
  });
});

/* GET /cards/:card_id/history */
app.get('/cards/:card_id/history', (req, res) => {
  const { card_id } = req.params;

  const parsedCardId = parseInt(card_id, 10);
  if (isNaN(parsedCardId)) {
    return res.status(400).json({ error: 'Invalid card ID' });
  }

  const sql = `
    SELECT 
      id, 
      price_cents, 
      source, 
      recorded_at 
    FROM card_market_price 
    WHERE card_id = ? 
    ORDER BY datetime(recorded_at) ASC
  `;

  db.all(sql, [parsedCardId], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database query error: ' + err.message });
    }

    // Format fields for frontend usability
    const formattedData = rows.map((row) => ({
      id: row.id,
      price: (row.price_cents / 100).toFixed(2),
      priceNumeric: row.price_cents / 100,
      source: row.source,
      date: new Date(row.recorded_at).toLocaleDateString(),
      recorded_at: row.recorded_at
    }));

    res.json({
      success: true,
      card_id: parsedCardId,
      data: formattedData
    });
  });
});

// ==========================================
// 1. INVENTORY ENDPOINTS
// ==========================================

// Add a card to user's inventory
// POST /inventory
app.post('/inventory', verifyToken, (req, res) => {
  const userId = req.user.id;
  const { card_id, quantity, condition, purchase_price_cents, notes } = req.body;

  if (!card_id) {
    return res.status(400).json({ error: 'card_id is required' });
  }

  // Ensure card_market_price table exists before querying, or fallback safely
  const priceSql = `SELECT price_cents FROM card_market_price WHERE card_id = ? ORDER BY recorded_at DESC LIMIT 1`;

  db.get(priceSql, [card_id], (err, row) => {
    // If market price query fails (e.g. table missing), log warning and proceed with null
    if (err) console.warn('Market price snapshot warning:', err.message);
    const marketPrice = row ? row.price_cents : null;

    const sql = `
      INSERT INTO user_card_inventory 
        (user_id, card_id, quantity, condition, purchase_price_cents, market_price_at_addition_cents, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      userId, 
      card_id, 
      quantity || 1, 
      condition || 'Near Mint', 
      purchase_price_cents || null, 
      marketPrice, 
      notes || null
    ];

    db.run(sql, params, function(insertErr) {
      if (insertErr) {
        console.error('SQL Error in POST /inventory:', insertErr.message);
        return res.status(500).json({ success: false, error: insertErr.message });
      }
      res.json({ success: true, inventory_id: this.lastID });
    });
  });
});

// Fetch user's full inventory with card details
app.get('/inventory', verifyToken, (req, res) => {
  const userId = req.user.id;
  const nameQuery = req.query.name ? `%${req.query.name}%` : null;

  let sql = `
    SELECT 
      uci.id AS inventory_id,
      uci.quantity,
      uci.condition,
      uci.purchase_price_cents,
      uci.market_price_at_addition_cents,
      uci.acquired_at,
      uci.notes,
      pc.*,
      COALESCE(
        (SELECT price_cents FROM card_market_price WHERE card_id = pc.id ORDER BY recorded_at DESC LIMIT 1),
        0
      ) AS price_cents,
      ci.location,
      cs.name AS set_name,
      cs.era,
      ucc.name AS container_name
    FROM user_card_inventory uci
    JOIN pokemon_card pc ON uci.card_id = pc.id
    LEFT JOIN pokemon_set cs ON pc.set_id = cs.id
    LEFT JOIN card_image ci ON pc.id = ci.card_id
    LEFT JOIN container_inventory_item cii ON uci.id = cii.inventory_id
    LEFT JOIN user_collection_container ucc ON cii.container_id = ucc.id
    WHERE uci.user_id = ?
  `;

  const params = [userId];

  if (nameQuery) {
    sql += ` AND pc.name LIKE ?`;
    params.push(nameQuery);
  }

  sql += ` ORDER BY uci.acquired_at DESC`;

  db.all(sql, params, (err, rows) => {
    if (err) {
      console.error('SQL Error in GET /inventory:', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
    res.json({ success: true, data: rows || [] });
  });
});

// DELETE /inventory/:id
app.delete('/inventory/:id', verifyToken, (req, res) => {
  const inventoryId = req.params.id;
  const userId = req.user.id;

  // Enforce ownership: only delete if inventory_id matches AND belongs to req.user.id
  const sql = `DELETE FROM user_card_inventory WHERE id = ? AND user_id = ?`;

  db.run(sql, [inventoryId, userId], function(err) {
    if (err) {
      console.error('SQL Error in DELETE /inventory:', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }

    if (this.changes === 0) {
      return res.status(404).json({ success: false, error: 'Item not found or unauthorized' });
    }

    res.json({ success: true, message: 'Card removed from inventory' });
  });
});

// GET /cards/:cardId/owned-count
app.get('/cards/:cardId/owned-count', verifyToken, (req, res) => {
  const userId = req.user.id;
  const cardId = req.params.cardId;

  const sql = `
    SELECT COALESCE(SUM(quantity), 0) AS owned_count
    FROM user_card_inventory
    WHERE user_id = ? AND card_id = ?
  `;

  db.get(sql, [userId, cardId], (err, row) => {
    if (err) {
      console.error('SQL Error fetching owned count:', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
    res.json({ success: true, owned_count: row ? row.owned_count : 0 });
  });
});

// ==========================================
// 2. CONTAINER ENDPOINTS
// ==========================================

// Fetch containers with total item counts
// GET /containers
app.get('/containers', verifyToken, (req, res) => {
  const sql = `
    SELECT 
      ucc.*,
      COALESCE(SUM(cii.quantity_in_container), 0) AS total_cards
    FROM user_collection_container ucc
    LEFT JOIN container_inventory_item cii ON ucc.id = cii.container_id
    WHERE ucc.user_id = ?
    GROUP BY ucc.id
    ORDER BY ucc.created_at DESC
  `;

  db.all(sql, [req.user.id], (err, rows) => {
    if (err) {
      console.error('SQL Error in GET /containers:', err.message); // Logs exact issue to server terminal
      return res.status(500).json({ success: false, error: err.message });
    }
    res.json({ success: true, data: rows || [] });
  });
});

// Create container
app.post('/containers', verifyToken, (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Container name required' });

  const sql = `INSERT INTO user_collection_container (user_id, name, description) VALUES (?, ?, ?)`;
  db.run(sql, [req.user.id, name.trim(), description || null], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, data: { id: this.lastID, name, description } });
  });
});

// Add inventory item to container
app.post('/containers/:id/items', verifyToken, (req, res) => {
  const containerId = req.params.id;
  const { inventory_id, quantity } = req.body;

  const sql = `
    INSERT INTO container_inventory_item (container_id, inventory_id, quantity_in_container)
    VALUES (?, ?, ?)
    ON CONFLICT(container_id, inventory_id) DO UPDATE SET
    quantity_in_container = quantity_in_container + excluded.quantity_in_container
  `;

  db.run(sql, [containerId, inventory_id, quantity || 1], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// GET /containers/details
app.get('/containers/details', verifyToken, (req, res) => {
  const userId = req.user.id;

  const sql = `
    SELECT 
      ucc.id AS container_id,
      ucc.name AS container_name,
      ucc.description AS container_description,
      ucc.created_at AS container_created_at,
      cii.quantity_in_container,
      uci.id AS inventory_id,
      uci.condition,
      pc.id AS card_id,
      pc.name AS card_name,
      pc.set_number,
      cs.name AS set_name,
      ci.location AS image_url
    FROM user_collection_container ucc
    LEFT JOIN container_inventory_item cii ON ucc.id = cii.container_id
    LEFT JOIN user_card_inventory uci ON cii.inventory_id = uci.id
    LEFT JOIN pokemon_card pc ON uci.card_id = pc.id
    LEFT JOIN pokemon_set cs ON pc.set_id = cs.id
    LEFT JOIN card_image ci ON pc.id = ci.card_id
    WHERE ucc.user_id = ?
    ORDER BY ucc.created_at DESC, pc.name ASC
  `;

  db.all(sql, [userId], (err, rows) => {
    if (err) {
      console.error('SQL Error in GET /containers/details:', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }

    // Group items under their respective container
    const containersMap = {};

    rows.forEach((row) => {
      if (!containersMap[row.container_id]) {
        containersMap[row.container_id] = {
          id: row.container_id,
          name: row.container_name,
          description: row.container_description,
          created_at: row.container_created_at,
          total_cards: 0,
          items: []
        };
      }

      if (row.inventory_id) {
        containersMap[row.container_id].total_cards += row.quantity_in_container;
        containersMap[row.container_id].items.push({
          inventory_id: row.inventory_id,
          card_id: row.card_id,
          name: row.card_name,
          set_name: row.set_name,
          set_number: row.set_number,
          condition: row.condition,
          quantity: row.quantity_in_container,
          image_url: row.image_url
        });
      }
    });

    res.json({ success: true, data: Object.values(containersMap) });
  });
});

// DELETE /containers/:id
app.delete('/containers/:id', verifyToken, (req, res) => {
  const containerId = req.params.id;
  const userId = req.user.id;

  // Enforce ownership check
  const sql = `DELETE FROM user_collection_container WHERE id = ? AND user_id = ?`;

  db.run(sql, [containerId, userId], function(err) {
    if (err) {
      console.error('SQL Error in DELETE /containers:', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }

    if (this.changes === 0) {
      return res.status(404).json({ success: false, error: 'Container not found or unauthorized' });
    }

    res.json({ success: true, message: 'Container removed successfully' });
  });
});

// DELETE /containers/:containerId/items/:inventoryId
app.delete('/containers/:containerId/items/:inventoryId', verifyToken, (req, res) => {
  const { containerId, inventoryId } = req.params;
  const userId = req.user.id;

  // Enforce ownership: ensure container belongs to user
  const sql = `
    DELETE FROM container_inventory_item 
    WHERE container_id = ? 
      AND inventory_id = ?
      AND container_id IN (SELECT id FROM user_collection_container WHERE user_id = ?)
  `;

  db.run(sql, [containerId, inventoryId, userId], function(err) {
    if (err) {
      console.error('SQL Error removing item from container:', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }

    if (this.changes === 0) {
      return res.status(404).json({ success: false, error: 'Item assignment not found or unauthorized' });
    }

    res.json({ success: true, message: 'Card unassigned from container' });
  });
});

// Profile info from TCG and Party Auth System
// GET /api/my-profile
app.get('/api/my-profile', verifyToken, async (req, res) => {
  const userId = req.user.id;

  // 1. Fetch exact fields from TCGBaseline local users table
  const localSql = `SELECT id, external_auth_id, username, name, created FROM users WHERE id = ?`;

  db.get(localSql, [userId], async (err, localUser) => {
    if (err) {
      console.error('SQL Error in local users table:', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }

    if (!localUser) {
      return res.status(404).json({ success: false, error: 'User not found in TCGBaseline database' });
    }

    // 2. Query remote tank /me endpoint
    let remoteData = {};
    try {
      const authHeader = req.headers.authorization;
      const remoteRes = await fetch('https://tank.remeil.co.nz/me', {
        headers: {
          'Authorization': authHeader || ''
        }
      });

      if (remoteRes.ok) {
        remoteData = await remoteRes.json();
      } else {
        console.warn(`Tank auth endpoint returned status ${remoteRes.status}`);
      }
    } catch (remoteErr) {
      console.warn('Could not connect to external Tank Auth system:', remoteErr.message);
    }

    // 3. Merge strategy: Local TCGBaseline fields take priority.
    // Attach fields from remoteData that are non-duplicative/new.
    const extraRemoteData = {};

    Object.keys(remoteData).forEach((key) => {
      // Ignore keys that already exist locally or map to local equivalents
      if (!(key in localUser)) {
        extraRemoteData[key] = remoteData[key];
      }
    });

    res.json({
      success: true,
      data: {
        ...localUser,
        remote_extras: extraRemoteData
      }
    });
  });
});

// GET /inventory/summary
app.get('/inventory/summary', verifyToken, (req, res) => {
  const userId = req.user.id;

  const sql = `
    SELECT 
      COALESCE(SUM(uci.quantity), 0) AS total_cards_owned,
      COALESCE(
        SUM(
          uci.quantity * COALESCE(
            (
              SELECT price_cents 
              FROM card_market_price 
              WHERE card_id = uci.card_id 
              ORDER BY recorded_at DESC 
              LIMIT 1
            ), 
            0
          )
        ), 
        0
      ) AS total_value_cents
    FROM user_card_inventory uci
    WHERE uci.user_id = ?
  `;

  db.get(sql, [userId], (err, row) => {
    if (err) {
      console.error('SQL Error in GET /inventory/summary:', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }

    res.json({
      success: true,
      data: {
        total_cards_owned: row.total_cards_owned,
        total_value_cents: row.total_value_cents,
        total_value_formatted: (row.total_value_cents / 100).toFixed(2)
      }
    });
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
