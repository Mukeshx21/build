import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, "data");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.resolve(dataDir, "landai.sqlite");
const db = new Database(dbPath);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    firebase_uid TEXT UNIQUE,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL COLLATE NOCASE,
    password_hash TEXT,
    role TEXT NOT NULL CHECK(role IN ('buyer', 'seller')),
    is_verified INTEGER DEFAULT 0,
    phone TEXT DEFAULT '',
    preferences_json TEXT DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
    verified INTEGER DEFAULT 0,
    tags TEXT NOT NULL,
    description TEXT DEFAULT '',
    status TEXT DEFAULT 'Active',
    sample_label TEXT DEFAULT '',
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

  CREATE TABLE IF NOT EXISTS saved_properties (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    property_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, property_id),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(property_id) REFERENCES properties(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    ocr_document_id TEXT UNIQUE NOT NULL,
    original_name TEXT NOT NULL,
    content_type TEXT NOT NULL,
    language TEXT NOT NULL,
    status TEXT NOT NULL,
    page_count INTEGER DEFAULT 0,
    warning TEXT DEFAULT '',
    fields_json TEXT DEFAULT '{}',
    approved_fields_json TEXT DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS validation_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    overall_status TEXT NOT NULL,
    checks_json TEXT NOT NULL,
    disclaimer TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE CASCADE,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS processing_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    document_id INTEGER,
    action TEXT NOT NULL,
    detail TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid);
  CREATE INDEX IF NOT EXISTS idx_documents_user ON documents(user_id);
  CREATE INDEX IF NOT EXISTS idx_saved_user ON saved_properties(user_id);
  CREATE INDEX IF NOT EXISTS idx_history_user ON processing_history(user_id);
`);

// Migrate older schemas safely
const userColumns = db.prepare("PRAGMA table_info(users)").all().map((c) => c.name);
if (!userColumns.includes("firebase_uid")) {
  try {
    db.exec("ALTER TABLE users ADD COLUMN firebase_uid TEXT");
  } catch {
    /* ignore */
  }
}
if (!userColumns.includes("phone")) {
  try {
    db.exec("ALTER TABLE users ADD COLUMN phone TEXT DEFAULT ''");
  } catch {
    /* ignore */
  }
}
if (!userColumns.includes("preferences_json")) {
  try {
    db.exec("ALTER TABLE users ADD COLUMN preferences_json TEXT DEFAULT '{}'");
  } catch {
    /* ignore */
  }
}
if (!userColumns.includes("updated_at")) {
  try {
    db.exec("ALTER TABLE users ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP");
  } catch {
    /* ignore */
  }
}

const propertyColumns = db.prepare("PRAGMA table_info(properties)").all().map((c) => c.name);
if (!propertyColumns.includes("description")) {
  try {
    db.exec("ALTER TABLE properties ADD COLUMN description TEXT DEFAULT ''");
  } catch {
    /* ignore */
  }
}
if (!propertyColumns.includes("sample_label")) {
  try {
    db.exec("ALTER TABLE properties ADD COLUMN sample_label TEXT DEFAULT ''");
  } catch {
    /* ignore */
  }
}

// Remove demo credential accounts — never keep hardcoded demo passwords
try {
  db.exec(`
    DELETE FROM users WHERE email IN (
      'buyer@landai.demo',
      'seller@landai.demo',
      'testbuyer@example.com',
      'seller@landai.com'
    )
  `);
} catch {
  /* ignore */
}

const countProps = db.prepare("SELECT count(*) as count FROM properties").get();
if (countProps.count === 0) {
  const insertProperty = db.prepare(`
    INSERT INTO properties (seller_id, title, location, price, area, type, score, image, verified, tags, description, status, sample_label)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const samples = [
    [
      0,
      "Palm Grove Residences",
      "Whitefield, Bengaluru",
      12500000,
      2400,
      "Residential",
      96,
      "https://images.unsplash.com/photo-1505843795480-5cfb3c03f6ff?auto=format&fit=crop&w=1200&q=85",
      0,
      JSON.stringify(["East-facing", "40 ft road"]),
      "Corner residential plot with wide road access. Development sample listing for local testing.",
      "Active",
      "Development sample — not a live listing",
    ],
    [
      0,
      "Verdant Acres",
      "Sarjapur Road, Bengaluru",
      8950000,
      1800,
      "Plot",
      92,
      "https://images.unsplash.com/photo-1631728884184-98ba78f39d1c?auto=format&fit=crop&w=1200&q=85",
      0,
      JSON.stringify(["Gated", "Park view"]),
      "Gated community plot near park amenities. Development sample listing for local testing.",
      "Active",
      "Development sample — not a live listing",
    ],
    [
      0,
      "Lakeview Enclave",
      "Yelahanka, Bengaluru",
      10200000,
      2100,
      "Residential",
      89,
      "https://images.unsplash.com/photo-1676828390434-6ae9782fd194?auto=format&fit=crop&w=1200&q=85",
      0,
      JSON.stringify(["Lake nearby", "Corner plot"]),
      "Residential site near water body. Development sample listing for local testing.",
      "Active",
      "Development sample — not a live listing",
    ],
    [
      0,
      "Orchard County",
      "Devanahalli, Bengaluru",
      6800000,
      1500,
      "Plot",
      86,
      "https://images.unsplash.com/photo-1523192159590-edbd468b9518?auto=format&fit=crop&w=1200&q=85",
      0,
      JSON.stringify(["Airport 15 min", "30 ft road"]),
      "Plot near airport corridor. Development sample listing for local testing.",
      "Active",
      "Development sample — not a live listing",
    ],
  ];

  const tx = db.transaction(() => {
    for (const row of samples) insertProperty.run(...row);
  });
  tx();
} else {
  // Ensure sample labels exist on unlabeled seed rows
  try {
    db.prepare(`
      UPDATE properties
      SET sample_label = 'Development sample — not a live listing',
          verified = 0
      WHERE (sample_label IS NULL OR sample_label = '')
        AND seller_id = 0
    `).run();
  } catch {
    /* ignore */
  }
}

export function logHistory(userId, action, detail = "", documentId = null) {
  db.prepare(
    `INSERT INTO processing_history (user_id, document_id, action, detail) VALUES (?, ?, ?, ?)`,
  ).run(userId, documentId, action, detail);
}

export default db;
