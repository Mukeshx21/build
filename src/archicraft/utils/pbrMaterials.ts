import * as THREE from "three"
import { MaterialDef } from "../types/studio"
import { getMaterialById } from "../data/materials"

// Cached procedural canvas textures
const textureCache: Record<string, THREE.CanvasTexture> = {}

// Helper: generate Perlin-like 2D noise / procedural patterns onto HTML5 Canvas
function createProceduralTexture(type: string): THREE.CanvasTexture {
  if (textureCache[type]) {
    return textureCache[type]
  }

  const canvas = document.createElement("canvas")
  canvas.width = 512
  canvas.height = 512
  const ctx = canvas.getContext("2d")
  if (!ctx) {
    const dummy = new THREE.CanvasTexture(canvas)
    return dummy
  }

  const imgData = ctx.createImageData(512, 512)
  const data = imgData.data

  switch (type) {
    case "concrete": {
      // Formwork concrete: subtle porous grain, fine stipple, micro aggregate
      for (let y = 0; y < 512; y++) {
        for (let x = 0; x < 512; x++) {
          const idx = (y * 512 + x) * 4
          const n1 = Math.sin(x * 0.08) * Math.cos(y * 0.08) * 12
          const n2 = (Math.random() - 0.5) * 36
          const pore = Math.random() > 0.985 ? -40 : 0
          const val = Math.min(255, Math.max(0, 160 + n1 + n2 + pore))
          data[idx] = val
          data[idx + 1] = val
          data[idx + 2] = val
          data[idx + 3] = 255
        }
      }
      break
    }

    case "wood": {
      // Hardwood plank joints and organic grain
      const plankCount = 8
      const plankH = 512 / plankCount
      for (let y = 0; y < 512; y++) {
        const plankIdx = Math.floor(y / plankH)
        const plankY = y % plankH
        // Edge joint groove
        const isJoint = plankY < 3 || plankY > plankH - 3
        const plankTone = ((plankIdx * 37) % 30) - 15

        for (let x = 0; x < 512; x++) {
          const idx = (y * 512 + x) * 4
          if (isJoint) {
            data[idx] = 60
            data[idx + 1] = 60
            data[idx + 2] = 60
            data[idx + 3] = 255
          } else {
            // Wood fiber streaks + rings
            const wave = Math.sin(x * 0.015 + Math.sin(y * 0.04) * 2.2) * 25
            const grain = (Math.random() - 0.5) * 12
            const val = Math.min(
              255,
              Math.max(0, 150 + wave + grain + plankTone),
            )
            data[idx] = val
            data[idx + 1] = val
            data[idx + 2] = val
            data[idx + 3] = 255
          }
        }
      }
      break
    }

    case "slate": {
      // Architectural slate roof shingles: horizontal courses, staggered vertical butts, chisel relief
      const rowCount = 16
      const rowH = 512 / rowCount
      for (let y = 0; y < 512; y++) {
        const rowIdx = Math.floor(y / rowH)
        const rowY = y % rowH
        const isBottomLip = rowY > rowH - 4
        const colW = 64
        const offsetX = (rowIdx % 2) * (colW / 2)

        for (let x = 0; x < 512; x++) {
          const idx = (y * 512 + x) * 4
          const colX = (x + offsetX) % colW
          const isButtJoint = colX < 3

          if (isBottomLip) {
            // Drop shadow relief under each shingle course
            data[idx] = 40
            data[idx + 1] = 40
            data[idx + 2] = 40
            data[idx + 3] = 255
          } else if (isButtJoint) {
            data[idx] = 60
            data[idx + 1] = 60
            data[idx + 2] = 60
            data[idx + 3] = 255
          } else {
            // Chiseled natural slate texture
            const slateGrain =
              (Math.random() - 0.5) * 20 + Math.sin(x * 0.2) * 6
            const courseTone = ((rowIdx * 19) % 20) - 10
            const val = Math.min(
              255,
              Math.max(0, 140 + slateGrain + courseTone),
            )
            data[idx] = val
            data[idx + 1] = val
            data[idx + 2] = val
            data[idx + 3] = 255
          }
        }
      }
      break
    }

    case "brick": {
      // Running-bond masonry brick course with recessed mortar grooves
      const rowH = 32
      const colW = 64
      for (let y = 0; y < 512; y++) {
        const rowIdx = Math.floor(y / rowH)
        const rowY = y % rowH
        const isHorizMortar = rowY < 4 || rowY > rowH - 4
        const offsetX = (rowIdx % 2) * (colW / 2)

        for (let x = 0; x < 512; x++) {
          const idx = (y * 512 + x) * 4
          const colX = (x + offsetX) % colW
          const isVertMortar = colX < 4

          if (isHorizMortar || isVertMortar) {
            // Recessed mortar line
            data[idx] = 70
            data[idx + 1] = 70
            data[idx + 2] = 70
            data[idx + 3] = 255
          } else {
            // Clay brick sand finish
            const brickTexture = (Math.random() - 0.5) * 28
            const val = Math.min(255, Math.max(0, 160 + brickTexture))
            data[idx] = val
            data[idx + 1] = val
            data[idx + 2] = val
            data[idx + 3] = 255
          }
        }
      }
      break
    }

    case "tile": {
      // Large format architectural grid pavers
      const tileSize = 64
      for (let y = 0; y < 512; y++) {
        const isYJoint = y % tileSize < 3
        for (let x = 0; x < 512; x++) {
          const idx = (y * 512 + x) * 4
          const isXJoint = x % tileSize < 3
          if (isYJoint || isXJoint) {
            data[idx] = 60
            data[idx + 1] = 60
            data[idx + 2] = 60
            data[idx + 3] = 255
          } else {
            const paverGrain = (Math.random() - 0.5) * 16
            const val = Math.min(255, Math.max(0, 160 + paverGrain))
            data[idx] = val
            data[idx + 1] = val
            data[idx + 2] = val
            data[idx + 3] = 255
          }
        }
      }
      break
    }

    case "marble": {
      // Natural Carrara / Travertine veining
      for (let y = 0; y < 512; y++) {
        for (let x = 0; x < 512; x++) {
          const idx = (y * 512 + x) * 4
          const vein1 = Math.abs(
            Math.sin(x * 0.02 + y * 0.015 + Math.sin(y * 0.05) * 2.5),
          )
          const vein2 = Math.abs(
            Math.sin(x * 0.04 - y * 0.02 + Math.cos(x * 0.03) * 1.8),
          )
          const v = Math.min(1, Math.pow(vein1 * 0.7 + vein2 * 0.3, 3))
          const val = Math.min(
            255,
            Math.max(0, 240 - v * 90 + (Math.random() - 0.5) * 8),
          )
          data[idx] = val
          data[idx + 1] = val
          data[idx + 2] = val
          data[idx + 3] = 255
        }
      }
      break
    }

    case "water_normal": {
      // Normal map for architectural pool water ripple caustics
      for (let y = 0; y < 512; y++) {
        for (let x = 0; x < 512; x++) {
          const idx = (y * 512 + x) * 4
          // Calculate slope of wave interference pattern
          const dx = Math.cos(x * 0.08) * 0.4 + Math.sin((x + y) * 0.05) * 0.3
          const dy = Math.sin(y * 0.08) * 0.4 + Math.cos((x - y) * 0.05) * 0.3
          // Normal vector encoding: R = Nx, G = Ny, B = Nz
          data[idx] = Math.floor((dx * 0.5 + 0.5) * 255)
          data[idx + 1] = Math.floor((dy * 0.5 + 0.5) * 255)
          data[idx + 2] = 240
          data[idx + 3] = 255
        }
      }
      break
    }

    case "grass": {
      // Bermuda lawn grass stipple texture
      for (let y = 0; y < 512; y++) {
        for (let x = 0; x < 512; x++) {
          const idx = (y * 512 + x) * 4
          const bladeNoise = (Math.random() - 0.5) * 45
          const clump = Math.sin(x * 0.1) * Math.cos(y * 0.1) * 15
          const val = Math.min(255, Math.max(0, 150 + bladeNoise + clump))
          data[idx] = val
          data[idx + 1] = val
          data[idx + 2] = val
          data[idx + 3] = 255
        }
      }
      break
    }

    default: {
      // Subtle neutral aggregate noise
      for (let i = 0; i < data.length; i += 4) {
        const val = 128 + Math.floor((Math.random() - 0.5) * 20)
        data[i] = val
        data[i + 1] = val
        data[i + 2] = val
        data[i + 3] = 255
      }
      break
    }
  }

  ctx.putImageData(imgData, 0, 0)

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.colorSpace = THREE.LinearSRGBColorSpace
  textureCache[type] = texture
  return texture
}

// Global material cache keyed by materialId and wireframe
const materialCache: Record<string, THREE.Material> = {}

export function createRealisticPbrMaterial(
  materialId: string,
  wireframe: boolean = false,
): THREE.Material {
  const cacheKey = `${materialId}_${wireframe ? "w" : "s"}`
  if (materialCache[cacheKey]) {
    return materialCache[cacheKey]
  }

  const def: MaterialDef = getMaterialById(materialId)

  // 1. ARCHITECTURAL GLASS (Physical glass with real-world transmission & index of refraction)
  if (def.category === "glass") {
    const isTinted = def.id.includes("tinted")
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(def.color),
      transmission: isTinted ? 0.75 : 0.92, // Real light transmission
      opacity: 1.0,
      transparent: true,
      roughness: isTinted ? 0.08 : 0.03,
      metalness: 0.05,
      ior: 1.52, // Architectural float glass IOR
      reflectivity: 0.9,
      thickness: 0.12, // Glass panel thickness for refractive depth
      specularIntensity: 1.0,
      specularColor: new THREE.Color("#ffffff"),
      wireframe: wireframe,
      side: THREE.DoubleSide,
    })
    materialCache[cacheKey] = glassMat
    return glassMat
  }

  // 2. SWIMMING POOL WATER (Translucent volume with wave normal caustics)
  if (def.id === "mat_water_pool") {
    const waterNormal = createProceduralTexture("water_normal")
    waterNormal.repeat.set(4, 4)

    const waterMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(def.color),
      transmission: 0.82,
      transparent: true,
      opacity: 0.85,
      roughness: 0.06,
      metalness: 0.02,
      ior: 1.333, // Water IOR
      thickness: 1.2,
      normalMap: waterNormal,
      normalScale: new THREE.Vector2(0.25, 0.25),
      wireframe: wireframe,
      side: THREE.DoubleSide,
    })
    materialCache[cacheKey] = waterMat
    return waterMat
  }

  // 3. ARCHITECTURAL METALS (Black Anodized Aluminum, Brushed Stainless Steel, Satin Brass)
  if (def.category === "metal") {
    const metalMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(def.color),
      metalness: def.metalness ?? 0.85,
      roughness: def.roughness ?? 0.28,
      wireframe: wireframe,
      side: THREE.DoubleSide,
    })
    materialCache[cacheKey] = metalMat
    return metalMat
  }

  // 4. MASONRY, WOOD, ROOF TILES, CONCRETE, STONE, GRASS
  const patternType =
    def.texturePattern || (def.category === "roofs" ? "slate" : "none")
  let bumpMap: THREE.Texture | null = null
  let bumpScale = 0.02

  if (patternType === "concrete") {
    bumpMap = createProceduralTexture("concrete")
    bumpScale = 0.015
    bumpMap.repeat.set(def.textureScale || 3, def.textureScale || 3)
  } else if (patternType === "wood") {
    bumpMap = createProceduralTexture("wood")
    bumpScale = 0.025
    bumpMap.repeat.set(def.textureScale || 2.5, def.textureScale || 2.5)
  } else if (patternType === "slate") {
    bumpMap = createProceduralTexture("slate")
    bumpScale = 0.04
    bumpMap.repeat.set(def.textureScale || 3, def.textureScale || 3)
  } else if (patternType === "brick") {
    bumpMap = createProceduralTexture("brick")
    bumpScale = 0.035
    bumpMap.repeat.set(def.textureScale || 3, def.textureScale || 3)
  } else if (patternType === "tile") {
    bumpMap = createProceduralTexture("tile")
    bumpScale = 0.025
    bumpMap.repeat.set(def.textureScale || 2, def.textureScale || 2)
  } else if (patternType === "marble") {
    bumpMap = createProceduralTexture("marble")
    bumpScale = 0.01
    bumpMap.repeat.set(def.textureScale || 2, def.textureScale || 2)
  } else if (def.id === "mat_grass_lawn") {
    bumpMap = createProceduralTexture("grass")
    bumpScale = 0.03
    bumpMap.repeat.set(6, 6)
  }

  const standardMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(def.color),
    roughness: Math.max(0.04, def.roughness),
    metalness: def.metalness || 0.04,
    bumpMap: bumpMap,
    bumpScale: bumpScale,
    wireframe: wireframe,
    side: THREE.DoubleSide,
  })

  materialCache[cacheKey] = standardMat
  return standardMat
}
