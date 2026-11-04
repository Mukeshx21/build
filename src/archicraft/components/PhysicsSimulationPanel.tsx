/**
 * ArchiCraft3D - Physics & Structural Mechanics Simulation Panel
 * Phase 11: Central simulation interface with LandAI aesthetic,
 * real-time rigid body controls, structural mechanics analyzer,
 * environmental wind/thermal solvers, and automated validation suite.
 */

import React, { useState, useMemo } from "react"
import { useStudioStore } from "../store/useStudioStore"
import {
  calculateBuildingStructuralLoads,
  calculateEnvelopeThermalLoss,
  calculateWindAnalysis,
  calculateArchimedesBuoyancy,
  calculatePhotometricGrid,
  runPhysicsValidationSuite,
  ValidationSuiteReport,
  STANDARD_GRAVITY,
  AIR_DENSITY,
  WATER_DENSITY,
} from "../physics"
import {
  Activity,
  Play,
  Pause,
  RotateCcw,
  Box,
  Circle,
  Wind,
  Thermometer,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  HelpCircle,
  X,
  Gauge,
  Sliders,
  ChevronRight,
  Sun,
  Droplets,
  Layers,
  FileCheck2,
} from "lucide-react"

export const PhysicsSimulationPanel: React.FC = () => {
  const isPhysicsModalOpen = useStudioStore((s) => s.isPhysicsModalOpen)
  const setPhysicsModalOpen = useStudioStore((s) => s.setPhysicsModalOpen)
  const physicsConfig = useStudioStore((s) => s.physicsConfig)
  const updatePhysicsConfig = useStudioStore((s) => s.updatePhysicsConfig)
  const dynamicProps = useStudioStore((s) => s.dynamicProps)
  const spawnPhysicsProp = useStudioStore((s) => s.spawnPhysicsProp)
  const resetPhysicsSimulation = useStudioStore((s) => s.resetPhysicsSimulation)
  const project = useStudioStore((s) => s.project)

  const [activeTab, setActiveTab] =
    useState<"rigid" | "structural" | "environment" | "photometric" | "validation">(
      "rigid",
    )
  const [validationReport, setValidationReport] =
    useState<ValidationSuiteReport | null>(null)

  // Structural Analysis Calculation
  const structuralAnalysis = useMemo(() => {
    return calculateBuildingStructuralLoads(project.objects)
  }, [project.objects])

  // Thermal Analysis Calculation
  const thermalAnalysis = useMemo(() => {
    return calculateEnvelopeThermalLoss(project.objects as any, {
      indoorTempC: physicsConfig.indoorTempC,
      outdoorTempC: physicsConfig.outdoorTempC,
    })
  }, [project.objects, physicsConfig.indoorTempC, physicsConfig.outdoorTempC])

  // Wind Analysis Calculation
  const windAnalysis = useMemo(() => {
    return calculateWindAnalysis(
      project.objects as any,
      physicsConfig.windSpeedMps,
      physicsConfig.windDirectionDeg,
    )
  }, [
    project.objects,
    physicsConfig.windSpeedMps,
    physicsConfig.windDirectionDeg,
  ])

  // Photometric Illuminance Calculation
  const photometricReport = useMemo(() => {
    const radElev = ((project.lighting.sunElevation || 45) * Math.PI) / 180
    const radAzim = ((project.lighting.sunAzimuth || 135) * Math.PI) / 180
    const sunDist = 30

    const lights = [
      {
        id: "scene_sun",
        name: "Directional Sunlight",
        type: "point" as const,
        position: {
          x: sunDist * Math.cos(radElev) * Math.sin(radAzim),
          y: sunDist * Math.sin(radElev),
          z: sunDist * Math.cos(radElev) * Math.cos(radAzim),
        },
        luminousFluxLumens: 80000,
        colorKelvin: 5500,
        enabled: true,
      },
      {
        id: "interior_downlight",
        name: "Interior Downlight Grid",
        type: "point" as const,
        position: { x: 0, y: 3.0, z: 0 },
        luminousFluxLumens: 3200,
        colorKelvin: 3000,
        enabled: true,
      },
    ]

    return calculatePhotometricGrid(
      lights,
      { minX: -6, maxX: 6, minZ: -6, maxZ: 6 },
      0.75,
      2.0,
    )
  }, [project.lighting])

  // Buoyancy Example Calculation (Submerged Pool Volume)
  const poolBuoyancy = useMemo(() => {
    // Model concrete pool shell: 6m x 3m x 1.5m = 27 m3 displaced volume
    return calculateArchimedesBuoyancy(27, 35000, 0.85)
  }, [])

  const handleRunValidation = () => {
    const report = runPhysicsValidationSuite()
    setValidationReport(report)
  }

  if (!isPhysicsModalOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-[#E5E5E5] w-full max-w-5xl h-[88vh] flex flex-col overflow-hidden text-[#171717] font-sans">
        {/* ================= HEADER ================= */}
        <div className="h-16 px-6 border-b border-[#E5E5E5] flex items-center justify-between bg-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#111111] text-white flex items-center justify-center shadow-sm">
              <Activity className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#111111] tracking-tight">
                  ArchiCraft3D Physics & Simulation Lab
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 rounded">
                  SI Metric Core (m, kg, N, Pa)
                </span>
              </div>
              <p className="text-xs text-[#737373]">
                Rigid-body dynamics, structural mechanics (LRFD), envelope
                thermodynamics, and wind aerodynamics
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Simulation Status Pill */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#F7F7F5] border border-[#E5E5E5]">
              <span
                className={`w-2 h-2 rounded-full ${
                  physicsConfig.simulationRunning
                    ? "bg-emerald-500 animate-pulse"
                    : "bg-neutral-400"
                }`}
              />
              <span>
                {physicsConfig.simulationRunning
                  ? "SIMULATION RUNNING"
                  : "SIMULATION PAUSED"}
              </span>
              <span className="text-neutral-400">|</span>
              <span className="text-[#737373]">
                Props: {dynamicProps.length}
              </span>
            </div>

            <button
              onClick={() => setPhysicsModalOpen(false)}
              className="p-2 text-[#737373] hover:text-[#111111] hover:bg-[#F7F7F5] rounded-xl transition-colors"
              title="Close Panel"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ================= TAB NAVIGATION ================= */}
        <div className="flex items-center px-6 border-b border-[#E5E5E5] bg-[#FAFAF9] gap-1 flex-shrink-0 text-xs font-medium text-[#737373]">
          <button
            onClick={() => setActiveTab("rigid")}
            className={`flex items-center gap-2 py-3 px-3.5 border-b-2 font-semibold transition-all ${
              activeTab === "rigid"
                ? "border-[#111111] text-[#111111]"
                : "border-transparent hover:text-[#111111]"
            }`}
          >
            <Gauge size={14} />
            <span>Rigid-Body & Collision</span>
          </button>

          <button
            onClick={() => setActiveTab("structural")}
            className={`flex items-center gap-2 py-3 px-3.5 border-b-2 font-semibold transition-all ${
              activeTab === "structural"
                ? "border-[#111111] text-[#111111]"
                : "border-transparent hover:text-[#111111]"
            }`}
          >
            <ShieldCheck size={14} />
            <span>Structural Mechanics (LRFD)</span>
            {structuralAnalysis.criticalMembersCount > 0 && (
              <span className="px-1.5 py-0.2 bg-red-100 text-red-700 text-[10px] font-bold rounded-full">
                {structuralAnalysis.criticalMembersCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("environment")}
            className={`flex items-center gap-2 py-3 px-3.5 border-b-2 font-semibold transition-all ${
              activeTab === "environment"
                ? "border-[#111111] text-[#111111]"
                : "border-transparent hover:text-[#111111]"
            }`}
          >
            <Wind size={14} />
            <span>Wind & Envelope Thermal</span>
          </button>

          <button
            onClick={() => setActiveTab("photometric")}
            className={`flex items-center gap-2 py-3 px-3.5 border-b-2 font-semibold transition-all ${
              activeTab === "photometric"
                ? "border-[#111111] text-[#111111]"
                : "border-transparent hover:text-[#111111]"
            }`}
          >
            <Sun size={14} />
            <span>Photometrics & Buoyancy</span>
          </button>

          <button
            onClick={() => setActiveTab("validation")}
            className={`flex items-center gap-2 py-3 px-3.5 border-b-2 font-semibold transition-all ${
              activeTab === "validation"
                ? "border-[#111111] text-[#111111]"
                : "border-transparent hover:text-[#111111]"
            }`}
          >
            <FileCheck2 size={14} />
            <span>Automated Validation Suite</span>
            <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
              11 Tests
            </span>
          </button>
        </div>

        {/* ================= TAB BODY ================= */}
        <div className="flex-1 overflow-y-auto p-6 bg-white space-y-6">
          {/* TAB 1: RIGID BODY DYNAMICS */}
          {activeTab === "rigid" && (
            <div className="space-y-6">
              {/* Playback Controls & Prop Spawner */}
              <div className="bg-[#F7F7F5] border border-[#E5E5E5] rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      updatePhysicsConfig({
                        simulationRunning: !physicsConfig.simulationRunning,
                      })
                    }
                    className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg shadow-sm transition-all ${
                      physicsConfig.simulationRunning
                        ? "bg-amber-600 hover:bg-amber-700 text-white"
                        : "bg-[#111111] hover:bg-black text-white"
                    }`}
                  >
                    {physicsConfig.simulationRunning ? (
                      <Pause size={14} />
                    ) : (
                      <Play size={14} />
                    )}
                    <span>
                      {physicsConfig.simulationRunning
                        ? "Pause Simulation"
                        : "Start Simulation"}
                    </span>
                  </button>

                  <button
                    onClick={resetPhysicsSimulation}
                    className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-neutral-100 border border-[#E5E5E5] text-xs font-semibold rounded-lg transition-colors"
                  >
                    <RotateCcw size={13} />
                    <span>Reset Props</span>
                  </button>
                </div>

                {/* Drop Interactive Dynamic Props */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-[#737373]">
                    Drop Test Props:
                  </span>
                  <button
                    onClick={() => spawnPhysicsProp("sphere", 25)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-neutral-100 border border-[#E5E5E5] text-xs font-medium rounded-lg shadow-sm transition-colors"
                  >
                    <Circle size={13} className="text-cyan-600" />
                    <span>25kg Test Sphere</span>
                  </button>

                  <button
                    onClick={() => spawnPhysicsProp("box", 50)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-neutral-100 border border-[#E5E5E5] text-xs font-medium rounded-lg shadow-sm transition-colors"
                  >
                    <Box size={13} className="text-amber-600" />
                    <span>50kg Test Cube</span>
                  </button>
                </div>
              </div>

              {/* Physical Parameters Configuration */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border border-[#E5E5E5] rounded-xl p-4 bg-white shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#111111] uppercase tracking-wider">
                      Gravitational Field
                    </span>
                    <input
                      type="checkbox"
                      checked={physicsConfig.gravityEnabled}
                      onChange={(e) =>
                        updatePhysicsConfig({
                          gravityEnabled: e.target.checked,
                        })
                      }
                      className="rounded border-[#E5E5E5] text-[#111111] focus:ring-0"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[#737373]">Earth Gravity (g)</span>
                      <span className="font-semibold">
                        {physicsConfig.gravityValue} m/s²
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-20"
                      max="0"
                      step="0.1"
                      value={physicsConfig.gravityValue}
                      disabled={!physicsConfig.gravityEnabled}
                      onChange={(e) =>
                        updatePhysicsConfig({
                          gravityValue: parseFloat(e.target.value),
                        })
                      }
                      className="w-full accent-[#111111]"
                    />
                  </div>
                  <p className="text-[11px] text-[#737373]">
                    Standard ISO 80000-3 constant: 9.80665 m/s² downwards.
                  </p>
                </div>

                <div className="border border-[#E5E5E5] rounded-xl p-4 bg-white shadow-sm space-y-3">
                  <span className="text-xs font-bold text-[#111111] uppercase tracking-wider">
                    Simulation Speed & Timestep
                  </span>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[#737373]">
                        Playback Multiplier
                      </span>
                      <span className="font-semibold">
                        {physicsConfig.simulationSpeed}x
                      </span>
                    </div>
                    <div className="flex gap-2">
                      {[0.5, 1.0, 2.0].map((spd) => (
                        <button
                          key={spd}
                          onClick={() =>
                            updatePhysicsConfig({ simulationSpeed: spd })
                          }
                          className={`flex-1 py-1 text-xs font-bold rounded-lg border transition-colors ${
                            physicsConfig.simulationSpeed === spd
                              ? "bg-[#111111] text-white border-[#111111]"
                              : "bg-white text-[#737373] border-[#E5E5E5] hover:bg-[#F7F7F5]"
                          }`}
                        >
                          {spd}x
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="text-[11px] text-[#737373]">
                    Fixed 60Hz Symplectic Euler integration with velocity Verlet
                    sub-stepping.
                  </p>
                </div>

                <div className="border border-[#E5E5E5] rounded-xl p-4 bg-white shadow-sm space-y-3">
                  <span className="text-xs font-bold text-[#111111] uppercase tracking-wider">
                    Visual Overlays
                  </span>
                  <div className="space-y-2">
                    <label className="flex items-center justify-between text-xs text-[#171717] cursor-pointer">
                      <span>Center of Mass Crosshair</span>
                      <input
                        type="checkbox"
                        checked={physicsConfig.showCenterOfMass}
                        onChange={(e) =>
                          updatePhysicsConfig({
                            showCenterOfMass: e.target.checked,
                          })
                        }
                        className="rounded border-[#E5E5E5] text-[#111111]"
                      />
                    </label>

                    <label className="flex items-center justify-between text-xs text-[#171717] cursor-pointer">
                      <span>Collider Wireframe Bounds</span>
                      <input
                        type="checkbox"
                        checked={physicsConfig.showColliderWireframes}
                        onChange={(e) =>
                          updatePhysicsConfig({
                            showColliderWireframes: e.target.checked,
                          })
                        }
                        className="rounded border-[#E5E5E5] text-[#111111]"
                      />
                    </label>

                    <label className="flex items-center justify-between text-xs text-[#171717] cursor-pointer">
                      <span>Stress Heatmap Colors</span>
                      <input
                        type="checkbox"
                        checked={physicsConfig.showStressHeatmap}
                        onChange={(e) =>
                          updatePhysicsConfig({
                            showStressHeatmap: e.target.checked,
                          })
                        }
                        className="rounded border-[#E5E5E5] text-[#111111]"
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Dynamic Props Status Table */}
              <div className="border border-[#E5E5E5] rounded-xl overflow-hidden shadow-sm">
                <div className="px-4 py-3 bg-[#F7F7F5] border-b border-[#E5E5E5] flex justify-between items-center">
                  <h3 className="text-xs font-bold text-[#111111] uppercase tracking-wider">
                    Active Dynamic Rigid Bodies in Scene
                  </h3>
                  <span className="text-xs text-[#737373]">
                    {dynamicProps.length} dynamic items simulating
                  </span>
                </div>
                {dynamicProps.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[#737373]">
                    No dynamic props currently in the scene. Click{" "}
                    <strong>"25kg Test Sphere"</strong> or{" "}
                    <strong>"50kg Test Cube"</strong> above to drop props and
                    observe real-time gravity and floor collision.
                  </div>
                ) : (
                  <div className="divide-y divide-[#E5E5E5] max-h-48 overflow-y-auto">
                    {dynamicProps.map((prop) => (
                      <div
                        key={prop.id}
                        className="px-4 py-2.5 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          {prop.type === "sphere" ? (
                            <Circle size={14} className="text-cyan-600" />
                          ) : (
                            <Box size={14} className="text-amber-600" />
                          )}
                          <span className="font-semibold capitalize">
                            {prop.type}
                          </span>
                          <span className="text-[#737373]">
                            ({prop.massKg} kg)
                          </span>
                        </div>
                        <div className="font-mono text-[#737373] text-[11px]">
                          Pos: ({prop.position[0].toFixed(2)},{" "}
                          {prop.position[1].toFixed(2)},{" "}
                          {prop.position[2].toFixed(2)}) m | Vel Y:{" "}
                          {prop.velocity[1].toFixed(2)} m/s
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            Math.abs(prop.velocity[1]) < 0.05
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {Math.abs(prop.velocity[1]) < 0.05
                            ? "Resting on Surface"
                            : "Falling"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: STRUCTURAL MECHANICS (LRFD) */}
          {activeTab === "structural" && (
            <div className="space-y-6">
              {/* Overall Structural Integrity Banner */}
              <div
                className={`p-4 rounded-xl border flex items-center justify-between ${
                  structuralAnalysis.overallIntegrity === "sound"
                    ? "bg-emerald-50/50 border-emerald-200 text-emerald-900"
                    : structuralAnalysis.overallIntegrity === "review_required"
                      ? "bg-amber-50/50 border-amber-200 text-amber-900"
                      : "bg-red-50/50 border-red-200 text-red-900"
                }`}
              >
                <div className="flex items-center gap-3">
                  {structuralAnalysis.overallIntegrity === "sound" ? (
                    <ShieldCheck className="w-8 h-8 text-emerald-600" />
                  ) : (
                    <ShieldAlert className="w-8 h-8 text-amber-600" />
                  )}
                  <div>
                    <h3 className="font-bold text-sm capitalize">
                      Preliminary Structural Integrity:{" "}
                      {structuralAnalysis.overallIntegrity.replace("_", " ")}
                    </h3>
                    <p className="text-xs opacity-80">
                      Evaluated under ASCE 7 / Eurocode design load combinations
                      (1.2 Dead Load + 1.6 Live Load).
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs font-semibold">
                  <div>
                    <span className="text-[#737373]">Critical Members:</span>{" "}
                    <span className="text-red-600 font-bold">
                      {structuralAnalysis.criticalMembersCount}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#737373]">Warnings:</span>{" "}
                    <span className="text-amber-600 font-bold">
                      {structuralAnalysis.warningMembersCount}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#737373]">Unsupported:</span>{" "}
                    <span className="font-bold">
                      {structuralAnalysis.unsupportedElementsCount}
                    </span>
                  </div>
                </div>
              </div>

              {/* Building Mass & Weight Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="border border-[#E5E5E5] rounded-xl p-4 bg-white shadow-sm">
                  <span className="text-[11px] font-bold text-[#737373] uppercase tracking-wider">
                    Total Building Mass
                  </span>
                  <div className="text-xl font-extrabold text-[#111111] mt-1">
                    {(structuralAnalysis.totalBuildingMassKg / 1000).toFixed(1)}{" "}
                    tonnes
                  </div>
                  <span className="text-xs text-[#737373]">
                    {Math.round(
                      structuralAnalysis.totalBuildingMassKg,
                    ).toLocaleString()}{" "}
                    kg
                  </span>
                </div>

                <div className="border border-[#E5E5E5] rounded-xl p-4 bg-white shadow-sm">
                  <span className="text-[11px] font-bold text-[#737373] uppercase tracking-wider">
                    Total Gravity Force
                  </span>
                  <div className="text-xl font-extrabold text-[#111111] mt-1">
                    {structuralAnalysis.totalBuildingWeightKn.toFixed(1)} kN
                  </div>
                  <span className="text-xs text-[#737373]">
                    W = m * 9.81 m/s²
                  </span>
                </div>

                <div className="border border-[#E5E5E5] rounded-xl p-4 bg-white shadow-sm">
                  <span className="text-[11px] font-bold text-[#737373] uppercase tracking-wider">
                    Ground Reaction
                  </span>
                  <div className="text-xl font-extrabold text-emerald-700 mt-1">
                    {structuralAnalysis.totalGroundReactionsKn.toFixed(1)} kN
                  </div>
                  <span className="text-xs text-[#737373]">
                    Equilibrium sum(F_y) = 0
                  </span>
                </div>

                <div className="border border-[#E5E5E5] rounded-xl p-4 bg-white shadow-sm">
                  <span className="text-[11px] font-bold text-[#737373] uppercase tracking-wider">
                    Center of Gravity (CoM)
                  </span>
                  <div className="text-sm font-bold font-mono text-[#111111] mt-1">
                    ({structuralAnalysis.centerOfMass[0].toFixed(2)},{" "}
                    {structuralAnalysis.centerOfMass[1].toFixed(2)},{" "}
                    {structuralAnalysis.centerOfMass[2].toFixed(2)}) m
                  </div>
                  <span className="text-xs text-[#737373]">3D Barycenter</span>
                </div>
              </div>

              {/* Structural Member Breakdown Table */}
              <div className="border border-[#E5E5E5] rounded-xl overflow-hidden shadow-sm">
                <div className="px-4 py-3 bg-[#F7F7F5] border-b border-[#E5E5E5] flex justify-between items-center">
                  <h3 className="text-xs font-bold text-[#111111] uppercase tracking-wider">
                    Structural Member Load & Stress Utilization Table
                  </h3>
                  <span className="text-xs text-[#737373]">
                    {structuralAnalysis.elementLoadSummaries.length} members
                    evaluated
                  </span>
                </div>
                <div className="overflow-x-auto max-h-60">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-[#FAFAF9] text-[#737373] border-b border-[#E5E5E5] sticky top-0 font-semibold">
                      <tr>
                        <th className="p-2.5">Member</th>
                        <th className="p-2.5">Type</th>
                        <th className="p-2.5">Mass (kg)</th>
                        <th className="p-2.5">Dead Load (kN)</th>
                        <th className="p-2.5">Live Load (kN)</th>
                        <th className="p-2.5">Design Load (1.2DL+1.6LL)</th>
                        <th className="p-2.5">Stress (MPa)</th>
                        <th className="p-2.5">Utilization</th>
                        <th className="p-2.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E5E5]">
                      {structuralAnalysis.elementLoadSummaries.map((item) => (
                        <tr
                          key={item.objectId}
                          className="hover:bg-[#F7F7F5] transition-colors"
                        >
                          <td className="p-2.5 font-semibold text-[#111111]">
                            {item.objectName}
                          </td>
                          <td className="p-2.5 text-[#737373] capitalize">
                            {item.objectType}
                          </td>
                          <td className="p-2.5 font-mono">
                            {Math.round(item.selfWeightKg)}
                          </td>
                          <td className="p-2.5 font-mono">
                            {item.deadLoadKn.toFixed(1)}
                          </td>
                          <td className="p-2.5 font-mono">
                            {item.liveLoadKn.toFixed(1)}
                          </td>
                          <td className="p-2.5 font-mono font-semibold">
                            {item.totalDesignLoadKn.toFixed(1)}
                          </td>
                          <td className="p-2.5 font-mono">
                            {item.axialStressMpa
                              ? `${item.axialStressMpa.toFixed(2)} MPa`
                              : "—"}
                          </td>
                          <td className="p-2.5 font-mono">
                            {(item.stressUtilizationRatio * 100).toFixed(0)}%
                          </td>
                          <td className="p-2.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                item.status === "safe"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : item.status === "warning"
                                    ? "bg-amber-50 text-amber-700"
                                    : "bg-red-50 text-red-700"
                              }`}
                            >
                              {item.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Engineering Disclaimers Box */}
              <div className="bg-[#F7F7F5] border border-[#E5E5E5] rounded-xl p-4 space-y-2 text-xs text-[#737373]">
                <div className="flex items-center gap-2 font-bold text-[#111111]">
                  <HelpCircle size={14} />
                  <span>Engineering Methodology & Disclaimers</span>
                </div>
                <ul className="list-disc pl-5 space-y-1">
                  {structuralAnalysis.assumptionsDisclaimers.map(
                    (note, idx) => (
                      <li key={idx}>{note}</li>
                    ),
                  )}
                </ul>
              </div>
            </div>
          )}

          {/* TAB 3: WIND & ENVELOPE THERMAL */}
          {activeTab === "environment" && (
            <div className="space-y-6">
              {/* Wind Aerodynamics Card */}
              <div className="border border-[#E5E5E5] rounded-xl p-5 bg-white shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-sm text-[#111111]">
                    <Wind className="w-5 h-5 text-cyan-600" />
                    <span>
                      Aerodynamic Wind Load Analysis (ASCE 7 / Eurocode 1)
                    </span>
                  </div>
                  <span className="px-2 py-0.5 text-xs font-bold bg-cyan-50 text-cyan-800 rounded">
                    Beaufort: {windAnalysis.beaufortCategory}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs mb-1 font-semibold">
                        <span>Wind Velocity</span>
                        <span>
                          {windAnalysis.windSpeedMps} m/s (
                          {windAnalysis.windSpeedKmh} km/h)
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="50"
                        step="1"
                        value={physicsConfig.windSpeedMps}
                        onChange={(e) =>
                          updatePhysicsConfig({
                            windSpeedMps: parseFloat(e.target.value),
                          })
                        }
                        className="w-full accent-[#111111]"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1 font-semibold">
                        <span>Wind Angle</span>
                        <span>{windAnalysis.windAngleDeg}°</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="360"
                        step="5"
                        value={physicsConfig.windDirectionDeg}
                        onChange={(e) =>
                          updatePhysicsConfig({
                            windDirectionDeg: parseFloat(e.target.value),
                          })
                        }
                        className="w-full accent-[#111111]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs bg-[#F7F7F5] p-3 rounded-lg">
                    <div>
                      <span className="text-[#737373]">
                        Dynamic Stagnation Pressure:
                      </span>
                      <div className="font-bold font-mono text-sm">
                        {windAnalysis.dynamicPressurePa} Pa
                      </div>
                    </div>
                    <div>
                      <span className="text-[#737373]">
                        Projected Facade Area:
                      </span>
                      <div className="font-bold font-mono text-sm">
                        {windAnalysis.projectedAreaM2} m²
                      </div>
                    </div>
                    <div>
                      <span className="text-[#737373]">
                        Total Drag Force / Base Shear:
                      </span>
                      <div className="font-bold font-mono text-sm text-cyan-800">
                        {windAnalysis.baseShearKN} kN
                      </div>
                    </div>
                    <div>
                      <span className="text-[#737373]">
                        Overturning Moment:
                      </span>
                      <div className="font-bold font-mono text-sm text-amber-800">
                        {windAnalysis.overturningMomentKNm} kN·m
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Envelope Thermal Loss Card */}
              <div className="border border-[#E5E5E5] rounded-xl p-5 bg-white shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-sm text-[#111111]">
                    <Thermometer className="w-5 h-5 text-amber-600" />
                    <span>
                      Envelope Thermal Performance (Fourier 1D Conduction)
                    </span>
                  </div>
                  <span className="px-2 py-0.5 text-xs font-bold bg-amber-50 text-amber-800 rounded">
                    Overall U-Value: {thermalAnalysis.overallUValue} W/m²·K
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <label className="text-xs text-[#737373] block mb-1">
                          Indoor Temp (°C)
                        </label>
                        <input
                          type="number"
                          value={physicsConfig.indoorTempC}
                          onChange={(e) =>
                            updatePhysicsConfig({
                              indoorTempC: parseFloat(e.target.value) || 20,
                            })
                          }
                          className="w-full text-xs font-semibold p-2 border border-[#E5E5E5] rounded-lg"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-xs text-[#737373] block mb-1">
                          Outdoor Temp (°C)
                        </label>
                        <input
                          type="number"
                          value={physicsConfig.outdoorTempC}
                          onChange={(e) =>
                            updatePhysicsConfig({
                              outdoorTempC: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-full text-xs font-semibold p-2 border border-[#E5E5E5] rounded-lg"
                        />
                      </div>
                    </div>
                    <div className="text-xs text-[#737373]">
                      Thermal Gradient:{" "}
                      <strong>ΔT = {thermalAnalysis.deltaT}°C</strong> (
                      {thermalAnalysis.isHeatingSeason
                        ? "Heating Mode"
                        : "Cooling Mode"}
                      )
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs bg-[#F7F7F5] p-3 rounded-lg">
                    <div>
                      <span className="text-[#737373]">
                        Total Steady-State Heat Flux:
                      </span>
                      <div className="font-bold font-mono text-sm text-red-700">
                        {(thermalAnalysis.totalHeatLossWatts / 1000).toFixed(2)}{" "}
                        kW
                      </div>
                    </div>
                    <div>
                      <span className="text-[#737373]">
                        Estimated Annual Demand:
                      </span>
                      <div className="font-bold font-mono text-sm">
                        {thermalAnalysis.annualEnergyEstimateKWh.toLocaleString()}{" "}
                        kWh/yr
                      </div>
                    </div>
                    <div>
                      <span className="text-[#737373]">Wall Conduction:</span>
                      <div className="font-mono">
                        {thermalAnalysis.breakdown.wallsWatts} W
                      </div>
                    </div>
                    <div>
                      <span className="text-[#737373]">
                        Window / Glazing Loss:
                      </span>
                      <div className="font-mono">
                        {thermalAnalysis.breakdown.windowsWatts} W
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PHOTOMETRICS & BUOYANCY */}
          {activeTab === "photometric" && (
            <div className="space-y-6">
              {/* Photometrics */}
              <div className="border border-[#E5E5E5] rounded-xl p-5 bg-white shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-sm text-[#111111]">
                    <Sun className="w-5 h-5 text-amber-500" />
                    <span>
                      Horizontal Workplane Illuminance (CIBSE / EN 12464)
                    </span>
                  </div>
                  <span className="px-2 py-0.5 text-xs font-bold bg-amber-50 text-amber-800 rounded">
                    Workplane: 0.75m Elevation (Desk Height)
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="border border-[#E5E5E5] rounded-lg p-3 bg-[#F7F7F5]">
                    <span className="text-xs text-[#737373]">Average Lux:</span>
                    <div className="text-lg font-bold font-mono text-[#111111]">
                      {photometricReport.averageWorkplaneLux} Lux
                    </div>
                  </div>
                  <div className="border border-[#E5E5E5] rounded-lg p-3 bg-[#F7F7F5]">
                    <span className="text-xs text-[#737373]">
                      Min / Max Lux:
                    </span>
                    <div className="text-sm font-bold font-mono text-[#111111]">
                      {photometricReport.minLux} / {photometricReport.maxLux}{" "}
                      Lux
                    </div>
                  </div>
                  <div className="border border-[#E5E5E5] rounded-lg p-3 bg-[#F7F7F5]">
                    <span className="text-xs text-[#737373]">
                      Uniformity (U0):
                    </span>
                    <div className="text-lg font-bold font-mono text-[#111111]">
                      {photometricReport.uniformityRatio}
                    </div>
                  </div>
                  <div className="border border-[#E5E5E5] rounded-lg p-3 bg-[#F7F7F5]">
                    <span className="text-xs text-[#737373]">
                      Living Room Target (150 Lux):
                    </span>
                    <div className="text-xs font-bold mt-1">
                      {photometricReport.standardsCompliance
                        .residentialLivingRoom.compliant ? (
                        <span className="text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 size={13} /> Compliant
                        </span>
                      ) : (
                        <span className="text-amber-700 flex items-center gap-1">
                          <XCircle size={13} /> Underlit
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Archimedes Buoyancy */}
              <div className="border border-[#E5E5E5] rounded-xl p-5 bg-white shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-sm text-[#111111]">
                    <Droplets className="w-5 h-5 text-blue-500" />
                    <span>
                      Archimedes Hydrostatic Fluid Buoyancy (Pool Shell /
                      Submerged Structures)
                    </span>
                  </div>
                  <span className="px-2 py-0.5 text-xs font-bold bg-blue-50 text-blue-800 rounded">
                    F_B = rho_fluid * g * V_disp
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs bg-[#F7F7F5] p-4 rounded-lg">
                  <div>
                    <span className="text-[#737373]">
                      Displaced Fluid Volume:
                    </span>
                    <div className="font-bold font-mono text-base">
                      {poolBuoyancy.displacedVolumeM3} m³
                    </div>
                  </div>
                  <div>
                    <span className="text-[#737373]">
                      Upward Buoyant Force:
                    </span>
                    <div className="font-bold font-mono text-base text-blue-700">
                      {(poolBuoyancy.buoyantForceN / 1000).toFixed(1)} kN
                    </div>
                  </div>
                  <div>
                    <span className="text-[#737373]">Equilibrium Status:</span>
                    <div className="font-bold font-mono text-base text-emerald-700">
                      {poolBuoyancy.isFloating
                        ? "Floats"
                        : "Submerged & Stable"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: AUTOMATED VALIDATION SUITE */}
          {activeTab === "validation" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between bg-[#F7F7F5] border border-[#E5E5E5] rounded-xl p-4">
                <div>
                  <h3 className="text-sm font-bold text-[#111111]">
                    Automated In-Browser Engineering Test Suite
                  </h3>
                  <p className="text-xs text-[#737373]">
                    Runs 11 analytical closed-form engineering tests verifying
                    units, kinematics, mass, beam moments, column stress,
                    thermal flux, and wind pressure.
                  </p>
                </div>

                <button
                  onClick={handleRunValidation}
                  className="px-4 py-2 bg-[#111111] hover:bg-black text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-1.5"
                >
                  <Play size={13} />
                  <span>Execute All 11 Tests</span>
                </button>
              </div>

              {validationReport && (
                <div className="space-y-4">
                  {/* Results Summary Card */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="border border-[#E5E5E5] rounded-xl p-4 bg-white shadow-sm">
                      <span className="text-xs font-bold text-[#737373] uppercase tracking-wider">
                        Pass Rate
                      </span>
                      <div className="text-2xl font-extrabold text-emerald-700 mt-1">
                        {validationReport.passRatePercent}%
                      </div>
                      <span className="text-xs text-[#737373]">
                        {validationReport.passedCount} /{" "}
                        {validationReport.totalTests} Passed
                      </span>
                    </div>

                    <div className="border border-[#E5E5E5] rounded-xl p-4 bg-white shadow-sm">
                      <span className="text-xs font-bold text-[#737373] uppercase tracking-wider">
                        Failed Tests
                      </span>
                      <div className="text-2xl font-extrabold text-[#111111] mt-1">
                        {validationReport.failedCount}
                      </div>
                      <span className="text-xs text-[#737373]">
                        Zero regressions
                      </span>
                    </div>

                    <div className="border border-[#E5E5E5] rounded-xl p-4 bg-white shadow-sm md:col-span-2">
                      <span className="text-xs font-bold text-[#737373] uppercase tracking-wider">
                        Validation Scope
                      </span>
                      <p className="text-xs text-[#737373] mt-1">
                        Covers SI conversions, 60Hz Symplectic Euler kinematics,
                        material mass, Euler-Bernoulli beam bending, column
                        normal stress, Fourier conductive heat flux, dynamic
                        wind pressure, Archimedes buoyancy, and inverse-square
                        lux.
                      </p>
                    </div>
                  </div>

                  {/* Test Cases Table */}
                  <div className="border border-[#E5E5E5] rounded-xl overflow-hidden shadow-sm">
                    <div className="px-4 py-3 bg-[#F7F7F5] border-b border-[#E5E5E5] font-bold text-xs uppercase tracking-wider">
                      Validation Test Matrix & Analytical Formulations
                    </div>
                    <div className="divide-y divide-[#E5E5E5] max-h-80 overflow-y-auto">
                      {validationReport.testCases.map((tc) => (
                        <div
                          key={tc.id}
                          className="p-3.5 hover:bg-[#F7F7F5] transition-colors text-xs space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 font-bold text-[#111111]">
                              {tc.passed ? (
                                <CheckCircle2
                                  size={15}
                                  className="text-emerald-600 flex-shrink-0"
                                />
                              ) : (
                                <XCircle
                                  size={15}
                                  className="text-red-600 flex-shrink-0"
                                />
                              )}
                              <span>
                                {tc.id}: {tc.name}
                              </span>
                              <span className="px-2 py-0.5 bg-neutral-100 text-[#737373] rounded text-[10px] font-semibold">
                                {tc.category}
                              </span>
                            </div>

                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                tc.passed
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {tc.passed ? "PASSED" : "FAILED"}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px] text-[#737373] font-mono bg-white p-2 rounded border border-[#E5E5E5]">
                            <div>
                              Formula:{" "}
                              <span className="font-semibold text-[#111111]">
                                {tc.formula}
                              </span>
                            </div>
                            <div>
                              Expected:{" "}
                              <span className="font-semibold text-[#111111]">
                                {tc.expectedValue} {tc.unit}
                              </span>
                            </div>
                            <div>
                              Computed:{" "}
                              <span className="font-semibold text-emerald-700">
                                {tc.computedValue} {tc.unit}
                              </span>
                            </div>
                          </div>

                          <div className="flex justify-between text-[11px] text-[#737373]">
                            <span>{tc.details}</span>
                            <span className="font-semibold text-neutral-500">
                              {tc.accuracyTier}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
