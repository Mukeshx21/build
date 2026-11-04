import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useStudioStore } from '../store/useStudioStore';
import { WallObject, FloorSlabObject, SceneObject } from '../types/studio';
import {
  formatLength,
  formatArea,
  calculateWallLength,
  calculateWallAngle,
  calculateProjectFootprint,
  generateFloorPlanSvg
} from '../utils/geometry';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  PenTool,
  Move,
  Square,
  Eye,
  CheckCircle2
} from 'lucide-react';

export const FloorPlan2D: React.FC = () => {
  const objects = useStudioStore((s) => s.project.objects);
  const activeUnit = useStudioStore((s) => s.activeUnit);
  const projectName = useStudioStore((s) => s.project.metadata.name);
  const selectedObjectId = useStudioStore((s) => s.selectedObjectId);
  const setSelectedObjectId = useStudioStore((s) => s.setSelectedObjectId);
  const addObject = useStudioStore((s) => s.addObject);
  const updateObject = useStudioStore((s) => s.updateObject);
  const setStatusMessage = useStudioStore((s) => s.setStatusMessage);

  const [scale, setScale] = useState(40); // pixels per meter
  const [pan, setPan] = useState({ x: 350, y: 300 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Drawing mode: 'select' | 'draw_wall' | 'draw_room'
  const [drawMode, setDrawMode] = useState<'select' | 'draw_wall'>('select');
  const [drawingWallStart, setDrawingWallStart] = useState<{ x: number; z: number } | null>(null);
  const [cursorPos, setCursorPos] = useState<{ x: number; z: number }>({ x: 0, z: 0 });

  const containerRef = useRef<HTMLDivElement>(null);

  const footprint = useMemo(() => calculateProjectFootprint(objects), [objects]);

  // Convert screen pixels to world meters (X, Z)
  const screenToWorld = (screenX: number, screenY: number) => {
    const worldX = (screenX - pan.x) / scale;
    const worldZ = (screenY - pan.y) / scale;
    // Snap to 0.5m grid
    return {
      x: Math.round(worldX * 2) / 2,
      z: Math.round(worldZ * 2) / 2
    };
  };

  // Convert world meters to screen pixels
  const worldToScreen = (worldX: number, worldZ: number) => {
    return {
      x: pan.x + worldX * scale,
      y: pan.y + worldZ * scale
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      // Middle click or Alt+LeftClick: Pan
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    if (drawMode === 'draw_wall' && e.button === 0) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const world = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);

      if (!drawingWallStart) {
        setDrawingWallStart(world);
        setStatusMessage(`Wall start set at (${world.x}m, ${world.z}m). Click end point.`);
      } else {
        // Complete the wall
        if (world.x !== drawingWallStart.x || world.z !== drawingWallStart.z) {
          const newWall: WallObject = {
            id: `wall_${Date.now()}`,
            name: `Wall Segment`,
            type: 'wall',
            floorLevel: 0,
            startX: drawingWallStart.x,
            startZ: drawingWallStart.z,
            endX: world.x,
            endZ: world.z,
            height: 3.0,
            thickness: 0.25,
            elevation: 0,
            materialId: 'mat_white_plaster',
            openings: [],
            visible: true,
            locked: false
          };
          addObject(newWall);
          setStatusMessage(`Created wall: ${formatLength(calculateWallLength(newWall), activeUnit)}`);
        }
        setDrawingWallStart(null);
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
      return;
    }

    const world = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
    setCursorPos(world);
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleExportSvg = () => {
    const svgContent = generateFloorPlanSvg(objects, projectName, activeUnit);
    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${projectName.toLowerCase().replace(/\s+/g, '_')}_blueprint.svg`;
    link.click();
    URL.revokeObjectURL(url);
    setStatusMessage('Exported 2D Architectural Floor Plan (SVG)');
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-[#0a0d14] overflow-hidden select-none cursor-crosshair"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* 2D Toolbar Overlay */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-white/95 backdrop-blur-md border border-[#E5E5E5] rounded-xl p-1.5 shadow-sm text-[#171717]">
        <button
          onClick={() => {
            setDrawMode('select');
            setDrawingWallStart(null);
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            drawMode === 'select'
              ? 'bg-[#111111] text-white shadow-sm'
              : 'text-[#737373] hover:text-[#171717] hover:bg-[#F2F0EC]'
          }`}
        >
          <Move size={14} /> Select &amp; Move
        </button>

        <button
          onClick={() => {
            setDrawMode('draw_wall');
            setStatusMessage('Wall Tool: Click anywhere on grid to set wall start point');
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            drawMode === 'draw_wall'
              ? 'bg-[#111111] text-white shadow-sm'
              : 'text-[#737373] hover:text-[#171717] hover:bg-[#F2F0EC]'
          }`}
        >
          <PenTool size={14} /> Draw Wall (Click Grid)
        </button>

        <div className="w-[1px] h-4 bg-[#E5E5E5]" />

        <button
          onClick={handleExportSvg}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#171717] hover:bg-[#F2F0EC] border border-[#E5E5E5] rounded-lg transition-colors shadow-sm"
          title="Export Vector SVG Blueprint"
        >
          <Download size={14} /> Export SVG Blueprint
        </button>
      </div>

      {/* Zoom & View Controls (Top-Right) */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-1 bg-white/95 backdrop-blur-md border border-[#E5E5E5] rounded-xl p-1 shadow-sm text-[#171717]">
        <button
          onClick={() => setScale((s) => Math.min(80, s + 5))}
          className="p-1.5 text-[#737373] hover:text-[#171717] hover:bg-[#F2F0EC] rounded-lg"
          title="Zoom In"
        >
          <ZoomIn size={16} />
        </button>
        <span className="text-[11px] font-mono text-[#737373] px-1">{Math.round((scale / 40) * 100)}%</span>
        <button
          onClick={() => setScale((s) => Math.max(15, s - 5))}
          className="p-1.5 text-[#737373] hover:text-[#171717] hover:bg-[#F2F0EC] rounded-lg"
          title="Zoom Out"
        >
          <ZoomOut size={16} />
        </button>
        <button
          onClick={() => {
            setScale(40);
            setPan({ x: 350, y: 300 });
          }}
          className="p-1.5 text-[#737373] hover:text-[#171717] hover:bg-[#F2F0EC] rounded-lg"
          title="Center View"
        >
          <RotateCcw size={15} />
        </button>
      </div>

      {/* SVG Canvas */}
      <svg className="w-full h-full pointer-events-none">
        <defs>
          {/* Subtle Grid */}
          <pattern
            id="editorGrid"
            width={scale}
            height={scale}
            patternUnits="userSpaceOnUse"
            patternTransform={`translate(${pan.x % scale}, ${pan.y % scale})`}
          >
            <path d={`M ${scale} 0 L 0 0 0 ${scale}`} fill="none" stroke="#E5E5E5" strokeWidth="0.8" />
          </pattern>
        </defs>

        {/* Background Grid */}
        <rect width="100%" height="100%" fill="url(#editorGrid)" />

        {/* Origin Axes (0,0) */}
        <line x1={pan.x - 2000} y1={pan.y} x2={pan.x + 2000} y2={pan.y} stroke="#CBD5E1" strokeWidth="1" />
        <line x1={pan.x} y1={pan.y - 2000} x2={pan.x} y2={pan.y + 2000} stroke="#CBD5E1" strokeWidth="1" />

        {/* Render Floor Slabs / Rooms */}
        {objects
          .filter((o) => o.type === 'floor')
          .map((obj) => {
            const f = obj as FloorSlabObject;
            const p = worldToScreen(f.x - f.width / 2, f.z - f.depth / 2);
            const w = f.width * scale;
            const h = f.depth * scale;
            const isSelected = f.id === selectedObjectId;

            return (
              <g
                key={f.id}
                className="pointer-events-auto cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedObjectId(f.id);
                }}
              >
                <rect
                  x={p.x}
                  y={p.y}
                  width={w}
                  height={h}
                  fill={isSelected ? '#F2F0EC' : '#FFFFFF'}
                  stroke={isSelected ? '#111111' : '#E5E5E5'}
                  strokeWidth={isSelected ? 2 : 1}
                  strokeDasharray="4 2"
                  rx={4}
                  opacity={0.9}
                />
                <text
                  x={p.x + w / 2}
                  y={p.y + h / 2 - 6}
                  fill="#171717"
                  fontSize="12"
                  fontWeight="600"
                  fontFamily="'DM Sans', -apple-system, sans-serif"
                  textAnchor="middle"
                >
                  {f.roomName}
                </text>
                <text
                  x={p.x + w / 2}
                  y={p.y + h / 2 + 12}
                  fill="#737373"
                  fontSize="11"
                  fontFamily="'DM Sans', -apple-system, sans-serif"
                  textAnchor="middle"
                >
                  {formatArea(f.width * f.depth, activeUnit)}
                </text>
              </g>
            );
          })}

        {/* Render Walls */}
        {objects
          .filter((o) => o.type === 'wall')
          .map((obj) => {
            const w = obj as WallObject;
            const p1 = worldToScreen(w.startX, w.startZ);
            const p2 = worldToScreen(w.endX, w.endZ);
            const isSelected = w.id === selectedObjectId;
            const wallPx = Math.max(5, w.thickness * scale);
            const len = calculateWallLength(w);
            const angle = calculateWallAngle(w);

            return (
              <g
                key={w.id}
                className="pointer-events-auto cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedObjectId(w.id);
                }}
              >
                {/* Wall Base Stroke */}
                <line
                  x1={p1.x}
                  y1={p1.y}
                  x2={p2.x}
                  y2={p2.y}
                  stroke={isSelected ? '#38bdf8' : '#f8fafc'}
                  strokeWidth={wallPx}
                  strokeLinecap="square"
                />

                {/* Length Annotation */}
                <text
                  x={(p1.x + p2.x) / 2 + Math.cos(angle + Math.PI / 2) * 16}
                  y={(p1.y + p2.y) / 2 + Math.sin(angle + Math.PI / 2) * 16}
                  fill="#cbd5e1"
                  fontSize="10"
                  fontFamily="monospace"
                  textAnchor="middle"
                >
                  {formatLength(len, activeUnit)}
                </text>

                {/* Openings (Doors & Windows) */}
                {w.openings &&
                  w.openings.map((op) => {
                    const opX = p1.x + (p2.x - p1.x) * op.positionRatio;
                    const opY = p1.y + (p2.y - p1.y) * op.positionRatio;
                    const opW = op.width * scale;

                    return (
                      <g key={op.id}>
                        {op.type === 'door' ? (
                          <>
                            <circle
                              cx={opX}
                              cy={opY}
                              r={opW / 2}
                              fill="none"
                              stroke="#22d3ee"
                              strokeWidth="1.5"
                              strokeDasharray="2 2"
                            />
                            <line
                              x1={opX}
                              y1={opY}
                              x2={opX + Math.cos(angle + 0.8) * opW}
                              y2={opY + Math.sin(angle + 0.8) * opW}
                              stroke="#22d3ee"
                              strokeWidth="2"
                            />
                          </>
                        ) : (
                          <line
                            x1={opX - (Math.cos(angle) * opW) / 2}
                            y1={opY - (Math.sin(angle) * opW) / 2}
                            x2={opX + (Math.cos(angle) * opW) / 2}
                            y2={opY + (Math.sin(angle) * opW) / 2}
                            stroke="#38bdf8"
                            strokeWidth={wallPx / 2}
                          />
                        )}
                      </g>
                    );
                  })}
              </g>
            );
          })}

        {/* Live Wall Drawing Preview Line */}
        {drawMode === 'draw_wall' && drawingWallStart && (
          <g>
            {(() => {
              const pStart = worldToScreen(drawingWallStart.x, drawingWallStart.z);
              const pEnd = worldToScreen(cursorPos.x, cursorPos.z);
              const dist = Math.sqrt(
                (cursorPos.x - drawingWallStart.x) ** 2 + (cursorPos.z - drawingWallStart.z) ** 2
              );
              return (
                <>
                  <line
                    x1={pStart.x}
                    y1={pStart.y}
                    x2={pEnd.x}
                    y2={pEnd.y}
                    stroke="#38bdf8"
                    strokeWidth="6"
                    strokeDasharray="4 2"
                  />
                  <circle cx={pStart.x} cy={pStart.y} r="5" fill="#38bdf8" />
                  <circle cx={pEnd.x} cy={pEnd.y} r="5" fill="#38bdf8" />
                  <text
                    x={(pStart.x + pEnd.x) / 2}
                    y={(pStart.y + pEnd.y) / 2 - 12}
                    fill="#38bdf8"
                    fontSize="12"
                    fontWeight="bold"
                    fontFamily="monospace"
                    textAnchor="middle"
                  >
                    {formatLength(dist, activeUnit)}
                  </text>
                </>
              );
            })()}
          </g>
        )}
      </svg>

      {/* Blueprint Coordinates & Stats (Bottom-Left) */}
      <div className="absolute bottom-4 left-4 z-20 flex items-center gap-3 bg-white/95 backdrop-blur-md border border-[#E5E5E5] rounded-xl px-3 py-2 text-xs font-mono text-[#737373] shadow-sm">
        <div>
          Cursor: <span className="text-[#171717] font-semibold">{cursorPos.x.toFixed(1)}m, {cursorPos.z.toFixed(1)}m</span>
        </div>
        <div className="w-[1px] h-3 bg-[#E5E5E5]" />
        <div>
          Total Area: <span className="text-[#171717] font-bold">{formatArea(footprint.area, activeUnit)}</span>
        </div>
        <div className="w-[1px] h-3 bg-[#E5E5E5]" />
        <div>
          Footprint: <span className="text-[#171717] font-semibold">{footprint.width}m × {footprint.depth}m</span>
        </div>
      </div>
    </div>
  );
};
