// server.js
const express = require('express');
const db = require('./db'); // Assuming sqlite3 instance

const app = express();

const cors = require('cors');
const allowedOrigins = [
    "http://localhost:5173",
"http://localhost:3000",
"http://localhost:8000",
"http://localhost:8002",
"https://healer.remeil.co.nz",
"https://remeil.co.nz"
];
app.use(cors({
    origin: function (origin, callback) {
        // allow requests with no origin (like curl, Postman)
        if (origin) return callback(null, true); //change to !origin for production
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        } else {
            return callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true   // if you want cookies / sessions
}));

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
    if (limit > 100) limit = 100; // Cap to avoid heavy DB payload

    const offset = (page - 1) * limit;

    // 2. Build dynamic SQL WHERE clause & values array
    const conditions = [];
    const params = [];

    // Filter: Partial Name Match
    if (name) {
        conditions.push(`name LIKE ?`);
        params.push(`%${name}%`);
    }

    // Filter: Set ID
    if (set_id) {
        conditions.push(`set_id = ?`);
        params.push(set_id);
    }

    // Filter: Exact Rarity (e.g., 'Rare Holo', 'Common')
    if (rarity) {
        conditions.push(`rarity = ?`);
        params.push(rarity);
    }

    // Filter: Type (checks both type_1 and type_2)
    if (type) {
        conditions.push(`(type_1 = ? OR type_2 = ?)`);
        params.push(type, type);
    }

    // Construct the WHERE string if conditions exist
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // 3. Count total matching items (needed for accurate pagination UI)
    const countSql = `SELECT COUNT(*) AS total FROM pokemon_card pc ${whereClause}`;

    db.get(countSql, params, (err, countResult) => {
        if (err) {
            return res.status(500).json({ error: 'Database error counting cards: ' + err.message });
        }

        const totalItems = countResult.total;
        const totalPages = Math.ceil(totalItems / limit);

        // 4. Query filtered data with LIMIT & OFFSET
        const dataSql = `
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
            cab.name AS ability_name,
            cab.type AS ability_type,
            cab.description AS ability_description,
            cat.name AS atack_name,
            cat.cost AS atack_cost,
            cat.converted_energy_cost,
            cat.damage,
            cat.description AS atack_description,
            cmp.price_cents,
            cmp.recorded_at
        FROM pokemon_card pc
        LEFT JOIN card_image ci ON pc.id = ci.card_id
        LEFT JOIN pokemon_set cs ON pc.set_id = cs.id
        LEFT JOIN card_ability cab ON pc.id = cab.card_id
        LEFT JOIN card_attack cat ON pc.id = cat.card_id
        LEFT JOIN card_market_price cmp ON pc.id = cmp.card_id
        ${whereClause}
        ORDER BY pc.set_id ASC, pc.set_number ASC
        LIMIT ? OFFSET ?
        `;

        // Append pagination params to the prepared query array
        const queryParams = [...params, limit, offset];

        db.all(dataSql, queryParams, (err, rows) => {
            if (err) {
                return res.status(500).json({ error: 'Database error fetching cards: ' + err.message });
            }

            // 5. Return structured response
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
                data: rows
            });
        });
    });
});

/**
 * POST /sets
 * Creates a new set (e.g., Base Set, Scarlet & Violet)
 */
app.post('/sets', (req, res) => {
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
app.post('/cards', (req, res) => {
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
        release_date,
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
            copyright_text, release_date
        ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
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
                 illustrator || null, dex_entry || null, copyright_text || null, release_date || null
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
