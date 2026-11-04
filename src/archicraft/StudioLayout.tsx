import React, { useEffect } from 'react';
import { useStudioStore } from './store/useStudioStore';
import { TopToolbar } from './components/TopToolbar';
import { LeftSidebar } from './components/LeftSidebar';
import { Viewport3D } from './components/Viewport3D';
import { FloorPlan2D } from './components/FloorPlan2D';
import { RightPropertiesPanel } from './components/RightPropertiesPanel';
import { BottomPanel } from './components/BottomPanel';

// Modals
import { AiDesignAssistantModal } from './components/AiDesignAssistantModal';
import { TemplateGalleryModal } from './components/TemplateGalleryModal';
import { ProjectsManagerModal } from './components/ProjectsManagerModal';
import { ExportModal } from './components/ExportModal';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';

interface StudioLayoutProps {
  onBackToMain?: () => void;
}

export const StudioLayout: React.FC<StudioLayoutProps> = ({ onBackToMain }) => {
  const viewMode = useStudioStore((s) => s.viewMode);
  const setViewMode = useStudioStore((s) => s.setViewMode);
  const setActiveTool = useStudioStore((s) => s.setActiveTool);
  const selectedObjectId = useStudioStore((s) => s.selectedObjectId);
  const setSelectedObjectId = useStudioStore((s) => s.setSelectedObjectId);
  const deleteObject = useStudioStore((s) => s.deleteObject);
  const undo = useStudioStore((s) => s.undo);
  const redo = useStudioStore((s) => s.redo);
  const saveProject = useStudioStore((s) => s.saveProject);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input or textarea
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveProject();
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedObjectId) {
          deleteObject(selectedObjectId);
        }
        return;
      }

      if (e.key === 'Escape') {
        setSelectedObjectId(null);
        setActiveTool('select');
        return;
      }

      // Tool hotkeys
      if (e.key.toLowerCase() === 'w') {
        setActiveTool('move');
      } else if (e.key.toLowerCase() === 'e') {
        setActiveTool('rotate');
      } else if (e.key.toLowerCase() === 'r') {
        setActiveTool('scale');
      } else if (e.key.toLowerCase() === 'q') {
        setActiveTool('select');
      } else if (e.key === '1') {
        setViewMode('3d');
      } else if (e.key === '2') {
        setViewMode('2d');
      } else if (e.key === '3') {
        setViewMode('walkthrough');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedObjectId, deleteObject, setSelectedObjectId, setActiveTool, setViewMode, undo, redo, saveProject]);

  return (
    <div className="flex flex-col w-screen h-screen bg-[#F7F7F5] text-[#171717] overflow-hidden font-sans select-none fixed inset-0 z-50">
      {/* 1. TOP TOOLBAR */}
      <TopToolbar onBackToMain={onBackToMain} />

      {/* 2. MAIN WORKSPACE VIEWPORT & SIDEBARS */}
      <div className="flex-1 flex w-full overflow-hidden min-h-0 relative">
        {/* Left Sidebar (Tool Rail ~70px + Tool Settings Panel ~290px) */}
        <LeftSidebar />

        {/* Center Viewport: 3D Canvas or 2D Floor Plan Editor */}
        <main className="flex-1 h-full relative overflow-hidden min-w-0">
          {viewMode === '2d' ? <FloorPlan2D /> : <Viewport3D />}
        </main>

        {/* Right Contextual Properties Panel (~350px) */}
        <RightPropertiesPanel />
      </div>

      {/* 3. BOTTOM STATUS & HIERARCHY PANEL */}
      <BottomPanel />

      {/* MODALS */}
      <AiDesignAssistantModal />
      <TemplateGalleryModal />
      <ProjectsManagerModal />
      <ExportModal />
      <KeyboardShortcutsModal />
    </div>
  );
};
