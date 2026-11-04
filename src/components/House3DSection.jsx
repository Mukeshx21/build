import React from 'react';
import {
  Compass,
  Box,
  Layers,
  Sparkles,
  ArrowRight,
  Maximize2,
  Palette,
  Sun,
  LayoutGrid,
  Eye,
  CheckCircle2,
  ChevronRight,
  Home,
  ShieldCheck
} from 'lucide-react';
import { TEMPLATE_PROJECTS } from '../archicraft/templates/initialProjects';
import { useStudioStore } from '../archicraft/store/useStudioStore';

export default function House3DSection({ onOpenStudio, onOpenTemplates }) {
  const loadProject = useStudioStore((s) => s.loadProject);

  const handleLaunchTemplate = (tpl) => {
    loadProject(JSON.parse(JSON.stringify(tpl.data)));
    onOpenStudio();
  };

  return (
    <section className="house-3d-feature-section" id="3d-house-studio-anchor">
      <div className="house-3d-container">
        {/* Section Header */}
        <div className="house-3d-header-row">
          <div className="house-3d-header-copy">
            <div className="hero-eyebrow">
              <span className="eyebrow-pill">ARCHITECTURAL 3D BIM ENGINE</span>
              <span className="eyebrow-note">INTEGRATED 3D CAD STUDIO</span>
            </div>
            <h2 className="house-3d-title">
              Design Your Dream Home{' '}
              <span className="gradient-text-cyan">in Real 3D.</span>
            </h2>
            <p className="house-3d-subtitle">
              Plan and customize your dream residence directly for any land parcel or residential site.
              Construct real walls, add multi-pitch roofs, assign PBR materials, and walk through your home in first-person—directly inside Terra.
            </p>
          </div>

          <div className="house-3d-header-actions">
            <button
              type="button"
              onClick={onOpenTemplates}
              className="terra-btn-secondary"
            >
              <Layers size={15} className="text-sky-400" />
              <span>Explore Templates</span>
            </button>
            <button
              type="button"
              onClick={onOpenStudio}
              className="terra-btn-primary"
              id="btn-start-designing-3d"
            >
              <Sparkles size={15} className="text-amber-200" />
              <span>Start Designing</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>

        {/* Interactive Architectural Showcase Card */}
        <div className="house-3d-showcase-card">
          {/* Top Mock CAD Titlebar */}
          <div className="cad-mock-titlebar">
            <div className="cad-dots">
              <span className="dot dot-red" />
              <span className="dot dot-yellow" />
              <span className="dot dot-green" />
              <span className="cad-filename">Contemporary_Luxury_Villa_380m2.cad</span>
            </div>
            <div className="cad-stats">
              <span className="stat-pill text-sky-400">Viewport: 3D Perspective</span>
              <span className="stat-pill text-slate-400">Lighting: Golden Hour</span>
              <span className="stat-pill text-emerald-400">PBR Shadows Active</span>
            </div>
          </div>

          {/* Card Hero Viewport Preview */}
          <div className="cad-mock-viewport">
            {/* Grid Floor */}
            <div className="cad-perspective-grid" />

            <div className="cad-preview-content">
              <div className="cad-icon-badge">
                <Home size={36} className="text-sky-300 stroke-[1.5]" />
              </div>

              <div className="cad-preview-text">
                <h3>Contemporary Luxury Villa</h3>
                <p>
                  Multi-storey luxury residence featuring open-span living hall, floor-to-ceiling glass curtain walls, cantilever roof overhangs, swimming pool deck, and travertine finishes.
                </p>
              </div>

              <div className="cad-specs-row">
                <span className="spec-tag">Footprint: 16.0m × 16.0m</span>
                <span className="spec-tag text-emerald-300">Total Area: 380 m²</span>
                <span className="spec-tag text-amber-300">4BHK • Multi-Storey Elevation</span>
                <span className="spec-tag text-cyan-300">Infinity Pool &amp; Terrace Deck</span>
              </div>

              <div className="cad-cta-actions">
                <button
                  type="button"
                  onClick={onOpenStudio}
                  className="cad-launch-btn"
                >
                  <Compass size={15} />
                  <span>Launch Interactive 3D Studio</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>

            {/* Overlaid Corner Hints */}
            <div className="cad-corner-hint top-left">
              <span className="hint-title">CAD MODELING CONTROLS</span>
              <span>[W] Move • [E] Rotate • [R] Scale</span>
              <span>[1] 3D • [2] 2D Blueprint • [3] Walkthrough</span>
            </div>

            <div className="cad-corner-hint bottom-right">
              <span className="hint-status text-emerald-400">ENGINE READY</span>
              <span>Click to add walls, slabs, roofs &amp; doors</span>
            </div>
          </div>
        </div>

        {/* 5 Core Feature Highlights */}
        <div className="house-3d-features-grid">
          <div className="house-feature-box">
            <div className="feature-icon-wrapper text-sky-400 bg-sky-950/50 border-sky-800/40">
              <Box size={20} />
            </div>
            <h4>Parametric Walls &amp; Openings</h4>
            <p>
              Draw walls with accurate thickness, lintels, stone sills, sliding patio doors, and grand entrance portals.
            </p>
          </div>

          <div className="house-feature-box">
            <div className="feature-icon-wrapper text-emerald-400 bg-emerald-950/50 border-emerald-800/40">
              <LayoutGrid size={20} />
            </div>
            <h4>2D Blueprint Synchronizer</h4>
            <p>
              Top-down orthographic floor plan editor with snap-to-grid, live square-footage calculations, and instant 3D sync.
            </p>
          </div>

          <div className="house-feature-box">
            <div className="feature-icon-wrapper text-amber-400 bg-amber-950/50 border-amber-800/40">
              <Palette size={20} />
            </div>
            <h4>Physically Based Materials</h4>
            <p>
              Curated library of Carrara marble, oak hardwood, formwork concrete, travertine stone, low-iron glass, and standing seam zinc.
            </p>
          </div>

          <div className="house-feature-box">
            <div className="feature-icon-wrapper text-cyan-400 bg-cyan-950/50 border-cyan-800/40">
              <Sun size={20} />
            </div>
            <h4>Dynamic Sunlight &amp; Time of Day</h4>
            <p>
              Simulate true solar orientation (Dawn, Noon, Golden Hour, Sunset, Night) with soft shadows and interior spot lighting.
            </p>
          </div>

          <div className="house-feature-box">
            <div className="feature-icon-wrapper text-purple-400 bg-purple-950/50 border-purple-800/40">
              <Eye size={20} />
            </div>
            <h4>Human Eye-Level Walkthrough</h4>
            <p>
              Explore your designed house interior in first-person at eye level (1.65m) using [W][A][S][D] keyboard controls.
            </p>
          </div>
        </div>

        {/* Quick Template Picker Bar */}
        <div className="house-3d-templates-strip">
          <div className="templates-strip-header">
            <div>
              <span className="strip-eyebrow">READY-TO-CUSTOMIZE ARCHITECTURE</span>
              <h3>Architectural Starting Templates</h3>
            </div>
            <button
              type="button"
              onClick={onOpenTemplates}
              className="text-link-sky"
            >
              <span>View All Templates Gallery</span>
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="templates-mini-cards">
            {TEMPLATE_PROJECTS.slice(0, 3).map((tpl) => (
              <div key={tpl.id} className="template-mini-card">
                <div>
                  <span className="tpl-tag">{tpl.tag}</span>
                  <h4>{tpl.name}</h4>
                  <p>{tpl.description}</p>
                </div>
                <div className="tpl-card-footer">
                  <span className="tpl-count">{tpl.data.objects.length} BIM Elements</span>
                  <button
                    type="button"
                    onClick={() => handleLaunchTemplate(tpl)}
                    className="tpl-launch-btn"
                  >
                    <span>Customize</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
