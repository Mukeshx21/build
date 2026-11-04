import React from 'react';
import { useStudioStore } from '../store/useStudioStore';
import { SceneObject, WallObject, FloorSlabObject, RoofObject } from '../types/studio';
import { ARCHITECTURAL_MATERIALS, getMaterialById } from '../data/materials';
import { formatLength, formatArea, calculateWallLength } from '../utils/geometry';
import {
  Sliders,
  Copy,
  Trash2,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Layers,
  Box,
  Compass,
  Palette,
  CheckCircle2
} from 'lucide-react';

export const RightPropertiesPanel: React.FC = () => {
  const selectedObjectId = useStudioStore((s) => s.selectedObjectId);
  const objects = useStudioStore((s) => s.project.objects);
  const activeUnit = useStudioStore((s) => s.activeUnit);
  const updateObject = useStudioStore((s) => s.updateObject);
  const deleteObject = useStudioStore((s) => s.deleteObject);
  const duplicateObject = useStudioStore((s) => s.duplicateObject);
  const toggleLockObject = useStudioStore((s) => s.toggleLockObject);
  const toggleVisibilityObject = useStudioStore((s) => s.toggleVisibilityObject);
  const removeOpeningFromWall = useStudioStore((s) => s.removeOpeningFromWall);

  const selectedObject = objects.find((o) => o.id === selectedObjectId);

  if (!selectedObject) {
    return (
      <aside className="w-[350px] min-w-[350px] max-w-[350px] bg-white border-l border-[#E5E5E5] p-4 flex flex-col text-xs text-[#737373] select-none overflow-y-auto">
        <div className="flex items-center gap-2 text-[#171717] font-bold text-xs mb-3 pb-2.5 border-b border-[#E5E5E5]">
          <Sliders size={14} className="text-[#171717]" />
          <span className="uppercase tracking-wider">Properties</span>
        </div>
        <div className="p-8 bg-[#F7F7F5] rounded-2xl border border-[#E5E5E5] text-center space-y-3 mt-8 shadow-sm">
          <Box size={36} className="mx-auto text-[#737373] mb-1 stroke-[1.5]" />
          <div className="font-serif font-semibold text-base text-[#171717]">No Object Selected</div>
          <p className="text-xs text-[#737373] leading-relaxed">
            Click any wall, roof, floor slab, door, window, or piece of furniture in the 3D viewport to inspect and modify its dimensions and materials.
          </p>
        </div>
      </aside>
    );
  }

  const mat = 'materialId' in selectedObject ? getMaterialById((selectedObject as any).materialId) : null;

  return (
    <aside className="w-[350px] min-w-[350px] max-w-[350px] bg-white border-l border-[#E5E5E5] flex flex-col text-xs select-none overflow-hidden z-20 flex-shrink-0 text-[#171717]">
      {/* Panel Header */}
      <div className="h-11 border-b border-[#E5E5E5] px-3.5 flex items-center justify-between bg-white">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="w-2 h-2 rounded-full bg-[#19B6D2]" />
          <span className="font-bold text-[#171717] truncate text-xs">{selectedObject.name}</span>
        </div>

        {/* Action icons: Visibility, Lock, Duplicate, Delete */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => toggleVisibilityObject(selectedObject.id)}
            className={`p-1.5 rounded-lg border transition-colors ${
              selectedObject.visible
                ? 'text-[#737373] hover:text-[#171717] bg-[#F2F0EC] hover:bg-[#EAE8E2] border-[#E5E5E5]'
                : 'text-amber-700 bg-amber-50 border-amber-200'
            }`}
            title={selectedObject.visible ? 'Hide Object' : 'Show Object'}
          >
            {selectedObject.visible ? <Eye size={13} /> : <EyeOff size={13} />}
          </button>

          <button
            onClick={() => toggleLockObject(selectedObject.id)}
            className={`p-1.5 rounded-lg border transition-colors ${
              selectedObject.locked
                ? 'text-red-700 bg-red-50 border-red-200'
                : 'text-[#737373] hover:text-[#171717] bg-[#F2F0EC] hover:bg-[#EAE8E2] border-[#E5E5E5]'
            }`}
            title={selectedObject.locked ? 'Unlock Object' : 'Lock Object'}
          >
            {selectedObject.locked ? <Lock size={13} /> : <Unlock size={13} />}
          </button>

          <button
            onClick={() => duplicateObject(selectedObject.id)}
            className="p-1.5 text-[#737373] hover:text-[#171717] bg-[#F2F0EC] hover:bg-[#EAE8E2] border border-[#E5E5E5] rounded-lg transition-colors"
            title="Duplicate Object"
          >
            <Copy size={13} />
          </button>

          <button
            onClick={() => {
              if (window.confirm(`Delete ${selectedObject.name}?`)) {
                deleteObject(selectedObject.id);
              }
            }}
            className="p-1.5 text-[#737373] hover:text-red-600 bg-[#F2F0EC] hover:bg-red-50 border border-[#E5E5E5] rounded-lg transition-colors"
            title="Delete Object"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Editable Properties Body */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 scrollbar-thin text-[#171717]">
        {/* Object Label Input */}
        <div className="p-3 bg-[#F7F7F5] border border-[#E5E5E5] rounded-xl space-y-1.5 shadow-sm">
          <label className="text-[10px] font-bold text-[#737373] uppercase tracking-wider">
            Object Label
          </label>
          <input
            type="text"
            value={selectedObject.name}
            onChange={(e) => updateObject(selectedObject.id, { name: e.target.value })}
            className="w-full bg-white border border-[#E5E5E5] text-[#171717] rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-[#111111] shadow-sm"
          />
        </div>

        {/* ================= 1. ROOF OBJECT PROPERTIES ================= */}
        {selectedObject.type === 'roof' && (
          <div className="p-3 bg-[#F7F7F5] border border-[#E5E5E5] rounded-xl space-y-3 shadow-sm">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[#737373] uppercase tracking-wider">
                Roof Geometry Style
              </label>
              <select
                value={(selectedObject as RoofObject).roofType}
                onChange={(e) => updateObject(selectedObject.id, { roofType: e.target.value as any })}
                className="w-full bg-white border border-[#E5E5E5] text-[#171717] rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-[#111111] shadow-sm"
              >
                <option value="flat">Modern Flat Roof (Cantilever &amp; Parapet)</option>
                <option value="gable">Classic Pitched Gable (Fascia &amp; Gutters)</option>
                <option value="hip">4-Sided Pyramid Hip Roof</option>
                <option value="shed">Monopitch Shed (Standing Seam)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] text-[#737373]">Width (m)</label>
                <input
                  type="number"
                  step="0.5"
                  value={(selectedObject as RoofObject).width}
                  onChange={(e) => updateObject(selectedObject.id, { width: parseFloat(e.target.value) || 1 })}
                  className="w-full bg-white border border-[#E5E5E5] text-[#171717] rounded-lg px-2 py-1 font-mono text-xs outline-none focus:border-[#111111] shadow-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-[#737373]">Depth (m)</label>
                <input
                  type="number"
                  step="0.5"
                  value={(selectedObject as RoofObject).depth}
                  onChange={(e) => updateObject(selectedObject.id, { depth: parseFloat(e.target.value) || 1 })}
                  className="w-full bg-white border border-[#E5E5E5] text-[#171717] rounded-lg px-2 py-1 font-mono text-xs outline-none focus:border-[#111111] shadow-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-[#737373]">Pitch Height (m)</label>
                <input
                  type="number"
                  step="0.2"
                  value={(selectedObject as RoofObject).height}
                  onChange={(e) => updateObject(selectedObject.id, { height: parseFloat(e.target.value) || 0.5 })}
                  className="w-full bg-white border border-[#E5E5E5] text-[#171717] rounded-lg px-2 py-1 font-mono text-xs outline-none focus:border-[#111111] shadow-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-[#737373]">Overhang (m)</label>
                <input
                  type="number"
                  step="0.1"
                  value={(selectedObject as RoofObject).overhang || 0.6}
                  onChange={(e) => updateObject(selectedObject.id, { overhang: parseFloat(e.target.value) || 0.6 })}
                  className="w-full bg-white border border-[#E5E5E5] text-[#171717] rounded-lg px-2 py-1 font-mono text-xs outline-none focus:border-[#111111] shadow-sm"
                />
              </div>
            </div>
          </div>
        )}

        {/* ================= 2. WALL PROPERTIES ================= */}
        {selectedObject.type === 'wall' && (
          <div className="p-3 bg-[#F7F7F5] border border-[#E5E5E5] rounded-xl space-y-3 shadow-sm">
            <div className="flex justify-between items-center pb-2 border-b border-[#E5E5E5]">
              <span className="font-bold text-xs text-[#171717]">Total Wall Length</span>
              <span className="font-mono text-[#19B6D2] font-bold">
                {formatLength(calculateWallLength(selectedObject as WallObject), activeUnit)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] text-[#737373]">Height (m)</label>
                <input
                  type="number"
                  step="0.1"
                  value={(selectedObject as WallObject).height}
                  onChange={(e) => updateObject(selectedObject.id, { height: parseFloat(e.target.value) || 3.0 })}
                  className="w-full bg-white border border-[#E5E5E5] text-[#171717] rounded-lg px-2 py-1 font-mono text-xs outline-none focus:border-[#111111] shadow-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-[#737373]">Thickness (m)</label>
                <input
                  type="number"
                  step="0.02"
                  value={(selectedObject as WallObject).thickness}
                  onChange={(e) => updateObject(selectedObject.id, { thickness: parseFloat(e.target.value) || 0.2 })}
                  className="w-full bg-white border border-[#E5E5E5] text-[#171717] rounded-lg px-2 py-1 font-mono text-xs outline-none focus:border-[#111111] shadow-sm"
                />
              </div>
            </div>

            {/* Coordinates */}
            <div className="space-y-1.5 pt-2 border-t border-[#E5E5E5]">
              <span className="text-[10px] font-bold text-[#737373] uppercase">Start &amp; End Coordinates</span>
              <div className="grid grid-cols-2 gap-1.5 font-mono text-xs">
                <div>
                  <span className="text-[9px] text-[#737373]">Start X: </span>
                  <input
                    type="number"
                    step="0.5"
                    value={(selectedObject as WallObject).startX}
                    onChange={(e) => updateObject(selectedObject.id, { startX: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-white text-[#171717] rounded px-1.5 py-0.5 border border-[#E5E5E5]"
                  />
                </div>
                <div>
                  <span className="text-[9px] text-[#737373]">Start Z: </span>
                  <input
                    type="number"
                    step="0.5"
                    value={(selectedObject as WallObject).startZ}
                    onChange={(e) => updateObject(selectedObject.id, { startZ: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-white text-[#171717] rounded px-1.5 py-0.5 border border-[#E5E5E5]"
                  />
                </div>
                <div>
                  <span className="text-[9px] text-[#737373]">End X: </span>
                  <input
                    type="number"
                    step="0.5"
                    value={(selectedObject as WallObject).endX}
                    onChange={(e) => updateObject(selectedObject.id, { endX: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-white text-[#171717] rounded px-1.5 py-0.5 border border-[#E5E5E5]"
                  />
                </div>
                <div>
                  <span className="text-[9px] text-[#737373]">End Z: </span>
                  <input
                    type="number"
                    step="0.5"
                    value={(selectedObject as WallObject).endZ}
                    onChange={(e) => updateObject(selectedObject.id, { endZ: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-white text-[#171717] rounded px-1.5 py-0.5 border border-[#E5E5E5]"
                  />
                </div>
              </div>
            </div>

            {/* Openings on this wall */}
            {(selectedObject as WallObject).openings?.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-[#E5E5E5]">
                <span className="text-[10px] font-bold text-[#737373] uppercase">
                  Wall Openings ({ (selectedObject as WallObject).openings.length })
                </span>
                <div className="space-y-1">
                  {(selectedObject as WallObject).openings.map((op) => (
                    <div
                      key={op.id}
                      className="flex items-center justify-between p-2 bg-white border border-[#E5E5E5] rounded-lg shadow-sm"
                    >
                      <div>
                        <div className="font-semibold text-[#171717] capitalize text-xs">{op.subType} {op.type}</div>
                        <div className="text-[10px] text-[#737373] font-mono">
                          {op.width}m × {op.height}m
                        </div>
                      </div>
                      <button
                        onClick={() => removeOpeningFromWall(selectedObject.id, op.id)}
                        className="text-[#737373] hover:text-red-600 p-1"
                        title="Remove Opening"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= 3. FLOOR SLAB PROPERTIES ================= */}
        {selectedObject.type === 'floor' && (
          <div className="p-3 bg-[#F7F7F5] border border-[#E5E5E5] rounded-xl space-y-3 shadow-sm">
            <div className="space-y-1">
              <label className="text-[10px] text-[#737373]">Room Designation</label>
              <input
                type="text"
                value={(selectedObject as FloorSlabObject).roomName}
                onChange={(e) => updateObject(selectedObject.id, { roomName: e.target.value })}
                className="w-full bg-white border border-[#E5E5E5] text-[#171717] rounded-lg px-2.5 py-1 text-xs outline-none focus:border-[#111111] shadow-sm"
              />
            </div>

            <div className="p-2.5 bg-white rounded-lg border border-[#E5E5E5] flex justify-between items-center shadow-sm">
              <span className="font-bold text-xs text-[#171717]">Surface Area</span>
              <span className="font-mono text-[#19B6D2] font-bold">
                {formatArea((selectedObject as FloorSlabObject).width * (selectedObject as FloorSlabObject).depth, activeUnit)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] text-[#737373]">Width (m)</label>
                <input
                  type="number"
                  step="0.5"
                  value={(selectedObject as FloorSlabObject).width}
                  onChange={(e) => updateObject(selectedObject.id, { width: parseFloat(e.target.value) || 1 })}
                  className="w-full bg-white border border-[#E5E5E5] text-[#171717] rounded-lg px-2 py-1 font-mono text-xs outline-none focus:border-[#111111] shadow-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-[#737373]">Depth (m)</label>
                <input
                  type="number"
                  step="0.5"
                  value={(selectedObject as FloorSlabObject).depth}
                  onChange={(e) => updateObject(selectedObject.id, { depth: parseFloat(e.target.value) || 1 })}
                  className="w-full bg-white border border-[#E5E5E5] text-[#171717] rounded-lg px-2 py-1 font-mono text-xs outline-none focus:border-[#111111] shadow-sm"
                />
              </div>
            </div>
          </div>
        )}

        {/* ================= 4. FURNITURE DIMENSIONS ================= */}
        {selectedObject.type === 'furniture' && (
          <div className="p-3 bg-[#F7F7F5] border border-[#E5E5E5] rounded-xl space-y-2 shadow-sm">
            <span className="text-[10px] font-bold text-[#737373] uppercase tracking-wider">
              Furniture Dimensions (m)
            </span>
            <div className="grid grid-cols-3 gap-1.5 font-mono text-xs">
              <div>
                <span className="text-[9px] text-[#737373]">W: </span>
                <input
                  type="number"
                  step="0.1"
                  value={(selectedObject as any).width || 1}
                  onChange={(e) => updateObject(selectedObject.id, { width: parseFloat(e.target.value) || 1 })}
                  className="w-full bg-white text-[#171717] rounded px-1.5 py-0.5 border border-[#E5E5E5]"
                />
              </div>
              <div>
                <span className="text-[9px] text-[#737373]">H: </span>
                <input
                  type="number"
                  step="0.1"
                  value={(selectedObject as any).height || 0.8}
                  onChange={(e) => updateObject(selectedObject.id, { height: parseFloat(e.target.value) || 0.8 })}
                  className="w-full bg-white text-[#171717] rounded px-1.5 py-0.5 border border-[#E5E5E5]"
                />
              </div>
              <div>
                <span className="text-[9px] text-[#737373]">D: </span>
                <input
                  type="number"
                  step="0.1"
                  value={(selectedObject as any).depth || 1}
                  onChange={(e) => updateObject(selectedObject.id, { depth: parseFloat(e.target.value) || 1 })}
                  className="w-full bg-white text-[#171717] rounded px-1.5 py-0.5 border border-[#E5E5E5]"
                />
              </div>
            </div>
          </div>
        )}

        {/* ================= 5. POSITION XYZ & ROTATION ================= */}
        {'x' in selectedObject && (
          <div className="p-3 bg-[#F7F7F5] border border-[#E5E5E5] rounded-xl space-y-2.5 shadow-sm">
            <span className="text-[10px] font-bold text-[#737373] uppercase tracking-wider">
              Position XYZ (m)
            </span>
            <div className="grid grid-cols-3 gap-1.5 font-mono text-xs">
              <div>
                <span className="text-[9px] text-[#737373]">X: </span>
                <input
                  type="number"
                  step="0.2"
                  value={(selectedObject as any).x}
                  onChange={(e) => updateObject(selectedObject.id, { x: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-white text-[#171717] rounded px-1.5 py-0.5 border border-[#E5E5E5]"
                />
              </div>
              <div>
                <span className="text-[9px] text-[#737373]">Y (Elev): </span>
                <input
                  type="number"
                  step="0.2"
                  value={(selectedObject as any).y || (selectedObject as any).elevation || 0}
                  onChange={(e) =>
                    updateObject(selectedObject.id, {
                      y: parseFloat(e.target.value) || 0,
                      elevation: parseFloat(e.target.value) || 0
                    })
                  }
                  className="w-full bg-white text-[#171717] rounded px-1.5 py-0.5 border border-[#E5E5E5]"
                />
              </div>
              <div>
                <span className="text-[9px] text-[#737373]">Z: </span>
                <input
                  type="number"
                  step="0.2"
                  value={(selectedObject as any).z}
                  onChange={(e) => updateObject(selectedObject.id, { z: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-white text-[#171717] rounded px-1.5 py-0.5 border border-[#E5E5E5]"
                />
              </div>
            </div>

            {/* Rotation Y in Degrees */}
            {'rotationY' in selectedObject && (
              <div className="pt-2 border-t border-[#E5E5E5] flex items-center justify-between">
                <span className="text-[10px] text-[#737373]">Rotation Y (deg)</span>
                <div className="flex items-center gap-1 font-mono text-xs">
                  <input
                    type="number"
                    step="15"
                    value={Math.round((((selectedObject as any).rotationY || 0) * 180) / Math.PI)}
                    onChange={(e) =>
                      updateObject(selectedObject.id, {
                        rotationY: ((parseFloat(e.target.value) || 0) * Math.PI) / 180
                      })
                    }
                    className="w-20 bg-white text-[#171717] rounded px-1.5 py-0.5 border border-[#E5E5E5] text-right"
                  />
                  <span className="text-[10px] text-[#737373]">°</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= 6. SURFACE FINISH & MATERIAL ================= */}
        {'materialId' in selectedObject && mat && (
          <div className="p-3 bg-[#F7F7F5] border border-[#E5E5E5] rounded-xl space-y-2.5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-[#171717]">Surface Finish</span>
              <span className="text-[10px] text-[#19B6D2] uppercase tracking-wide font-mono font-semibold">{mat.category}</span>
            </div>

            {/* Material Card Preview */}
            <div className="flex items-center gap-2.5 p-2 bg-white rounded-lg border border-[#E5E5E5] shadow-sm">
              <div
                className="w-9 h-9 rounded-md border border-[#E5E5E5] shadow-inner flex-shrink-0"
                style={{ backgroundColor: mat.color }}
              />
              <div className="truncate">
                <div className="font-semibold text-[#171717] truncate text-xs">{mat.name}</div>
                <div className="text-[10px] text-[#737373] font-mono">
                  Roughness: {mat.roughness} | Metalness: {mat.metalness}
                </div>
              </div>
            </div>

            {/* Change Material Dropdown */}
            <div className="space-y-1">
              <span className="text-[10px] text-[#737373]">Change Material:</span>
              <select
                value={mat.id}
                onChange={(e) => updateObject(selectedObject.id, { materialId: e.target.value })}
                className="w-full bg-white border border-[#E5E5E5] text-[#171717] rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-[#111111] shadow-sm"
              >
                {ARCHITECTURAL_MATERIALS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.category})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
