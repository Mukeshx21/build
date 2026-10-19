import { Router } from "express";
import db from "../db.js";
import {
  authenticate,
  requireRole,
  requireVerifiedEmail,
} from "../middleware/auth.js";

const router = Router();

function formatProperty(row, { saved = false, reasons = [] } = {}) {
  return {
    id: row.id,
    seller_id: row.seller_id,
    title: row.title,
    location: row.location,
    price: row.price,
    area: row.area,
    type: row.type,
    score: row.score,
    image: row.image,
    verified: Boolean(row.verified),
    tags: safeParse(row.tags, []),
    description: row.description || "",
    status: row.status,
    sample_label: row.sample_label || "",
    is_sample: Boolean(row.sample_label),
    created_at: row.created_at,
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
    reasons.push(`Matches your preferred location “${preferences.location}”.`);
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

router.get("/properties", authenticate, requireVerifiedEmail, (req, res) => {
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
      clauses.push(`seller_id = ?`);
      params.push(req.user.id);
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

    const savedIds = new Set(
      db
        .prepare(`SELECT property_id FROM saved_properties WHERE user_id = ?`)
        .all(req.user.id)
        .map((r) => r.property_id),
    );

    const preferences = req.user.preferences || {};
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
  authenticate,
  requireVerifiedEmail,
  (req, res) => {
    try {
      const row = db
        .prepare(`SELECT * FROM properties WHERE id = ?`)
        .get(req.params.id);
      if (!row) {
        return res.status(404).json({ error: "Property not found." });
      }
      const saved = Boolean(
        db
          .prepare(
            `SELECT 1 FROM saved_properties WHERE user_id = ? AND property_id = ?`,
          )
          .get(req.user.id, row.id),
      );
      return res.json({
        property: formatProperty(row, {
          saved,
          reasons: buildRecommendationReasons(row, req.user.preferences || {}),
        }),
      });
    } catch (err) {
      console.error("Error fetching property:", err);
      return res.status(500).json({ error: "Failed to retrieve property." });
    }
  },
);

router.post(
  "/properties",
  authenticate,
  requireVerifiedEmail,
  requireRole("seller"),
  (req, res) => {
    try {
      const { title, location, price, area, type, image, tags, description } =
        req.body || {};

      if (!title || !location || price == null || area == null) {
        return res.status(400).json({
          error: "Title, location, price, and area are required.",
        });
      }

      const defaultImg =
        "https://images.unsplash.com/photo-1505843795480-5cfb3c03f6ff?auto=format&fit=crop&w=1200&q=85";
      const tagArray = Array.isArray(tags)
        ? tags
        : ["Newly Listed", "Direct Owner"];

      const stmt = db.prepare(`
        INSERT INTO properties (seller_id, title, location, price, area, type, score, image, verified, tags, description, status, sample_label)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const result = stmt.run(
        req.user.id,
        String(title).trim(),
        String(location).trim(),
        Number(price),
        Number(area),
        type || "Residential",
        90,
        image || defaultImg,
        0,
        JSON.stringify(tagArray),
        description || "",
        "Active",
        "",
      );

      const created = db
        .prepare("SELECT * FROM properties WHERE id = ?")
        .get(result.lastInsertRowid);
      return res.status(201).json({
        success: true,
        message: "Property listing published successfully.",
        property: formatProperty(created),
      });
    } catch (err) {
      console.error("Error creating property:", err);
      return res.status(500).json({ error: "Could not create property listing." });
    }
  },
);

router.delete(
  "/properties/:id",
  authenticate,
  requireVerifiedEmail,
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

router.get("/saved", authenticate, requireVerifiedEmail, (req, res) => {
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
  requireVerifiedEmail,
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
  requireVerifiedEmail,
  (req, res) => {
    db.prepare(
      `DELETE FROM saved_properties WHERE user_id = ? AND property_id = ?`,
    ).run(req.user.id, Number(req.params.propertyId));
    return res.json({ success: true, saved: false });
  },
);

router.get("/inquiries", authenticate, requireVerifiedEmail, (req, res) => {
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

router.post("/inquiries", authenticate, requireVerifiedEmail, (req, res) => {
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
  requireVerifiedEmail,
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

function safeParse(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

export default router;
