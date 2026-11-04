import React from 'react';
import { useStudioStore } from '../store/useStudioStore';
import { generateFloorPlanSvg } from '../utils/geometry';
import { Download, X, Camera, FileJson, LayoutGrid, CheckCircle2 } from 'lucide-react';

export const ExportModal: React.FC = () => {
  const isOpen = useStudioStore((s) => s.isExportModalOpen);
  const setOpen = useStudioStore((s) => s.setExportModalOpen);
  const project = useStudioStore((s) => s.project);
  const activeUnit = useStudioStore((s) => s.activeUnit);
  const setStatusMessage = useStudioStore((s) => s.setStatusMessage);

  if (!isOpen) return null;

  const fileNameBase = project.metadata.name.toLowerCase().replace(/[^a-z0-9]/g, '_');

  // 1. Export High-Res PNG Screenshot
  const handleExportPng = () => {
    const canvas = document.querySelector('canvas');
    if (!canvas) {
      alert('3D Canvas not found. Please switch to 3D View to export a render.');
      return;
    }

    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `${fileNameBase}_render.png`;
    link.click();
    setStatusMessage('Exported high-resolution 3D render (PNG)');
    setOpen(false);
  };

  // 2. Export 2D SVG Blueprint
  const handleExportSvg = () => {
    const svgString = generateFloorPlanSvg(project.objects, project.metadata.name, activeUnit);
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileNameBase}_blueprint.svg`;
    link.click();
    URL.revokeObjectURL(url);
    setStatusMessage('Exported 2D Architectural Blueprint (SVG)');
    setOpen(false);
  };

  // 3. Export Project JSON
  const handleExportJson = () => {
    const jsonString = JSON.stringify(project, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileNameBase}_project.json`;
    link.click();
    URL.revokeObjectURL(url);
    setStatusMessage('Exported ArchiCraft project JSON');
    setOpen(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-white border border-[#E5E5E5] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col text-[#171717]">
        {/* Header */}
        <div className="h-14 border-b border-[#E5E5E5] px-5 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#111111] text-white flex items-center justify-center shadow-sm">
              <Download size={16} />
            </div>
            <div>
              <span className="font-bold text-[#171717] text-sm">Export Architectural Assets</span>
              <p className="text-[10px] text-[#737373]">Download renders, CAD vector blueprints, or raw JSON</p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="text-[#737373] hover:text-[#171717] p-1.5 rounded-lg hover:bg-[#F2F0EC] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Export Options */}
        <div className="p-5 space-y-3">
          {/* Option 1: High-Res Render PNG */}
          <div
            onClick={handleExportPng}
            className="p-3.5 bg-[#F7F7F5] hover:bg-[#F2F0EC] border border-[#E5E5E5] hover:border-[#111111] rounded-2xl cursor-pointer transition-all flex items-center justify-between group shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white text-[#171717] border border-[#E5E5E5] flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                <Camera size={18} />
              </div>
              <div>
                <h4 className="font-bold text-[#171717] text-xs group-hover:text-black">
                  Export 3D Render Image (PNG)
                </h4>
                <p className="text-[11px] text-[#737373] mt-0.5">
                  High-definition screenshot capture of the current 3D viewport.
                </p>
              </div>
            </div>
            <Download size={16} className="text-[#737373] group-hover:text-black" />
          </div>

          {/* Option 2: 2D Floor Plan SVG */}
          <div
            onClick={handleExportSvg}
            className="p-3.5 bg-[#F7F7F5] hover:bg-[#F2F0EC] border border-[#E5E5E5] hover:border-[#111111] rounded-2xl cursor-pointer transition-all flex items-center justify-between group shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white text-[#171717] border border-[#E5E5E5] flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                <LayoutGrid size={18} />
              </div>
              <div>
                <h4 className="font-bold text-[#171717] text-xs group-hover:text-black">
                  Export 2D Blueprint (SVG)
                </h4>
                <p className="text-[11px] text-[#737373] mt-0.5">
                  Architectural floor plan with walls, room dimensions, door swings, and title block.
                </p>
              </div>
            </div>
            <Download size={16} className="text-[#737373] group-hover:text-black" />
          </div>

          {/* Option 3: Full Project JSON */}
          <div
            onClick={handleExportJson}
            className="p-3.5 bg-[#F7F7F5] hover:bg-[#F2F0EC] border border-[#E5E5E5] hover:border-[#111111] rounded-2xl cursor-pointer transition-all flex items-center justify-between group shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white text-[#171717] border border-[#E5E5E5] flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                <FileJson size={18} />
              </div>
              <div>
                <h4 className="font-bold text-[#171717] text-xs group-hover:text-black">
                  Export Project File (JSON)
                </h4>
                <p className="text-[11px] text-[#737373] mt-0.5">
                  Complete BIM scene data, geometry, materials, and settings for backup or sharing.
                </p>
              </div>
            </div>
            <Download size={16} className="text-[#737373] group-hover:text-black" />
          </div>
        </div>

        {/* Footer */}
        <div className="h-12 border-t border-[#E5E5E5] px-5 flex items-center justify-end bg-[#F7F7F5]">
          <button
            onClick={() => setOpen(false)}
            className="px-3 py-1 bg-white hover:bg-[#EAE8E2] text-[#171717] border border-[#E5E5E5] rounded-lg text-xs font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
