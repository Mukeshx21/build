import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, TransformControls, Sky, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { useStudioStore } from '../store/useStudioStore';
import {
  WallMesh,
  FloorSlabMesh,
  RoofMesh,
  StairMesh,
  ColumnMesh,
  FurnitureMesh,
  LandscapeMesh
} from './SceneMeshes';
import { WalkthroughControls } from './WalkthroughControls';
import {
  Maximize2,
  Compass,
  Eye,
  Camera,
  Sun,
  Moon,
  Layers,
  Sparkles,
  Grid,
  Focus
} from 'lucide-react';

// Camera presets controller inside Canvas
const CameraController: React.FC<{ orbitControlsRef: any }> = ({ orbitControlsRef }) => {
  const { camera, scene } = useThree();
  const cameraPreset = useStudioStore((s) => s.cameraPreset);
  const setCameraPreset = useStudioStore((s) => s.setCameraPreset);

  useEffect(() => {
    if (!cameraPreset) return;

    if (cameraPreset === 'top') {
      camera.position.set(0, 26, 0.001);
      camera.lookAt(0, 0, 0);
      if (orbitControlsRef?.current) {
        orbitControlsRef.current.target.set(0, 0, 0);
        orbitControlsRef.current.update();
      }
    } else if (cameraPreset === 'front') {
      camera.position.set(0, 2.5, 24);
      camera.lookAt(0, 1.5, 0);
      if (orbitControlsRef?.current) {
        orbitControlsRef.current.target.set(0, 1.5, 0);
        orbitControlsRef.current.update();
      }
    } else if (cameraPreset === 'rear') {
      camera.position.set(0, 2.5, -24);
      camera.lookAt(0, 1.5, 0);
      if (orbitControlsRef?.current) {
        orbitControlsRef.current.target.set(0, 1.5, 0);
        orbitControlsRef.current.update();
      }
    } else if (cameraPreset === 'left') {
      camera.position.set(-24, 2.5, 0);
      camera.lookAt(0, 1.5, 0);
      if (orbitControlsRef?.current) {
        orbitControlsRef.current.target.set(0, 1.5, 0);
        orbitControlsRef.current.update();
      }
    } else if (cameraPreset === 'right') {
      camera.position.set(24, 2.5, 0);
      camera.lookAt(0, 1.5, 0);
      if (orbitControlsRef?.current) {
        orbitControlsRef.current.target.set(0, 1.5, 0);
        orbitControlsRef.current.update();
      }
    } else if (cameraPreset === 'iso' || cameraPreset === 'perspective') {
      camera.position.set(16, 14, 16);
      camera.lookAt(0, 1.2, 0);
      if (orbitControlsRef?.current) {
        orbitControlsRef.current.target.set(0, 1.2, 0);
        orbitControlsRef.current.update();
      }
    } else if (cameraPreset === 'fit') {
      const box = new THREE.Box3();
      scene.traverse((child) => {
        if ((child as any).isMesh && child.name !== 'ground_plane' && !(child instanceof THREE.GridHelper)) {
          box.expandByObject(child);
        }
      });
      if (!box.isEmpty()) {
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z, 6);
        const dist = maxDim * 1.6;
        camera.position.set(center.x + dist * 0.75, center.y + dist * 0.6, center.z + dist * 0.75);
        camera.lookAt(center);
        if (orbitControlsRef?.current) {
          orbitControlsRef.current.target.copy(center);
          orbitControlsRef.current.update();
        }
      } else {
        camera.position.set(16, 14, 16);
        camera.lookAt(0, 1.2, 0);
        if (orbitControlsRef?.current) {
          orbitControlsRef.current.target.set(0, 1.2, 0);
          orbitControlsRef.current.update();
        }
      }
    }

    setCameraPreset(null);
  }, [cameraPreset, camera, scene, orbitControlsRef, setCameraPreset]);

  return null;
};

// Sky & Architectural Sunlight
const ArchitecturalEnvironment: React.FC = () => {
  const lighting = useStudioStore((s) => s.project.lighting);
  const renderMode = useStudioStore((s) => s.renderMode);

  // Time of Day configurations
  const envConfig = useMemo(() => {
    switch (lighting.timeOfDay) {
      case 'dawn':
        return {
          sunPos: [20, 8, -25] as [number, number, number],
          sunColor: '#fdba74',
          ambientColor: '#fed7aa',
          skyTurbidity: 8,
          skyRayleigh: 4,
          sunIntensity: 0.95
        };
      case 'noon':
        return {
          sunPos: [5, 35, 10] as [number, number, number],
          sunColor: '#fffbeb',
          ambientColor: '#f1f5f9',
          skyTurbidity: 2,
          skyRayleigh: 0.8,
          sunIntensity: 1.35
        };
      case 'golden_hour':
        return {
          sunPos: [25, 10, 20] as [number, number, number],
          sunColor: '#f59e0b',
          ambientColor: '#fef3c7',
          skyTurbidity: 10,
          skyRayleigh: 5,
          sunIntensity: 1.25
        };
      case 'sunset':
        return {
          sunPos: [-28, 4, 15] as [number, number, number],
          sunColor: '#ef4444',
          ambientColor: '#fed7aa',
          skyTurbidity: 12,
          skyRayleigh: 8,
          sunIntensity: 0.85
        };
      case 'blue_hour':
        return {
          sunPos: [-30, 1, 20] as [number, number, number],
          sunColor: '#38bdf8',
          ambientColor: '#1e3a8a',
          skyTurbidity: 15,
          skyRayleigh: 10,
          sunIntensity: 0.4
        };
      case 'night':
        return {
          sunPos: [10, 25, -20] as [number, number, number],
          sunColor: '#93c5fd',
          ambientColor: '#0f172a',
          skyTurbidity: 15,
          skyRayleigh: 0.2,
          sunIntensity: 0.15
        };
      default:
        return {
          sunPos: [15, 25, 20] as [number, number, number],
          sunColor: '#ffffff',
          ambientColor: '#e2e8f0',
          skyTurbidity: 3,
          skyRayleigh: 1,
          sunIntensity: 1.1
        };
    }
  }, [lighting.timeOfDay]);

  return (
    <>
      <Sky
        distance={450000}
        sunPosition={envConfig.sunPos}
        turbidity={envConfig.skyTurbidity}
        rayleigh={envConfig.skyRayleigh}
      />
      <ambientLight
        intensity={lighting.ambientIntensity * (lighting.timeOfDay === 'night' ? 0.3 : 1)}
        color={envConfig.ambientColor}
      />
      <directionalLight
        position={envConfig.sunPos}
        intensity={envConfig.sunIntensity * lighting.sunIntensity}
        color={envConfig.sunColor}
        castShadow={lighting.shadows}
        shadow-mapSize-width={renderMode === 'presentation' ? 2048 : 1024}
        shadow-mapSize-height={renderMode === 'presentation' ? 2048 : 1024}
        shadow-camera-far={60}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
        shadow-bias={-0.0001}
      />
      {/* Interior / Accent lights */}
      {lighting.interiorSpotlights && (
        <group>
          <pointLight position={[0, 2.8, 0]} intensity={0.9} color="#fef08a" distance={12} />
          <pointLight position={[-4, 2.8, 2]} intensity={0.6} color="#fed7aa" distance={10} />
          <pointLight position={[4, 2.8, -2]} intensity={0.6} color="#fed7aa" distance={10} />
        </group>
      )}
    </>
  );
};

// Main 3D Scene Contents
const SceneContent: React.FC<{ orbitControlsRef: any }> = ({ orbitControlsRef }) => {
  const objects = useStudioStore((s) => s.project.objects);
  const activeFloorLevel = useStudioStore((s) => s.project.activeFloorLevel);
  const selectedObjectId = useStudioStore((s) => s.selectedObjectId);
  const hoveredObjectId = useStudioStore((s) => s.hoveredObjectId);
  const transformMode = useStudioStore((s) => s.transformMode);
  const viewMode = useStudioStore((s) => s.viewMode);
  const wireframe = useStudioStore((s) => s.wireframe);
  const gridVisible = useStudioStore((s) => s.gridVisible);

  const setSelectedObjectId = useStudioStore((s) => s.setSelectedObjectId);
  const setHoveredObjectId = useStudioStore((s) => s.setHoveredObjectId);
  const updateObject = useStudioStore((s) => s.updateObject);

  const selectedObject = useMemo(() => {
    return objects.find((o) => o.id === selectedObjectId);
  }, [objects, selectedObjectId]);

  const selectedMeshRef = useRef<THREE.Group>(null);

  // Filter objects by floor if not -1 (all)
  const visibleObjects = useMemo(() => {
    return objects.filter((o) => {
      if (!o.visible) return false;
      if (activeFloorLevel === -1) return true;
      if ('floorLevel' in o) {
        return (o as any).floorLevel <= activeFloorLevel;
      }
      return true;
    });
  }, [objects, activeFloorLevel]);

  return (
    <>
      <color attach="background" args={['#F5F5F3']} />
      <fog attach="fog" args={['#F5F5F3', 55, 140]} />
      <ArchitecturalEnvironment />
      <CameraController orbitControlsRef={orbitControlsRef} />

      {/* Grid Floor */}
      {gridVisible && (
        <gridHelper
          args={[60, 60, '#94A3B8', '#CBD5E1']}
          position={[0, -0.01, 0]}
        />
      )}

      {/* Ground Plane */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.05, 0]}
        receiveShadow
        onClick={(e) => {
          e.stopPropagation();
          setSelectedObjectId(null);
        }}
      >
        <planeGeometry args={[160, 160]} />
        <meshStandardMaterial color="#E8E8E4" roughness={0.92} metalness={0.04} />
      </mesh>

      {/* Render all scene architectural objects */}
      <group>
        {visibleObjects.map((obj) => {
          const isSelected = obj.id === selectedObjectId;
          const isHovered = obj.id === hoveredObjectId;

          const handleSelect = (e: any) => {
            e.stopPropagation();
            setSelectedObjectId(obj.id);
          };

          const handlePointerOver = (e: any) => {
            e.stopPropagation();
            setHoveredObjectId(obj.id);
          };

          const handlePointerOut = () => {
            setHoveredObjectId(null);
          };

          switch (obj.type) {
            case 'wall':
              return (
                <WallMesh
                  key={obj.id}
                  data={obj}
                  isSelected={isSelected}
                  isHovered={isHovered}
                  wireframe={wireframe}
                  onSelect={handleSelect}
                  onPointerOver={handlePointerOver}
                  onPointerOut={handlePointerOut}
                />
              );
            case 'floor':
              return (
                <FloorSlabMesh
                  key={obj.id}
                  data={obj}
                  isSelected={isSelected}
                  isHovered={isHovered}
                  wireframe={wireframe}
                  onSelect={handleSelect}
                  onPointerOver={handlePointerOver}
                  onPointerOut={handlePointerOut}
                />
              );
            case 'roof':
              return (
                <RoofMesh
                  key={obj.id}
                  data={obj}
                  isSelected={isSelected}
                  isHovered={isHovered}
                  wireframe={wireframe}
                  onSelect={handleSelect}
                  onPointerOver={handlePointerOver}
                  onPointerOut={handlePointerOut}
                />
              );
            case 'stair':
              return (
                <StairMesh
                  key={obj.id}
                  data={obj}
                  isSelected={isSelected}
                  isHovered={isHovered}
                  wireframe={wireframe}
                  onSelect={handleSelect}
                  onPointerOver={handlePointerOver}
                  onPointerOut={handlePointerOut}
                />
              );
            case 'column':
              return (
                <ColumnMesh
                  key={obj.id}
                  data={obj}
                  isSelected={isSelected}
                  isHovered={isHovered}
                  wireframe={wireframe}
                  onSelect={handleSelect}
                  onPointerOver={handlePointerOver}
                  onPointerOut={handlePointerOut}
                />
              );
            case 'furniture':
              return (
                <FurnitureMesh
                  key={obj.id}
                  data={obj}
                  isSelected={isSelected}
                  isHovered={isHovered}
                  wireframe={wireframe}
                  onSelect={handleSelect}
                  onPointerOver={handlePointerOver}
                  onPointerOut={handlePointerOut}
                />
              );
            case 'landscape':
              return (
                <LandscapeMesh
                  key={obj.id}
                  data={obj}
                  isSelected={isSelected}
                  isHovered={isHovered}
                  wireframe={wireframe}
                  onSelect={handleSelect}
                  onPointerOver={handlePointerOver}
                  onPointerOut={handlePointerOut}
                />
              );
            default:
              return null;
          }
        })}
      </group>

      {/* Transform Gizmo when an object is selected and in a transform mode */}
      {selectedObject && !selectedObject.locked && transformMode !== 'select' && (
        <TransformControls
          mode={transformMode}
          position={
            'x' in selectedObject
              ? [selectedObject.x, (selectedObject as any).y || 0, selectedObject.z]
              : [
                  (selectedObject.startX + selectedObject.endX) / 2,
                  selectedObject.elevation + selectedObject.height / 2,
                  (selectedObject.startZ + selectedObject.endZ) / 2
                ]
          }
          onMouseDown={() => {
            if (orbitControlsRef.current) orbitControlsRef.current.enabled = false;
          }}
          onMouseUp={() => {
            if (orbitControlsRef.current) orbitControlsRef.current.enabled = true;
          }}
          onChange={(e: any) => {
            if (!e?.target?.object) return;
            const pos = e.target.object.position;
            const rot = e.target.object.rotation;

            if ('x' in selectedObject) {
              updateObject(selectedObject.id, {
                x: Math.round(pos.x * 100) / 100,
                z: Math.round(pos.z * 100) / 100,
                y: Math.round(pos.y * 100) / 100,
                rotationY: Math.round(rot.y * 100) / 100
              } as any);
            }
          }}
        />
      )}

      {/* Walkthrough or Orbit Controls */}
      {viewMode === 'walkthrough' ? (
        <WalkthroughControls active={true} />
      ) : (
        <OrbitControls
          ref={orbitControlsRef}
          makeDefault
          enableDamping
          dampingFactor={0.06}
          maxPolarAngle={Math.PI / 2 - 0.02}
          minDistance={1.5}
          maxDistance={120}
        />
      )}
    </>
  );
};

export const Viewport3D: React.FC = () => {
  const orbitControlsRef = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewMode = useStudioStore((s) => s.viewMode);
  const setViewMode = useStudioStore((s) => s.setViewMode);
  const setCameraPreset = useStudioStore((s) => s.setCameraPreset);
  const timeOfDay = useStudioStore((s) => s.project.lighting.timeOfDay);
  const updateLighting = useStudioStore((s) => s.updateLighting);
  const renderMode = useStudioStore((s) => s.renderMode);
  const setRenderMode = useStudioStore((s) => s.setRenderMode);
  const gridVisible = useStudioStore((s) => s.gridVisible);
  const setGridVisible = useStudioStore((s) => s.setGridVisible);
  const activeFloorLevel = useStudioStore((s) => s.project.activeFloorLevel);
  const setActiveFloorLevel = useStudioStore((s) => s.setActiveFloorLevel);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full h-full bg-[#F5F5F3] select-none overflow-hidden">
      {/* 3D Canvas */}
      <Canvas
        ref={canvasRef}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.05,
          preserveDrawingBuffer: true // Required for high quality screenshot export
        }}
        camera={{ position: [14, 12, 16], fov: 45 }}
        shadows
        className="w-full h-full cursor-grab active:cursor-grabbing"
      >
        <SceneContent orbitControlsRef={orbitControlsRef} />
      </Canvas>

      {/* Floating Viewport Quick Controls (Top-Right) */}
      <div className="absolute top-4 right-4 flex items-center gap-1 bg-white/95 backdrop-blur-md border border-[#E5E5E5] rounded-xl p-1.5 shadow-sm z-10 text-[#171717]">
        <button
          onClick={() => setCameraPreset('perspective')}
          className="px-2.5 py-1 text-xs font-medium text-[#737373] hover:text-[#171717] hover:bg-[#F2F0EC] rounded-lg transition-colors"
          title="Perspective 3D Isometric View"
        >
          3D Iso
        </button>
        <button
          onClick={() => setCameraPreset('top')}
          className="px-2.5 py-1 text-xs font-medium text-[#737373] hover:text-[#171717] hover:bg-[#F2F0EC] rounded-lg transition-colors"
          title="Top-Down Plan View"
        >
          Top
        </button>
        <button
          onClick={() => setCameraPreset('front')}
          className="px-2.5 py-1 text-xs font-medium text-[#737373] hover:text-[#171717] hover:bg-[#F2F0EC] rounded-lg transition-colors"
          title="Front Elevation View"
        >
          Front
        </button>
        <button
          onClick={() => setCameraPreset('right')}
          className="px-2.5 py-1 text-xs font-medium text-[#737373] hover:text-[#171717] hover:bg-[#F2F0EC] rounded-lg transition-colors"
          title="Right Elevation View"
        >
          Right
        </button>
        <button
          onClick={() => setCameraPreset('rear')}
          className="px-2.5 py-1 text-xs font-medium text-[#737373] hover:text-[#171717] hover:bg-[#F2F0EC] rounded-lg transition-colors"
          title="Rear Elevation View"
        >
          Rear
        </button>
        <button
          onClick={() => setCameraPreset('left')}
          className="px-2.5 py-1 text-xs font-medium text-[#737373] hover:text-[#171717] hover:bg-[#F2F0EC] rounded-lg transition-colors"
          title="Left Elevation View"
        >
          Left
        </button>
        <button
          onClick={() => setCameraPreset('fit')}
          className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-[#111111] hover:bg-black rounded-lg transition-colors shadow-sm"
          title="Fit Whole House in Frame"
        >
          <Focus size={13} />
          <span>Fit</span>
        </button>
        <div className="w-[1px] h-4 bg-[#E5E5E5]" />
        <button
          onClick={() => setGridVisible(!gridVisible)}
          className={`p-1.5 rounded-lg transition-colors ${
            gridVisible ? 'text-[#111111] bg-[#F2F0EC]' : 'text-[#737373] hover:text-[#171717] hover:bg-[#F2F0EC]'
          }`}
          title="Toggle Grid"
        >
          <Grid size={14} />
        </button>
        <button
          onClick={toggleFullscreen}
          className="p-1.5 text-[#737373] hover:text-[#171717] hover:bg-[#F2F0EC] rounded-lg transition-colors"
          title="Toggle Fullscreen"
        >
          <Maximize2 size={14} />
        </button>
      </div>

      {/* Floor Level Selector (Top-Left) */}
      <div className="absolute top-4 left-4 flex items-center gap-1 bg-white/95 backdrop-blur-md border border-[#E5E5E5] rounded-xl p-1.5 shadow-sm z-10 text-[#171717]">
        <span className="text-[11px] font-bold text-[#737373] uppercase tracking-wider px-2">Floor:</span>
        <button
          onClick={() => setActiveFloorLevel(-1)}
          className={`px-2.5 py-0.5 text-xs font-medium rounded-lg transition-colors ${
            activeFloorLevel === -1
              ? 'bg-[#111111] text-white font-semibold shadow-sm'
              : 'text-[#737373] hover:text-[#171717] hover:bg-[#F2F0EC]'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setActiveFloorLevel(0)}
          className={`px-2.5 py-0.5 text-xs font-medium rounded-lg transition-colors ${
            activeFloorLevel === 0
              ? 'bg-[#111111] text-white font-semibold shadow-sm'
              : 'text-[#737373] hover:text-[#171717] hover:bg-[#F2F0EC]'
          }`}
        >
          Ground (L0)
        </button>
        <button
          onClick={() => setActiveFloorLevel(1)}
          className={`px-2.5 py-0.5 text-xs font-medium rounded-lg transition-colors ${
            activeFloorLevel === 1
              ? 'bg-[#111111] text-white font-semibold shadow-sm'
              : 'text-[#737373] hover:text-[#171717] hover:bg-[#F2F0EC]'
          }`}
        >
          1st Floor (L1)
        </button>
      </div>

      {/* Time of Day Sun Controls (Bottom-Left) */}
      <div className="absolute bottom-4 left-4 flex items-center gap-1 bg-white/95 backdrop-blur-md border border-[#E5E5E5] rounded-xl p-1.5 shadow-sm z-10 text-[#171717]">
        <span className="text-[11px] font-bold text-[#737373] uppercase tracking-wider px-2 flex items-center gap-1.5">
          <Sun size={13} className="text-amber-500" /> Lighting:
        </span>
        {(['dawn', 'noon', 'golden_hour', 'sunset', 'night'] as const).map((t) => (
          <button
            key={t}
            onClick={() => updateLighting({ timeOfDay: t })}
            className={`px-2.5 py-0.5 text-xs font-medium capitalize rounded-lg transition-colors ${
              timeOfDay === t
                ? 'bg-[#111111] text-white font-semibold shadow-sm'
                : 'text-[#737373] hover:text-[#171717] hover:bg-[#F2F0EC]'
            }`}
          >
            {t.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Walkthrough Banner if active */}
      {viewMode === 'walkthrough' && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-[#111111]/92 text-white backdrop-blur-md border border-neutral-700 px-5 py-2 rounded-full shadow-2xl z-20 flex items-center gap-4">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-xs font-medium tracking-wide">
            Walkthrough Mode: Use [W][A][S][D] to walk, drag mouse to look around
          </span>
          <button
            onClick={() => setViewMode('3d')}
            className="text-xs bg-white text-[#111111] hover:bg-neutral-200 px-2.5 py-0.5 rounded font-bold uppercase transition-colors"
          >
            Exit
          </button>
        </div>
      )}
    </div>
  );
};
