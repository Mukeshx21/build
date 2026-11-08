import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

import os from "node:os";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Detect serverless environment (Vercel, AWS Lambda)
const isServerless = Boolean(process.env.VERCEL) || Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);

function resolveDatabasePath() {
  const localDir = path.resolve(__dirname, "data");
  const localDb = path.resolve(localDir, "landai.sqlite");

  if (isServerless) {
    const tmpDir = path.join(os.tmpdir(), "landai-data");
    try {
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }
    } catch (e) {
      console.warn("[Database] Using os.tmpdir directly:", e.message);
      return path.join(os.tmpdir(), "landai.sqlite");
    }

    const tmpDb = path.join(tmpDir, "landai.sqlite");
    if (fs.existsSync(localDb) && !fs.existsSync(tmpDb)) {
      try {
        fs.copyFileSync(localDb, tmpDb);
        console.log(`[Database] Seeded database to writable /tmp: ${tmpDb}`);
      } catch (e) {
        console.warn("[Database] Could not copy bundled DB:", e.message);
      }
    }
    return tmpDb;
  }

  // Local development: ensure data directory exists or fallback safely to tmpdir
  try {
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }
    return localDb;
  } catch (err) {
    console.warn(`[Database] local data directory not writable (${err.message}). Using os.tmpdir()`);
    return path.join(os.tmpdir(), "landai.sqlite");
  }
}

const dbPath = resolveDatabasePath();
console.log(`[Database] SQLite database active at: ${dbPath} (serverless: ${isServerless})`);

let db;
try {
  const { default: Database } = await import("better-sqlite3");
  db = new Database(dbPath);
} catch (err) {
  console.log(`[Database] Native better-sqlite3 not compiled for Node.js ${process.version}. Using sql.js WebAssembly SQLite engine.`);
  const { default: initSqlJs } = await import("sql.js");
  const SQL = await initSqlJs();
  const filebuffer = fs.existsSync(dbPath) ? fs.readFileSync(dbPath) : null;
  const rawDb = filebuffer ? new SQL.Database(filebuffer) : new SQL.Database();

  const persist = () => {
    try {
      const data = rawDb.export();
      fs.writeFileSync(dbPath, Buffer.from(data));
    } catch {
      // Ignore transient disk write errors
    }
  };

  db = {
    pragma(cmd) {
      try {
        const res = rawDb.exec(`PRAGMA ${cmd}`);
        if (res.length > 0) {
          const cols = res[0].columns;
          return res[0].values.map((val) => {
            const obj = {};
            cols.forEach((c, i) => (obj[c] = val[i]));
            return obj;
          });
        }
        return [];
      } catch {
        return [];
      }
    },
    exec(sql) {
      try {
        rawDb.run(sql);
        persist();
      } catch (e) {
        // Continue on existing tables or harmless errors
      }
      return this;
    },
    prepare(sql) {
      return {
        all(...params) {
          try {
            const stmt = rawDb.prepare(sql);
            const flatParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
            stmt.bind(flatParams);
            const rows = [];
            while (stmt.step()) {
              rows.push(stmt.getAsObject());
            }
            stmt.free();
            return rows;
          } catch (e) {
            console.error("SQL.js all error:", e.message, "SQL:", sql);
            return [];
          }
        },
        get(...params) {
          const rows = this.all(...params);
          return rows[0];
        },
        run(...params) {
          try {
            const flatParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
            rawDb.run(sql, flatParams);
            const res = rawDb.exec("SELECT last_insert_rowid() as id, changes() as changes");
            const id = res[0]?.values[0]?.[0] || 0;
            const ch = res[0]?.values[0]?.[1] || 1;
            persist();
            return { lastInsertRowid: id, changes: ch };
          } catch (e) {
            console.error("SQL.js run error:", e.message, "SQL:", sql);
            throw e;
          }
        }
      };
    },
    transaction(fn) {
      return (...args) => {
        try {
          rawDb.run("BEGIN TRANSACTION");
          const result = fn(...args);
          rawDb.run("COMMIT");
          persist();
          return result;
        } catch (e) {
          try {
            rawDb.run("ROLLBACK");
          } catch {}
          throw e;
        }
      };
    }
  };
}

try {
  db.pragma("journal_mode = WAL");
} catch {
  try { db.pragma("journal_mode = MEMORY"); } catch {}
}
try {
  db.pragma("foreign_keys = ON");
} catch {}

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('buyer', 'seller')),
    email_verified INTEGER DEFAULT 0,
    account_status TEXT DEFAULT 'active',
    phone TEXT DEFAULT '',
    preferences_json TEXT DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS user_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    email TEXT NOT NULL COLLATE NOCASE,
    role TEXT NOT NULL DEFAULT 'buyer',
    phone TEXT DEFAULT '',
    avatar_url TEXT DEFAULT '',
    preferences_json TEXT DEFAULT '{}',
    ocr_access INTEGER DEFAULT 1,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_user_profiles_user ON user_profiles(user_id);
  CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);

  CREATE TABLE IF NOT EXISTS properties (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    seller_id INTEGER DEFAULT 0,
    title TEXT NOT NULL,
    location TEXT NOT NULL,
    city TEXT DEFAULT '',
    state TEXT DEFAULT '',
    price REAL NOT NULL,
    area REAL NOT NULL,
    area_unit TEXT DEFAULT 'sq.ft',
    built_up_area REAL DEFAULT 0,
    type TEXT NOT NULL,
    score INTEGER DEFAULT 90,
    image TEXT NOT NULL,
    images_json TEXT DEFAULT '[]',
    verified INTEGER DEFAULT 0,
    tags TEXT NOT NULL,
    description TEXT DEFAULT '',
    description_long TEXT DEFAULT '',
    facing TEXT DEFAULT '',
    road_access TEXT DEFAULT '',
    bedrooms INTEGER DEFAULT 0,
    bathrooms INTEGER DEFAULT 0,
    status TEXT DEFAULT 'Active',
    listing_status TEXT DEFAULT 'Published',
    sample_label TEXT DEFAULT '',
    documents_json TEXT DEFAULT '[]',
    survey_number TEXT DEFAULT '',
    subdivision_number TEXT DEFAULT '',
    patta_number TEXT DEFAULT '',
    owner_name TEXT DEFAULT '',
    document_id INTEGER DEFAULT NULL,
    verification_status TEXT DEFAULT 'PENDING',
    verification_report_json TEXT DEFAULT '{}',
    document_hash TEXT DEFAULT '',
    verified_at DATETIME DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
    document_type TEXT DEFAULT 'unknown',
    content_type TEXT NOT NULL,
    language TEXT NOT NULL,
    status TEXT NOT NULL,
    page_count INTEGER DEFAULT 0,
    warning TEXT DEFAULT '',
    fields_json TEXT DEFAULT '{}',
    approved_fields_json TEXT DEFAULT '{}',
    file_base64 TEXT DEFAULT '',
    storage_url TEXT DEFAULT '',
    extracted_text TEXT DEFAULT '',
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

  CREATE TABLE IF NOT EXISTS password_reset_tokens (
    token_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    expires_at DATETIME NOT NULL,
    used_at DATETIME,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_documents_user ON documents(user_id);
  CREATE INDEX IF NOT EXISTS idx_saved_user ON saved_properties(user_id);
  CREATE INDEX IF NOT EXISTS idx_history_user ON processing_history(user_id);
`);

// Migrate older schemas safely
const userColumns = db.prepare("PRAGMA table_info(users)").all().map((c) => c.name);
if (!userColumns.includes("email_verified")) {
  try { db.exec("ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0"); } catch { /* existing deployment */ }
}
if (!userColumns.includes("account_status")) {
  try { db.exec("ALTER TABLE users ADD COLUMN account_status TEXT DEFAULT 'active'"); } catch { /* existing deployment */ }
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
    db.exec("ALTER TABLE users ADD COLUMN updated_at DATETIME");
  } catch {
    /* ignore */
  }
}

// Auto-migrate any existing users into user_profiles so all existing accounts have valid LandAI profiles
try {
  db.exec(`
    INSERT OR IGNORE INTO user_profiles (user_id, display_name, email, role, phone, preferences_json, ocr_access, status)
    SELECT id, name, email, role, phone, preferences_json, 1, 'active' FROM users
  `);
} catch (e) {
  console.warn("[Database] user_profiles migration notice:", e.message);
}

// Migrate documents columns for persistent cross-container storage
const docColumns = db.prepare("PRAGMA table_info(documents)").all().map((c) => c.name);
if (!docColumns.includes("file_base64")) {
  try { db.exec("ALTER TABLE documents ADD COLUMN file_base64 TEXT DEFAULT ''"); } catch {}
}
if (!docColumns.includes("storage_url")) {
  try { db.exec("ALTER TABLE documents ADD COLUMN storage_url TEXT DEFAULT ''"); } catch {}
}
if (!docColumns.includes("extracted_text")) {
  try { db.exec("ALTER TABLE documents ADD COLUMN extracted_text TEXT DEFAULT ''"); } catch {}
}

const propertyColumns = db.prepare("PRAGMA table_info(properties)").all().map((c) => c.name);
const propColMigrations = {
  description: "ALTER TABLE properties ADD COLUMN description TEXT DEFAULT ''",
  sample_label: "ALTER TABLE properties ADD COLUMN sample_label TEXT DEFAULT ''",
  listing_status: "ALTER TABLE properties ADD COLUMN listing_status TEXT DEFAULT 'Published'",
  updated_at: "ALTER TABLE properties ADD COLUMN updated_at DATETIME",
  images_json: "ALTER TABLE properties ADD COLUMN images_json TEXT DEFAULT '[]'",
  documents_json: "ALTER TABLE properties ADD COLUMN documents_json TEXT DEFAULT '[]'",
  city: "ALTER TABLE properties ADD COLUMN city TEXT DEFAULT ''",
  state: "ALTER TABLE properties ADD COLUMN state TEXT DEFAULT ''",
  area_unit: "ALTER TABLE properties ADD COLUMN area_unit TEXT DEFAULT 'sq.ft'",
  built_up_area: "ALTER TABLE properties ADD COLUMN built_up_area REAL DEFAULT 0",
  description_long: "ALTER TABLE properties ADD COLUMN description_long TEXT DEFAULT ''",
  facing: "ALTER TABLE properties ADD COLUMN facing TEXT DEFAULT ''",
  road_access: "ALTER TABLE properties ADD COLUMN road_access TEXT DEFAULT ''",
  bedrooms: "ALTER TABLE properties ADD COLUMN bedrooms INTEGER DEFAULT 0",
  bathrooms: "ALTER TABLE properties ADD COLUMN bathrooms INTEGER DEFAULT 0",
  latitude: "ALTER TABLE properties ADD COLUMN latitude REAL DEFAULT NULL",
  longitude: "ALTER TABLE properties ADD COLUMN longitude REAL DEFAULT NULL",
  address: "ALTER TABLE properties ADD COLUMN address TEXT DEFAULT ''",
  sold_at: "ALTER TABLE properties ADD COLUMN sold_at DATETIME DEFAULT NULL",
  survey_number: "ALTER TABLE properties ADD COLUMN survey_number TEXT DEFAULT ''",
  subdivision_number: "ALTER TABLE properties ADD COLUMN subdivision_number TEXT DEFAULT ''",
  patta_number: "ALTER TABLE properties ADD COLUMN patta_number TEXT DEFAULT ''",
  owner_name: "ALTER TABLE properties ADD COLUMN owner_name TEXT DEFAULT ''",
  document_id: "ALTER TABLE properties ADD COLUMN document_id INTEGER DEFAULT NULL",
  verification_status: "ALTER TABLE properties ADD COLUMN verification_status TEXT DEFAULT 'PENDING'",
  verification_report_json: "ALTER TABLE properties ADD COLUMN verification_report_json TEXT DEFAULT '{}'",
  document_hash: "ALTER TABLE properties ADD COLUMN document_hash TEXT DEFAULT ''",
  verified_at: "ALTER TABLE properties ADD COLUMN verified_at DATETIME DEFAULT NULL",
};
for (const [col, sql] of Object.entries(propColMigrations)) {
  if (!propertyColumns.includes(col)) {
    try { db.exec(sql); } catch { /* ignore */ }
  }
}
// Back-fill listing_status and standardize status and coordinates
try {
  db.exec(`UPDATE properties SET listing_status = 'Published' WHERE listing_status IS NULL OR listing_status = ''`);
  db.exec(`UPDATE properties SET status = 'AVAILABLE' WHERE status = 'Active' OR status = 'available' OR status IS NULL OR status = ''`);
  db.exec(`UPDATE properties SET verification_status = 'VERIFIED' WHERE (verified = 1 OR sample_label != '') AND (verification_status IS NULL OR verification_status = '' OR verification_status = 'PENDING')`);
  
  db.exec(`UPDATE properties SET latitude = 11.1396, longitude = 77.0392, address = 'Survey No. 42/1B, Kovilpalayam, Coimbatore, Tamil Nadu' WHERE location LIKE '%Kovilpalayam%' AND latitude IS NULL`);
  db.exec(`UPDATE properties SET latitude = 11.0264, longitude = 77.1245, address = 'Plot 18, Arterial Road, Sulur, Coimbatore, Tamil Nadu' WHERE location LIKE '%Sulur%' AND latitude IS NULL`);
  db.exec(`UPDATE properties SET latitude = 12.9698, longitude = 77.7500, address = 'Site 24, ITPL Main Road, Whitefield, Bengaluru, Karnataka' WHERE location LIKE '%Whitefield%' AND latitude IS NULL`);
  db.exec(`UPDATE properties SET latitude = 12.8601, longitude = 77.7865, address = 'Survey 104, Sarjapur Main Road, Bengaluru, Karnataka' WHERE location LIKE '%Sarjapur%' AND latitude IS NULL`);
  db.exec(`UPDATE properties SET latitude = 12.8876, longitude = 80.2458, address = 'Sea View Enclave, Injambakkam, ECR, Chennai, Tamil Nadu' WHERE location LIKE '%Injambakkam%' AND latitude IS NULL`);
  db.exec(`UPDATE properties SET latitude = 12.9054, longitude = 80.2274, address = 'Survey 88/2, OMR Link Road, Sholinganallur, Chennai, Tamil Nadu' WHERE location LIKE '%Sholinganallur%' AND latitude IS NULL`);
  db.exec(`UPDATE properties SET latitude = 13.1007, longitude = 77.5963, address = 'Lakeview Layout, Yelahanka, Bengaluru, Karnataka' WHERE location LIKE '%Yelahanka%' AND latitude IS NULL`);
  db.exec(`UPDATE properties SET latitude = 13.2483, longitude = 77.7126, address = 'Aeroville Phase 1, Devanahalli, Bengaluru, Karnataka' WHERE location LIKE '%Devanahalli%' AND latitude IS NULL`);
  
  db.exec(`UPDATE properties SET latitude = 11.0168, longitude = 76.9558, address = location WHERE latitude IS NULL AND location LIKE '%Coimbatore%'`);
  db.exec(`UPDATE properties SET latitude = 12.9716, longitude = 77.5946, address = location WHERE latitude IS NULL AND (location LIKE '%Bengaluru%' OR location LIKE '%Bangalore%')`);
  db.exec(`UPDATE properties SET latitude = 13.0827, longitude = 80.2707, address = location WHERE latitude IS NULL AND location LIKE '%Chennai%'`);
  db.exec(`UPDATE properties SET latitude = 11.5000, longitude = 77.2000, address = location WHERE latitude IS NULL`);
} catch { /* ignore */ }
const documentColumns = db.prepare("PRAGMA table_info(documents)").all().map((c) => c.name);
if (!documentColumns.includes("document_type")) {
  try {
    db.exec("ALTER TABLE documents ADD COLUMN document_type TEXT DEFAULT 'unknown'");
  } catch {
    /* existing deployment */
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
      "Emerald Vista Villa Plot",
      "Kovilpalayam, Coimbatore",
      4850000,
      1500,
      "Plot",
      96,
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=85",
      1,
      JSON.stringify(["DTCP Approved", "North-facing", "30 ft road"]),
      "Ready-to-build premium villa plot in an approved gated layout with complete perimeter security, underground utilities, and title deed verified.",
      "Active",
      "Development sample — not a live listing",
    ],
    [
      0,
      "Aura Meadows Residential Land",
      "Sulur, Coimbatore",
      2800000,
      1200,
      "Plot",
      93,
      "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=85",
      1,
      JSON.stringify(["Panchayat Approved", "East-facing", "Clear Title"]),
      "Well-demarcated residential land adjacent to Sulur arterial road with immediate groundwater availability and clear patta chitta documentation.",
      "Active",
      "Development sample — not a live listing",
    ],
    [
      0,
      "Palm Grove Residences",
      "Whitefield, Bengaluru",
      12500000,
      2400,
      "Residential",
      96,
      "https://images.unsplash.com/photo-1505843795480-5cfb3c03f6ff?auto=format&fit=crop&w=1200&q=85",
      1,
      JSON.stringify(["BDA Approved", "East-facing", "40 ft road"]),
      "Corner residential plot in Whitefield IT corridor with 40ft wide blacktop road access, municipal water connection, and dual-boundary fencing.",
      "Active",
      "Development sample — not a live listing",
    ],
    [
      0,
      "Verdant Hills Contemporary Villa",
      "Sarjapur Road, Bengaluru",
      8950000,
      1800,
      "Villa",
      92,
      "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=85",
      1,
      JSON.stringify(["Gated Enclave", "Park View", "RERA Registered"]),
      "Modern architectural villa site in a master-planned community near international schools and tech parks with landscaped surroundings.",
      "Active",
      "Development sample — not a live listing",
    ],
    [
      0,
      "Serene Bay Waterfront Parcel",
      "Injambakkam, ECR, Chennai",
      18500000,
      2400,
      "Residential",
      91,
      "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1200&q=85",
      1,
      JSON.stringify(["CMDA Approved", "Coastal Corridor", "Corner Plot"]),
      "Exclusive coastal corridor residential land parcel situated 400m from the sea beach road with private access street and clear encumbrance certificate.",
      "Active",
      "Development sample — not a live listing",
    ],
    [
      0,
      "Metroplex IT Enclave Land",
      "Sholinganallur, OMR, Chennai",
      9500000,
      1650,
      "Commercial",
      89,
      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=85",
      0,
      JSON.stringify(["OMR Corridor", "Commercial Zoning", "Metro 500m"]),
      "Strategic commercial land parcel facing OMR link road suitable for IT office space, healthcare clinic, or corporate guest house.",
      "Active",
      "Development sample — not a live listing",
    ],
    [
      0,
      "Lakeview Haven Enclave",
      "Yelahanka, Bengaluru",
      10200000,
      2100,
      "Residential",
      89,
      "https://images.unsplash.com/photo-1676828390434-6ae9782fd194?auto=format&fit=crop&w=1200&q=85",
      1,
      JSON.stringify(["Lake Proximity", "Corner Plot", "North-facing"]),
      "Tranquil residential site located walking distance from Yelahanka lake park with clear survey and subdivision FMB boundaries verified.",
      "Active",
      "Development sample — not a live listing",
    ],
    [
      0,
      "Aeroville County",
      "Devanahalli, Bengaluru",
      5400000,
      1500,
      "Plot",
      87,
      "https://images.unsplash.com/photo-1523192159590-edbd468b9518?auto=format&fit=crop&w=1200&q=85",
      1,
      JSON.stringify(["Airport 15 min", "30 ft road", "High ROI"]),
      "High-growth investment plot near the international airport corridor with rapid civic infrastructure development and clear agricultural conversion.",
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
