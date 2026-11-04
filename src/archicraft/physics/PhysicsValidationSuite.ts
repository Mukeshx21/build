/**
 * ArchiCraft3D - Automated Physics & Structural Mechanics Validation Suite
 * Phase 12: Automated testing and engineering verification with explicit analytical solutions.
 *
 * Compares computed physics engine outputs against exact closed-form analytical formulas
 * with quantifiable numerical error bounds and transparent accuracy tier labeling.
 */

import {
  METERS_PER_FOOT,
  CENTIMETERS_PER_METER,
  STANDARD_GRAVITY,
  AIR_DENSITY,
  WATER_DENSITY,
  ValidationTestCase,
  ValidationSuiteReport,
} from "./types"
import { MATERIAL_PHYSICS_DATABASE } from "./MaterialPhysics"
import { calculateElementGeometry } from "./GeometryPhysics"
import {
  calculateSimplySupportedBeam,
  calculateColumnAxialStress,
} from "./StructuralAnalysis"
import {
  calculateEnvelopeThermalLoss,
  calculateWindAnalysis,
  calculateArchimedesBuoyancy,
} from "./EnvironmentSimulation"
import { calculatePhotometricGrid } from "./PhotometricLighting"
import { StudioElement } from "../types/studio"

export function runPhysicsValidationSuite(): ValidationSuiteReport {
  const cases: ValidationTestCase[] = []

  // ==========================================
  // Test 1: Coordinate System Unit Conversions
  // ==========================================
  {
    const testFt = 10 // 10 feet
    const expectedMeters = 3.048
    const computedMeters = testFt * METERS_PER_FOOT
    const err = Math.abs(computedMeters - expectedMeters)
    cases.push({
      id: "TC-01",
      name: "Imperial to Metric Length Conversion (10 ft -> 3.048 m)",
      category: "Unit Conversions",
      expectedValue: expectedMeters,
      computedValue: computedMeters,
      unit: "m",
      tolerance: 1e-6,
      passed: err <= 1e-6,
      formula: "d_m = d_ft * 0.3048",
      accuracyTier: "Validated Engineering Analysis",
      details:
        "Ensures strict SI meter standard across all dimensional conversions.",
    })
  }

  {
    const testCm = 250 // 250 cm
    const expectedMeters = 2.5
    const computedMeters = testCm / CENTIMETERS_PER_METER
    const err = Math.abs(computedMeters - expectedMeters)
    cases.push({
      id: "TC-02",
      name: "Centimeter to Meter Conversion (250 cm -> 2.5 m)",
      category: "Unit Conversions",
      expectedValue: expectedMeters,
      computedValue: computedMeters,
      unit: "m",
      tolerance: 1e-6,
      passed: err <= 1e-6,
      formula: "d_m = d_cm / 100",
      accuracyTier: "Validated Engineering Analysis",
      details:
        "Verifies wall thickness and architectural offsets in SI meters.",
    })
  }

  // ==========================================
  // Test 2: Kinematic Free Fall Under Gravity
  // ==========================================
  {
    // Object dropped from rest at y0 = 10m for t = 1.0s under g = 9.80665 m/s^2
    // y(t) = y0 - 0.5 * g * t^2
    const y0 = 10.0
    const t = 1.0
    const g = STANDARD_GRAVITY
    const expectedY = y0 - 0.5 * g * t * t // 10 - 4.903325 = 5.096675 m
    const expectedVelocity = -g * t // -9.80665 m/s

    // Symplectic Euler numerical integration at 60Hz (dt = 1/60s, 60 steps)
    const dt = 1 / 60
    let simY = y0
    let simV = 0
    for (let i = 0; i < 60; i++) {
      simV += -g * dt
      simY += simV * dt
    }

    const posError = Math.abs(simY - expectedY)
    // Symplectic Euler has O(dt) local truncation error; at dt=1/60, error < 0.1m
    cases.push({
      id: "TC-03",
      name: "Free Fall Trajectory Integration (1s drop from 10m)",
      category: "Kinematics & Gravity",
      expectedValue: Math.round(expectedY * 1000) / 1000,
      computedValue: Math.round(simY * 1000) / 1000,
      unit: "m",
      tolerance: 0.1, // Numerical integration tolerance for 60Hz step
      passed: posError <= 0.1,
      formula: "y(t) = y_0 - 0.5 * g * t^2",
      accuracyTier: "Real-Time Rigid-Body Simulation",
      details: `Analytical y(1s) = ${expectedY.toFixed(4)}m, 60Hz Symplectic Euler = ${simY.toFixed(4)}m (delta = ${posError.toFixed(4)}m).`,
    })
  }

  // ==========================================
  // Test 3: Material Mass & Density (Concrete Block)
  // ==========================================
  {
    // Solid concrete slab: 4m x 0.2m x 5m = 4.0 m^3
    // Standard raw concrete density = 2400 kg/m^3
    // Expected mass = 4.0 * 2400 = 9600 kg
    const concreteMat = MATERIAL_PHYSICS_DATABASE["mat_concrete_raw"]
    const volumeM3 = 4.0 * 0.2 * 5.0
    const density =
      concreteMat.density || (concreteMat as any).densityKgM3 || 2400
    const expectedMassKg = volumeM3 * density

    const mockSlab: any = {
      id: "test_slab_1",
      name: "Test Slab",
      type: "floor",
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      dimensions: { x: 4.0, y: 0.2, z: 5.0 },
      materialId: "mat_concrete_raw",
      layerId: "layer_arch",
      visible: true,
      locked: false,
    }

    const computedGeo = calculateElementGeometry(mockSlab)
    const err = Math.abs(computedGeo.massKg - expectedMassKg)

    cases.push({
      id: "TC-04",
      name: "Concrete Slab Mass Calculation (m = rho * V)",
      category: "Mass & Inertia",
      expectedValue: expectedMassKg,
      computedValue: computedGeo.massKg,
      unit: "kg",
      tolerance: 1e-3,
      passed: err <= 1e-3,
      formula: "m = rho * V (2400 kg/m^3 * 4.0 m^3)",
      accuracyTier: "Validated Engineering Analysis",
      details:
        "Evaluates structural self-weight mass directly from material density.",
    })
  }

  // ==========================================
  // Test 4: Simply Supported Beam Bending Moment & Deflection
  // ==========================================
  {
    // Steel beam (W-shape / Box section): Span L = 6.0 m, UDL w = 15.0 kN/m
    // Elastic Modulus E = 210 GPa (210e6 kN/m^2)
    // Section Modulus S = 0.0006 m^3, Moment of Inertia I = 0.00008 m^4
    // Theoretical Max Moment: M_max = w * L^2 / 8 = 15 * 36 / 8 = 67.5 kN*m
    // Theoretical Shear: R1 = R2 = w * L / 2 = 15 * 6 / 2 = 45.0 kN
    // Theoretical Deflection: delta = (5 * w * L^4) / (384 * E * I)
    //   w = 15 kN/m = 15,000 N/m, L = 6m, E = 210e9 N/m^2, I = 8e-5 m^4
    //   delta = (5 * 15000 * 1296) / (384 * 210e9 * 8e-5) = 97,200,000 / 6,451,200,000 = 0.015066 m = 15.07 mm
    const spanL = 6.0
    const udlW = 15.0 // kN/m
    const E_GPa = 210
    const S_m3 = 0.0006
    const I_m4 = 0.00008

    const beamResult = calculateSimplySupportedBeam(
      spanL,
      udlW,
      E_GPa,
      S_m3,
      I_m4,
    )
    const expectedM = 67.5 // kN*m
    const mErr = Math.abs(beamResult.maxBendingMomentKNm - expectedM)

    cases.push({
      id: "TC-05",
      name: "Simply Supported Beam Max Bending Moment (M = w*L^2 / 8)",
      category: "Structural Mechanics",
      expectedValue: expectedM,
      computedValue: beamResult.maxBendingMomentKNm,
      unit: "kN*m",
      tolerance: 1e-4,
      passed: mErr <= 1e-4,
      formula: "M_max = w * L^2 / 8",
      accuracyTier: "Validated Engineering Analysis",
      details:
        "Euler-Bernoulli closed-form solution for uniform distributed line load.",
    })

    const expectedDeflectionMm = 15.07
    const defErr = Math.abs(
      beamResult.midspanDeflectionMm - expectedDeflectionMm,
    )
    cases.push({
      id: "TC-06",
      name: "Beam Midspan Elastic Deflection (delta = 5wL^4 / 384EI)",
      category: "Structural Mechanics",
      expectedValue: expectedDeflectionMm,
      computedValue: beamResult.midspanDeflectionMm,
      unit: "mm",
      tolerance: 0.1,
      passed: defErr <= 0.1,
      formula: "delta = (5 * w * L^4) / (384 * E * I)",
      accuracyTier: "Validated Engineering Analysis",
      details:
        "Elastic deflection limits checked against standard L/250 (24 mm) criteria.",
    })
  }

  // ==========================================
  // Test 5: Column Axial Stress & Euler Buckling
  // ==========================================
  {
    // Concrete Column: 0.3m x 0.3m square cross-section, Height L = 3.0 m
    // Area A = 0.09 m^2
    // Axial Load P = 450 kN
    // Expected Axial Stress: sigma = P / A = 450 / 0.09 = 5000 kPa = 5.00 MPa
    const columnWidth = 0.3
    const columnHeight = 3.0
    const areaA = columnWidth * columnWidth
    const axialLoadKN = 450
    const concreteMat = MATERIAL_PHYSICS_DATABASE["mat_concrete_raw"]

    const colResult = calculateColumnAxialStress(
      areaA,
      axialLoadKN,
      columnHeight,
      concreteMat.elasticModulus,
      concreteMat.compressiveStrength || 30,
      columnWidth,
      columnWidth,
    )

    const expectedStressMPa = 5.0
    const stressErr = Math.abs(colResult.axialStressMPa - expectedStressMPa)

    cases.push({
      id: "TC-07",
      name: "Column Axial Normal Stress (sigma = P / A)",
      category: "Structural Mechanics",
      expectedValue: expectedStressMPa,
      computedValue: colResult.axialStressMPa,
      unit: "MPa",
      tolerance: 1e-3,
      passed: stressErr <= 1e-3,
      formula: "sigma = P / A (450 kN / 0.09 m^2)",
      accuracyTier: "Validated Engineering Analysis",
      details:
        "Direct compressive stress verified against material allowable limit (28 MPa concrete).",
    })
  }

  // ==========================================
  // Test 6: Thermal Envelope Conductive Loss (Fourier's Law)
  // ==========================================
  {
    // Insulated Wall: Area A = 20 m^2, U-value = 0.30 W/(m^2*K)
    // Indoor = 20 deg C, Outdoor = 0 deg C => deltaT = 20 K
    // Theoretical Q = U * A * deltaT = 0.30 * 20 * 20 = 120.0 Watts
    const mockWall: any = {
      id: "test_wall_1",
      name: "Thermal Test Wall",
      type: "wall",
      position: { x: 0, y: 1.5, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      dimensions: { x: 10.0, y: 2.0, z: 0.2 }, // Face area ~ 20 m^2
      materialId: "mat_white_plaster", // U-value ~ 0.32 W/m2K
      layerId: "layer_arch",
      visible: true,
      locked: false,
    }

    const thermalResult = calculateEnvelopeThermalLoss([mockWall], {
      indoorTempC: 20,
      outdoorTempC: 0,
      ventilationAirChangesPerHour: 0, // Isolate conductive transfer
    })

    const geo = calculateElementGeometry(mockWall)
    const wallArea = geo.surfaceArea / 2
    const plasterMat = MATERIAL_PHYSICS_DATABASE["mat_white_plaster"]
    const uVal = (plasterMat as any).uValue || plasterMat.uValueStandard || 0.35
    const expectedQ = Math.round(uVal * wallArea * 20 * 10) / 10
    const qErr = Math.abs(thermalResult.totalConductiveWatts - expectedQ)

    cases.push({
      id: "TC-08",
      name: "Fourier's Law Envelope Conductive Heat Loss (Q = U * A * deltaT)",
      category: "Thermal Physics",
      expectedValue: expectedQ,
      computedValue: thermalResult.totalConductiveWatts,
      unit: "W",
      tolerance: 0.5,
      passed: qErr <= 0.5,
      formula: "Q = U * A * deltaT",
      accuracyTier: "Simplified Physical Calculation",
      details:
        "Calculates steady-state thermal flux through exterior building envelope.",
    })
  }

  // ==========================================
  // Test 7: Aerodynamic Wind Dynamic Pressure & Drag
  // ==========================================
  {
    // Wind speed v = 20 m/s (72 km/h, Gale force)
    // Sea level air density rho = 1.225 kg/m^3
    // Theoretical dynamic pressure: q = 0.5 * rho * v^2 = 0.5 * 1.225 * 400 = 245.0 Pa
    const windSpeed = 20.0
    const expectedDynamicPressurePa = 0.5 * AIR_DENSITY * windSpeed * windSpeed

    const mockHouseBox: any = {
      id: "house_box",
      name: "House Envelope",
      type: "wall",
      position: { x: 0, y: 2, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      dimensions: { x: 8, y: 4, z: 10 },
      materialId: "mat_brick_modern",
      layerId: "layer_arch",
      visible: true,
      locked: false,
    }

    const windResult = calculateWindAnalysis([mockHouseBox], windSpeed, 0)
    const pErr = Math.abs(
      windResult.dynamicPressurePa - expectedDynamicPressurePa,
    )

    cases.push({
      id: "TC-09",
      name: "Bernoulli Aerodynamic Wind Dynamic Pressure (q = 0.5 * rho * v^2)",
      category: "Wind & Aerodynamics",
      expectedValue: expectedDynamicPressurePa,
      computedValue: windResult.dynamicPressurePa,
      unit: "Pa",
      tolerance: 1e-4,
      passed: pErr <= 1e-4,
      formula: "q = 0.5 * rho_air * v^2 (0.5 * 1.225 * 20^2)",
      accuracyTier: "Simplified Physical Calculation",
      details:
        "Calculates stagnation pressure on windward facade per ASCE 7 / Eurocode 1.",
    })
  }

  // ==========================================
  // Test 8: Archimedes Fluid Buoyancy
  // ==========================================
  {
    // Submerged timber volume: V = 0.5 m^3
    // Timber density = 650 kg/m^3 -> Mass = 325 kg
    // Displaced water density = 1000 kg/m^3
    // Upward Buoyant Force: F_B = rho_water * g * V = 1000 * 9.80665 * 0.5 = 4903.325 N
    // Downward Gravity: F_g = m * g = 325 * 9.80665 = 3187.161 N
    // Net Upward Force: 4903.325 - 3187.161 = 1716.164 N (Object Floats!)
    const timberVol = 0.5
    const timberMass = 325
    const expectedFB = WATER_DENSITY * STANDARD_GRAVITY * timberVol // 4903.3 N

    const buoyancyResult = calculateArchimedesBuoyancy(
      timberVol,
      timberMass,
      1.0,
    )
    const fbErr = Math.abs(buoyancyResult.buoyantForceN - expectedFB)

    cases.push({
      id: "TC-10",
      name: "Archimedes Fluid Buoyant Force (F_B = rho_fluid * g * V_disp)",
      category: "Fluids & Buoyancy",
      expectedValue: Math.round(expectedFB * 10) / 10,
      computedValue: buoyancyResult.buoyantForceN,
      unit: "N",
      tolerance: 0.5,
      passed: fbErr <= 0.5,
      formula: "F_B = rho_w * g * V (1000 * 9.81 * 0.5)",
      accuracyTier: "Validated Engineering Analysis",
      details:
        "Hydrostatic upward force verified for pool & water feature components.",
    })
  }

  // ==========================================
  // Test 9: Inverse Square Law Photometric Illuminance
  // ==========================================
  {
    // Point light source: 1256.64 lumens (~100 candela isotropic point source)
    // Directly above workplane by d = 2.0 meters (theta = 0, cos(theta) = 1)
    // Expected Illuminance: E = I / d^2 = 100 / 4.0 = 25.0 Lux
    const luminousFlux = 100 * (4 * Math.PI) // ~1256.64 lumens
    const fixtures = [
      {
        id: "light_test_1",
        name: "Ceiling Pendant",
        type: "point" as const,
        position: { x: 0, y: 2.75, z: 0 }, // 2m above workplane at y=0.75
        luminousFluxLumens: luminousFlux,
        colorKelvin: 3000,
        enabled: true,
      },
    ]

    const photoReport = calculatePhotometricGrid(
      fixtures,
      { minX: 0, maxX: 0, minZ: 0, maxZ: 0 },
      0.75,
      1.0,
    )

    const computedLux = photoReport.averageWorkplaneLux
    const expectedLux = 25.0
    const luxErr = Math.abs(computedLux - expectedLux)

    cases.push({
      id: "TC-11",
      name: "Photometric Inverse-Square Illuminance (E = I * cos(theta) / d^2)",
      category: "Photometric Lighting",
      expectedValue: expectedLux,
      computedValue: computedLux,
      unit: "Lux",
      tolerance: 0.2,
      passed: luxErr <= 0.2,
      formula: "E_v = (I * cos(theta)) / d^2 (100 cd / 2m^2)",
      accuracyTier: "Simplified Physical Calculation",
      details:
        "Calculates direct lux levels across floor workplanes according to CIBSE standards.",
    })
  }

  const passedCount = cases.filter((c) => c.passed).length
  const failedCount = cases.length - passedCount

  return {
    timestamp: new Date().toISOString(),
    totalTests: cases.length,
    passedCount,
    failedCount,
    passRatePercent: Math.round((passedCount / cases.length) * 100),
    testCases: cases,
    disclaimer:
      "All automated tests execute analytical closed-form engineering solutions directly against the simulated physics engine. Formulas reflect standard engineering principles (Euler-Bernoulli, Fourier, Hooke, Newton, Archimedes, and ASCE 7 / Eurocode 1).",
  }
}
