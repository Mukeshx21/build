// ==========================================================================
// ARCHICRAFT3D PHYSICAL SIMULATION SYSTEM - TYPE DEFINITIONS & CONSTANTS
// ==========================================================================

import * as THREE from "three"

// Physical Constants
export const GRAVITY_STANDARD = 9.80665 // m/s^2 (Standard Earth Gravity)
export const AIR_DENSITY_STANDARD = 1.225 // kg/m^3 (at 15°C sea level)
export const WATER_DENSITY_STANDARD = 1000.0 // kg/m^3 (pure water at 4°C)
export const STEFAN_BOLTZMANN = 5.670374419e-8 // W/(m^2·K^4)

// Standard Aliases
export const STANDARD_GRAVITY = GRAVITY_STANDARD
export const AIR_DENSITY = AIR_DENSITY_STANDARD
export const WATER_DENSITY = WATER_DENSITY_STANDARD

// Unit Conversions
export const UNIT_CONVERSIONS = {
  m_to_m: 1.0,
  cm_to_m: 0.01,
  ft_to_m: 0.3048,
  m_to_cm: 100.0,
  m_to_ft: 1 / 0.3048,
  sqm_to_sqft: 10.7639,
  sqft_to_sqm: 1 / 10.7639,
}

export const METERS_PER_FOOT = UNIT_CONVERSIONS.ft_to_m
export const CENTIMETERS_PER_METER = UNIT_CONVERSIONS.m_to_cm

export interface Point3D {
  x: number
  y: number
  z: number
}

// Physics Body Type
export type PhysicsBodyType = "static" | "dynamic" | "kinematic"

// Collision Shape Type
export type CollisionShapeType = "box" | "sphere" | "cylinder" | "compound"

// Material Physical Mechanical & Thermal Properties
export interface MaterialPhysicalProperties {
  id: string
  name: string
  category: string
  density: number // kg/m^3
  elasticModulus: number // GPa (Young's Modulus)
  poissonsRatio: number // dimensionless
  compressiveStrength?: number // MPa
  tensileStrength?: number // MPa
  yieldStrength?: number // MPa (steel/metals)
  frictionStatic: number // coefficient of static friction
  frictionDynamic: number // coefficient of kinetic friction
  restitution: number // coefficient of restitution (bounciness, 0.0 = inelastic, 1.0 = elastic)
  thermalConductivity: number // W/(m·K)
  specificHeat: number // J/(kg·K)
  uValueStandard: number // W/(m^2·K) typical assembly U-value
}

// 3D Axis-Aligned and Oriented Bounding Box
export interface PhysicalBoundingBox {
  min: [number, number, number]
  max: [number, number, number]
  center: [number, number, number]
  size: [number, number, number]
  volume: number // m^3
}

// Rigid Body State in Physical World
export interface RigidBodyState {
  id: string
  objectId: string
  bodyType: PhysicsBodyType
  position: [number, number, number]
  rotation: [number, number, number]
  linearVelocity: [number, number, number]
  angularVelocity: [number, number, number]
  mass: number // kg
  inverseMass: number // 1/kg (0 for static)
  inertiaTensor: [number, number, number] // principal moments of inertia
  inverseInertiaTensor: [number, number, number]
  restitution: number
  friction: number
  isGrounded: boolean
  boundingBox: PhysicalBoundingBox
  initialPosition: [number, number, number]
  initialRotation: [number, number, number]
}

// Contact Manifold between Two Colliding Bodies
export interface ContactPoint {
  point: [number, number, number]
  normal: [number, number, number]
  penetrationDepth: number
  bodyAId: string
  bodyBId: string
  restitution: number
  friction: number
}

// Structural Load Types
export interface StructuralLoadEstimate {
  objectId: string
  objectName: string
  objectType: string
  selfWeightKg: number // Mass in kg
  deadLoadKn: number // Self-weight in kN (m * g / 1000)
  liveLoadKn: number // Occupancy/snow/use live load in kN
  totalDesignLoadKn: number // 1.2 * DL + 1.6 * LL (LRFD combination)
  tributaryAreaSqm: number // Area supported in m^2
  axialStressMpa?: number // σ = P / A in MPa
  allowableStressMpa?: number // Material capacity in MPa
  stressUtilizationRatio: number // Stress / Capacity (< 1.0 is safe)
  safetyFactor: number // Capacity / Stress
  status: "safe" | "warning" | "critical"
  supportIssues?: string[]
}

// Structural Analysis Summary for Whole Building
export interface BuildingStructuralAnalysis {
  totalBuildingMassKg: number
  totalBuildingWeightKn: number
  centerOfMass: [number, number, number]
  totalGroundReactionsKn: number
  elementLoadSummaries: StructuralLoadEstimate[]
  unsupportedElementsCount: number
  criticalMembersCount: number
  warningMembersCount: number
  overallIntegrity: "sound" | "review_required" | "unstable"
  assumptionsDisclaimers: string[]
}

// Building Envelope Thermal Analysis
export interface BuildingThermalAnalysis {
  indoorTemperatureC: number
  outdoorTemperatureC: number
  temperatureDeltaC: number
  totalEnvelopeAreaSqm: number
  wallHeatLossW: number
  windowHeatLossW: number
  roofHeatLossW: number
  floorHeatLossW: number
  totalHeatLossW: number
  totalHeatLossKw: number
  overallUValueAverage: number // W/(m^2·K)
  annualHeatingDemandKwhEst: number
}

// Wind Pressure & Drag Simulation
export interface WindSimulationAnalysis {
  windSpeedMps: number // m/s
  windDirectionDeg: number // 0-360°
  windSpeedKph: number
  dynamicPressurePa: number // q = 0.5 * rho * v^2
  projectedFacadeAreaSqm: number
  totalDragForceKn: number // F_D = 0.5 * rho * C_D * A * v^2
  windwardPressureKpa: number
  leewardSuctionKpa: number
  overturningMomentKnm: number
}

// Physics Simulation Global Configuration
export interface PhysicsSimulationConfig {
  gravityEnabled: boolean
  gravityValue: number // -9.81
  timeStep: number // 1/60s
  subSteps: number // 2
  collisionDamping: number
  simulationRunning: boolean
  simulationSpeed: number // 1.0x
  showColliderWireframes: boolean
  showStressHeatmap: boolean
  showCenterOfMass: boolean
  activeAnalysisMode: "none" | "structural" | "thermal" | "wind"
  windSpeedMps: number
  windDirectionDeg: number
  indoorTempC: number
  outdoorTempC: number
}

// Validation Test Result
export interface PhysicsValidationTestResult {
  testId: string
  name: string
  category: "units" | "kinematics" | "dynamics" | "statics" | "thermal" | "fluids"
  passed: boolean
  expectedValue: string
  computedValue: string
  errorMarginPercent: number
  formula: string
  details: string
}

export interface ValidationTestCase {
  id: string
  name: string
  category: string
  expectedValue: number
  computedValue: number
  unit: string
  tolerance: number
  passed: boolean
  formula: string
  accuracyTier: string
  details: string
}

export interface ValidationSuiteReport {
  timestamp: string
  totalTests: number
  passedCount: number
  failedCount: number
  passRatePercent: number
  testCases: ValidationTestCase[]
  disclaimer: string
}

export interface EnvelopeThermalResult {
  indoorTempC: number
  outdoorTempC: number
  deltaT: number
  totalHeatLossWatts: number
  totalConductiveWatts: number
  ventilationLossWatts: number
  overallUValue: number
  annualEnergyEstimateKWh: number
  isHeatingSeason: boolean
  breakdown: {
    wallsWatts: number
    roofWatts: number
    windowsWatts: number
    floorWatts: number
    wallAreaM2: number
    roofAreaM2: number
    windowAreaM2: number
    floorAreaM2: number
  }
  engineeringAssumptions: string[]
}

export interface WindAnalysisResult {
  windSpeedMps: number
  windSpeedKmh: number
  windAngleDeg: number
  beaufortCategory: string
  dynamicPressurePa: number
  windwardPressurePa: number
  leewardSuctionPa: number
  projectedAreaM2: number
  dragCoefficient: number
  totalDragForceKN: number
  baseShearKN: number
  overturningMomentKNm: number
  centerOfPressureHeight: number
  buildingDimensions: {
    widthX: number
    heightY: number
    depthZ: number
  }
  engineeringAssumptions: string[]
}

export interface BuoyancyResult {
  displacedVolumeM3: number
  buoyantForceN: number
  gravityForceN: number
  netForceN: number
  isFloating: boolean
  equilibriumSubmergedFraction: number
  fluidDensityKgM3: number
  objectDensityKgM3: number
}
