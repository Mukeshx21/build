import { Router } from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import db, { logHistory } from "../db.js";
import { authenticate, optionalAuthenticate, requireRole } from "../middleware/auth.js";
import { verifyPropertyAgainstDocument } from "../services/documentVerification.js";

import os from "node:os";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isServerless = Boolean(process.env.VERCEL) || Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);
const defaultUploadDir = path.resolve(__dirname, "../../public/uploads");
const uploadDir = isServerless ? path.join(os.tmpdir(), "landai-uploads") : defaultUploadDir;

try {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
} catch (err) {
  console.warn("[Uploads] Could not create uploadDir in properties.js:", err.message);
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
  // Normalize status: AVAILABLE, SOLD, PENDING, DRAFT
  let normStatus = (row.status || "").toUpperCase();
  if (normStatus === "ACTIVE" || !normStatus) normStatus = "AVAILABLE";
  if (normStatus === "ARCHIVED") normStatus = "DRAFT";
  if (!["AVAILABLE", "SOLD", "PENDING", "DRAFT"].includes(normStatus)) {
    normStatus = "AVAILABLE";
  }

  // Get seller information if available
  let sellerInfo = null;
  if (row.seller_id) {
    try {
      const s = db.prepare("SELECT id, name, email, phone, role FROM users WHERE id = ?").get(row.seller_id);
      if (s) {
        sellerInfo = { id: s.id, name: s.name, email: s.email, phone: s.phone, role: s.role };
      }
    } catch {
      // ignore
    }
  }
  if (!sellerInfo) {
    sellerInfo = {
      id: 0,
      name: "Authorized Real Estate Promoter",
      email: "promoter@landai.in",
      phone: "+91 98765 43210",
      role: "seller"
    };
  }

  return {
    id: row.id,
    property_id: row.id,
    seller_id: row.seller_id,
    seller: sellerInfo,
    title: row.title,
    location: row.location,
    address: row.address || row.location,
    city: row.city || "",
    state: row.state || "",
    price: row.price,
    area: row.area,
    area_unit: row.area_unit || "sq.ft",
    built_up_area: row.built_up_area || 0,
    type: row.type,
    property_type: row.type,
    score: row.score,
    image: row.image,
    images: safeParse(row.images_json, []),
    verified: Boolean(row.verified),
    survey_number: row.survey_number || "",
    subdivision_number: row.subdivision_number || "",
    patta_number: row.patta_number || "",
    owner_name: row.owner_name || "",
    document_id: row.document_id || null,
    verification_status: row.verification_status || (row.verified ? "VERIFIED" : "PENDING"),
    verification_report: safeParse(row.verification_report_json, {}),
    verified_at: row.verified_at || null,
    tags: safeParse(row.tags, []),
    description: row.description || "",
    description_long: row.description_long || "",
    facing: row.facing || "",
    road_access: row.road_access || "",
    bedrooms: row.bedrooms || 0,
    bathrooms: row.bathrooms || 0,
    latitude: row.latitude != null ? Number(row.latitude) : null,
    longitude: row.longitude != null ? Number(row.longitude) : null,
    status: normStatus,
    listing_status: row.listing_status || (normStatus === "DRAFT" ? "Draft" : "Published"),
    sample_label: row.sample_label || "",
    is_sample: Boolean(row.sample_label),
    documents: safeParse(row.documents_json, []),
    created_at: row.created_at,
    updated_at: row.updated_at,
    sold_at: row.sold_at || null,
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
      status = "",
      mine = "",
      sort = "score_desc",
      page = "1",
      pageSize = "100",
    } = req.query;

    const clauses = [`status != 'Archived'`];
    const params = [];

    // Status filtering
    const cleanStatus = String(status || "").trim().toUpperCase();
    if (cleanStatus === "SOLD") {
      clauses.push("status = 'SOLD'");
    } else if (cleanStatus === "PENDING") {
      clauses.push("status = 'PENDING'");
    } else if (cleanStatus === "DRAFT") {
      clauses.push("status = 'DRAFT'");
    } else if (cleanStatus === "ALL") {
      // Show all statuses (buyers still only see published)
    } else if (String(mine) !== "1" && String(mine).toLowerCase() !== "true") {
      // Default for buyers: only show active AVAILABLE properties
      clauses.push("(status = 'AVAILABLE' OR status = 'Active' OR status = 'available' OR status = '' OR status IS NULL)");
      clauses.push("status != 'SOLD'");
      clauses.push("status != 'DRAFT'");
    }

    if (String(mine) === "1" || String(mine).toLowerCase() === "true") {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required to view your listings." });
      }
      clauses.push(`seller_id = ?`);
      params.push(req.user.id);
    } else {
      // Public marketplace: only show Published listings that are strictly verified
      clauses.push(`(listing_status = 'Published' OR listing_status IS NULL OR listing_status = '')`);
      clauses.push(`(verified = 1 OR sample_label != '')`);
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

    const availableRow = db
      .prepare("SELECT count(*) as count FROM properties WHERE seller_id = ? AND (status = 'AVAILABLE' OR status = 'Active' OR status IS NULL)")
      .get(sellerId);

    const soldRow = db
      .prepare("SELECT count(*) as count FROM properties WHERE seller_id = ? AND status = 'SOLD'")
      .get(sellerId);

    const pendingSaleRow = db
      .prepare("SELECT count(*) as count FROM properties WHERE seller_id = ? AND status = 'PENDING'")
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
        available: availableRow.count,
        sold: soldRow.count,
        pending_sale: pendingSaleRow.count,
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
    const { q = "", listing_status = "", status = "", sort = "newest" } = req.query;
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
    if (status) {
      const clean = String(status).trim().toUpperCase();
      if (clean === "SOLD" || clean === "PENDING" || clean === "DRAFT" || clean === "AVAILABLE") {
        clauses.push("status = ?");
        params.push(clean);
      }
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

// ─── VERIFY PROPERTY AGAINST DOCUMENT ────────────────────────────────────────

router.post(
  "/properties/verify-document",
  authenticate,
  requireRole("seller"),
  (req, res) => {
    try {
      const { document_id, property_data = {} } = req.body || {};
      if (!document_id) {
        return res.status(400).json({
          success: false,
          error: "document_id is required.",
          verification_status: "REJECTED",
        });
      }

      const doc = db.prepare("SELECT * FROM documents WHERE id = ?").get(document_id);
      if (!doc) {
        return res.status(404).json({
          success: false,
          error: "Document record not found.",
          verification_status: "REJECTED",
        });
      }
      if (doc.user_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: "Access denied to this document.",
          verification_status: "REJECTED",
        });
      }

      const report = verifyPropertyAgainstDocument(
        property_data,
        doc,
        req.user,
        { existingPropertyId: property_data.id }
      );

      return res.json({
        success: true,
        ...report,
      });
    } catch (err) {
      console.error("Verification endpoint error:", err);
      return res.status(500).json({
        success: false,
        error: "Failed to verify document: " + err.message,
        verification_status: "REJECTED",
      });
    }
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
        title, location, address = "", city = "", state = "",
        price, area, area_unit = "sq.ft", built_up_area = 0,
        type, image, images = [], tags, description,
        description_long = "", facing = "", road_access = "",
        bedrooms = 0, bathrooms = 0,
        latitude = null, longitude = null,
        status = "AVAILABLE",
        listing_status = "Draft",
        documents = [],
        survey_number = "",
        subdivision_number = "",
        patta_number = "",
        owner_name = "",
        document_id = null,
      } = req.body || {};

      if (!title || !location || price == null || area == null) {
        return res.status(400).json({
          error: "Title, location, price, and area are required.",
        });
      }

      const documentArray = Array.isArray(documents) ? documents : [];
      const primaryDocId = document_id || (documentArray[0] && (documentArray[0].id || documentArray[0].local_id || documentArray[0].document_id));

      // Rule 1: Mandatory Document Upload
      if (!primaryDocId || documentArray.length === 0) {
        return res.status(400).json({
          error: "Mandatory land document is required. You must upload your land ownership document before posting a property.",
          verification_status: "REJECTED",
          discrepancies: [{ field: "document", message: "Document upload is mandatory." }],
        });
      }

      const docRow = db.prepare("SELECT * FROM documents WHERE id = ?").get(primaryDocId);
      if (!docRow) {
        return res.status(400).json({
          error: "Attached land ownership document was not found.",
          verification_status: "REJECTED",
        });
      }
      if (docRow.user_id !== req.user.id) {
        return res.status(403).json({
          error: "Unauthorized document: You can only attach documents you uploaded.",
          verification_status: "REJECTED",
        });
      }

      // Rule 2: Run Strict Document Verification
      const verificationReport = verifyPropertyAgainstDocument(
        {
          title,
          owner_name,
          survey_number,
          subdivision_number,
          patta_number,
          location,
          address,
          city,
          state,
          area,
          area_unit,
          price,
        },
        docRow,
        req.user
      );

      const resolvedStatus = VALID_LISTING_STATUSES.includes(listing_status)
        ? listing_status
        : "Draft";

      // Rule 3: Strict Posting Rules
      // If user requested to Publish, verification MUST be VERIFIED!
      if (resolvedStatus === "Published") {
        if (verificationReport.overall_status !== "VERIFIED") {
          return res.status(422).json({
            error: "Property posting blocked: Land document verification did not pass. " + verificationReport.message,
            verification_status: verificationReport.overall_status,
            report: verificationReport,
            discrepancies: verificationReport.discrepancies,
          });
        }
      }

      const isVerified = verificationReport.overall_status === "VERIFIED" ? 1 : 0;
      const finalSurveyNumber = String(survey_number || verificationReport.extracted_fields?.survey_number || "").trim();
      const finalSubdivision = String(subdivision_number || verificationReport.extracted_fields?.subdivision_number || "").trim();
      const finalPattaNumber = String(patta_number || verificationReport.extracted_fields?.patta_number || "").trim();
      const finalOwnerName = String(owner_name || verificationReport.extracted_fields?.owner_name || req.user.name).trim();

      const defaultImg =
        "https://images.unsplash.com/photo-1505843795480-5cfb3c03f6ff?auto=format&fit=crop&w=1200&q=85";
      const tagArray = Array.isArray(tags) ? tags : ["Newly Listed", "Direct Owner"];
      const imageArray = Array.isArray(images) ? images : [];

      const stmt = db.prepare(`
        INSERT INTO properties (
          seller_id, title, location, address, city, state,
          price, area, area_unit, built_up_area,
          type, score, image, images_json,
          verified, tags, description, description_long,
          facing, road_access, bedrooms, bathrooms,
          latitude, longitude,
          status, listing_status, sample_label, documents_json,
          survey_number, subdivision_number, patta_number, owner_name,
          document_id, verification_status, verification_report_json, verified_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const result = stmt.run(
        req.user.id,
        String(title).trim(),
        String(location).trim(),
        String(address || location).trim(),
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
        isVerified,
        JSON.stringify(tagArray),
        description || "",
        String(description_long).trim(),
        String(facing).trim(),
        String(road_access).trim(),
        Number(bedrooms),
        Number(bathrooms),
        latitude != null && !Number.isNaN(Number(latitude)) ? Number(latitude) : null,
        longitude != null && !Number.isNaN(Number(longitude)) ? Number(longitude) : null,
        status.toUpperCase() === "SOLD" ? "SOLD" : status.toUpperCase() === "PENDING" ? "PENDING" : status.toUpperCase() === "DRAFT" ? "DRAFT" : "AVAILABLE",
        resolvedStatus,
        "",
        JSON.stringify(documentArray),
        finalSurveyNumber,
        finalSubdivision,
        finalPattaNumber,
        finalOwnerName,
        docRow.id,
        verificationReport.overall_status,
        JSON.stringify(verificationReport),
        isVerified ? new Date().toISOString() : null,
      );

      const created = db
        .prepare("SELECT * FROM properties WHERE id = ?")
        .get(result.lastInsertRowid);

      logHistory(req.user.id, "post_property", `Created property #${result.lastInsertRowid} (status: ${resolvedStatus}, verification: ${verificationReport.overall_status})`, docRow.id);

      return res.status(201).json({
        success: true,
        message:
          resolvedStatus === "Published"
            ? "Property listing verified and published successfully."
            : `Property saved as ${resolvedStatus}. Verification status: ${verificationReport.overall_status}.`,
        property: formatProperty(created),
        verification_report: verificationReport,
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
        title, location, address, city, state,
        price, area, area_unit, built_up_area,
        type, image, images, tags, description,
        description_long, facing, road_access,
        bedrooms, bathrooms, latitude, longitude,
        status, listing_status, documents,
        survey_number, subdivision_number, patta_number, owner_name, document_id,
      } = req.body || {};

      const resolvedStatus =
        listing_status && VALID_LISTING_STATUSES.includes(listing_status)
          ? listing_status
          : prop.listing_status;

      const normPropStatus = status
        ? (String(status).toUpperCase() === "SOLD" ? "SOLD" : String(status).toUpperCase() === "PENDING" ? "PENDING" : String(status).toUpperCase() === "DRAFT" ? "DRAFT" : "AVAILABLE")
        : prop.status;

      const documentArray = Array.isArray(documents)
        ? documents
        : (prop.documents_json ? safeParse(prop.documents_json, []) : []);
      const primaryDocId = document_id || prop.document_id || (documentArray[0] && (documentArray[0].id || documentArray[0].local_id || documentArray[0].document_id));

      let verificationReport = safeParse(prop.verification_report_json, null);
      let isVerified = prop.verified ? 1 : 0;
      let verificationStatus = prop.verification_status || "PENDING";

      if (primaryDocId) {
        const docRow = db.prepare("SELECT * FROM documents WHERE id = ?").get(primaryDocId);
        if (docRow && docRow.user_id === req.user.id) {
          verificationReport = verifyPropertyAgainstDocument(
            {
              id: propertyId,
              title: title ?? prop.title,
              owner_name: owner_name ?? prop.owner_name,
              survey_number: survey_number ?? prop.survey_number,
              subdivision_number: subdivision_number ?? prop.subdivision_number,
              patta_number: patta_number ?? prop.patta_number,
              location: location ?? prop.location,
              address: address ?? prop.address ?? prop.location,
              city: city ?? prop.city,
              state: state ?? prop.state,
              area: area ?? prop.area,
              area_unit: area_unit ?? prop.area_unit,
              price: price ?? prop.price,
            },
            docRow,
            req.user,
            { existingPropertyId: propertyId }
          );
          verificationStatus = verificationReport.overall_status;
          isVerified = verificationStatus === "VERIFIED" ? 1 : 0;
        }
      }

      // Strict Rule: Block publishing if verification not passed
      if (resolvedStatus === "Published") {
        if (verificationStatus !== "VERIFIED") {
          return res.status(422).json({
            error: "Property update blocked: Land document verification did not pass. " + (verificationReport ? verificationReport.message : "Please upload a valid document."),
            verification_status: verificationStatus,
            report: verificationReport,
            discrepancies: verificationReport?.discrepancies || [],
          });
        }
      }

      db.prepare(`
        UPDATE properties SET
          title = ?, location = ?, address = ?, city = ?, state = ?,
          price = ?, area = ?, area_unit = ?, built_up_area = ?,
          type = ?, image = ?, images_json = ?,
          tags = ?, description = ?, description_long = ?,
          facing = ?, road_access = ?, bedrooms = ?, bathrooms = ?,
          latitude = ?, longitude = ?, status = ?,
          listing_status = ?, documents_json = ?,
          survey_number = ?, subdivision_number = ?, patta_number = ?, owner_name = ?,
          document_id = ?, verification_status = ?, verification_report_json = ?,
          verified = ?, verified_at = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        title ?? prop.title,
        location ?? prop.location,
        address ?? prop.address ?? prop.location,
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
        latitude != null ? Number(latitude) : prop.latitude,
        longitude != null ? Number(longitude) : prop.longitude,
        normPropStatus,
        resolvedStatus,
        documents ? JSON.stringify(documents) : (prop.documents_json || "[]"),
        survey_number ?? prop.survey_number ?? "",
        subdivision_number ?? prop.subdivision_number ?? "",
        patta_number ?? prop.patta_number ?? "",
        owner_name ?? prop.owner_name ?? "",
        primaryDocId || prop.document_id,
        verificationStatus,
        verificationReport ? JSON.stringify(verificationReport) : (prop.verification_report_json || "{}"),
        isVerified,
        isVerified ? (prop.verified_at || new Date().toISOString()) : null,
        propertyId,
      );

      const updated = db.prepare("SELECT * FROM properties WHERE id = ?").get(propertyId);
      return res.json({
        success: true,
        message: "Property updated successfully.",
        property: formatProperty(updated),
        verification_report: verificationReport,
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
      const { status, listing_status } = req.body || {};

      const prop = db.prepare("SELECT * FROM properties WHERE id = ?").get(propertyId);
      if (!prop) return res.status(404).json({ error: "Property not found." });
      if (prop.seller_id !== req.user.id) {
        return res.status(403).json({ error: "You can only manage properties you listed." });
      }

      const VALID_STATUSES = ["AVAILABLE", "SOLD", "PENDING", "DRAFT"];
      let updatedStatus = prop.status;
      let updatedListingStatus = prop.listing_status;

      if (status) {
        const norm = String(status).trim().toUpperCase();
        if (!VALID_STATUSES.includes(norm)) {
          return res.status(400).json({
            error: `Invalid property status. Allowed values: ${VALID_STATUSES.join(", ")}`,
          });
        }
        updatedStatus = norm;

        if (norm === "SOLD") {
          db.prepare(
            "UPDATE properties SET status = 'SOLD', sold_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
          ).run(propertyId);
        } else if (norm === "AVAILABLE") {
          db.prepare(
            "UPDATE properties SET status = 'AVAILABLE', sold_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
          ).run(propertyId);
        } else if (norm === "PENDING") {
          db.prepare(
            "UPDATE properties SET status = 'PENDING', updated_at = CURRENT_TIMESTAMP WHERE id = ?"
          ).run(propertyId);
        } else if (norm === "DRAFT") {
          db.prepare(
            "UPDATE properties SET status = 'DRAFT', listing_status = 'Draft', updated_at = CURRENT_TIMESTAMP WHERE id = ?"
          ).run(propertyId);
          updatedListingStatus = "Draft";
        }
      }

      if (listing_status && VALID_LISTING_STATUSES.includes(listing_status)) {
        if (listing_status === "Published" && !prop.verified && prop.verification_status !== "VERIFIED") {
          return res.status(422).json({
            error: "Property cannot be published: Mandatory land document verification has not passed. Please upload and verify your land document.",
            verification_status: prop.verification_status || "NEEDS_CORRECTION",
          });
        }
        updatedListingStatus = listing_status;
        db.prepare(
          "UPDATE properties SET listing_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
        ).run(listing_status, propertyId);
      }

      const updated = db.prepare("SELECT * FROM properties WHERE id = ?").get(propertyId);
      const formatted = formatProperty(updated);

      return res.json({
        success: true,
        message: status === "SOLD" ? "Property marked as SOLD successfully." : `Property status updated to ${formatted.status}.`,
        status: formatted.status,
        listing_status: formatted.listing_status,
        sold_at: formatted.sold_at,
        property: formatted,
      });
    } catch (err) {
      console.error("Error changing property status:", err);
      return res.status(500).json({ error: "Could not change property status." });
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
