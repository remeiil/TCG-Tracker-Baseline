// db.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Use path.resolve to ensure correct file location regardless of execution context
const dbPath = path.resolve(__dirname, './tcgbaseline.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Failed to connect to SQLite database:', err.message);
    } else {
        console.log('Connected to SQLite database at:', dbPath);
    }
});

// Use serialize to ensure setup PRAGMAs execute sequentially first
db.serialize(() => {
    db.run('PRAGMA foreign_keys = ON;', (err) => {
        if (err) {
            console.error('Failed to enable foreign keys:', err.message);
        }
    });
});

module.exports = db;
