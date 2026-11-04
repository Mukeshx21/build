import React, { useState } from 'react';
import { useStudioStore } from '../store/useStudioStore';
import { ToolCategory, SceneObject, WallObject, FloorSlabObject, RoofObject } from '../types/studio';
import {
  CATALOG_DOORS,
  CATALOG_WINDOWS,
  CATALOG_FURNITURE,
  CATALOG_COLUMNS,
  CATALOG_STAIRS,
  CATALOG_ROOFS,
  CATALOG_LANDSCAPE
} from '../data/catalog';
import { ARCHITECTURAL_MATERIALS } from '../data/materials';
import {
  MousePointer,
  Move,
  RotateCw,
  Maximize2,
  Square,
  DoorClosed,
  AppWindow,
  Layers,
  Home,
  TrendingUp,
  AlignCenter,
  Armchair,
  Palette,
  Sun,
  Trees,
  Plus,
  Sliders,
  CheckCircle2,
  Sparkles,
  Info
} from 'lucide-react';

export const LeftSidebar: React.FC = () => {
  const activeTool = useStudioStore((s) => s.activeTool);
  const setActiveTool = useStudioStore((s) => s.setActiveTool);
  const transformMode = useStudioStore((s) => s.transformMode);
  const setTransformMode = useStudioStore((s) => s.setTransformMode);
  const addObject = useStudioStore((s) => s.addObject);
  const selectedObjectId = useStudioStore((s) => s.selectedObjectId);
  const updateObject = useStudioStore((s) => s.updateObject);
  const addOpeningToWall = useStudioStore((s) => s.addOpeningToWall);
  const project = useStudioStore((s) => s.project);
  const lighting = useStudioStore((s) => s.project.lighting);
  const updateLighting = useStudioStore((s) => s.updateLighting);
  const setStatusMessage = useStudioStore((s) => s.setStatusMessage);

  const [furnitureSearch, setFurnitureSearch] = useState('');
  const [furnitureCategory, setFurnitureCategory] = useState<string>('all');

  // Exact 15 tools matching Reference Image 1
  const toolIcons: { id: ToolCategory; label: string; icon: any }[] = [
    { id: 'select', label: 'Select', icon: MousePointer },
    { id: 'move', label: 'Move', icon: Move },
    { id: 'rotate', label: 'Rotate', icon: RotateCw },
    { id: 'scale', label: 'Scale', icon: Maximize2 },
    { id: 'walls', label: 'Walls', icon: Square },
    { id: 'doors', label: 'Doors', icon: DoorClosed },
    { id: 'windows', label: 'Windows', icon: AppWindow },
    { id: 'floors', label: 'Floors', icon: Layers },
    { id: 'roofs', label: 'Roofs', icon: Home },
    { id: 'stairs', label: 'Stairs', icon: TrendingUp },
    { id: 'columns', label: 'Columns', icon: AlignCenter },
    { id: 'furniture', label: 'Furniture', icon: Armchair },
    { id: 'materials', label: 'Materials', icon: Palette },
    { id: 'lighting', label: 'Lighting', icon: Sun },
    { id: 'landscaping', label: 'Landscape', icon: Trees },
  ];

  // Tool explanations
  const getToolDescription = (tool: ToolCategory): string => {
    switch (tool) {
      case 'select':
        return 'Click any wall, slab, door, window, or furniture in the 3D viewport to inspect its properties or adjust transforms.';
      case 'move':
        return 'Drag the interactive 3D translation gizmo to move selected objects along X, Y, or Z axes.';
      case 'rotate':
        return 'Use the rotation gizmo rings to pivot objects around their primary vertical or horizontal axes.';
      case 'scale':
        return 'Resize selected architectural objects by dragging the 3D scaling handles.';
      case 'walls':
        return 'Place parametric structural walls with customized length, thickness, and elevation.';
      case 'doors':
        return 'Select a wall segment to insert realistic swinging, sliding, or double-entry doors.';
      case 'windows':
        return 'Select a wall to place multi-pane casement, sliding, or floor-to-ceiling windows with sills.';
      case 'floors':
        return 'Generate finished floor slabs and plinth foundations for single or multi-storey layouts.';
      case 'roofs':
        return 'Add modern flat, pitched gable, pyramid hip, or shed roofs with realistic edge details.';
      case 'stairs':
        return 'Place internal or exterior staircases complete with floating treads and glass balustrades.';
      case 'columns':
        return 'Add load-bearing square concrete, classical round, or steel I-beam columns.';
      case 'furniture':
        return 'Populate rooms with modern architectural furniture from our 3D BIM library.';
      case 'materials':
        return 'Apply PBR surface finishes including Carrara marble, oak, travertine, and low-iron glass.';
      case 'lighting':
        return 'Adjust real-time solar elevation, time of day, sky ambient diffuse light, and soft shadows.';
      case 'landscaping':
        return 'Add luxury infinity swimming pools, boundary stone walls, and landscape trees.';
      default:
        return 'Select a tool to configure parametric architectural geometry.';
    }
  };

  // Quick wall generator
  const handleAddWall = () => {
    const newWall: WallObject = {
      id: `wall_${Date.now()}`,
      name: 'Partition Wall',
      type: 'wall',
      floorLevel: project.activeFloorLevel === -1 ? 0 : project.activeFloorLevel,
      startX: -3,
      startZ: 0,
      endX: 3,
      endZ: 0,
      height: 3.0,
      thickness: 0.22,
      elevation: 0,
      materialId: 'mat_white_plaster',
      openings: [],
      visible: true,
      locked: false
    };
    addObject(newWall);
    setStatusMessage('Created new partition wall segment.');
  };

  // Rectangular room generator
  const handleCreateRoom = (width = 6, depth = 5, roomName = 'New Bedroom') => {
    const floorLvl = project.activeFloorLevel === -1 ? 0 : project.activeFloorLevel;
    const halfW = width / 2;
    const halfD = depth / 2;
    const timestamp = Date.now();

    // Floor Slab
    const slab: FloorSlabObject = {
      id: `slab_${timestamp}`,
      name: `${roomName} Floor Slab`,
      type: 'floor',
      floorLevel: floorLvl,
      roomName,
      x: 0,
      z: 0,
      width,
      depth,
      thickness: 0.25,
      elevation: 0,
      materialId: 'mat_hardwood_oak',
      visible: true,
      locked: false
    };
    addObject(slab);

    // 4 Walls
    const wallNorth: WallObject = {
      id: `wall_n_${timestamp}`,
      name: `${roomName} North Wall`,
      type: 'wall',
      floorLevel: floorLvl,
      startX: -halfW,
      startZ: -halfD,
      endX: halfW,
      endZ: -halfD,
      height: 3.0,
      thickness: 0.22,
      elevation: 0,
      materialId: 'mat_white_plaster',
      openings: [],
      visible: true,
      locked: false
    };
    const wallSouth: WallObject = {
      id: `wall_s_${timestamp}`,
      name: `${roomName} South Wall`,
      type: 'wall',
      floorLevel: floorLvl,
      startX: -halfW,
      startZ: halfD,
      endX: halfW,
      endZ: halfD,
      height: 3.0,
      thickness: 0.22,
      elevation: 0,
      materialId: 'mat_white_plaster',
      openings: [],
      visible: true,
      locked: false
    };
    const wallWest: WallObject = {
      id: `wall_w_${timestamp}`,
      name: `${roomName} West Wall`,
      type: 'wall',
      floorLevel: floorLvl,
      startX: -halfW,
      startZ: -halfD,
      endX: -halfW,
      endZ: halfD,
      height: 3.0,
      thickness: 0.22,
      elevation: 0,
      materialId: 'mat_white_plaster',
      openings: [],
      visible: true,
      locked: false
    };
    const wallEast: WallObject = {
      id: `wall_e_${timestamp}`,
      name: `${roomName} East Wall`,
      type: 'wall',
      floorLevel: floorLvl,
      startX: halfW,
      startZ: -halfD,
      endX: halfW,
      endZ: halfD,
      height: 3.0,
      thickness: 0.22,
      elevation: 0,
      materialId: 'mat_white_plaster',
      openings: [],
      visible: true,
      locked: false
    };

    addObject(wallNorth);
    addObject(wallSouth);
    addObject(wallWest);
    addObject(wallEast);
    setStatusMessage(`Created complete enclosed room (${width}m × ${depth}m).`);
  };

  // Add door or window opening
  const handleAddOpening = (item: any) => {
    const selectedObj = project.objects.find((o) => o.id === selectedObjectId);
    if (selectedObj && selectedObj.type === 'wall') {
      addOpeningToWall(selectedObj.id, {
        id: `opening_${Date.now()}`,
        type: item.type === 'door' ? 'door' : 'window',
        positionRatio: 0.5,
        width: item.dimensions.width,
        height: item.dimensions.height,
        elevation: item.type === 'window' ? 0.9 : 0,
        subType: item.subType || 'single'
      });
      setStatusMessage(`Added ${item.name} to selected wall.`);
    } else {
      const firstWall = project.objects.find((o) => o.type === 'wall');
      if (firstWall) {
        addOpeningToWall(firstWall.id, {
          id: `opening_${Date.now()}`,
          type: item.type === 'door' ? 'door' : 'window',
          positionRatio: 0.5,
          width: item.dimensions.width,
          height: item.dimensions.height,
          elevation: item.type === 'window' ? 0.9 : 0,
          subType: item.subType || 'single'
        });
        setStatusMessage(`Added ${item.name} to wall ${firstWall.name}.`);
      } else {
        alert('Please create or select a wall first to place doors and windows.');
      }
    }
  };

  return (
    <div className="flex h-full bg-white border-r border-[#E5E5E5] select-none z-20 flex-shrink-0">
      {/* ================= 1. NARROW LEFT VERTICAL TOOLBAR (~70px) ================= */}
      <aside
        className="w-[70px] min-w-[70px] max-w-[70px] bg-white border-r border-[#E5E5E5] flex flex-col items-center py-2.5 gap-1 overflow-y-auto scrollbar-none"
        aria-label="Tool Rail"
      >
        {toolIcons.map((tool) => {
          const Icon = tool.icon;
          const isActive = activeTool === tool.id;
          return (
            <button
              key={tool.id}
              onClick={() => {
                setActiveTool(tool.id);
                if (tool.id === 'move') setTransformMode('translate');
                else if (tool.id === 'rotate') setTransformMode('rotate');
                else if (tool.id === 'scale') setTransformMode('scale');
                else if (tool.id === 'select') setTransformMode('select');
              }}
              className={`w-[58px] h-[50px] flex flex-col items-center justify-center rounded-lg transition-all group ${
                isActive
                  ? 'bg-[#F2F0EC] text-[#111111] font-semibold border-l-2 border-[#111111]'
                  : 'text-[#737373] hover:text-[#171717] hover:bg-[#F7F7F5] border-l-2 border-transparent'
              }`}
              title={`${tool.label} Tool`}
            >
              <Icon
                size={17}
                strokeWidth={isActive ? 2.5 : 2}
                className={isActive ? 'text-[#111111]' : 'text-[#737373] group-hover:text-[#171717]'}
              />
              <span className="text-[9px] font-medium tracking-tight mt-1 truncate max-w-[52px]">
                {tool.label}
              </span>
            </button>
          );
        })}
      </aside>

      {/* ================= 2. FIXED-WIDTH TOOL SETTINGS PANEL (~290px) ================= */}
      <section
        className="w-[290px] min-w-[290px] max-w-[290px] bg-white flex flex-col h-full overflow-hidden border-r border-[#E5E5E5]"
        aria-label="Tool Settings Panel"
      >
        {/* Panel Header */}
        <div className="h-11 border-b border-[#E5E5E5] px-3.5 flex items-center justify-between bg-white">
          <span className="text-xs font-bold text-[#171717] uppercase tracking-wider">
            {activeTool === 'select' || activeTool === 'move' || activeTool === 'rotate' || activeTool === 'scale'
              ? 'SELECT TOOLS'
              : `${activeTool.toUpperCase()} TOOLS`}
          </span>
          <span className="text-[10px] text-[#737373] font-mono">ArchiCraft CAD</span>
        </div>

        {/* Panel Body */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 text-xs scrollbar-thin text-[#171717]">
          {/* Active Tool Info Card */}
          <div className="p-3 bg-[#F7F7F5] border border-[#E5E5E5] rounded-xl space-y-1.5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#171717] flex items-center gap-1.5">
                <Info size={13} className="text-[#19B6D2]" />
                <span>Active Tool:</span>
                <span className="text-[#19B6D2] uppercase tracking-wide">{activeTool}</span>
              </span>
              <span className="w-2 h-2 rounded-full bg-[#19B6D2]" />
            </div>
            <p className="text-[11px] text-[#737373] leading-relaxed">
              {getToolDescription(activeTool)}
            </p>
          </div>

          {/* Translate (W) and Rotate (E) Controls (Prominently featured) */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-[#737373] uppercase tracking-wider">
              Transform Controls
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setActiveTool('move');
                  setTransformMode('translate');
                }}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  activeTool === 'move' || transformMode === 'translate'
                    ? 'border-[#111111] bg-[#111111] text-white shadow-sm'
                    : 'border-[#E5E5E5] bg-white text-[#737373] hover:text-[#171717] hover:bg-[#F2F0EC]'
                }`}
              >
                <Move size={15} className={`mb-1 ${activeTool === 'move' || transformMode === 'translate' ? 'text-white' : 'text-[#171717]'}`} />
                <div className={`font-bold text-xs ${activeTool === 'move' || transformMode === 'translate' ? 'text-white' : 'text-[#171717]'}`}>Translate (W)</div>
                <div className={`text-[10px] ${activeTool === 'move' || transformMode === 'translate' ? 'text-neutral-300' : 'text-[#737373]'}`}>Move along XYZ</div>
              </button>

              <button
                onClick={() => {
                  setActiveTool('rotate');
                  setTransformMode('rotate');
                }}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  activeTool === 'rotate' || transformMode === 'rotate'
                    ? 'border-[#111111] bg-[#111111] text-white shadow-sm'
                    : 'border-[#E5E5E5] bg-white text-[#737373] hover:text-[#171717] hover:bg-[#F2F0EC]'
                }`}
              >
                <RotateCw size={15} className={`mb-1 ${activeTool === 'rotate' || transformMode === 'rotate' ? 'text-white' : 'text-[#171717]'}`} />
                <div className={`font-bold text-xs ${activeTool === 'rotate' || transformMode === 'rotate' ? 'text-white' : 'text-[#171717]'}`}>Rotate (E)</div>
                <div className={`text-[10px] ${activeTool === 'rotate' || transformMode === 'rotate' ? 'text-neutral-300' : 'text-[#737373]'}`}>Spin around axes</div>
              </button>
            </div>
          </div>

          {/* ================= WALL CONTROLS ================= */}
          {activeTool === 'walls' && (
            <div className="space-y-3 pt-1">
              <button
                onClick={handleAddWall}
                className="w-full py-2.5 bg-[#111111] hover:bg-black text-white font-semibold rounded-lg flex items-center justify-center gap-1.5 shadow-sm transition-all"
              >
                <Plus size={15} /> Add Wall Segment
              </button>

              <div className="p-3 bg-[#F7F7F5] border border-[#E5E5E5] rounded-xl space-y-2">
                <span className="font-bold text-xs text-[#171717]">Enclosed Room Generator</span>
                <p className="text-[11px] text-[#737373] leading-relaxed">
                  Generate full enclosed 4-wall footprints with foundation slabs:
                </p>
                <button
                  onClick={() => handleCreateRoom(7, 5, 'Living Room')}
                  className="w-full py-1.5 bg-white hover:bg-[#F2F0EC] text-[#171717] rounded-lg border border-[#E5E5E5] text-xs font-semibold transition-colors text-left px-2.5 flex items-center justify-between shadow-sm"
                >
                  <span>Living Room</span>
                  <span className="text-[#19B6D2] font-mono text-[10px]">7m × 5m</span>
                </button>
                <button
                  onClick={() => handleCreateRoom(5, 4, 'Master Suite')}
                  className="w-full py-1.5 bg-white hover:bg-[#F2F0EC] text-[#171717] rounded-lg border border-[#E5E5E5] text-xs font-semibold transition-colors text-left px-2.5 flex items-center justify-between shadow-sm"
                >
                  <span>Master Bedroom</span>
                  <span className="text-[#19B6D2] font-mono text-[10px]">5m × 4m</span>
                </button>
                <button
                  onClick={() => handleCreateRoom(4, 3, 'Kitchen & Dining')}
                  className="w-full py-1.5 bg-white hover:bg-[#F2F0EC] text-[#171717] rounded-lg border border-[#E5E5E5] text-xs font-semibold transition-colors text-left px-2.5 flex items-center justify-between shadow-sm"
                >
                  <span>Kitchen &amp; Dining</span>
                  <span className="text-[#19B6D2] font-mono text-[10px]">4m × 3m</span>
                </button>
              </div>
            </div>
          )}

          {/* ================= DOORS CATALOG ================= */}
          {activeTool === 'doors' && (
            <div className="space-y-2 pt-1">
              <span className="text-[10px] font-bold text-[#737373] uppercase tracking-wider">
                Door Catalog
              </span>
              <p className="text-[11px] text-[#737373]">
                Select a wall, then click any door to insert framed openings:
              </p>
              {CATALOG_DOORS.map((door) => (
                <div
                  key={door.id}
                  onClick={() => handleAddOpening(door)}
                  className="p-2.5 bg-white hover:bg-[#F2F0EC] border border-[#E5E5E5] hover:border-[#111111] rounded-xl cursor-pointer transition-all group shadow-sm"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-xs text-[#171717] group-hover:text-black">
                      {door.name}
                    </span>
                    <Plus size={13} className="text-[#737373] group-hover:text-black" />
                  </div>
                  <p className="text-[10px] text-[#737373]">{door.description}</p>
                  <span className="text-[10px] font-mono text-[#19B6D2] mt-1 inline-block">
                    {door.dimensions.width}m × {door.dimensions.height}m
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* ================= WINDOWS CATALOG ================= */}
          {activeTool === 'windows' && (
            <div className="space-y-2 pt-1">
              <span className="text-[10px] font-bold text-[#737373] uppercase tracking-wider">
                Window Catalog
              </span>
              <p className="text-[11px] text-[#737373]">
                Select a wall, then click any window to insert multi-pane glazing:
              </p>
              {CATALOG_WINDOWS.map((win) => (
                <div
                  key={win.id}
                  onClick={() => handleAddOpening(win)}
                  className="p-2.5 bg-white hover:bg-[#F2F0EC] border border-[#E5E5E5] hover:border-[#111111] rounded-xl cursor-pointer transition-all group shadow-sm"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-xs text-[#171717] group-hover:text-black">
                      {win.name}
                    </span>
                    <Plus size={13} className="text-[#737373] group-hover:text-black" />
                  </div>
                  <p className="text-[10px] text-[#737373]">{win.description}</p>
                  <span className="text-[10px] font-mono text-[#19B6D2] mt-1 inline-block">
                    {win.dimensions.width}m × {win.dimensions.height}m
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* ================= FLOORS ================= */}
          {activeTool === 'floors' && (
            <div className="space-y-3 pt-1">
              <button
                onClick={() => {
                  const newSlab: FloorSlabObject = {
                    id: `slab_${Date.now()}`,
                    name: 'New Floor Slab',
                    type: 'floor',
                    floorLevel: project.activeFloorLevel === -1 ? 0 : project.activeFloorLevel,
                    roomName: 'New Room Area',
                    x: 0,
                    z: 0,
                    width: 8,
                    depth: 6,
                    thickness: 0.25,
                    elevation: project.activeFloorLevel === 1 ? 3.2 : 0,
                    materialId: 'mat_hardwood_oak',
                    visible: true,
                    locked: false
                  };
                  addObject(newSlab);
                  setStatusMessage('Created 8m × 6m floor slab.');
                }}
                className="w-full py-2.5 bg-[#111111] hover:bg-black text-white font-semibold rounded-lg flex items-center justify-center gap-1.5 shadow-sm transition-all"
              >
                <Plus size={15} /> Add Floor Slab (8m × 6m)
              </button>
            </div>
          )}

          {/* ================= ROOFS CATALOG ================= */}
          {activeTool === 'roofs' && (
            <div className="space-y-2 pt-1">
              <span className="text-[10px] font-bold text-[#737373] uppercase tracking-wider">
                Roof Geometries
              </span>
              {CATALOG_ROOFS.map((roof) => (
                <div
                  key={roof.id}
                  onClick={() => {
                    const newRoof: RoofObject = {
                      id: `roof_${Date.now()}`,
                      name: roof.name,
                      type: 'roof',
                      roofType: roof.subType as any,
                      floorLevel: 0,
                      x: 0,
                      y: 3.2,
                      z: 0,
                      width: 12,
                      depth: 10,
                      height: 2.2,
                      overhang: 0.6,
                      rotationY: 0,
                      materialId: roof.defaultMaterialId,
                      visible: true,
                      locked: false
                    };
                    addObject(newRoof);
                    setStatusMessage(`Added ${roof.name}.`);
                  }}
                  className="p-2.5 bg-white hover:bg-[#F2F0EC] border border-[#E5E5E5] hover:border-[#111111] rounded-xl cursor-pointer transition-all group shadow-sm"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-xs text-[#171717] group-hover:text-black">
                      {roof.name}
                    </span>
                    <Plus size={13} className="text-[#737373] group-hover:text-black" />
                  </div>
                  <p className="text-[10px] text-[#737373]">{roof.description}</p>
                </div>
              ))}
            </div>
          )}

          {/* ================= STAIRS ================= */}
          {activeTool === 'stairs' && (
            <div className="space-y-2 pt-1">
              <span className="text-[10px] font-bold text-[#737373] uppercase tracking-wider">
                Staircase Modules
              </span>
              {CATALOG_STAIRS.map((stair) => (
                <div
                  key={stair.id}
                  onClick={() => {
                    addObject({
                      id: `stair_${Date.now()}`,
                      name: stair.name,
                      type: 'stair',
                      stairType: stair.subType as any,
                      floorLevel: 0,
                      x: 0,
                      y: 0,
                      z: 0,
                      width: stair.dimensions.width,
                      height: stair.dimensions.height,
                      length: stair.dimensions.depth,
                      stepsCount: 16,
                      rotationY: 0,
                      railing: true,
                      materialId: stair.defaultMaterialId,
                      visible: true,
                      locked: false
                    });
                    setStatusMessage(`Added ${stair.name}.`);
                  }}
                  className="p-2.5 bg-white hover:bg-[#F2F0EC] border border-[#E5E5E5] hover:border-[#111111] rounded-xl cursor-pointer transition-all group shadow-sm"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-xs text-[#171717] group-hover:text-black">
                      {stair.name}
                    </span>
                    <Plus size={13} className="text-[#737373] group-hover:text-black" />
                  </div>
                  <p className="text-[10px] text-[#737373]">{stair.description}</p>
                </div>
              ))}
            </div>
          )}

          {/* ================= COLUMNS ================= */}
          {activeTool === 'columns' && (
            <div className="space-y-2 pt-1">
              <span className="text-[10px] font-bold text-[#737373] uppercase tracking-wider">
                Columns &amp; Pillars
              </span>
              {CATALOG_COLUMNS.map((col) => (
                <div
                  key={col.id}
                  onClick={() => {
                    addObject({
                      id: `col_${Date.now()}`,
                      name: col.name,
                      type: 'column',
                      columnType: col.subType as any,
                      floorLevel: 0,
                      x: 0,
                      y: 0,
                      z: 0,
                      width: col.dimensions.width,
                      height: col.dimensions.height,
                      rotationY: 0,
                      materialId: col.defaultMaterialId,
                      visible: true,
                      locked: false
                    });
                    setStatusMessage(`Added ${col.name}.`);
                  }}
                  className="p-2.5 bg-white hover:bg-[#F2F0EC] border border-[#E5E5E5] hover:border-[#111111] rounded-xl cursor-pointer transition-all group shadow-sm"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-xs text-[#171717] group-hover:text-black">
                      {col.name}
                    </span>
                    <Plus size={13} className="text-[#737373] group-hover:text-black" />
                  </div>
                  <p className="text-[10px] text-[#737373]">{col.description}</p>
                </div>
              ))}
            </div>
          )}

          {/* ================= FURNITURE ================= */}
          {activeTool === 'furniture' && (
            <div className="space-y-2 pt-1">
              <span className="text-[10px] font-bold text-[#737373] uppercase tracking-wider">
                Furniture Library
              </span>
              <div className="flex flex-wrap gap-1 mb-2">
                {['all', 'living', 'bedroom', 'dining', 'kitchen', 'office'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setFurnitureCategory(cat)}
                    className={`px-2 py-0.5 rounded-md text-[10px] capitalize font-medium transition-colors ${
                      furnitureCategory === cat
                        ? 'bg-[#111111] text-white font-semibold'
                        : 'bg-[#F2F0EC] text-[#737373] hover:text-[#171717]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {CATALOG_FURNITURE.filter(
                (f) =>
                  (furnitureCategory === 'all' || f.category === furnitureCategory) &&
                  f.name.toLowerCase().includes(furnitureSearch.toLowerCase())
              ).map((furn) => (
                <div
                  key={furn.id}
                  onClick={() => {
                    addObject({
                      id: `furn_${Date.now()}`,
                      name: furn.name,
                      type: 'furniture',
                      category: furn.category as any,
                      modelType: furn.subType || 'generic',
                      floorLevel: 0,
                      x: 0,
                      y: 0,
                      z: 0,
                      rotationX: 0,
                      rotationY: 0,
                      rotationZ: 0,
                      scaleX: 1,
                      scaleY: 1,
                      scaleZ: 1,
                      width: furn.dimensions.width,
                      height: furn.dimensions.height,
                      depth: furn.dimensions.depth,
                      materialId: furn.defaultMaterialId,
                      visible: true,
                      locked: false
                    });
                    setStatusMessage(`Added ${furn.name}.`);
                  }}
                  className="p-2.5 bg-white hover:bg-[#F2F0EC] border border-[#E5E5E5] hover:border-[#111111] rounded-xl cursor-pointer transition-all group shadow-sm"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-xs text-[#171717] group-hover:text-black">
                      {furn.name}
                    </span>
                    <Plus size={13} className="text-[#737373] group-hover:text-black" />
                  </div>
                  <p className="text-[10px] text-[#737373]">{furn.description}</p>
                </div>
              ))}
            </div>
          )}

          {/* ================= MATERIALS PALETTE ================= */}
          {activeTool === 'materials' && (
            <div className="space-y-2 pt-1">
              <span className="text-[10px] font-bold text-[#737373] uppercase tracking-wider">
                PBR Surface Finishes
              </span>
              <p className="text-[11px] text-[#737373] mb-2">
                Click any swatch to apply to the currently selected object:
              </p>
              <div className="grid grid-cols-2 gap-2">
                {ARCHITECTURAL_MATERIALS.map((mat) => (
                  <button
                    key={mat.id}
                    onClick={() => {
                      if (selectedObjectId) {
                        updateObject(selectedObjectId, { materialId: mat.id });
                        setStatusMessage(`Applied ${mat.name} to selected object.`);
                      } else {
                        alert('Please select an object in the viewport first.');
                      }
                    }}
                    className="p-2 bg-white hover:bg-[#F2F0EC] border border-[#E5E5E5] hover:border-[#111111] rounded-xl text-left transition-all group shadow-sm"
                  >
                    <div
                      className="w-full h-8 rounded-lg mb-1.5 border border-[#E5E5E5] shadow-inner"
                      style={{ backgroundColor: mat.color }}
                    />
                    <div className="font-semibold text-[11px] text-[#171717] group-hover:text-black truncate">
                      {mat.name}
                    </div>
                    <div className="text-[9px] text-[#737373] capitalize">{mat.category}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ================= LIGHTING CONTROLS ================= */}
          {activeTool === 'lighting' && (
            <div className="space-y-3 pt-1">
              <span className="text-[10px] font-bold text-[#737373] uppercase tracking-wider">
                Solar &amp; Ambient Lighting
              </span>
              <div className="p-3 bg-[#F7F7F5] border border-[#E5E5E5] rounded-xl space-y-2 shadow-sm">
                <span className="font-bold text-xs text-[#171717]">Sunlight Intensity</span>
                <input
                  type="range"
                  min="0"
                  max="2.5"
                  step="0.1"
                  value={lighting.sunIntensity}
                  onChange={(e) => updateLighting({ sunIntensity: parseFloat(e.target.value) })}
                  className="w-full accent-[#111111]"
                />
                <div className="flex justify-between text-[10px] text-[#737373] font-mono">
                  <span>Dim</span>
                  <span className="text-[#171717] font-bold">{lighting.sunIntensity.toFixed(1)}x</span>
                  <span>Bright</span>
                </div>
              </div>

              <div className="p-3 bg-[#F7F7F5] border border-[#E5E5E5] rounded-xl space-y-2 shadow-sm">
                <span className="font-bold text-xs text-[#171717]">Ambient Sky Diffusion</span>
                <input
                  type="range"
                  min="0.1"
                  max="1.5"
                  step="0.05"
                  value={lighting.ambientIntensity}
                  onChange={(e) => updateLighting({ ambientIntensity: parseFloat(e.target.value) })}
                  className="w-full accent-[#111111]"
                />
                <div className="flex justify-between text-[10px] text-[#737373] font-mono">
                  <span>Moody</span>
                  <span className="text-[#171717] font-bold">{lighting.ambientIntensity.toFixed(2)}x</span>
                  <span>Diffuse</span>
                </div>
              </div>

              <div className="p-3 bg-[#F7F7F5] border border-[#E5E5E5] rounded-xl flex items-center justify-between shadow-sm">
                <span className="font-bold text-xs text-[#171717]">Interior Spotlights</span>
                <input
                  type="checkbox"
                  checked={lighting.interiorSpotlights}
                  onChange={(e) => updateLighting({ interiorSpotlights: e.target.checked })}
                  className="w-4 h-4 accent-[#111111] cursor-pointer"
                />
              </div>

              <div className="p-3 bg-[#F7F7F5] border border-[#E5E5E5] rounded-xl flex items-center justify-between shadow-sm">
                <span className="font-bold text-xs text-[#171717]">Cast Real Shadows</span>
                <input
                  type="checkbox"
                  checked={lighting.shadows}
                  onChange={(e) => updateLighting({ shadows: e.target.checked })}
                  className="w-4 h-4 accent-[#111111] cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* ================= LANDSCAPING ================= */}
          {activeTool === 'landscaping' && (
            <div className="space-y-2 pt-1">
              <span className="text-[10px] font-bold text-[#737373] uppercase tracking-wider">
                Outdoor &amp; Landscaping
              </span>
              {CATALOG_LANDSCAPE.map((land) => (
                <div
                  key={land.id}
                  onClick={() => {
                    addObject({
                      id: `land_${Date.now()}`,
                      name: land.name,
                      type: 'landscape',
                      modelType: land.subType as any,
                      x: 0,
                      y: 0,
                      z: 0,
                      rotationY: 0,
                      scale: 1,
                      width: land.dimensions.width,
                      depth: land.dimensions.depth,
                      visible: true,
                      locked: false
                    });
                    setStatusMessage(`Added ${land.name}.`);
                  }}
                  className="p-2.5 bg-white hover:bg-[#F2F0EC] border border-[#E5E5E5] hover:border-[#111111] rounded-xl cursor-pointer transition-all group shadow-sm"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-xs text-[#171717] group-hover:text-black">
                      {land.name}
                    </span>
                    <Plus size={13} className="text-[#737373] group-hover:text-black" />
                  </div>
                  <p className="text-[10px] text-[#737373]">{land.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
