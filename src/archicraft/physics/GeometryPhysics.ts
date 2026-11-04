// ==========================================================================
// ARCHITECTURAL GEOMETRY & PHYSICAL MASS / VOLUME COMPUTATION
// Calculates exact volumetric displacement, mass (m = rho * V),
// Center of Mass (CoM), and bounding boxes.
// ==========================================================================

import {
  SceneObject,
  WallObject,
  FloorSlabObject,
  RoofObject,
  ColumnObject,
  StairObject,
  FurnitureObject,
  LandscapeObject,
} from "../types/studio"
import { getPhysicalMaterial } from "./MaterialPhysics"
import { PhysicalBoundingBox } from "./types"
import { calculateWallLength } from "../utils/geometry"

export interface ObjectPhysicalCalculations {
  volumeM3: number
  massKg: number
  weightKn: number
  densityKgM3: number
  centerOfMass: [number, number, number]
  boundingBox: PhysicalBoundingBox
  principalInertia: [number, number, number] // [Ixx, Iyy, Izz]
}

/**
 * Calculates exact physical volume, mass, center of mass, and bounding box for any architectural object.
 */
export function calculateObjectPhysics(
  obj: SceneObject,
): ObjectPhysicalCalculations {
  const mat = getPhysicalMaterial(obj.materialId || "mat_concrete_raw")
  const density = mat.density

  let volume = 0.1
  let cx = 0
  let cy = 0
  let cz = 0
  let minX = 0,
    minY = 0,
    minZ = 0
  let maxX = 0,
    maxY = 0,
    maxZ = 0
  let sx = 1,
    sy = 1,
    sz = 1

  switch (obj.type) {
    case "wall": {
      const wall = obj as WallObject
      const length = calculateWallLength(wall)
      const grossVolume = length * wall.height * wall.thickness

      // Deduct cutout door and window openings from mass volume
      let cutoutVolume = 0
      if (wall.openings && wall.openings.length > 0) {
        for (const op of wall.openings) {
          cutoutVolume += op.width * op.height * wall.thickness
        }
      }
      volume = Math.max(0.05, grossVolume - cutoutVolume)

      cx = (wall.startX + wall.endX) / 2
      cy = wall.elevation + wall.height / 2
      cz = (wall.startZ + wall.endZ) / 2

      const halfThick = wall.thickness / 2
      minX = Math.min(wall.startX, wall.endX) - halfThick
      maxX = Math.max(wall.startX, wall.endX) + halfThick
      minY = wall.elevation
      maxY = wall.elevation + wall.height
      minZ = Math.min(wall.startZ, wall.endZ) - halfThick
      maxZ = Math.max(wall.startZ, wall.endZ) + halfThick
      sx = maxX - minX
      sy = maxY - minY
      sz = maxZ - minZ
      break
    }

    case "floor": {
      const slab = obj as FloorSlabObject
      volume = Math.max(0.05, slab.width * slab.depth * slab.thickness)
      cx = slab.x
      cy = slab.elevation - slab.thickness / 2
      cz = slab.z

      minX = slab.x - slab.width / 2
      maxX = slab.x + slab.width / 2
      minY = slab.elevation - slab.thickness
      maxY = slab.elevation
      minZ = slab.z - slab.depth / 2
      maxZ = slab.z + slab.depth / 2
      sx = slab.width
      sy = slab.thickness
      sz = slab.depth
      break
    }

    case "roof": {
      const roof = obj as RoofObject
      const width = roof.width + (roof.overhang || 0.6) * 2
      const depth = roof.depth + (roof.overhang || 0.6) * 2
      const height = roof.height || 2.2
      const thickness = 0.22

      cx = roof.x
      cz = roof.z

      if (roof.roofType === "flat") {
        // Flat roof cantilever slab + parapet
        volume = width * depth * thickness + (width + depth) * 2 * 0.2 * 0.45
        cy = roof.y
        minY = roof.y - thickness
        maxY = roof.y + 0.45
      } else if (roof.roofType === "gable") {
        // Two sloped pitched slabs + triangular gable pediments
        const halfW = width / 2
        const slopeLen = Math.sqrt(halfW * halfW + height * height)
        const pitchVolume = 2 * (slopeLen * depth * thickness)
        const pedimentVolume = 2 * (0.5 * roof.width * height * 0.22)
        volume = pitchVolume + pedimentVolume
        cy = roof.y + height * 0.4
        minY = roof.y
        maxY = roof.y + height + 0.1
      } else if (roof.roofType === "hip") {
        // 4-sided pyramid roof
        const pitchVolume =
          4 *
          (0.5 *
            width *
            Math.sqrt(Math.pow(depth / 2, 2) + height * height) *
            thickness)
        volume = pitchVolume
        cy = roof.y + height * 0.35
        minY = roof.y
        maxY = roof.y + height + 0.1
      } else {
        // Monopitch shed
        const slopeLen = Math.sqrt(depth * depth + height * height)
        volume = width * slopeLen * thickness + 0.5 * depth * height * 0.22 * 2
        cy = roof.y + height * 0.45
        minY = roof.y
        maxY = roof.y + height + 0.1
      }

      minX = roof.x - width / 2
      maxX = roof.x + width / 2
      minZ = roof.z - depth / 2
      maxZ = roof.z + depth / 2
      sx = width
      sy = maxY - minY
      sz = depth
      break
    }

    case "column": {
      const col = obj as ColumnObject
      cx = col.x
      cy = col.y + col.height / 2
      cz = col.z

      if (col.columnType === "round") {
        const radius = col.width / 2
        volume = Math.PI * radius * radius * col.height
      } else if (col.columnType === "steel-i") {
        // I-beam cross section: 2 flanges + web
        const flangeVol = 2 * (col.width * 0.04 * col.height)
        const webVol = (col.width - 0.08) * 0.04 * col.height
        volume = flangeVol + webVol
      } else {
        // Square reinforced concrete column
        volume = col.width * col.width * col.height
      }

      minX = col.x - col.width / 2
      maxX = col.x + col.width / 2
      minY = col.y
      maxY = col.y + col.height
      minZ = col.z - col.width / 2
      maxZ = col.z + col.width / 2
      sx = col.width
      sy = col.height
      sz = col.width
      break
    }

    case "stair": {
      const stair = obj as StairObject
      const steps = stair.stepsCount || 15
      const stepH = stair.height / steps
      const stepD = stair.length / steps
      // Treads + central spine beam
      const treadsVol = steps * (stair.width * 0.05 * stepD * 1.1)
      const spineHypot = Math.sqrt(
        stair.height * stair.height + stair.length * stair.length,
      )
      const spineVol = stair.width * 0.35 * 0.2 * spineHypot
      volume = treadsVol + spineVol

      cx = stair.x
      cy = stair.y + stair.height / 2
      cz = stair.z

      minX = stair.x - stair.width / 2
      maxX = stair.x + stair.width / 2
      minY = stair.y
      maxY = stair.y + stair.height + (stair.railing ? 0.9 : 0)
      minZ = stair.z - stair.length / 2
      maxZ = stair.z + stair.length / 2
      sx = stair.width
      sy = maxY - minY
      sz = stair.length
      break
    }

    case "furniture": {
      const furn = obj as FurnitureObject
      cx = furn.x
      cy = furn.y + furn.height / 2
      cz = furn.z

      // Fill factor: furniture is not a solid block of solid material
      let solidFillFactor = 0.35
      if (furn.modelType.includes("bed")) solidFillFactor = 0.4
      else if (furn.modelType.includes("table")) solidFillFactor = 0.2
      else if (furn.modelType.includes("sofa")) solidFillFactor = 0.5
      else if (furn.modelType.includes("island")) solidFillFactor = 0.7

      volume = Math.max(
        0.02,
        furn.width * furn.height * furn.depth * solidFillFactor,
      )

      minX = furn.x - furn.width / 2
      maxX = furn.x + furn.width / 2
      minY = furn.y
      maxY = furn.y + furn.height
      minZ = furn.z - furn.depth / 2
      maxZ = furn.z + furn.depth / 2
      sx = furn.width
      sy = furn.height
      sz = furn.depth
      break
    }

    case "landscape": {
      const land = obj as LandscapeObject
      cx = land.x
      cy = land.y + 1
      cz = land.z
      const w = land.width || 4
      const d = land.depth || 4

      if (land.modelType === "pool") {
        // Pool basin concrete + water volume
        volume = w * d * 1.2
        minY = land.y - 1.0
        maxY = land.y + 0.2
      } else if (
        land.modelType === "tree_oak" ||
        land.modelType === "tree_pine"
      ) {
        volume = 1.5 * Math.pow(land.scale || 1, 3)
        minY = land.y
        maxY = land.y + 5.0 * (land.scale || 1)
      } else {
        volume = w * d * 0.15
        minY = land.y
        maxY = land.y + 0.2
      }

      minX = land.x - w / 2
      maxX = land.x + w / 2
      minZ = land.z - d / 2
      maxZ = land.z + d / 2
      sx = w
      sy = maxY - minY
      sz = d
      break
    }
  }

  // Calculate Mass m = rho * V
  const massKg = Math.max(0.5, volume * density)
  const weightKn = (massKg * 9.80665) / 1000.0

  // Box moments of inertia (I = 1/12 * m * (dim1^2 + dim2^2))
  const Ixx = (1 / 12) * massKg * (sy * sy + sz * sz)
  const Iyy = (1 / 12) * massKg * (sx * sx + sz * sz)
  const Izz = (1 / 12) * massKg * (sx * sx + sy * sy)

  const boundingBox: PhysicalBoundingBox = {
    min: [minX, minY, minZ],
    max: [maxX, maxY, maxZ],
    center: [cx, cy, cz],
    size: [sx, sy, sz],
    volume: Math.max(0.01, sx * sy * sz),
  }

  return {
    volumeM3: Math.round(volume * 1000) / 1000,
    massKg: Math.round(massKg * 10) / 10,
    weightKn: Math.round(weightKn * 100) / 100,
    densityKgM3: density,
    centerOfMass: [
      Math.round(cx * 100) / 100,
      Math.round(cy * 100) / 100,
      Math.round(cz * 100) / 100,
    ],
    boundingBox,
    principalInertia: [Ixx, Iyy, Izz],
  }
}

/**
 * Computes aggregate building mass, total weight, and global 3D Center of Mass (CoM).
 */
export function calculateBuildingMassAndCenterOfGravity(
  objects: SceneObject[],
): {
  totalMassKg: number
  totalWeightKn: number
  centerOfMass: [number, number, number]
  objectCount: number
} {
  let totalMass = 0
  let weightedX = 0
  let weightedY = 0
  let weightedZ = 0

  for (const obj of objects) {
    if (!obj.visible) continue
    const calc = calculateObjectPhysics(obj)
    totalMass += calc.massKg
    weightedX += calc.centerOfMass[0] * calc.massKg
    weightedY += calc.centerOfMass[1] * calc.massKg
    weightedZ += calc.centerOfMass[2] * calc.massKg
  }

  const safeMass = Math.max(1, totalMass)
  const totalWeightKn = (safeMass * 9.80665) / 1000.0

  return {
    totalMassKg: Math.round(totalMass),
    totalWeightKn: Math.round(totalWeightKn * 10) / 10,
    centerOfMass: [
      Math.round((weightedX / safeMass) * 100) / 100,
      Math.round((weightedY / safeMass) * 100) / 100,
      Math.round((weightedZ / safeMass) * 100) / 100,
    ],
    objectCount: objects.length,
  }
}

/**
 * Universal geometry helper supporting StudioElement and SceneObject.
 */
export function calculateElementGeometry(el: any) {
  let sceneObj: any = el
  if (el.dimensions) {
    if (el.type === "wall") {
      const len = el.dimensions.x || 4
      const height = el.dimensions.y || 2.8
      const thick = el.dimensions.z || 0.2
      sceneObj = {
        ...el,
        startX: (el.position?.x || 0) - len / 2,
        endX: (el.position?.x || 0) + len / 2,
        startZ: el.position?.z || 0,
        endZ: el.position?.z || 0,
        height,
        thickness: thick,
        elevation: (el.position?.y || 0) - height / 2,
      }
    } else if (el.type === "floor") {
      sceneObj = {
        ...el,
        x: el.position?.x || 0,
        z: el.position?.z || 0,
        width: el.dimensions.x,
        depth: el.dimensions.z,
        thickness: el.dimensions.y,
        elevation: el.position?.y || 0,
      }
    }
  }

  const phys = calculateObjectPhysics(sceneObj)
  const size = phys.boundingBox.size
  const surfaceArea =
    2 * (size[0] * size[1] + size[1] * size[2] + size[0] * size[2])
  return {
    volumeM3: phys.volumeM3,
    massKg: phys.massKg,
    densityKgM3: phys.densityKgM3,
    surfaceArea,
    boundingBox: phys.boundingBox,
  }
}
