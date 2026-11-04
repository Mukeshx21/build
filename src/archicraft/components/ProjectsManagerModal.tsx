import React, { useState, useEffect } from 'react';
import { useStudioStore } from '../store/useStudioStore';
import { FolderOpen, X, Upload, Trash2, ArrowRight, FilePlus, Calendar, Box } from 'lucide-react';

export const ProjectsManagerModal: React.FC = () => {
  const isOpen = useStudioStore((s) => s.isProjectsModalOpen);
  const setOpen = useStudioStore((s) => s.setProjectsModalOpen);
  const loadProject = useStudioStore((s) => s.loadProject);
  const createNewProject = useStudioStore((s) => s.createNewProject);
  const currentProjectId = useStudioStore((s) => s.project.metadata.id);
  const getSavedProjectsList = useStudioStore((s) => s.getSavedProjectsList);
  const deleteSavedProject = useStudioStore((s) => s.deleteSavedProject);
  const setStatusMessage = useStudioStore((s) => s.setStatusMessage);

  const [savedProjects, setSavedProjects] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      setSavedProjects(getSavedProjectsList());
    }
  }, [isOpen, getSavedProjectsList]);

  if (!isOpen) return null;

  const handleLoadSaved = (id: string) => {
    try {
      const raw = localStorage.getItem(`archicraft_project_${id}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        loadProject(parsed);
        setOpen(false);
      }
    } catch (e) {
      alert('Failed to load project.');
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Delete this saved project?')) {
      deleteSavedProject(id);
      setSavedProjects(getSavedProjectsList());
    }
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        // Validation check
        if (!parsed.metadata || !Array.isArray(parsed.objects)) {
          alert('Invalid ArchiCraft 3D project file format.');
          return;
        }
        loadProject(parsed);
        setStatusMessage(`Successfully imported project: ${parsed.metadata.name}`);
        setOpen(false);
      } catch (err) {
        alert('Failed to parse JSON file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-white border border-[#E5E5E5] rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] text-[#171717]">
        {/* Header */}
        <div className="h-14 border-b border-[#E5E5E5] px-5 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#111111] text-white flex items-center justify-center shadow-sm">
              <FolderOpen size={16} />
            </div>
            <div>
              <span className="font-bold text-[#171717] text-sm">Project Workspace Library</span>
              <p className="text-[10px] text-[#737373]">Open saved designs or import JSON project files</p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="text-[#737373] hover:text-[#171717] p-1.5 rounded-lg hover:bg-[#F2F0EC] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Action bar */}
        <div className="px-5 py-3 border-b border-[#E5E5E5] bg-[#F7F7F5] flex items-center justify-between">
          <button
            onClick={() => {
              createNewProject();
              setOpen(false);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#111111] hover:bg-black text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
          >
            <FilePlus size={14} />
            <span>New Blank Project</span>
          </button>

          <label className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#F2F0EC] border border-[#E5E5E5] text-[#171717] rounded-lg text-xs font-semibold cursor-pointer transition-colors shadow-sm">
            <Upload size={14} />
            <span>Import Project JSON</span>
            <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
          </label>
        </div>

        {/* Projects List */}
        <div className="p-5 overflow-y-auto space-y-2 flex-1 scrollbar-thin">
          {savedProjects.length === 0 ? (
            <div className="p-8 text-center text-[#737373] space-y-2">
              <Box size={32} className="mx-auto text-[#737373] mb-1" />
              <p className="font-medium text-[#171717]">No saved projects found in local storage.</p>
              <p className="text-xs">Create a new house model or load a template to begin saving.</p>
            </div>
          ) : (
            savedProjects.map((p) => {
              const isCurrent = p.id === currentProjectId;
              return (
                <div
                  key={p.id}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                    isCurrent
                      ? 'bg-[#F2F0EC] border-[#111111]'
                      : 'bg-[#F7F7F5] border-[#E5E5E5] hover:border-[#111111]'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#171717] text-xs">{p.name}</span>
                      {isCurrent && (
                        <span className="text-[9px] font-bold text-white bg-[#111111] px-1.5 py-0.5 rounded">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-[#737373] mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar size={11} /> {new Date(p.updatedAt).toLocaleDateString()}
                      </span>
                      <span>•</span>
                      <span>{p.objectCount || 0} Elements</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleLoadSaved(p.id)}
                      className="flex items-center gap-1 px-3 py-1 bg-white hover:bg-[#111111] text-[#171717] hover:text-white border border-[#E5E5E5] rounded-lg text-xs font-semibold transition-colors shadow-sm"
                    >
                      <span>Open</span>
                      <ArrowRight size={13} />
                    </button>
                    {!isCurrent && (
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="p-1.5 text-[#737373] hover:text-red-600 rounded transition-colors"
                        title="Delete project"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="h-12 border-t border-[#E5E5E5] px-5 flex items-center justify-between bg-[#F7F7F5] text-[11px] text-[#737373]">
          <span>Projects persist automatically in your browser's persistent storage.</span>
          <button
            onClick={() => setOpen(false)}
            className="px-3 py-1 bg-white hover:bg-[#EAE8E2] text-[#171717] border border-[#E5E5E5] rounded-lg text-xs font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
