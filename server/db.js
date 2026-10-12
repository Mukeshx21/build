import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, "data");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.resolve(dataDir, "landai.sqlite");
const db = new Database(dbPath);

// Enable WAL mode for high concurrency
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Initialize Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('buyer', 'seller')),
    is_verified INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS properties (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    seller_id INTEGER DEFAULT 0,
    title TEXT NOT NULL,
    location TEXT NOT NULL,
    price REAL NOT NULL,
    area REAL NOT NULL,
    type TEXT NOT NULL,
    score INTEGER DEFAULT 90,
    image TEXT NOT NULL,
    verified INTEGER DEFAULT 1,
    tags TEXT NOT NULL,
    status TEXT DEFAULT 'Active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS inquiries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    property_id INTEGER NOT NULL,
    property_title TEXT NOT NULL,
    buyer_id INTEGER,
    buyer_name TEXT NOT NULL,
    buyer_email TEXT NOT NULL,
    seller_id INTEGER DEFAULT 0,
    visit_date TEXT,
    visit_time TEXT,
    message TEXT,
    status TEXT DEFAULT 'Pending' CHECK(status IN ('Pending', 'Confirmed', 'Completed', 'Declined')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Ensure all users have full verified access
try {
  db.exec("UPDATE users SET is_verified = 1");
} catch (e) {
  // Ignored
}

// Remove any lingering legacy demo users
try {
  db.exec("DELETE FROM users WHERE email IN ('buyer@landai.demo', 'seller@landai.demo', 'testbuyer@example.com')");
  db.exec("DELETE FROM inquiries WHERE buyer_email = 'buyer@landai.demo'");
} catch (e) {
  // Ignored
}

// Seed baseline marketplace listings if properties table is completely empty
const countProps = db.prepare("SELECT count(*) as count FROM properties").get();
if (countProps.count === 0) {
  // Ensure a verified default seller exists to satisfy foreign key constraints
  let defaultSeller = db.prepare("SELECT id FROM users WHERE role = 'seller' ORDER BY id ASC LIMIT 1").get();
  if (!defaultSeller) {
    const passwordHash = bcrypt.hashSync("Seller@123", 10);
    const info = db.prepare(`
      INSERT INTO users (name, email, password_hash, role, is_verified)
      VALUES (?, ?, ?, ?, 1)
    `).run("LandAI Estates", "seller@landai.com", passwordHash, "seller");
    defaultSeller = { id: info.lastInsertRowid };
  }

  const insertProperty = db.prepare(`
    INSERT INTO properties (seller_id, title, location, price, area, type, score, image, verified, tags, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertProperty.run(
    defaultSeller.id,
    "Palm Grove Residences",
    "Whitefield, Bengaluru",
    12500000,
    2400,
    "Residential",
    96,
    "https://images.unsplash.com/photo-1505843795480-5cfb3c03f6ff?auto=format&fit=crop&w=1200&q=85",
    1,
    JSON.stringify(["East-facing", "40 ft road"]),
    "Active"
  );

  insertProperty.run(
    defaultSeller.id,
    "Verdant Acres",
    "Sarjapur Road, Bengaluru",
    8950000,
    1800,
    "Plot",
    92,
    "https://images.unsplash.com/photo-1631728884184-98ba78f39d1c?auto=format&fit=crop&w=1200&q=85",
    1,
    JSON.stringify(["Gated", "Park view"]),
    "Active"
  );

  insertProperty.run(
    defaultSeller.id,
    "Lakeview Enclave",
    "Yelahanka, Bengaluru",
    10200000,
    2100,
    "Residential",
    89,
    "https://images.unsplash.com/photo-1676828390434-6ae9782fd194?auto=format&fit=crop&w=1200&q=85",
    1,
    JSON.stringify(["Lake nearby", "Corner plot"]),
    "Active"
  );

  insertProperty.run(
    defaultSeller.id,
    "Orchard County",
    "Devanahalli, Bengaluru",
    6800000,
    1500,
    "Plot",
    86,
    "https://images.unsplash.com/photo-1523192159590-edbd468b9518?auto=format&fit=crop&w=1200&q=85",
    0,
    JSON.stringify(["Airport 15 min", "30 ft road"]),
    "Active"
  );
}

export default db;
