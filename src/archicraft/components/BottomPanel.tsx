import React, { useState, useMemo } from 'react';
import { useStudioStore } from '../store/useStudioStore';
import { SceneObject } from '../types/studio';
import { calculateProjectFootprint, formatArea } from '../utils/geometry';
import {
  ListTree,
  ChevronUp,
  ChevronDown,
  Layers,
  Square,
  Home,
  Armchair,
  Eye,
  Lock,
  Trash2,
  Activity,
  CheckCircle2,
  Compass
} from 'lucide-react';

export const BottomPanel: React.FC = () => {
  const [isTreeExpanded, setIsTreeExpanded] = useState(false);
  const objects = useStudioStore((s) => s.project.objects);
  const activeUnit = useStudioStore((s) => s.activeUnit);
  const selectedObjectId = useStudioStore((s) => s.selectedObjectId);
  const setSelectedObjectId = useStudioStore((s) => s.setSelectedObjectId);
  const deleteObject = useStudioStore((s) => s.deleteObject);
  const statusMessage = useStudioStore((s) => s.statusMessage);
  const renderMode = useStudioStore((s) => s.renderMode);
  const isSaving = useStudioStore((s) => s.isSaving);

  const footprint = useMemo(() => calculateProjectFootprint(objects), [objects]);

  const selectedObject = objects.find((o) => o.id === selectedObjectId);

  return (
    <footer className="bg-white border-t border-[#E5E5E5] flex flex-col z-20 select-none text-[#171717]">
      {/* Expandable Scene Hierarchy Tree */}
      {isTreeExpanded && (
        <div className="h-44 bg-[#F7F7F5] border-b border-[#E5E5E5] p-3 flex flex-col text-xs overflow-hidden">
          <div className="flex items-center justify-between pb-2 border-b border-[#E5E5E5] text-[#737373] font-semibold mb-2">
            <span className="flex items-center gap-1.5 text-[#171717]">
              <ListTree size={14} className="text-[#171717]" />
              <span>Project Hierarchy Tree ({objects.length} Entities)</span>
            </span>
            <span className="text-[10px] text-[#737373] font-mono">BIM Model Tree</span>
          </div>

          <div className="flex-1 overflow-y-auto grid grid-cols-3 gap-2 scrollbar-thin">
            {objects.map((obj) => {
              const isSelected = obj.id === selectedObjectId;
              return (
                <div
                  key={obj.id}
                  onClick={() => setSelectedObjectId(obj.id)}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-[#F2F0EC] border-[#111111] text-[#111111] shadow-sm font-semibold'
                      : 'bg-white border-[#E5E5E5] text-[#171717] hover:border-[#111111]'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#19B6D2] flex-shrink-0" />
                    <span className="truncate text-[11px] font-medium">{obj.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] font-mono text-[#737373] uppercase px-1 rounded bg-[#F2F0EC]">
                      {obj.type}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteObject(obj.id);
                      }}
                      className="text-[#737373] hover:text-red-600 p-0.5"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Status & Telemetry Bar */}
      <div className="h-8 px-4 flex items-center justify-between text-[11px] text-[#737373] bg-white">
        {/* Left: Tree Toggle & Status Message */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsTreeExpanded(!isTreeExpanded)}
            className="flex items-center gap-1.5 text-[#171717] hover:text-black font-semibold transition-colors"
          >
            <ListTree size={13} className="text-[#171717]" />
            <span>Scene Tree ({objects.length})</span>
            {isTreeExpanded ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
          </button>

          <div className="w-[1px] h-3 bg-[#E5E5E5]" />

          {/* Modeling Status */}
          <div className="flex items-center gap-1.5 text-[#171717]">
            <Activity size={12} className="text-emerald-600" />
            <span className="truncate max-w-[340px] font-medium">{statusMessage}</span>
          </div>
        </div>

        {/* Center: Selected Object Details */}
        <div className="flex items-center gap-2">
          {selectedObject ? (
            <div className="flex items-center gap-2 font-mono">
              <span className="text-[#737373]">Selected:</span>
              <span className="text-[#171717] font-semibold">{selectedObject.name}</span>
              <span className="text-[10px] text-[#737373]">({selectedObject.type})</span>
            </div>
          ) : (
            <span className="text-[#737373] font-mono text-[10px]">No object selected</span>
          )}
        </div>

        {/* Right: Footprint Telemetry & Render Mode */}
        <div className="flex items-center gap-3 font-mono text-[10px]">
          <div>
            Total Area:{' '}
            <span className="text-[#171717] font-bold">{formatArea(footprint.area, activeUnit)}</span>
          </div>

          <div className="w-[1px] h-3 bg-[#E5E5E5]" />

          <div>
            Footprint:{' '}
            <span className="text-[#171717] font-semibold">
              {footprint.width}m × {footprint.depth}m
            </span>
          </div>

          <div className="w-[1px] h-3 bg-[#E5E5E5]" />

          <div className="flex items-center gap-1 text-[#737373]">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                renderMode === 'presentation' ? 'bg-amber-500 shadow-sm' : 'bg-emerald-600'
              }`}
            />
            <span className="capitalize">{renderMode} Mode</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
