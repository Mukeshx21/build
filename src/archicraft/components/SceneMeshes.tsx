import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import {
  WallObject,
  FloorSlabObject,
  RoofObject,
  StairObject,
  ColumnObject,
  FurnitureObject,
  LandscapeObject,
  WallOpening
} from '../types/studio';
import { getMaterialById } from '../data/materials';
import { calculateWallLength, calculateWallAngle } from '../utils/geometry';

interface MeshProps<T> {
  data: T;
  isSelected: boolean;
  isHovered: boolean;
  wireframe?: boolean;
  onSelect: (e: any) => void;
  onPointerOver: (e: any) => void;
  onPointerOut: (e: any) => void;
}

// Convert MaterialDef to Three.js Material with PBR realism
const usePbrMaterial = (materialId: string, wireframe: boolean = false) => {
  const def = getMaterialById(materialId);
  return useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(def.color),
      roughness: Math.max(0.04, def.roughness),
      metalness: def.metalness,
      transparent: def.transparent || false,
      opacity: def.opacity ?? 1.0,
      wireframe: wireframe,
      side: THREE.DoubleSide
    });
  }, [materialId, wireframe, def.color, def.roughness, def.metalness, def.transparent, def.opacity]);
};

// Selection Outline Box
const SelectionHighlight: React.FC<{ size: [number, number, number]; position?: [number, number, number] }> = ({
  size,
  position = [0, 0, 0]
}) => {
  return (
    <group position={position}>
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(...size)]} />
        <lineBasicMaterial color="#19B6D2" linewidth={2} />
      </lineSegments>
    </group>
  );
};

// Custom Triangular Geometry Helper for Gable End Walls
function createTriangularWallGeometry(width: number, height: number, thickness: number) {
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, 0);
  shape.lineTo(width / 2, 0);
  shape.lineTo(0, height);
  shape.closePath();

  const extrudeSettings = {
    steps: 1,
    depth: thickness,
    bevelEnabled: false
  };

  const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geom.center();
  return geom;
}

// Custom Right-Triangular Geometry Helper for Shed Roof Clerestory Walls
function createRightTriangularGeometry(depth: number, height: number, thickness: number) {
  const shape = new THREE.Shape();
  shape.moveTo(-depth / 2, 0);
  shape.lineTo(depth / 2, 0);
  shape.lineTo(-depth / 2, height);
  shape.closePath();

  const extrudeSettings = {
    steps: 1,
    depth: thickness,
    bevelEnabled: false
  };

  const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geom.center();
  return geom;
}

/* ------------------------------------------------------------- */
/* ARCHITECTURAL WALL MESH WITH REAL CUTOUT OPENINGS & REVEALS   */
/* ------------------------------------------------------------- */
export const WallMesh: React.FC<MeshProps<WallObject>> = ({
  data,
  isSelected,
  isHovered,
  wireframe = false,
  onSelect,
  onPointerOver,
  onPointerOut
}) => {
  const length = calculateWallLength(data);
  const angle = calculateWallAngle(data);
  const midX = (data.startX + data.endX) / 2;
  const midZ = (data.startZ + data.endZ) / 2;
  const wallMat = usePbrMaterial(data.materialId, wireframe);
  const glassMat = usePbrMaterial('mat_glass_clear');
  const frameMat = usePbrMaterial('mat_metal_black');
  const woodDoorMat = usePbrMaterial('mat_walnut_wood');
  const stoneMat = usePbrMaterial('mat_stone_travertine');
  const metalSteelMat = usePbrMaterial('mat_metal_steel');

  const openings = data.openings || [];

  return (
    <group
      position={[midX, data.elevation + data.height / 2, midZ]}
      rotation={[0, -angle, 0]}
      onClick={onSelect}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
    >
      {/* 1. Baseboard / Plinth Water-Table Strip along bottom exterior */}
      <mesh position={[0, -data.height / 2 + 0.08, data.thickness / 2 + 0.015]} material={stoneMat}>
        <boxGeometry args={[length + 0.02, 0.16, 0.03]} />
      </mesh>
      <mesh position={[0, -data.height / 2 + 0.08, -data.thickness / 2 - 0.015]} material={stoneMat}>
        <boxGeometry args={[length + 0.02, 0.16, 0.03]} />
      </mesh>

      {/* 2. Top Wall Head Trim */}
      <mesh position={[0, data.height / 2 - 0.04, 0]} material={frameMat}>
        <boxGeometry args={[length, 0.08, data.thickness * 1.02]} />
      </mesh>

      {openings.length === 0 ? (
        // Solid wall segment
        <mesh castShadow receiveShadow material={wallMat}>
          <boxGeometry args={[length, data.height, data.thickness]} />
        </mesh>
      ) : (
        // Wall with openings: sub-segmented lintels, sills, and jambs
        <group>
          {openings.map((op, idx) => {
            const opCenterX = (op.positionRatio - 0.5) * length;

            // Sub-segments: Lintel, Sill, and 3D Framing
            return (
              <group key={op.id || idx}>
                {/* Lintel section above opening */}
                {data.height - (op.elevation + op.height) > 0.05 && (
                  <group>
                    <mesh
                      position={[
                        opCenterX,
                        op.elevation + op.height + (data.height - (op.elevation + op.height)) / 2 - data.height / 2,
                        0
                      ]}
                      castShadow
                      receiveShadow
                      material={wallMat}
                    >
                      <boxGeometry
                        args={[op.width, data.height - (op.elevation + op.height), data.thickness]}
                      />
                    </mesh>
                    {/* Architectural Lintel Head Reveal */}
                    <mesh
                      position={[
                        opCenterX,
                        op.elevation + op.height - data.height / 2 + 0.04,
                        0
                      ]}
                      material={frameMat}
                    >
                      <boxGeometry args={[op.width + 0.08, 0.08, data.thickness * 1.06]} />
                    </mesh>
                  </group>
                )}

                {/* Sill section below opening for windows */}
                {op.elevation > 0.05 && (
                  <group>
                    <mesh
                      position={[opCenterX, op.elevation / 2 - data.height / 2, 0]}
                      castShadow
                      receiveShadow
                      material={wallMat}
                    >
                      <boxGeometry args={[op.width, op.elevation, data.thickness]} />
                    </mesh>
                    {/* Outward Projecting Architectural Stone Window Sill */}
                    <mesh
                      position={[
                        opCenterX,
                        op.elevation - data.height / 2 - 0.03,
                        0
                      ]}
                      material={stoneMat}
                    >
                      <boxGeometry args={[op.width + 0.14, 0.06, data.thickness + 0.12]} />
                    </mesh>
                  </group>
                )}

                {/* Realistic Door / Window 3D Frame & Inserts */}
                <group position={[opCenterX, op.elevation + op.height / 2 - data.height / 2, 0]}>
                  {/* Outer Structural Aluminum Frame */}
                  <mesh material={frameMat}>
                    <boxGeometry args={[op.width, op.height, data.thickness * 1.05]} />
                  </mesh>

                  {op.type === 'window' ? (
                    // Realistic Glazed Window with Mullions
                    <group>
                      {/* Glass Panes */}
                      <mesh material={glassMat}>
                        <boxGeometry args={[op.width - 0.09, op.height - 0.09, 0.03]} />
                      </mesh>
                      {/* Vertical Center Mullion */}
                      {op.width > 1.2 && (
                        <mesh position={[0, 0, 0]} material={frameMat}>
                          <boxGeometry args={[0.045, op.height - 0.09, 0.05]} />
                        </mesh>
                      )}
                      {/* Horizontal Transom Bar */}
                      {op.height > 1.6 && (
                        <mesh position={[0, op.height * 0.2, 0]} material={frameMat}>
                          <boxGeometry args={[op.width - 0.09, 0.045, 0.05]} />
                        </mesh>
                      )}
                    </group>
                  ) : op.subType === 'sliding' ? (
                    // Luxury Floor-to-Ceiling Sliding Patio Doors
                    <group>
                      {/* Left sliding glass panel */}
                      <group position={[-op.width / 4, 0, 0.025]}>
                        <mesh material={frameMat}>
                          <boxGeometry args={[op.width / 2, op.height - 0.06, 0.04]} />
                        </mesh>
                        <mesh material={glassMat}>
                          <boxGeometry args={[op.width / 2 - 0.08, op.height - 0.14, 0.02]} />
                        </mesh>
                        {/* Vertical Slimline Pull Bar */}
                        <mesh position={[op.width / 4 - 0.08, 0, 0.035]} material={metalSteelMat}>
                          <boxGeometry args={[0.025, 0.7, 0.03]} />
                        </mesh>
                      </group>

                      {/* Right sliding glass panel */}
                      <group position={[op.width / 4, 0, -0.025]}>
                        <mesh material={frameMat}>
                          <boxGeometry args={[op.width / 2, op.height - 0.06, 0.04]} />
                        </mesh>
                        <mesh material={glassMat}>
                          <boxGeometry args={[op.width / 2 - 0.08, op.height - 0.14, 0.02]} />
                        </mesh>
                      </group>

                      {/* Floor Guide Track */}
                      <mesh position={[0, -op.height / 2 + 0.02, 0]} material={frameMat}>
                        <boxGeometry args={[op.width, 0.04, data.thickness * 1.1]} />
                      </mesh>
                    </group>
                  ) : op.subType === 'arch' ? (
                    // Clean Open Archway
                    null
                  ) : (
                    // Solid Timber / Grand Double Entry Door
                    <group>
                      {/* Door Leaf */}
                      <mesh material={woodDoorMat} castShadow>
                        <boxGeometry args={[op.width - 0.08, op.height - 0.08, 0.06]} />
                      </mesh>
                      {/* Modern Stainless Architectural Handle Bar */}
                      <mesh position={[op.width / 2 - 0.18, 0, 0.05]} material={metalSteelMat}>
                        <boxGeometry args={[0.035, 0.85, 0.04]} />
                      </mesh>
                      <mesh position={[op.width / 2 - 0.18, 0, -0.05]} material={metalSteelMat}>
                        <boxGeometry args={[0.035, 0.85, 0.04]} />
                      </mesh>
                      {/* Door Base Threshold Plate */}
                      <mesh position={[0, -op.height / 2 + 0.02, 0]} material={frameMat}>
                        <boxGeometry args={[op.width, 0.04, data.thickness * 1.1]} />
                      </mesh>
                    </group>
                  )}
                </group>
              </group>
            );
          })}

          {/* Left-most wall segment */}
          <mesh
            position={[
              -length / 2 + (length * (openings[0]?.positionRatio || 0.5) - (openings[0]?.width || 1) / 2) / 2,
              0,
              0
            ]}
            castShadow
            receiveShadow
            material={wallMat}
          >
            <boxGeometry
              args={[
                Math.max(
                  0.1,
                  length * (openings[0]?.positionRatio || 0.5) - (openings[0]?.width || 1) / 2
                ),
                data.height,
                data.thickness
              ]}
            />
          </mesh>

          {/* Right-most wall segment */}
          <mesh
            position={[
              length / 2 -
                (length - (length * (openings[openings.length - 1]?.positionRatio || 0.5) + (openings[openings.length - 1]?.width || 1) / 2)) /
                  2,
              0,
              0
            ]}
            castShadow
            receiveShadow
            material={wallMat}
          >
            <boxGeometry
              args={[
                Math.max(
                  0.1,
                  length -
                    (length * (openings[openings.length - 1]?.positionRatio || 0.5) +
                      (openings[openings.length - 1]?.width || 1) / 2)
                ),
                data.height,
                data.thickness
              ]}
            />
          </mesh>
        </group>
      )}

      {/* Highlight Box when selected */}
      {(isSelected || isHovered) && (
        <SelectionHighlight
          size={[length + 0.08, data.height + 0.08, data.thickness + 0.08]}
        />
      )}
    </group>
  );
};

/* ------------------------------------------------------------- */
/* ARCHITECTURAL FLOOR SLAB MESH WITH PLINTH & FINISHED EDGES   */
/* ------------------------------------------------------------- */
export const FloorSlabMesh: React.FC<MeshProps<FloorSlabObject>> = ({
  data,
  isSelected,
  isHovered,
  wireframe = false,
  onSelect,
  onPointerOver,
  onPointerOut
}) => {
  const slabMat = usePbrMaterial(data.materialId, wireframe);
  const concreteMat = usePbrMaterial('mat_concrete_raw', wireframe);
  const trimMat = usePbrMaterial('mat_metal_black', wireframe);

  const isGroundLevel = (data.floorLevel || 0) === 0;

  return (
    <group
      position={[data.x, data.elevation - data.thickness / 2, data.z]}
      onClick={onSelect}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
    >
      {/* 1. Main Floor Slab Surface */}
      <mesh castShadow receiveShadow material={slabMat}>
        <boxGeometry args={[data.width, data.thickness, data.depth]} />
      </mesh>

      {/* 2. Finished Perimeter Edge Trim Band */}
      <mesh position={[0, 0, data.depth / 2 + 0.01]} material={trimMat}>
        <boxGeometry args={[data.width + 0.02, data.thickness * 1.02, 0.02]} />
      </mesh>
      <mesh position={[0, 0, -data.depth / 2 - 0.01]} material={trimMat}>
        <boxGeometry args={[data.width + 0.02, data.thickness * 1.02, 0.02]} />
      </mesh>
      <mesh position={[data.width / 2 + 0.01, 0, 0]} material={trimMat}>
        <boxGeometry args={[0.02, data.thickness * 1.02, data.depth + 0.02]} />
      </mesh>
      <mesh position={[-data.width / 2 - 0.01, 0, 0]} material={trimMat}>
        <boxGeometry args={[0.02, data.thickness * 1.02, data.depth + 0.02]} />
      </mesh>

      {/* 3. Ground Level Foundation Plinth Skirt */}
      {isGroundLevel && (
        <mesh position={[0, -data.thickness * 0.8, 0]} receiveShadow material={concreteMat}>
          <boxGeometry args={[data.width + 0.16, 0.25, data.depth + 0.16]} />
        </mesh>
      )}

      {(isSelected || isHovered) && (
        <SelectionHighlight
          size={[data.width + 0.08, data.thickness + 0.08, data.depth + 0.08]}
        />
      )}
    </group>
  );
};

/* ------------------------------------------------------------- */
/* ADVANCED ARCHITECTURAL ROOF SYSTEM (Gable, Hip, Flat, Shed)  */
/* ------------------------------------------------------------- */
export const RoofMesh: React.FC<MeshProps<RoofObject>> = ({
  data,
  isSelected,
  isHovered,
  wireframe = false,
  onSelect,
  onPointerOver,
  onPointerOut
}) => {
  const roofMat = usePbrMaterial(data.materialId, wireframe);
  const fasciaMat = usePbrMaterial('mat_metal_black', wireframe);
  const wallMat = usePbrMaterial('mat_white_plaster', wireframe);
  const metalSteelMat = usePbrMaterial('mat_metal_steel', wireframe);

  const width = Math.max(2, data.width + (data.overhang || 0.6) * 2);
  const depth = Math.max(2, data.depth + (data.overhang || 0.6) * 2);
  const height = Math.max(0.6, data.height || 2.2);

  // Gable calculations
  const halfW = width / 2;
  const slopeLen = Math.sqrt(halfW * halfW + height * height);
  const slopeAngle = Math.atan2(height, halfW);

  // Memoized triangular gable geometry for closed pediment walls
  const gableWallGeom = useMemo(() => {
    return createTriangularWallGeometry(data.width, height, 0.22);
  }, [data.width, height]);

  // Memoized right-triangle geometry for shed roof side walls
  const shedWallGeom = useMemo(() => {
    return createRightTriangularGeometry(data.depth, height, 0.22);
  }, [data.depth, height]);

  return (
    <group
      position={[data.x, data.y, data.z]}
      rotation={[0, data.rotationY || 0, 0]}
      onClick={onSelect}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
    >
      {data.roofType === 'flat' ? (
        /* ================= 1. MODERN FLAT ROOF WITH PARAPET & COPING ================= */
        <group>
          {/* Main Cantilever Roof Slab */}
          <mesh position={[0, -0.15, 0]} castShadow receiveShadow material={roofMat}>
            <boxGeometry args={[width, 0.3, depth]} />
          </mesh>

          {/* Underside Recessed Soffit Reveal */}
          <mesh position={[0, -0.32, 0]} material={fasciaMat}>
            <boxGeometry args={[width - 0.3, 0.04, depth - 0.3]} />
          </mesh>

          {/* Perimeter Parapet Walls */}
          <group position={[0, 0.22, 0]}>
            {/* North Parapet */}
            <mesh position={[0, 0, -depth / 2 + 0.1]} castShadow receiveShadow material={wallMat}>
              <boxGeometry args={[width, 0.45, 0.2]} />
            </mesh>
            {/* South Parapet */}
            <mesh position={[0, 0, depth / 2 - 0.1]} castShadow receiveShadow material={wallMat}>
              <boxGeometry args={[width, 0.45, 0.2]} />
            </mesh>
            {/* West Parapet */}
            <mesh position={[-width / 2 + 0.1, 0, 0]} castShadow receiveShadow material={wallMat}>
              <boxGeometry args={[0.2, 0.45, depth - 0.4]} />
            </mesh>
            {/* East Parapet */}
            <mesh position={[width / 2 - 0.1, 0, 0]} castShadow receiveShadow material={wallMat}>
              <boxGeometry args={[0.2, 0.45, depth - 0.4]} />
            </mesh>

            {/* Aluminum Coping Caps on Parapets */}
            <mesh position={[0, 0.24, -depth / 2 + 0.1]} material={fasciaMat}>
              <boxGeometry args={[width + 0.04, 0.04, 0.26]} />
            </mesh>
            <mesh position={[0, 0.24, depth / 2 - 0.1]} material={fasciaMat}>
              <boxGeometry args={[width + 0.04, 0.04, 0.26]} />
            </mesh>
            <mesh position={[-width / 2 + 0.1, 0.24, 0]} material={fasciaMat}>
              <boxGeometry args={[0.26, 0.04, depth - 0.36]} />
            </mesh>
            <mesh position={[width / 2 - 0.1, 0.24, 0]} material={fasciaMat}>
              <boxGeometry args={[0.26, 0.04, depth - 0.36]} />
            </mesh>
          </group>

          {/* Perimeter Fascia Edge Board */}
          <mesh position={[0, -0.15, depth / 2 + 0.02]} material={fasciaMat}>
            <boxGeometry args={[width + 0.04, 0.32, 0.04]} />
          </mesh>
          <mesh position={[0, -0.15, -depth / 2 - 0.02]} material={fasciaMat}>
            <boxGeometry args={[width + 0.04, 0.32, 0.04]} />
          </mesh>
          <mesh position={[width / 2 + 0.02, -0.15, 0]} material={fasciaMat}>
            <boxGeometry args={[0.04, 0.32, depth + 0.04]} />
          </mesh>
          <mesh position={[-width / 2 - 0.02, -0.15, 0]} material={fasciaMat}>
            <boxGeometry args={[0.04, 0.32, depth + 0.04]} />
          </mesh>
        </group>
      ) : data.roofType === 'gable' ? (
        /* ================= 2. CLASSIC ARCHITECTURAL GABLE ROOF ================= */
        <group>
          {/* Left Pitch Sloped Pane */}
          <group position={[-halfW / 2, height / 2, 0]} rotation={[0, 0, slopeAngle]}>
            <mesh castShadow receiveShadow material={roofMat}>
              <boxGeometry args={[slopeLen, 0.18, depth]} />
            </mesh>
            {/* Lower Eave Fascia Board */}
            <mesh position={[-slopeLen / 2 + 0.04, -0.05, 0]} material={fasciaMat}>
              <boxGeometry args={[0.08, 0.22, depth + 0.04]} />
            </mesh>
            {/* Lower Eave Gutter Channel */}
            <mesh position={[-slopeLen / 2 - 0.04, -0.06, 0]} material={metalSteelMat}>
              <boxGeometry args={[0.07, 0.1, depth + 0.04]} />
            </mesh>
          </group>

          {/* Right Pitch Sloped Pane */}
          <group position={[halfW / 2, height / 2, 0]} rotation={[0, 0, -slopeAngle]}>
            <mesh castShadow receiveShadow material={roofMat}>
              <boxGeometry args={[slopeLen, 0.18, depth]} />
            </mesh>
            {/* Lower Eave Fascia Board */}
            <mesh position={[slopeLen / 2 - 0.04, -0.05, 0]} material={fasciaMat}>
              <boxGeometry args={[0.08, 0.22, depth + 0.04]} />
            </mesh>
            {/* Lower Eave Gutter Channel */}
            <mesh position={[slopeLen / 2 + 0.04, -0.06, 0]} material={metalSteelMat}>
              <boxGeometry args={[0.07, 0.1, depth + 0.04]} />
            </mesh>
          </group>

          {/* Top Ridge Cap Trim */}
          <mesh position={[0, height + 0.06, 0]} material={fasciaMat}>
            <boxGeometry args={[0.26, 0.1, depth + 0.06]} />
          </mesh>

          {/* Front Closed Gable End Wall (Pediment) */}
          <mesh
            geometry={gableWallGeom}
            position={[0, height / 2, -data.depth / 2]}
            castShadow
            receiveShadow
            material={wallMat}
          />

          {/* Rear Closed Gable End Wall (Pediment) */}
          <mesh
            geometry={gableWallGeom}
            position={[0, height / 2, data.depth / 2]}
            castShadow
            receiveShadow
            material={wallMat}
          />
        </group>
      ) : data.roofType === 'hip' ? (
        /* ================= 3. FOUR-SIDED HIP ROOF WITH CLEAN RIDGES ================= */
        <group>
          {/* Main 4-Sided Pyramid Roof Pitch */}
          <mesh position={[0, height / 2, 0]} castShadow receiveShadow material={roofMat}>
            <coneGeometry args={[Math.max(width, depth) * 0.707, height, 4]} />
          </mesh>

          {/* Perimeter Eaves Fascia Board */}
          <mesh position={[0, 0.08, depth / 2]} material={fasciaMat}>
            <boxGeometry args={[width + 0.04, 0.18, 0.05]} />
          </mesh>
          <mesh position={[0, 0.08, -depth / 2]} material={fasciaMat}>
            <boxGeometry args={[width + 0.04, 0.18, 0.05]} />
          </mesh>
          <mesh position={[width / 2, 0.08, 0]} material={fasciaMat}>
            <boxGeometry args={[0.05, 0.18, depth + 0.04]} />
          </mesh>
          <mesh position={[-width / 2, 0.08, 0]} material={fasciaMat}>
            <boxGeometry args={[0.05, 0.18, depth + 0.04]} />
          </mesh>

          {/* Top Apex Architectural Cap */}
          <mesh position={[0, height + 0.08, 0]} material={fasciaMat}>
            <boxGeometry args={[0.5, 0.14, 0.5]} />
          </mesh>
        </group>
      ) : (
        /* ================= 4. MONOPITCH SHED / SKILLION ROOF ================= */
        <group>
          {/* Sloped Roof Plane */}
          <group position={[0, height / 2, 0]} rotation={[Math.atan2(height, depth), 0, 0]}>
            <mesh castShadow receiveShadow material={roofMat}>
              <boxGeometry args={[width, 0.2, Math.sqrt(depth * depth + height * height)]} />
            </mesh>
            {/* Standing Seam Metal Ribs running down the pitch */}
            {[-width / 3, 0, width / 3].map((rx, idx) => (
              <mesh key={idx} position={[rx, 0.12, 0]} material={fasciaMat}>
                <boxGeometry args={[0.04, 0.05, Math.sqrt(depth * depth + height * height)]} />
              </mesh>
            ))}
            {/* Top High Fascia & Bottom Low Gutter */}
            <mesh position={[0, 0, -Math.sqrt(depth * depth + height * height) / 2]} material={fasciaMat}>
              <boxGeometry args={[width + 0.04, 0.24, 0.05]} />
            </mesh>
            <mesh position={[0, 0, Math.sqrt(depth * depth + height * height) / 2]} material={metalSteelMat}>
              <boxGeometry args={[width + 0.04, 0.12, 0.06]} />
            </mesh>
          </group>

          {/* Left Clerestory Triangular Fill Wall */}
          <mesh
            geometry={shedWallGeom}
            position={[-data.width / 2, height / 2, 0]}
            rotation={[0, -Math.PI / 2, 0]}
            castShadow
            receiveShadow
            material={wallMat}
          />

          {/* Right Clerestory Triangular Fill Wall */}
          <mesh
            geometry={shedWallGeom}
            position={[data.width / 2, height / 2, 0]}
            rotation={[0, Math.PI / 2, 0]}
            castShadow
            receiveShadow
            material={wallMat}
          />
        </group>
      )}

      {(isSelected || isHovered) && (
        <SelectionHighlight size={[width + 0.2, height + 0.2, depth + 0.2]} />
      )}
    </group>
  );
};

/* ------------------------------------------------------------- */
/* STAIRCASE MESH WITH GLASS BALUSTRADE & RISER REVEALS          */
/* ------------------------------------------------------------- */
export const StairMesh: React.FC<MeshProps<StairObject>> = ({
  data,
  isSelected,
  isHovered,
  wireframe = false,
  onSelect,
  onPointerOver,
  onPointerOut
}) => {
  const treadMat = usePbrMaterial(data.materialId || 'mat_hardwood_oak', wireframe);
  const railMat = usePbrMaterial('mat_glass_clear');
  const postMat = usePbrMaterial('mat_metal_black');
  const steelMat = usePbrMaterial('mat_metal_steel');

  const steps = data.stepsCount || 15;
  const stepHeight = data.height / steps;
  const stepDepth = data.length / steps;
  const stairHypot = Math.sqrt(data.height * data.height + data.length * data.length);
  const stairAngle = Math.atan2(data.height, data.length);

  return (
    <group
      position={[data.x, data.y, data.z]}
      rotation={[0, data.rotationY || 0, 0]}
      onClick={onSelect}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
    >
      {/* Structural Central Steel Spine Beam running underneath */}
      <mesh
        position={[0, data.height / 2 - 0.25, 0]}
        rotation={[stairAngle, 0, 0]}
        material={postMat}
      >
        <boxGeometry args={[data.width * 0.35, 0.2, stairHypot]} />
      </mesh>

      {/* Floating Cantilever Wooden Treads */}
      {Array.from({ length: steps }).map((_, i) => (
        <group key={i} position={[0, i * stepHeight + stepHeight / 2, -data.length / 2 + i * stepDepth + stepDepth / 2]}>
          {/* Main Timber Tread with Bullnose edge */}
          <mesh castShadow receiveShadow material={treadMat}>
            <boxGeometry args={[data.width, 0.05, stepDepth * 1.1]} />
          </mesh>
          {/* Tread Steel Mounting Bracket */}
          <mesh position={[0, -0.04, 0]} material={postMat}>
            <boxGeometry args={[data.width * 0.4, 0.03, stepDepth * 0.7]} />
          </mesh>
        </group>
      ))}

      {/* Tempered Glass Balustrades & Handrail */}
      {data.railing && (
        <group>
          {/* Left Glass Panel */}
          <mesh
            position={[data.width / 2, data.height / 2 + 0.35, 0]}
            rotation={[stairAngle, 0, 0]}
            material={railMat}
          >
            <boxGeometry args={[0.03, 0.85, stairHypot]} />
          </mesh>
          {/* Left Top Stainless Handrail */}
          <mesh
            position={[data.width / 2, data.height / 2 + 0.8, 0]}
            rotation={[stairAngle, 0, 0]}
            material={steelMat}
          >
            <boxGeometry args={[0.06, 0.04, stairHypot]} />
          </mesh>

          {/* Right Glass Panel */}
          <mesh
            position={[-data.width / 2, data.height / 2 + 0.35, 0]}
            rotation={[stairAngle, 0, 0]}
            material={railMat}
          >
            <boxGeometry args={[0.03, 0.85, stairHypot]} />
          </mesh>
          {/* Right Top Stainless Handrail */}
          <mesh
            position={[-data.width / 2, data.height / 2 + 0.8, 0]}
            rotation={[stairAngle, 0, 0]}
            material={steelMat}
          >
            <boxGeometry args={[0.06, 0.04, stairHypot]} />
          </mesh>
        </group>
      )}

      {(isSelected || isHovered) && (
        <SelectionHighlight size={[data.width + 0.1, data.height + 0.1, data.length + 0.1]} />
      )}
    </group>
  );
};

/* ------------------------------------------------------------- */
/* COLUMN MESH WITH CAPITALS & BASE REVEALS                      */
/* ------------------------------------------------------------- */
export const ColumnMesh: React.FC<MeshProps<ColumnObject>> = ({
  data,
  isSelected,
  isHovered,
  wireframe = false,
  onSelect,
  onPointerOver,
  onPointerOut
}) => {
  const colMat = usePbrMaterial(data.materialId, wireframe);
  const trimMat = usePbrMaterial('mat_metal_black', wireframe);

  return (
    <group
      position={[data.x, data.y + data.height / 2, data.z]}
      rotation={[0, data.rotationY || 0, 0]}
      onClick={onSelect}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
    >
      {/* Base Reveal */}
      <mesh position={[0, -data.height / 2 + 0.06, 0]} material={trimMat}>
        <boxGeometry args={[data.width * 1.15, 0.12, data.width * 1.15]} />
      </mesh>

      {/* Top Capital Reveal */}
      <mesh position={[0, data.height / 2 - 0.06, 0]} material={trimMat}>
        <boxGeometry args={[data.width * 1.15, 0.12, data.width * 1.15]} />
      </mesh>

      {data.columnType === 'round' ? (
        <mesh castShadow receiveShadow material={colMat}>
          <cylinderGeometry args={[data.width / 2, data.width / 2, data.height - 0.24, 32]} />
        </mesh>
      ) : data.columnType === 'steel-i' ? (
        <group>
          {/* I-beam flanges and web */}
          <mesh material={colMat} position={[0, 0, data.width / 2 - 0.02]}>
            <boxGeometry args={[data.width, data.height - 0.24, 0.04]} />
          </mesh>
          <mesh material={colMat} position={[0, 0, -data.width / 2 + 0.02]}>
            <boxGeometry args={[data.width, data.height - 0.24, 0.04]} />
          </mesh>
          <mesh material={colMat} position={[0, 0, 0]}>
            <boxGeometry args={[0.04, data.height - 0.24, data.width - 0.04]} />
          </mesh>
        </group>
      ) : (
        <mesh castShadow receiveShadow material={colMat}>
          <boxGeometry args={[data.width, data.height - 0.24, data.width]} />
        </mesh>
      )}

      {(isSelected || isHovered) && (
        <SelectionHighlight size={[data.width + 0.08, data.height + 0.08, data.width + 0.08]} />
      )}
    </group>
  );
};

/* ------------------------------------------------------------- */
/* HIGH-FIDELITY FURNITURE MESHES                                */
/* ------------------------------------------------------------- */
export const FurnitureMesh: React.FC<MeshProps<FurnitureObject>> = ({
  data,
  isSelected,
  isHovered,
  wireframe = false,
  onSelect,
  onPointerOver,
  onPointerOut
}) => {
  const mainMat = usePbrMaterial(data.materialId, wireframe);
  const whiteMat = usePbrMaterial('mat_white_plaster');
  const woodMat = usePbrMaterial('mat_walnut_wood');
  const darkMetalMat = usePbrMaterial('mat_metal_black');
  const marbleMat = usePbrMaterial('mat_marble_carrara');
  const chromeMat = usePbrMaterial('mat_metal_steel');

  const { modelType, width, height, depth } = data;

  return (
    <group
      position={[data.x, data.y, data.z]}
      rotation={[data.rotationX || 0, data.rotationY || 0, data.rotationZ || 0]}
      scale={[data.scaleX || 1, data.scaleY || 1, data.scaleZ || 1]}
      onClick={onSelect}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
    >
      {/* 1. SOFA MODERN / SECTIONAL */}
      {modelType.includes('sofa') ? (
        <group position={[0, height / 2, 0]}>
          {/* Base cushion */}
          <mesh position={[0, -height / 4, 0]} castShadow receiveShadow material={mainMat}>
            <boxGeometry args={[width, height / 2.5, depth]} />
          </mesh>
          {/* Backrest */}
          <mesh position={[0, height / 4, -depth / 2 + 0.15]} castShadow receiveShadow material={mainMat}>
            <boxGeometry args={[width, height / 1.6, 0.3]} />
          </mesh>
          {/* Armrests */}
          <mesh position={[-width / 2 + 0.12, 0, 0]} castShadow receiveShadow material={mainMat}>
            <boxGeometry args={[0.24, height / 1.4, depth]} />
          </mesh>
          <mesh position={[width / 2 - 0.12, 0, 0]} castShadow receiveShadow material={mainMat}>
            <boxGeometry args={[0.24, height / 1.4, depth]} />
          </mesh>
          {/* Tapered Wood Legs */}
          {[-width / 2 + 0.15, width / 2 - 0.15].map((lx, i) =>
            [-depth / 2 + 0.15, depth / 2 - 0.15].map((lz, j) => (
              <mesh key={`${i}-${j}`} position={[lx, -height / 2 + 0.05, lz]} material={woodMat}>
                <cylinderGeometry args={[0.03, 0.02, 0.1, 12]} />
              </mesh>
            ))
          )}
          {/* Sectional Return */}
          {modelType.includes('sectional') && (
            <mesh position={[-width / 2 + 0.8, -height / 4, depth / 2 + 0.4]} material={mainMat}>
              <boxGeometry args={[0.9, height / 2.5, 1.2]} />
            </mesh>
          )}
        </group>
      ) : modelType.includes('bed') ? (
        /* 2. KING BED */
        <group position={[0, height / 2, 0]}>
          {/* Wooden Platform Plinth */}
          <mesh position={[0, -height / 3, 0]} castShadow receiveShadow material={woodMat}>
            <boxGeometry args={[width + 0.1, 0.25, depth + 0.1]} />
          </mesh>
          {/* Mattress */}
          <mesh position={[0, -height / 10, 0.08]} castShadow receiveShadow material={whiteMat}>
            <boxGeometry args={[width * 0.95, 0.32, depth * 0.88]} />
          </mesh>
          {/* Duvet / Coverlet */}
          <mesh position={[0, -height / 10 + 0.03, 0.3]} material={mainMat}>
            <boxGeometry args={[width * 0.96, 0.33, depth * 0.55]} />
          </mesh>
          {/* Padded Headboard */}
          <mesh position={[0, height / 3, -depth / 2 + 0.08]} castShadow receiveShadow material={mainMat}>
            <boxGeometry args={[width + 0.14, height * 0.8, 0.16]} />
          </mesh>
          {/* Plush Pillows */}
          <mesh position={[-width / 4, 0.16, -depth / 3]} material={whiteMat}>
            <boxGeometry args={[0.7, 0.18, 0.45]} />
          </mesh>
          <mesh position={[width / 4, 0.16, -depth / 3]} material={whiteMat}>
            <boxGeometry args={[0.7, 0.18, 0.45]} />
          </mesh>
        </group>
      ) : modelType.includes('coffee_table') ? (
        /* 3. COFFEE TABLE */
        <group position={[0, height / 2, 0]}>
          <mesh position={[0, height / 2 - 0.04, 0]} castShadow receiveShadow material={marbleMat}>
            <boxGeometry args={[width, 0.08, depth]} />
          </mesh>
          {/* Dark Metal Legs */}
          <mesh position={[-width / 2 + 0.08, -0.04, -depth / 2 + 0.08]} material={darkMetalMat}>
            <boxGeometry args={[0.04, height - 0.08, 0.04]} />
          </mesh>
          <mesh position={[width / 2 - 0.08, -0.04, -depth / 2 + 0.08]} material={darkMetalMat}>
            <boxGeometry args={[0.04, height - 0.08, 0.04]} />
          </mesh>
          <mesh position={[-width / 2 + 0.08, -0.04, depth / 2 - 0.08]} material={darkMetalMat}>
            <boxGeometry args={[0.04, height - 0.08, 0.04]} />
          </mesh>
          <mesh position={[width / 2 - 0.08, -0.04, depth / 2 - 0.08]} material={darkMetalMat}>
            <boxGeometry args={[0.04, height - 0.08, 0.04]} />
          </mesh>
        </group>
      ) : modelType.includes('dining') ? (
        /* 4. DINING TABLE */
        <group position={[0, height / 2, 0]}>
          <mesh position={[0, height / 2 - 0.03, 0]} castShadow receiveShadow material={mainMat}>
            <boxGeometry args={[width, 0.06, depth]} />
          </mesh>
          {/* Table Legs */}
          <mesh position={[-width / 2 + 0.1, -0.03, -depth / 2 + 0.1]} material={mainMat}>
            <boxGeometry args={[0.08, height - 0.06, 0.08]} />
          </mesh>
          <mesh position={[width / 2 - 0.1, -0.03, -depth / 2 + 0.1]} material={mainMat}>
            <boxGeometry args={[0.08, height - 0.06, 0.08]} />
          </mesh>
          <mesh position={[-width / 2 + 0.1, -0.03, depth / 2 - 0.1]} material={mainMat}>
            <boxGeometry args={[0.08, height - 0.06, 0.08]} />
          </mesh>
          <mesh position={[width / 2 - 0.1, -0.03, depth / 2 - 0.1]} material={mainMat}>
            <boxGeometry args={[0.08, height - 0.06, 0.08]} />
          </mesh>
        </group>
      ) : modelType.includes('kitchen_island') ? (
        /* 5. WATERFALL KITCHEN ISLAND */
        <group position={[0, height / 2, 0]}>
          {/* Waterfall Marble Outer Wrap */}
          <mesh castShadow receiveShadow material={marbleMat}>
            <boxGeometry args={[width, height, depth]} />
          </mesh>
          {/* Undermount Sink Insert */}
          <mesh position={[width / 4, height / 2 + 0.015, 0]} material={chromeMat}>
            <boxGeometry args={[0.7, 0.03, 0.45]} />
          </mesh>
          {/* Gooseneck Faucet */}
          <mesh position={[width / 4, height / 2 + 0.15, -0.2]} material={chromeMat}>
            <cylinderGeometry args={[0.02, 0.02, 0.3, 12]} />
          </mesh>
        </group>
      ) : modelType.includes('desk') ? (
        /* 6. OFFICE WORKSTATION */
        <group position={[0, height / 2, 0]}>
          <mesh position={[0, height / 2 - 0.03, 0]} castShadow receiveShadow material={woodMat}>
            <boxGeometry args={[width, 0.06, depth]} />
          </mesh>
          <mesh position={[-width / 2 + 0.05, 0, 0]} material={darkMetalMat}>
            <boxGeometry args={[0.08, height, depth - 0.1]} />
          </mesh>
          <mesh position={[width / 2 - 0.05, 0, 0]} material={darkMetalMat}>
            <boxGeometry args={[0.08, height, depth - 0.1]} />
          </mesh>
          {/* Monitor Screen & Base */}
          <mesh position={[0, height / 2 + 0.25, -depth / 4]} material={darkMetalMat}>
            <boxGeometry args={[0.7, 0.4, 0.04]} />
          </mesh>
        </group>
      ) : (
        /* GENERIC CABINET / CONSOLE / FIXTURE */
        <mesh position={[0, height / 2, 0]} castShadow receiveShadow material={mainMat}>
          <boxGeometry args={[width, height, depth]} />
        </mesh>
      )}

      {(isSelected || isHovered) && (
        <SelectionHighlight
          position={[0, height / 2, 0]}
          size={[width + 0.1, height + 0.1, depth + 0.1]}
        />
      )}
    </group>
  );
};

/* ------------------------------------------------------------- */
/* LANDSCAPE MESHES WITH POOL DECK COPING & FOLIAGE              */
/* ------------------------------------------------------------- */
export const LandscapeMesh: React.FC<MeshProps<LandscapeObject>> = ({
  data,
  isSelected,
  isHovered,
  wireframe = false,
  onSelect,
  onPointerOver,
  onPointerOut
}) => {
  const foliageMat = usePbrMaterial('mat_grass_lawn', wireframe);
  const trunkMat = usePbrMaterial('mat_walnut_wood', wireframe);
  const poolWaterMat = usePbrMaterial('mat_water_pool', wireframe);
  const stoneMat = usePbrMaterial('mat_patio_pavers', wireframe);
  const tileMat = usePbrMaterial('mat_tile_grey', wireframe);

  const { modelType, scale = 1, width = 6, depth = 3 } = data;

  return (
    <group
      position={[data.x, data.y, data.z]}
      rotation={[0, data.rotationY || 0, 0]}
      scale={[scale, scale, scale]}
      onClick={onSelect}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
    >
      {modelType === 'tree_oak' ? (
        <group>
          {/* Realistic Tapered Trunk */}
          <mesh position={[0, 1.5, 0]} castShadow material={trunkMat}>
            <cylinderGeometry args={[0.22, 0.35, 3.0, 16]} />
          </mesh>
          {/* Clustered Foliage Volumes */}
          <mesh position={[0, 3.5, 0]} castShadow material={foliageMat}>
            <sphereGeometry args={[1.65, 20, 20]} />
          </mesh>
          <mesh position={[0.7, 3.8, 0.5]} castShadow material={foliageMat}>
            <sphereGeometry args={[1.25, 16, 16]} />
          </mesh>
          <mesh position={[-0.6, 4.0, -0.4]} castShadow material={foliageMat}>
            <sphereGeometry args={[1.35, 16, 16]} />
          </mesh>
        </group>
      ) : modelType === 'tree_pine' ? (
        <group>
          {/* Slender Italian Cypress Trunk */}
          <mesh position={[0, 0.8, 0]} castShadow material={trunkMat}>
            <cylinderGeometry args={[0.15, 0.22, 1.6, 14]} />
          </mesh>
          {/* Layered Conic Foliage */}
          <mesh position={[0, 3.2, 0]} castShadow material={foliageMat}>
            <coneGeometry args={[0.75, 4.4, 20]} />
          </mesh>
        </group>
      ) : modelType === 'pool' ? (
        <group>
          {/* Recessed Basin Base */}
          <mesh position={[0, -0.5, 0]} receiveShadow material={tileMat}>
            <boxGeometry args={[width, 1.0, depth]} />
          </mesh>
          {/* Stone Coping Deck Border */}
          <mesh position={[0, 0.08, 0]} receiveShadow material={stoneMat}>
            <boxGeometry args={[width + 0.8, 0.16, depth + 0.8]} />
          </mesh>
          {/* Crystal Clear Swimming Pool Water Plane */}
          <mesh position={[0, 0.04, 0]} material={poolWaterMat}>
            <boxGeometry args={[width, 0.04, depth]} />
          </mesh>
        </group>
      ) : (
        <mesh position={[0, 0.05, 0]} receiveShadow material={stoneMat}>
          <boxGeometry args={[width, 0.1, depth]} />
        </mesh>
      )}

      {(isSelected || isHovered) && (
        <SelectionHighlight size={[width * 0.8 + 0.5, 4.0, depth * 0.8 + 0.5]} />
      )}
    </group>
  );
};
