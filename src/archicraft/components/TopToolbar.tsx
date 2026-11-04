import React, { useState } from 'react';
import { useStudioStore } from '../store/useStudioStore';
import { LengthUnit } from '../types/studio';
import {
  Compass,
  FilePlus,
  FolderOpen,
  Save,
  Undo2,
  Redo2,
  Download,
  Layers,
  Sparkles,
  HelpCircle,
  Eye,
  CheckCircle2,
  Box,
  LayoutGrid,
  ChevronLeft,
  Sliders
} from 'lucide-react';

interface TopToolbarProps {
  onBackToMain?: () => void;
}

export const TopToolbar: React.FC<TopToolbarProps> = ({ onBackToMain }) => {
  const project = useStudioStore((s) => s.project);
  const activeUnit = useStudioStore((s) => s.activeUnit);
  const viewMode = useStudioStore((s) => s.viewMode);
  const renderMode = useStudioStore((s) => s.renderMode);
  const isSaving = useStudioStore((s) => s.isSaving);
  const lastSavedAt = useStudioStore((s) => s.lastSavedAt);
  const history = useStudioStore((s) => s.history);
  const future = useStudioStore((s) => s.future);

  const setActiveUnit = useStudioStore((s) => s.setActiveUnit);
  const setViewMode = useStudioStore((s) => s.setViewMode);
  const setRenderMode = useStudioStore((s) => s.setRenderMode);
  const updateProjectMetadata = useStudioStore((s) => s.updateProjectMetadata);
  const saveProject = useStudioStore((s) => s.saveProject);
  const undo = useStudioStore((s) => s.undo);
  const redo = useStudioStore((s) => s.redo);

  const setAiModalOpen = useStudioStore((s) => s.setAiModalOpen);
  const setTemplateModalOpen = useStudioStore((s) => s.setTemplateModalOpen);
  const setProjectsModalOpen = useStudioStore((s) => s.setProjectsModalOpen);
  const setExportModalOpen = useStudioStore((s) => s.setExportModalOpen);
  const setShortcutsModalOpen = useStudioStore((s) => s.setShortcutsModalOpen);
  const createNewProject = useStudioStore((s) => s.createNewProject);

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(project.metadata.name);

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    if (titleInput.trim()) {
      updateProjectMetadata({ name: titleInput.trim() });
    } else {
      setTitleInput(project.metadata.name);
    }
  };

  return (
    <header className="h-16 bg-white border-b border-[#E5E5E5] px-3.5 lg:px-4 flex items-center justify-between select-none z-30 shadow-sm min-w-0">
      {/* ================= LEFT SECTION ================= */}
      <div className="flex items-center gap-2.5 min-w-0">
        {/* Exit Studio Button */}
        {onBackToMain && (
          <button
            onClick={onBackToMain}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#171717] hover:text-black bg-[#F2F0EC] hover:bg-[#EAE8E2] border border-[#E5E5E5] rounded-lg transition-colors flex-shrink-0"
            title="Return to Main Portal"
          >
            <ChevronLeft size={14} />
            <span className="hidden sm:inline">Exit Studio</span>
          </button>
        )}

        {/* Brand Logo & PRO CAD Badge */}
        <div className="flex items-center gap-2 pr-2.5 border-r border-[#E5E5E5] flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-[#111111] text-white flex items-center justify-center shadow-sm flex-shrink-0">
            <Compass className="w-4 h-4 stroke-[2.2]" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-sm tracking-tight text-[#171717]">
              ArchiCraft<span className="text-[#19B6D2]">3D</span>
            </span>
            <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-[#F2F0EC] text-[#171717] border border-[#E5E5E5] rounded">
              PRO CAD
            </span>
          </div>
        </div>

        {/* Project Name (Truncated when necessary) */}
        <div className="flex items-center gap-2 min-w-0">
          {isEditingTitle ? (
            <input
              type="text"
              value={titleInput}
              autoFocus
              onChange={(e) => setTitleInput(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={(e) => e.key === 'Enter' && handleTitleSubmit()}
              className="bg-white text-[#171717] text-xs font-medium px-2 py-1 rounded border border-[#111111] outline-none w-44 shadow-sm"
            />
          ) : (
            <button
              onClick={() => {
                setTitleInput(project.metadata.name);
                setIsEditingTitle(true);
              }}
              className="text-xs font-semibold text-[#171717] hover:bg-[#F2F0EC] px-2 py-1 rounded transition-colors text-left truncate max-w-[150px] lg:max-w-[190px]"
              title="Click to rename project"
            >
              {project.metadata.name}
            </button>
          )}

          {/* Saved Status with Timestamp */}
          <div className="hidden xl:flex items-center gap-1.5 text-[11px] text-[#737373] flex-shrink-0">
            <CheckCircle2 size={13} className={isSaving ? 'text-amber-500 animate-spin' : 'text-emerald-600'} />
            <span>{isSaving ? 'Saving...' : `Saved ${lastSavedAt || 'Just now'}`}</span>
          </div>
        </div>

        {/* Project Action Group: New, Open, Save */}
        <div className="hidden md:flex items-center bg-[#F2F0EC] border border-[#E5E5E5] rounded-lg p-0.5 flex-shrink-0 gap-0.5">
          <button
            onClick={() => createNewProject()}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#737373] hover:text-[#171717] hover:bg-white rounded transition-colors"
            title="Create New Project"
          >
            <FilePlus size={13} />
            <span>New</span>
          </button>
          <button
            onClick={() => setProjectsModalOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#737373] hover:text-[#171717] hover:bg-white rounded transition-colors"
            title="Open Saved Projects"
          >
            <FolderOpen size={13} />
            <span>Open</span>
          </button>
          <button
            onClick={() => saveProject()}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-[#111111] hover:bg-black text-white rounded shadow-sm transition-colors"
            title="Save Project (Ctrl+S)"
          >
            <Save size={13} />
            <span>Save</span>
          </button>
        </div>

        {/* Undo / Redo Group */}
        <div className="hidden lg:flex items-center bg-[#F2F0EC] border border-[#E5E5E5] rounded-lg p-0.5 flex-shrink-0">
          <button
            onClick={undo}
            disabled={history.length === 0}
            className={`p-1.5 rounded transition-colors ${
              history.length === 0
                ? 'text-neutral-300 cursor-not-allowed'
                : 'text-[#737373] hover:text-[#171717] hover:bg-white'
            }`}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 size={14} />
          </button>
          <button
            onClick={redo}
            disabled={future.length === 0}
            className={`p-1.5 rounded transition-colors ${
              future.length === 0
                ? 'text-neutral-300 cursor-not-allowed'
                : 'text-[#737373] hover:text-[#171717] hover:bg-white'
            }`}
            title="Redo (Ctrl+Y)"
          >
            <Redo2 size={14} />
          </button>
        </div>
      </div>

      {/* ================= CENTER SECTION ================= */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* View Switcher: 3D View, 2D Floor Plan, Walkthrough */}
        <div className="flex items-center bg-[#F2F0EC] border border-[#E5E5E5] rounded-lg p-0.5 shadow-inner gap-0.5">
          <button
            onClick={() => setViewMode('3d')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all ${
              viewMode === '3d'
                ? 'bg-white text-[#111111] shadow-sm'
                : 'text-[#737373] hover:text-[#171717]'
            }`}
          >
            <Box size={13} />
            <span>3D View</span>
          </button>

          <button
            onClick={() => setViewMode('2d')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all ${
              viewMode === '2d'
                ? 'bg-white text-[#111111] shadow-sm'
                : 'text-[#737373] hover:text-[#171717]'
            }`}
          >
            <LayoutGrid size={13} />
            <span>2D Floor Plan</span>
          </button>

          <button
            onClick={() => setViewMode('walkthrough')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all ${
              viewMode === 'walkthrough'
                ? 'bg-white text-[#111111] shadow-sm'
                : 'text-[#737373] hover:text-[#171717]'
            }`}
          >
            <Eye size={13} />
            <span>Walkthrough</span>
          </button>
        </div>

        {/* Templates Button */}
        <button
          onClick={() => setTemplateModalOpen(true)}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#F7F7F5] border border-[#E5E5E5] text-[#171717] text-xs font-medium rounded-lg transition-colors shadow-sm"
          title="Browse Starting Templates"
        >
          <Layers size={13} />
          <span>Templates</span>
        </button>

        {/* AI Architect Button */}
        <button
          onClick={() => setAiModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#111111] hover:bg-black text-white text-xs font-semibold rounded-lg transition-all shadow-sm"
          title="AI House Layout Generator"
        >
          <Sparkles size={13} className="text-amber-300" />
          <span>AI Architect</span>
        </button>

        {/* Measurement Unit Selector: M, CM, FT */}
        <div className="hidden md:flex items-center bg-[#F2F0EC] border border-[#E5E5E5] rounded-lg p-0.5">
          {(['m', 'cm', 'ft'] as LengthUnit[]).map((u) => (
            <button
              key={u}
              onClick={() => setActiveUnit(u)}
              className={`px-2 py-0.5 text-xs font-bold rounded uppercase transition-colors ${
                activeUnit === u
                  ? 'bg-white text-[#111111] shadow-sm'
                  : 'text-[#737373] hover:text-[#171717]'
              }`}
            >
              {u}
            </button>
          ))}
        </div>
      </div>

      {/* ================= RIGHT SECTION ================= */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Presentation HD Mode Toggle */}
        <button
          onClick={() => setRenderMode(renderMode === 'modeling' ? 'presentation' : 'modeling')}
          className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border transition-all ${
            renderMode === 'presentation'
              ? 'bg-[#111111] text-white border-[#111111] shadow-sm'
              : 'bg-white text-[#737373] border-[#E5E5E5] hover:text-[#171717] hover:bg-[#F7F7F5]'
          }`}
          title="Toggle Presentation Mode (HD Soft Shadows & Anti-aliasing)"
        >
          <Sparkles size={12} className={renderMode === 'presentation' ? 'text-amber-300' : ''} />
          <span>{renderMode === 'presentation' ? 'Presentation' : 'Modeling'}</span>
        </button>

        {/* Export Button */}
        <button
          onClick={() => setExportModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#F7F7F5] border border-[#E5E5E5] text-[#171717] text-xs font-medium rounded-lg transition-colors shadow-sm"
          title="Export 3D Render, JSON, or 2D Vector Blueprint"
        >
          <Download size={13} />
          <span className="hidden sm:inline">Export</span>
        </button>

        {/* Keyboard Shortcuts Help */}
        <button
          onClick={() => setShortcutsModalOpen(true)}
          className="p-1.5 text-[#737373] hover:text-[#171717] hover:bg-[#F2F0EC] rounded-lg transition-colors"
          title="Keyboard Shortcuts & CAD Guide"
        >
          <HelpCircle size={15} />
        </button>
      </div>
    </header>
  );
};
