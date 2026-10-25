import { create } from 'zustand';
import {
  AIEditPlan,
  AIToolOperation,
  AnimatableProperty,
  AspectRatioId,
  CaptionStyleId,
  ClipEffectInstance,
  ClipTransform,
  ColorAdjustments,
  EasingType,
  ExportSettings,
  Keyframe,
  MediaAsset,
  ProjectData,
  TextStyleConfig,
  TimelineClip,
  TimelineMarker,
  TimelineTrack,
  TrackType,
} from '../types/editor';
import {
  ASPECT_RATIO_PRESETS,
  DEFAULT_COLOR,
  DEFAULT_TRANSFORM,
  calculateProjectDuration,
  quantizeToFrame,
  rippleDeleteClip,
  splitClipAtTime,
  trimClipEdges,
} from './timebase';
import { createStarterMediaAssets } from '../media/sampleAssets';
import { EFFECTS_REGISTRY, COLOR_GRADE_PRESETS } from '../effects/registry';
import { TRANSITIONS_REGISTRY } from '../transitions/registry';
import { ANIMATION_PRESETS } from '../animation/keyframes';
import { generateGroundedAIPlan, validateAIOperation } from '../ai/tools';
import { saveProjectToIndexedDB } from '../storage/projectStorage';

export type LeftSidebarTab =
  | 'media'
  | 'audio'
  | 'text'
  | 'stickers'
  | 'effects'
  | 'transitions'
  | 'filters'
  | 'animations'
  | 'templates'
  | 'ai';

export type RightInspectorTab = 'transform' | 'color' | 'effects' | 'keyframes' | 'text' | 'audio';

function buildWordsForCaption(text: string, duration: number) {
  const rawWords = text.trim().split(/\s+/).filter(Boolean);
  if (rawWords.length === 0) return [];
  const slice = duration / rawWords.length;
  return rawWords.map((w, idx) => ({
    word: w,
    startOffset: Number((idx * slice).toFixed(3)),
    endOffset: Number(((idx + 1) * slice).toFixed(3)),
  }));
}

export function createInitialProject(): ProjectData {
  const starterAssets = createStarterMediaAssets();

  const tracks: TimelineTrack[] = [
    {
      id: 'track_t1',
      name: 'Captions & Titles',
      type: 'text',
      muted: false,
      locked: false,
      visible: true,
      height: 54,
      order: 0,
    },
    {
      id: 'track_o1',
      name: 'Overlays & HUD',
      type: 'overlay',
      muted: false,
      locked: false,
      visible: true,
      height: 50,
      order: 1,
    },
    {
      id: 'track_v1',
      name: 'Main Video V1',
      type: 'video',
      muted: false,
      locked: false,
      visible: true,
      height: 76,
      order: 2,
    },
    {
      id: 'track_a1',
      name: 'Music & SFX A1',
      type: 'audio',
      muted: false,
      locked: false,
      visible: true,
      height: 62,
      order: 3,
    },
  ];

  const caption1Text = 'VICE NEON PURSUIT AT 175 MPH';
  const caption2Text = 'PERFECT APEX DRIFT OVERRIDE';

  const clips: TimelineClip[] = [
    {
      id: 'clip_v_1',
      trackId: 'track_v1',
      assetId: 'asset_gta_chase',
      name: 'GTA_VI_Vice_Neon_Chase.mp4',
      type: 'video',
      startTime: 0,
      duration: 5.0,
      sourceStart: 0,
      sourceDuration: 14.0,
      speed: 1,
      reverse: false,
      volume: 100,
      muted: false,
      pan: 0,
      fadeIn: 0.2,
      fadeOut: 0,
      audioDucking: false,
      transform: { ...DEFAULT_TRANSFORM },
      color: { ...DEFAULT_COLOR, contrast: 14, saturation: 18, vignette: 20 },
      effects: [
        {
          id: 'eff_init_1',
          effectId: 'neon-glow',
          name: 'Neon Edge Glow',
          enabled: true,
          params: { intensity: 45, radius: 16 },
        },
      ],
      transitionOut: {
        id: 'tr_init_1',
        transitionId: 'whip-left',
        name: 'Whip Pan Left',
        duration: 0.4,
      },
      keyframes: [
        { id: 'kf_init_1', property: 'scale', timeOffset: 0, value: 100, easing: 'ease-out' },
        { id: 'kf_init_2', property: 'scale', timeOffset: 2.5, value: 116, easing: 'ease-in-out' },
      ],
    },
    {
      id: 'clip_v_2',
      trackId: 'track_v1',
      assetId: 'asset_cyber_drift',
      name: 'Cyber_Drift_Showdown_4K.mp4',
      type: 'video',
      startTime: 5.0,
      duration: 5.0,
      sourceStart: 0.5,
      sourceDuration: 12.0,
      speed: 1,
      reverse: false,
      volume: 100,
      muted: false,
      pan: 0,
      fadeIn: 0,
      fadeOut: 0.4,
      audioDucking: false,
      transform: { ...DEFAULT_TRANSFORM },
      color: { ...DEFAULT_COLOR, contrast: 18, temperature: -12 },
      effects: [
        {
          id: 'eff_init_2',
          effectId: 'chromatic-aberration',
          name: 'Chromatic Aberration (RGB Split)',
          enabled: true,
          params: { offset: 5, angle: 0 },
        },
      ],
      transitionIn: {
        id: 'tr_init_2',
        transitionId: 'whip-left',
        name: 'Whip Pan Left',
        duration: 0.4,
      },
      keyframes: [],
    },
    {
      id: 'clip_t_1',
      trackId: 'track_t1',
      name: 'Caption: Vice Neon Pursuit',
      type: 'text',
      startTime: 0.3,
      duration: 4.3,
      sourceStart: 0,
      sourceDuration: 4.3,
      speed: 1,
      reverse: false,
      volume: 100,
      muted: false,
      pan: 0,
      fadeIn: 0.15,
      fadeOut: 0.15,
      audioDucking: false,
      transform: { ...DEFAULT_TRANSFORM, positionY: 310 },
      color: { ...DEFAULT_COLOR },
      effects: [],
      keyframes: [],
      textConfig: {
        text: caption1Text,
        fontFamily: 'Plus Jakarta Sans',
        fontSize: 54,
        fontWeight: 800,
        color: '#FFFFFF',
        highlightColor: '#38BDF8',
        backgroundColor: '#0B0D12',
        backgroundOpacity: 65,
        strokeColor: '#000000',
        strokeWidth: 4,
        shadowColor: '#000000',
        shadowBlur: 12,
        align: 'center',
        lineSpacing: 1.2,
        letterSpacing: 1,
        padding: 16,
        captionStyle: 'word-highlight',
        words: buildWordsForCaption(caption1Text, 4.3),
      },
    },
    {
      id: 'clip_t_2',
      trackId: 'track_t1',
      name: 'Caption: Perfect Apex Drift',
      type: 'text',
      startTime: 5.2,
      duration: 4.4,
      sourceStart: 0,
      sourceDuration: 4.4,
      speed: 1,
      reverse: false,
      volume: 100,
      muted: false,
      pan: 0,
      fadeIn: 0.15,
      fadeOut: 0.2,
      audioDucking: false,
      transform: { ...DEFAULT_TRANSFORM, positionY: 310 },
      color: { ...DEFAULT_COLOR },
      effects: [],
      keyframes: [],
      textConfig: {
        text: caption2Text,
        fontFamily: 'Plus Jakarta Sans',
        fontSize: 54,
        fontWeight: 800,
        color: '#FFFFFF',
        highlightColor: '#F43F5E',
        backgroundColor: '#0B0D12',
        backgroundOpacity: 65,
        strokeColor: '#000000',
        strokeWidth: 4,
        shadowColor: '#000000',
        shadowBlur: 12,
        align: 'center',
        lineSpacing: 1.2,
        letterSpacing: 1,
        padding: 16,
        captionStyle: 'word-highlight',
        words: buildWordsForCaption(caption2Text, 4.4),
      },
    },
    {
      id: 'clip_a_1',
      trackId: 'track_a1',
      assetId: 'asset_synthwave_audio',
      name: 'Night_Runner_128BPM_Master.wav',
      type: 'audio',
      startTime: 0,
      duration: 10.0,
      sourceStart: 0,
      sourceDuration: 16.0,
      speed: 1,
      reverse: false,
      volume: 85,
      muted: false,
      pan: 0,
      fadeIn: 0.3,
      fadeOut: 0.8,
      audioDucking: true,
      transform: { ...DEFAULT_TRANSFORM },
      color: { ...DEFAULT_COLOR },
      effects: [],
      keyframes: [],
    },
  ];

  const markers: TimelineMarker[] = [
    { id: 'mk_1', time: 0.94, label: 'Beat Drop 1', color: '#6366F1' },
    { id: 'mk_2', time: 5.0, label: 'Drift Transition', color: '#EC4899' },
    { id: 'mk_3', time: 7.5, label: 'Nitrous Boost', color: '#10B981' },
  ];

  return {
    id: 'proj_starter_vice',
    version: 1,
    name: 'Vice Neon Action Edit',
    updatedAt: Date.now(),
    aspectRatio: '16:9',
    width: 1920,
    height: 1080,
    fps: 30,
    backgroundFill: 'blur',
    inPoint: null,
    outPoint: null,
    tracks,
    clips,
    markers,
    assets: starterAssets,
    exportSettings: {
      format: 'webm',
      codec: 'vp9',
      resolution: '1080p',
      width: 1920,
      height: 1080,
      fps: 30,
      quality: 'high',
      videoBitrateMbps: 12,
      audioBitrateKbps: 192,
      audioSampleRate: 48000,
      includeVideo: true,
      includeAudio: true,
      burnCaptions: true,
      useServerRender: false,
    },
  };
}

interface HistoryEntry {
  label: string;
  project: ProjectData;
}

export interface EditorState {
  project: ProjectData;
  undoStack: HistoryEntry[];
  redoStack: HistoryEntry[];
  saveStatus: 'saved' | 'saving' | 'unsaved';
  lastSavedAt: number;

  // Playback & Preview State
  isPlaying: boolean;
  currentTime: number;
  playbackSpeed: number;
  previewQuality: 'full' | 'half' | 'quarter';
  previewZoom: 'fit' | number;
  showSafeGuides: boolean;
  showAspectOverlay: boolean;

  // Selection & Active UI Panels
  selectedClipIds: string[];
  activeTrackId: string | null;
  leftTab: LeftSidebarTab;
  rightTab: RightInspectorTab;
  aiDrawerOpen: boolean;
  timelineZoom: number; // pixels per second (default 64)
  timelineCollapsed: boolean;
  timelineHeightPx: number;
  snappingEnabled: boolean;
  magneticTimeline: boolean;
  rippleEdit: boolean;
  activeTool: 'select' | 'split';

  // Modals
  activeModal: 'none' | 'export' | 'projects' | 'shortcuts' | 'settings';

  // AI Agent State
  aiPlans: AIEditPlan[];
  aiLoading: boolean;
  aiAutoExecuteLowRisk: boolean;
  lastAIStatusMessage: string | null;

  // Actions
  recordSnapshot: (label: string) => void;
  undo: () => void;
  redo: () => void;

  setProjectName: (name: string) => void;
  setAspectRatio: (ratio: AspectRatioId, customWidth?: number, customHeight?: number) => void;
  setProjectFps: (fps: number) => void;
  setBackgroundFill: (fill: ProjectData['backgroundFill']) => void;
  loadProjectData: (project: ProjectData) => void;
  resetNewProject: (name?: string) => void;

  // Playback
  setIsPlaying: (playing: boolean) => void;
  togglePlay: () => void;
  setCurrentTime: (time: number) => void;
  stepFrames: (deltaFrames: number) => void;
  jumpToEditPoint: (direction: 'prev' | 'next') => void;
  setPlaybackSpeed: (speed: number) => void;
  setPreviewQuality: (q: 'full' | 'half' | 'quarter') => void;
  setPreviewZoom: (z: 'fit' | number) => void;
  toggleSafeGuides: () => void;

  // UI Navigation
  setLeftTab: (tab: LeftSidebarTab) => void;
  setRightTab: (tab: RightInspectorTab) => void;
  setAiDrawerOpen: (open: boolean) => void;
  setActiveModal: (modal: EditorState['activeModal']) => void;
  setTimelineZoom: (pxPerSec: number) => void;
  setTimelineCollapsed: (collapsed: boolean) => void;
  setTimelineHeightPx: (h: number) => void;
  toggleSnapping: () => void;
  toggleMagneticTimeline: () => void;
  toggleRippleEdit: () => void;
  setActiveTool: (tool: 'select' | 'split') => void;
  selectClip: (clipId: string | null, multi?: boolean) => void;

  // Media Library
  addMediaAsset: (asset: MediaAsset) => void;
  removeMediaAsset: (assetId: string) => void;
  relinkMediaAsset: (assetId: string, newUrl: string) => void;

  // Tracks
  addTrack: (type: TrackType, name?: string) => string;
  deleteTrack: (trackId: string) => void;
  toggleTrackMute: (trackId: string) => void;
  toggleTrackLock: (trackId: string) => void;
  toggleTrackVisible: (trackId: string) => void;
  setTrackHeight: (trackId: string, height: number) => void;
  reorderTrack: (trackId: string, direction: 'up' | 'down') => void;

  // Clips
  addClipFromAsset: (assetId: string, trackId?: string, startTime?: number) => void;
  addTextClip: (text: string, style?: CaptionStyleId, startTime?: number, duration?: number) => void;
  addStickerClip: (stickerIcon: string, label: string, startTime?: number) => void;
  splitSelectedOrAtPlayhead: (targetClipId?: string) => void;
  trimClip: (clipId: string, newStartTime: number, newDuration: number) => void;
  moveClip: (clipId: string, newStartTime: number, newTrackId?: string) => void;
  duplicateClip: (clipId?: string) => void;
  deleteSelectedClips: () => void;
  updateClipProperties: (clipId: string, patch: Partial<TimelineClip>, snapshotLabel?: string) => void;
  updateClipTransform: (clipId: string, patch: Partial<ClipTransform>, record?: boolean) => void;
  updateClipColor: (clipId: string, patch: Partial<ColorAdjustments>, record?: boolean) => void;
  applyColorGradePreset: (clipId: string, presetId: string) => void;
  updateClipTextConfig: (clipId: string, patch: Partial<TextStyleConfig>) => void;

  // Effects, Transitions, Keyframes
  addEffectToClip: (clipId: string, effectId: string) => void;
  toggleClipEffect: (clipId: string, instanceId: string) => void;
  updateClipEffectParam: (clipId: string, instanceId: string, paramKey: string, value: number) => void;
  removeClipEffect: (clipId: string, instanceId: string) => void;
  setClipTransition: (clipId: string, edge: 'in' | 'out', transitionId: string, duration?: number) => void;
  removeClipTransition: (clipId: string, edge: 'in' | 'out') => void;
  addOrUpdateKeyframe: (
    clipId: string,
    property: AnimatableProperty,
    timeOffset: number,
    value: number,
    easing?: EasingType
  ) => void;
  removeKeyframe: (clipId: string, keyframeId: string) => void;
  applyAnimationPresetToClip: (clipId: string, presetId: string) => void;

  // Markers
  addMarkerAtPlayhead: (label?: string) => void;
  removeMarker: (markerId: string) => void;

  // Export Settings
  updateExportSettings: (patch: Partial<ExportSettings>) => void;

  // AI Agent
  proposeAIEditPlan: (prompt: string) => Promise<AIEditPlan>;
  applyAIEditPlan: (planId: string) => void;
  cancelAIEditPlan: (planId: string) => void;
  setAiAutoExecuteLowRisk: (val: boolean) => void;
}

function cloneProject(p: ProjectData): ProjectData {
  return JSON.parse(JSON.stringify(p));
}

export const useEditorStore = create<EditorState>((set, get) => ({
  project: createInitialProject(),
  undoStack: [],
  redoStack: [],
  saveStatus: 'saved',
  lastSavedAt: Date.now(),

  isPlaying: false,
  currentTime: 1.2,
  playbackSpeed: 1,
  previewQuality: 'full',
  previewZoom: 'fit',
  showSafeGuides: false,
  showAspectOverlay: true,

  selectedClipIds: ['clip_v_1'],
  activeTrackId: 'track_v1',
  leftTab: 'media',
  rightTab: 'transform',
  aiDrawerOpen: false,
  timelineZoom: 64,
  timelineCollapsed: false,
  timelineHeightPx: 310,
  snappingEnabled: true,
  magneticTimeline: false,
  rippleEdit: true,
  activeTool: 'select',

  activeModal: 'none',

  aiPlans: [],
  aiLoading: false,
  aiAutoExecuteLowRisk: false,
  lastAIStatusMessage: null,

  recordSnapshot: (label: string) => {
    const current = cloneProject(get().project);
    set((state) => ({
      undoStack: [...state.undoStack.slice(-39), { label, project: current }],
      redoStack: [],
      saveStatus: 'saving',
    }));
    setTimeout(() => {
      const latest = get().project;
      saveProjectToIndexedDB(latest).then(() => {
        set({ saveStatus: 'saved', lastSavedAt: Date.now() });
      });
    }, 250);
  },

  undo: () => {
    const { undoStack, project, redoStack } = get();
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    const currentSnap: HistoryEntry = { label: previous.label, project: cloneProject(project) };
    set({
      project: cloneProject(previous.project),
      undoStack: undoStack.slice(0, -1),
      redoStack: [...redoStack, currentSnap],
      lastAIStatusMessage: `Undid: ${previous.label}`,
    });
    saveProjectToIndexedDB(previous.project);
  },

  redo: () => {
    const { redoStack, project, undoStack } = get();
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    const currentSnap: HistoryEntry = { label: next.label, project: cloneProject(project) };
    set({
      project: cloneProject(next.project),
      redoStack: redoStack.slice(0, -1),
      undoStack: [...undoStack, currentSnap],
      lastAIStatusMessage: `Redid: ${next.label}`,
    });
    saveProjectToIndexedDB(next.project);
  },

  setProjectName: (name) => {
    if (!name.trim()) return;
    get().recordSnapshot('Rename project');
    set((state) => ({
      project: { ...state.project, name: name.trim(), updatedAt: Date.now() },
    }));
  },

  setAspectRatio: (ratio, customWidth, customHeight) => {
    get().recordSnapshot(`Change aspect ratio to ${ratio}`);
    const preset = ASPECT_RATIO_PRESETS[ratio] || ASPECT_RATIO_PRESETS['16:9'];
    const width = ratio === 'custom' && customWidth ? customWidth : preset.width;
    const height = ratio === 'custom' && customHeight ? customHeight : preset.height;
    set((state) => ({
      project: {
        ...state.project,
        aspectRatio: ratio,
        width,
        height,
        exportSettings: {
          ...state.project.exportSettings,
          width,
          height,
        },
      },
    }));
  },

  setProjectFps: (fps) => {
    get().recordSnapshot(`Set frame rate to ${fps} FPS`);
    set((state) => ({
      project: {
        ...state.project,
        fps,
        exportSettings: {
          ...state.project.exportSettings,
          fps: fps as ExportSettings['fps'],
        },
      },
    }));
  },

  setBackgroundFill: (backgroundFill) => {
    set((state) => ({
      project: { ...state.project, backgroundFill },
    }));
  },

  loadProjectData: (project) => {
    set({
      project: cloneProject(project),
      undoStack: [],
      redoStack: [],
      currentTime: 0,
      isPlaying: false,
      selectedClipIds: project.clips[0] ? [project.clips[0].id] : [],
      saveStatus: 'saved',
    });
  },

  resetNewProject: (name = 'Untitled ClipForge Project') => {
    const fresh = createInitialProject();
    fresh.id = `proj_${Date.now()}`;
    fresh.name = name;
    fresh.clips = [];
    fresh.markers = [];
    set({
      project: fresh,
      undoStack: [],
      redoStack: [],
      currentTime: 0,
      isPlaying: false,
      selectedClipIds: [],
    });
  },

  setIsPlaying: (isPlaying) => set({ isPlaying }),
  togglePlay: () => set((s) => ({ isPlaying: !s.isPlaying })),

  setCurrentTime: (time) => {
    const dur = calculateProjectDuration(get().project.clips, 12);
    const clamped = Math.max(0, Math.min(dur, time));
    set({ currentTime: clamped });
  },

  stepFrames: (deltaFrames) => {
    const { currentTime, project } = get();
    const frameDur = 1 / (project.fps || 30);
    const nextTime = quantizeToFrame(currentTime + deltaFrames * frameDur, project.fps);
    set({ isPlaying: false, currentTime: Math.max(0, nextTime) });
  },

  jumpToEditPoint: (direction) => {
    const { currentTime, project } = get();
    const points = new Set<number>([0]);
    for (const c of project.clips) {
      points.add(Number(c.startTime.toFixed(4)));
      points.add(Number((c.startTime + c.duration).toFixed(4)));
    }
    for (const m of project.markers) {
      points.add(Number(m.time.toFixed(4)));
    }
    const sorted = Array.from(points).sort((a, b) => a - b);
    if (direction === 'prev') {
      const prev = [...sorted].reverse().find((p) => p < currentTime - 0.02);
      set({ isPlaying: false, currentTime: prev ?? 0 });
    } else {
      const next = sorted.find((p) => p > currentTime + 0.02);
      if (next !== undefined) set({ isPlaying: false, currentTime: next });
    }
  },

  setPlaybackSpeed: (playbackSpeed) => set({ playbackSpeed }),
  setPreviewQuality: (previewQuality) => set({ previewQuality }),
  setPreviewZoom: (previewZoom) => set({ previewZoom }),
  toggleSafeGuides: () => set((s) => ({ showSafeGuides: !s.showSafeGuides })),

  setLeftTab: (leftTab) => set({ leftTab }),
  setRightTab: (rightTab) => set({ rightTab }),
  setAiDrawerOpen: (aiDrawerOpen) => set({ aiDrawerOpen }),
  setActiveModal: (activeModal) => set({ activeModal, isPlaying: false }),
  setTimelineZoom: (pxPerSec) => set({ timelineZoom: Math.max(16, Math.min(240, pxPerSec)) }),
  setTimelineCollapsed: (timelineCollapsed) => set({ timelineCollapsed }),
  setTimelineHeightPx: (h) => set({ timelineHeightPx: Math.max(180, Math.min(520, h)) }),
  toggleSnapping: () => set((s) => ({ snappingEnabled: !s.snappingEnabled })),
  toggleMagneticTimeline: () => set((s) => ({ magneticTimeline: !s.magneticTimeline })),
  toggleRippleEdit: () => set((s) => ({ rippleEdit: !s.rippleEdit })),
  setActiveTool: (activeTool) => set({ activeTool }),

  selectClip: (clipId, multi = false) => {
    if (!clipId) {
      set({ selectedClipIds: [] });
      return;
    }
    const clip = get().project.clips.find((c) => c.id === clipId);
    set((state) => {
      const nextIds = multi
        ? state.selectedClipIds.includes(clipId)
          ? state.selectedClipIds.filter((id) => id !== clipId)
          : [...state.selectedClipIds, clipId]
        : [clipId];

      let nextRightTab = state.rightTab;
      if (clip?.type === 'text') nextRightTab = 'text';
      else if (clip?.type === 'audio') nextRightTab = 'audio';

      return {
        selectedClipIds: nextIds,
        activeTrackId: clip?.trackId ?? state.activeTrackId,
        rightTab: nextRightTab,
      };
    });
  },

  addMediaAsset: (asset) => {
    set((state) => ({
      project: {
        ...state.project,
        assets: [asset, ...state.project.assets],
      },
    }));
  },

  removeMediaAsset: (assetId) => {
    get().recordSnapshot('Remove media asset');
    set((state) => ({
      project: {
        ...state.project,
        assets: state.project.assets.filter((a) => a.id !== assetId),
        clips: state.project.clips.filter((c) => c.assetId !== assetId),
      },
    }));
  },

  relinkMediaAsset: (assetId, newUrl) => {
    set((state) => ({
      project: {
        ...state.project,
        assets: state.project.assets.map((a) =>
          a.id === assetId ? { ...a, url: newUrl, missingFile: false } : a
        ),
      },
    }));
  },

  addTrack: (type, name) => {
    get().recordSnapshot(`Add ${type} track`);
    const id = `track_${type}_${Date.now().toString(36).slice(-4)}`;
    const count = get().project.tracks.filter((t) => t.type === type).length + 1;
    const defaultName =
      name ||
      `${type.charAt(0).toUpperCase() + type.slice(1)} ${count}`;

    set((state) => ({
      project: {
        ...state.project,
        tracks: [
          ...state.project.tracks,
          {
            id,
            name: defaultName,
            type,
            muted: false,
            locked: false,
            visible: true,
            height: type === 'video' ? 74 : 56,
            order: state.project.tracks.length,
          },
        ],
      },
      activeTrackId: id,
    }));
    return id;
  },

  deleteTrack: (trackId) => {
    if (get().project.tracks.length <= 1) return;
    get().recordSnapshot('Delete track');
    set((state) => ({
      project: {
        ...state.project,
        tracks: state.project.tracks.filter((t) => t.id !== trackId),
        clips: state.project.clips.filter((c) => c.trackId !== trackId),
      },
    }));
  },

  toggleTrackMute: (trackId) => {
    set((state) => ({
      project: {
        ...state.project,
        tracks: state.project.tracks.map((t) =>
          t.id === trackId ? { ...t, muted: !t.muted } : t
        ),
      },
    }));
  },

  toggleTrackLock: (trackId) => {
    set((state) => ({
      project: {
        ...state.project,
        tracks: state.project.tracks.map((t) =>
          t.id === trackId ? { ...t, locked: !t.locked } : t
        ),
      },
    }));
  },

  toggleTrackVisible: (trackId) => {
    set((state) => ({
      project: {
        ...state.project,
        tracks: state.project.tracks.map((t) =>
          t.id === trackId ? { ...t, visible: !t.visible } : t
        ),
      },
    }));
  },

  setTrackHeight: (trackId, height) => {
    set((state) => ({
      project: {
        ...state.project,
        tracks: state.project.tracks.map((t) =>
          t.id === trackId ? { ...t, height: Math.max(44, Math.min(120, height)) } : t
        ),
      },
    }));
  },

  reorderTrack: (trackId, direction) => {
    const tracks = [...get().project.tracks].sort((a, b) => a.order - b.order);
    const idx = tracks.findIndex((t) => t.id === trackId);
    if (idx === -1) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= tracks.length) return;
    const temp = tracks[idx].order;
    tracks[idx].order = tracks[swapIdx].order;
    tracks[swapIdx].order = temp;
    set((state) => ({
      project: { ...state.project, tracks },
    }));
  },

  addClipFromAsset: (assetId, preferredTrackId, explicitStartTime) => {
    const { project } = get();
    const asset = project.assets.find((a) => a.id === assetId);
    if (!asset) return;

    get().recordSnapshot(`Add "${asset.name}" to timeline`);

    const targetTrackType: TrackType =
      asset.type === 'audio' || asset.type === 'procedural-audio'
        ? 'audio'
        : asset.type === 'image'
        ? 'overlay'
        : 'video';

    let track = project.tracks.find((t) => t.id === preferredTrackId && !t.locked);
    if (!track) {
      track = project.tracks.find((t) => t.type === targetTrackType && !t.locked);
    }
    if (!track) {
      const newTrackId = get().addTrack(targetTrackType);
      track = get().project.tracks.find((t) => t.id === newTrackId)!;
    }

    const trackClips = project.clips.filter((c) => c.trackId === track.id);
    const trackEnd = trackClips.reduce((max, c) => Math.max(max, c.startTime + c.duration), 0);
    const startTime =
      explicitStartTime !== undefined ? quantizeToFrame(explicitStartTime, project.fps) : trackEnd;
    const clipDuration = Math.min(asset.duration || 6, 8);

    const newClip: TimelineClip = {
      id: `clip_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      trackId: track.id,
      assetId: asset.id,
      name: asset.name,
      type: track.type,
      startTime,
      duration: clipDuration,
      sourceStart: 0,
      sourceDuration: asset.duration || clipDuration,
      speed: 1,
      reverse: false,
      volume: 100,
      muted: false,
      pan: 0,
      fadeIn: 0,
      fadeOut: 0,
      audioDucking: false,
      transform: { ...DEFAULT_TRANSFORM },
      color: { ...DEFAULT_COLOR },
      effects: [],
      keyframes: [],
    };

    set((state) => ({
      project: {
        ...state.project,
        clips: [...state.project.clips, newClip],
      },
      selectedClipIds: [newClip.id],
      activeTrackId: track.id,
    }));
  },

  addTextClip: (text, style = 'word-highlight', startTime, duration = 3.5) => {
    const { project, currentTime } = get();
    get().recordSnapshot('Add text caption clip');

    let textTrack = project.tracks.find((t) => t.type === 'text' && !t.locked);
    if (!textTrack) {
      const newId = get().addTrack('text', 'Captions & Titles');
      textTrack = get().project.tracks.find((t) => t.id === newId)!;
    }

    const start = startTime !== undefined ? startTime : currentTime;

    const stylePresets: Record<CaptionStyleId, Partial<TextStyleConfig>> = {
      'clean-subtitles': { fontSize: 42, fontWeight: 600, color: '#FFFFFF', highlightColor: '#E2E8F0', backgroundOpacity: 75 },
      'bold-gaming': { fontSize: 60, fontWeight: 800, color: '#FACC15', highlightColor: '#F43F5E', backgroundOpacity: 0, strokeWidth: 6 },
      'word-highlight': { fontSize: 54, fontWeight: 800, color: '#FFFFFF', highlightColor: '#38BDF8', backgroundOpacity: 65, strokeWidth: 4 },
      'karaoke': { fontSize: 50, fontWeight: 700, color: '#94A3B8', highlightColor: '#22C55E', backgroundOpacity: 55, strokeWidth: 3 },
      'animated-emphasis': { fontSize: 58, fontWeight: 800, color: '#FFFFFF', highlightColor: '#A855F7', backgroundOpacity: 40, strokeWidth: 5 },
      'minimal-doc': { fontSize: 38, fontWeight: 500, color: '#F8FAFC', highlightColor: '#F8FAFC', backgroundOpacity: 80, strokeWidth: 0 },
      'large-hook': { fontSize: 76, fontWeight: 800, color: '#FFFFFF', highlightColor: '#6366F1', backgroundOpacity: 85, strokeWidth: 4 },
      'callout-label': { fontSize: 40, fontWeight: 700, color: '#38BDF8', highlightColor: '#FFFFFF', backgroundOpacity: 90, strokeWidth: 0 },
    };

    const preset = stylePresets[style] || stylePresets['word-highlight'];

    const newClip: TimelineClip = {
      id: `clip_txt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      trackId: textTrack.id,
      name: `Caption: ${text.slice(0, 22)}`,
      type: 'text',
      startTime: quantizeToFrame(start, project.fps),
      duration,
      sourceStart: 0,
      sourceDuration: duration,
      speed: 1,
      reverse: false,
      volume: 100,
      muted: false,
      pan: 0,
      fadeIn: 0.15,
      fadeOut: 0.15,
      audioDucking: false,
      transform: {
        ...DEFAULT_TRANSFORM,
        positionY: style === 'large-hook' ? -220 : 300,
      },
      color: { ...DEFAULT_COLOR },
      effects: [],
      keyframes: [],
      textConfig: {
        text,
        fontFamily: 'Plus Jakarta Sans',
        fontSize: preset.fontSize || 52,
        fontWeight: preset.fontWeight || 800,
        color: preset.color || '#FFFFFF',
        highlightColor: preset.highlightColor || '#38BDF8',
        backgroundColor: '#0B0D12',
        backgroundOpacity: preset.backgroundOpacity ?? 65,
        strokeColor: '#000000',
        strokeWidth: preset.strokeWidth ?? 4,
        shadowColor: '#000000',
        shadowBlur: 12,
        align: 'center',
        lineSpacing: 1.2,
        letterSpacing: 1,
        padding: 16,
        captionStyle: style,
        words: buildWordsForCaption(text, duration),
      },
    };

    set((state) => ({
      project: {
        ...state.project,
        clips: [...state.project.clips, newClip],
      },
      selectedClipIds: [newClip.id],
      rightTab: 'text',
    }));
  },

  addStickerClip: (stickerIcon, label, startTime) => {
    const { project, currentTime } = get();
    get().recordSnapshot(`Add overlay "${label}"`);

    let overlayTrack = project.tracks.find((t) => t.type === 'overlay' && !t.locked);
    if (!overlayTrack) {
      const newId = get().addTrack('overlay', 'Overlays & HUD');
      overlayTrack = get().project.tracks.find((t) => t.id === newId)!;
    }

    const newClip: TimelineClip = {
      id: `clip_ov_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      trackId: overlayTrack.id,
      name: `Overlay: ${label}`,
      type: 'overlay',
      startTime: quantizeToFrame(startTime ?? currentTime, project.fps),
      duration: 3.5,
      sourceStart: 0,
      sourceDuration: 3.5,
      speed: 1,
      reverse: false,
      volume: 100,
      muted: false,
      pan: 0,
      fadeIn: 0.15,
      fadeOut: 0.15,
      audioDucking: false,
      transform: { ...DEFAULT_TRANSFORM, positionX: 280, positionY: -220, scale: 100 },
      color: { ...DEFAULT_COLOR },
      effects: [],
      keyframes: [
        { id: `kf_pop_1`, property: 'scale', timeOffset: 0, value: 40, easing: 'ease-out' },
        { id: `kf_pop_2`, property: 'scale', timeOffset: 0.25, value: 112, easing: 'ease-out' },
        { id: `kf_pop_3`, property: 'scale', timeOffset: 0.4, value: 100, easing: 'ease-in-out' },
      ],
      stickerIcon,
    };

    set((state) => ({
      project: {
        ...state.project,
        clips: [...state.project.clips, newClip],
      },
      selectedClipIds: [newClip.id],
      rightTab: 'transform',
    }));
  },

  splitSelectedOrAtPlayhead: (targetClipId) => {
    const { project, currentTime, selectedClipIds } = get();
    let clipToSplit = project.clips.find((c) => c.id === targetClipId);

    if (!clipToSplit && selectedClipIds.length > 0) {
      clipToSplit = project.clips.find(
        (c) =>
          selectedClipIds.includes(c.id) &&
          currentTime > c.startTime + 0.1 &&
          currentTime < c.startTime + c.duration - 0.1
      );
    }

    if (!clipToSplit) {
      clipToSplit = project.clips.find(
        (c) => currentTime > c.startTime + 0.1 && currentTime < c.startTime + c.duration - 0.1
      );
    }

    if (!clipToSplit) return;

    const track = project.tracks.find((t) => t.id === clipToSplit!.trackId);
    if (track?.locked) return;

    const splitPair = splitClipAtTime(clipToSplit, currentTime, project.fps);
    if (!splitPair) return;

    get().recordSnapshot(`Split "${clipToSplit.name}"`);
    const [leftClip, rightClip] = splitPair;

    set((state) => ({
      project: {
        ...state.project,
        clips: state.project.clips
          .filter((c) => c.id !== clipToSplit!.id)
          .concat([leftClip, rightClip]),
      },
      selectedClipIds: [rightClip.id],
    }));
  },

  trimClip: (clipId, newStartTime, newDuration) => {
    const { project } = get();
    const clip = project.clips.find((c) => c.id === clipId);
    if (!clip) return;
    const track = project.tracks.find((t) => t.id === clip.trackId);
    if (track?.locked) return;

    const updated = trimClipEdges(clip, newStartTime, newDuration, project.fps);
    set((state) => ({
      project: {
        ...state.project,
        clips: state.project.clips.map((c) => (c.id === clipId ? updated : c)),
      },
    }));
  },

  moveClip: (clipId, newStartTime, newTrackId) => {
    const { project } = get();
    const clip = project.clips.find((c) => c.id === clipId);
    if (!clip) return;
    const track = project.tracks.find((t) => t.id === (newTrackId || clip.trackId));
    if (track?.locked) return;

    const quantized = Math.max(0, quantizeToFrame(newStartTime, project.fps));
    set((state) => ({
      project: {
        ...state.project,
        clips: state.project.clips.map((c) =>
          c.id === clipId
            ? { ...c, startTime: quantized, trackId: newTrackId || c.trackId }
            : c
        ),
      },
    }));
  },

  duplicateClip: (explicitClipId) => {
    const { project, selectedClipIds } = get();
    const targetId = explicitClipId || selectedClipIds[0];
    const clip = project.clips.find((c) => c.id === targetId);
    if (!clip) return;

    get().recordSnapshot(`Duplicate "${clip.name}"`);
    const copy: TimelineClip = {
      ...JSON.parse(JSON.stringify(clip)),
      id: `clip_dup_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: `${clip.name} (Copy)`,
      startTime: quantizeToFrame(clip.startTime + clip.duration, project.fps),
    };

    set((state) => ({
      project: {
        ...state.project,
        clips: [...state.project.clips, copy],
      },
      selectedClipIds: [copy.id],
    }));
  },

  deleteSelectedClips: () => {
    const { selectedClipIds, project, rippleEdit } = get();
    if (selectedClipIds.length === 0) return;

    get().recordSnapshot('Delete selected clip(s)');
    let nextClips = [...project.clips];
    for (const id of selectedClipIds) {
      const clip = nextClips.find((c) => c.id === id);
      if (!clip) continue;
      const track = project.tracks.find((t) => t.id === clip.trackId);
      if (track?.locked) continue;
      nextClips = rippleDeleteClip(nextClips, id, rippleEdit);
    }

    set((state) => ({
      project: { ...state.project, clips: nextClips },
      selectedClipIds: [],
    }));
  },

  updateClipProperties: (clipId, patch, snapshotLabel) => {
    if (snapshotLabel) get().recordSnapshot(snapshotLabel);
    set((state) => ({
      project: {
        ...state.project,
        clips: state.project.clips.map((c) => (c.id === clipId ? { ...c, ...patch } : c)),
      },
    }));
  },

  updateClipTransform: (clipId, patch, record = false) => {
    if (record) get().recordSnapshot('Adjust clip transform');
    set((state) => ({
      project: {
        ...state.project,
        clips: state.project.clips.map((c) =>
          c.id === clipId ? { ...c, transform: { ...c.transform, ...patch } } : c
        ),
      },
    }));
  },

  updateClipColor: (clipId, patch, record = false) => {
    if (record) get().recordSnapshot('Adjust color grading');
    set((state) => ({
      project: {
        ...state.project,
        clips: state.project.clips.map((c) =>
          c.id === clipId ? { ...c, color: { ...c.color, ...patch } } : c
        ),
      },
    }));
  },

  applyColorGradePreset: (clipId, presetId) => {
    const preset = COLOR_GRADE_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    get().recordSnapshot(`Apply "${preset.name}" color grade`);
    set((state) => ({
      project: {
        ...state.project,
        clips: state.project.clips.map((c) =>
          c.id === clipId
            ? { ...c, color: { ...DEFAULT_COLOR, ...preset.color } }
            : c
        ),
      },
    }));
  },

  updateClipTextConfig: (clipId, patch) => {
    set((state) => ({
      project: {
        ...state.project,
        clips: state.project.clips.map((c) => {
          if (c.id !== clipId || !c.textConfig) return c;
          const nextText = patch.text !== undefined ? patch.text : c.textConfig.text;
          return {
            ...c,
            name: `Caption: ${nextText.slice(0, 22)}`,
            textConfig: {
              ...c.textConfig,
              ...patch,
              words:
                patch.text !== undefined
                  ? buildWordsForCaption(nextText, c.duration)
                  : c.textConfig.words,
            },
          };
        }),
      },
    }));
  },

  addEffectToClip: (clipId, effectId) => {
    const def = EFFECTS_REGISTRY.find((e) => e.id === effectId);
    if (!def) return;
    get().recordSnapshot(`Add effect "${def.name}"`);

    const params: Record<string, number> = {};
    for (const p of def.parameters) {
      params[p.key] = p.defaultValue;
    }

    const instance: ClipEffectInstance = {
      id: `eff_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      effectId: def.id,
      name: def.name,
      enabled: true,
      params,
    };

    set((state) => ({
      project: {
        ...state.project,
        clips: state.project.clips.map((c) =>
          c.id === clipId ? { ...c, effects: [...c.effects, instance] } : c
        ),
      },
      rightTab: 'effects',
    }));
  },

  toggleClipEffect: (clipId, instanceId) => {
    set((state) => ({
      project: {
        ...state.project,
        clips: state.project.clips.map((c) =>
          c.id === clipId
            ? {
                ...c,
                effects: c.effects.map((e) =>
                  e.id === instanceId ? { ...e, enabled: !e.enabled } : e
                ),
              }
            : c
        ),
      },
    }));
  },

  updateClipEffectParam: (clipId, instanceId, paramKey, value) => {
    set((state) => ({
      project: {
        ...state.project,
        clips: state.project.clips.map((c) =>
          c.id === clipId
            ? {
                ...c,
                effects: c.effects.map((e) =>
                  e.id === instanceId
                    ? { ...e, params: { ...e.params, [paramKey]: value } }
                    : e
                ),
              }
            : c
        ),
      },
    }));
  },

  removeClipEffect: (clipId, instanceId) => {
    get().recordSnapshot('Remove effect from clip');
    set((state) => ({
      project: {
        ...state.project,
        clips: state.project.clips.map((c) =>
          c.id === clipId
            ? { ...c, effects: c.effects.filter((e) => e.id !== instanceId) }
            : c
        ),
      },
    }));
  },

  setClipTransition: (clipId, edge, transitionId, duration) => {
    const def = TRANSITIONS_REGISTRY.find((t) => t.id === transitionId);
    if (!def) return;
    get().recordSnapshot(`Apply "${def.name}" transition`);

    const transObj = {
      id: `tr_${Date.now()}`,
      transitionId: def.id,
      name: def.name,
      duration: duration ?? def.defaultDuration,
    };

    set((state) => ({
      project: {
        ...state.project,
        clips: state.project.clips.map((c) =>
          c.id === clipId
            ? edge === 'in'
              ? { ...c, transitionIn: transObj }
              : { ...c, transitionOut: transObj }
            : c
        ),
      },
    }));
  },

  removeClipTransition: (clipId, edge) => {
    get().recordSnapshot('Remove transition');
    set((state) => ({
      project: {
        ...state.project,
        clips: state.project.clips.map((c) =>
          c.id === clipId
            ? edge === 'in'
              ? { ...c, transitionIn: undefined }
              : { ...c, transitionOut: undefined }
            : c
        ),
      },
    }));
  },

  addOrUpdateKeyframe: (clipId, property, timeOffset, value, easing = 'ease-in-out') => {
    get().recordSnapshot(`Set ${property} keyframe`);
    set((state) => ({
      project: {
        ...state.project,
        clips: state.project.clips.map((c) => {
          if (c.id !== clipId) return c;
          const clampedOffset = Math.max(0, Math.min(c.duration, Number(timeOffset.toFixed(3))));
          const existingIdx = c.keyframes.findIndex(
            (k) => k.property === property && Math.abs(k.timeOffset - clampedOffset) < 0.04
          );
          if (existingIdx >= 0) {
            const updated = [...c.keyframes];
            updated[existingIdx] = { ...updated[existingIdx], value, easing };
            return { ...c, keyframes: updated };
          }
          const newKf: Keyframe = {
            id: `kf_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            property,
            timeOffset: clampedOffset,
            value,
            easing,
          };
          return { ...c, keyframes: [...c.keyframes, newKf] };
        }),
      },
    }));
  },

  removeKeyframe: (clipId, keyframeId) => {
    get().recordSnapshot('Delete keyframe');
    set((state) => ({
      project: {
        ...state.project,
        clips: state.project.clips.map((c) =>
          c.id === clipId
            ? { ...c, keyframes: c.keyframes.filter((k) => k.id !== keyframeId) }
            : c
        ),
      },
    }));
  },

  applyAnimationPresetToClip: (clipId, presetId) => {
    const preset = ANIMATION_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    const clip = get().project.clips.find((c) => c.id === clipId);
    if (!clip) return;

    get().recordSnapshot(`Apply "${preset.name}" animation`);
    const generated = preset.createKeyframes(clip.duration).map((kf, idx) => ({
      ...kf,
      id: `kf_${presetId}_${Date.now()}_${idx}`,
    }));

    const touchedProps = new Set(generated.map((g) => g.property));
    set((state) => ({
      project: {
        ...state.project,
        clips: state.project.clips.map((c) =>
          c.id === clipId
            ? {
                ...c,
                keyframes: [
                  ...c.keyframes.filter((k) => !touchedProps.has(k.property)),
                  ...generated,
                ],
              }
            : c
        ),
      },
      rightTab: 'keyframes',
    }));
  },

  addMarkerAtPlayhead: (label) => {
    const { currentTime, project } = get();
    const mk: TimelineMarker = {
      id: `mk_${Date.now()}`,
      time: quantizeToFrame(currentTime, project.fps),
      label: label || `Marker ${project.markers.length + 1}`,
      color: '#6366F1',
    };
    set((state) => ({
      project: {
        ...state.project,
        markers: [...state.project.markers, mk],
      },
    }));
  },

  removeMarker: (markerId) => {
    set((state) => ({
      project: {
        ...state.project,
        markers: state.project.markers.filter((m) => m.id !== markerId),
      },
    }));
  },

  updateExportSettings: (patch) => {
    set((state) => ({
      project: {
        ...state.project,
        exportSettings: { ...state.project.exportSettings, ...patch },
      },
    }));
  },

  setAiAutoExecuteLowRisk: (aiAutoExecuteLowRisk) => set({ aiAutoExecuteLowRisk }),

  proposeAIEditPlan: async (prompt) => {
    const { project, selectedClipIds, aiAutoExecuteLowRisk } = get();
    set({ aiLoading: true, lastAIStatusMessage: 'Inspecting project timeline and building validated edit plan...' });

    let plan: AIEditPlan | null = null;

    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || '';
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 3200);
      const res = await fetch(`${apiBase}/api/ai/plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: ctrl.signal,
        body: JSON.stringify({
          prompt,
          selectedClipId: selectedClipIds[0] || null,
          projectSummary: {
            name: project.name,
            aspectRatio: project.aspectRatio,
            fps: project.fps,
            clips: project.clips.map((c) => ({
              id: c.id,
              name: c.name,
              type: c.type,
              startTime: c.startTime,
              duration: c.duration,
            })),
            assets: project.assets.map((a) => ({
              id: a.id,
              name: a.name,
              type: a.type,
              duration: a.duration,
            })),
          },
        }),
      });
      clearTimeout(timer);

      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.operations) && data.operations.length > 0) {
          const validatedOps: AIToolOperation[] = [];
          const warnings: string[] = Array.isArray(data.warnings) ? [...data.warnings] : [];
          for (const rawOp of data.operations) {
            const v = validateAIOperation(rawOp);
            if (v.valid && v.sanitizedOp) {
              validatedOps.push(v.sanitizedOp);
            } else {
              warnings.push(...v.errors);
            }
          }
          if (validatedOps.length > 0) {
            plan = {
              id: `plan_${Date.now()}`,
              prompt,
              summary: data.summary || `AI proposed ${validatedOps.length} timeline edits`,
              reasoning: Array.isArray(data.reasoning) ? data.reasoning : ['Analyzed timeline structure and user request.'],
              operations: validatedOps,
              warnings,
              status: 'proposed',
              createdAt: Date.now(),
              modelUsed: data.modelUsed || 'Gemini 3.8 Flash Server Agent',
            };
          }
        }
      }
    } catch {
      // Server route unreachable (e.g. static GitHub Pages build); fall back to deterministic local planner
    }

    if (!plan) {
      plan = generateGroundedAIPlan(prompt, project, selectedClipIds[0] || null, 'ClipForge Structured Timeline Engine');
    }

    set((state) => ({
      aiPlans: [plan!, ...state.aiPlans],
      aiLoading: false,
      lastAIStatusMessage: `Edit plan ready with ${plan!.operations.length} validated operations.`,
    }));

    const hasDestructive = plan.operations.some((o) => o.destructive);
    if (aiAutoExecuteLowRisk && !hasDestructive) {
      get().applyAIEditPlan(plan.id);
    }

    return plan;
  },

  applyAIEditPlan: (planId) => {
    const state = get();
    const plan = state.aiPlans.find((p) => p.id === planId);
    if (!plan || plan.status === 'applied') return;

    // Handle direct undo tool if requested
    if (plan.operations.length === 1 && plan.operations[0].tool === 'undo_edit') {
      state.undo();
      set((s) => ({
        aiPlans: s.aiPlans.map((p) => (p.id === planId ? { ...p, status: 'applied' } : p)),
      }));
      return;
    }

    state.recordSnapshot(`AI Edit: ${plan.prompt.slice(0, 36)}`);

    for (const op of plan.operations) {
      const check = validateAIOperation(op);
      if (!check.valid || !check.sanitizedOp) continue;
      const args = check.sanitizedOp.args;

      switch (op.tool) {
        case 'set_aspect_ratio': {
          const ratio = (args.aspectRatio as AspectRatioId) || '9:16';
          const preset = ASPECT_RATIO_PRESETS[ratio] || ASPECT_RATIO_PRESETS['9:16'];
          set((s) => ({
            project: {
              ...s.project,
              aspectRatio: ratio,
              width: preset.width,
              height: preset.height,
              exportSettings: {
                ...s.project.exportSettings,
                width: preset.width,
                height: preset.height,
              },
            },
          }));
          break;
        }
        case 'set_clip_transform': {
          const cid = String(args.clipId || state.project.clips[0]?.id || '');
          const patch: Partial<ClipTransform> = {};
          if (typeof args.scale === 'number') patch.scale = args.scale;
          if (typeof args.positionX === 'number') patch.positionX = args.positionX;
          if (typeof args.positionY === 'number') patch.positionY = args.positionY;
          if (typeof args.rotation === 'number') patch.rotation = args.rotation;
          if (typeof args.opacity === 'number') patch.opacity = args.opacity;
          if (typeof args.fitMode === 'string') patch.fitMode = args.fitMode as ClipTransform['fitMode'];
          get().updateClipTransform(cid, patch, false);
          break;
        }
        case 'trim_clip': {
          const cid = String(args.clipId || '');
          const clip = get().project.clips.find((c) => c.id === cid);
          if (clip) {
            const newStart = typeof args.startTime === 'number' ? args.startTime : clip.startTime;
            const newDur = typeof args.duration === 'number' ? args.duration : clip.duration;
            get().trimClip(cid, newStart, newDur);
          }
          break;
        }
        case 'split_clip': {
          const splitTime = typeof args.time === 'number' ? args.time : get().currentTime;
          set({ currentTime: splitTime });
          get().splitSelectedOrAtPlayhead(typeof args.clipId === 'string' ? args.clipId : undefined);
          break;
        }
        case 'set_clip_speed': {
          const cid = String(args.clipId || get().selectedClipIds[0] || '');
          const speed = Number(args.speed || 1.25);
          get().updateClipProperties(cid, { speed });
          break;
        }
        case 'add_effect': {
          const cid = String(args.clipId || get().project.clips.find((c) => c.type === 'video')?.id || '');
          const effectId = String(args.effectId || 'teal-orange-grade');
          if (cid) {
            get().addEffectToClip(cid, effectId);
            if (typeof args.colorPreset === 'string') {
              get().applyColorGradePreset(cid, args.colorPreset);
            }
          }
          break;
        }
        case 'add_transition': {
          const cid = String(args.clipId || get().project.clips.find((c) => c.type === 'video')?.id || '');
          const transitionId = String(args.transitionId || 'whip-left');
          const duration = typeof args.duration === 'number' ? args.duration : 0.35;
          if (cid) {
            get().setClipTransition(cid, 'out', transitionId, duration);
          }
          break;
        }
        case 'add_keyframe': {
          const cid = String(args.clipId || get().project.clips.find((c) => c.type === 'video')?.id || '');
          const prop = (args.property as AnimatableProperty) || 'scale';
          const timeOffset = typeof args.timeOffset === 'number' ? args.timeOffset : 0.5;
          const value = typeof args.value === 'number' ? args.value : 125;
          const easing = (args.easing as EasingType) || 'ease-in-out';
          if (cid) {
            get().addOrUpdateKeyframe(cid, prop, timeOffset, value, easing);
          }
          break;
        }
        case 'add_text': {
          const text = String(args.text || 'HIGHLIGHT MOMENT');
          const style = (args.style as CaptionStyleId) || 'bold-gaming';
          const startTime = typeof args.startTime === 'number' ? args.startTime : 0.5;
          const duration = typeof args.duration === 'number' ? args.duration : 3.0;
          get().addTextClip(text, style, startTime, duration);
          break;
        }
        case 'add_captions': {
          const style = (args.style as CaptionStyleId) || 'word-highlight';
          const captions = Array.isArray(args.captions)
            ? (args.captions as { startTime: number; duration: number; text: string }[])
            : [{ startTime: 0.2, duration: 3.0, text: 'AI GENERATED HIGHLIGHT CAPTION' }];

          // Replace existing auto captions on text track or append cleanly
          for (const seg of captions) {
            get().addTextClip(seg.text, style, seg.startTime, seg.duration);
          }
          break;
        }
        case 'analyze_audio_beats': {
          const beatTimes = [0.94, 1.88, 2.81, 3.75, 4.69, 5.63, 6.56, 7.5];
          const newMarkers: TimelineMarker[] = beatTimes.map((t, i) => ({
            id: `mk_beat_${Date.now()}_${i}`,
            time: t,
            label: `Beat ${i + 1}`,
            color: '#10B981',
          }));
          set((s) => ({
            project: {
              ...s.project,
              markers: [...s.project.markers, ...newMarkers],
            },
          }));
          break;
        }
        case 'prepare_export': {
          const resolution = (args.resolution as ExportSettings['resolution']) || '1080p';
          const fps = (Number(args.fps) as ExportSettings['fps']) || 60;
          const format = (args.format as ExportSettings['format']) || 'mp4';
          get().updateExportSettings({ resolution, fps, format });
          break;
        }
        default:
          break;
      }
    }

    set((s) => ({
      aiPlans: s.aiPlans.map((p) => (p.id === planId ? { ...p, status: 'applied' } : p)),
      lastAIStatusMessage: `Applied ${plan.operations.length} AI operations to timeline.`,
      currentTime: 0.5,
    }));
  },

  cancelAIEditPlan: (planId) => {
    set((s) => ({
      aiPlans: s.aiPlans.map((p) => (p.id === planId ? { ...p, status: 'cancelled' } : p)),
      lastAIStatusMessage: 'Cancelled proposed AI edit plan.',
    }));
  },
}));
