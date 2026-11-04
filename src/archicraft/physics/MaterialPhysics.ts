// ==========================================================================
// ARCHITECTURAL PHYSICAL MATERIAL PROPERTIES DATABASE
// Scientifically calibrated mechanical, structural, and thermal properties
// ==========================================================================

import { MaterialPhysicalProperties } from "./types"

export const PHYSICAL_MATERIALS_DATABASE: Record<string, MaterialPhysicalProperties> =
  {
    // 1. PLASTER & FINISHES
    mat_white_plaster: {
      id: "mat_white_plaster",
      name: "Architectural White Plaster",
      category: "walls",
      density: 1250, // kg/m^3 (Gypsum plaster finish)
      elasticModulus: 3.5, // GPa
      poissonsRatio: 0.2,
      compressiveStrength: 6.0, // MPa
      tensileStrength: 1.5,
      frictionStatic: 0.55,
      frictionDynamic: 0.45,
      restitution: 0.04, // Very inelastic / dead contact
      thermalConductivity: 0.48, // W/(m·K)
      specificHeat: 1000, // J/(kg·K)
      uValueStandard: 0.35, // Insulated cavity wall assembly W/(m^2·K)
    },

    // 2. CONCRETE
    mat_concrete_raw: {
      id: "mat_concrete_raw",
      name: "Formwork Raw Concrete (C25/30)",
      category: "walls",
      density: 2400, // kg/m^3 (Normal weight reinforced concrete)
      elasticModulus: 31.0, // GPa (Eurocode 2 / ACI 318)
      poissonsRatio: 0.2,
      compressiveStrength: 30.0, // MPa (28-day cylinder strength)
      tensileStrength: 2.8,
      frictionStatic: 0.65,
      frictionDynamic: 0.55,
      restitution: 0.05,
      thermalConductivity: 1.65, // W/(m·K)
      specificHeat: 880,
      uValueStandard: 0.42,
    },

    mat_polished_concrete: {
      id: "mat_polished_concrete",
      name: "Polished Industrial Concrete Slab",
      category: "floors",
      density: 2400,
      elasticModulus: 32.0,
      poissonsRatio: 0.2,
      compressiveStrength: 35.0,
      tensileStrength: 3.2,
      frictionStatic: 0.5,
      frictionDynamic: 0.4,
      restitution: 0.08,
      thermalConductivity: 1.7,
      specificHeat: 880,
      uValueStandard: 0.38,
    },

    // 3. MASONRY BRICK
    mat_brick_modern: {
      id: "mat_brick_modern",
      name: "Charcoal Modern Facing Brick",
      category: "walls",
      density: 1900, // kg/m^3
      elasticModulus: 14.0, // GPa
      poissonsRatio: 0.18,
      compressiveStrength: 20.0, // MPa
      tensileStrength: 1.8,
      frictionStatic: 0.6,
      frictionDynamic: 0.5,
      restitution: 0.05,
      thermalConductivity: 0.77, // W/(m·K)
      specificHeat: 840,
      uValueStandard: 0.3,
    },

    mat_brick_red: {
      id: "mat_brick_red",
      name: "Terracotta Facing Brick",
      category: "walls",
      density: 1850,
      elasticModulus: 12.5,
      poissonsRatio: 0.18,
      compressiveStrength: 18.0,
      tensileStrength: 1.6,
      frictionStatic: 0.62,
      frictionDynamic: 0.52,
      restitution: 0.05,
      thermalConductivity: 0.72,
      specificHeat: 840,
      uValueStandard: 0.32,
    },

    // 4. NATURAL STONE & MARBLE
    mat_stone_travertine: {
      id: "mat_stone_travertine",
      name: "Natural Travertine Stone",
      category: "walls",
      density: 2450, // kg/m^3
      elasticModulus: 38.0, // GPa
      poissonsRatio: 0.22,
      compressiveStrength: 55.0, // MPa
      tensileStrength: 4.5,
      frictionStatic: 0.55,
      frictionDynamic: 0.45,
      restitution: 0.06,
      thermalConductivity: 1.8,
      specificHeat: 900,
      uValueStandard: 0.38,
    },

    mat_marble_carrara: {
      id: "mat_marble_carrara",
      name: "Polished Carrara Marble",
      category: "floors",
      density: 2710, // kg/m^3
      elasticModulus: 52.0, // GPa
      poissonsRatio: 0.25,
      compressiveStrength: 85.0, // MPa
      tensileStrength: 7.0,
      frictionStatic: 0.42, // Polished stone is slicker
      frictionDynamic: 0.32,
      restitution: 0.08,
      thermalConductivity: 2.8,
      specificHeat: 800,
      uValueStandard: 0.45,
    },

    mat_tile_grey: {
      id: "mat_tile_grey",
      name: "Porcelain Large Format Slate Tile",
      category: "floors",
      density: 2350,
      elasticModulus: 45.0,
      poissonsRatio: 0.2,
      compressiveStrength: 90.0,
      tensileStrength: 6.0,
      frictionStatic: 0.48,
      frictionDynamic: 0.38,
      restitution: 0.07,
      thermalConductivity: 1.3,
      specificHeat: 850,
      uValueStandard: 0.4,
    },

    // 5. TIMBER & WOOD
    mat_hardwood_oak: {
      id: "mat_hardwood_oak",
      name: "Natural White Oak (Quercus alba)",
      category: "floors",
      density: 720, // kg/m^3 (seasoned structural timber)
      elasticModulus: 12.2, // GPa parallel to grain
      poissonsRatio: 0.3,
      compressiveStrength: 48.0, // MPa
      tensileStrength: 85.0,
      frictionStatic: 0.45,
      frictionDynamic: 0.35,
      restitution: 0.12,
      thermalConductivity: 0.17, // Natural insulator
      specificHeat: 1600,
      uValueStandard: 0.22,
    },

    mat_walnut_wood: {
      id: "mat_walnut_wood",
      name: "Smoked Walnut Parquet (Juglans nigra)",
      category: "floors",
      density: 640,
      elasticModulus: 11.5,
      poissonsRatio: 0.32,
      compressiveStrength: 42.0,
      tensileStrength: 75.0,
      frictionStatic: 0.45,
      frictionDynamic: 0.35,
      restitution: 0.12,
      thermalConductivity: 0.15,
      specificHeat: 1700,
      uValueStandard: 0.24,
    },

    // 6. METALS
    mat_metal_steel: {
      id: "mat_metal_steel",
      name: "Structural Structural Steel (S275/A36)",
      category: "metal",
      density: 7850, // kg/m^3
      elasticModulus: 205.0, // GPa (Standard steel stiffness)
      poissonsRatio: 0.3,
      yieldStrength: 275.0, // MPa
      tensileStrength: 430.0,
      compressiveStrength: 275.0,
      frictionStatic: 0.35,
      frictionDynamic: 0.25,
      restitution: 0.22,
      thermalConductivity: 50.0, // High conductor
      specificHeat: 490,
      uValueStandard: 5.8,
    },

    mat_metal_black: {
      id: "mat_metal_black",
      name: "Anodized Architectural Aluminum (6063-T6)",
      category: "metal",
      density: 2700, // kg/m^3
      elasticModulus: 69.0, // GPa
      poissonsRatio: 0.33,
      yieldStrength: 170.0, // MPa
      tensileStrength: 215.0,
      compressiveStrength: 170.0,
      frictionStatic: 0.35,
      frictionDynamic: 0.28,
      restitution: 0.18,
      thermalConductivity: 160.0,
      specificHeat: 900,
      uValueStandard: 4.2,
    },

    mat_metal_brass: {
      id: "mat_metal_brass",
      name: "Satin Architectural Brass (C36000)",
      category: "metal",
      density: 8500,
      elasticModulus: 100.0,
      poissonsRatio: 0.34,
      yieldStrength: 220.0,
      tensileStrength: 380.0,
      frictionStatic: 0.32,
      frictionDynamic: 0.24,
      restitution: 0.15,
      thermalConductivity: 115.0,
      specificHeat: 380,
      uValueStandard: 4.8,
    },

    // 7. ARCHITECTURAL GLASS
    mat_glass_clear: {
      id: "mat_glass_clear",
      name: "Low-Iron Double-Glazed Glass (Argon Fill)",
      category: "glass",
      density: 2500, // kg/m^3 (Soda-lime float glass)
      elasticModulus: 70.0, // GPa
      poissonsRatio: 0.22,
      tensileStrength: 45.0, // Modulus of rupture
      compressiveStrength: 1000.0,
      frictionStatic: 0.25,
      frictionDynamic: 0.18,
      restitution: 0.15,
      thermalConductivity: 1.05,
      specificHeat: 840,
      uValueStandard: 1.2, // Modern double-glazed argon unit W/(m^2·K)
    },

    mat_glass_tinted: {
      id: "mat_glass_tinted",
      name: "Solar Bronze Double-Glazed Glass",
      category: "glass",
      density: 2500,
      elasticModulus: 70.0,
      poissonsRatio: 0.22,
      tensileStrength: 45.0,
      compressiveStrength: 1000.0,
      frictionStatic: 0.25,
      frictionDynamic: 0.18,
      restitution: 0.15,
      thermalConductivity: 1.05,
      specificHeat: 840,
      uValueStandard: 1.15,
    },

    // 8. ROOFING
    mat_roof_slate: {
      id: "mat_roof_slate",
      name: "Charcoal Architectural Slate Shingles",
      category: "roofs",
      density: 2750, // kg/m^3
      elasticModulus: 45.0,
      poissonsRatio: 0.25,
      compressiveStrength: 120.0,
      tensileStrength: 25.0, // Modulus of rupture
      frictionStatic: 0.6,
      frictionDynamic: 0.5,
      restitution: 0.05,
      thermalConductivity: 2.1,
      specificHeat: 840,
      uValueStandard: 0.2, // Insulated pitched roof assembly
    },

    mat_roof_terracotta: {
      id: "mat_roof_terracotta",
      name: "Mediterranean Clay Barrel Tile",
      category: "roofs",
      density: 2000,
      elasticModulus: 20.0,
      poissonsRatio: 0.2,
      compressiveStrength: 25.0,
      tensileStrength: 3.5,
      frictionStatic: 0.58,
      frictionDynamic: 0.48,
      restitution: 0.06,
      thermalConductivity: 0.85,
      specificHeat: 920,
      uValueStandard: 0.22,
    },

    mat_roof_standing_seam: {
      id: "mat_roof_standing_seam",
      name: "Standing Seam Zinc-Titanium Roofing",
      category: "roofs",
      density: 7200, // kg/m^3 (Zinc alloy sheet)
      elasticModulus: 110.0,
      poissonsRatio: 0.31,
      yieldStrength: 150.0,
      tensileStrength: 180.0,
      frictionStatic: 0.38,
      frictionDynamic: 0.28,
      restitution: 0.14,
      thermalConductivity: 110.0,
      specificHeat: 385,
      uValueStandard: 0.18,
    },

    // 9. OUTDOOR & FLUIDS
    mat_grass_lawn: {
      id: "mat_grass_lawn",
      name: "Topsoil & Bermuda Turf Grass",
      category: "outdoor",
      density: 1400, // kg/m^3 (Moist topsoil)
      elasticModulus: 0.05, // GPa (Soil deformation)
      poissonsRatio: 0.35,
      compressiveStrength: 0.3,
      frictionStatic: 0.7,
      frictionDynamic: 0.6,
      restitution: 0.02,
      thermalConductivity: 0.8,
      specificHeat: 1500,
      uValueStandard: 0.5,
    },

    mat_water_pool: {
      id: "mat_water_pool",
      name: "Chlorinated Swimming Pool Water",
      category: "outdoor",
      density: 1000, // kg/m^3 (Water at 20°C)
      elasticModulus: 2.2, // Bulk modulus GPa
      poissonsRatio: 0.5,
      frictionStatic: 0.05,
      frictionDynamic: 0.01,
      restitution: 0.01,
      thermalConductivity: 0.6, // W/(m·K)
      specificHeat: 4184, // J/(kg·K) High thermal mass
      uValueStandard: 1.5,
    },

    mat_patio_pavers: {
      id: "mat_patio_pavers",
      name: "Thermal Bluestone Pavers",
      category: "outdoor",
      density: 2600,
      elasticModulus: 35.0,
      poissonsRatio: 0.22,
      compressiveStrength: 80.0,
      tensileStrength: 6.0,
      frictionStatic: 0.62,
      frictionDynamic: 0.52,
      restitution: 0.06,
      thermalConductivity: 2.3,
      specificHeat: 880,
      uValueStandard: 0.4,
    },
  }

// Fallback lookup
export function getPhysicalMaterial(
  materialId: string,
): MaterialPhysicalProperties {
  return (
    PHYSICAL_MATERIALS_DATABASE[materialId] ||
    PHYSICAL_MATERIALS_DATABASE["mat_concrete_raw"]
  )
}

export const MATERIAL_PHYSICS_DATABASE = PHYSICAL_MATERIALS_DATABASE
export const DEFAULT_MATERIAL_PHYSICS =
  PHYSICAL_MATERIALS_DATABASE["mat_concrete_raw"]
