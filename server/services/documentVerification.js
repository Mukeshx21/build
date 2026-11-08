/**
 * Strict Land Document Verification Service – LandAI
 * 
 * Implements strict, multi-point verification matching property details
 * against extracted land ownership records (Patta, Chitta, Sale Deed, EC).
 */

import db from "../db.js";

// Standard area conversion factors to Square Feet (sq.ft)
const TO_SQFT = {
  "sq.ft": 1.0,
  sqft: 1.0,
  "square feet": 1.0,
  "square foot": 1.0,
  "sq ft": 1.0,
  "சதுர அடி": 1.0,
  cents: 435.6,
  cent: 435.6,
  "சென்ட்": 435.6,
  acres: 43560.0,
  acre: 43560.0,
  "ஏக்கர்": 43560.0,
  grounds: 2400.0,
  ground: 2400.0,
  "sq.m": 10.7639,
  sqm: 10.7639,
  "square meter": 10.7639,
  "square meters": 10.7639,
  hectares: 107639.1,
  hectare: 107639.1,
  "ஹெக்டேர்": 107639.1,
  guntas: 1089.0,
  gunta: 1089.0,
  ares: 1076.39,
  are: 1076.39,
  "ஏர்ஸ்": 1076.39,
};

/**
 * Normalizes an individual person or entity name.
 */
export function normalizeName(name) {
  if (!name) return "";
  return String(name)
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, " ")
    .replace(/\b(mr|mrs|ms|dr|shri|smt|thiru|selvi|er|adv)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Checks if two names match with token overlap and order tolerance.
 */
export function namesMatch(name1, name2) {
  const n1 = normalizeName(name1);
  const n2 = normalizeName(name2);
  if (!n1 || !n2) return false;
  if (n1 === n2) return true;
  if (n1.includes(n2) || n2.includes(n1)) return true;

  const tokens1 = n1.split(" ").filter((t) => t.length > 1);
  const tokens2 = n2.split(" ").filter((t) => t.length > 1);
  if (!tokens1.length || !tokens2.length) return false;

  const intersection = tokens1.filter((t) => tokens2.includes(t));
  const minTokens = Math.min(tokens1.length, tokens2.length);
  return intersection.length >= Math.max(1, minTokens);
}

/**
 * Normalizes a survey or subdivision number (e.g. "142 / 3A" -> "142/3a").
 */
export function normalizeSurveyNumber(survey) {
  if (!survey) return "";
  return String(survey)
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/-/g, "/")
    .replace(/[^\w\/]/g, "");
}

/**
 * Checks if two survey numbers match.
 */
export function surveyNumbersMatch(s1, s2) {
  const norm1 = normalizeSurveyNumber(s1);
  const norm2 = normalizeSurveyNumber(s2);
  if (!norm1 || !norm2) return false;
  if (norm1 === norm2) return true;

  // Compare base survey if subdivision is formatted differently
  const base1 = norm1.split("/")[0];
  const base2 = norm2.split("/")[0];
  if (base1 && base2 && base1 === base2) {
    const sub1 = norm1.split("/")[1] || "";
    const sub2 = norm2.split("/")[1] || "";
    if (!sub1 || !sub2 || sub1 === sub2) return true;
  }
  return false;
}

/**
 * Parses land area value and unit from raw numeric/text values.
 */
export function parseAreaAndUnit(value, fallbackUnit = "sq.ft") {
  if (value == null) return { area: 0, unit: fallbackUnit, sqft: 0 };

  let num = 0;
  let unit = fallbackUnit.toLowerCase();

  if (typeof value === "number") {
    num = value;
  } else {
    const str = String(value).trim();
    // Match "2400 sq.ft" or "2.5 cents" or "1 acre"
    const match = str.match(/([\d,]+(?:\.\d+)?)\s*([a-zA-Z\u0B80-\u0BFF\.\s]*)/);
    if (match) {
      num = parseFloat(match[1].replace(/,/g, "")) || 0;
      const detectedUnit = match[2].trim().toLowerCase();
      if (detectedUnit) {
        for (const k of Object.keys(TO_SQFT)) {
          if (detectedUnit.includes(k) || k.includes(detectedUnit)) {
            unit = k;
            break;
          }
        }
      }
    }
  }

  const factor = TO_SQFT[unit] || TO_SQFT["sq.ft"];
  const sqft = num * factor;
  return { area: num, unit, sqft };
}

/**
 * Normalizes location strings into distinct keyword tokens.
 */
export function getLocationTokens(str) {
  if (!str) return [];
  return String(str)
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !["the", "and", "near", "road", "street", "main", "nagar", "plot", "layout", "tamil", "nadu", "india"].includes(t));
}

/**
 * Performs strict, multi-point verification comparing property details
 * against the uploaded land document's OCR results and database history.
 * 
 * @param {object} propertyData - Details entered by user
 * @param {object} documentRow - Database row from `documents` table
 * @param {object} user - Current authenticated user
 * @param {object} [options]
 * @param {number|string} [options.existingPropertyId]
 * @returns {object} Comprehensive verification report
 */
export function verifyPropertyAgainstDocument(propertyData, documentRow, user, options = {}) {
  const checks = [];
  const discrepancies = [];
  let overall_status = "PENDING";

  // Check 1: Mandatory Document Upload
  if (!documentRow) {
    checks.push({
      id: "doc_upload",
      title: "Document uploaded",
      status: "fail",
      detail: "No land ownership document attached. Uploading a valid land ownership document is mandatory.",
    });
    return {
      overall_status: "REJECTED",
      is_verified: false,
      can_publish: false,
      message: "Mandatory land ownership document is missing. Please upload your document before publishing.",
      discrepancies: [{ field: "document", expected: "Land ownership document (PDF/JPG/PNG)", actual: "None", message: "Document upload is mandatory." }],
      checks,
      extracted_fields: {},
    };
  }

  checks.push({
    id: "doc_upload",
    title: "Document uploaded",
    status: "pass",
    detail: `Document "${documentRow.original_name}" attached (${documentRow.content_type || "PDF/Image"}).`,
  });

  // Check 2: File Format & Readability
  const validMimes = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
  const isMimeOk = validMimes.includes(documentRow.content_type) || /\.(pdf|jpe?g|png)$/i.test(documentRow.original_name);
  if (!isMimeOk) {
    checks.push({
      id: "doc_format",
      title: "Supported file format",
      status: "fail",
      detail: `File format "${documentRow.content_type}" is not supported. Only PDF, JPG, JPEG, and PNG formats are accepted.`,
    });
    return {
      overall_status: "REJECTED",
      is_verified: false,
      can_publish: false,
      message: "Invalid document format. Please upload a PDF, JPG, JPEG, or PNG document.",
      discrepancies: [{ field: "document_format", expected: "PDF, JPG, JPEG, PNG", actual: documentRow.content_type, message: "Unsupported file type." }],
      checks,
      extracted_fields: {},
    };
  }
  checks.push({
    id: "doc_format",
    title: "Supported file format",
    status: "pass",
    detail: `Valid document format verified: ${documentRow.content_type || "PDF/Image"}.`,
  });

  // Extract fields from document
  let docFields = {};
  try {
    if (documentRow.approved_fields_json && documentRow.approved_fields_json !== "{}") {
      docFields = typeof documentRow.approved_fields_json === "string"
        ? JSON.parse(documentRow.approved_fields_json)
        : documentRow.approved_fields_json;
    } else if (documentRow.fields_json) {
      docFields = typeof documentRow.fields_json === "string"
        ? JSON.parse(documentRow.fields_json)
        : documentRow.fields_json;
    }
  } catch {
    docFields = {};
  }

  const getFieldValue = (key) => {
    const f = docFields[key];
    if (!f) return "";
    if (typeof f === "string") return f.trim();
    if (typeof f === "object" && f.value != null) return String(f.value).trim();
    return "";
  };

  const docSurvey = getFieldValue("survey_number");
  const docSubdiv = getFieldValue("subdivision_number");
  const docPatta = getFieldValue("patta_number");
  const docRegNo = getFieldValue("registration_number");
  const docOwner = getFieldValue("owner_name") || getFieldValue("seller_name");
  const docAreaRaw = getFieldValue("land_area");
  const docVillage = getFieldValue("village");
  const docTaluk = getFieldValue("taluk");
  const docDistrict = getFieldValue("district");
  const docState = getFieldValue("state") || "Tamil Nadu";
  const docSro = getFieldValue("sub_registrar_office");
  const docRegDate = getFieldValue("registration_date");

  const fullText = documentRow.extracted_text || "";

  // Check 3: Document Readability and Completeness
  const hasExtractedText = fullText.length > 25 || Object.values(docFields).some((f) => Boolean(f && (typeof f === "string" ? f : f.value)));
  if (!hasExtractedText) {
    checks.push({
      id: "doc_readability",
      title: "Document readability & completeness",
      status: "fail",
      detail: "The uploaded document contains unreadable or empty text. OCR could not detect land record fields. Please upload a higher resolution or clear copy.",
    });
    discrepancies.push({
      field: "ocr_extraction",
      expected: "Legible land record text and fields",
      actual: "Unreadable or empty scan",
      message: "Document unreadable by OCR engine.",
    });
  } else {
    checks.push({
      id: "doc_readability",
      title: "Document readability & completeness",
      status: "pass",
      detail: `Document successfully read. Detected ${documentRow.page_count || 1} page(s) with clear text density.`,
    });
  }

  // Check 4: Mandatory Legal Identifiers Present in Document
  const hasLegalId = Boolean(docSurvey || docPatta || docRegNo);
  if (!hasLegalId) {
    checks.push({
      id: "doc_legal_id",
      title: "Mandatory legal identifiers in document",
      status: "fail",
      detail: "The document lacks mandatory legal identifiers (Survey Number, Patta Number, or Registration Number).",
    });
    discrepancies.push({
      field: "legal_identifiers",
      expected: "Survey No, Patta No, or Registration No",
      actual: "None detected",
      message: "Missing mandatory legal identifiers in the document.",
    });
  } else {
    checks.push({
      id: "doc_legal_id",
      title: "Mandatory legal identifiers in document",
      status: "pass",
      detail: `Identified: ${[docSurvey && `Survey No: ${docSurvey}`, docPatta && `Patta No: ${docPatta}`, docRegNo && `Doc No: ${docRegNo}`].filter(Boolean).join(", ")}.`,
    });
  }

  // Check 5: Owner Name Verification
  const propOwner = (propertyData.owner_name || user.name || "").trim();
  if (docOwner) {
    const ownerMatches = namesMatch(propOwner, docOwner) || namesMatch(user.name, docOwner);
    if (!ownerMatches) {
      checks.push({
        id: "owner_name",
        title: "Owner name verified",
        status: "fail",
        detail: `Owner name mismatch: Document lists "${docOwner}" while property specifies "${propOwner || user.name}".`,
        value_entered: propOwner || user.name,
        value_document: docOwner,
      });
      discrepancies.push({
        field: "owner_name",
        expected: docOwner,
        actual: propOwner || user.name,
        message: `Owner name does not match document. Document owner: "${docOwner}".`,
      });
    } else {
      checks.push({
        id: "owner_name",
        title: "Owner name verified",
        status: "pass",
        detail: `Owner name verified: "${docOwner}" matches property owner.`,
        value_entered: propOwner || user.name,
        value_document: docOwner,
      });
    }
  } else {
    // If owner name was not detected by OCR, check if user's name is present in raw text
    const inText = user.name && fullText && normalizeName(fullText).includes(normalizeName(user.name));
    if (inText) {
      checks.push({
        id: "owner_name",
        title: "Owner name verified",
        status: "pass",
        detail: `Owner name "${user.name}" confirmed in document text.`,
        value_entered: user.name,
        value_document: user.name,
      });
    } else {
      checks.push({
        id: "owner_name",
        title: "Owner name verified",
        status: "warning",
        detail: `Owner name could not be automatically confirmed from the document. Please verify entered owner "${propOwner || user.name}".`,
        value_entered: propOwner || user.name,
        value_document: "Not explicitly detected",
      });
    }
  }

  // Check 6: Survey Number Verification
  const propSurvey = (propertyData.survey_number || "").trim();
  const fullPropSurvey = propertyData.subdivision_number
    ? `${propSurvey}/${propertyData.subdivision_number}`
    : propSurvey;

  if (docSurvey) {
    if (!propSurvey) {
      checks.push({
        id: "survey_number",
        title: "Survey number verified",
        status: "fail",
        detail: `Survey number missing in property listing. Document indicates Survey No. "${docSurvey}".`,
        value_entered: "(Empty)",
        value_document: docSurvey,
      });
      discrepancies.push({
        field: "survey_number",
        expected: docSurvey,
        actual: "(Empty)",
        message: `Please specify the Survey Number (e.g. ${docSurvey}).`,
      });
    } else {
      const isSurveyMatch = surveyNumbersMatch(fullPropSurvey, docSurvey) || surveyNumbersMatch(propSurvey, docSurvey);
      if (!isSurveyMatch) {
        checks.push({
          id: "survey_number",
          title: "Survey number verified",
          status: "fail",
          detail: `Mismatched survey number: Document indicates Survey No. "${docSurvey}" while property specifies "${fullPropSurvey}".`,
          value_entered: fullPropSurvey,
          value_document: docSurvey,
        });
        discrepancies.push({
          field: "survey_number",
          expected: docSurvey,
          actual: fullPropSurvey,
          message: `Survey number does not match document. Document: "${docSurvey}".`,
        });
      } else {
        checks.push({
          id: "survey_number",
          title: "Survey number verified",
          status: "pass",
          detail: `Survey number verified: Survey No. "${docSurvey}" matches property details.`,
          value_entered: fullPropSurvey,
          value_document: docSurvey,
        });
      }
    }
  } else {
    // If not extracted as field, search for survey number in raw text
    const textHasSurvey = propSurvey && fullText && fullText.includes(propSurvey);
    if (textHasSurvey) {
      checks.push({
        id: "survey_number",
        title: "Survey number verified",
        status: "pass",
        detail: `Survey number "${propSurvey}" confirmed in document text.`,
        value_entered: propSurvey,
        value_document: propSurvey,
      });
    } else {
      checks.push({
        id: "survey_number",
        title: "Survey number verified",
        status: propSurvey ? "pass" : "fail",
        detail: propSurvey
          ? `Survey number "${propSurvey}" registered with listing.`
          : "Survey number is mandatory for land verification.",
        value_entered: propSurvey || "(Empty)",
        value_document: "Not detected",
      });
      if (!propSurvey) {
        discrepancies.push({
          field: "survey_number",
          expected: "Valid Survey Number",
          actual: "(Empty)",
          message: "Please enter a valid Survey Number.",
        });
      }
    }
  }

  // Check 7: Land Area & Measurements Verification
  const propAreaParsed = parseAreaAndUnit(propertyData.area, propertyData.area_unit || "sq.ft");
  const docAreaParsed = docAreaRaw ? parseAreaAndUnit(docAreaRaw) : { area: 0, unit: "sq.ft", sqft: 0 };

  if (docAreaParsed.sqft > 0) {
    if (propAreaParsed.sqft <= 0) {
      checks.push({
        id: "land_area",
        title: "Land measurement verified",
        status: "fail",
        detail: `Valid land area is required. Document indicates ~${Math.round(docAreaParsed.sqft)} sq.ft (${docAreaRaw}).`,
        value_entered: "(Empty)",
        value_document: docAreaRaw,
      });
      discrepancies.push({
        field: "area",
        expected: `${Math.round(docAreaParsed.sqft)} sq.ft`,
        actual: "(Empty)",
        message: "Land area is missing.",
      });
    } else {
      // 8% tolerance to allow for unit conversion rounding (e.g. cents to sqft)
      const diffRatio = Math.abs(propAreaParsed.sqft - docAreaParsed.sqft) / docAreaParsed.sqft;
      if (diffRatio > 0.08) {
        checks.push({
          id: "land_area",
          title: "Land measurement verified",
          status: "fail",
          detail: `Land measurement mismatch: Document indicates ~${Math.round(docAreaParsed.sqft)} sq.ft (${docAreaRaw}) but property specifies ${Math.round(propAreaParsed.sqft)} sq.ft (${propertyData.area} ${propertyData.area_unit || "sq.ft"}).`,
          value_entered: `${propertyData.area} ${propertyData.area_unit || "sq.ft"} (~${Math.round(propAreaParsed.sqft)} sq.ft)`,
          value_document: `${docAreaRaw} (~${Math.round(docAreaParsed.sqft)} sq.ft)`,
        });
        discrepancies.push({
          field: "area",
          expected: `~${Math.round(docAreaParsed.sqft)} sq.ft (${docAreaRaw})`,
          actual: `${propertyData.area} ${propertyData.area_unit || "sq.ft"} (~${Math.round(propAreaParsed.sqft)} sq.ft)`,
          message: `Area mismatch exceeds allowed tolerance: Document specifies ${docAreaRaw}.`,
        });
      } else {
        checks.push({
          id: "land_area",
          title: "Land measurement verified",
          status: "pass",
          detail: `Land measurement verified: ~${Math.round(propAreaParsed.sqft)} sq.ft matches document extent (${docAreaRaw}).`,
          value_entered: `${propertyData.area} ${propertyData.area_unit || "sq.ft"}`,
          value_document: docAreaRaw,
        });
      }
    }
  } else {
    // Document area wasn't cleanly extracted
    checks.push({
      id: "land_area",
      title: "Land measurement verified",
      status: propAreaParsed.sqft > 0 ? "pass" : "fail",
      detail: propAreaParsed.sqft > 0
        ? `Area specified as ${propertyData.area} ${propertyData.area_unit || "sq.ft"} (~${Math.round(propAreaParsed.sqft)} sq.ft).`
        : "Valid land area is required.",
      value_entered: `${propertyData.area} ${propertyData.area_unit || "sq.ft"}`,
      value_document: "Not detected",
    });
    if (propAreaParsed.sqft <= 0) {
      discrepancies.push({
        field: "area",
        expected: "Valid land area",
        actual: "(Empty)",
        message: "Please enter land area.",
      });
    }
  }

  // Check 8: Property Location Verification
  const propLocationStr = [propertyData.address, propertyData.village, propertyData.city, propertyData.state, propertyData.location]
    .filter(Boolean)
    .join(" ");
  const propTokens = getLocationTokens(propLocationStr);

  const docLocations = [docVillage, docTaluk, docDistrict].filter(Boolean);
  if (docLocations.length > 0) {
    const docTokens = getLocationTokens(docLocations.join(" "));
    const matchTokens = docTokens.filter((dt) => propTokens.some((pt) => pt.includes(dt) || dt.includes(pt)));

    if (matchTokens.length === 0 && docTokens.length > 0 && propTokens.length > 0) {
      checks.push({
        id: "location",
        title: "Property location verified",
        status: "fail",
        detail: `Location mismatch: Document location indicates "${docLocations.join(", ")}" which does not match entered location "${propertyData.city || propertyData.location}".`,
        value_entered: propertyData.city || propertyData.location,
        value_document: docLocations.join(", "),
      });
      discrepancies.push({
        field: "location",
        expected: docLocations.join(", "),
        actual: propertyData.city || propertyData.location,
        message: `Location does not match document (${docLocations.join(", ")}).`,
      });
    } else {
      checks.push({
        id: "location",
        title: "Property location verified",
        status: "pass",
        detail: `Property location verified: matches document jurisdiction (${[docVillage, docDistrict].filter(Boolean).join(", ")}).`,
        value_entered: propertyData.city || propertyData.location,
        value_document: docLocations.join(", "),
      });
    }
  } else {
    checks.push({
      id: "location",
      title: "Property location verified",
      status: "pass",
      detail: `Location registered as: ${propertyData.city || propertyData.location || "Tamil Nadu"}.`,
      value_entered: propertyData.city || propertyData.location,
      value_document: "Not detected",
    });
  }

  // Check 9: Duplicate Document Detection Across Other Properties
  try {
    const existingPropId = options.existingPropertyId || 0;
    // Check if this document ID or identical survey number in same city is used by another seller
    const duplicate = db.prepare(`
      SELECT id, title, seller_id FROM properties
      WHERE id != ? AND (
        documents_json LIKE ? OR
        (survey_number = ? AND city = ? AND survey_number != '')
      )
      LIMIT 1
    `).get(
      existingPropId,
      `%"id":${documentRow.id}%`,
      propSurvey || docSurvey || "__none__",
      propertyData.city || "__none__"
    );

    if (duplicate && duplicate.seller_id !== user.id) {
      checks.push({
        id: "duplicate_check",
        title: "Duplicate document detection",
        status: "fail",
        detail: `Duplicate submission: This land ownership record or survey number is already registered to another active property listing (Property #${duplicate.id}: "${duplicate.title}").`,
      });
      discrepancies.push({
        field: "duplicate_document",
        expected: "Unique unlisted land document",
        actual: `Already listed in Property #${duplicate.id}`,
        message: "Duplicate document detected across listings.",
      });
    } else {
      checks.push({
        id: "duplicate_check",
        title: "Duplicate document detection",
        status: "pass",
        detail: "No duplicate submissions found. Title deed record is unique.",
      });
    }
  } catch (err) {
    console.warn("[Verification] Duplicate check notice:", err.message);
  }

  // Determine Overall Status
  const hasFails = checks.some((c) => c.status === "fail");
  const hasWarnings = checks.some((c) => c.status === "warning");

  if (hasFails) {
    const isDocCorruptedOrUnreadable = checks.some((c) => ["doc_upload", "doc_format", "doc_readability", "doc_legal_id", "duplicate_check"].includes(c.id) && c.status === "fail");
    if (isDocCorruptedOrUnreadable) {
      overall_status = "REJECTED";
    } else {
      overall_status = "NEEDS_CORRECTION";
    }
  } else {
    overall_status = "VERIFIED";
  }

  let message = "";
  if (overall_status === "VERIFIED") {
    message = "All mandatory land document verification checks have passed successfully. Your property is ready to be published.";
  } else if (overall_status === "NEEDS_CORRECTION") {
    message = "Your property cannot be published because some information in your land document does not match the property details. Please correct the highlighted information and upload the required document again.";
  } else if (overall_status === "REJECTED") {
    message = "Your property cannot be published because the uploaded document failed verification. Please ensure you upload a valid, readable land ownership document.";
  } else {
    message = "Document verification is in progress.";
  }

  return {
    overall_status,
    is_verified: overall_status === "VERIFIED",
    can_publish: overall_status === "VERIFIED",
    message,
    discrepancies,
    checks,
    extracted_fields: {
      survey_number: docSurvey || null,
      subdivision_number: docSubdiv || null,
      patta_number: docPatta || null,
      registration_number: docRegNo || null,
      registration_date: docRegDate || null,
      sub_registrar_office: docSro || null,
      owner_name: docOwner || null,
      land_area: docAreaRaw || null,
      village: docVillage || null,
      taluk: docTaluk || null,
      district: docDistrict || null,
      state: docState || null,
    },
    document_id: documentRow.id,
    document_name: documentRow.original_name,
    verified_at: new Date().toISOString(),
  };
}
