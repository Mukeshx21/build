import { LengthUnit, SceneObject, WallObject, FloorSlabObject } from '../types/studio';

export const UNIT_CONVERSIONS = {
  m: 1,
  cm: 0.01,
  ft: 0.3048,
};

export const formatLength = (meters: number, unit: LengthUnit = 'm'): string => {
  if (unit === 'cm') {
    return `${Math.round(meters * 100)} cm`;
  }
  if (unit === 'ft') {
    const totalInches = meters * 39.3701;
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches % 12);
    return `${feet}'-${inches}"`;
  }
  return `${meters.toFixed(2)} m`;
};

export const toMeters = (val: number, unit: LengthUnit): number => {
  if (unit === 'cm') return val / 100;
  if (unit === 'ft') return val * 0.3048;
  return val;
};

export const formatArea = (sqMeters: number, unit: LengthUnit = 'm'): string => {
  if (unit === 'ft') {
    const sqFt = sqMeters * 10.7639;
    return `${Math.round(sqFt)} sq ft`;
  }
  return `${sqMeters.toFixed(1)} m²`;
};

export const snapValue = (val: number, snapStep: number = 0.5): number => {
  return Math.round(val / snapStep) * snapStep;
};

export const calculateWallLength = (wall: WallObject): number => {
  const dx = wall.endX - wall.startX;
  const dz = wall.endZ - wall.startZ;
  return Math.sqrt(dx * dx + dz * dz);
};

export const calculateWallAngle = (wall: WallObject): number => {
  const dx = wall.endX - wall.startX;
  const dz = wall.endZ - wall.startZ;
  return Math.atan2(dz, dx);
};

export const calculateProjectFootprint = (objects: SceneObject[]) => {
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  let floorArea = 0;

  objects.forEach(obj => {
    if (obj.type === 'floor') {
      const slab = obj as FloorSlabObject;
      const left = slab.x - slab.width / 2;
      const right = slab.x + slab.width / 2;
      const top = slab.z - slab.depth / 2;
      const bottom = slab.z + slab.depth / 2;

      minX = Math.min(minX, left);
      maxX = Math.max(maxX, right);
      minZ = Math.min(minZ, top);
      maxZ = Math.max(maxZ, bottom);

      floorArea += slab.width * slab.depth;
    } else if (obj.type === 'wall') {
      const wall = obj as WallObject;
      minX = Math.min(minX, wall.startX, wall.endX);
      maxX = Math.max(maxX, wall.startX, wall.endX);
      minZ = Math.min(minZ, wall.startZ, wall.endZ);
      maxZ = Math.max(maxZ, wall.startZ, wall.endZ);
    }
  });

  if (minX === Infinity) {
    return { width: 0, depth: 0, area: 0, bounds: { minX: 0, maxX: 0, minZ: 0, maxZ: 0 } };
  }

  const width = Math.max(0, maxX - minX);
  const depth = Math.max(0, maxZ - minZ);
  if (floorArea === 0) {
    floorArea = width * depth;
  }

  return {
    width: Math.round(width * 10) / 10,
    depth: Math.round(depth * 10) / 10,
    area: Math.round(floorArea * 10) / 10,
    bounds: { minX, maxX, minZ, maxZ }
  };
};

/**
 * Generates an SVG string of the 2D architectural floor plan
 */
export const generateFloorPlanSvg = (objects: SceneObject[], projectName: string, unit: LengthUnit = 'm'): string => {
  const footprint = calculateProjectFootprint(objects);
  const padding = 3;
  const viewBoxMinX = footprint.bounds.minX - padding;
  const viewBoxMinZ = footprint.bounds.minZ - padding;
  const viewBoxWidth = footprint.width + padding * 2 || 20;
  const viewBoxHeight = footprint.depth + padding * 2 || 20;

  // Scale to pixels: 40px per meter
  const scale = 45;
  const svgW = Math.max(600, viewBoxWidth * scale);
  const svgH = Math.max(500, viewBoxHeight * scale);

  const toSvgX = (x: number) => (x - viewBoxMinX) * scale;
  const toSvgY = (z: number) => (z - viewBoxMinZ) * scale;

  let floorsSvg = '';
  let wallsSvg = '';
  let annotationsSvg = '';

  // Render Rooms & Floors
  objects.filter(o => o.type === 'floor').forEach(obj => {
    const f = obj as FloorSlabObject;
    const x = toSvgX(f.x - f.width / 2);
    const y = toSvgY(f.z - f.depth / 2);
    const w = f.width * scale;
    const h = f.depth * scale;
    const areaStr = formatArea(f.width * f.depth, unit);

    floorsSvg += `
      <g class="room-slab">
        <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#1e2433" stroke="#3b82f6" stroke-width="1.5" stroke-dasharray="4 2" rx="4" />
        <text x="${x + w / 2}" y="${y + h / 2 - 8}" fill="#94a3b8" font-size="13" font-family="'Segoe UI', Roboto, sans-serif" font-weight="600" text-anchor="middle">${f.roomName}</text>
        <text x="${x + w / 2}" y="${y + h / 2 + 12}" fill="#38bdf8" font-size="11" font-family="'Segoe UI', Roboto, sans-serif" text-anchor="middle">${areaStr}</text>
      </g>
    `;
  });

  // Render Walls & Openings
  objects.filter(o => o.type === 'wall').forEach(obj => {
    const w = obj as WallObject;
    const x1 = toSvgX(w.startX);
    const y1 = toSvgY(w.startZ);
    const x2 = toSvgX(w.endX);
    const y2 = toSvgY(w.endZ);
    const wallThick = Math.max(4, w.thickness * scale);

    // Wall line
    wallsSvg += `
      <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#f8fafc" stroke-width="${wallThick}" stroke-linecap="square" />
    `;

    // Wall length dimension
    const len = calculateWallLength(w);
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    const angle = calculateWallAngle(w);
    const perpAngle = angle + Math.PI / 2;
    const offset = 18;
    const dimX = midX + Math.cos(perpAngle) * offset;
    const dimY = midY + Math.sin(perpAngle) * offset;

    annotationsSvg += `
      <text x="${dimX}" y="${dimY}" fill="#e2e8f0" font-size="11" font-weight="500" font-family="monospace" text-anchor="middle">${formatLength(len, unit)}</text>
    `;

    // Openings (doors & windows)
    if (w.openings && w.openings.length > 0) {
      w.openings.forEach(op => {
        const opX = x1 + (x2 - x1) * op.positionRatio;
        const opY = y1 + (y2 - y1) * op.positionRatio;
        const opW = op.width * scale;

        if (op.type === 'door') {
          // Door gap and swing arc
          wallsSvg += `
            <circle cx="${opX}" cy="${opY}" r="${opW / 2}" fill="none" stroke="#22d3ee" stroke-width="1.5" stroke-dasharray="2 2" opacity="0.8" />
            <line x1="${opX}" y1="${opY}" x2="${opX + Math.cos(angle + 0.8) * opW}" y2="${opY + Math.sin(angle + 0.8) * opW}" stroke="#22d3ee" stroke-width="2" />
          `;
        } else {
          // Window 3 parallel lines
          wallsSvg += `
            <circle cx="${opX}" cy="${opY}" r="4" fill="#38bdf8" />
            <line x1="${opX - (Math.cos(angle) * opW) / 2}" y1="${opY - (Math.sin(angle) * opW) / 2}" x2="${opX + (Math.cos(angle) * opW) / 2}" y2="${opY + (Math.sin(angle) * opW) / 2}" stroke="#38bdf8" stroke-width="${wallThick / 2}" />
          `;
        }
      });
    }
  });

  return `<?xml version="1.0" standalone="no"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgW} ${svgH}" width="${svgW}" height="${svgH}" style="background-color: #0b0f19;">
  <defs>
    <!-- Architectural Grid Pattern -->
    <pattern id="cadGrid" width="${scale}" height="${scale}" patternUnits="userSpaceOnUse">
      <path d="M ${scale} 0 L 0 0 0 ${scale}" fill="none" stroke="#1e293b" stroke-width="0.7"/>
    </pattern>
  </defs>

  <!-- Grid Background -->
  <rect width="100%" height="100%" fill="url(#cadGrid)" />

  <!-- Slabs Layer -->
  <g id="slabs-layer">
    ${floorsSvg}
  </g>

  <!-- Walls Layer -->
  <g id="walls-layer">
    ${wallsSvg}
  </g>

  <!-- Annotations Layer -->
  <g id="annotations-layer">
    ${annotationsSvg}
  </g>

  <!-- Blueprint Title Block -->
  <g id="title-block" transform="translate(20, ${svgH - 90})">
    <rect width="320" height="70" fill="#0f172a" stroke="#334155" stroke-width="1" rx="4" />
    <text x="15" y="25" fill="#f8fafc" font-size="14" font-weight="700" font-family="'Segoe UI', Roboto, sans-serif">${projectName}</text>
    <text x="15" y="44" fill="#94a3b8" font-size="11" font-family="'Segoe UI', Roboto, sans-serif">Total Area: ${formatArea(footprint.area, unit)} | Footprint: ${footprint.width}m × ${footprint.depth}m</text>
    <text x="15" y="60" fill="#38bdf8" font-size="10" font-family="monospace">ARCHICRAFT 3D ARCHITECTURAL BLUEPRINT</text>
  </g>

  <!-- North Arrow -->
  <g id="north-arrow" transform="translate(${svgW - 60}, 60)">
    <circle cx="0" cy="0" r="22" fill="#0f172a" stroke="#334155" stroke-width="1.5" />
    <polygon points="0,-16 6,6 0,2 -6,6" fill="#38bdf8" />
    <text x="0" y="-19" fill="#38bdf8" font-size="11" font-weight="bold" font-family="sans-serif" text-anchor="middle">N</text>
  </g>
</svg>`;
};
