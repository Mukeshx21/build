export type LengthUnit = 'm' | 'cm' | 'ft';

export type TransformMode = 'select' | 'translate' | 'rotate' | 'scale';

export type ViewMode = '3d' | '2d' | 'walkthrough';

export type RenderMode = 'modeling' | 'presentation';

export type CameraPreset = 'iso' | 'top' | 'front' | 'rear' | 'left' | 'right' | 'perspective' | 'fit' | null;

export type TimeOfDay = 'dawn' | 'noon' | 'golden_hour' | 'sunset' | 'blue_hour' | 'night';

export type ToolCategory =
  | 'select'
  | 'move'
  | 'rotate'
  | 'scale'
  | 'walls'
  | 'doors'
  | 'windows'
  | 'floors'
  | 'roofs'
  | 'stairs'
  | 'columns'
  | 'furniture'
  | 'materials'
  | 'lighting'
  | 'landscaping';

export interface MaterialDef {
  id: string;
  name: string;
  category: 'walls' | 'floors' | 'roofs' | 'furniture' | 'metal' | 'glass' | 'outdoor';
  color: string;
  roughness: number;
  metalness: number;
  opacity?: number;
  transparent?: boolean;
  texturePattern?: 'brick' | 'wood' | 'tile' | 'marble' | 'concrete' | 'slate' | 'none';
  textureScale?: number;
}

export interface WallOpening {
  id: string;
  type: 'door' | 'window';
  positionRatio: number; // 0 to 1 along wall length
  width: number;
  height: number;
  elevation: number;
  subType: string;
  materialId?: string;
}

export interface WallObject {
  id: string;
  name: string;
  type: 'wall';
  floorLevel: number;
  startX: number;
  startZ: number;
  endX: number;
  endZ: number;
  height: number;
  thickness: number;
  elevation: number;
  materialId: string;
  openings: WallOpening[];
  visible: boolean;
  locked: boolean;
}

export interface FloorSlabObject {
  id: string;
  name: string;
  type: 'floor';
  floorLevel: number;
  roomName: string;
  x: number;
  z: number;
  width: number;
  depth: number;
  thickness: number;
  elevation: number;
  materialId: string;
  visible: boolean;
  locked: boolean;
}

export interface RoofObject {
  id: string;
  name: string;
  type: 'roof';
  roofType: 'flat' | 'gable' | 'hip' | 'shed';
  floorLevel: number;
  x: number;
  y: number;
  z: number;
  width: number;
  depth: number;
  height: number; // pitch height
  overhang: number;
  rotationY: number;
  materialId: string;
  visible: boolean;
  locked: boolean;
}

export interface StairObject {
  id: string;
  name: string;
  type: 'stair';
  stairType: 'straight' | 'l-shaped' | 'spiral';
  floorLevel: number;
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  length: number;
  stepsCount: number;
  rotationY: number;
  railing: boolean;
  materialId: string;
  visible: boolean;
  locked: boolean;
}

export interface ColumnObject {
  id: string;
  name: string;
  type: 'column';
  columnType: 'square' | 'round' | 'steel-i';
  floorLevel: number;
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  rotationY: number;
  materialId: string;
  visible: boolean;
  locked: boolean;
}

export interface FurnitureObject {
  id: string;
  name: string;
  type: 'furniture';
  category: 'living' | 'bedroom' | 'dining' | 'kitchen' | 'bathroom' | 'office' | 'decor';
  modelType: string;
  floorLevel: number;
  x: number;
  y: number;
  z: number;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  width: number;
  height: number;
  depth: number;
  materialId: string;
  visible: boolean;
  locked: boolean;
}

export interface LandscapeObject {
  id: string;
  name: string;
  type: 'landscape';
  modelType: 'tree_oak' | 'tree_pine' | 'bush' | 'planter' | 'pool' | 'patio_stone';
  x: number;
  y: number;
  z: number;
  rotationY: number;
  scale: number;
  width?: number;
  depth?: number;
  visible: boolean;
  locked: boolean;
}

export type SceneObject =
  | WallObject
  | FloorSlabObject
  | RoofObject
  | StairObject
  | ColumnObject
  | FurnitureObject
  | LandscapeObject;

export interface LightSettings {
  timeOfDay: TimeOfDay;
  sunIntensity: number;
  ambientIntensity: number;
  sunElevation: number; // degrees
  sunAzimuth: number; // degrees
  shadows: boolean;
  colorTemperature: 'warm' | 'neutral' | 'cool';
  interiorSpotlights: boolean;
}

export interface ProjectMetadata {
  id: string;
  name: string;
  version: string;
  createdAt: string;
  updatedAt: string;
  description?: string;
  units: LengthUnit;
}

export interface ProjectData {
  metadata: ProjectMetadata;
  objects: SceneObject[];
  lighting: LightSettings;
  activeFloorLevel: number;
}
