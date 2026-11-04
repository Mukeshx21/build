import React, { useState } from 'react';
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
  Shield,
  Download,
  Eye,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
  Cpu,
  Building2,
  PenTool,
  Home
} from 'lucide-react';
import { TEMPLATE_PROJECTS } from '../templates/initialProjects';
import { useStudioStore } from '../store/useStudioStore';

interface LandingPageProps {
  onStartDesigning: () => void;
  onOpenTemplates: () => void;
  onNavigateMarketplace?: () => void;
  onSelectTemplate?: (templateData: any) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onStartDesigning,
  onOpenTemplates,
  onNavigateMarketplace,
  onSelectTemplate
}) => {
  const loadProject = useStudioStore((s) => s.loadProject);
  const setViewMode = useStudioStore((s) => s.setViewMode);

  const [activeFeatureTab, setActiveFeatureTab] = useState<'3d' | '2d' | 'materials' | 'lighting' | 'walkthrough'>('3d');

  const handleLaunchWithTemplate = (tpl: any) => {
    loadProject(JSON.parse(JSON.stringify(tpl.data)));
    if (onSelectTemplate) {
      onSelectTemplate(tpl.data);
    }
    onStartDesigning();
  };

  const handleOpen2D = () => {
    setViewMode('2d');
    onStartDesigning();
  };

  return (
    <div className="min-h-screen bg-[#070a10] text-slate-100 font-sans selection:bg-sky-500 selection:text-white">
      {/* 1. TOP NAVIGATION BAR */}
      <header className="sticky top-0 z-40 h-16 bg-[#0a0e17]/85 backdrop-blur-md border-b border-[#1b2334] px-6 lg:px-12 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-sky-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-sky-500/25">
            <Compass className="text-white w-5 h-5 stroke-[2.5]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-extrabold text-base tracking-tight text-white">
              ArchiCraft<span className="text-sky-400">3D</span>
            </span>
            <span className="hidden sm:inline-block px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest bg-sky-950/80 text-sky-400 border border-sky-800/60 rounded">
              BIM CAD PRO
            </span>
          </div>
        </div>

        {/* Center Nav Links */}
        <nav className="hidden md:flex items-center gap-7 text-xs font-semibold text-slate-300">
          <a href="#features" className="hover:text-sky-400 transition-colors">
            Features
          </a>
          <a href="#templates" className="hover:text-sky-400 transition-colors">
            Templates
          </a>
          <a href="#workflow" className="hover:text-sky-400 transition-colors">
            CAD Engine
          </a>
          <button
            onClick={handleOpen2D}
            className="hover:text-sky-400 transition-colors"
          >
            2D Blueprint
          </button>
          {onNavigateMarketplace && (
            <button
              onClick={onNavigateMarketplace}
              className="text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
            >
              <Building2 size={13} />
              <span>Properties Directory</span>
            </button>
          )}
        </nav>

        {/* CTA Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenTemplates}
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:text-white bg-[#131926] hover:bg-[#1a2334] border border-[#232d42] transition-colors"
          >
            <Layers size={14} className="text-sky-400" />
            <span>Explore Templates</span>
          </button>

          <button
            onClick={onStartDesigning}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 shadow-lg shadow-sky-500/25 transition-all transform hover:-translate-y-0.5"
            id="btn-hero-start-designing"
          >
            <Sparkles size={14} className="text-amber-200" />
            <span>Start Designing</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section className="relative pt-16 pb-24 px-6 lg:px-12 max-w-7xl mx-auto overflow-hidden">
        {/* Subtle Background Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-sky-500/10 blur-[130px] rounded-full pointer-events-none" />
        <div className="absolute top-1/3 left-1/4 w-[400px] h-[250px] bg-blue-600/10 blur-[110px] rounded-full pointer-events-none" />

        <div className="text-center max-w-4xl mx-auto space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#121926] border border-sky-500/30 text-sky-400 text-xs font-semibold shadow-inner">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span>Next-Generation Architectural House Modeling</span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-300 font-mono">WebCAD 3.0</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.12]">
            Design Your Dream Home{' '}
            <span className="bg-gradient-to-r from-sky-400 via-cyan-300 to-blue-500 bg-clip-text text-transparent">
              in Real 3D.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Professional browser-based architectural software. Construct real multi-storey geometry, draw synchronized 2D floor plans, customize PBR materials, and walk through your house in first-person—zero installation required.
          </p>

          {/* Primary Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <button
              onClick={onStartDesigning}
              className="flex items-center gap-2.5 px-7 py-3.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 shadow-xl shadow-sky-500/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <Box size={18} />
              <span>Launch 3D Studio</span>
              <ArrowRight size={16} />
            </button>

            <button
              onClick={onOpenTemplates}
              className="flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold text-slate-200 hover:text-white bg-[#141a27] hover:bg-[#1a2336] border border-[#232e44] hover:border-sky-500/60 shadow-md transition-all"
            >
              <Layers size={17} className="text-sky-400" />
              <span>Explore Templates</span>
            </button>

            <button
              onClick={handleOpen2D}
              className="flex items-center gap-2 px-5 py-3.5 rounded-xl text-sm font-semibold text-slate-300 hover:text-white bg-[#101420] hover:bg-[#161c2c] border border-[#1d2638] transition-colors"
            >
              <LayoutGrid size={16} className="text-emerald-400" />
              <span>2D Blueprint Mode</span>
            </button>
          </div>

          {/* Trust/Capabilities ribbon */}
          <div className="pt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 text-left max-w-3xl mx-auto">
            <div className="p-3 rounded-lg bg-[#0e131d] border border-[#1b2334]">
              <div className="text-sky-400 font-bold text-sm">True 3D BIM</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Parametric walls, openings & roofs</div>
            </div>
            <div className="p-3 rounded-lg bg-[#0e131d] border border-[#1b2334]">
              <div className="text-sky-400 font-bold text-sm">2D / 3D Sync</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Real-time floor plan alignment</div>
            </div>
            <div className="p-3 rounded-lg bg-[#0e131d] border border-[#1b2334]">
              <div className="text-sky-400 font-bold text-sm">PBR Materials</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Marble, travertine, wood & glass</div>
            </div>
            <div className="p-3 rounded-lg bg-[#0e131d] border border-[#1b2334]">
              <div className="text-sky-400 font-bold text-sm">Vector CAD Export</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Scale blueprints in SVG & PNG</div>
            </div>
          </div>
        </div>

        {/* Hero Architectural Interactive Showcase Mockup */}
        <div className="mt-14 max-w-5xl mx-auto relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/30 via-sky-500/20 to-cyan-500/30 rounded-2xl blur-lg opacity-70 group-hover:opacity-100 transition-opacity" />

          <div className="relative rounded-2xl bg-[#0c101a] border border-[#232e44] overflow-hidden shadow-2xl">
            {/* Mock CAD Viewport Top Bar */}
            <div className="h-10 bg-[#090d15] border-b border-[#1b2436] px-4 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500/60 inline-block" />
                <span className="w-3 h-3 rounded-full bg-amber-500/60 inline-block" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/60 inline-block" />
                <span className="ml-3 font-mono text-[11px] text-slate-300 font-semibold">
                  Contemporary_Luxury_Villa_380m2.cad
                </span>
              </div>
              <div className="flex items-center gap-3 font-mono text-[11px]">
                <span className="text-sky-400">Viewport: 3D Perspective</span>
                <span>•</span>
                <span>Lighting: Golden Hour</span>
                <span>•</span>
                <span className="text-emerald-400">PBR Shadows Active</span>
              </div>
            </div>

            {/* Mock Viewport Content */}
            <div className="relative h-[380px] sm:h-[460px] bg-gradient-to-b from-[#101726] to-[#080c14] flex items-center justify-center overflow-hidden">
              {/* Architectural Grid Floor */}
              <div
                className="absolute inset-0 opacity-25"
                style={{
                  backgroundImage: `
                    linear-gradient(to right, #38bdf8 1px, transparent 1px),
                    linear-gradient(to bottom, #38bdf8 1px, transparent 1px)
                  `,
                  backgroundSize: '40px 40px',
                  transform: 'perspective(600px) rotateX(60deg) translateY(120px)'
                }}
              />

              {/* 3D House Visual Showcase Diagram */}
              <div className="relative z-10 flex flex-col items-center text-center p-6 space-y-4">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600/30 to-cyan-500/20 border border-sky-400/40 flex items-center justify-center shadow-2xl backdrop-blur-md">
                  <Home size={38} className="text-sky-300 stroke-[1.5]" />
                </div>

                <div className="space-y-1 max-w-md">
                  <h3 className="text-xl font-bold text-white tracking-tight">
                    Contemporary Luxury Villa (Interactive 3D Engine)
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Featuring open-span living hall, floor-to-ceiling glass curtain walls, cantilever roof overhangs, swimming pool deck, and travertine finishes.
                  </p>
                </div>

                {/* Overlaid Badges */}
                <div className="flex flex-wrap justify-center gap-2 pt-2">
                  <span className="px-2.5 py-1 rounded-md bg-[#131b2a] border border-[#232f48] text-[11px] font-mono text-sky-300">
                    Footprint: 16.0m × 16.0m
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-[#131b2a] border border-[#232f48] text-[11px] font-mono text-emerald-300">
                    Total Area: 380 m²
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-[#131b2a] border border-[#232f48] text-[11px] font-mono text-amber-300">
                    Multi-Level Elevation
                  </span>
                </div>

                <button
                  onClick={onStartDesigning}
                  className="mt-4 px-6 py-2.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-sky-500/30 transition-all"
                >
                  <span>Open Model in 3D Editor</span>
                  <ArrowRight size={14} />
                </button>
              </div>

              {/* Floating Tool Badges on the corners */}
              <div className="absolute top-4 left-4 p-2.5 rounded-lg bg-[#0e1422]/90 border border-[#232f46] text-[11px] font-mono text-slate-300 space-y-1 hidden sm:block">
                <div className="text-sky-400 font-bold">ACTIVE CAD TOOLS</div>
                <div>[W] Move • [E] Rotate • [R] Scale</div>
                <div>[1] 3D • [2] 2D • [3] Walkthrough</div>
              </div>

              <div className="absolute bottom-4 right-4 p-2.5 rounded-lg bg-[#0e1422]/90 border border-[#232f46] text-[11px] font-mono text-slate-300 text-right hidden sm:block">
                <div className="text-emerald-400 font-bold">READY TO DESIGN</div>
                <div>Click to add walls, slabs & roofs</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. TEMPLATES SHOWCASE SECTION */}
      <section id="templates" className="py-20 px-6 lg:px-12 bg-[#090d16] border-t border-b border-[#182030]">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="text-xs font-bold text-sky-400 uppercase tracking-widest mb-2">
                READY-TO-EDIT ARCHITECTURE
              </div>
              <h2 className="text-3xl font-extrabold text-white tracking-tight">
                Architectural Starting Templates
              </h2>
              <p className="text-slate-400 text-sm mt-1 max-w-xl">
                Every template loads into the 3D studio as real, editable geometry. Modify room dimensions, replace materials, add openings, or add a second floor.
              </p>
            </div>
            <button
              onClick={onOpenTemplates}
              className="self-start md:self-auto flex items-center gap-1.5 text-xs font-bold text-sky-400 hover:text-sky-300 transition-colors"
            >
              <span>View All Templates Gallery</span>
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Templates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {TEMPLATE_PROJECTS.slice(0, 6).map((tpl) => (
              <div
                key={tpl.id}
                className="rounded-xl bg-[#0e131e] border border-[#20293d] hover:border-sky-500/70 p-5 flex flex-col justify-between transition-all group hover:shadow-xl hover:shadow-sky-950/20"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-sky-950/80 text-sky-400 border border-sky-800/50">
                      {tpl.tag}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">
                      {tpl.data.objects.length} Elements
                    </span>
                  </div>

                  <h3 className="font-bold text-white text-base group-hover:text-sky-300 transition-colors">
                    {tpl.name}
                  </h3>

                  <p className="text-xs text-slate-400 leading-relaxed mt-2 mb-4">
                    {tpl.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-[#1a2234] flex items-center justify-between">
                  <div className="text-[11px] text-slate-400 font-mono">
                    Editable Geometry
                  </div>
                  <button
                    onClick={() => handleLaunchWithTemplate(tpl)}
                    className="flex items-center gap-1 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 shadow-md transition-colors"
                  >
                    <span>Customize in 3D</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. PLATFORM FEATURES DETAIL SECTION */}
      <section id="features" className="py-24 px-6 lg:px-12 max-w-7xl mx-auto space-y-16">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="text-xs font-bold text-sky-400 uppercase tracking-widest">
            PROFESSIONAL ARCHITECTURAL CAPABILITIES
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Engineered for Precision & Realistic Visualization
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            Unlike simple consumer 3D apps, ArchiCraft 3D operates on true architectural construction logic with walls, sub-segment openings, foundation plinths, and multi-pitch roofs.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-5 rounded-xl bg-[#0d121c] border border-[#1e273a] space-y-3">
            <div className="w-10 h-10 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center border border-sky-500/20">
              <Box size={20} />
            </div>
            <h3 className="font-bold text-white text-sm">Real Editable Geometry</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Click-to-draw walls, custom room boundaries, and openings with automatic lintels and sills instead of flat stickers.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-[#0d121c] border border-[#1e273a] space-y-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <LayoutGrid size={20} />
            </div>
            <h3 className="font-bold text-white text-sm">2D Floor Plan Synchronizer</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Top-down orthographic blueprint editor with snap-to-grid, room area calculation (m² / sq ft), and bi-directional 3D update.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-[#0d121c] border border-[#1e273a] space-y-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
              <Palette size={20} />
            </div>
            <h3 className="font-bold text-white text-sm">Physically-Based Materials</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Carrara marble, oak hardwood, formwork concrete, travertine stone, low-iron glass, and standing seam zinc roofing.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-[#0d121c] border border-[#1e273a] space-y-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20">
              <Sun size={20} />
            </div>
            <h3 className="font-bold text-white text-sm">Dynamic Sunlight & Sky</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Time-of-day sunlight control (Dawn, Noon, Golden Hour, Sunset, Night) with soft shadows and interior spot lighting.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-[#0d121c] border border-[#1e273a] space-y-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
              <Eye size={20} />
            </div>
            <h3 className="font-bold text-white text-sm">First-Person Walkthrough</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Explore your designed house interior at real human eye level (1.65m) using intuitive [W][A][S][D] keyboard controls.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-[#0d121c] border border-[#1e273a] space-y-3">
            <div className="w-10 h-10 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
              <Sparkles size={20} />
            </div>
            <h3 className="font-bold text-white text-sm">AI Architectural Assistant</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Generate full 3D house structures directly from natural language prompts with validated room layouts and adjacencies.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-[#0d121c] border border-[#1e273a] space-y-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
              <Download size={20} />
            </div>
            <h3 className="font-bold text-white text-sm">SVG & High-Res PNG Export</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Download clean vector SVG blueprints with dimension lines and title blocks, or high-resolution 3D screenshot renders.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-[#0d121c] border border-[#1e273a] space-y-3">
            <div className="w-10 h-10 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center border border-teal-500/20">
              <Cpu size={20} />
            </div>
            <h3 className="font-bold text-white text-sm">Multi-Storey Elevation</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Manage Ground Floor (L0), First Floor (L1), and Second Floor (L2) with staircases, balustrades, and multi-pitch roofs.
            </p>
          </div>
        </div>
      </section>

      {/* 5. WORKFLOW SECTION */}
      <section id="workflow" className="py-20 px-6 lg:px-12 bg-[#090d16] border-t border-[#182030]">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">How ArchiCraft 3D Works</h2>
            <p className="text-xs text-slate-400">From floor plan blueprint to photorealistic 3D exploration in 4 simple steps.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="relative p-4 rounded-xl bg-[#0e1420] border border-[#1d273a] space-y-2">
              <div className="text-2xl font-black text-sky-500 font-mono">01</div>
              <h4 className="font-bold text-white text-sm">Draw Walls & Slabs</h4>
              <p className="text-xs text-slate-400">
                Click on the grid to lay out room footprints or use the 1-click Room Generator.
              </p>
            </div>

            <div className="relative p-4 rounded-xl bg-[#0e1420] border border-[#1d273a] space-y-2">
              <div className="text-2xl font-black text-sky-500 font-mono">02</div>
              <h4 className="font-bold text-white text-sm">Insert Doors & Glazing</h4>
              <p className="text-xs text-slate-400">
                Place casement windows, panoramic sliding patio doors, and grand entrance portals.
              </p>
            </div>

            <div className="relative p-4 rounded-xl bg-[#0e1420] border border-[#1d273a] space-y-2">
              <div className="text-2xl font-black text-sky-500 font-mono">03</div>
              <h4 className="font-bold text-white text-sm">Roofs, Stairs & Finishes</h4>
              <p className="text-xs text-slate-400">
                Configure gable, hip, or flat parapet roofs and assign PBR materials from our curated catalogue.
              </p>
            </div>

            <div className="relative p-4 rounded-xl bg-[#0e1420] border border-[#1d273a] space-y-2">
              <div className="text-2xl font-black text-sky-500 font-mono">04</div>
              <h4 className="font-bold text-white text-sm">Walkthrough & Export</h4>
              <p className="text-xs text-slate-400">
                Explore interiors in first-person and export blueprints to SVG or high-res PNG renders.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. CALL TO ACTION BANNER */}
      <section className="py-20 px-6 lg:px-12 max-w-5xl mx-auto text-center space-y-6">
        <div className="p-8 sm:p-12 rounded-2xl bg-gradient-to-r from-blue-950/60 via-[#0e1728] to-cyan-950/60 border border-sky-500/30 shadow-2xl relative overflow-hidden">
          <div className="space-y-4 max-w-2xl mx-auto relative z-10">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Ready to Model Your Next Architectural Project?
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed">
              Launch the 3D studio now. All models can be saved to your browser's persistent storage and exported as industry-standard JSON and vector blueprints.
            </p>
            <div className="pt-2 flex flex-wrap justify-center gap-4">
              <button
                onClick={onStartDesigning}
                className="px-8 py-3.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 shadow-xl shadow-sky-500/30 transition-all transform hover:-translate-y-0.5"
              >
                Launch 3D Studio Now →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 7. FOOTER */}
      <footer className="h-16 border-t border-[#182030] px-6 lg:px-12 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <Compass size={14} className="text-sky-400" />
          <span className="font-semibold text-slate-400">ArchiCraft 3D Studio</span>
          <span>•</span>
          <span>Professional In-Browser Architecture</span>
        </div>
        <div>
          <span>Units: Meters, Centimeters, Feet • Standard BIM/CAD Specs</span>
        </div>
      </footer>
    </div>
  );
};
