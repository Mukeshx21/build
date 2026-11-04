import React from 'react';
import { useStudioStore } from '../store/useStudioStore';
import { TEMPLATE_PROJECTS } from '../templates/initialProjects';
import { Layers, X, ArrowRight, CheckCircle2 } from 'lucide-react';

export const TemplateGalleryModal: React.FC = () => {
  const isOpen = useStudioStore((s) => s.isTemplateModalOpen);
  const setOpen = useStudioStore((s) => s.setTemplateModalOpen);
  const loadProject = useStudioStore((s) => s.loadProject);
  const currentProjectId = useStudioStore((s) => s.project.metadata.id);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-white border border-[#E5E5E5] rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] text-[#171717]">
        {/* Header */}
        <div className="h-14 border-b border-[#E5E5E5] px-5 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#111111] text-white flex items-center justify-center shadow-sm">
              <Layers size={16} />
            </div>
            <div>
              <span className="font-bold text-[#171717] text-sm">Architectural House Templates</span>
              <p className="text-[10px] text-[#737373]">
                Fully editable starting models with real walls, slabs, openings, roofs &amp; furniture
              </p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="text-[#737373] hover:text-[#171717] p-1.5 rounded-lg hover:bg-[#F2F0EC] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Gallery Grid */}
        <div className="p-5 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4 scrollbar-thin">
          {TEMPLATE_PROJECTS.map((tpl) => {
            const isLoaded = currentProjectId === tpl.data.metadata.id;
            return (
              <div
                key={tpl.id}
                className="bg-[#F7F7F5] border border-[#E5E5E5] hover:border-[#111111] rounded-2xl p-4 flex flex-col justify-between transition-all group hover:shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#F2F0EC] text-[#171717] border border-[#E5E5E5] rounded-md">
                      {tpl.tag}
                    </span>
                    {isLoaded && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <CheckCircle2 size={12} className="text-emerald-600" /> Currently Loaded
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-[#171717] text-sm group-hover:text-black transition-colors">
                    {tpl.name}
                  </h3>
                  <p className="text-xs text-[#737373] leading-relaxed mt-1.5 mb-3">
                    {tpl.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-[#E5E5E5] flex items-center justify-between">
                  <span className="text-[11px] font-mono text-[#737373]">
                    {tpl.data.objects.length} 3D BIM Elements
                  </span>
                  <button
                    onClick={() => {
                      loadProject(JSON.parse(JSON.stringify(tpl.data)));
                      setOpen(false);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#111111] hover:bg-black text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
                  >
                    <span>Load Model</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="h-12 border-t border-[#E5E5E5] px-5 flex items-center justify-between bg-[#F7F7F5] text-[11px] text-[#737373]">
          <span>All templates load actual 3D geometry that can be customized, scaled, or expanded.</span>
          <button
            onClick={() => setOpen(false)}
            className="px-3 py-1 bg-[#F2F0EC] hover:bg-[#EAE8E2] text-[#171717] border border-[#E5E5E5] rounded-lg text-xs font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
