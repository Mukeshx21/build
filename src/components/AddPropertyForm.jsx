import React, { useState, useRef } from 'react';
import { apiUrl } from '../services/api';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Building2,
  MapPin,
  IndianRupee,
  Image as ImageIcon,
  FileCheck2,
  Globe,
  Save,
  CheckCircle2,
  AlertCircle,
  UploadCloud,
  Trash2,
  Star,
  FileText,
  RefreshCw,
  Info,
  ShieldCheck,
  Sparkles,
  Check,
  AlertTriangle
} from 'lucide-react';

const STEPS = [
  { id: 'basic', label: 'Basic Info & Legal', icon: Building2 },
  { id: 'location', label: 'Location', icon: MapPin },
  { id: 'pricing', label: 'Price & Area', icon: IndianRupee },
  { id: 'photos', label: 'Photographs', icon: ImageIcon },
  { id: 'documents', label: 'Mandatory Documents', icon: FileCheck2 },
  { id: 'publish', label: 'Review & Publish', icon: Globe },
];

const PROPERTY_CATEGORIES = [
  'Plot',
  'Residential',
  'Villa',
  'Apartment',
  'House',
  'Agricultural',
  'Commercial',
  'Other',
];

const AREA_UNITS = ['sq.ft', 'sq.m', 'cents', 'acres', 'grounds', 'guntas'];
const FACING_OPTIONS = ['', 'North', 'South', 'East', 'West', 'North-East', 'North-West', 'South-East', 'South-West'];
const ROAD_ACCESS_OPTIONS = ['', '12 ft road', '20 ft road', '30 ft road', '40 ft road', '60 ft road', '80 ft road', 'Direct NH/SH access'];

const DEFAULT_IMAGES = [
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1505843795480-5cfb3c03f6ff?auto=format&fit=crop&w=1200&q=85',
];

function Field({ label, error, children }) {
  return (
    <div className="apf-field">
      <label className="apf-label">{label}</label>
      {children}
      {error && <span className="apf-field-error">{error}</span>}
    </div>
  );
}

export default function AddPropertyForm({
  user,
  onClose,
  onPropertyCreated,
  initialProperty = null,
}) {
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [globalError, setGlobalError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const imageFileInputRef = useRef(null);
  const docFileInputRef = useRef(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageUploadProgress, setImageUploadProgress] = useState(0);

  // Document upload state
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [docType, setDocType] = useState('patta');
  const [docLanguage, setDocLanguage] = useState('ta-en');
  const [docProcessMsg, setDocProcessMsg] = useState('');

  // Strict Document Verification State
  const [verificationReport, setVerificationReport] = useState(
    initialProperty?.verification_report || null
  );
  const [verificationStatus, setVerificationStatus] = useState(
    initialProperty?.verification_status || (initialProperty?.verified ? 'VERIFIED' : 'PENDING')
  );
  const [verifyingDoc, setVerifyingDoc] = useState(false);

  const isEditMode = Boolean(initialProperty && initialProperty.id);

  // Form state
  const [form, setForm] = useState({
    title: initialProperty?.title || '',
    type: initialProperty?.type || 'Plot',
    listing_purpose: 'Sale',
    description: initialProperty?.description || '',
    description_long: initialProperty?.description_long || '',
    owner_name: initialProperty?.owner_name || user?.name || '',
    survey_number: initialProperty?.survey_number || '',
    subdivision_number: initialProperty?.subdivision_number || '',
    patta_number: initialProperty?.patta_number || '',
    owner_declaration: isEditMode ? true : false,
    // Location
    address: initialProperty?.address || initialProperty?.location?.split(',')?.[0]?.trim() || '',
    village: '',
    city: initialProperty?.city || '',
    state: initialProperty?.state || 'Tamil Nadu',
    postal_code: '',
    gps_lat: '',
    gps_lng: '',
    // Price & Area
    price: initialProperty?.price ? String(initialProperty.price) : '',
    area: initialProperty?.area ? String(initialProperty.area) : '',
    area_unit: initialProperty?.area_unit || 'sq.ft',
    built_up_area: initialProperty?.built_up_area ? String(initialProperty.built_up_area) : '',
    bedrooms: initialProperty?.bedrooms ? String(initialProperty.bedrooms) : '',
    bathrooms: initialProperty?.bathrooms ? String(initialProperty.bathrooms) : '',
    road_access: initialProperty?.road_access || '',
    facing: initialProperty?.facing || '',
    tags: Array.isArray(initialProperty?.tags)
      ? initialProperty.tags.join(', ')
      : 'DTCP Approved, East-facing, Clear Title',
    // Photos
    images: Array.isArray(initialProperty?.images) && initialProperty.images.length > 0
      ? initialProperty.images
      : (initialProperty?.image ? [initialProperty.image] : []),
    cover_index: 0,
    // Documents
    document_id: initialProperty?.document_id || null,
    documents: Array.isArray(initialProperty?.documents) ? initialProperty.documents : [],
  });

  const set = (key, val) => {
    setForm((prev) => ({ ...prev, [key]: val }));
    setFieldErrors((prev) => ({ ...prev, [key]: '' }));
  };

  // Helper to run live document verification against property data
  const runDocumentVerification = async (docId, currentForm = form) => {
    if (!docId) return null;
    setVerifyingDoc(true);
    try {
      const token = localStorage.getItem('landai_token');
      const locationStr = [currentForm.address, currentForm.village, currentForm.city, currentForm.state]
        .filter(Boolean)
        .join(', ');

      const res = await fetch(apiUrl('/api/properties/verify-document'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({
          document_id: docId,
          property_data: {
            id: initialProperty?.id,
            title: currentForm.title,
            owner_name: currentForm.owner_name,
            survey_number: currentForm.survey_number,
            subdivision_number: currentForm.subdivision_number,
            patta_number: currentForm.patta_number,
            location: locationStr,
            address: currentForm.address,
            city: currentForm.city,
            state: currentForm.state,
            area: Number(currentForm.area) || 0,
            area_unit: currentForm.area_unit,
            price: Number(currentForm.price) || 0,
          },
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setVerificationReport(data);
        setVerificationStatus(data.overall_status);
        return data;
      } else {
        if (data.report) {
          setVerificationReport(data.report);
          setVerificationStatus(data.report.overall_status || 'REJECTED');
        }
      }
    } catch (err) {
      console.warn('Document verification check error:', err);
    } finally {
      setVerifyingDoc(false);
    }
    return null;
  };

  // One-click Auto-Fill from verified document
  const handleAutoFillFromDocument = (docEntry) => {
    const fields = docEntry?.fields || verificationReport?.extracted_fields || {};
    const newForm = { ...form };

    const getVal = (v) => {
      if (!v) return '';
      if (typeof v === 'string') return v;
      if (typeof v === 'object' && v.value != null) return String(v.value);
      return '';
    };

    const docSurvey = getVal(fields.survey_number);
    const docSubdiv = getVal(fields.subdivision_number);
    const docPatta = getVal(fields.patta_number);
    const docOwner = getVal(fields.owner_name);
    const docArea = getVal(fields.land_area);
    const docVillage = getVal(fields.village);
    const docDistrict = getVal(fields.district);

    if (docSurvey) newForm.survey_number = docSurvey;
    if (docSubdiv) newForm.subdivision_number = docSubdiv;
    if (docPatta) newForm.patta_number = docPatta;
    if (docOwner) newForm.owner_name = docOwner;

    if (docArea) {
      const match = String(docArea).match(/([\d,]+(?:\.\d+)?)\s*([a-zA-Z\u0B80-\u0BFF\.\s]*)/);
      if (match) {
        newForm.area = match[1].replace(/,/g, '');
        const u = match[2].trim().toLowerCase();
        if (u.includes('cent') || u.includes('சென்ட்')) newForm.area_unit = 'cents';
        else if (u.includes('acre') || u.includes('ஏக்கர்')) newForm.area_unit = 'acres';
        else if (u.includes('ground')) newForm.area_unit = 'grounds';
        else if (u.includes('sq.m') || u.includes('sqm')) newForm.area_unit = 'sq.m';
        else newForm.area_unit = 'sq.ft';
      }
    }

    if (docVillage && !newForm.village) newForm.village = docVillage;
    if (docDistrict) newForm.city = docDistrict;

    setForm(newForm);

    const targetDocId = docEntry?.id || form.document_id || form.documents?.[0]?.id;
    if (targetDocId) {
      runDocumentVerification(targetDocId, newForm);
    }
  };

  const validateStep = (stepId) => {
    const errors = {};
    if (stepId === 'basic') {
      if (!form.title.trim()) errors.title = 'Property title is required.';
      if (!form.description.trim()) errors.description = 'Description is required.';
      if (!form.owner_name.trim()) errors.owner_name = 'Owner name is required (as recorded in land document).';
      if (!form.survey_number.trim()) errors.survey_number = 'Survey number is required.';
      if (!form.owner_declaration) errors.owner_declaration = 'You must confirm ownership or authorization.';
    }
    if (stepId === 'location') {
      if (!form.address.trim()) errors.address = 'Address or locality is required.';
      if (!form.city.trim()) errors.city = 'City or district is required.';
      if (!form.state.trim()) errors.state = 'State is required.';
    }
    if (stepId === 'pricing') {
      if (!form.price || Number(form.price) <= 0) errors.price = 'A valid asking price is required.';
      if (!form.area || Number(form.area) <= 0) errors.area = 'A valid land area is required.';
    }
    if (stepId === 'documents') {
      if (!form.documents || form.documents.length === 0) {
        errors.documents = 'Mandatory land ownership document is required. Please upload your document.';
        setGlobalError('You must upload your land ownership document before posting a property.');
      } else if (verificationStatus === 'REJECTED') {
        errors.documents = 'The uploaded document failed verification. Please upload a readable, valid document.';
        setGlobalError('The uploaded document failed verification. Please ensure you upload a valid, readable land ownership document.');
      }
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    const currentStepId = STEPS[step].id;
    if (!validateStep(currentStepId)) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const handleBack = () => setStep((s) => Math.max(s - 1, 0));

  // --- Photo Handlers ---
  const handleImageUrlAdd = (url) => {
    if (!url.trim()) return;
    set('images', [...form.images, url.trim()]);
  };

  const handleRemoveImage = (idx) => {
    const newImages = form.images.filter((_, i) => i !== idx);
    set('images', newImages);
    if (form.cover_index >= newImages.length) {
      set('cover_index', Math.max(0, newImages.length - 1));
    }
  };

  const handleImageFileUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setGlobalError('');
    setUploadingImage(true);
    setImageUploadProgress(10);

    const token = localStorage.getItem('landai_token');
    const uploadedUrls = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!['image/jpeg', 'image/png', 'image/webp', 'image/jpg'].includes(file.type)) {
          throw new Error(`File "${file.name}" is not a supported image (JPG, PNG, WebP).`);
        }
        if (file.size > 10 * 1024 * 1024) {
          throw new Error(`File "${file.name}" exceeds the 10 MB limit.`);
        }

        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/properties/upload-image', {
          method: 'POST',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          credentials: 'include',
          body: formData,
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Failed to upload photo.');

        uploadedUrls.push(data.url);
        setImageUploadProgress(Math.round(((i + 1) / files.length) * 100));
      }

      set('images', [...form.images, ...uploadedUrls]);
    } catch (err) {
      setGlobalError(err.message || 'Image upload failed.');
    } finally {
      setUploadingImage(false);
      setImageUploadProgress(0);
      if (imageFileInputRef.current) imageFileInputRef.current.value = '';
    }
  };

  // --- Supporting Document Handlers (Strict OCR & Verification) ---
  const handleDocFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setGlobalError('');
    setUploadingDoc(true);
    setDocProcessMsg('Uploading and encrypting land document...');

    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    const validExtensions = /\.(pdf|jpe?g|png)$/i;

    if (!validTypes.includes(file.type) && !validExtensions.test(file.name)) {
      setGlobalError('Supported document formats: PDF, JPG, JPEG, PNG.');
      setUploadingDoc(false);
      return;
    }

    if (file.size > 4.5 * 1024 * 1024) {
      setGlobalError('Document exceeds the 4.5 MB serverless limit. Please compress or select a smaller file.');
      setUploadingDoc(false);
      return;
    }

    try {
      const token = localStorage.getItem('landai_token');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('language', docLanguage);
      formData.append('document_type', docType);

      // Step 1: Upload to secure repository
      const upRes = await fetch(apiUrl('/api/documents/upload'), {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: formData,
      });

      const upData = await upRes.json().catch(() => ({}));
      if (!upRes.ok) throw new Error(upData.error || 'Document upload failed.');

      const uploadedDocId = upData.local_id ?? upData.id ?? upData.document_id;
      set('document_id', uploadedDocId);

      setDocProcessMsg('Executing bilingual Tamil + English OCR parsing...');

      // Step 2: OCR Process
      let procData = null;
      try {
        const procRes = await fetch(apiUrl('/api/documents/process'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          credentials: 'include',
          body: JSON.stringify({ document_id: uploadedDocId }),
        });
        if (procRes.ok) {
          procData = await procRes.json();
        }
      } catch (err) {
        console.warn('OCR processing notice:', err);
      }

      setDocProcessMsg('Running strict document consistency & ownership checks...');

      const extractedFields = procData?.fields || upData?.fields || {};
      const newDocEntry = {
        id: uploadedDocId,
        name: file.name,
        type: docType,
        language: docLanguage,
        status: procData ? 'Processed' : 'Uploaded',
        fields: extractedFields,
        uploaded_at: new Date().toISOString(),
      };

      const updatedDocs = [newDocEntry];
      set('documents', updatedDocs);

      // Step 3: Run Strict Property-Document Verification
      const rep = await runDocumentVerification(uploadedDocId, {
        ...form,
        document_id: uploadedDocId,
        documents: updatedDocs,
      });

      if (rep) {
        newDocEntry.verification_status = rep.overall_status;
        newDocEntry.verification_report = rep;
      }
    } catch (err) {
      setGlobalError(err.message || 'Failed to process document.');
    } finally {
      setUploadingDoc(false);
      setDocProcessMsg('');
      if (docFileInputRef.current) docFileInputRef.current.value = '';
    }
  };

  const handleRemoveDoc = (idx) => {
    const remaining = form.documents.filter((_, i) => i !== idx);
    set('documents', remaining);
    if (remaining.length === 0) {
      set('document_id', null);
      setVerificationReport(null);
      setVerificationStatus('PENDING');
    } else {
      set('document_id', remaining[0].id);
      runDocumentVerification(remaining[0].id);
    }
  };

  // --- Submit / Save Handler ---
  const handleSubmit = async (listing_status) => {
    // Validate required steps (basic, location, pricing, documents)
    for (const s of ['basic', 'location', 'pricing', 'documents']) {
      if (!validateStep(s)) {
        const failIdx = STEPS.findIndex((x) => x.id === s);
        setStep(failIdx);
        return;
      }
    }

    // Strict Rule: Block publishing if verification not VERIFIED
    if (listing_status === 'Published') {
      if (verificationStatus !== 'VERIFIED') {
        setGlobalError(
          'Your property cannot be published because some information in your land document does not match the property details. Please correct the highlighted information and upload the required document again.'
        );
        return;
      }
    }

    setGlobalError('');
    setBusy(true);

    try {
      const token = localStorage.getItem('landai_token');
      const tagList = form.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const allImages = [...form.images];
      if (allImages.length === 0) {
        allImages.push(DEFAULT_IMAGES[Math.floor(Math.random() * DEFAULT_IMAGES.length)]);
      }
      const coverImage = allImages[form.cover_index] || allImages[0];

      const locationStr = [form.address, form.village, form.city, form.state]
        .filter(Boolean)
        .join(', ');

      const primaryDocId = form.document_id || form.documents?.[0]?.id;

      const payload = {
        title: form.title.trim(),
        owner_name: form.owner_name.trim(),
        survey_number: form.survey_number.trim(),
        subdivision_number: form.subdivision_number.trim(),
        patta_number: form.patta_number.trim(),
        location: locationStr,
        address: form.address.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        price: Number(form.price),
        area: Number(form.area),
        area_unit: form.area_unit,
        built_up_area: form.built_up_area ? Number(form.built_up_area) : 0,
        type: form.type,
        image: coverImage,
        images: allImages,
        tags: tagList,
        description: form.description.trim(),
        description_long: form.description_long.trim(),
        facing: form.facing,
        road_access: form.road_access,
        bedrooms: form.bedrooms ? Number(form.bedrooms) : 0,
        bathrooms: form.bathrooms ? Number(form.bathrooms) : 0,
        listing_status,
        document_id: primaryDocId,
        documents: form.documents,
      };

      const url = isEditMode ? `/api/properties/${initialProperty.id}` : '/api/properties';
      const method = isEditMode ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.report) {
          setVerificationReport(data.report);
          setVerificationStatus(data.report.overall_status);
        }
        throw new Error(data.error || 'Failed to save listing.');
      }

      onPropertyCreated(data.property, listing_status);
    } catch (err) {
      setGlobalError(err.message || 'An error occurred while saving the listing.');
    } finally {
      setBusy(false);
    }
  };

  const currentStep = STEPS[step];

  return (
    <div className="apf-overlay" role="dialog" aria-modal="true">
      <div className="apf-window">
        {/* Header */}
        <div className="apf-header">
          <div>
            <h2>{isEditMode ? 'Edit Property Listing' : 'Add New Property'}</h2>
            <p>Step {step + 1} of {STEPS.length}: {currentStep.label}</p>
          </div>
          <button className="apf-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="apf-steps-bar">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <div
                key={s.id}
                className={`apf-step-item ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}
                onClick={() => {
                  if (i < step) setStep(i);
                }}
              >
                <div className="apf-step-dot">
                  {i < step ? <CheckCircle2 size={14} /> : <Icon size={14} />}
                </div>
                <span>{s.label}</span>
              </div>
            );
          })}
        </div>

        {/* Global Error Banner */}
        {globalError && (
          <div className="apf-error-banner">
            <AlertCircle size={15} />
            <span>{globalError}</span>
          </div>
        )}

        {/* Step Content */}
        <div className="apf-step-content">
          {/* SECTION A: Basic Info & Legal */}
          {currentStep.id === 'basic' && (
            <div className="apf-step-body animate-fade">
              <Field label="Property Title *" error={fieldErrors.title}>
                <input
                  id="apf-title"
                  type="text"
                  value={form.title}
                  onChange={(e) => set('title', e.target.value)}
                  placeholder="e.g. 2400 sq.ft DTCP Approved Residential Plot"
                  className={fieldErrors.title ? 'field-error' : ''}
                />
              </Field>

              <div className="apf-two-col">
                <Field label="Property Category *">
                  <select
                    id="apf-category"
                    value={form.type}
                    onChange={(e) => set('type', e.target.value)}
                  >
                    {PROPERTY_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </Field>

                <Field label="Listing Purpose">
                  <select
                    id="apf-purpose"
                    value={form.listing_purpose}
                    onChange={(e) => set('listing_purpose', e.target.value)}
                  >
                    <option value="Sale">Sale</option>
                  </select>
                </Field>
              </div>

              {/* Legal Title Information */}
              <div className="apf-two-col">
                <Field label="Land Owner Name * (as per Title Deed / Patta)" error={fieldErrors.owner_name}>
                  <input
                    id="apf-owner-name"
                    type="text"
                    value={form.owner_name}
                    onChange={(e) => set('owner_name', e.target.value)}
                    placeholder="e.g. K. Senthil Nathan"
                    className={fieldErrors.owner_name ? 'field-error' : ''}
                  />
                </Field>

                <Field label="Survey Number *" error={fieldErrors.survey_number}>
                  <input
                    id="apf-survey-no"
                    type="text"
                    value={form.survey_number}
                    onChange={(e) => set('survey_number', e.target.value)}
                    placeholder="e.g. 142/3A or 42/1B"
                    className={fieldErrors.survey_number ? 'field-error' : ''}
                  />
                </Field>
              </div>

              <div className="apf-two-col">
                <Field label="Subdivision Code (optional)">
                  <input
                    id="apf-subdiv-no"
                    type="text"
                    value={form.subdivision_number}
                    onChange={(e) => set('subdivision_number', e.target.value)}
                    placeholder="e.g. 3A or 1B"
                  />
                </Field>

                <Field label="Patta / Document Registration Number (optional)">
                  <input
                    id="apf-patta-no"
                    type="text"
                    value={form.patta_number}
                    onChange={(e) => set('patta_number', e.target.value)}
                    placeholder="e.g. Patta 4892 or Doc 1824/2022"
                  />
                </Field>
              </div>

              <Field label="Short Overview / Summary *" error={fieldErrors.description}>
                <input
                  id="apf-description"
                  type="text"
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                  placeholder="Key highlight: East-facing corner parcel with clear title deed..."
                  className={fieldErrors.description ? 'field-error' : ''}
                />
              </Field>

              <Field label="Full Property Description (optional)">
                <textarea
                  id="apf-description-long"
                  rows={3}
                  value={form.description_long}
                  onChange={(e) => set('description_long', e.target.value)}
                  placeholder="Provide comprehensive details on zoning, boundary dimensions, neighborhood amenities, water supply, and approach road condition..."
                />
              </Field>

              <div className={`apf-checkbox-field ${fieldErrors.owner_declaration ? 'checkbox-error' : ''}`}>
                <label className="apf-checkbox-label">
                  <input
                    id="apf-declaration"
                    type="checkbox"
                    checked={form.owner_declaration}
                    onChange={(e) => set('owner_declaration', e.target.checked)}
                  />
                  <span>
                    I declare that I am the legal owner or authorized representative holding valid authority to list and sell this property.
                  </span>
                </label>
                {fieldErrors.owner_declaration && (
                  <span className="apf-field-error">{fieldErrors.owner_declaration}</span>
                )}
              </div>
            </div>
          )}

          {/* SECTION B: Location */}
          {currentStep.id === 'location' && (
            <div className="apf-step-body animate-fade">
              <Field label="Address / Street / Locality *" error={fieldErrors.address}>
                <input
                  id="apf-address"
                  type="text"
                  value={form.address}
                  onChange={(e) => set('address', e.target.value)}
                  placeholder="e.g. Survey No. 142/3A, OMR Road"
                  className={fieldErrors.address ? 'field-error' : ''}
                />
              </Field>

              <div className="apf-two-col">
                <Field label="Village / Revenue Taluk (optional)">
                  <input
                    id="apf-village"
                    type="text"
                    value={form.village}
                    onChange={(e) => set('village', e.target.value)}
                    placeholder="e.g. Sholinganallur"
                  />
                </Field>

                <Field label="City / Revenue District *" error={fieldErrors.city}>
                  <input
                    id="apf-city"
                    type="text"
                    value={form.city}
                    onChange={(e) => set('city', e.target.value)}
                    placeholder="e.g. Chennai or Chengalpattu"
                    className={fieldErrors.city ? 'field-error' : ''}
                  />
                </Field>
              </div>

              <div className="apf-two-col">
                <Field label="State *" error={fieldErrors.state}>
                  <input
                    id="apf-state"
                    type="text"
                    value={form.state}
                    onChange={(e) => set('state', e.target.value)}
                    placeholder="Tamil Nadu"
                    className={fieldErrors.state ? 'field-error' : ''}
                  />
                </Field>

                <Field label="Postal / PIN Code">
                  <input
                    id="apf-postal"
                    type="text"
                    value={form.postal_code}
                    onChange={(e) => set('postal_code', e.target.value)}
                    placeholder="e.g. 600119"
                  />
                </Field>
              </div>

              <div className="apf-two-col">
                <Field label="Facing">
                  <select
                    id="apf-facing"
                    value={form.facing}
                    onChange={(e) => set('facing', e.target.value)}
                  >
                    {FACING_OPTIONS.map((f) => (
                      <option key={f} value={f}>{f || '(Select facing)'}</option>
                    ))}
                  </select>
                </Field>

                <Field label="Road Access Width">
                  <select
                    id="apf-road-access"
                    value={form.road_access}
                    onChange={(e) => set('road_access', e.target.value)}
                  >
                    {ROAD_ACCESS_OPTIONS.map((r) => (
                      <option key={r} value={r}>{r || '(Select road width)'}</option>
                    ))}
                  </select>
                </Field>
              </div>
            </div>
          )}

          {/* SECTION C: Price & Area */}
          {currentStep.id === 'pricing' && (
            <div className="apf-step-body animate-fade">
              <div className="apf-two-col">
                <Field label="Asking Price (₹) *" error={fieldErrors.price}>
                  <div className="apf-input-prefix">
                    <span>₹</span>
                    <input
                      id="apf-price"
                      type="number"
                      min="1"
                      value={form.price}
                      onChange={(e) => set('price', e.target.value)}
                      placeholder="e.g. 4800000"
                      className={fieldErrors.price ? 'field-error' : ''}
                    />
                  </div>
                </Field>

                <div className="apf-area-row">
                  <Field label="Land Area *" error={fieldErrors.area}>
                    <input
                      id="apf-area"
                      type="number"
                      min="1"
                      step="any"
                      value={form.area}
                      onChange={(e) => set('area', e.target.value)}
                      placeholder="e.g. 2400"
                      className={fieldErrors.area ? 'field-error' : ''}
                    />
                  </Field>

                  <Field label="Unit">
                    <select
                      id="apf-area-unit"
                      value={form.area_unit}
                      onChange={(e) => set('area_unit', e.target.value)}
                    >
                      {AREA_UNITS.map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </Field>
                </div>
              </div>

              {form.price && form.area && Number(form.area) > 0 && (
                <div className="apf-rate-calc">
                  <span>Calculated Rate:</span>
                  <strong>
                    ₹{Math.round(Number(form.price) / Number(form.area)).toLocaleString('en-IN')} per {form.area_unit}
                  </strong>
                </div>
              )}

              <Field label="Search Tags / Highlights (comma-separated)">
                <input
                  id="apf-tags"
                  type="text"
                  value={form.tags}
                  onChange={(e) => set('tags', e.target.value)}
                  placeholder="DTCP Approved, Corner Plot, Clear Title, Direct Owner"
                />
              </Field>
            </div>
          )}

          {/* SECTION D: Photographs */}
          {currentStep.id === 'photos' && (
            <div className="apf-step-body animate-fade">
              <div className="apf-photos-info">
                <Info size={15} />
                <span>Upload authentic photos of the plot, approach road, boundary stones, and surrounding views.</span>
              </div>

              <div
                className="apf-photo-upload-dropzone"
                onClick={() => imageFileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={imageFileInputRef}
                  onChange={handleImageFileUpload}
                  multiple
                  accept="image/jpeg,image/png,image/webp,image/jpg"
                  style={{ display: 'none' }}
                />
                <UploadCloud size={24} />
                <div>
                  <strong>Click to upload photos</strong>
                  <p>JPG, PNG, or WebP up to 10 MB each. You can select multiple photos.</p>
                </div>
              </div>

              {uploadingImage && (
                <div className="apf-upload-progress-row">
                  <span>Uploading photos... {imageUploadProgress}%</span>
                  <div className="apf-progress-track">
                    <div
                      className="apf-progress-bar"
                      style={{ width: `${imageUploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="apf-add-image-row">
                <input
                  id="apf-img-url"
                  type="url"
                  placeholder="Or paste an image URL (https://...)"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleImageUrlAdd(e.target.value);
                      e.target.value = '';
                    }
                  }}
                />
                <button
                  type="button"
                  className="apf-add-img-btn"
                  onClick={() => {
                    const input = document.getElementById('apf-img-url');
                    handleImageUrlAdd(input.value);
                    input.value = '';
                  }}
                >
                  <span>Add URL</span>
                </button>
              </div>

              {form.images.length === 0 ? (
                <div className="apf-photos-empty">
                  <ImageIcon size={28} />
                  <p>No photos added yet. A verified sample photo will be assigned if none are provided.</p>
                  <div className="apf-default-photos">
                    <p>Or quick-select sample photos:</p>
                    <div className="apf-sample-grid">
                      {DEFAULT_IMAGES.map((url, i) => (
                        <button
                          key={i}
                          type="button"
                          className="apf-sample-thumb"
                          onClick={() => set('images', [...form.images, url])}
                        >
                          <img src={url} alt={`Sample ${i + 1}`} />
                          <span>+ Add</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="apf-photos-grid">
                  {form.images.map((url, i) => (
                    <div
                      key={i}
                      className={`apf-photo-item ${i === form.cover_index ? 'is-cover' : ''}`}
                    >
                      <img src={url} alt={`Photo ${i + 1}`} />
                      <div className="apf-photo-actions">
                        {i !== form.cover_index && (
                          <button
                            type="button"
                            className="apf-photo-action-btn"
                            onClick={() => set('cover_index', i)}
                            title="Set as cover image"
                          >
                            <Star size={12} />
                          </button>
                        )}
                        <button
                          type="button"
                          className="apf-photo-action-btn danger"
                          onClick={() => handleRemoveImage(i)}
                          title="Remove photo"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                      {i === form.cover_index && (
                        <div className="apf-cover-badge">Cover Photo</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SECTION E: Mandatory Land Document & Verification */}
          {currentStep.id === 'documents' && (
            <div className="apf-step-body animate-fade">
              <div className="apf-documents-banner">
                <FileCheck2 size={18} />
                <div>
                  <strong>Mandatory Land Ownership Document Verification</strong>
                  <p>
                    Uploading your land ownership document is mandatory. The system automatically performs bilingual OCR (Tamil + English) and verifies Survey Numbers, Owner Name, Land Area, and Location consistency before publication is allowed.
                  </p>
                </div>
              </div>

              {/* Upload Controls */}
              <div className="apf-doc-controls-box">
                <div className="apf-two-col">
                  <Field label="Document Category *">
                    <select
                      id="apf-doc-type"
                      value={docType}
                      onChange={(e) => setDocType(e.target.value)}
                    >
                      <option value="patta">Patta / Chitta Record (பட்டா)</option>
                      <option value="deed">Parent Sale Deed (கிரய பத்திரம்)</option>
                      <option value="ec">Encumbrance Certificate (EC)</option>
                      <option value="fmb">Field Measurement Book (FMB)</option>
                      <option value="layout">Approved Layout Copy</option>
                    </select>
                  </Field>

                  <Field label="Document Script / Language">
                    <select
                      id="apf-doc-language"
                      value={docLanguage}
                      onChange={(e) => setDocLanguage(e.target.value)}
                    >
                      <option value="ta-en">Bilingual (Tamil + English)</option>
                      <option value="ta">Tamil Only (தமிழ்)</option>
                      <option value="en">English Only</option>
                    </select>
                  </Field>
                </div>

                <div
                  className="apf-doc-upload-dropzone"
                  onClick={() => docFileInputRef.current?.click()}
                >
                  <input
                    type="file"
                    ref={docFileInputRef}
                    onChange={handleDocFileUpload}
                    accept="application/pdf,image/jpeg,image/png,image/jpg"
                    style={{ display: 'none' }}
                  />
                  <UploadCloud size={24} />
                  <div>
                    <strong>Upload Land Ownership Document File (Required) *</strong>
                    <p>PDF, JPG, JPEG, or PNG (up to 4.5 MB) — automatically verified via OCR engine</p>
                  </div>
                </div>

                {uploadingDoc && (
                  <div className="apf-doc-processing-status">
                    <RefreshCw size={14} className="spin-icon" />
                    <span>{docProcessMsg || 'Analyzing land record with OCR engine...'}</span>
                  </div>
                )}
              </div>

              {/* Uploaded Document List Card */}
              {form.documents.length > 0 && (
                <div className="apf-doc-list-section">
                  <h4>Attached Land Document</h4>
                  <div className="apf-docs-grid">
                    {form.documents.map((doc, idx) => (
                      <div key={idx} className="apf-doc-card">
                        <div className="apf-doc-card-top">
                          <div className="apf-doc-icon-title">
                            <FileCheck2 size={16} />
                            <div>
                              <strong>{doc.name}</strong>
                              <span className="apf-doc-type-pill">{doc.type?.toUpperCase()}</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            className="apf-doc-remove-btn"
                            onClick={() => handleRemoveDoc(idx)}
                            title="Remove document"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Document Verification Report Card */}
              {verificationReport && (
                <div className="apf-verification-report-card">
                  <div className="apf-vr-header">
                    <div className="apf-vr-title">
                      <ShieldCheck size={18} />
                      <span>Document Verification Report</span>
                    </div>
                    <span className={`apf-vr-badge status-${(verificationStatus || 'pending').toLowerCase()}`}>
                      {verificationStatus === 'VERIFIED' ? (
                        <><Check size={12} /> VERIFIED</>
                      ) : verificationStatus === 'NEEDS_CORRECTION' ? (
                        <><AlertCircle size={12} /> NEEDS CORRECTION</>
                      ) : verificationStatus === 'REJECTED' ? (
                        <><X size={12} /> REJECTED</>
                      ) : (
                        <><RefreshCw size={12} className="spin-icon" /> PENDING</>
                      )}
                    </span>
                  </div>

                  {/* Verification Banner Message */}
                  <div className={`apf-vr-banner-msg msg-${(verificationStatus || 'pending').toLowerCase()}`}>
                    {verificationStatus === 'VERIFIED' ? (
                      <CheckCircle2 size={16} />
                    ) : (
                      <AlertCircle size={16} />
                    )}
                    <div>{verificationReport.message}</div>
                  </div>

                  {/* Verification Checklist */}
                  <div className="apf-vr-checklist">
                    {verificationReport.checks && verificationReport.checks.map((c, i) => (
                      <div key={i} className={`apf-vr-check-item ${c.status}`}>
                        {c.status === 'pass' ? (
                          <CheckCircle2 size={14} />
                        ) : c.status === 'fail' ? (
                          <X size={14} />
                        ) : (
                          <AlertCircle size={14} />
                        )}
                        <div>
                          <span className="apf-vr-check-title">{c.title}</span>
                          <span className="apf-vr-check-detail">— {c.detail}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Information Discrepancies Table */}
                  {verificationReport.discrepancies && verificationReport.discrepancies.length > 0 && (
                    <div className="apf-vr-discrepancies">
                      <div className="apf-vr-discrepancy-header">
                        <AlertTriangle size={14} />
                        <span>Information Discrepancies Requiring Correction:</span>
                      </div>
                      <table className="apf-discrepancy-table">
                        <thead>
                          <tr>
                            <th>Field</th>
                            <th>Entered in Listing</th>
                            <th>Document Value</th>
                            <th>Status / Correction</th>
                          </tr>
                        </thead>
                        <tbody>
                          {verificationReport.discrepancies.map((d, i) => (
                            <tr key={i}>
                              <td><strong>{d.field?.replace(/_/g, ' ').toUpperCase()}</strong></td>
                              <td><span style={{ color: '#DC2626' }}>{d.actual || '(Empty)'}</span></td>
                              <td><span style={{ color: '#059669', fontWeight: 600 }}>{d.expected || 'N/A'}</span></td>
                              <td>{d.message}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      <div className="apf-vr-actions">
                        <button
                          type="button"
                          className="apf-sync-btn"
                          onClick={() => handleAutoFillFromDocument(form.documents?.[0])}
                          title="Automatically copy detected fields from document into property listing"
                        >
                          <Sparkles size={13} />
                          <span>Auto-sync Details from Document</span>
                        </button>

                        <button
                          type="button"
                          className="apf-reverify-btn"
                          onClick={() => runDocumentVerification(form.documents?.[0]?.id, form)}
                          disabled={verifyingDoc}
                        >
                          <RefreshCw size={13} className={verifyingDoc ? "spin-icon" : ""} />
                          <span>Re-verify Details</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {form.documents.length === 0 && (
                <div className="apf-docs-empty">
                  <FileText size={24} />
                  <p>No document attached yet. Uploading your land ownership document is mandatory to proceed with property publication.</p>
                </div>
              )}
            </div>
          )}

          {/* SECTION F: Review & Publish */}
          {currentStep.id === 'publish' && (
            <div className="apf-step-body animate-fade">
              <div className="apf-review-card">
                <div className="apf-review-image">
                  {form.images.length > 0 ? (
                    <img src={form.images[form.cover_index] || form.images[0]} alt="Cover" />
                  ) : (
                    <div className="apf-review-no-image">
                      <ImageIcon size={32} />
                      <span>No photo added</span>
                    </div>
                  )}
                </div>
                <div className="apf-review-details">
                  <span className="apf-review-type">{form.type}</span>
                  <h3>{form.title || '(Untitled Listing)'}</h3>
                  <p className="apf-review-location">
                    <MapPin size={12} />
                    {[form.address, form.village, form.city, form.state].filter(Boolean).join(', ') || 'Location not set'}
                  </p>
                  <div className="apf-review-meta">
                    <span className="review-price">₹{Number(form.price || 0).toLocaleString('en-IN')}</span>
                    <span>·</span>
                    <span>{form.area || 0} {form.area_unit}</span>
                    {form.price > 0 && form.area > 0 && (
                      <>
                        <span>·</span>
                        <span>₹{Math.round(Number(form.price) / Number(form.area)).toLocaleString('en-IN')} / {form.area_unit}</span>
                      </>
                    )}
                  </div>

                  <div className="apf-doc-status-line" style={{ marginTop: '6px' }}>
                    <span className={`apf-vr-badge status-${(verificationStatus || 'pending').toLowerCase()}`}>
                      <ShieldCheck size={11} /> {verificationStatus}
                    </span>
                    {form.survey_number && (
                      <span className="consistency-tag">Survey No: {form.survey_number}</span>
                    )}
                    {form.owner_name && (
                      <span className="consistency-tag">Owner: {form.owner_name}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Prominent Verification Report in Review */}
              {verificationReport && (
                <div className="apf-verification-report-card">
                  <div className="apf-vr-header">
                    <div className="apf-vr-title">
                      <ShieldCheck size={16} />
                      <span>Document Verification Summary</span>
                    </div>
                    <span className={`apf-vr-badge status-${(verificationStatus || 'pending').toLowerCase()}`}>
                      {verificationStatus}
                    </span>
                  </div>

                  <div className={`apf-vr-banner-msg msg-${(verificationStatus || 'pending').toLowerCase()}`}>
                    {verificationStatus === 'VERIFIED' ? (
                      <CheckCircle2 size={15} />
                    ) : (
                      <AlertCircle size={15} />
                    )}
                    <div>{verificationReport.message}</div>
                  </div>
                </div>
              )}

              {/* Strict Notice if verification not passed */}
              {verificationStatus !== 'VERIFIED' ? (
                <div className="apf-publish-blocked-notice">
                  <AlertCircle size={16} />
                  <div>
                    <strong>Publishing Blocked:</strong> Your property cannot be published because some information in your land document does not match the property details. Please correct the highlighted information in previous steps, or save as a draft to finish later.
                  </div>
                </div>
              ) : (
                <div className="apf-publish-verified-notice">
                  <CheckCircle2 size={16} />
                  <div>
                    <strong>Verification Passed:</strong> All mandatory document checks have succeeded. Your property is verified and ready for publication in the public marketplace.
                  </div>
                </div>
              )}

              {/* Publish Options */}
              <div className="apf-publish-options">
                <div className="apf-publish-option-card" id="publish-draft">
                  <div>
                    <strong>Save as Draft</strong>
                    <p>Save your listing privately. It will NOT appear in public marketplace search results until verified and published.</p>
                  </div>
                  <button
                    type="button"
                    className="apf-option-btn draft"
                    onClick={() => handleSubmit('Draft')}
                    disabled={busy}
                  >
                    <Save size={14} />
                    <span>{busy ? 'Saving...' : 'Save Draft'}</span>
                  </button>
                </div>

                <div className={`apf-publish-option-card ${verificationStatus === 'VERIFIED' ? 'highlighted' : ''}`} id="publish-live">
                  <div>
                    <strong>Publish Property</strong>
                    <p>
                      {verificationStatus === 'VERIFIED'
                        ? 'Make your verified property visible in the public marketplace immediately.'
                        : 'Blocked: Land ownership document verification must be VERIFIED before publishing.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    className={`apf-option-btn publish ${verificationStatus === 'VERIFIED' ? 'verified-ready' : ''}`}
                    onClick={() => handleSubmit('Published')}
                    disabled={busy || verificationStatus !== 'VERIFIED'}
                    title={verificationStatus !== 'VERIFIED' ? 'Property posting is blocked until document verification is VERIFIED.' : 'Publish listing'}
                  >
                    <Globe size={14} />
                    <span>{busy ? 'Publishing...' : verificationStatus === 'VERIFIED' ? 'Publish Verified Property' : 'Publishing Blocked'}</span>
                  </button>
                </div>
              </div>

              <p className="apf-publish-disclaimer">
                <FileText size={12} />
                Strict Policy: Only verified properties with authentic title documents are published publicly on LandAI to protect buyers and sellers from fraud.
              </p>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="apf-footer">
          <button
            type="button"
            className="apf-nav-btn secondary"
            onClick={step === 0 ? onClose : handleBack}
          >
            {step === 0 ? (
              <><X size={14} /><span>Cancel</span></>
            ) : (
              <><ChevronLeft size={14} /><span>Back</span></>
            )}
          </button>

          {step < STEPS.length - 1 && (
            <button
              type="button"
              className="apf-nav-btn primary"
              onClick={handleNext}
            >
              <span>Next</span>
              <ChevronRight size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
