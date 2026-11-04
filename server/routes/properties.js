import { Router } from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import db from "../db.js";
import { authenticate, optionalAuthenticate, requireRole } from "../middleware/auth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.resolve(__dirname, "../../public/uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `prop-${unique}${ext}`);
  },
});

const imageUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowedMime = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    const extOk = /\.(jpe?g|png|webp)$/i.test(file.originalname || "");
    if (allowedMime.includes(file.mimetype) || extOk) {
      cb(null, true);
    } else {
      cb(new Error("Only JPEG, PNG, and WebP images are allowed."));
    }
  },
});

const router = Router();

// Valid listing statuses supported by the backend workflow
const VALID_LISTING_STATUSES = ["Draft", "Published", "Unpublished", "Pending Review", "Rejected"];

function formatProperty(row, { saved = false, reasons = [] } = {}) {
  return {
    id: row.id,
    seller_id: row.seller_id,
    title: row.title,
    location: row.location,
    city: row.city || "",
    state: row.state || "",
    price: row.price,
    area: row.area,
    area_unit: row.area_unit || "sq.ft",
    built_up_area: row.built_up_area || 0,
    type: row.type,
    score: row.score,
    image: row.image,
    images: safeParse(row.images_json, []),
    verified: Boolean(row.verified),
    tags: safeParse(row.tags, []),
    description: row.description || "",
    description_long: row.description_long || "",
    facing: row.facing || "",
    road_access: row.road_access || "",
    bedrooms: row.bedrooms || 0,
    bathrooms: row.bathrooms || 0,
    status: row.status,
    listing_status: row.listing_status || "Published",
    sample_label: row.sample_label || "",
    is_sample: Boolean(row.sample_label),
    documents: safeParse(row.documents_json, []),
    created_at: row.created_at,
    updated_at: row.updated_at,
    saved,
    recommendation_reasons: reasons,
  };
}

function buildRecommendationReasons(property, preferences = {}) {
  const reasons = [];
  const loc = (preferences.location || "").toLowerCase();
  const type = (preferences.type || "").toLowerCase();
  const maxBudget = Number(preferences.maxBudget || 0);
  const minArea = Number(preferences.minArea || 0);

  if (loc && property.location.toLowerCase().includes(loc)) {
    reasons.push(`Matches your preferred location "${preferences.location}".`);
  }
  if (type && property.type.toLowerCase() === type) {
    reasons.push(`Matches your preferred property type (${property.type}).`);
  }
  if (maxBudget > 0 && property.price <= maxBudget) {
    reasons.push("Within your stated budget preference.");
  }
  if (minArea > 0 && property.area >= minArea) {
    reasons.push("Meets your minimum land-area preference.");
  }
  if (property.sample_label) {
    reasons.push("Labeled development sample — not a live market listing.");
  }
  if (!reasons.length) {
    reasons.push("Shown from the available catalog (no strong preference match).");
  }
  return reasons;
}

// ─── PUBLIC / BUYER LISTING ─────────────────────────────────────────────────

router.get("/properties", optionalAuthenticate, (req, res) => {
  try {
    const {
      q = "",
      type = "",
      location = "",
      minPrice,
      maxPrice,
      minArea,
      maxArea,
      mine = "",
      sort = "score_desc",
      page = "1",
      pageSize = "12",
    } = req.query;

    const clauses = [`status != 'Archived'`];
    const params = [];

    if (String(mine) === "1" || String(mine).toLowerCase() === "true") {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required to view your listings." });
      }
      clauses.push(`seller_id = ?`);
      params.push(req.user.id);
    } else {
      // Public marketplace: only show Published listings (not drafts/unpublished/etc.)
      clauses.push(`(listing_status = 'Published' OR listing_status IS NULL OR listing_status = '')`);
    }

    if (q) {
      clauses.push(`(title LIKE ? OR location LIKE ? OR tags LIKE ?)`);
      const like = `%${String(q)}%`;
      params.push(like, like, like);
    }
    if (type) {
      clauses.push(`type = ?`);
      params.push(String(type));
    }
    if (location) {
      clauses.push(`location LIKE ?`);
      params.push(`%${String(location)}%`);
    }
    if (minPrice != null && minPrice !== "") {
      clauses.push(`price >= ?`);
      params.push(Number(minPrice));
    }
    if (maxPrice != null && maxPrice !== "") {
      clauses.push(`price <= ?`);
      params.push(Number(maxPrice));
    }
    if (minArea != null && minArea !== "") {
      clauses.push(`area >= ?`);
      params.push(Number(minArea));
    }
    if (maxArea != null && maxArea !== "") {
      clauses.push(`area <= ?`);
      params.push(Number(maxArea));
    }

    const orderMap = {
      score_desc: "score DESC, id DESC",
      price_asc: "price ASC",
      price_desc: "price DESC",
      area_desc: "area DESC",
      newest: "id DESC",
    };
    const orderBy = orderMap[String(sort)] || orderMap.score_desc;

    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const total = db
      .prepare(`SELECT count(*) as count FROM properties ${where}`)
      .get(...params).count;

    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const size = Math.min(50, Math.max(1, parseInt(String(pageSize), 10) || 12));
    const offset = (pageNum - 1) * size;

    const rows = db
      .prepare(
        `SELECT * FROM properties ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
      )
      .all(...params, size, offset);

    const savedIds = req.user
      ? new Set(
          db
            .prepare(`SELECT property_id FROM saved_properties WHERE user_id = ?`)
            .all(req.user.id)
            .map((r) => r.property_id),
        )
      : new Set();

    const preferences = req.user?.preferences || {};
    const properties = rows.map((row) =>
      formatProperty(row, {
        saved: savedIds.has(row.id),
        reasons: buildRecommendationReasons(row, {
          ...preferences,
          location: location || preferences.location,
          type: type || preferences.type,
          maxBudget: maxPrice || preferences.maxBudget,
          minArea: minArea || preferences.minArea,
        }),
      }),
    );

    return res.json({
      properties,
      pagination: {
        page: pageNum,
        pageSize: size,
        total,
        totalPages: Math.max(1, Math.ceil(total / size)),
      },
      data_note:
        "Listings marked as development samples are local seed data, not live market inventory.",
    });
  } catch (err) {
    console.error("Error fetching properties:", err);
    return res.status(500).json({ error: "Failed to retrieve properties." });
  }
});

router.get(
  "/properties/:id",
  optionalAuthenticate,
  (req, res) => {
    try {
      const row = db
        .prepare(`SELECT * FROM properties WHERE id = ?`)
        .get(req.params.id);
      if (!row) {
        return res.status(404).json({ error: "Property not found." });
      }
      // Non-owners can only view Published listings
      const isOwner = req.user && req.user.id === row.seller_id;
      if (!isOwner && row.listing_status && row.listing_status !== "Published") {
        return res.status(404).json({ error: "Property not found." });
      }
      const saved = req.user
        ? Boolean(
            db
              .prepare(
                `SELECT 1 FROM saved_properties WHERE user_id = ? AND property_id = ?`,
              )
              .get(req.user.id, row.id),
          )
        : false;

      // Fetch seller info (name only, no private data)
      const seller = row.seller_id
        ? db.prepare("SELECT name FROM users WHERE id = ?").get(row.seller_id)
        : null;

      return res.json({
        property: {
          ...formatProperty(row, {
            saved,
            reasons: buildRecommendationReasons(row, req.user?.preferences || {}),
          }),
          seller_name: seller?.name || null,
        },
      });
    } catch (err) {
      console.error("Error fetching property:", err);
      return res.status(500).json({ error: "Failed to retrieve property." });
    }
  },
);

// ─── SELLER DASHBOARD ────────────────────────────────────────────────────────

router.get("/seller/dashboard", authenticate, requireRole("seller"), (req, res) => {
  try {
    const sellerId = req.user.id;

    const totalRow = db
      .prepare("SELECT count(*) as count FROM properties WHERE seller_id = ? AND status != 'Archived'")
      .get(sellerId);

    const publishedRow = db
      .prepare("SELECT count(*) as count FROM properties WHERE seller_id = ? AND listing_status = 'Published' AND status != 'Archived'")
      .get(sellerId);

    const draftRow = db
      .prepare("SELECT count(*) as count FROM properties WHERE seller_id = ? AND listing_status = 'Draft'")
      .get(sellerId);

    const pendingRow = db
      .prepare("SELECT count(*) as count FROM properties WHERE seller_id = ? AND listing_status = 'Pending Review'")
      .get(sellerId);

    const unpublishedRow = db
      .prepare("SELECT count(*) as count FROM properties WHERE seller_id = ? AND listing_status = 'Unpublished'")
      .get(sellerId);

    const recentListings = db
      .prepare("SELECT * FROM properties WHERE seller_id = ? AND status != 'Archived' ORDER BY created_at DESC LIMIT 5")
      .all(sellerId)
      .map((r) => formatProperty(r));

    return res.json({
      stats: {
        total: totalRow.count,
        published: publishedRow.count,
        draft: draftRow.count,
        pending_review: pendingRow.count,
        unpublished: unpublishedRow.count,
      },
      recent_listings: recentListings,
    });
  } catch (err) {
    console.error("Error fetching seller dashboard:", err);
    return res.status(500).json({ error: "Could not load dashboard." });
  }
});

// ─── SELLER: My LISTINGS ─────────────────────────────────────────────────────

router.get("/seller/listings", authenticate, requireRole("seller"), (req, res) => {
  try {
    const { q = "", listing_status = "", sort = "newest" } = req.query;
    const sellerId = req.user.id;

    const clauses = ["seller_id = ?", "status != 'Archived'"];
    const params = [sellerId];

    if (q) {
      clauses.push("(title LIKE ? OR location LIKE ?)");
      const like = `%${String(q)}%`;
      params.push(like, like);
    }
    if (listing_status && VALID_LISTING_STATUSES.includes(listing_status)) {
      clauses.push("listing_status = ?");
      params.push(listing_status);
    }

    const orderMap = {
      newest: "created_at DESC",
      updated: "updated_at DESC",
      price_asc: "price ASC",
      price_desc: "price DESC",
    };
    const orderBy = orderMap[String(sort)] || "created_at DESC";

    const rows = db
      .prepare(`SELECT * FROM properties WHERE ${clauses.join(" AND ")} ORDER BY ${orderBy}`)
      .all(...params);

    return res.json({ properties: rows.map((r) => formatProperty(r)) });
  } catch (err) {
    console.error("Error fetching seller listings:", err);
    return res.status(500).json({ error: "Could not load your listings." });
  }
});

// ─── UPLOAD PROPERTY IMAGE ───────────────────────────────────────────────────

router.post(
  "/properties/upload-image",
  authenticate,
  requireRole("seller"),
  (req, res) => {
    imageUpload.single("file")(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({ error: "File exceeds 10 MB limit." });
        }
        return res.status(400).json({ error: err.message });
      }
      if (err) {
        return res.status(400).json({ error: err.message });
      }
      if (!req.file) {
        return res.status(400).json({ error: "An image file is required." });
      }
      const publicUrl = `/uploads/${req.file.filename}`;
      return res.json({
        success: true,
        url: publicUrl,
        filename: req.file.filename,
        original_name: req.file.originalname,
        size: req.file.size,
      });
    });
  },
);

// ─── CREATE PROPERTY ──────────────────────────────────────────────────────────

router.post(
  "/properties",
  authenticate,
  requireRole("seller"),
  (req, res) => {
    try {
      const {
        title, location, city = "", state = "",
        price, area, area_unit = "sq.ft", built_up_area = 0,
        type, image, images = [], tags, description,
        description_long = "", facing = "", road_access = "",
        bedrooms = 0, bathrooms = 0,
        listing_status = "Draft",
        documents = [],
      } = req.body || {};

      if (!title || !location || price == null || area == null) {
        return res.status(400).json({
          error: "Title, location, price, and area are required.",
        });
      }

      const resolvedStatus = VALID_LISTING_STATUSES.includes(listing_status)
        ? listing_status
        : "Draft";

      const defaultImg =
        "https://images.unsplash.com/photo-1505843795480-5cfb3c03f6ff?auto=format&fit=crop&w=1200&q=85";
      const tagArray = Array.isArray(tags) ? tags : ["Newly Listed", "Direct Owner"];
      const imageArray = Array.isArray(images) ? images : [];
      const documentArray = Array.isArray(documents) ? documents : [];

      const stmt = db.prepare(`
        INSERT INTO properties (
          seller_id, title, location, city, state,
          price, area, area_unit, built_up_area,
          type, score, image, images_json,
          verified, tags, description, description_long,
          facing, road_access, bedrooms, bathrooms,
          status, listing_status, sample_label, documents_json
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const result = stmt.run(
        req.user.id,
        String(title).trim(),
        String(location).trim(),
        String(city).trim(),
        String(state).trim(),
        Number(price),
        Number(area),
        String(area_unit),
        Number(built_up_area),
        type || "Residential",
        90,
        image || defaultImg,
        JSON.stringify(imageArray),
        documentArray.length > 0 ? 1 : 0,
        JSON.stringify(tagArray),
        description || "",
        String(description_long).trim(),
        String(facing).trim(),
        String(road_access).trim(),
        Number(bedrooms),
        Number(bathrooms),
        "Active",
        resolvedStatus,
        "",
        JSON.stringify(documentArray),
      );

      const created = db
        .prepare("SELECT * FROM properties WHERE id = ?")
        .get(result.lastInsertRowid);

      return res.status(201).json({
        success: true,
        message:
          resolvedStatus === "Published"
            ? "Property listing published successfully."
            : `Property saved as ${resolvedStatus}.`,
        property: formatProperty(created),
      });
    } catch (err) {
      console.error("Error creating property:", err);
      return res.status(500).json({ error: "Could not create property listing." });
    }
  },
);

// ─── UPDATE PROPERTY ──────────────────────────────────────────────────────────

router.put(
  "/properties/:id",
  authenticate,
  requireRole("seller"),
  (req, res) => {
    try {
      const propertyId = req.params.id;
      const prop = db.prepare("SELECT * FROM properties WHERE id = ?").get(propertyId);
      if (!prop) return res.status(404).json({ error: "Property not found." });
      if (prop.seller_id !== req.user.id) {
        return res.status(403).json({ error: "You can only edit properties you listed." });
      }

      const {
        title, location, city, state,
        price, area, area_unit, built_up_area,
        type, image, images, tags, description,
        description_long, facing, road_access,
        bedrooms, bathrooms, listing_status, documents,
      } = req.body || {};

      const resolvedStatus =
        listing_status && VALID_LISTING_STATUSES.includes(listing_status)
          ? listing_status
          : prop.listing_status;

      db.prepare(`
        UPDATE properties SET
          title = ?, location = ?, city = ?, state = ?,
          price = ?, area = ?, area_unit = ?, built_up_area = ?,
          type = ?, image = ?, images_json = ?,
          tags = ?, description = ?, description_long = ?,
          facing = ?, road_access = ?, bedrooms = ?, bathrooms = ?,
          listing_status = ?, documents_json = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        title ?? prop.title,
        location ?? prop.location,
        city ?? prop.city ?? "",
        state ?? prop.state ?? "",
        price != null ? Number(price) : prop.price,
        area != null ? Number(area) : prop.area,
        area_unit ?? prop.area_unit ?? "sq.ft",
        built_up_area != null ? Number(built_up_area) : (prop.built_up_area || 0),
        type ?? prop.type,
        image ?? prop.image,
        images ? JSON.stringify(images) : (prop.images_json || "[]"),
        tags ? JSON.stringify(tags) : prop.tags,
        description ?? prop.description ?? "",
        description_long ?? prop.description_long ?? "",
        facing ?? prop.facing ?? "",
        road_access ?? prop.road_access ?? "",
        bedrooms != null ? Number(bedrooms) : (prop.bedrooms || 0),
        bathrooms != null ? Number(bathrooms) : (prop.bathrooms || 0),
        resolvedStatus,
        documents ? JSON.stringify(documents) : (prop.documents_json || "[]"),
        propertyId,
      );

      const updated = db.prepare("SELECT * FROM properties WHERE id = ?").get(propertyId);
      return res.json({
        success: true,
        message: "Property updated.",
        property: formatProperty(updated),
      });
    } catch (err) {
      console.error("Error updating property:", err);
      return res.status(500).json({ error: "Could not update property." });
    }
  },
);

// ─── CHANGE LISTING STATUS (publish / unpublish / draft) ─────────────────────

router.patch(
  "/properties/:id/status",
  authenticate,
  requireRole("seller"),
  (req, res) => {
    try {
      const propertyId = req.params.id;
      const { listing_status } = req.body || {};

      if (!VALID_LISTING_STATUSES.includes(listing_status)) {
        return res.status(400).json({
          error: `Invalid status. Allowed values: ${VALID_LISTING_STATUSES.join(", ")}`,
        });
      }

      const prop = db.prepare("SELECT * FROM properties WHERE id = ?").get(propertyId);
      if (!prop) return res.status(404).json({ error: "Property not found." });
      if (prop.seller_id !== req.user.id) {
        return res.status(403).json({ error: "You can only manage properties you listed." });
      }

      db.prepare(
        "UPDATE properties SET listing_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
      ).run(listing_status, propertyId);

      return res.json({
        success: true,
        message: `Listing status changed to ${listing_status}.`,
        listing_status,
      });
    } catch (err) {
      console.error("Error changing listing status:", err);
      return res.status(500).json({ error: "Could not change listing status." });
    }
  },
);

// ─── DELETE PROPERTY ──────────────────────────────────────────────────────────

router.delete(
  "/properties/:id",
  authenticate,
  requireRole("seller"),
  (req, res) => {
    try {
      const propertyId = req.params.id;
      const prop = db
        .prepare("SELECT * FROM properties WHERE id = ?")
        .get(propertyId);

      if (!prop) {
        return res.status(404).json({ error: "Property not found." });
      }
      if (prop.seller_id !== req.user.id) {
        return res
          .status(403)
          .json({ error: "You can only delete properties you listed." });
      }

      db.prepare("DELETE FROM properties WHERE id = ?").run(propertyId);
      return res.json({
        success: true,
        message: "Property removed from marketplace.",
      });
    } catch (err) {
      console.error("Error deleting property:", err);
      return res.status(500).json({ error: "Could not delete property." });
    }
  },
);

// ─── SAVED PROPERTIES ────────────────────────────────────────────────────────

router.get("/saved", authenticate, (req, res) => {
  const rows = db
    .prepare(
      `SELECT p.* FROM saved_properties s
       JOIN properties p ON p.id = s.property_id
       WHERE s.user_id = ?
       ORDER BY s.id DESC`,
    )
    .all(req.user.id);
  return res.json({
    properties: rows.map((row) =>
      formatProperty(row, {
        saved: true,
        reasons: buildRecommendationReasons(row, req.user.preferences || {}),
      }),
    ),
  });
});

router.post(
  "/saved/:propertyId",
  authenticate,
  (req, res) => {
    const propertyId = Number(req.params.propertyId);
    const prop = db
      .prepare("SELECT id FROM properties WHERE id = ?")
      .get(propertyId);
    if (!prop) {
      return res.status(404).json({ error: "Property not found." });
    }
    db.prepare(
      `INSERT OR IGNORE INTO saved_properties (user_id, property_id) VALUES (?, ?)`,
    ).run(req.user.id, propertyId);
    return res.json({ success: true, saved: true });
  },
);

router.delete(
  "/saved/:propertyId",
  authenticate,
  (req, res) => {
    db.prepare(
      `DELETE FROM saved_properties WHERE user_id = ? AND property_id = ?`,
    ).run(req.user.id, Number(req.params.propertyId));
    return res.json({ success: true, saved: false });
  },
);

// ─── INQUIRIES ────────────────────────────────────────────────────────────────

router.get("/inquiries", authenticate, (req, res) => {
  try {
    let rows;
    if (req.user.role === "seller") {
      rows = db
        .prepare(
          `
        SELECT i.*, p.title as property_title, p.location as property_location
        FROM inquiries i
        LEFT JOIN properties p ON i.property_id = p.id
        WHERE i.seller_id = ?
        ORDER BY i.id DESC
      `,
        )
        .all(req.user.id);
    } else {
      rows = db
        .prepare(
          `
        SELECT i.*, p.title as property_title, p.location as property_location
        FROM inquiries i
        LEFT JOIN properties p ON i.property_id = p.id
        WHERE i.buyer_id = ? OR i.buyer_email = ?
        ORDER BY i.id DESC
      `,
        )
        .all(req.user.id, req.user.email);
    }
    return res.json({ inquiries: rows });
  } catch (err) {
    console.error("Error fetching inquiries:", err);
    return res.status(500).json({ error: "Failed to retrieve enquiries." });
  }
});

router.post("/inquiries", authenticate, (req, res) => {
  try {
    const { property_id, visit_date, visit_time, message } = req.body || {};
    if (!property_id) {
      return res.status(400).json({ error: "Property ID is required." });
    }
    const prop = db
      .prepare("SELECT * FROM properties WHERE id = ?")
      .get(property_id);
    if (!prop) {
      return res.status(404).json({ error: "Property not found." });
    }

    const insert = db.prepare(`
      INSERT INTO inquiries (property_id, property_title, buyer_id, buyer_name, buyer_email, seller_id, visit_date, visit_time, message, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending')
    `);
    const result = insert.run(
      prop.id,
      prop.title,
      req.user.id,
      req.user.name,
      req.user.email,
      prop.seller_id,
      visit_date || "Upcoming",
      visit_time || "10:30 AM",
      message || "Requested site visit via LandAI.",
    );

    return res.status(201).json({
      success: true,
      message: "Site visit request submitted to seller.",
      inquiryId: Number(result.lastInsertRowid),
    });
  } catch (err) {
    console.error("Error creating inquiry:", err);
    return res.status(500).json({ error: "Could not submit inquiry." });
  }
});

router.patch(
  "/inquiries/:id/status",
  authenticate,
  requireRole("seller"),
  (req, res) => {
    try {
      const { status } = req.body || {};
      const inquiryId = req.params.id;
      if (!["Confirmed", "Completed", "Declined", "Pending"].includes(status)) {
        return res.status(400).json({ error: "Invalid status value." });
      }
      const inquiry = db
        .prepare("SELECT * FROM inquiries WHERE id = ?")
        .get(inquiryId);
      if (!inquiry) {
        return res.status(404).json({ error: "Inquiry not found." });
      }
      if (inquiry.seller_id !== req.user.id) {
        return res.status(403).json({ error: "Unauthorized: not your inquiry." });
      }
      db.prepare("UPDATE inquiries SET status = ? WHERE id = ?").run(
        status,
        inquiryId,
      );
      return res.json({ success: true, message: `Inquiry marked as ${status}.` });
    } catch (err) {
      console.error("Error updating inquiry status:", err);
      return res.status(500).json({ error: "Could not update status." });
    }
  },
);

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function safeParse(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

export default router;
