/**
 * Modular land-record validation.
 * Distinguishes format checks, internal consistency, and official verification.
 * Never claims legal validity without an authorized external data source.
 */

const REQUIRED_FIELDS = [
  "survey_number",
  "village",
  "district",
  "owner_name",
  "land_area",
];

const FIELD_LABELS = {
  survey_number: "Survey / subdivision number",
  patta_number: "Patta / reference number",
  registration_number: "Registration number",
  registration_date: "Registration date",
  land_area: "Land extent / area",
  village: "Village",
  taluk: "Taluk",
  district: "District",
  owner_name: "Owner name",
  state: "State",
  boundaries: "Boundaries",
};

function fieldValue(fields, key) {
  const entry = fields?.[key];
  if (!entry) return null;
  if (typeof entry === "string") return entry.trim() || null;
  if (typeof entry === "object" && entry.value != null) {
    const v = String(entry.value).trim();
    return v || null;
  }
  return null;
}

function formatOk(value, kind) {
  if (!value) return false;
  if (kind === "date") {
    return /^\d{1,2}[./-]\d{1,2}[./-]\d{2,4}$/.test(value);
  }
  if (kind === "survey") {
    return /[0-9]/.test(value) && value.length <= 40;
  }
  return value.length >= 2 && value.length <= 200;
}

/**
 * @param {object} options
 * @param {Record<string, any>} options.fields - extracted or approved fields
 * @param {string} [options.fullText]
 * @param {Array<{survey_number?: string, document_id?: number}>} [options.comparableRecords]
 * @param {boolean} [options.officialSourceConfigured]
 * @param {string} [options.stateRules='tamil_nadu']
 */
export function validateLandRecord({
  fields = {},
  fullText = "",
  comparableRecords = [],
  officialSourceConfigured = false,
  stateRules = "tamil_nadu",
} = {}) {
  const checks = [];
  const values = Object.fromEntries(
    Object.keys(FIELD_LABELS).map((key) => [key, fieldValue(fields, key)]),
  );

  // --- Format checks ---
  for (const key of REQUIRED_FIELDS) {
    const present = Boolean(values[key]);
    checks.push({
      id: `format.required.${key}`,
      category: "format",
      severity: present ? "pass" : "warning",
      title: `${FIELD_LABELS[key]} present`,
      detail: present
        ? `Found value: ${values[key]}`
        : `${FIELD_LABELS[key]} was not detected. Mark for manual review.`,
      evidence: values[key] || null,
    });
  }

  if (values.registration_date) {
    const ok = formatOk(values.registration_date, "date");
    checks.push({
      id: "format.registration_date",
      category: "format",
      severity: ok ? "pass" : "warning",
      title: "Registration date format",
      detail: ok
        ? "Date matches a common DD/MM/YYYY pattern."
        : "Date format looks unusual; verify manually.",
      evidence: values.registration_date,
    });
  }

  if (values.survey_number) {
    const ok = formatOk(values.survey_number, "survey");
    checks.push({
      id: "format.survey_number",
      category: "format",
      severity: ok ? "pass" : "warning",
      title: "Survey number format",
      detail: ok
        ? "Survey number contains digits and looks plausible."
        : "Survey number may be malformed.",
      evidence: values.survey_number,
    });
  }

  // --- Internal consistency ---
  if (values.village && values.district && fullText) {
    const villageInText = fullText.toLowerCase().includes(values.village.toLowerCase());
    const districtInText = fullText.toLowerCase().includes(values.district.toLowerCase());
    checks.push({
      id: "consistency.location_in_text",
      category: "consistency",
      severity: villageInText && districtInText ? "pass" : "info",
      title: "Location fields appear in source text",
      detail:
        villageInText && districtInText
          ? "Village and district strings appear in the extracted text."
          : "Extracted location fields could not be fully re-confirmed in page text.",
      evidence: { village: values.village, district: values.district },
    });
  }

  if (stateRules === "tamil_nadu") {
    const mentionsTn =
      /tamil\s*nadu|தமிழ்நாடு/i.test(fullText) ||
      /tamil\s*nadu/i.test(values.state || "");
    checks.push({
      id: "consistency.state_hint",
      category: "consistency",
      severity: mentionsTn ? "pass" : "info",
      title: "Tamil Nadu context (configurable rule set)",
      detail: mentionsTn
        ? "Document text or fields suggest Tamil Nadu context."
        : "No clear Tamil Nadu marker found. State-specific rules may not apply.",
      evidence: values.state || null,
    });
  }

  // --- Duplicate survey check among comparable user records ---
  if (values.survey_number && comparableRecords.length) {
    const duplicates = comparableRecords.filter((r) => {
      const other = String(r.survey_number || "").trim().toLowerCase();
      return other && other === values.survey_number.toLowerCase();
    });
    checks.push({
      id: "consistency.duplicate_survey",
      category: "consistency",
      severity: duplicates.length ? "warning" : "pass",
      title: "Duplicate survey / reference among your records",
      detail: duplicates.length
        ? `Same survey number appears in ${duplicates.length} other saved document(s).`
        : "No duplicate survey number found among your comparable records.",
      evidence: duplicates.map((d) => d.document_id).filter(Boolean),
    });
  }

  // --- Official verification ---
  if (officialSourceConfigured) {
    checks.push({
      id: "official.external",
      category: "official",
      severity: "info",
      title: "Official data source",
      detail:
        "An official verification connector is configured, but no live government lookup was executed for this run.",
      evidence: null,
    });
  } else {
    checks.push({
      id: "official.external",
      category: "official",
      severity: "info",
      title: "Official verification not performed",
      detail:
        "No authorized government land-record API is configured. External verification has not been performed.",
      evidence: null,
    });
  }

  const warnings = checks.filter((c) => c.severity === "warning").length;
  const fails = checks.filter((c) => c.severity === "fail").length;
  let overall_status = "needs_review";
  if (fails > 0) overall_status = "failed_checks";
  else if (warnings === 0) overall_status = "format_ok";

  const disclaimer =
    "Automated validation checks format and internal consistency only. " +
    "A successful OCR or validation result does not prove legal ownership, " +
    "clear title, fraud-free status, or official registration validity.";

  return {
    overall_status,
    checks,
    disclaimer,
    summary: {
      total: checks.length,
      pass: checks.filter((c) => c.severity === "pass").length,
      warning: warnings,
      fail: fails,
      info: checks.filter((c) => c.severity === "info").length,
    },
    official_verification_performed: false,
    state_rules: stateRules,
  };
}

export function buildValidationReportText(result, meta = {}) {
  const lines = [
    "LandAI Validation Report",
    "========================",
    `Document: ${meta.original_name || "unknown"}`,
    `Generated: ${new Date().toISOString()}`,
    `Overall status: ${result.overall_status}`,
    `State rules: ${result.state_rules}`,
    "",
    "DISCLAIMER",
    result.disclaimer,
    "",
    "CHECKS",
  ];
  for (const check of result.checks) {
    lines.push(
      `- [${check.severity.toUpperCase()}] (${check.category}) ${check.title}: ${check.detail}`,
    );
  }
  lines.push("");
  lines.push(
    `Official verification performed: ${result.official_verification_performed ? "yes" : "no"}`,
  );
  return lines.join("\n");
}
