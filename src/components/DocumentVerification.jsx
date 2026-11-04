import React, { useState, useEffect, useRef } from 'react';
import { apiUrl } from '../services/api';
import {
  UploadCloud,
  FileText,
  FileCheck2,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  FileCode,
  Download,
  Layers,
  ArrowRight,
  Info,
  Scale,
  Calendar,
  User,
  MapPin,
  Maximize2,
  Eye,
  Trash2
} from 'lucide-react';

export default function DocumentVerification({ user, onOpenAuth }) {
  const fileInputRef = useRef(null);

  // Upload state
  const [selectedFile, setSelectedFile] = useState(null);
  const [docType, setDocType] = useState('patta');
  const [docLanguage, setDocLanguage] = useState('ta-en');
  const [uploadProgress, setUploadProgress] = useState(0);

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStep, setProcessStep] = useState('');
  const [error, setError] = useState('');

  // Results state
  const [activeDocument, setActiveDocument] = useState(null);
  const [activeOcrResult, setActiveOcrResult] = useState(null);
  const [validationResult, setValidationResult] = useState(null);
  const [selectedPageIdx, setSelectedPageIdx] = useState(0);

  // History & Comparison
  const [history, setHistory] = useState([]);
  const [selectedForComparison, setSelectedForComparison] = useState([]);
  const [comparisonResult, setComparisonResult] = useState(null);
  const [isComparing, setIsComparing] = useState(false);

  // Load user's document history on mount
  useEffect(() => {
    fetchHistory();
  }, [user]);

  const fetchHistory = async () => {
    if (!user) return;
    try {
      const res = await fetch(apiUrl('/api/documents'), {
        headers: {
          ...(localStorage.getItem('landai_token')
            ? { Authorization: `Bearer ${localStorage.getItem('landai_token')}` }
            : {}),
        },
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(data.documents || []);
      }
    } catch {
      // ignore
    }
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelected = (file) => {
    setError('');
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    const validExtensions = /\.(pdf|jpe?g|png)$/i;

    if (!validTypes.includes(file.type) && !validExtensions.test(file.name)) {
      setError('Unsupported file type. Please upload a PDF, JPG, JPEG, or PNG document.');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setError('File size exceeds the 50 MB limit. Please compress or select a smaller file.');
      return;
    }

    setSelectedFile(file);
  };

  const handleUploadAndAnalyze = async () => {
    if (!user) {
      onOpenAuth('login');
      return;
    }

    if (!selectedFile) {
      setError('Please select or drag a document file to analyze.');
      return;
    }

    setIsProcessing(true);
    setError('');
    setUploadProgress(15);
    setProcessStep('Uploading file securely...');

    try {
      // Step 1: Upload
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('language', docLanguage);
      formData.append('document_type', docType);

      const token = localStorage.getItem('landai_token');
      const uploadRes = await fetch(apiUrl('/api/documents/upload'), {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: formData,
      });

      const uploadData = await uploadRes.json().catch(() => ({}));
      if (!uploadRes.ok) {
        throw new Error(uploadData.error || 'Failed to upload document.');
      }

      setUploadProgress(45);
      setProcessStep('Running bilingual OCR and extracting text layers...');

      // Step 2: OCR Process
      const processRes = await fetch(apiUrl('/api/documents/process'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({ document_id: uploadData.local_id ?? uploadData.id ?? uploadData.document_id }),
      });

      const processData = await processRes.json().catch(() => ({}));
      if (!processRes.ok) {
        throw new Error(processData.error || 'OCR processing failed.');
      }

      setUploadProgress(80);
      setProcessStep('Parsing legal land fields and checking survey boundaries...');

      // Step 3: Run Validation checks
      let valData = null;
      try {
        const docId = uploadData.local_id ?? uploadData.id ?? uploadData.document_id;
        const valRes = await fetch(apiUrl(`/api/documents/${docId}/validate`), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          credentials: 'include',
          body: JSON.stringify({}),
        });
        if (valRes.ok) {
          valData = await valRes.json();
        }
      } catch {
        // non-fatal
      }

      setUploadProgress(100);
      setProcessStep('Analysis complete!');

      setActiveDocument(uploadData);
      setActiveOcrResult(processData);
      setValidationResult(valData);
      setSelectedPageIdx(0);

      // Refresh document history
      fetchHistory();
    } catch (err) {
      setError(err.message || 'An error occurred during document processing.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSelectHistoryDoc = async (docItem) => {
    if (!user) return;
    setError('');
    setIsProcessing(true);
    setProcessStep('Loading document analysis...');

    try {
      const token = localStorage.getItem('landai_token');
      const selectedDocId = docItem.local_id ?? docItem.id ?? docItem.document_id;
      const res = await fetch(apiUrl(`/api/documents/${selectedDocId}`), {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Could not load document details.');

      const data = await res.json();
      setActiveDocument(docItem);
      setActiveOcrResult(data);
      setSelectedPageIdx(0);

      // Fetch validation if available
      try {
        const valRes = await fetch(apiUrl(`/api/documents/${selectedDocId}/validate`), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          credentials: 'include',
          body: JSON.stringify({}),
        });
        if (valRes.ok) {
          setValidationResult(await valRes.json());
        }
      } catch {
        // ignore
      }
    } catch (err) {
      setError(err.message || 'Failed to load document analysis.');
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleSelectForComparison = (id) => {
    setSelectedForComparison((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleRunComparison = async () => {
    if (selectedForComparison.length < 2) {
      setError('Please select at least 2 documents from history to compare consistency.');
      return;
    }

    setIsComparing(true);
    setError('');

    try {
      const token = localStorage.getItem('landai_token');
      const res = await fetch(apiUrl('/api/documents/compare'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({ document_ids: selectedForComparison }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to run cross-document comparison.');
      }

      setComparisonResult(data);
    } catch (err) {
      setError(err.message || 'Comparison failed.');
    } finally {
      setIsComparing(false);
    }
  };

  const downloadReport = (format = 'txt') => {
    if (!activeDocument) return;
    const docId = activeDocument.local_id || activeDocument.id;
    const token = localStorage.getItem('landai_token');
    const url = format === 'report' ? apiUrl(`/api/documents/${docId}/validation/report`) : apiUrl(`/api/documents/${docId}/export/${format}`);

    window.open(url, '_blank');
  };

  const fields = activeOcrResult?.fields || {};
  const fieldEntries = Object.entries(fields).map(([k, v]) => ({
    key: k,
    value: typeof v === 'object' && v !== null ? v.value : v,
    status: typeof v === 'object' && v !== null ? v.status : 'detected',
  }));

  const pages = activeOcrResult?.pages || [];
  const currentPage = pages[selectedPageIdx] || null;

  return (
    <div className="doc-verify-page">
      {/* Page Header */}
      <div className="verify-header-block">
        <div className="verify-heading-copy">
          <div className="verify-eyebrow">
            <span className="eyebrow-pill">LEGAL DOCUMENT AI PIPELINE</span>
            <span className="eyebrow-note">ENGLISH &amp; TAMIL BILINGUAL OCR</span>
          </div>
          <h1>Document Verification</h1>
          <p className="verify-subtitle">
            Upload deeds, pattas, and survey sketches for OCR text extraction, field parsing, and cross-document consistency checks.
          </p>
        </div>

        {/* Legal Disclaimer Box */}
        <div className="verify-disclaimer-box">
          <div className="disclaimer-icon-wrap">
            <Scale size={18} />
          </div>
          <div className="disclaimer-text">
            <strong>Technical Extraction Notice</strong>
            <p>
              OCR text extraction and automated cross-checks verify structural format and textual consistency. They do not independently prove certified legal title or authenticate ownership without authorized registrar records.
            </p>
          </div>
        </div>
      </div>

      {/* Main Two-Column Workflow */}
      <div className="verify-main-grid">
        {/* Left Column: Upload Console */}
        <div className="verify-upload-column">
          <div className="upload-card-container">
            <div className="upload-card-header">
              <UploadCloud size={20} />
              <div>
                <h3>Upload Property Document</h3>
                <span>Supported: PDF, JPG, JPEG, PNG (up to 50 MB)</span>
              </div>
            </div>

            {/* Drag & Drop Target */}
            <div
              className={`drag-drop-zone ${selectedFile ? 'has-file' : ''}`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                style={{ display: 'none' }}
                onChange={(e) => e.target.files && handleFileSelected(e.target.files[0])}
              />

              {selectedFile ? (
                <div className="selected-file-display">
                  <FileText size={36} className="file-icon-lead" />
                  <div className="selected-file-meta">
                    <strong>{selectedFile.name}</strong>
                    <span>{(selectedFile.size / 1024 / 1024).toFixed(2)} MB · Ready to analyze</span>
                  </div>
                  <button
                    type="button"
                    className="clear-file-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                    }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ) : (
                <div className="drag-drop-placeholder">
                  <div className="cloud-icon-circle">
                    <UploadCloud size={28} />
                  </div>
                  <strong>Drag &amp; drop your document here</strong>
                  <span>or click to browse files from your computer</span>
                </div>
              )}
            </div>

            {/* Document Options */}
            <div className="upload-options-grid">
              <div className="option-field">
                <label htmlFor="doc-type-sel">Document Category</label>
                <select
                  id="doc-type-sel"
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  disabled={isProcessing}
                >
                  <option value="patta">Patta / Chitta Record</option>
                  <option value="sale_deed">Sale Deed / Sale Agreement</option>
                  <option value="encumbrance_certificate">Encumbrance Certificate (EC)</option>
                  <option value="survey_fmb">Survey / FMB Sketch</option>
                  <option value="identity">Identity / Supporting Document</option>
                </select>
              </div>

              <div className="option-field">
                <label htmlFor="doc-lang-sel">OCR Engine Language</label>
                <select
                  id="doc-lang-sel"
                  value={docLanguage}
                  onChange={(e) => setDocLanguage(e.target.value)}
                  disabled={isProcessing}
                >
                  <option value="ta-en">Tamil + English (Bilingual)</option>
                  <option value="eng">English Only</option>
                  <option value="ta">Tamil Only</option>
                </select>
              </div>
            </div>

            {/* Action Button & Progress */}
            {isProcessing && (
              <div className="processing-progress-card">
                <div className="progress-info-row">
                  <RefreshCw size={15} className="spin-icon" />
                  <span>{processStep}</span>
                  <strong>{uploadProgress}%</strong>
                </div>
                <div className="progress-bar-track">
                  <div className="progress-bar-fill" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            )}

            {error && (
              <div className="verify-error-banner">
                <AlertTriangle size={16} />
                <span>{error}</span>
              </div>
            )}

            <button
              type="button"
              className="analyze-submit-btn"
              onClick={handleUploadAndAnalyze}
              disabled={isProcessing || !selectedFile}
            >
              <FileCheck2 size={16} />
              <span>{isProcessing ? 'Processing Document…' : 'Analyze Document'}</span>
            </button>
          </div>

          {/* User History Card */}
          <div className="history-section-card">
            <div className="history-card-header">
              <Layers size={18} />
              <div>
                <h4>Your Document Records</h4>
                <span>{history.length} processed items</span>
              </div>
            </div>

            {history.length > 0 ? (
              <>
                <div className="history-items-list">
                  {history.map((docItem) => {
                    const isChecked = selectedForComparison.includes(docItem.id || docItem.local_id);
                    return (
                      <div
                        key={docItem.id || docItem.local_id}
                        className="history-row-item"
                        onClick={() => handleSelectHistoryDoc(docItem)}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            e.stopPropagation();
                            toggleSelectForComparison(docItem.id || docItem.local_id);
                          }}
                          aria-label="Select for cross comparison"
                        />
                        <div className="history-item-details">
                          <strong>{docItem.original_name}</strong>
                          <div className="history-item-sub">
                            <span>{docItem.document_type || 'Document'}</span>
                            <span>·</span>
                            <span>{docItem.page_count || 1} pages</span>
                            <span>·</span>
                            <span className="status-badge-neutral">{docItem.status}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Compare Action */}
                <div className="history-compare-action">
                  <span>Selected: {selectedForComparison.length} docs</span>
                  <button
                    type="button"
                    className="compare-run-btn"
                    disabled={selectedForComparison.length < 2 || isComparing}
                    onClick={handleRunComparison}
                  >
                    <span>{isComparing ? 'Comparing…' : 'Compare Selected'}</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </>
            ) : (
              <div className="history-empty-state">
                <p>No documents uploaded yet. Analyze your first document above to populate history.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: OCR Results & Analysis Inspector */}
        <div className="verify-results-column">
          {activeOcrResult ? (
            <div className="results-inspector-card">
              {/* Top Result Banner */}
              <div className="result-header-bar">
                <div className="result-header-title">
                  <span className="result-kicker">ANALYSIS RESULTS</span>
                  <h2>{activeOcrResult.original_name || 'Processed Document'}</h2>
                  <div className="result-meta-tags">
                    <span className="meta-pill">{activeOcrResult.document_type || docType}</span>
                    <span className="meta-pill">{activeOcrResult.page_count || 1} Page(s)</span>
                    <span className="meta-pill">Engine: Tesseract Bilingual</span>
                  </div>
                </div>

                <div className="result-status-indicator">
                  <span className="status-pill-solid">
                    {validationResult?.overall_status === 'pass'
                      ? 'Format Checks Passed'
                      : 'Review Required'}
                  </span>
                </div>
              </div>

              {/* Export Toolbar */}
              <div className="result-export-toolbar">
                <span className="export-label">Download Analysis:</span>
                <button type="button" className="export-action-chip" onClick={() => downloadReport('report')}>
                  <Download size={13} />
                  <span>Validation Report (TXT)</span>
                </button>
                <button type="button" className="export-action-chip" onClick={() => downloadReport('txt')}>
                  <FileText size={13} />
                  <span>Extracted Text</span>
                </button>
                <button type="button" className="export-action-chip" onClick={() => downloadReport('json')}>
                  <FileCode size={13} />
                  <span>Structured JSON</span>
                </button>
              </div>

              {/* Extracted Fields Table */}
              <div className="extracted-fields-section">
                <div className="section-title-row">
                  <h3>Structured Fields Extracted</h3>
                  <span>{fieldEntries.filter((f) => f.value).length} detected</span>
                </div>

                <div className="fields-table-wrapper">
                  <table className="fields-data-table">
                    <thead>
                      <tr>
                        <th>Field Name</th>
                        <th>Extracted Value</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fieldEntries.length > 0 ? (
                        fieldEntries.map(({ key, value, status }) => (
                          <tr key={key}>
                            <td className="field-key-cell">
                              <strong>{key.replaceAll('_', ' ').toUpperCase()}</strong>
                            </td>
                            <td className="field-value-cell">
                              {value ? (
                                <span className="detected-val">{value}</span>
                              ) : (
                                <span className="missing-val">Not detected</span>
                              )}
                            </td>
                            <td className="field-status-cell">
                              {value ? (
                                <span className="status-pill-detected">Detected · Review</span>
                              ) : (
                                <span className="status-pill-missing">Not found</span>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="empty-table-cell">
                            No structured fields identified. Inspect full recognized text below.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Validation Outcome (if available) */}
              {validationResult && (
                <div className="validation-checks-section">
                  <div className="section-title-row">
                    <h3>Validation Findings</h3>
                    <span className="validation-overall-pill">
                      Status: {validationResult.overall_status.replaceAll('_', ' ')}
                    </span>
                  </div>

                  <div className="checks-list-container">
                    {validationResult.checks?.map((check) => (
                      <div key={check.id} className="validation-check-row">
                        <div className="check-severity-badge">
                          {check.severity.toUpperCase()}
                        </div>
                        <div className="check-detail-group">
                          <strong>{check.title}</strong>
                          <p>{check.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cross-Document Comparison Outcome (if available) */}
              {comparisonResult && (
                <div className="comparison-results-section">
                  <div className="section-title-row">
                    <h3>Cross-Document Consistency Analysis</h3>
                    <span>Comparing {comparisonResult.document_ids?.length} documents</span>
                  </div>
                  <p className="comparison-disclaimer">{comparisonResult.disclaimer}</p>

                  <div className="comparison-table-wrapper">
                    <table className="comparison-data-table">
                      <thead>
                        <tr>
                          <th>Field</th>
                          <th>Consistency Status</th>
                          <th>Extracted Values Across Documents</th>
                        </tr>
                      </thead>
                      <tbody>
                        {comparisonResult.comparisons?.map((c) => (
                          <tr key={c.field}>
                            <td>
                              <strong>{c.field.replaceAll('_', ' ').toUpperCase()}</strong>
                            </td>
                            <td>
                              <span className={`compare-status-badge ${c.status}`}>
                                {c.status.toUpperCase()}
                              </span>
                            </td>
                            <td>
                              <div className="compared-values-list">
                                {c.values.map((v, i) => (
                                  <span key={i} className="compared-val-item">
                                    Doc {i + 1}: {v || '—'}
                                  </span>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Page-by-Page OCR Raw Text Preview */}
              <div className="ocr-text-preview-section">
                <div className="section-title-row">
                  <h3>Recognized OCR Text Preview</h3>
                  {pages.length > 1 && (
                    <div className="page-switcher-buttons">
                      {pages.map((p, idx) => (
                        <button
                          key={p.page_number}
                          type="button"
                          className={`page-pill-btn ${selectedPageIdx === idx ? 'active' : ''}`}
                          onClick={() => setSelectedPageIdx(idx)}
                        >
                          Page {p.page_number}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {currentPage ? (
                  <div className="page-text-content-card">
                    <div className="page-metric-bar">
                      <span>Detected: {currentPage.detected_language || 'Bilingual'}</span>
                      <span>
                        Confidence:{' '}
                        {currentPage.confidence != null
                          ? `${currentPage.confidence}%`
                          : 'Embedded Text'}
                      </span>
                    </div>

                    <pre className="recognized-raw-pre">
                      {currentPage.text || 'No text detected on this page.'}
                    </pre>

                    {currentPage.warnings && currentPage.warnings.length > 0 && (
                      <div className="page-warning-list">
                        {currentPage.warnings.map((w, idx) => (
                          <div key={idx} className="page-warning-item">
                            <AlertTriangle size={13} />
                            <span>{w}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="no-page-data">
                    <p>No page OCR data available.</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="verify-empty-inspector">
              <div className="empty-inspector-icon">
                <FileCheck2 size={42} />
              </div>
              <h3>Document Analysis Console</h3>
              <p>
                Upload a sale deed, patta, or survey document on the left, or select a previously uploaded document from your history to view its extracted fields, OCR confidence, and consistency audit.
              </p>
              <div className="feature-badges-row">
                <span className="feat-chip">Survey &amp; Subdivision Parsing</span>
                <span className="feat-chip">Owner &amp; Executant Matching</span>
                <span className="feat-chip">Tamil &amp; English Bilingual</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
