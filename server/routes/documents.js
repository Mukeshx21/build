import { Router } from "express";
import multer from "multer";
import db, { logHistory } from "../db.js";
import { authenticate } from "../middleware/auth.js";
import { ocrFetch, OcrUpstreamError } from "../services/ocrClient.js";
import {
  validateLandRecord,
  buildValidationReportText,
} from "../services/validation.js";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    const allowed = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
    ];
    const extOk = /\.(pdf|jpe?g|png)$/i.test(file.originalname || "");
    if (allowed.includes(file.mimetype) || extOk) {
      cb(null, true);
    } else {
      cb(new Error("Supported formats are PDF, JPG, JPEG, and PNG"));
    }
  },
});

function handleOcrError(err, res) {
  if (err instanceof OcrUpstreamError) {
    return res.status(err.status >= 400 && err.status < 600 ? err.status : 502).json({
      error: err.status >= 500 ? "The OCR service is currently unavailable. Please ensure the Python OCR service is running on port 8000 (run 'npm run ocr' or 'npm run dev:all')." : err.message,
    });
  }
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: "File exceeds the 50 MB limit." });
    }
    return res.status(400).json({ error: err.message });
  }
  console.error("Document route error:", err);
  return res.status(500).json({ error: "Document processing failed. Please try again." });
}

function mapDocumentRow(row) {
  return {
    id: row.id,
    ocr_document_id: row.ocr_document_id,
    original_name: row.original_name,
    document_type: row.document_type || "unknown",
    content_type: row.content_type,
    language: row.language,
    status: row.status,
    page_count: row.page_count,
    warning: row.warning || "",
    fields: safeParse(row.fields_json, {}),
    approved_fields: safeParse(row.approved_fields_json, {}),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function getOwnedDocument(userId, idOrOcrId) {
  if (idOrOcrId === undefined || idOrOcrId === null || idOrOcrId === "") return null;
  const num = Number(idOrOcrId);
  if (!Number.isNaN(num) && Number.isInteger(num) && num > 0) {
    const byPk = db
      .prepare("SELECT * FROM documents WHERE id = ? AND user_id = ?")
      .get(num, userId);
    if (byPk) return byPk;
  }
  return db
    .prepare("SELECT * FROM documents WHERE ocr_document_id = ? AND user_id = ?")
    .get(String(idOrOcrId), userId);
}

router.get("/health/ocr", authenticate, async (_req, res) => {
  try {
    const { data } = await ocrFetch("/api/ocr/health", { timeoutMs: 5000 });
    return res.json(data);
  } catch (err) {
    return handleOcrError(err, res);
  }
});

router.get("/", authenticate, (req, res) => {
  const rows = db
    .prepare(
      `SELECT * FROM documents WHERE user_id = ? ORDER BY id DESC LIMIT 100`,
    )
    .all(req.user.id);
  return res.json({ documents: rows.map(mapDocumentRow) });
});

router.get("/history", authenticate, (req, res) => {
  const rows = db
    .prepare(
      `SELECT h.*, d.original_name
       FROM processing_history h
       LEFT JOIN documents d ON d.id = h.document_id
       WHERE h.user_id = ?
       ORDER BY h.id DESC
       LIMIT 100`,
    )
    .all(req.user.id);
  return res.json({ history: rows });
});

router.post(
  "/upload",
  authenticate,
  (req, res, next) => {
    upload.single("file")(req, res, (err) => {
      if (err) return handleOcrError(err, res);
      next();
    });
  },
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "A document file is required." });
      }
      const language = String(req.body.language || "ta-en");
      const form = new FormData();
      const blob = new Blob([req.file.buffer], { type: req.file.mimetype });
      form.append("file", blob, req.file.originalname);
      form.append("language", language);

      const { data } = await ocrFetch(`/api/ocr/upload?language=${encodeURIComponent(language)}`, {
        method: "POST",
        body: form,
        timeoutMs: 60000,
      });

      const insert = db.prepare(`
        INSERT INTO documents (user_id, ocr_document_id, original_name, document_type, content_type, language, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      const result = insert.run(
        req.user.id,
        data.document_id,
        req.file.originalname,
        String(req.body.document_type || "unknown").slice(0, 60),
        req.file.mimetype,
        language,
        "uploaded",
      );
      logHistory(req.user.id, "upload", req.file.originalname, Number(result.lastInsertRowid));

      const localId = Number(result.lastInsertRowid);
      return res.status(201).json({
        id: localId,
        local_id: localId,
        document_id: localId,
        ocr_document_id: data.document_id,
        document_type: String(req.body.document_type || "unknown"),
        filename: req.file.originalname,
        size: req.file.size,
        status: "uploaded",
      });
    } catch (err) {
      return handleOcrError(err, res);
    }
  },
);

router.post("/process", authenticate, async (req, res) => {
  try {
    const documentId =
      req.body?.document_id ??
      req.body?.documentId ??
      req.body?.id ??
      req.body?.local_id ??
      req.query?.document_id ??
      req.query?.id;

    if (documentId === undefined || documentId === null || documentId === "") {
      return res.status(400).json({ error: "document_id is required." });
    }
    const owned = getOwnedDocument(req.user.id, documentId);
    if (!owned) {
      return res.status(404).json({ error: "Document not found." });
    }

    db.prepare(
      "UPDATE documents SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    ).run("processing", owned.id);

    const { data } = await ocrFetch("/api/ocr/process", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ document_id: owned.ocr_document_id }),
      timeoutMs: 180000,
    });

    db.prepare(
      `UPDATE documents
       SET status = ?, page_count = ?, warning = ?, fields_json = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
    ).run(
      data.status || "complete",
      data.page_count || 0,
      data.warning || "",
      JSON.stringify(data.fields || {}),
      owned.id,
    );
    if (data.document_type) {
      db.prepare("UPDATE documents SET document_type = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .run(String(data.document_type).slice(0, 60), owned.id);
    }
    logHistory(req.user.id, "ocr_process", owned.original_name, owned.id);

    return res.json({
      ...data,
      id: owned.id,
      document_id: owned.id,
      local_id: owned.id,
      ocr_document_id: owned.ocr_document_id,
      original_name: data.original_name || owned.original_name,
    });
  } catch (err) {
    return handleOcrError(err, res);
  }
});

router.post("/compare", authenticate, (req, res) => {
  const ids = Array.isArray(req.body?.document_ids) ? req.body.document_ids : [];
  const uniqueIds = [...new Set(ids.map(Number).filter(Number.isInteger))];
  if (uniqueIds.length < 2 || uniqueIds.length > 10) {
    return res.status(400).json({ error: "Select between 2 and 10 documents to compare." });
  }
  const placeholders = uniqueIds.map(() => "?").join(",");
  const rows = db.prepare(
    `SELECT * FROM documents WHERE user_id = ? AND id IN (${placeholders})`,
  ).all(req.user.id, ...uniqueIds);
  if (rows.length !== uniqueIds.length) {
    return res.status(404).json({ error: "One or more selected documents were not found." });
  }
  const keys = ["owner_name", "seller_name", "buyer_name", "survey_number", "village", "district", "land_area"];
  const comparisons = keys.map((key) => {
    const values = rows.map((row) => {
      const fields = { ...safeParse(row.fields_json, {}), ...safeParse(row.approved_fields_json, {}) };
      const entry = fields[key];
      return typeof entry === "object" && entry ? entry.value || null : entry || null;
    });
    const normalized = values.filter(Boolean).map((value) => String(value).trim().toLowerCase());
    return {
      field: key,
      values,
      status: !normalized.length ? "not_found" : new Set(normalized).size === 1 ? "consistent" : "review",
    };
  });
  return res.json({
    document_ids: uniqueIds,
    documents: rows.map(mapDocumentRow),
    comparisons,
    disclaimer: "Comparison identifies differences in extracted text; it does not establish authenticity or legal ownership.",
  });
});

router.get("/:id", authenticate, async (req, res) => {
  try {
    const owned = getOwnedDocument(req.user.id, req.params.id);
    if (!owned) {
      return res.status(404).json({ error: "Document not found." });
    }
    const { data } = await ocrFetch(`/api/ocr/document/${owned.ocr_document_id}`);
    return res.json({
      ...data,
      document_id: owned.ocr_document_id,
      local_id: owned.id,
      meta: mapDocumentRow(owned),
    });
  } catch (err) {
    return handleOcrError(err, res);
  }
});

router.put(
  "/:id/corrections",
  authenticate,
  async (req, res) => {
    try {
      const owned = getOwnedDocument(req.user.id, req.params.id);
      if (!owned) {
        return res.status(404).json({ error: "Document not found." });
      }
      const pages = req.body?.pages;
      if (!pages || typeof pages !== "object") {
        return res.status(400).json({ error: "pages object is required." });
      }
      const { data } = await ocrFetch(
        `/api/ocr/document/${owned.ocr_document_id}/corrections`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pages }),
        },
      );
      db.prepare(
        `UPDATE documents SET fields_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      ).run(JSON.stringify(data.fields || {}), owned.id);
      logHistory(req.user.id, "corrections_saved", owned.original_name, owned.id);
      return res.json({
        ...data,
        document_id: owned.ocr_document_id,
        local_id: owned.id,
      });
    } catch (err) {
      return handleOcrError(err, res);
    }
  },
);

router.put(
  "/:id/fields",
  authenticate,
  (req, res) => {
    const owned = getOwnedDocument(req.user.id, req.params.id);
    if (!owned) {
      return res.status(404).json({ error: "Document not found." });
    }
    const approved = req.body?.approved_fields;
    if (!approved || typeof approved !== "object") {
      return res.status(400).json({ error: "approved_fields object is required." });
    }
    db.prepare(
      `UPDATE documents SET approved_fields_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    ).run(JSON.stringify(approved), owned.id);
    logHistory(req.user.id, "fields_approved", owned.original_name, owned.id);
    return res.json({
      success: true,
      approved_fields: approved,
      local_id: owned.id,
    });
  },
);

router.post(
  "/:id/validate",
  authenticate,
  async (req, res) => {
    try {
      const owned = getOwnedDocument(req.user.id, req.params.id);
      if (!owned) {
        return res.status(404).json({ error: "Document not found." });
      }

      const { data } = await ocrFetch(`/api/ocr/document/${owned.ocr_document_id}`);
      const approved = safeParse(owned.approved_fields_json, {});
      const fields = Object.keys(approved).length ? approved : data.fields || {};
      const fullText = (data.pages || []).map((p) => p.text).join("\n");

      const otherDocs = db
        .prepare(
          `SELECT id, fields_json, approved_fields_json FROM documents
           WHERE user_id = ? AND id != ?`,
        )
        .all(req.user.id, owned.id);

      const comparableRecords = otherDocs
        .map((row) => {
          const f = {
            ...safeParse(row.fields_json, {}),
            ...safeParse(row.approved_fields_json, {}),
          };
          const survey =
            f.survey_number?.value || f.survey_number || null;
          return survey
            ? { document_id: row.id, survey_number: String(survey) }
            : null;
        })
        .filter(Boolean);

      const result = validateLandRecord({
        fields,
        fullText,
        comparableRecords,
        officialSourceConfigured: Boolean(
          process.env.OFFICIAL_LAND_API_URL,
        ),
        stateRules: process.env.LAND_VALIDATION_STATE || "tamil_nadu",
      });

      const insert = db.prepare(`
        INSERT INTO validation_results (document_id, user_id, overall_status, checks_json, disclaimer)
        VALUES (?, ?, ?, ?, ?)
      `);
      const info = insert.run(
        owned.id,
        req.user.id,
        result.overall_status,
        JSON.stringify(result.checks),
        result.disclaimer,
      );
      logHistory(req.user.id, "validation", result.overall_status, owned.id);

      return res.json({
        validation_id: Number(info.lastInsertRowid),
        local_id: owned.id,
        document_id: owned.ocr_document_id,
        original_name: owned.original_name,
        ...result,
      });
    } catch (err) {
      return handleOcrError(err, res);
    }
  },
);

router.get(
  "/:id/validation/report",
  authenticate,
  async (req, res) => {
    try {
      const owned = getOwnedDocument(req.user.id, req.params.id);
      if (!owned) {
        return res.status(404).json({ error: "Document not found." });
      }
      const latest = db
        .prepare(
          `SELECT * FROM validation_results
           WHERE document_id = ? AND user_id = ?
           ORDER BY id DESC LIMIT 1`,
        )
        .get(owned.id, req.user.id);
      if (!latest) {
        return res.status(404).json({
          error: "No validation result found. Run validation first.",
        });
      }
      const result = {
        overall_status: latest.overall_status,
        checks: safeParse(latest.checks_json, []),
        disclaimer: latest.disclaimer,
        official_verification_performed: false,
        state_rules: process.env.LAND_VALIDATION_STATE || "tamil_nadu",
      };
      const text = buildValidationReportText(result, {
        original_name: owned.original_name,
      });
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="landai-validation-${owned.id}.txt"`,
      );
      return res.send(text);
    } catch (err) {
      return handleOcrError(err, res);
    }
  },
);

router.get(
  "/:id/export/:format",
  authenticate,
  async (req, res) => {
    try {
      const owned = getOwnedDocument(req.user.id, req.params.id);
      if (!owned) {
        return res.status(404).json({ error: "Document not found." });
      }
      const format = req.params.format;
      if (!["txt", "json", "pdf", "docx"].includes(format)) {
        return res.status(400).json({ error: "Unsupported export format." });
      }
      const kind = req.query.kind ? `?kind=${encodeURIComponent(String(req.query.kind))}` : "";
      const { data, response } = await ocrFetch(
        `/api/ocr/document/${owned.ocr_document_id}/export/${format}${kind}`,
        { asBuffer: true, timeoutMs: 120000 },
      );
      const contentType =
        response.headers.get("content-type") || "application/octet-stream";
      const disposition =
        response.headers.get("content-disposition") ||
        `attachment; filename="landai-export.${format}"`;
      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Disposition", disposition);
      return res.send(data);
    } catch (err) {
      return handleOcrError(err, res);
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
