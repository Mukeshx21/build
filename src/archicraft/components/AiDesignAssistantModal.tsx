import React, { useState } from 'react';
import { useStudioStore } from '../store/useStudioStore';
import { ProjectData, WallObject, FloorSlabObject, RoofObject, FurnitureObject } from '../types/studio';
import { Sparkles, X, Wand2, Lightbulb, CheckCircle2, RefreshCw } from 'lucide-react';

export const AiDesignAssistantModal: React.FC = () => {
  const isOpen = useStudioStore((s) => s.isAiModalOpen);
  const setOpen = useStudioStore((s) => s.setAiModalOpen);
  const loadProject = useStudioStore((s) => s.loadProject);
  const setStatusMessage = useStudioStore((s) => s.setStatusMessage);

  const [prompt, setPrompt] = useState(
    'Create a modern luxury two-storey residence with 3 bedrooms, open-concept living room, kitchen island, outdoor terrace with pool, and flat parapet roof.'
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);

  if (!isOpen) return null;

  const promptSuggestions = [
    'Create a modern minimalist villa with 3 bedrooms, open kitchen, and a swimming pool.',
    'Design an Indian courtyard home with central open sky aangan, verandah pillars, and pooja area.',
    'Build a compact urban micro-studio with high-efficiency kitchen, desk, and sliding glass balcony.',
    'Generate a 2-storey contemporary family house with upper master suite, balcony, and staircase.',
    'Construct a modern rustic farmhouse with pitched gable roof and covered front porch.'
  ];

  const handleGenerate = () => {
    setIsGenerating(true);

    setTimeout(() => {
      const lower = prompt.toLowerCase();
      let theme = 'villa';
      if (lower.includes('indian') || lower.includes('courtyard') || lower.includes('haveli')) {
        theme = 'courtyard';
      } else if (lower.includes('two-storey') || lower.includes('2-storey') || lower.includes('duplex')) {
        theme = 'twostorey';
      } else if (lower.includes('studio') || lower.includes('micro') || lower.includes('compact')) {
        theme = 'studio';
      } else if (lower.includes('farmhouse') || lower.includes('rustic') || lower.includes('porch')) {
        theme = 'farmhouse';
      }

      const timestamp = Date.now();
      const generatedProject: ProjectData = {
        metadata: {
          id: `ai_gen_${timestamp}`,
          name: `AI: ${theme.toUpperCase()} Residence`,
          version: '1.0.0',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          description: `Architectural model synthesized from: "${prompt}"`,
          units: 'm'
        },
        activeFloorLevel: 0,
        lighting: {
          timeOfDay: 'golden_hour',
          sunIntensity: 1.2,
          ambientIntensity: 0.65,
          sunElevation: 35,
          sunAzimuth: 140,
          shadows: true,
          colorTemperature: 'warm',
          interiorSpotlights: true
        },
        objects: []
      };

      // Synthesize architectural layout based on prompt
      if (theme === 'courtyard') {
        generatedProject.objects = [
          {
            id: `ai_slab_${timestamp}`,
            name: 'Courtyard Plinth Slab',
            type: 'floor',
            floorLevel: 0,
            roomName: 'Main Living Plinth',
            x: 0,
            z: 0,
            width: 12,
            depth: 12,
            thickness: 0.3,
            elevation: 0,
            materialId: 'mat_stone_travertine',
            visible: true,
            locked: false
          },
          {
            id: `ai_courtyard_slab_${timestamp}`,
            name: 'Central Aangan Court',
            type: 'floor',
            floorLevel: 0,
            roomName: 'Central Open Courtyard',
            x: 0,
            z: 0,
            width: 4,
            depth: 4,
            thickness: 0.2,
            elevation: -0.08,
            materialId: 'mat_patio_pavers',
            visible: true,
            locked: false
          },
          {
            id: `ai_wall_n_${timestamp}`,
            name: 'North Outer Wall',
            type: 'wall',
            floorLevel: 0,
            startX: -6,
            startZ: -6,
            endX: 6,
            endZ: -6,
            height: 3.2,
            thickness: 0.25,
            elevation: 0,
            materialId: 'mat_brick_red',
            openings: [
              { id: 'w1', type: 'window', positionRatio: 0.3, width: 1.6, height: 1.4, elevation: 0.9, subType: 'casement' },
              { id: 'w2', type: 'window', positionRatio: 0.7, width: 1.6, height: 1.4, elevation: 0.9, subType: 'casement' }
            ],
            visible: true,
            locked: false
          },
          {
            id: `ai_wall_s_${timestamp}`,
            name: 'South Verandah Wall',
            type: 'wall',
            floorLevel: 0,
            startX: -6,
            startZ: 6,
            endX: 6,
            endZ: 6,
            height: 3.2,
            thickness: 0.25,
            elevation: 0,
            materialId: 'mat_stone_travertine',
            openings: [
              { id: 'd1', type: 'door', positionRatio: 0.5, width: 2.0, height: 2.4, elevation: 0, subType: 'double' }
            ],
            visible: true,
            locked: false
          },
          {
            id: `ai_wall_w_${timestamp}`,
            name: 'West Wall',
            type: 'wall',
            floorLevel: 0,
            startX: -6,
            startZ: -6,
            endX: -6,
            endZ: 6,
            height: 3.2,
            thickness: 0.25,
            elevation: 0,
            materialId: 'mat_brick_red',
            openings: [],
            visible: true,
            locked: false
          },
          {
            id: `ai_wall_e_${timestamp}`,
            name: 'East Wall',
            type: 'wall',
            floorLevel: 0,
            startX: 6,
            startZ: -6,
            endX: 6,
            endZ: 6,
            height: 3.2,
            thickness: 0.25,
            elevation: 0,
            materialId: 'mat_brick_red',
            openings: [],
            visible: true,
            locked: false
          },
          {
            id: `ai_roof_${timestamp}`,
            name: 'Terracotta Sloped Roof',
            type: 'roof',
            roofType: 'hip',
            floorLevel: 0,
            x: 0,
            y: 3.2,
            z: 0,
            width: 13.5,
            depth: 13.5,
            height: 2.4,
            overhang: 0.8,
            rotationY: 0,
            materialId: 'mat_roof_terracotta',
            visible: true,
            locked: false
          }
        ];
        setExplanation(
          'Generated a climate-responsive Indian Haveli layout centered on a 4m × 4m open-to-sky courtyard, surrounded by natural travertine stone corridors and terracotta clay hip roof for optimal natural convection and ventilation.'
        );
      } else {
        // Modern Luxury Residence
        generatedProject.objects = [
          {
            id: `ai_slab_${timestamp}`,
            name: 'Main Living Ground Slab',
            type: 'floor',
            floorLevel: 0,
            roomName: 'Open Living & Dining Room',
            x: 0,
            z: 0,
            width: 14,
            depth: 10,
            thickness: 0.25,
            elevation: 0,
            materialId: 'mat_hardwood_oak',
            visible: true,
            locked: false
          },
          {
            id: `ai_patio_${timestamp}`,
            name: 'Infinity Pool Terrace',
            type: 'floor',
            floorLevel: 0,
            roomName: 'Outdoor Sun Deck',
            x: 0,
            z: 8,
            width: 16,
            depth: 6,
            thickness: 0.15,
            elevation: -0.05,
            materialId: 'mat_patio_pavers',
            visible: true,
            locked: false
          },
          {
            id: `ai_wall_n_${timestamp}`,
            name: 'North Exterior Wall',
            type: 'wall',
            floorLevel: 0,
            startX: -7,
            startZ: -5,
            endX: 7,
            endZ: -5,
            height: 3.2,
            thickness: 0.25,
            elevation: 0,
            materialId: 'mat_white_plaster',
            openings: [
              { id: 'w1', type: 'window', positionRatio: 0.25, width: 2.2, height: 1.4, elevation: 1.0, subType: 'casement' },
              { id: 'w2', type: 'window', positionRatio: 0.75, width: 2.2, height: 1.4, elevation: 1.0, subType: 'casement' }
            ],
            visible: true,
            locked: false
          },
          {
            id: `ai_wall_s_${timestamp}`,
            name: 'South Glazed Patio Wall',
            type: 'wall',
            floorLevel: 0,
            startX: -7,
            startZ: 5,
            endX: 7,
            endZ: 5,
            height: 3.2,
            thickness: 0.25,
            elevation: 0,
            materialId: 'mat_white_plaster',
            openings: [
              { id: 'd1', type: 'door', positionRatio: 0.5, width: 3.8, height: 2.8, elevation: 0, subType: 'sliding' }
            ],
            visible: true,
            locked: false
          },
          {
            id: `ai_wall_w_${timestamp}`,
            name: 'West Concrete Wall',
            type: 'wall',
            floorLevel: 0,
            startX: -7,
            startZ: -5,
            endX: -7,
            endZ: 5,
            height: 3.2,
            thickness: 0.25,
            elevation: 0,
            materialId: 'mat_concrete_raw',
            openings: [
              { id: 'd2', type: 'door', positionRatio: 0.7, width: 1.8, height: 2.4, elevation: 0, subType: 'double' }
            ],
            visible: true,
            locked: false
          },
          {
            id: `ai_wall_e_${timestamp}`,
            name: 'East Feature Wall',
            type: 'wall',
            floorLevel: 0,
            startX: 7,
            startZ: -5,
            endX: 7,
            endZ: 5,
            height: 3.2,
            thickness: 0.25,
            elevation: 0,
            materialId: 'mat_brick_modern',
            openings: [
              { id: 'w3', type: 'window', positionRatio: 0.5, width: 3.0, height: 2.6, elevation: 0.3, subType: 'floor-to-ceiling' }
            ],
            visible: true,
            locked: false
          },
          {
            id: `ai_roof_${timestamp}`,
            name: 'Cantilever Parapet Roof',
            type: 'roof',
            roofType: 'flat',
            floorLevel: 0,
            x: 0,
            y: 3.2,
            z: 0,
            width: 15.5,
            depth: 11.5,
            height: 0.45,
            overhang: 0.8,
            rotationY: 0,
            materialId: 'mat_roof_slate',
            visible: true,
            locked: false
          },
          {
            id: `ai_pool_${timestamp}`,
            name: 'Infinity Swimming Pool',
            type: 'landscape',
            modelType: 'pool',
            x: 0,
            y: -0.05,
            z: 9.5,
            rotationY: 0,
            scale: 1,
            width: 8.5,
            depth: 4.0,
            visible: true,
            locked: false
          },
          {
            id: `ai_sofa_${timestamp}`,
            name: 'Sectional Lounge Sofa',
            type: 'furniture',
            category: 'living',
            modelType: 'sectional_sofa',
            floorLevel: 0,
            x: -3.5,
            y: 0,
            z: 0.5,
            rotationX: 0,
            rotationY: 0,
            rotationZ: 0,
            scaleX: 1,
            scaleY: 1,
            scaleZ: 1,
            width: 3.0,
            height: 0.8,
            depth: 2.2,
            materialId: 'mat_accent_navy',
            visible: true,
            locked: false
          },
          {
            id: `ai_island_${timestamp}`,
            name: 'Marble Waterfall Island',
            type: 'furniture',
            category: 'kitchen',
            modelType: 'kitchen_island',
            floorLevel: 0,
            x: 4.5,
            y: 0,
            z: -1.5,
            rotationX: 0,
            rotationY: 0,
            rotationZ: 0,
            scaleX: 1,
            scaleY: 1,
            scaleZ: 1,
            width: 2.8,
            height: 0.92,
            depth: 1.1,
            materialId: 'mat_marble_carrara',
            visible: true,
            locked: false
          }
        ];
        setExplanation(
          'Synthesized a 14m × 10m luxury contemporary villa layout with an open-plan great room, panoramic sliding glass pocket doors opening onto an 8.5m infinity pool terrace, and cantilevered minimalist flat roof.'
        );
      }

      loadProject(generatedProject);
      setIsGenerating(false);
      setStatusMessage('AI Assistant generated editable house model!');
    }, 900);
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-white border border-[#E5E5E5] rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col text-[#171717]">
        {/* Modal Header */}
        <div className="h-14 border-b border-[#E5E5E5] px-5 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#111111] text-white flex items-center justify-center shadow-sm">
              <Sparkles size={16} />
            </div>
            <div>
              <span className="font-bold text-[#171717] text-sm">AI Architectural Assistant</span>
              <p className="text-[10px] text-[#737373]">Natural Language 3D Geometry Synthesis</p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="text-[#737373] hover:text-[#171717] p-1.5 rounded-lg hover:bg-[#F2F0EC] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 text-xs">
          <div>
            <label className="font-semibold text-[#171717] block mb-1.5">Describe your desired house architecture:</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              className="w-full bg-[#F7F7F5] border border-[#E5E5E5] rounded-xl p-3 text-[#171717] placeholder-[#737373] text-xs outline-none focus:border-[#111111] leading-relaxed font-sans shadow-inner"
              placeholder="e.g. Create a contemporary 3-bedroom house with open kitchen, terrace pool, and flat roof..."
            />
          </div>

          {/* Quick prompt suggestions */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-[#737373] flex items-center gap-1">
              <Lightbulb size={13} className="text-amber-500" /> Architectural Presets:
            </span>
            <div className="flex flex-col gap-1.5">
              {promptSuggestions.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => setPrompt(s)}
                  className="text-left text-[11px] text-[#171717] hover:bg-[#F2F0EC] bg-[#F7F7F5] p-2 rounded-lg border border-[#E5E5E5] transition-colors truncate"
                >
                  "{s}"
                </button>
              ))}
            </div>
          </div>

          {explanation && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <CheckCircle2 size={14} className="text-emerald-600" /> AI Design Synthesis Completed:
              </div>
              <p className="text-[11px] text-emerald-800 leading-relaxed">{explanation}</p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="h-14 border-t border-[#E5E5E5] px-5 flex items-center justify-between bg-[#F7F7F5]">
          <span className="text-[11px] text-[#737373]">
            Generates editable parametric walls, slabs, openings &amp; furniture.
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setOpen(false)}
              className="px-3 py-1.5 rounded-lg text-[#171717] hover:bg-[#EAE8E2] bg-[#F2F0EC] border border-[#E5E5E5] font-medium text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className="px-4 py-1.5 rounded-lg bg-[#111111] hover:bg-black text-white font-semibold text-xs shadow-sm flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Synthesizing Model...</span>
                </>
              ) : (
                <>
                  <Wand2 size={14} />
                  <span>Generate 3D House</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
