const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'bank.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to SQLite database:', err.message);
  } else {
    console.log('Connected to SQLite database at data/bank.db');
    initDatabase();
  }
});

function initDatabase() {
  db.serialize(() => {
    // 1. Create accounts table
    db.run(`
      CREATE TABLE IF NOT EXISTS accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_number TEXT UNIQUE NOT NULL,
        holder_name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        pin TEXT DEFAULT '1234',
        balance REAL NOT NULL DEFAULT 0.0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Safe migration: Add 'pin' column to existing accounts table if missing
    db.run(`ALTER TABLE accounts ADD COLUMN pin TEXT DEFAULT '1234'`, (err) => {
      // Column may already exist, ignore error
    });

    // 3. Ensure no account has a blank or NULL pin
    db.run(`UPDATE accounts SET pin = '1234' WHERE pin IS NULL OR pin = ''`);

    // 4. Create transactions table
    db.run(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_id INTEGER NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('DEPOSIT', 'WITHDRAWAL', 'TRANSFER')),
        amount REAL NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (account_id) REFERENCES accounts (id) ON DELETE CASCADE
      )
    `);

    console.log('Database tables & PIN security initialized.');
  });
}

module.exports = db;