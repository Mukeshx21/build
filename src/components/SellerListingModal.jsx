import React, { useState } from 'react';
import {
  X,
  PlusCircle,
  Building,
  MapPin,
  IndianRupee,
  Maximize2,
  Image,
  Tag,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function SellerListingModal({
  isOpen,
  onClose,
  onListingCreated,
  user
}) {
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [price, setPrice] = useState('');
  const [area, setArea] = useState('');
  const [type, setType] = useState('Plot');
  const [image, setImage] = useState('');
  const [tags, setTags] = useState('DTCP Approved, East-facing, Clear Title');
  const [description, setDescription] = useState('');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const defaultImages = [
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1505843795480-5cfb3c03f6ff?auto=format&fit=crop&w=1200&q=85',
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);

    try {
      const token = localStorage.getItem('landai_token');
      const tagList = tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const res = await fetch('/api/properties', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({
          title: title.trim(),
          location: location.trim(),
          price: Number(price),
          area: Number(area),
          type,
          image: image.trim() || defaultImages[Math.floor(Math.random() * defaultImages.length)],
          tags: tagList,
          description: description.trim(),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to publish listing.');
      }

      setSuccess(true);
      setTimeout(() => {
        onListingCreated(data.property);
        onClose();
      }, 1000);
    } catch (err) {
      setError(err.message || 'An error occurred while creating the listing.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="property-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="seller-modal-window" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-icon-btn" onClick={onClose} aria-label="Close modal">
          <X size={18} />
        </button>

        <div className="seller-modal-header">
          <div className="seller-icon-circle">
            <PlusCircle size={22} />
          </div>
          <div>
            <h2>List a New Property</h2>
            <p>Publish your property parcel on Terra with verified specifications</p>
          </div>
        </div>

        {error && (
          <div className="auth-alert error">
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="auth-alert success">
            <CheckCircle2 size={15} />
            <span>Property listing published successfully!</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="seller-form-body">
          <div className="input-group">
            <label htmlFor="list-title">Listing Title</label>
            <input
              id="list-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Terra Vista Villa Site, Kovilpalayam"
              required
            />
          </div>

          <div className="form-row-dual">
            <div className="input-group">
              <label htmlFor="list-loc">Location / Address</label>
              <input
                id="list-loc"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Sarjapur Road, Bengaluru"
                required
              />
            </div>

            <div className="input-group">
              <label htmlFor="list-type">Property Category</label>
              <select id="list-type" value={type} onChange={(e) => setType(e.target.value)}>
                <option value="Plot">Plot / Land</option>
                <option value="Residential">Residential Site</option>
                <option value="Villa">Independent Villa</option>
                <option value="Commercial">Commercial Land</option>
              </select>
            </div>
          </div>

          <div className="form-row-dual">
            <div className="input-group">
              <label htmlFor="list-price">Total Price (₹ INR)</label>
              <input
                id="list-price"
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="4500000"
                min={10000}
                required
              />
            </div>

            <div className="input-group">
              <label htmlFor="list-area">Plot Area (sq. ft.)</label>
              <input
                id="list-area"
                type="number"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                placeholder="1500"
                min={50}
                required
              />
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="list-img">Photograph URL (optional, high-resolution)</label>
            <input
              id="list-img"
              type="url"
              value={image}
              onChange={(e) => setImage(e.target.value)}
              placeholder="https://images.unsplash.com/..."
            />
          </div>

          <div className="input-group">
            <label htmlFor="list-tags">Highlights / Tags (comma separated)</label>
            <input
              id="list-tags"
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="DTCP Approved, East-facing, 30ft Road"
            />
          </div>

          <div className="input-group">
            <label htmlFor="list-desc">Property Description</label>
            <textarea
              id="list-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe access roads, groundwater availability, zoning approvals, and boundaries..."
            />
          </div>

          <button type="submit" className="seller-submit-btn" disabled={busy}>
            {busy ? 'Publishing Listing…' : 'Publish Property Listing'}
          </button>
        </form>
      </div>
    </div>
  );
}
