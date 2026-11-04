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
  Info
} from 'lucide-react';

const STEPS = [
  { id: 'basic', label: 'Basic Info', icon: Building2 },
  { id: 'location', label: 'Location', icon: MapPin },
  { id: 'pricing', label: 'Price & Area', icon: IndianRupee },
  { id: 'photos', label: 'Photographs', icon: ImageIcon },
  { id: 'documents', label: 'Documents & OCR', icon: FileCheck2 },
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

  const isEditMode = Boolean(initialProperty && initialProperty.id);

  // Form state
  const [form, setForm] = useState({
    title: initialProperty?.title || '',
    type: initialProperty?.type || 'Plot',
    listing_purpose: 'Sale',
    description: initialProperty?.description || '',
    description_long: initialProperty?.description_long || '',
    owner_declaration: isEditMode ? true : false,
    // Location
    address: initialProperty?.location?.split(',')?.[0]?.trim() || '',
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
    documents: Array.isArray(initialProperty?.documents) ? initialProperty.documents : [],
  });

  const set = (key, val) => {
    setForm((prev) => ({ ...prev, [key]: val }));
    setFieldErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const validateStep = (stepId) => {
    const errors = {};
    if (stepId === 'basic') {
      if (!form.title.trim()) errors.title = 'Property title is required.';
      if (!form.description.trim()) errors.description = 'Description is required.';
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

  // --- Supporting Document Handlers (OCR Integration) ---
  const handleDocFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setGlobalError('');
    setUploadingDoc(true);
    setDocProcessMsg('Uploading supporting document...');

    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    const validExtensions = /\.(pdf|jpe?g|png)$/i;

    if (!validTypes.includes(file.type) && !validExtensions.test(file.name)) {
      setGlobalError('Supported document formats: PDF, JPG, JPEG, PNG.');
      setUploadingDoc(false);
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setGlobalError('Document exceeds 50 MB limit.');
      setUploadingDoc(false);
      return;
    }

    try {
      const token = localStorage.getItem('landai_token');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('language', docLanguage);
      formData.append('document_type', docType);

      // Step 1: Upload
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

      setDocProcessMsg('Running bilingual OCR text extraction...');

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
          body: JSON.stringify({ document_id: upData.local_id ?? upData.id ?? upData.document_id }),
        });
        if (procRes.ok) {
          procData = await procRes.json();
        }
      } catch {
        // OCR fallback if service offline
      }

      setDocProcessMsg('Running legal consistency checks...');

      // Step 3: Validate
      let valData = null;
      try {
        const docId = upData.local_id ?? upData.id ?? upData.document_id;
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
        // fallback
      }

      const extractedFields = procData?.fields || upData?.fields || {};
      const newDocEntry = {
        id: upData.local_id || Date.now(),
        name: file.name,
        type: docType,
        language: docLanguage,
        status: valData ? 'Validated' : procData ? 'Processed' : 'Uploaded',
        fields: extractedFields,
        warnings: valData?.warnings || [],
        consistency: valData?.is_consistent ? 'Consistent' : 'Review Required',
        review_note: 'Uploaded document attached for technical verification.',
        uploaded_at: new Date().toISOString(),
      };

      set('documents', [...form.documents, newDocEntry]);
    } catch (err) {
      setGlobalError(err.message || 'Failed to process document.');
    } finally {
      setUploadingDoc(false);
      setDocProcessMsg('');
      if (docFileInputRef.current) docFileInputRef.current.value = '';
    }
  };

  const handleRemoveDoc = (idx) => {
    set('documents', form.documents.filter((_, i) => i !== idx));
  };

  // --- Submit / Save Handler ---
  const handleSubmit = async (listing_status) => {
    // Validate required steps (basic, location, pricing)
    for (const s of ['basic', 'location', 'pricing']) {
      if (!validateStep(s)) {
        const failIdx = STEPS.findIndex((x) => x.id === s);
        setStep(failIdx);
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

      const payload = {
        title: form.title.trim(),
        location: locationStr,
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
      if (!res.ok) throw new Error(data.error || 'Failed to save listing.');

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
          {/* SECTION A: Basic Info */}
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
                  rows={4}
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
                  placeholder="e.g. Survey No. 42/1B, Avinashi Main Road"
                  className={fieldErrors.address ? 'field-error' : ''}
                />
              </Field>

              <Field label="Village / Locality Name (optional)">
                <input
                  id="apf-village"
                  type="text"
                  value={form.village}
                  onChange={(e) => set('village', e.target.value)}
                  placeholder="e.g. Neelambur Village"
                />
              </Field>

              <div className="apf-two-col">
                <Field label="City / District *" error={fieldErrors.city}>
                  <input
                    id="apf-city"
                    type="text"
                    value={form.city}
                    onChange={(e) => set('city', e.target.value)}
                    placeholder="e.g. Coimbatore"
                    className={fieldErrors.city ? 'field-error' : ''}
                  />
                </Field>
                <Field label="State *" error={fieldErrors.state}>
                  <input
                    id="apf-state"
                    type="text"
                    value={form.state}
                    onChange={(e) => set('state', e.target.value)}
                    placeholder="e.g. Tamil Nadu"
                    className={fieldErrors.state ? 'field-error' : ''}
                  />
                </Field>
              </div>

              <Field label="Postal Code (optional)">
                <input
                  id="apf-postal"
                  type="text"
                  value={form.postal_code}
                  onChange={(e) => set('postal_code', e.target.value)}
                  placeholder="641001"
                  maxLength={6}
                />
              </Field>

              <div className="apf-location-note">
                <MapPin size={13} />
                <span>GPS coordinates are optional. Buyers can contact you to confirm the exact location.</span>
              </div>

              <div className="apf-two-col">
                <Field label="GPS Latitude (optional)">
                  <input
                    id="apf-lat"
                    type="text"
                    value={form.gps_lat}
                    onChange={(e) => set('gps_lat', e.target.value)}
                    placeholder="11.0168"
                  />
                </Field>
                <Field label="GPS Longitude (optional)">
                  <input
                    id="apf-lng"
                    type="text"
                    value={form.gps_lng}
                    onChange={(e) => set('gps_lng', e.target.value)}
                    placeholder="76.9558"
                  />
                </Field>
              </div>
            </div>
          )}

          {/* SECTION C: Price & Area */}
          {currentStep.id === 'pricing' && (
            <div className="apf-step-body animate-fade">
              <Field label="Asking Price (₹ INR) *" error={fieldErrors.price}>
                <input
                  id="apf-price"
                  type="number"
                  value={form.price}
                  onChange={(e) => set('price', e.target.value)}
                  placeholder="4500000"
                  min={1}
                  className={fieldErrors.price ? 'field-error' : ''}
                />
                {form.price > 0 && (
                  <span className="apf-price-preview">
                    {Number(form.price) >= 10000000
                      ? `₹${(Number(form.price) / 10000000).toFixed(2)} Crore`
                      : Number(form.price) >= 100000
                      ? `₹${(Number(form.price) / 100000).toFixed(2)} Lakh`
                      : `₹${Number(form.price).toLocaleString('en-IN')}`}
                  </span>
                )}
              </Field>

              <div className="apf-two-col">
                <Field label="Land Area *" error={fieldErrors.area}>
                  <input
                    id="apf-area"
                    type="number"
                    value={form.area}
                    onChange={(e) => set('area', e.target.value)}
                    placeholder="1500"
                    min={1}
                    className={fieldErrors.area ? 'field-error' : ''}
                  />
                </Field>
                <Field label="Area Unit">
                  <select
                    id="apf-area-unit"
                    value={form.area_unit}
                    onChange={(e) => set('area_unit', e.target.value)}
                  >
                    {AREA_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </Field>
              </div>

              <Field label="Built-up Area (optional)">
                <input
                  id="apf-builtup"
                  type="number"
                  value={form.built_up_area}
                  onChange={(e) => set('built_up_area', e.target.value)}
                  placeholder="Leave blank if raw plot/land"
                  min={0}
                />
              </Field>

              <div className="apf-two-col">
                <Field label="Bedrooms (optional)">
                  <select
                    id="apf-bedrooms"
                    value={form.bedrooms}
                    onChange={(e) => set('bedrooms', e.target.value)}
                  >
                    <option value="">N/A (Plot/Land)</option>
                    {[1,2,3,4,5,6].map((n) => <option key={n} value={n}>{n} BHK</option>)}
                    <option value="7">7+</option>
                  </select>
                </Field>
                <Field label="Bathrooms (optional)">
                  <select
                    id="apf-bathrooms"
                    value={form.bathrooms}
                    onChange={(e) => set('bathrooms', e.target.value)}
                  >
                    <option value="">N/A</option>
                    {[1,2,3,4,5].map((n) => <option key={n} value={n}>{n}</option>)}
                    <option value="6">6+</option>
                  </select>
                </Field>
              </div>

              <div className="apf-two-col">
                <Field label="Road Access">
                  <select
                    id="apf-road"
                    value={form.road_access}
                    onChange={(e) => set('road_access', e.target.value)}
                  >
                    {ROAD_ACCESS_OPTIONS.map((r) => <option key={r} value={r}>{r || 'Not specified'}</option>)}
                  </select>
                </Field>
                <Field label="Facing Direction">
                  <select
                    id="apf-facing"
                    value={form.facing}
                    onChange={(e) => set('facing', e.target.value)}
                  >
                    {FACING_OPTIONS.map((f) => <option key={f} value={f}>{f || 'Not specified'}</option>)}
                  </select>
                </Field>
              </div>

              <Field label="Feature Highlights / Tags (comma separated)">
                <input
                  id="apf-tags"
                  type="text"
                  value={form.tags}
                  onChange={(e) => set('tags', e.target.value)}
                  placeholder="DTCP Approved, East-facing, Clear Title, 40 ft road"
                />
              </Field>

              {form.price > 0 && form.area > 0 && (
                <div className="apf-rate-calc">
                  <span>Price per {form.area_unit}:</span>
                  <strong>₹{Math.round(Number(form.price) / Number(form.area)).toLocaleString('en-IN')} / {form.area_unit}</strong>
                </div>
              )}
            </div>
          )}

          {/* SECTION D: Photographs */}
          {currentStep.id === 'photos' && (
            <div className="apf-step-body animate-fade">
              <div className="apf-photos-info">
                <ImageIcon size={16} />
                <span>Upload property photos or provide web URLs. The marked cover photo will be displayed on marketplace search cards.</span>
              </div>

              {/* Direct File Upload Drop Area */}
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
                <UploadCloud size={28} />
                <div>
                  <strong>Click to browse and upload photographs</strong>
                  <p>Supports JPG, PNG, and WebP (up to 10 MB each)</p>
                </div>
              </div>

              {uploadingImage && (
                <div className="apf-upload-progress-row">
                  <RefreshCw size={14} className="spin-icon" />
                  <span>Uploading photos... {imageUploadProgress}%</span>
                  <div className="apf-progress-track">
                    <div className="apf-progress-bar" style={{ width: `${imageUploadProgress}%` }} />
                  </div>
                </div>
              )}

              {/* Add by URL */}
              <div className="apf-add-image-row">
                <input
                  id="apf-img-url"
                  type="url"
                  placeholder="Or paste an image URL (https://images.unsplash.com/...)"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
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

          {/* SECTION E: Property Documents & OCR */}
          {currentStep.id === 'documents' && (
            <div className="apf-step-body animate-fade">
              <div className="apf-documents-banner">
                <FileCheck2 size={18} />
                <div>
                  <strong>Supporting Title Deeds &amp; Land Records</strong>
                  <p>
                    Attach Patta, Chitta, Sale Deed, or Encumbrance Certificates (EC). Documents are processed via the bilingual OCR module for automated survey number and ownership consistency checks.
                  </p>
                </div>
              </div>

              {/* Upload Controls */}
              <div className="apf-doc-controls-box">
                <div className="apf-two-col">
                  <Field label="Document Category">
                    <select
                      id="apf-doc-type"
                      value={docType}
                      onChange={(e) => setDocType(e.target.value)}
                    >
                      <option value="patta">Patta / Chitta Record</option>
                      <option value="deed">Parent Sale Deed</option>
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
                    <strong>Upload Supporting Document File</strong>
                    <p>PDF or scanned image (up to 50 MB) — automatically queued for OCR inspection</p>
                  </div>
                </div>

                {uploadingDoc && (
                  <div className="apf-doc-processing-status">
                    <RefreshCw size={14} className="spin-icon" />
                    <span>{docProcessMsg || 'Analyzing land record with OCR engine...'}</span>
                  </div>
                )}
              </div>

              {/* Uploaded Documents List */}
              <div className="apf-doc-list-section">
                <h4>Attached Documents ({form.documents.length})</h4>

                {form.documents.length === 0 ? (
                  <div className="apf-docs-empty">
                    <FileText size={24} />
                    <p>No documents attached yet. You can still publish; documents can be added later or verified upon buyer inquiry.</p>
                  </div>
                ) : (
                  <div className="apf-docs-grid">
                    {form.documents.map((doc, idx) => (
                      <div key={idx} className="apf-doc-card">
                        <div className="apf-doc-card-top">
                          <div className="apf-doc-icon-title">
                            <FileCheck2 size={16} />
                            <div>
                              <strong>{doc.name}</strong>
                              <span className="apf-doc-type-pill">{doc.type.toUpperCase()}</span>
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

                        <div className="apf-doc-status-line">
                          <span className={`status-tag ${doc.status === 'Validated' ? 'valid' : 'pending'}`}>
                            {doc.status}
                          </span>
                          <span className="consistency-tag">{doc.consistency}</span>
                        </div>

                        {/* Extracted Fields Preview */}
                        {doc.fields && Object.keys(doc.fields).length > 0 && (
                          <div className="apf-doc-extracted-fields">
                            <span className="fields-title">Extracted Metadata:</span>
                            <div className="fields-grid">
                              {doc.fields.survey_number && (
                                <div className="field-pair">
                                  <span>Survey No:</span>
                                  <strong>{doc.fields.survey_number}</strong>
                                </div>
                              )}
                              {doc.fields.patta_number && (
                                <div className="field-pair">
                                  <span>Patta No:</span>
                                  <strong>{doc.fields.patta_number}</strong>
                                </div>
                              )}
                              {doc.fields.district && (
                                <div className="field-pair">
                                  <span>District:</span>
                                  <strong>{doc.fields.district}</strong>
                                </div>
                              )}
                              {doc.fields.owner_name && (
                                <div className="field-pair">
                                  <span>Owner:</span>
                                  <strong>{doc.fields.owner_name}</strong>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="apf-doc-review-disclaimer">
                          <Info size={11} />
                          <span>Technical consistency check performed. Physical deed verification required at SRO.</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
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
                  <p className="apf-review-desc">{form.description || '(No description provided)'}</p>

                  <div className="apf-review-tags">
                    {form.tags.split(',').map((t, idx) => (
                      <span key={idx} className="feature-tag">{t.trim()}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Documents & Photos summary counters */}
              <div className="apf-review-summary-row">
                <div className="summary-chip">
                  <ImageIcon size={13} />
                  <span>{form.images.length} {form.images.length === 1 ? 'Photo' : 'Photos'} attached</span>
                </div>
                <div className="summary-chip">
                  <FileCheck2 size={13} />
                  <span>{form.documents.length} {form.documents.length === 1 ? 'Document' : 'Documents'} processed</span>
                </div>
              </div>

              {/* Publish Options */}
              <div className="apf-publish-options">
                <div className="apf-publish-option-card" id="publish-draft">
                  <div>
                    <strong>Save as Draft</strong>
                    <p>Save your listing privately. It will NOT appear in public marketplace search results until published.</p>
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

                <div className="apf-publish-option-card highlighted" id="publish-live">
                  <div>
                    <strong>Publish Property</strong>
                    <p>Make your listing visible to all prospective buyers in the public marketplace immediately.</p>
                  </div>
                  <button
                    type="button"
                    className="apf-option-btn publish"
                    onClick={() => handleSubmit('Published')}
                    disabled={busy}
                  >
                    <Globe size={14} />
                    <span>{busy ? 'Publishing...' : isEditMode ? 'Save & Publish' : 'Publish Property'}</span>
                  </button>
                </div>
              </div>

              <p className="apf-publish-disclaimer">
                <FileText size={12} />
                Published properties appear directly in public marketplace search. You can unpublish, edit, or remove listings at any time from your Seller Dashboard.
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
