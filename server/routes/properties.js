import { Router } from "express";
import db from "../db.js";
import { authenticate, requireRole } from "../middleware/auth.js";

const router = Router();

// GET all active properties (protected route)
router.get("/properties", authenticate, (req, res) => {
  try {
    const rows = db.prepare("SELECT * FROM properties WHERE status != 'Archived' ORDER BY id DESC").all();
    const formatted = rows.map(r => ({
      ...r,
      verified: Boolean(r.verified),
      tags: JSON.parse(r.tags || "[]")
    }));
    return res.json({ properties: formatted });
  } catch (err) {
    console.error("Error fetching properties:", err);
    return res.status(500).json({ error: "Failed to retrieve properties." });
  }
});

// CREATE property (Seller only)
router.post("/properties", authenticate, requireRole("seller"), (req, res) => {
  try {
    const { title, location, price, area, type, image, tags } = req.body;

    if (!title || !location || !price || !area) {
      return res.status(400).json({ error: "Title, location, price, and area are required." });
    }

    const defaultImg = "https://images.unsplash.com/photo-1505843795480-5cfb3c03f6ff?auto=format&fit=crop&w=1200&q=85";
    const tagArray = Array.isArray(tags) ? tags : ["Newly Listed", "Direct Owner"];

    const stmt = db.prepare(`
      INSERT INTO properties (seller_id, title, location, price, area, type, score, image, verified, tags, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      req.user.id,
      title.trim(),
      location.trim(),
      Number(price),
      Number(area),
      type || "Residential",
      92,
      image || defaultImg,
      1,
      JSON.stringify(tagArray),
      "Active"
    );

    const created = db.prepare("SELECT * FROM properties WHERE id = ?").get(result.lastInsertRowid);
    return res.status(201).json({
      success: true,
      message: "Property listing published successfully!",
      property: {
        ...created,
        verified: Boolean(created.verified),
        tags: JSON.parse(created.tags || "[]")
      }
    });
  } catch (err) {
    console.error("Error creating property:", err);
    return res.status(500).json({ error: "Could not create property listing." });
  }
});

// DELETE property (Seller only - must be the owner)
router.delete("/properties/:id", authenticate, requireRole("seller"), (req, res) => {
  try {
    const propertyId = req.params.id;
    const prop = db.prepare("SELECT * FROM properties WHERE id = ?").get(propertyId);

    if (!prop) {
      return res.status(404).json({ error: "Property not found." });
    }

    if (prop.seller_id !== req.user.id) {
      return res.status(403).json({ error: "You can only delete properties you listed." });
    }

    db.prepare("DELETE FROM properties WHERE id = ?").run(propertyId);
    return res.json({ success: true, message: "Property removed from marketplace." });
  } catch (err) {
    console.error("Error deleting property:", err);
    return res.status(500).json({ error: "Could not delete property." });
  }
});

// GET Inquiries / Site Visits (Protected)
router.get("/inquiries", authenticate, (req, res) => {
  try {
    let rows;
    if (req.user.role === "seller") {
      rows = db.prepare(`
        SELECT i.*, p.title as property_title, p.location as property_location
        FROM inquiries i
        LEFT JOIN properties p ON i.property_id = p.id
        WHERE i.seller_id = ?
        ORDER BY i.id DESC
      `).all(req.user.id);
    } else {
      rows = db.prepare(`
        SELECT i.*, p.title as property_title, p.location as property_location
        FROM inquiries i
        LEFT JOIN properties p ON i.property_id = p.id
        WHERE i.buyer_id = ? OR i.buyer_email = ?
        ORDER BY i.id DESC
      `).all(req.user.id, req.user.email);
    }

    return res.json({ inquiries: rows });
  } catch (err) {
    console.error("Error fetching inquiries:", err);
    return res.status(500).json({ error: "Failed to retrieve enquiries." });
  }
});

// CREATE Inquiry / Site Visit Request (Protected)
router.post("/inquiries", authenticate, (req, res) => {
  try {
    const { property_id, visit_date, visit_time, message } = req.body;

    if (!property_id) {
      return res.status(400).json({ error: "Property ID is required." });
    }

    const prop = db.prepare("SELECT * FROM properties WHERE id = ?").get(property_id);
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
      message || "Requested site visit via LandAI."
    );

    return res.status(201).json({
      success: true,
      message: "Site visit request submitted to seller!",
      inquiryId: result.lastInsertRowid
    });
  } catch (err) {
    console.error("Error creating inquiry:", err);
    return res.status(500).json({ error: "Could not submit inquiry." });
  }
});

// UPDATE Inquiry Status (Seller only)
router.patch("/inquiries/:id/status", authenticate, requireRole("seller"), (req, res) => {
  try {
    const { status } = req.body;
    const inquiryId = req.params.id;

    if (!["Confirmed", "Completed", "Declined", "Pending"].includes(status)) {
      return res.status(400).json({ error: "Invalid status value." });
    }

    const inquiry = db.prepare("SELECT * FROM inquiries WHERE id = ?").get(inquiryId);
    if (!inquiry) {
      return res.status(404).json({ error: "Inquiry not found." });
    }

    if (inquiry.seller_id !== req.user.id) {
      return res.status(403).json({ error: "Unauthorized: not your inquiry." });
    }

    db.prepare("UPDATE inquiries SET status = ? WHERE id = ?").run(status, inquiryId);
    return res.json({ success: true, message: `Inquiry marked as ${status}.` });
  } catch (err) {
    console.error("Error updating inquiry status:", err);
    return res.status(500).json({ error: "Could not update status." });
  }
});

export default router;
