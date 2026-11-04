// ==========================================================================
// ARCHITECTURAL COLLISION DETECTION & SUPPORT STABILITY SYSTEM
// Handles broadphase AABB overlap, narrowphase contact manifolds,
// and structural support verification (floors, roofs, columns, foundations).
// ==========================================================================

import {
  SceneObject,
  WallObject,
  FloorSlabObject,
  RoofObject,
  ColumnObject,
} from "../types/studio"
import { calculateObjectPhysics } from "./GeometryPhysics"
import { ContactPoint, PhysicalBoundingBox } from "./types"

/**
 * Checks if two 3D Axis-Aligned Bounding Boxes overlap.
 */
export function checkAABBOverlap(
  a: PhysicalBoundingBox,
  b: PhysicalBoundingBox,
  tolerance = 0.02,
): boolean {
  return (
    a.min[0] - tolerance <= b.max[0] &&
    a.max[0] + tolerance >= b.min[0] &&
    a.min[1] - tolerance <= b.max[1] &&
    a.max[1] + tolerance >= b.min[1] &&
    a.min[2] - tolerance <= b.max[2] &&
    a.max[2] + tolerance >= b.min[2]
  )
}

/**
 * Calculates contact manifold between a dynamic object and a static bounding box or ground plane.
 */
export function testBoxBoxContact(
  boxA: PhysicalBoundingBox,
  boxB: PhysicalBoundingBox,
  idA: string,
  idB: string,
  restitution = 0.05,
  friction = 0.5,
): ContactPoint | null {
  // Penetration along each axis
  const dx1 = boxB.max[0] - boxA.min[0]
  const dx2 = boxA.max[0] - boxB.min[0]
  const dy1 = boxB.max[1] - boxA.min[1]
  const dy2 = boxA.max[1] - boxB.min[1]
  const dz1 = boxB.max[2] - boxA.min[2]
  const dz2 = boxA.max[2] - boxB.min[2]

  if (dx1 <= 0 || dx2 <= 0 || dy1 <= 0 || dy2 <= 0 || dz1 <= 0 || dz2 <= 0) {
    return null // Separating axis exists
  }

  const penX = Math.min(dx1, dx2)
  const penY = Math.min(dy1, dy2)
  const penZ = Math.min(dz1, dz2)

  let normal: [number, number, number] = [0, 1, 0]
  let depth = penY

  // Smallest penetration is the collision normal
  if (penY <= penX && penY <= penZ) {
    normal = boxA.center[1] > boxB.center[1] ? [0, 1, 0] : [0, -1, 0]
    depth = penY
  } else if (penX <= penY && penX <= penZ) {
    normal = boxA.center[0] > boxB.center[0] ? [1, 0, 0] : [-1, 0, 0]
    depth = penX
  } else {
    normal = boxA.center[2] > boxB.center[2] ? [0, 0, 1] : [0, 0, -1]
    depth = penZ
  }

  // Contact point approximation at intersection midpoint
  const contactPoint: [number, number, number] = [
    (Math.max(boxA.min[0], boxB.min[0]) + Math.min(boxA.max[0], boxB.max[0])) /
      2,
    (Math.max(boxA.min[1], boxB.min[1]) + Math.min(boxA.max[1], boxB.max[1])) /
      2,
    (Math.max(boxA.min[2], boxB.min[2]) + Math.min(boxA.max[2], boxB.max[2])) /
      2,
  ]

  return {
    point: contactPoint,
    normal,
    penetrationDepth: depth,
    bodyAId: idA,
    bodyBId: idB,
    restitution,
    friction,
  }
}

/**
 * Checks contact between a bounding box and the world ground plane (y = 0).
 */
export function testGroundPlaneContact(
  box: PhysicalBoundingBox,
  bodyId: string,
  groundY = 0.0,
  restitution = 0.05,
  friction = 0.55,
): ContactPoint | null {
  if (box.min[1] <= groundY + 0.02) {
    const depth = groundY - box.min[1]
    return {
      point: [box.center[0], groundY, box.center[2]],
      normal: [0, 1, 0],
      penetrationDepth: Math.max(0, depth),
      bodyAId: bodyId,
      bodyBId: "ground_plane",
      restitution,
      friction,
    }
  }
  return null
}

export interface SupportCheckResult {
  objectId: string
  objectName: string
  hasSupport: boolean
  supportingElementIds: string[]
  contactType: "ground" | "structural_slab" | "columns" | "bearing_wall" | "unsupported"
  message: string
}

/**
 * Verifies architectural support continuity:
 * Checks whether columns, walls, floor slabs, and roofs have physically sound vertical load paths to ground.
 */
export function checkStructuralSupport(
  objects: SceneObject[],
): SupportCheckResult[] {
  const results: SupportCheckResult[] = []
  const activeObjects = objects.filter((o) => o.visible)

  // Pre-calculate physical bounding boxes
  const physicsMap = new Map<string, {
    obj: SceneObject
    box: PhysicalBoundingBox
  }>()
  for (const obj of activeObjects) {
    const calc = calculateObjectPhysics(obj)
    physicsMap.set(obj.id, { obj, box: calc.boundingBox })
  }

  for (const obj of activeObjects) {
    const data = physicsMap.get(obj.id)!
    const box = data.box

    if (obj.type === "column") {
      const col = obj as ColumnObject
      // Is column grounded or resting on a slab/foundation underneath?
      if (box.min[1] <= 0.08) {
        results.push({
          objectId: col.id,
          objectName: col.name,
          hasSupport: true,
          supportingElementIds: ["ground_plane"],
          contactType: "ground",
          message: "Grounded securely on foundation level.",
        })
      } else {
        // Look for supporting floor slab underneath column base
        const supporters: string[] = []
        for (const other of activeObjects) {
          if (other.id === col.id || other.type !== "floor") continue
          const otherBox = physicsMap.get(other.id)!.box
          const isUnderneath = Math.abs(box.min[1] - otherBox.max[1]) < 0.15
          const horizontalOverlap =
            box.center[0] >= otherBox.min[0] &&
            box.center[0] <= otherBox.max[0] &&
            box.center[2] >= otherBox.min[2] &&
            box.center[2] <= otherBox.max[2]

          if (isUnderneath && horizontalOverlap) {
            supporters.push(other.id)
          }
        }

        if (supporters.length > 0) {
          results.push({
            objectId: col.id,
            objectName: col.name,
            hasSupport: true,
            supportingElementIds: supporters,
            contactType: "structural_slab",
            message: "Supported on intermediate structural floor slab.",
          })
        } else {
          results.push({
            objectId: col.id,
            objectName: col.name,
            hasSupport: false,
            supportingElementIds: [],
            contactType: "unsupported",
            message:
              "Warning: Floating column without foundation or lower floor support.",
          })
        }
      }
    } else if (obj.type === "floor") {
      const slab = obj as FloorSlabObject
      const isGroundLevel = (slab.floorLevel || 0) === 0 || box.min[1] <= 0.1

      if (isGroundLevel) {
        results.push({
          objectId: slab.id,
          objectName: slab.name,
          hasSupport: true,
          supportingElementIds: ["ground_plane"],
          contactType: "ground",
          message: "Resting on grade foundation plinth.",
        })
      } else {
        // Upper floor slab: needs load-bearing walls or columns underneath
        const supporters: string[] = []
        for (const other of activeObjects) {
          if (
            other.id === slab.id ||
            (other.type !== "wall" && other.type !== "column")
          )
            continue
          const otherBox = physicsMap.get(other.id)!.box
          const touchesUnderside = Math.abs(otherBox.max[1] - box.min[1]) < 0.25
          const overlap = checkAABBOverlap(
            {
              min: [box.min[0], box.min[1] - 0.2, box.min[2]],
              max: [box.max[0], box.min[1], box.max[2]],
              center: box.center,
              size: box.size,
              volume: 1,
            },
            otherBox,
            0.1,
          )

          if (touchesUnderside && overlap) {
            supporters.push(other.id)
          }
        }

        if (supporters.length >= 2) {
          results.push({
            objectId: slab.id,
            objectName: slab.name,
            hasSupport: true,
            supportingElementIds: supporters,
            contactType: "bearing_wall",
            message: `Supported by ${supporters.length} structural bearing elements underneath.`,
          })
        } else if (supporters.length === 1) {
          results.push({
            objectId: slab.id,
            objectName: slab.name,
            hasSupport: false,
            supportingElementIds: supporters,
            contactType: "unsupported",
            message:
              "Warning: Under-supported slab (only 1 bearing contact; prone to tipping/collapse).",
          })
        } else {
          results.push({
            objectId: slab.id,
            objectName: slab.name,
            hasSupport: false,
            supportingElementIds: [],
            contactType: "unsupported",
            message:
              "Critical: Floating upper floor slab with no structural support below.",
          })
        }
      }
    } else if (obj.type === "roof") {
      const roof = obj as RoofObject
      // Roof must rest on upper walls or columns
      const supporters: string[] = []
      for (const other of activeObjects) {
        if (
          other.id === roof.id ||
          (other.type !== "wall" && other.type !== "column")
        )
          continue
        const otherBox = physicsMap.get(other.id)!.box
        const touchesUnderside = Math.abs(otherBox.max[1] - box.min[1]) < 0.35
        const overlap = checkAABBOverlap(box, otherBox, 0.15)

        if (touchesUnderside && overlap) {
          supporters.push(other.id)
        }
      }

      if (supporters.length >= 2) {
        results.push({
          objectId: roof.id,
          objectName: roof.name,
          hasSupport: true,
          supportingElementIds: supporters,
          contactType: "bearing_wall",
          message: `Anchored securely to ${supporters.length} perimeter walls/columns.`,
        })
      } else {
        results.push({
          objectId: roof.id,
          objectName: roof.name,
          hasSupport: false,
          supportingElementIds: supporters,
          contactType: "unsupported",
          message:
            "Warning: Insufficient structural bearing support for roof load.",
        })
      }
    }
  }

  return results
}
