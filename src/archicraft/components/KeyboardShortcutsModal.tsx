import React from 'react';
import { useStudioStore } from '../store/useStudioStore';
import { HelpCircle, X, Keyboard } from 'lucide-react';

export const KeyboardShortcutsModal: React.FC = () => {
  const isOpen = useStudioStore((s) => s.isShortcutsModalOpen);
  const setOpen = useStudioStore((s) => s.setShortcutsModalOpen);

  if (!isOpen) return null;

  const shortcuts = [
    { key: 'W', desc: 'Activate Move / Translate Gizmo' },
    { key: 'E', desc: 'Activate Rotate Gizmo' },
    { key: 'R', desc: 'Activate Scale Gizmo' },
    { key: 'Q / Esc', desc: 'Clear Selection / Select Tool' },
    { key: 'Delete', desc: 'Delete Selected Object' },
    { key: 'Ctrl + Z', desc: 'Undo Action' },
    { key: 'Ctrl + Y', desc: 'Redo Action' },
    { key: 'Ctrl + S', desc: 'Save Project to LocalStorage' },
    { key: '1 / 2 / 3', desc: 'Switch 3D / 2D Blueprint / Walkthrough' },
    { key: 'W, A, S, D', desc: 'Walk Forward / Left / Back / Right (Walkthrough)' },
    { key: 'Left Click Drag', desc: 'Orbit Viewport Camera / Look Around' },
    { key: 'Right Click Drag', desc: 'Pan Camera Across Workspace' },
    { key: 'Scroll Wheel', desc: 'Zoom Camera In / Out' }
  ];

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-white border border-[#E5E5E5] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col text-[#171717]">
        {/* Header */}
        <div className="h-14 border-b border-[#E5E5E5] px-5 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#111111] text-white flex items-center justify-center shadow-sm">
              <Keyboard size={16} />
            </div>
            <div>
              <span className="font-bold text-[#171717] text-sm">Keyboard Shortcuts &amp; CAD Hotkeys</span>
              <p className="text-[10px] text-[#737373]">ArchiCraft 3D Quick Reference</p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="text-[#737373] hover:text-[#171717] p-1.5 rounded-lg hover:bg-[#F2F0EC] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Shortcuts list */}
        <div className="p-5 overflow-y-auto max-h-[60vh] space-y-2">
          {shortcuts.map((sc, i) => (
            <div
              key={i}
              className="flex items-center justify-between py-2 px-3 bg-[#F7F7F5] rounded-xl border border-[#E5E5E5]"
            >
              <span className="text-xs text-[#171717]">{sc.desc}</span>
              <kbd className="px-2 py-0.5 bg-white text-[#171717] font-mono text-[11px] font-bold rounded-md border border-[#E5E5E5] shadow-sm">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="h-12 border-t border-[#E5E5E5] px-5 flex items-center justify-end bg-[#F7F7F5]">
          <button
            onClick={() => setOpen(false)}
            className="px-4 py-1.5 bg-[#111111] hover:bg-black text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
