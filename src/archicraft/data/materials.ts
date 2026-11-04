import { MaterialDef } from '../types/studio';

export const ARCHITECTURAL_MATERIALS: MaterialDef[] = [
  // Walls
  {
    id: 'mat_white_plaster',
    name: 'Architectural White Plaster',
    category: 'walls',
    color: '#f3f4f6',
    roughness: 0.85,
    metalness: 0.05,
    texturePattern: 'none'
  },
  {
    id: 'mat_concrete_raw',
    name: 'Formwork Raw Concrete',
    category: 'walls',
    color: '#9ca3af',
    roughness: 0.9,
    metalness: 0.1,
    texturePattern: 'concrete',
    textureScale: 2
  },
  {
    id: 'mat_brick_modern',
    name: 'Charcoal Modern Brick',
    category: 'walls',
    color: '#374151',
    roughness: 0.8,
    metalness: 0.05,
    texturePattern: 'brick',
    textureScale: 3
  },
  {
    id: 'mat_brick_red',
    name: 'Terracotta Facing Brick',
    category: 'walls',
    color: '#991b1b',
    roughness: 0.85,
    metalness: 0.05,
    texturePattern: 'brick',
    textureScale: 3
  },
  {
    id: 'mat_stone_travertine',
    name: 'Natural Travertine Stone',
    category: 'walls',
    color: '#e2d9cc',
    roughness: 0.75,
    metalness: 0.08,
    texturePattern: 'marble',
    textureScale: 2
  },
  {
    id: 'mat_accent_navy',
    name: 'Nordic Navy Accent Paint',
    category: 'walls',
    color: '#1e293b',
    roughness: 0.65,
    metalness: 0.05,
    texturePattern: 'none'
  },
  {
    id: 'mat_accent_warm_beige',
    name: 'Warm Cashmere Paint',
    category: 'walls',
    color: '#d6cbbe',
    roughness: 0.75,
    metalness: 0.02,
    texturePattern: 'none'
  },

  // Floors
  {
    id: 'mat_hardwood_oak',
    name: 'Natural White Oak Flooring',
    category: 'floors',
    color: '#c29b6b',
    roughness: 0.45,
    metalness: 0.05,
    texturePattern: 'wood',
    textureScale: 2.5
  },
  {
    id: 'mat_walnut_wood',
    name: 'Smoked Walnut Parquet',
    category: 'floors',
    color: '#573d2b',
    roughness: 0.4,
    metalness: 0.08,
    texturePattern: 'wood',
    textureScale: 2
  },
  {
    id: 'mat_marble_carrara',
    name: 'Polished Carrara Marble',
    category: 'floors',
    color: '#f8fafc',
    roughness: 0.15,
    metalness: 0.1,
    texturePattern: 'marble',
    textureScale: 1.5
  },
  {
    id: 'mat_tile_grey',
    name: 'Porcelain Large Format Slate Tile',
    category: 'floors',
    color: '#4b5563',
    roughness: 0.5,
    metalness: 0.1,
    texturePattern: 'tile',
    textureScale: 2
  },
  {
    id: 'mat_polished_concrete',
    name: 'Polished Industrial Concrete',
    category: 'floors',
    color: '#6b7280',
    roughness: 0.3,
    metalness: 0.15,
    texturePattern: 'concrete',
    textureScale: 2
  },

  // Glass
  {
    id: 'mat_glass_clear',
    name: 'Low-Iron Architectural Glass',
    category: 'glass',
    color: '#e0f2fe',
    roughness: 0.05,
    metalness: 0.2,
    opacity: 0.35,
    transparent: true
  },
  {
    id: 'mat_glass_tinted',
    name: 'Solar Bronze Tinted Glass',
    category: 'glass',
    color: '#1e293b',
    roughness: 0.08,
    metalness: 0.3,
    opacity: 0.55,
    transparent: true
  },

  // Metal
  {
    id: 'mat_metal_black',
    name: 'Matte Anodized Black Aluminum',
    category: 'metal',
    color: '#18181b',
    roughness: 0.35,
    metalness: 0.85
  },
  {
    id: 'mat_metal_steel',
    name: 'Brushed Stainless Steel',
    category: 'metal',
    color: '#cbd5e1',
    roughness: 0.25,
    metalness: 0.9
  },
  {
    id: 'mat_metal_brass',
    name: 'Satin Architectural Brass',
    category: 'metal',
    color: '#d4af37',
    roughness: 0.3,
    metalness: 0.8
  },

  // Roofs
  {
    id: 'mat_roof_slate',
    name: 'Charcoal Architectural Shingles',
    category: 'roofs',
    color: '#262e3b',
    roughness: 0.8,
    metalness: 0.1,
    texturePattern: 'slate',
    textureScale: 3
  },
  {
    id: 'mat_roof_terracotta',
    name: 'Mediterranean Clay Tile',
    category: 'roofs',
    color: '#b45309',
    roughness: 0.7,
    metalness: 0.05,
    texturePattern: 'tile',
    textureScale: 2.5
  },
  {
    id: 'mat_roof_standing_seam',
    name: 'Standing Seam Zinc Metal Roof',
    category: 'roofs',
    color: '#475569',
    roughness: 0.35,
    metalness: 0.7
  },

  // Outdoor
  {
    id: 'mat_grass_lawn',
    name: 'Manicured Bermuda Grass',
    category: 'outdoor',
    color: '#15803d',
    roughness: 0.95,
    metalness: 0.0
  },
  {
    id: 'mat_water_pool',
    name: 'Crystal Turquoise Pool Water',
    category: 'outdoor',
    color: '#06b6d4',
    roughness: 0.1,
    metalness: 0.1,
    opacity: 0.75,
    transparent: true
  },
  {
    id: 'mat_patio_pavers',
    name: 'Thermal Bluestone Pavers',
    category: 'outdoor',
    color: '#64748b',
    roughness: 0.7,
    metalness: 0.05,
    texturePattern: 'tile'
  }
];

export const getMaterialById = (id: string): MaterialDef => {
  return ARCHITECTURAL_MATERIALS.find(m => m.id === id) || ARCHITECTURAL_MATERIALS[0];
};
