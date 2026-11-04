/**
 * ArchiCraft3D - Environment Simulation Engine
 * Phase 7: Thermal envelope analysis, dynamic wind pressure & drag, Archimedes fluid buoyancy
 *
 * Engineering Formulations:
 * 1. Fourier's Law / 1D Steady-State Envelope Conductance:
 *    Q_cond = sum(U_i * A_i) * (T_in - T_out)  [Watts]
 * 2. Bernoulli Wind Dynamic Pressure & Bluff Body Drag:
 *    q_z = 0.5 * rho_air * v_z^2               [Pascals = N/m^2]
 *    F_drag = 0.5 * rho_air * C_D * A_proj * v^2 [Newtons]
 *    Base Shear V_wind = F_drag, Overturning Moment M_ot = F_drag * (H / 2)
 * 3. Archimedes Fluid Buoyancy:
 *    F_buoyancy = rho_fluid * g * V_submerged    [Newtons]
 */

import {
  AIR_DENSITY,
  WATER_DENSITY,
  STANDARD_GRAVITY,
  EnvelopeThermalResult,
  WindAnalysisResult,
  BuoyancyResult,
  Point3D,
} from "./types"
import {
  MATERIAL_PHYSICS_DATABASE,
  DEFAULT_MATERIAL_PHYSICS,
} from "./MaterialPhysics"
import { StudioElement } from "../types/studio"
import { calculateElementGeometry } from "./GeometryPhysics"

export interface EnvelopeThermalInput {
  indoorTempC: number
  outdoorTempC: number
  ventilationAirChangesPerHour?: number // ACH (default 0.5 for modern construction)
}

/**
 * Conductive thermal envelope analysis across all exterior walls, roofs, windows, and ground slabs
 */
export function calculateEnvelopeThermalLoss(
  elements: StudioElement[],
  input: EnvelopeThermalInput,
): EnvelopeThermalResult {
  const indoorTempC = input.indoorTempC
  const outdoorTempC = input.outdoorTempC
  const deltaT = Math.abs(indoorTempC - outdoorTempC)
  const isHeating = indoorTempC > outdoorTempC

  let totalWallArea = 0
  let totalRoofArea = 0
  let totalWindowArea = 0
  let totalFloorArea = 0

  let wallHeatLoss = 0
  let roofHeatLoss = 0
  let windowHeatLoss = 0
  let floorHeatLoss = 0

  for (const el of elements) {
    const geo = calculateElementGeometry(el)
    const matId = (el as any).materialId || "mat_concrete_raw"
    const mat = MATERIAL_PHYSICS_DATABASE[matId] || DEFAULT_MATERIAL_PHYSICS
    const uValue = (mat as any).uValue || mat.uValueStandard || 0.35

    switch (el.type) {
      case "wall": {
        const area = geo.surfaceArea / 2 // Approximate exterior facade face area
        totalWallArea += area
        wallHeatLoss += uValue * area * deltaT
        break
      }
      case "roof": {
        const anyEl = el as any
        const area =
          anyEl.width && anyEl.depth
            ? anyEl.width * anyEl.depth
            : anyEl.dimensions?.x && anyEl.dimensions?.z
              ? anyEl.dimensions.x * anyEl.dimensions.z
              : geo.surfaceArea / 2
        totalRoofArea += area
        roofHeatLoss += uValue * area * deltaT
        break
      }
      case "floor": {
        const anyEl = el as any
        const area =
          anyEl.width && anyEl.depth
            ? anyEl.width * anyEl.depth
            : anyEl.dimensions?.x && anyEl.dimensions?.z
              ? anyEl.dimensions.x * anyEl.dimensions.z
              : geo.surfaceArea / 2
        totalFloorArea += area
        // Ground slab has reduced effective deltaT (approx 0.6 factor due to earth thermal coupling)
        floorHeatLoss += uValue * area * (deltaT * 0.6)
        break
      }
      default: {
        if ((el as any).type === "window") {
          const anyEl = el as any
          const area =
            anyEl.dimensions?.x && anyEl.dimensions?.y
              ? anyEl.dimensions.x * anyEl.dimensions.y
              : geo.surfaceArea / 2
          totalWindowArea += area
          windowHeatLoss += uValue * area * deltaT
        }
        break
      }
    }
  }

  const totalConductiveLossW =
    wallHeatLoss + roofHeatLoss + windowHeatLoss + floorHeatLoss
  const totalEnvelopeArea =
    totalWallArea + totalRoofArea + totalWindowArea + totalFloorArea
  const effectiveUValue =
    totalEnvelopeArea > 0
      ? totalConductiveLossW / (totalEnvelopeArea * (deltaT || 1))
      : 0

  // Ventilation heat loss estimate: Q_vent = 0.33 * ACH * Volume * deltaT
  const ACH = input.ventilationAirChangesPerHour ?? 0.5
  const estimatedInternalVolume = totalFloorArea * 2.8 // Assume 2.8m typical clear height
  const ventilationLossW = 0.33 * ACH * estimatedInternalVolume * deltaT

  const totalHeatTransferWatts = totalConductiveLossW + ventilationLossW

  return {
    indoorTempC,
    outdoorTempC,
    deltaT,
    totalHeatLossWatts: Math.round(totalHeatTransferWatts * 10) / 10,
    totalConductiveWatts: Math.round(totalConductiveLossW * 10) / 10,
    ventilationLossWatts: Math.round(ventilationLossW * 10) / 10,
    overallUValue: Math.round(effectiveUValue * 100) / 100,
    annualEnergyEstimateKWh:
      Math.round(((totalHeatTransferWatts * 24 * 180) / 1000) * 10) / 10, // ~180 heating degree days equivalent
    isHeatingSeason: isHeating,
    breakdown: {
      wallsWatts: Math.round(wallHeatLoss * 10) / 10,
      roofWatts: Math.round(roofHeatLoss * 10) / 10,
      windowsWatts: Math.round(windowHeatLoss * 10) / 10,
      floorWatts: Math.round(floorHeatLoss * 10) / 10,
      wallAreaM2: Math.round(totalWallArea * 10) / 10,
      roofAreaM2: Math.round(totalRoofArea * 10) / 10,
      windowAreaM2: Math.round(totalWindowArea * 10) / 10,
      floorAreaM2: Math.round(totalFloorArea * 10) / 10,
    },
    engineeringAssumptions: [
      "Steady-state 1-dimensional conductive heat transfer through building envelope (Fourier law).",
      "Exterior envelope U-values derived from ASTM / ISO 6946 material thermal resistance values.",
      "Ground slab heat loss accounts for earth dampening factor (0.6x atmospheric delta T).",
      "Natural ventilation assumes baseline 0.5 air changes per hour (ACH).",
      "Excludes internal equipment/occupant heat gains and dynamic thermal mass hysteresis.",
    ],
  }
}

/**
 * Aerodynamic Wind Load Analysis
 * Evaluates Bernoulli dynamic wind pressure, projected facade area, drag forces,
 * base shear reactions, and overturning moments.
 */
export function calculateWindAnalysis(
  elements: StudioElement[],
  windSpeedMps: number,
  windAngleDeg: number,
): WindAnalysisResult {
  // 1. Dynamic pressure q = 0.5 * rho * v^2
  const dynamicPressurePa = 0.5 * AIR_DENSITY * Math.pow(windSpeedMps, 2)

  // 2. Determine global bounding envelope to calculate projected facade area
  let minX = Infinity,
    maxX = -Infinity
  let minY = Infinity,
    maxY = -Infinity
  let minZ = Infinity,
    maxZ = -Infinity

  for (const el of elements) {
    if (el.type === "furniture" || el.type === "landscape") continue
    const geo = calculateElementGeometry(el)
    const b = geo.boundingBox
    minX = Math.min(minX, b.min[0])
    maxX = Math.max(maxX, b.max[0])
    minY = Math.min(minY, b.min[1])
    maxY = Math.max(maxY, b.max[1])
    minZ = Math.min(minZ, b.min[2])
    maxZ = Math.max(maxZ, b.max[2])
  }

  if (!isFinite(minX)) {
    minX = -5
    maxX = 5
    minY = 0
    maxY = 3
    minZ = -5
    maxZ = 5
  }

  const buildingWidthX = Math.max(1, maxX - minX)
  const buildingHeightY = Math.max(1, maxY - minY)
  const buildingDepthZ = Math.max(1, maxZ - minZ)

  // Calculate projected area facing the wind vector
  const rad = (windAngleDeg * Math.PI) / 180
  const windDirX = Math.sin(rad)
  const windDirZ = Math.cos(rad)

  const projectedAreaFacingX =
    buildingDepthZ * buildingHeightY * Math.abs(windDirX)
  const projectedAreaFacingZ =
    buildingWidthX * buildingHeightY * Math.abs(windDirZ)
  const projectedAreaM2 = Math.max(
    1,
    projectedAreaFacingX + projectedAreaFacingZ,
  )

  // Bluff body architectural drag coefficient C_D (typically 1.2 to 1.4 for rectangular building envelopes)
  const dragCoefficient = 1.25

  // Total aerodynamic drag force: F_D = q * C_D * A_proj
  const totalDragForceN = dynamicPressurePa * dragCoefficient * projectedAreaM2
  const totalDragForceKN = totalDragForceN / 1000

  // Pressure distribution on windward facade (+0.8 Cp) and leeward facade (-0.4 Cp suction)
  const windwardPressurePa = dynamicPressurePa * 0.8
  const leewardSuctionPa = dynamicPressurePa * -0.4

  // Base shear equals total lateral aerodynamic force
  const baseShearKN = totalDragForceKN

  // Center of pressure is approximately at 0.55 * buildingHeightY (due to atmospheric boundary layer velocity gradient)
  const centerOfPressureHeight = buildingHeightY * 0.55
  const overturningMomentKNm = baseShearKN * centerOfPressureHeight

  // Beaufort scale categorization
  const windSpeedKmh = windSpeedMps * 3.6
  let beaufortCategory = "Light Air"
  if (windSpeedKmh >= 118) beaufortCategory = "Hurricane Force"
  else if (windSpeedKmh >= 89) beaufortCategory = "Severe Gale / Storm"
  else if (windSpeedKmh >= 62) beaufortCategory = "Gale"
  else if (windSpeedKmh >= 39) beaufortCategory = "Strong Breeze"
  else if (windSpeedKmh >= 20) beaufortCategory = "Moderate Breeze"
  else if (windSpeedKmh >= 6) beaufortCategory = "Light Breeze"

  return {
    windSpeedMps,
    windSpeedKmh: Math.round(windSpeedKmh * 10) / 10,
    windAngleDeg,
    beaufortCategory,
    dynamicPressurePa: Math.round(dynamicPressurePa * 10) / 10,
    windwardPressurePa: Math.round(windwardPressurePa * 10) / 10,
    leewardSuctionPa: Math.round(leewardSuctionPa * 10) / 10,
    projectedAreaM2: Math.round(projectedAreaM2 * 10) / 10,
    dragCoefficient,
    totalDragForceKN: Math.round(totalDragForceKN * 100) / 100,
    baseShearKN: Math.round(baseShearKN * 100) / 100,
    overturningMomentKNm: Math.round(overturningMomentKNm * 100) / 100,
    centerOfPressureHeight: Math.round(centerOfPressureHeight * 100) / 100,
    buildingDimensions: {
      widthX: Math.round(buildingWidthX * 10) / 10,
      heightY: Math.round(buildingHeightY * 10) / 10,
      depthZ: Math.round(buildingDepthZ * 10) / 10,
    },
    engineeringAssumptions: [
      "Standard sea-level air density rho = 1.225 kg/m3 at 15 deg C.",
      "Uniform wind dynamic pressure distribution derived from standard Bernoulli formulation.",
      "Drag coefficient C_D = 1.25 representing bluff rectangular building envelopes (ASCE 7 / Eurocode 1).",
      "Windward pressure coefficient Cp = +0.8, Leeward suction coefficient Cp = -0.4.",
      "Aerodynamic center of pressure elevated to 55% of structure height to account for boundary layer shear.",
      "Turbulent vortex shedding, terrain roughness shielding, and localized aerodynamic suction eddies are excluded.",
    ],
  }
}

/**
 * Archimedes Fluid Buoyancy Calculation
 * Computes hydrostatic upward buoyant force, displaced liquid volume, and net submerged acceleration
 */
export function calculateArchimedesBuoyancy(
  objectVolumeM3: number,
  objectMassKg: number,
  submergedFraction: number = 1.0,
  fluidDensityKgM3: number = WATER_DENSITY,
): BuoyancyResult {
  const clampedFraction = Math.max(0, Math.min(1, submergedFraction))
  const displacedVolumeM3 = objectVolumeM3 * clampedFraction

  // F_B = rho_fluid * g * V_displaced
  const buoyantForceN = fluidDensityKgM3 * STANDARD_GRAVITY * displacedVolumeM3
  const gravityForceN = objectMassKg * STANDARD_GRAVITY
  const netForceN = buoyantForceN - gravityForceN // Positive = floats upward, Negative = sinks

  // Object average density
  const objectDensityKgM3 =
    objectVolumeM3 > 0 ? objectMassKg / objectVolumeM3 : 0
  const isFloating = objectDensityKgM3 < fluidDensityKgM3
  const equilibriumSubmergedFraction = isFloating
    ? Math.min(1, objectDensityKgM3 / fluidDensityKgM3)
    : 1.0

  return {
    displacedVolumeM3: Math.round(displacedVolumeM3 * 1000) / 1000,
    buoyantForceN: Math.round(buoyantForceN * 10) / 10,
    gravityForceN: Math.round(gravityForceN * 10) / 10,
    netForceN: Math.round(netForceN * 10) / 10,
    isFloating,
    equilibriumSubmergedFraction:
      Math.round(equilibriumSubmergedFraction * 1000) / 1000,
    fluidDensityKgM3,
    objectDensityKgM3: Math.round(objectDensityKgM3 * 10) / 10,
  }
}
