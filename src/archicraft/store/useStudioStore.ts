import { create } from 'zustand';
import {
  LengthUnit,
  TransformMode,
  ViewMode,
  RenderMode,
  CameraPreset,
  ToolCategory,
  SceneObject,
  LightSettings,
  ProjectData,
  WallObject,
  FloorSlabObject,
  RoofObject,
  FurnitureObject,
  StairObject,
  ColumnObject,
  LandscapeObject,
  WallOpening
} from '../types/studio';
import { TEMPLATE_PROJECTS } from '../templates/initialProjects';

const STORAGE_KEY_CURRENT = 'archicraft_current_project';
const STORAGE_KEY_SAVED_LIST = 'archicraft_saved_projects';

interface StudioState {
  project: ProjectData;
  selectedObjectId: string | null;
  hoveredObjectId: string | null;
  transformMode: TransformMode;
  viewMode: ViewMode;
  renderMode: RenderMode;
  activeTool: ToolCategory;
  activeUnit: LengthUnit;
  snapToGrid: boolean;
  gridSize: number;
  gridVisible: boolean;
  showDimensions: boolean;
  wireframe: boolean;
  cameraPreset: CameraPreset;
  statusMessage: string;
  isSaving: boolean;
  lastSavedAt: string | null;

  // Modals
  isAiModalOpen: boolean;
  isTemplateModalOpen: boolean;
  isProjectsModalOpen: boolean;
  isExportModalOpen: boolean;
  isShortcutsModalOpen: boolean;

  // History
  history: SceneObject[][];
  future: SceneObject[][];

  // Actions
  setSelectedObjectId: (id: string | null) => void;
  setHoveredObjectId: (id: string | null) => void;
  setTransformMode: (mode: TransformMode) => void;
  setViewMode: (mode: ViewMode) => void;
  setRenderMode: (mode: RenderMode) => void;
  setActiveTool: (tool: ToolCategory) => void;
  setActiveUnit: (unit: LengthUnit) => void;
  setSnapToGrid: (enabled: boolean) => void;
  setGridSize: (size: number) => void;
  setGridVisible: (visible: boolean) => void;
  setShowDimensions: (show: boolean) => void;
  setWireframe: (wireframe: boolean) => void;
  setCameraPreset: (preset: CameraPreset) => void;
  setStatusMessage: (msg: string) => void;

  setAiModalOpen: (open: boolean) => void;
  setTemplateModalOpen: (open: boolean) => void;
  setProjectsModalOpen: (open: boolean) => void;
  setExportModalOpen: (open: boolean) => void;
  setShortcutsModalOpen: (open: boolean) => void;

  // Object Mutations
  addObject: (obj: SceneObject) => void;
  updateObject: (id: string, updates: Partial<SceneObject>) => void;
  deleteObject: (id: string) => void;
  duplicateObject: (id: string) => void;
  toggleLockObject: (id: string) => void;
  toggleVisibilityObject: (id: string) => void;
  addOpeningToWall: (wallId: string, opening: WallOpening) => void;
  removeOpeningFromWall: (wallId: string, openingId: string) => void;

  // Project Management
  updateProjectMetadata: (updates: Partial<ProjectData['metadata']>) => void;
  updateLighting: (updates: Partial<LightSettings>) => void;
  setActiveFloorLevel: (level: number) => void;
  createNewProject: (name?: string) => void;
  loadProject: (project: ProjectData) => void;
  saveProject: () => void;
  getSavedProjectsList: () => { id: string; name: string; updatedAt: string; objectCount: number }[];
  deleteSavedProject: (id: string) => void;

  // History Stack
  undo: () => void;
  redo: () => void;
  pushHistory: () => void;
}

const getInitialProject = (): ProjectData => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_CURRENT);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed?.metadata?.id && Array.isArray(parsed?.objects)) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load initial project from localStorage', e);
  }
  // Default to Luxury Villa template
  return TEMPLATE_PROJECTS[0].data;
};

export const useStudioStore = create<StudioState>((set, get) => ({
  project: getInitialProject(),
  selectedObjectId: null,
  hoveredObjectId: null,
  transformMode: 'select',
  viewMode: '3d',
  renderMode: 'modeling',
  activeTool: 'select',
  activeUnit: 'm',
  snapToGrid: true,
  gridSize: 0.5,
  gridVisible: true,
  showDimensions: true,
  wireframe: false,
  cameraPreset: null,
  statusMessage: 'Ready. Click any object to inspect or use tools on the left.',
  isSaving: false,
  lastSavedAt: new Date().toLocaleTimeString(),

  isAiModalOpen: false,
  isTemplateModalOpen: false,
  isProjectsModalOpen: false,
  isExportModalOpen: false,
  isShortcutsModalOpen: false,

  history: [],
  future: [],

  setSelectedObjectId: (id) => {
    set({
      selectedObjectId: id,
      statusMessage: id ? `Selected: ${id}` : 'Selection cleared'
    });
  },

  setHoveredObjectId: (id) => set({ hoveredObjectId: id }),
  setTransformMode: (mode) => set({ transformMode: mode, statusMessage: `Tool mode: ${mode}` }),
  setViewMode: (mode) => set({ viewMode: mode, statusMessage: `View: ${mode.toUpperCase()}` }),
  setRenderMode: (mode) => set({ renderMode: mode, statusMessage: `Render: ${mode}` }),
  setActiveTool: (tool) => {
    let transformMode: TransformMode = 'select';
    if (tool === 'move') transformMode = 'translate';
    if (tool === 'rotate') transformMode = 'rotate';
    if (tool === 'scale') transformMode = 'scale';

    set({ activeTool: tool, transformMode });
  },
  setActiveUnit: (unit) => set((state) => ({
    activeUnit: unit,
    project: {
      ...state.project,
      metadata: { ...state.project.metadata, units: unit }
    }
  })),
  setSnapToGrid: (snapToGrid) => set({ snapToGrid }),
  setGridSize: (gridSize) => set({ gridSize }),
  setGridVisible: (gridVisible) => set({ gridVisible }),
  setShowDimensions: (showDimensions) => set({ showDimensions }),
  setWireframe: (wireframe) => set({ wireframe }),
  setCameraPreset: (cameraPreset) => set({ cameraPreset }),
  setStatusMessage: (statusMessage) => set({ statusMessage }),

  setAiModalOpen: (isAiModalOpen) => set({ isAiModalOpen }),
  setTemplateModalOpen: (isTemplateModalOpen) => set({ isTemplateModalOpen }),
  setProjectsModalOpen: (isProjectsModalOpen) => set({ isProjectsModalOpen }),
  setExportModalOpen: (isExportModalOpen) => set({ isExportModalOpen }),
  setShortcutsModalOpen: (isShortcutsModalOpen) => set({ isShortcutsModalOpen }),

  pushHistory: () => {
    const { project, history } = get();
    // Keep max 30 states
    const newHistory = [...history.slice(-29), JSON.parse(JSON.stringify(project.objects))];
    set({ history: newHistory, future: [] });
  },

  addObject: (obj) => {
    const { pushHistory, project } = get();
    pushHistory();
    const newObjects = [...project.objects, obj];
    set({
      project: { ...project, objects: newObjects },
      selectedObjectId: obj.id,
      statusMessage: `Added ${obj.name}`
    });
    get().saveProject();
  },

  updateObject: (id, updates) => {
    const { pushHistory, project } = get();
    pushHistory();
    const newObjects = project.objects.map((o) =>
      o.id === id ? ({ ...o, ...updates } as SceneObject) : o
    );
    set({
      project: { ...project, objects: newObjects }
    });
    get().saveProject();
  },

  deleteObject: (id) => {
    const { pushHistory, project, selectedObjectId } = get();
    pushHistory();
    const newObjects = project.objects.filter((o) => o.id !== id);
    set({
      project: { ...project, objects: newObjects },
      selectedObjectId: selectedObjectId === id ? null : selectedObjectId,
      statusMessage: `Deleted object ${id}`
    });
    get().saveProject();
  },

  duplicateObject: (id) => {
    const { project, addObject } = get();
    const target = project.objects.find((o) => o.id === id);
    if (!target) return;

    const copy = JSON.parse(JSON.stringify(target));
    copy.id = `${target.type}_${Date.now()}`;
    copy.name = `${target.name} (Copy)`;

    if ('x' in copy) copy.x += 1;
    if ('z' in copy) copy.z += 1;
    if ('startX' in copy) {
      copy.startX += 1;
      copy.endX += 1;
    }

    addObject(copy);
  },

  toggleLockObject: (id) => {
    const { project } = get();
    const newObjects = project.objects.map((o) =>
      o.id === id ? ({ ...o, locked: !o.locked } as SceneObject) : o
    );
    set({ project: { ...project, objects: newObjects } });
  },

  toggleVisibilityObject: (id) => {
    const { project } = get();
    const newObjects = project.objects.map((o) =>
      o.id === id ? ({ ...o, visible: !o.visible } as SceneObject) : o
    );
    set({ project: { ...project, objects: newObjects } });
  },

  addOpeningToWall: (wallId, opening) => {
    const { pushHistory, project } = get();
    pushHistory();
    const newObjects = project.objects.map((o) => {
      if (o.id === wallId && o.type === 'wall') {
        const wall = o as WallObject;
        return {
          ...wall,
          openings: [...(wall.openings || []), opening]
        };
      }
      return o;
    });
    set({ project: { ...project, objects: newObjects } });
    get().saveProject();
  },

  removeOpeningFromWall: (wallId, openingId) => {
    const { pushHistory, project } = get();
    pushHistory();
    const newObjects = project.objects.map((o) => {
      if (o.id === wallId && o.type === 'wall') {
        const wall = o as WallObject;
        return {
          ...wall,
          openings: wall.openings.filter((op) => op.id !== openingId)
        };
      }
      return o;
    });
    set({ project: { ...project, objects: newObjects } });
    get().saveProject();
  },

  updateProjectMetadata: (updates) => {
    const { project } = get();
    set({
      project: {
        ...project,
        metadata: { ...project.metadata, ...updates, updatedAt: new Date().toISOString() }
      }
    });
    get().saveProject();
  },

  updateLighting: (updates) => {
    const { project } = get();
    set({
      project: {
        ...project,
        lighting: { ...project.lighting, ...updates }
      }
    });
  },

  setActiveFloorLevel: (level) => {
    const { project } = get();
    set({
      project: { ...project, activeFloorLevel: level },
      statusMessage: level === -1 ? 'Showing All Floors' : `Active Floor: Level ${level}`
    });
  },

  createNewProject: (name = 'New Architectural Project') => {
    const newProj: ProjectData = {
      metadata: {
        id: `proj_${Date.now()}`,
        name,
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        description: 'New architectural house model',
        units: get().activeUnit
      },
      activeFloorLevel: 0,
      lighting: {
        timeOfDay: 'noon',
        sunIntensity: 1.2,
        ambientIntensity: 0.6,
        sunElevation: 45,
        sunAzimuth: 135,
        shadows: true,
        colorTemperature: 'neutral',
        interiorSpotlights: true
      },
      objects: [
        {
          id: 'initial_slab',
          name: 'Ground Floor Slab',
          type: 'floor',
          floorLevel: 0,
          roomName: 'Main Living Area',
          x: 0,
          z: 0,
          width: 10,
          depth: 8,
          thickness: 0.25,
          elevation: 0,
          materialId: 'mat_hardwood_oak',
          visible: true,
          locked: false
        }
      ]
    };

    set({
      project: newProj,
      selectedObjectId: null,
      history: [],
      future: [],
      statusMessage: 'Created new project.'
    });
    get().saveProject();
  },

  loadProject: (projectData) => {
    set({
      project: projectData,
      selectedObjectId: null,
      history: [],
      future: [],
      statusMessage: `Loaded: ${projectData.metadata.name}`
    });
    get().saveProject();
  },

  saveProject: () => {
    const { project } = get();
    set({ isSaving: true });
    try {
      const updated = {
        ...project,
        metadata: { ...project.metadata, updatedAt: new Date().toISOString() }
      };
      localStorage.setItem(STORAGE_KEY_CURRENT, JSON.stringify(updated));

      // Also update saved list entry
      const listRaw = localStorage.getItem(STORAGE_KEY_SAVED_LIST);
      let list: any[] = listRaw ? JSON.parse(listRaw) : [];
      const existingIdx = list.findIndex((item) => item.id === project.metadata.id);
      const summary = {
        id: project.metadata.id,
        name: project.metadata.name,
        updatedAt: updated.metadata.updatedAt,
        objectCount: project.objects.length
      };

      if (existingIdx >= 0) {
        list[existingIdx] = summary;
      } else {
        list.unshift(summary);
      }
      localStorage.setItem(STORAGE_KEY_SAVED_LIST, JSON.stringify(list));

      // Save full project payload in its own key
      localStorage.setItem(`archicraft_project_${project.metadata.id}`, JSON.stringify(updated));

      set({
        isSaving: false,
        lastSavedAt: new Date().toLocaleTimeString()
      });
    } catch (e) {
      console.error('Failed to save project to localStorage', e);
      set({ isSaving: false });
    }
  },

  getSavedProjectsList: () => {
    try {
      const listRaw = localStorage.getItem(STORAGE_KEY_SAVED_LIST);
      return listRaw ? JSON.parse(listRaw) : [];
    } catch (e) {
      return [];
    }
  },

  deleteSavedProject: (id: string) => {
    try {
      localStorage.removeItem(`archicraft_project_${id}`);
      const listRaw = localStorage.getItem(STORAGE_KEY_SAVED_LIST);
      let list = listRaw ? JSON.parse(listRaw) : [];
      list = list.filter((p: any) => p.id !== id);
      localStorage.setItem(STORAGE_KEY_SAVED_LIST, JSON.stringify(list));
    } catch (e) {
      console.error(e);
    }
  },

  undo: () => {
    const { history, future, project } = get();
    if (history.length === 0) return;

    const previousState = history[history.length - 1];
    const newHistory = history.slice(0, -1);
    const newFuture = [JSON.parse(JSON.stringify(project.objects)), ...future];

    set({
      history: newHistory,
      future: newFuture,
      project: { ...project, objects: previousState },
      statusMessage: 'Undo performed'
    });
  },

  redo: () => {
    const { history, future, project } = get();
    if (future.length === 0) return;

    const nextState = future[0];
    const newFuture = future.slice(1);
    const newHistory = [...history, JSON.parse(JSON.stringify(project.objects))];

    set({
      history: newHistory,
      future: newFuture,
      project: { ...project, objects: nextState },
      statusMessage: 'Redo performed'
    });
  }
}));
