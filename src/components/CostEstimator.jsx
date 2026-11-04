import React, { useState } from 'react';
import {
  Calculator,
  IndianRupee,
  Layers,
  Building,
  Check,
  Zap,
  Droplet,
  Fence,
  FileText,
  PieChart
} from 'lucide-react';

export default function CostEstimator() {
  const [state, setState] = useState('tamil_nadu'); // 'tamil_nadu' | 'karnataka'
  const [landArea, setLandArea] = useState(1500); // sq.ft
  const [landRatePerSqft, setLandRatePerSqft] = useState(3200); // INR per sq.ft
  const [includeConstruction, setIncludeConstruction] = useState(true);
  const [builtUpArea, setBuiltUpArea] = useState(1800); // sq.ft
  const [constructionQuality, setConstructionQuality] = useState('premium'); // 'standard' | 'premium' | 'luxury'

  // Site development add-ons
  const [hasCompoundWall, setHasCompoundWall] = useState(true);
  const [hasBorewell, setHasBorewell] = useState(true);
  const [hasEbConnection, setHasEbConnection] = useState(true);

  // Calculations
  const totalLandPrice = landArea * landRatePerSqft;

  // Stamp duty & registration rates
  // Tamil Nadu: 7% Stamp Duty + 4% Registration Fee
  // Karnataka: 5% Stamp Duty + 2% Registration Fee + 0.6% cess/surcharge
  const stampDutyRate = state === 'tamil_nadu' ? 0.07 : 0.05;
  const regFeeRate = state === 'tamil_nadu' ? 0.04 : 0.02;

  const stampDutyAmount = Math.round(totalLandPrice * stampDutyRate);
  const registrationFeeAmount = Math.round(totalLandPrice * regFeeRate);
  const legalDocumentationFee = 25000; // Average drafting, patta mutation, and survey charges
  const totalAcquisitionCost = totalLandPrice + stampDutyAmount + registrationFeeAmount + legalDocumentationFee;

  // Construction Cost
  const qualityRates = {
    standard: 1800,
    premium: 2400,
    luxury: 3200,
  };

  const constructionRate = qualityRates[constructionQuality];
  const totalConstructionCost = includeConstruction ? builtUpArea * constructionRate : 0;

  // Site development costs
  const compoundWallCost = hasCompoundWall ? Math.round(Math.sqrt(landArea) * 4 * 1200) : 0; // Perimeter * rate
  const borewellCost = hasBorewell ? 140000 : 0; // 350-400 ft drilling + casing + sub pump
  const ebConnectionCost = hasEbConnection ? 35000 : 0; // 3-phase EB meter & infrastructure

  const totalSiteDevCost = compoundWallCost + borewellCost + ebConnectionCost;
  const grandTotalCost = totalAcquisitionCost + totalConstructionCost + totalSiteDevCost;

  const formatInr = (num) => `₹${num.toLocaleString('en-IN')}`;

  return (
    <section className="cost-estimator-page">
      <div className="section-header-block">
        <div>
          <div className="hero-eyebrow">
            <span className="eyebrow-pill">PROJECT BUDGET CALCULATOR</span>
            <span className="eyebrow-note">STAMP DUTY, REGISTRATION &amp; BUILD RATES</span>
          </div>
          <h1>Cost Estimator</h1>
          <p className="section-subtext">
            Accurately plan your land acquisition, legal registration taxes, site preparation, and residential construction outlays.
          </p>
        </div>
      </div>

      <div className="estimator-layout-grid">
        {/* Left: Input Console */}
        <div className="estimator-form-column">
          {/* 1. Land & Location Details */}
          <div className="estimator-card-block">
            <div className="estimator-card-heading">
              <span className="step-num">1</span>
              <div>
                <h3>Land &amp; Jurisdiction</h3>
                <p>Select state registration rates and plot dimensions</p>
              </div>
            </div>

            <div className="estimator-inputs-row">
              <div className="input-group">
                <label htmlFor="est-state">State Jurisdiction</label>
                <select
                  id="est-state"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                >
                  <option value="tamil_nadu">Tamil Nadu (7% Stamp + 4% Reg = 11%)</option>
                  <option value="karnataka">Karnataka (5% Stamp + 2% Reg = 7%)</option>
                </select>
              </div>

              <div className="input-group">
                <label htmlFor="est-area">Land Area (sq. ft.)</label>
                <input
                  id="est-area"
                  type="number"
                  value={landArea}
                  onChange={(e) => setLandArea(Math.max(100, Number(e.target.value) || 0))}
                  min={100}
                  step={50}
                />
                <span className="input-subnote">
                  approx. {(landArea / 435.6).toFixed(2)} Cents
                </span>
              </div>

              <div className="input-group">
                <label htmlFor="est-rate">Land Price per sq. ft. (₹)</label>
                <input
                  id="est-rate"
                  type="number"
                  value={landRatePerSqft}
                  onChange={(e) => setLandRatePerSqft(Math.max(100, Number(e.target.value) || 0))}
                  min={100}
                  step={100}
                />
              </div>
            </div>
          </div>

          {/* 2. Construction Parameters */}
          <div className="estimator-card-block">
            <div className="estimator-card-heading">
              <span className="step-num">2</span>
              <div>
                <h3>Home Construction (Optional)</h3>
                <p>Plan superstructure and architectural finishing</p>
              </div>
            </div>

            <div className="toggle-include-row">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={includeConstruction}
                  onChange={(e) => setIncludeConstruction(e.target.checked)}
                />
                <span>Include House / Villa Construction Estimate</span>
              </label>
            </div>

            {includeConstruction && (
              <div className="construction-inputs-wrapper">
                <div className="input-group">
                  <label htmlFor="est-builtup">Proposed Built-Up Area (sq. ft.)</label>
                  <input
                    id="est-builtup"
                    type="number"
                    value={builtUpArea}
                    onChange={(e) => setBuiltUpArea(Math.max(100, Number(e.target.value) || 0))}
                    min={100}
                    step={100}
                  />
                </div>

                <div className="quality-selector-group">
                  <label>Construction Specification Level</label>
                  <div className="quality-options-grid">
                    {[
                      {
                        id: 'standard',
                        title: 'Standard',
                        rate: '₹1,800/sqft',
                        desc: 'Vitrified tiles, standard fittings, brick structure',
                      },
                      {
                        id: 'premium',
                        title: 'Premium',
                        rate: '₹2,400/sqft',
                        desc: 'Granite/Italian flooring, teak wood, premium fixtures',
                      },
                      {
                        id: 'luxury',
                        title: 'Luxury',
                        rate: '₹3,200/sqft',
                        desc: 'Architect-designed, marble, smart home wiring & solar',
                      },
                    ].map((q) => (
                      <div
                        key={q.id}
                        className={`quality-card ${constructionQuality === q.id ? 'active' : ''}`}
                        onClick={() => setConstructionQuality(q.id)}
                      >
                        <div className="quality-card-head">
                          <strong>{q.title}</strong>
                          <span className="quality-rate">{q.rate}</span>
                        </div>
                        <p>{q.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 3. Site Development & Utilities */}
          <div className="estimator-card-block">
            <div className="estimator-card-heading">
              <span className="step-num">3</span>
              <div>
                <h3>Site Development Add-ons</h3>
                <p>Essential utilities and site preparation</p>
              </div>
            </div>

            <div className="addons-checklist-grid">
              <label className={`addon-check-card ${hasCompoundWall ? 'active' : ''}`}>
                <input
                  type="checkbox"
                  checked={hasCompoundWall}
                  onChange={(e) => setHasCompoundWall(e.target.checked)}
                />
                <div className="addon-meta">
                  <div className="addon-icon">
                    <Fence size={16} />
                  </div>
                  <div>
                    <strong>Perimeter Compound Wall &amp; Gate</strong>
                    <span>Est. {formatInr(compoundWallCost)} (boundary fencing)</span>
                  </div>
                </div>
              </label>

              <label className={`addon-check-card ${hasBorewell ? 'active' : ''}`}>
                <input
                  type="checkbox"
                  checked={hasBorewell}
                  onChange={(e) => setHasBorewell(e.target.checked)}
                />
                <div className="addon-meta">
                  <div className="addon-icon">
                    <Droplet size={16} />
                  </div>
                  <div>
                    <strong>Deep Borewell &amp; Submersible Pump</strong>
                    <span>Est. {formatInr(borewellCost)} (drilling + casing)</span>
                  </div>
                </div>
              </label>

              <label className={`addon-check-card ${hasEbConnection ? 'active' : ''}`}>
                <input
                  type="checkbox"
                  checked={hasEbConnection}
                  onChange={(e) => setHasEbConnection(e.target.checked)}
                />
                <div className="addon-meta">
                  <div className="addon-icon">
                    <Zap size={16} />
                  </div>
                  <div>
                    <strong>3-Phase Electricity (EB) Infrastructure</strong>
                    <span>Est. {formatInr(ebConnectionCost)} (meter deposit)</span>
                  </div>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Right: Comprehensive Budget Breakdown Sheet */}
        <div className="estimator-summary-column">
          <div className="cost-summary-card">
            <div className="summary-card-header">
              <Calculator size={20} />
              <div>
                <h3>Total Investment Summary</h3>
                <span>Detailed Cost Breakdown</span>
              </div>
            </div>

            {/* Grand Total Callout */}
            <div className="grand-total-callout">
              <span className="grand-total-label">ESTIMATED TOTAL OUTLAY</span>
              <strong className="grand-total-figure">{formatInr(grandTotalCost)}</strong>
              <span className="grand-total-sub">
                Includes land, statutory registration, site setup &amp; build
              </span>
            </div>

            {/* Sectional Breakdown Table */}
            <div className="summary-breakdown-table">
              {/* Part 1: Land Acquisition */}
              <div className="breakdown-category">
                <div className="category-title-row">
                  <strong>A. Land Acquisition &amp; Statutory Taxes</strong>
                  <span>{formatInr(totalAcquisitionCost)}</span>
                </div>
                <div className="breakdown-subrow">
                  <span>Base Land Value ({landArea} sq.ft @ ₹{landRatePerSqft})</span>
                  <span>{formatInr(totalLandPrice)}</span>
                </div>
                <div className="breakdown-subrow">
                  <span>Stamp Duty ({(stampDutyRate * 100).toFixed(0)}%)</span>
                  <span>{formatInr(stampDutyAmount)}</span>
                </div>
                <div className="breakdown-subrow">
                  <span>Registration Fees ({(regFeeRate * 100).toFixed(0)}%)</span>
                  <span>{formatInr(registrationFeeAmount)}</span>
                </div>
                <div className="breakdown-subrow">
                  <span>Legal Drafting, Survey &amp; Patta Mutation</span>
                  <span>{formatInr(legalDocumentationFee)}</span>
                </div>
              </div>

              {/* Part 2: Construction (if included) */}
              {includeConstruction && (
                <div className="breakdown-category">
                  <div className="category-title-row">
                    <strong>B. Superstructure Construction</strong>
                    <span>{formatInr(totalConstructionCost)}</span>
                  </div>
                  <div className="breakdown-subrow">
                    <span>
                      {constructionQuality.toUpperCase()} Quality ({builtUpArea} sq.ft @ ₹{constructionRate}/sq.ft)
                    </span>
                    <span>{formatInr(totalConstructionCost)}</span>
                  </div>
                </div>
              )}

              {/* Part 3: Site Development Add-ons */}
              <div className="breakdown-category">
                <div className="category-title-row">
                  <strong>C. Site Infrastructure &amp; Utilities</strong>
                  <span>{formatInr(totalSiteDevCost)}</span>
                </div>
                {hasCompoundWall && (
                  <div className="breakdown-subrow">
                    <span>Compound Wall &amp; Security Gate</span>
                    <span>{formatInr(compoundWallCost)}</span>
                  </div>
                )}
                {hasBorewell && (
                  <div className="breakdown-subrow">
                    <span>Borewell Drilling &amp; Pump</span>
                    <span>{formatInr(borewellCost)}</span>
                  </div>
                )}
                {hasEbConnection && (
                  <div className="breakdown-subrow">
                    <span>EB 3-Phase Meter &amp; Earthing</span>
                    <span>{formatInr(ebConnectionCost)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Note on Guideline vs Market */}
            <div className="estimator-footnote">
              <p>
                <strong>Statutory Note:</strong> Stamp duty in {state === 'tamil_nadu' ? 'Tamil Nadu' : 'Karnataka'} is payable on whichever is higher between the actual sale consideration or the state Government Guideline Value. Actual bank loan eligibility typically covers 75% to 80% of the total evaluated project value.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
