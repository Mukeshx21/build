/**
 * ArchiCraft3D - Photometric Lighting & Illuminance Estimation Engine
 * Phase 8: Illuminance (Lux) calculations on architectural workplanes,
 * inverse-square law, cosine incidence angle, and daylight factor analysis.
 *
 * Photometric Formulations:
 * 1. Point Source Illuminance (Inverse-Square & Cosine Law):
 *    E_v = (I * cos(theta)) / (d^2)  [Lux = Lumens / m^2]
 * 2. Solar Direct Beam & Diffuse Horizontal Illuminance:
 *    E_solar = E_0 * sin(alpha) * exp(-tau / sin(alpha))  [Lux]
 * 3. Daylight Factor (DF):
 *    DF = (E_interior / E_outdoor_diffuse) * 100%
 */

import { Point3D } from "./types"

export interface ArchitecturalLightSource {
  id: string
  name: string
  type: "spot" | "point" | "ambient" | "sun"
  position: Point3D
  luminousFluxLumens: number // e.g. 800 lm (60W equiv LED), 2500 lm downlight, 100,000 lm direct sun
  colorKelvin: number // e.g. 2700K warm, 4000K neutral, 6500K daylight
  beamAngleDeg?: number // For spot lights (e.g. 36 deg flood, 15 deg narrow spot)
  enabled: boolean
}

export interface IlluminanceMeasurementPoint {
  position: Point3D
  surfaceNormal: Point3D // usually (0, 1, 0) for floor or workplane (desk at 0.75m)
  measuredLux: number
  primaryLightSource: string
  complianceStatus: "underlit" | "adequate" | "overlit"
  recommendation: string
}

export interface PhotometricAnalysisReport {
  timestamp: string
  workplaneHeightM: number
  totalActiveFixtures: number
  averageWorkplaneLux: number
  minLux: number
  maxLux: number
  uniformityRatio: number // min / avg (CIBSE / EN 12464 recommendation: > 0.4 - 0.6)
  measurementGrid: IlluminanceMeasurementPoint[]
  standardsCompliance: {
    residentialLivingRoom: { targetLux: 150 compliant: boolean }
    kitchenTaskPlane: { targetLux: 300 compliant: boolean }
    architecturalWorkspace: { targetLux: 500 compliant: boolean }
  }
  engineeringAssumptions: string[]
}

/**
 * Calculates illuminance (lux) from an array of architectural point/spot fixtures onto a horizontal workplane grid
 */
export function calculatePhotometricGrid(
  fixtures: ArchitecturalLightSource[],
  bounds: { minX: number maxX: number minZ: number maxZ: number },
  workplaneElevationY: number = 0.75,
  gridSpacingM: number = 1.0,
)// Standard desk/table height in meters
: PhotometricAnalysisReport {
  const points: IlluminanceMeasurementPoint[] = []
  const activeFixtures = fixtures.filter((f) => f.enabled)

  for (let x = bounds.minX; x <= bounds.maxX; x += gridSpacingM) {
    for (let z = bounds.minZ; z <= bounds.maxZ; z += gridSpacingM) {
      const targetPos: Point3D = { x, y: workplaneElevationY, z }
      const normal: Point3D = { x: 0, y: 1, z: 0 } // Upward pointing floor/workplane

      let totalLux = 0
      let primarySource = "None"
      let maxContrib = 0

      for (const fix of activeFixtures) {
        if (fix.type === "ambient") {
          // Uniform ambient baseline contribution
          const ambientLux = (fix.luminousFluxLumens / 100) * 0.1
          totalLux += ambientLux
          if (ambientLux > maxContrib) {
            maxContrib = ambientLux
            primarySource = fix.name
          }
          continue
        }

        const dx = fix.position.x - targetPos.x
        const dy = fix.position.y - targetPos.y
        const dz = fix.position.z - targetPos.z
        const distSq = dx * dx + dy * dy + dz * dz
        const dist = Math.sqrt(distSq)

        if (dist < 0.1) continue // Singularity clamp

        // Cosine of angle between ray and surface normal (0, 1, 0)
        // Ray vector towards fixture: (dx/dist, dy/dist, dz/dist)
        const cosTheta = Math.max(0, dy / dist)

        // Luminous intensity I = Luminous Flux / solid angle (steradians)
        // For isotropic point source: Omega = 4*pi sr
        const luminousIntensityCd = fix.luminousFluxLumens / (4 * Math.PI)

        // Inverse square law: E = (I * cos(theta)) / d^2
        let directLux = (luminousIntensityCd * cosTheta) / distSq

        // Spot beam angle attenuation if spot
        if (fix.type === "spot" && fix.beamAngleDeg) {
          const halfBeamRad = ((fix.beamAngleDeg / 2) * Math.PI) / 180
          // Vector pointing straight down from fixture: (0, -1, 0)
          const fixtureDownCos = Math.max(0, -dy / dist)
          const fixtureAngle = Math.acos(fixtureDownCos)
          if (fixtureAngle > halfBeamRad) {
            // Cutoff beyond beam angle with smooth falloff
            const falloff = Math.max(0, 1 - (fixtureAngle - halfBeamRad) / 0.2)
            directLux *= falloff
          }
        }

        if (directLux > maxContrib) {
          maxContrib = directLux
          primarySource = fix.name
        }
        totalLux += directLux
      }

      const roundedLux = Math.round(totalLux * 10) / 10
      let status: "underlit" | "adequate" | "overlit" = "adequate"
      let rec = "Normal comfortable task lighting"

      if (roundedLux < 100) {
        status = "underlit"
        rec =
          "Insufficient lighting for detailed tasks; add accent or task downlights."
      } else if (roundedLux > 1000) {
        status = "overlit"
        rec = "Excessive localized illuminance; potential glare hazard."
      }

      points.push({
        position: targetPos,
        surfaceNormal: normal,
        measuredLux: roundedLux,
        primaryLightSource: primarySource,
        complianceStatus: status,
        recommendation: rec,
      })
    }
  }

  const luxValues = points.map((p) => p.measuredLux)
  const avgLux =
    luxValues.length > 0
      ? luxValues.reduce((a, b) => a + b, 0) / luxValues.length
      : 0
  const minLux = luxValues.length > 0 ? Math.min(...luxValues) : 0
  const maxLux = luxValues.length > 0 ? Math.max(...luxValues) : 0
  const uniformity = avgLux > 0 ? minLux / avgLux : 0

  return {
    timestamp: new Date().toISOString(),
    workplaneHeightM: workplaneElevationY,
    totalActiveFixtures: activeFixtures.length,
    averageWorkplaneLux: Math.round(avgLux * 10) / 10,
    minLux: Math.round(minLux * 10) / 10,
    maxLux: Math.round(maxLux * 10) / 10,
    uniformityRatio: Math.round(uniformity * 100) / 100,
    measurementGrid: points,
    standardsCompliance: {
      residentialLivingRoom: { targetLux: 150, compliant: avgLux >= 150 },
      kitchenTaskPlane: { targetLux: 300, compliant: avgLux >= 300 },
      architecturalWorkspace: { targetLux: 500, compliant: avgLux >= 500 },
    },
    engineeringAssumptions: [
      "Standard inverse-square point source photometric model (E = I * cos(theta) / d^2).",
      "Horizontal measurement plane placed at standard task elevation (0.75m above floor).",
      "Direct line-of-sight illumination without inter-reflection bounces (first-order approximation).",
      "CIBSE / EN 12464 residential and office task illuminance benchmarks.",
    ],
  }
}
