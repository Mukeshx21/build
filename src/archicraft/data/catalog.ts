export interface CatalogItem {
  id: string;
  name: string;
  category: string;
  type: 'door' | 'window' | 'furniture' | 'column' | 'stair' | 'roof' | 'landscape';
  subType?: string;
  thumbnailIcon: string;
  dimensions: { width: number; height: number; depth: number };
  defaultMaterialId: string;
  description: string;
}

export const CATALOG_DOORS: CatalogItem[] = [
  {
    id: 'door_single',
    name: 'Interior Flush Door',
    category: 'doors',
    type: 'door',
    subType: 'single',
    thumbnailIcon: 'DoorClosed',
    dimensions: { width: 0.9, height: 2.1, depth: 0.1 },
    defaultMaterialId: 'mat_hardwood_oak',
    description: 'Standard modern flush interior timber door with brushed handle.'
  },
  {
    id: 'door_entry_double',
    name: 'Modern Grand Double Door',
    category: 'doors',
    type: 'door',
    subType: 'double',
    thumbnailIcon: 'Columns2',
    dimensions: { width: 1.8, height: 2.4, depth: 0.12 },
    defaultMaterialId: 'mat_walnut_wood',
    description: 'Luxury double entrance pivot door with long stainless pull bar.'
  },
  {
    id: 'door_sliding_glass',
    name: 'Panoramic Sliding Glass Door',
    category: 'doors',
    type: 'door',
    subType: 'sliding',
    thumbnailIcon: 'Maximize2',
    dimensions: { width: 2.6, height: 2.3, depth: 0.1 },
    defaultMaterialId: 'mat_glass_clear',
    description: 'Floor-to-ceiling aluminum-framed sliding patio doors for seamless outdoor living.'
  },
  {
    id: 'door_archway',
    name: 'Open Architectural Archway',
    category: 'doors',
    type: 'door',
    subType: 'arch',
    thumbnailIcon: 'Sparkles',
    dimensions: { width: 1.2, height: 2.3, depth: 0.2 },
    defaultMaterialId: 'mat_white_plaster',
    description: 'Cased wall opening without door panel for flowing room transitions.'
  }
];

export const CATALOG_WINDOWS: CatalogItem[] = [
  {
    id: 'win_casement',
    name: 'Modern Casement Window',
    category: 'windows',
    type: 'window',
    subType: 'casement',
    thumbnailIcon: 'Square',
    dimensions: { width: 1.2, height: 1.4, depth: 0.1 },
    defaultMaterialId: 'mat_glass_clear',
    description: 'Black slimline frame standard bedroom or living room window.'
  },
  {
    id: 'win_picture_large',
    name: 'Panoramic Picture Window',
    category: 'windows',
    type: 'window',
    subType: 'picture',
    thumbnailIcon: 'AppWindow',
    dimensions: { width: 2.2, height: 1.6, depth: 0.1 },
    defaultMaterialId: 'mat_glass_clear',
    description: 'Expansive uninterrupted fixed glazing for stunning exterior views.'
  },
  {
    id: 'win_floor_to_ceiling',
    name: 'Floor-to-Ceiling Curtain Wall',
    category: 'windows',
    type: 'window',
    subType: 'floor-to-ceiling',
    thumbnailIcon: 'Maximize',
    dimensions: { width: 2.8, height: 2.7, depth: 0.12 },
    defaultMaterialId: 'mat_glass_clear',
    description: 'High-end architectural glazed wall module reaching full ceiling height.'
  },
  {
    id: 'win_horizontal_slot',
    name: 'Horizontal Ribbon Window',
    category: 'windows',
    type: 'window',
    subType: 'ribbon',
    thumbnailIcon: 'Minus',
    dimensions: { width: 2.4, height: 0.6, depth: 0.1 },
    defaultMaterialId: 'mat_glass_clear',
    description: 'Clerestory or kitchen backsplash horizontal accent window.'
  }
];

export const CATALOG_FURNITURE: CatalogItem[] = [
  // Living
  {
    id: 'furn_sofa_modern_3seat',
    name: 'Nordic 3-Seater Sofa',
    category: 'living',
    type: 'furniture',
    subType: 'sofa_modern',
    thumbnailIcon: 'Armchair',
    dimensions: { width: 2.4, height: 0.8, depth: 0.95 },
    defaultMaterialId: 'mat_accent_navy',
    description: 'Upholstered minimalist designer sofa with soft cushions.'
  },
  {
    id: 'furn_sectional_sofa',
    name: 'L-Shaped Sectional Lounge',
    category: 'living',
    type: 'furniture',
    subType: 'sectional_sofa',
    thumbnailIcon: 'Layout',
    dimensions: { width: 3.0, height: 0.8, depth: 2.2 },
    defaultMaterialId: 'mat_accent_warm_beige',
    description: 'Spacious corner sectional couch for luxury family living.'
  },
  {
    id: 'furn_coffee_table',
    name: 'Minimalist Marble Coffee Table',
    category: 'living',
    type: 'furniture',
    subType: 'coffee_table',
    thumbnailIcon: 'Square',
    dimensions: { width: 1.2, height: 0.42, depth: 0.7 },
    defaultMaterialId: 'mat_marble_carrara',
    description: 'Polished marble slab low table with matte black metal frame.'
  },
  {
    id: 'furn_tv_console',
    name: 'Media Console & 65" Display',
    category: 'living',
    type: 'furniture',
    subType: 'tv_console',
    thumbnailIcon: 'Tv',
    dimensions: { width: 2.2, height: 1.3, depth: 0.45 },
    defaultMaterialId: 'mat_walnut_wood',
    description: 'Floating wood media console with ultra-thin architectural television.'
  },

  // Bedroom
  {
    id: 'furn_bed_king',
    name: 'Master Suite King Bed',
    category: 'bedroom',
    type: 'furniture',
    subType: 'bed_king',
    thumbnailIcon: 'BedDouble',
    dimensions: { width: 2.0, height: 1.1, depth: 2.2 },
    defaultMaterialId: 'mat_accent_warm_beige',
    description: 'King size designer bed with upholstered headboard, pillows, and soft duvet.'
  },
  {
    id: 'furn_nightstand',
    name: 'Cantilever Nightstand (Pair)',
    category: 'bedroom',
    type: 'furniture',
    subType: 'nightstand',
    thumbnailIcon: 'Box',
    dimensions: { width: 0.55, height: 0.5, depth: 0.4 },
    defaultMaterialId: 'mat_walnut_wood',
    description: 'Minimalist bedside drawer tables.'
  },
  {
    id: 'furn_wardrobe',
    name: 'Built-in Master Wardrobe',
    category: 'bedroom',
    type: 'furniture',
    subType: 'wardrobe',
    thumbnailIcon: 'Columns3',
    dimensions: { width: 2.4, height: 2.4, depth: 0.65 },
    defaultMaterialId: 'mat_white_plaster',
    description: 'Floor-to-ceiling built-in closet with smoked glass and handle details.'
  },

  // Dining
  {
    id: 'furn_dining_set',
    name: '8-Person Oak Dining Table & Chairs',
    category: 'dining',
    type: 'furniture',
    subType: 'dining_table',
    thumbnailIcon: 'Utensils',
    dimensions: { width: 2.2, height: 0.76, depth: 1.0 },
    defaultMaterialId: 'mat_hardwood_oak',
    description: 'Solid timber dining table surrounded by 6-8 contemporary chairs.'
  },

  // Kitchen
  {
    id: 'furn_kitchen_island',
    name: 'Waterfall Marble Kitchen Island',
    category: 'kitchen',
    type: 'furniture',
    subType: 'kitchen_island',
    thumbnailIcon: 'Layers',
    dimensions: { width: 2.6, height: 0.92, depth: 1.1 },
    defaultMaterialId: 'mat_marble_carrara',
    description: 'Luxury island with waterfall countertop, breakfast bar, and sink.'
  },
  {
    id: 'furn_kitchen_cabinets',
    name: 'High Kitchen Cabinetry & Range',
    category: 'kitchen',
    type: 'furniture',
    subType: 'kitchen_counter',
    thumbnailIcon: 'Grid',
    dimensions: { width: 3.2, height: 2.4, depth: 0.65 },
    defaultMaterialId: 'mat_metal_black',
    description: 'Full height cabinetry with integrated cooktop, extractor, and double oven.'
  },

  // Bathroom
  {
    id: 'furn_bath_vanity',
    name: 'Floating Double Vanity & Mirrors',
    category: 'bathroom',
    type: 'furniture',
    subType: 'bath_vanity',
    thumbnailIcon: 'Sparkle',
    dimensions: { width: 1.6, height: 1.8, depth: 0.55 },
    defaultMaterialId: 'mat_white_plaster',
    description: 'Wall-mounted dual basin vanity with backlight mirrors and brass faucets.'
  },
  {
    id: 'furn_bath_tub',
    name: 'Freestanding Oval Soaking Tub',
    category: 'bathroom',
    type: 'furniture',
    subType: 'bath_tub',
    thumbnailIcon: 'Bath',
    dimensions: { width: 1.75, height: 0.6, depth: 0.8 },
    defaultMaterialId: 'mat_white_plaster',
    description: 'Sculptural matte white freestanding bathtub with floor-mounted mixer.'
  },

  // Office
  {
    id: 'furn_office_desk',
    name: 'Architect Executive Desk & Chair',
    category: 'office',
    type: 'furniture',
    subType: 'office_desk',
    thumbnailIcon: 'Briefcase',
    dimensions: { width: 1.8, height: 0.76, depth: 0.85 },
    defaultMaterialId: 'mat_walnut_wood',
    description: 'Cantilever executive desk with leather swivel chair and computer screen.'
  }
];

export const CATALOG_COLUMNS: CatalogItem[] = [
  {
    id: 'col_square_concrete',
    name: 'Square Structural Concrete Column',
    category: 'columns',
    type: 'column',
    subType: 'square',
    thumbnailIcon: 'Square',
    dimensions: { width: 0.4, height: 3.0, depth: 0.4 },
    defaultMaterialId: 'mat_concrete_raw',
    description: 'Load-bearing square concrete pillar.'
  },
  {
    id: 'col_round_pillar',
    name: 'Round Architectural Pillar',
    category: 'columns',
    type: 'column',
    subType: 'round',
    thumbnailIcon: 'Circle',
    dimensions: { width: 0.4, height: 3.0, depth: 0.4 },
    defaultMaterialId: 'mat_white_plaster',
    description: 'Smooth cylindrical architectural column.'
  },
  {
    id: 'col_steel_i_beam',
    name: 'Steel I-Beam Column',
    category: 'columns',
    type: 'column',
    subType: 'steel-i',
    thumbnailIcon: 'AlignCenter',
    dimensions: { width: 0.35, height: 3.0, depth: 0.35 },
    defaultMaterialId: 'mat_metal_black',
    description: 'Exposed black industrial steel structural column.'
  }
];

export const CATALOG_STAIRS: CatalogItem[] = [
  {
    id: 'stair_straight_glass',
    name: 'Floating Oak Stairs with Glass Railing',
    category: 'stairs',
    type: 'stair',
    subType: 'straight',
    thumbnailIcon: 'TrendingUp',
    dimensions: { width: 1.1, height: 3.0, depth: 3.8 },
    defaultMaterialId: 'mat_hardwood_oak',
    description: 'Modern open cantilever treads with tempered architectural glass balustrade.'
  },
  {
    id: 'stair_l_shaped',
    name: 'L-Shaped Switchback Staircase',
    category: 'stairs',
    type: 'stair',
    subType: 'l-shaped',
    thumbnailIcon: 'CornerDownRight',
    dimensions: { width: 2.2, height: 3.0, depth: 2.5 },
    defaultMaterialId: 'mat_hardwood_oak',
    description: 'Two-flight staircase with intermediate landing platform.'
  }
];

export const CATALOG_ROOFS: CatalogItem[] = [
  {
    id: 'roof_flat_parapet',
    name: 'Modern Flat Roof with Parapet',
    category: 'roofs',
    type: 'roof',
    subType: 'flat',
    thumbnailIcon: 'RectangleHorizontal',
    dimensions: { width: 10, height: 0.4, depth: 10 },
    defaultMaterialId: 'mat_roof_slate',
    description: 'Clean minimalist flat roof slab with perimeter parapet wall.'
  },
  {
    id: 'roof_gable',
    name: 'Classic Architectural Gable Roof',
    category: 'roofs',
    type: 'roof',
    subType: 'gable',
    thumbnailIcon: 'Home',
    dimensions: { width: 10, height: 2.2, depth: 8 },
    defaultMaterialId: 'mat_roof_slate',
    description: 'Two sloping sides meeting at a central ridge with vertical gable ends.'
  },
  {
    id: 'roof_hip',
    name: 'Four-Sided Hip Roof',
    category: 'roofs',
    type: 'roof',
    subType: 'hip',
    thumbnailIcon: 'Pyramid',
    dimensions: { width: 10, height: 2.4, depth: 8 },
    defaultMaterialId: 'mat_roof_terracotta',
    description: 'Pitched roof sloping downwards on all four sides toward eaves.'
  },
  {
    id: 'roof_shed',
    name: 'Monopitch Shed / Skillion Roof',
    category: 'roofs',
    type: 'roof',
    subType: 'shed',
    thumbnailIcon: 'ArrowUpRight',
    dimensions: { width: 10, height: 1.8, depth: 8 },
    defaultMaterialId: 'mat_roof_standing_seam',
    description: 'Modern single plane angled roof ideal for clerestory windows.'
  }
];

export const CATALOG_LANDSCAPE: CatalogItem[] = [
  {
    id: 'land_tree_oak',
    name: 'Lush Architectural Shade Tree',
    category: 'landscaping',
    type: 'landscape',
    subType: 'tree_oak',
    thumbnailIcon: 'Trees',
    dimensions: { width: 3.5, height: 5.5, depth: 3.5 },
    defaultMaterialId: 'mat_grass_lawn',
    description: 'Broad canopy architectural deciduous tree.'
  },
  {
    id: 'land_tree_pine',
    name: 'Slender Italian Cypress',
    category: 'landscaping',
    type: 'landscape',
    subType: 'tree_pine',
    thumbnailIcon: 'TreePine',
    dimensions: { width: 1.2, height: 6.0, depth: 1.2 },
    defaultMaterialId: 'mat_grass_lawn',
    description: 'Tall elegant vertical accent tree for boundaries and entryways.'
  },
  {
    id: 'land_pool_luxury',
    name: 'Infinity Pool & Coping Deck',
    category: 'landscaping',
    type: 'landscape',
    subType: 'pool',
    thumbnailIcon: 'Waves',
    dimensions: { width: 7.0, height: 0.3, depth: 3.5 },
    defaultMaterialId: 'mat_water_pool',
    description: 'Recessed in-ground swimming pool with bluestone perimeter coping.'
  },
  {
    id: 'land_patio_stone',
    name: 'Exterior Bluestone Patio Terrace',
    category: 'landscaping',
    type: 'landscape',
    subType: 'patio_stone',
    thumbnailIcon: 'Grid',
    dimensions: { width: 8.0, height: 0.1, depth: 4.5 },
    defaultMaterialId: 'mat_patio_pavers',
    description: 'Outdoor paved entertaining area with integrated step.'
  }
];
