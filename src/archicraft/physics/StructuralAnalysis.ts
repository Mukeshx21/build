// ==========================================================================
// STRUCTURAL MECHANICS & PRELIMINARY LOAD ANALYSIS ENGINE
// Calculates Dead Loads (DL), Live Loads (LL), 1.2DL + 1.6LL Combinations,
// Column Axial Stress (P/A), Euler Buckling, Beam Bending (wL^2/8),
// and Elastic Deflection (5wL^4 / 384EI).
// ==========================================================================

import {
  SceneObject,
  ColumnObject,
  FloorSlabObject,
  WallObject,
  RoofObject,
} from "../types/studio"
import {
  calculateObjectPhysics,
  calculateBuildingMassAndCenterOfGravity,
} from "./GeometryPhysics"
import { getPhysicalMaterial } from "./MaterialPhysics"
import { checkStructuralSupport } from "./CollisionSystem"
import { StructuralLoadEstimate, BuildingStructuralAnalysis } from "./types"

// Standard Architectural Code Live Loads (Eurocode 1 / ASCE 7)
export const RESIDENTIAL_FLOOR_LIVE_LOAD_KPA = 2.0 // 2.0 kN/m^2 (40 psf) for domestic living spaces
export const ROOF_LIVE_SNOW_LOAD_KPA = 1.0 // 1.0 kN/m^2 (20 psf) maintenance / snow

/**
 * Performs preliminary structural analysis on all building elements.
 */
export function analyzeBuildingStructure(
  objects: SceneObject[],
): BuildingStructuralAnalysis {
  const activeObjects = objects.filter((o) => o.visible)
  const massSummary = calculateBuildingMassAndCenterOfGravity(activeObjects)
  const supportResults = checkStructuralSupport(activeObjects)
  const supportMap = new Map(supportResults.map((r) => [r.objectId, r]))

  const elementSummaries: StructuralLoadEstimate[] = []
  let criticalCount = 0
  let warningCount = 0
  let unsupportedCount = 0
  let totalReactionsKn = 0

  for (const obj of activeObjects) {
    const calc = calculateObjectPhysics(obj)
    const mat = getPhysicalMaterial(obj.materialId || "mat_concrete_raw")
    const support = supportMap.get(obj.id)

    // Dead Load (DL) = mass * g / 1000 in kN
    const deadLoadKn = calc.weightKn
    let liveLoadKn = 0
    let tributaryArea = 0
    let axialStressMpa: number | undefined = undefined
    let allowableStressMpa: number | undefined = undefined
    let utilization = 0.1
    let safetyFactor = 10.0
    let status: "safe" | "warning" | "critical" = "safe"
    const supportIssues: string[] = []

    if (support && !support.hasSupport) {
      supportIssues.push(support.message)
      unsupportedCount++
      status = "warning"
    }

    if (obj.type === "column") {
      const col = obj as ColumnObject
      // Cross-sectional area A in m^2
      let crossArea = col.width * col.width
      let momentOfInertia = (col.width * Math.pow(col.width, 3)) / 12

      if (col.columnType === "round") {
        const r = col.width / 2
        crossArea = Math.PI * r * r
        momentOfInertia = (Math.PI * Math.pow(r, 4)) / 4
      } else if (col.columnType === "steel-i") {
        crossArea = col.width * 0.04 * 2 + (col.width - 0.08) * 0.04
        momentOfInertia = ((col.width * Math.pow(col.width, 3)) / 12) * 0.6
      }

      // Tributary area estimated from spacing (typically 12-25 m^2 per column)
      tributaryArea = Math.min(36, Math.max(8, col.width * 25))
      // Tributary floor load: DL + LL from slab above
      const tributaryDead = tributaryArea * 0.25 * 24.0 * (9.81 / 1000) // 0.25m slab self weight ~ 5.9 kN/m^2
      const tributaryLive = tributaryArea * RESIDENTIAL_FLOOR_LIVE_LOAD_KPA // 2.0 kN/m^2
      liveLoadKn = tributaryLive

      // Ultimate Design Load Combination (1.2 DL + 1.6 LL) in kN
      const designLoadKn =
        1.2 * (deadLoadKn + tributaryDead) + 1.6 * tributaryLive

      // Axial Stress: σ = P / A (kN/m^2) / 1000 = MPa
      const stress = designLoadKn / Math.max(0.005, crossArea) / 1000.0
      axialStressMpa = Math.round(stress * 100) / 100

      // Allowable material stress (with safety factor phi = 0.65 for concrete column)
      const matCapacity = mat.compressiveStrength || mat.yieldStrength || 25.0
      allowableStressMpa = Math.round(matCapacity * 0.65 * 10) / 10

      // Euler Critical Buckling Load: P_cr = (pi^2 * E * I) / (K * L)^2
      const effectiveLength = 1.0 * col.height // K = 1.0 pinned-pinned approximation
      const E_kpa = mat.elasticModulus * 1e6 // GPa to kPa
      const P_cr_kn =
        (Math.PI * Math.PI * E_kpa * momentOfInertia) /
        (effectiveLength * effectiveLength)
      const bucklingSF = P_cr_kn / Math.max(1, designLoadKn)

      utilization = axialStressMpa / Math.max(1, allowableStressMpa)
      safetyFactor = Math.min(
        bucklingSF,
        allowableStressMpa / Math.max(0.1, axialStressMpa),
      )

      if (utilization > 1.0 || safetyFactor < 1.5) {
        status = "critical"
        criticalCount++
        supportIssues.push(
          `High axial stress: σ = ${axialStressMpa} MPa exceeds allowable ${allowableStressMpa} MPa.`,
        )
      } else if (utilization > 0.7 || safetyFactor < 2.5) {
        status = "warning"
        warningCount++
        supportIssues.push(
          `Moderate load utilization: ${(utilization * 100).toFixed(0)}% of member capacity.`,
        )
      }

      totalReactionsKn += designLoadKn
    } else if (obj.type === "floor") {
      const slab = obj as FloorSlabObject
      tributaryArea = slab.width * slab.depth
      liveLoadKn = tributaryArea * RESIDENTIAL_FLOOR_LIVE_LOAD_KPA
      const designLoadKn = 1.2 * deadLoadKn + 1.6 * liveLoadKn

      // Span bending approximation: simply supported slab of span L = min(width, depth)
      const spanL = Math.min(slab.width, slab.depth)
      const distLoadW = designLoadKn / Math.max(1, spanL) // kN/m
      // Maximum bending moment: M_max = w * L^2 / 8 (kNm)
      const M_max = (distLoadW * spanL * spanL) / 8
      // Section modulus S = b * h^2 / 6
      const b = Math.max(slab.width, slab.depth)
      const h = slab.thickness
      const S = (b * h * h) / 6
      // Bending stress σ_b = M / S (kPa) / 1000 = MPa
      const bendStress = M_max / Math.max(0.001, S) / 1000.0
      axialStressMpa = Math.round(bendStress * 100) / 100

      allowableStressMpa =
        Math.round((mat.compressiveStrength || 30.0) * 0.45 * 10) / 10
      utilization = axialStressMpa / Math.max(0.5, allowableStressMpa)
      safetyFactor = allowableStressMpa / Math.max(0.05, axialStressMpa)

      // Elastic Deflection: δ = (5 * w * L^4) / (384 * E * I)
      const I = (b * Math.pow(h, 3)) / 12
      const E_kpa = mat.elasticModulus * 1e6
      const deflectionM =
        (5 * distLoadW * Math.pow(spanL, 4)) /
        (384 * E_kpa * Math.max(0.0001, I))
      const spanToDeflection = spanL / Math.max(0.0001, deflectionM)

      if (spanToDeflection < 250) {
        status = "warning"
        warningCount++
        supportIssues.push(
          `Slab deflection exceeds L/250 limit (estimated span/deflection = ${Math.round(spanToDeflection)}). Consider adding beams or intermediate columns.`,
        )
      }

      totalReactionsKn += designLoadKn
    } else if (obj.type === "roof") {
      const roof = obj as RoofObject
      tributaryArea = roof.width * roof.depth
      liveLoadKn = tributaryArea * ROOF_LIVE_SNOW_LOAD_KPA
      const designLoadKn = 1.2 * deadLoadKn + 1.6 * liveLoadKn
      totalReactionsKn += designLoadKn
    } else if (obj.type === "wall") {
      const wall = obj as WallObject
      tributaryArea = wall.thickness * calculateObjectPhysics(wall).volumeM3
      liveLoadKn = 0
      const designLoadKn = 1.2 * deadLoadKn
      totalReactionsKn += designLoadKn
    }

    elementSummaries.push({
      objectId: obj.id,
      objectName: obj.name,
      objectType: obj.type,
      selfWeightKg: calc.massKg,
      deadLoadKn: Math.round(deadLoadKn * 100) / 100,
      liveLoadKn: Math.round(liveLoadKn * 100) / 100,
      totalDesignLoadKn:
        Math.round((1.2 * deadLoadKn + 1.6 * liveLoadKn) * 100) / 100,
      tributaryAreaSqm: Math.round(tributaryArea * 10) / 10,
      axialStressMpa,
      allowableStressMpa,
      stressUtilizationRatio: Math.min(
        3.0,
        Math.round(utilization * 100) / 100,
      ),
      safetyFactor: Math.min(50.0, Math.round(safetyFactor * 10) / 10),
      status,
      supportIssues,
    })
  }

  let overallIntegrity: "sound" | "review_required" | "unstable" = "sound"
  if (criticalCount > 0 || unsupportedCount > 2) {
    overallIntegrity = "unstable"
  } else if (warningCount > 0 || unsupportedCount > 0) {
    overallIntegrity = "review_required"
  }

  return {
    totalBuildingMassKg: massSummary.totalMassKg,
    totalBuildingWeightKn: massSummary.totalWeightKn,
    centerOfMass: massSummary.centerOfMass,
    totalGroundReactionsKn: Math.round(totalReactionsKn * 10) / 10,
    elementLoadSummaries: elementSummaries,
    unsupportedElementsCount: unsupportedCount,
    criticalMembersCount: criticalCount,
    warningMembersCount: warningCount,
    overallIntegrity,
    assumptionsDisclaimers: [
      "Load Combination: LRFD 1.2 Dead Load (DL) + 1.6 Live Load (LL)",
      "Floor Live Load: 2.0 kN/m² (Domestic Occupancy)",
      "Roof Snow/Maintenance Load: 1.0 kN/m²",
      "Material strengths based on standard structural concrete (C25/30), structural steel (S275), and seasoned timber.",
      "Disclaimer: This preliminary calculation is for early architectural sizing and educational visualization. It does not replace code-compliant civil engineering design signed by a licensed professional engineer.",
    ],
  }
}

/**
 * Calculates Euler-Bernoulli bending moment, shear, stress, and elastic deflection
 * for a simply supported beam under uniform distributed load (UDL).
 */
export function calculateSimplySupportedBeam(
  spanL: number,
  udlW: number, // kN/m
  E_GPa: number,
  S_m3: number,
  I_m4: number,
) {
  const maxBendingMomentKNm = (udlW * spanL * spanL) / 8
  const supportReactionKN = (udlW * spanL) / 2
  const maxBendingStressMPa = maxBendingMomentKNm / S_m3 / 1000
  const deltaM =
    (5 * (udlW * 1000) * Math.pow(spanL, 4)) / (384 * (E_GPa * 1e9) * I_m4)
  const midspanDeflectionMm = deltaM * 1000
  const allowableDeflectionMm = (spanL / 250) * 1000

  return {
    maxBendingMomentKNm: Math.round(maxBendingMomentKNm * 100) / 100,
    supportReactionKN: Math.round(supportReactionKN * 100) / 100,
    maxBendingStressMPa: Math.round(maxBendingStressMPa * 100) / 100,
    midspanDeflectionMm: Math.round(midspanDeflectionMm * 100) / 100,
    allowableDeflectionMm: Math.round(allowableDeflectionMm * 100) / 100,
    isDeflectionCompliant: midspanDeflectionMm <= allowableDeflectionMm,
  }
}

/**
 * Calculates axial normal stress (sigma = P / A) and Euler critical buckling capacity.
 */
export function calculateColumnAxialStress(
  crossAreaM2: number,
  axialLoadKN: number,
  columnHeightM: number,
  youngsModulusGPa: number,
  allowableCompressiveStrengthMPa: number,
  columnWidthX: number,
  columnDepthZ: number,
) {
  const axialStressMPa = axialLoadKN / crossAreaM2 / 1000
  const minDim = Math.min(columnWidthX, columnDepthZ)
  const I_min = (minDim * Math.pow(minDim, 3)) / 12
  const E_Pa = youngsModulusGPa * 1e9
  const P_cr_N = (Math.PI * Math.PI * E_Pa * I_min) / Math.pow(columnHeightM, 2)
  const criticalBucklingLoadKN = P_cr_N / 1000

  const stressRatio = axialStressMPa / allowableCompressiveStrengthMPa
  const bucklingRatio = axialLoadKN / criticalBucklingLoadKN

  return {
    axialStressMPa: Math.round(axialStressMPa * 100) / 100,
    criticalBucklingLoadKN: Math.round(criticalBucklingLoadKN * 10) / 10,
    stressRatio: Math.round(stressRatio * 100) / 100,
    bucklingRatio: Math.round(bucklingRatio * 100) / 100,
    isSafe: stressRatio < 1.0 && bucklingRatio < 1.0,
  }
}

export const calculateBuildingStructuralLoads = analyzeBuildingStructure
