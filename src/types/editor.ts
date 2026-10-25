export type AspectRatioId = '16:9' | '9:16' | '1:1' | '4:5' | '3:4' | '4:3' | 'custom';

export interface AspectRatioPreset {
  id: AspectRatioId;
  label: string;
  description: string;
  width: number;
  height: number;
}

export type TrackType = 'video' | 'audio' | 'text' | 'overlay' | 'effect';

export type MediaType = 'video' | 'audio' | 'image' | 'procedural-video' | 'procedural-audio';

export type FitMode = 'fit' | 'fill' | 'crop' | 'blur-bg';

export interface SceneSegment {
  id: string;
  startTime: number;
  endTime: number;
  label: string;
  actionScore: number; // 0 to 100
}

export interface MediaAsset {
  id: string;
  name: string;
  type: MediaType;
  mimeType: string;
  sizeBytes: number;
  duration: number; // in seconds
  width: number;
  height: number;
  fps: number;
  codec: string;
  hasAudio: boolean;
  url?: string;
  proceduralPreset?: 'gta-chase' | 'cyber-drift' | 'boss-arena' | 'neon-grid';
  thumbnails: string[];
  waveform: number[]; // normalized 0..1 amplitude samples
  detectedBeats?: number[]; // timestamps in seconds
  detectedScenes?: SceneSegment[];
  missingFile?: boolean;
  createdAt: number;
}

export type EasingType = 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'hold' | 'bounce';

export type AnimatableProperty =
  | 'positionX'
  | 'positionY'
  | 'scale'
  | 'rotation'
  | 'opacity'
  | 'volume'
  | 'cropTop'
  | 'cropBottom'
  | 'cropLeft'
  | 'cropRight';

export interface Keyframe {
  id: string;
  property: AnimatableProperty;
  timeOffset: number; // seconds relative to clip start (0 .. clip.duration)
  value: number;
  easing: EasingType;
}

export type EffectCategory = 'basic' | 'gaming' | 'cinematic';

export interface EffectParameterDef {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  unit?: string;
}

export interface EffectDefinition {
  id: string;
  name: string;
  category: EffectCategory;
  description: string;
  badgeColor: string;
  parameters: EffectParameterDef[];
}

export interface ClipEffectInstance {
  id: string;
  effectId: string;
  name: string;
  enabled: boolean;
  params: Record<string, number>;
}

export type TransitionCategory = 'basic' | 'motion' | 'stylized';

export interface TransitionDefinition {
  id: string;
  name: string;
  category: TransitionCategory;
  description: string;
  defaultDuration: number;
}

export interface ClipTransition {
  id: string;
  transitionId: string;
  name: string;
  duration: number; // seconds (0.1 to 3.0)
  direction?: 'left' | 'right' | 'up' | 'down' | 'in' | 'out';
  color?: string;
}

export type CaptionStyleId =
  | 'clean-subtitles'
  | 'bold-gaming'
  | 'word-highlight'
  | 'karaoke'
  | 'animated-emphasis'
  | 'minimal-doc'
  | 'large-hook'
  | 'callout-label';

export interface CaptionWord {
  word: string;
  startOffset: number; // relative to clip start
  endOffset: number;
}

export interface TextStyleConfig {
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  color: string;
  highlightColor: string;
  backgroundColor: string;
  backgroundOpacity: number;
  strokeColor: string;
  strokeWidth: number;
  shadowColor: string;
  shadowBlur: number;
  align: 'left' | 'center' | 'right';
  lineSpacing: number;
  letterSpacing: number;
  padding: number;
  captionStyle: CaptionStyleId;
  words?: CaptionWord[];
}

export interface ColorAdjustments {
  brightness: number; // -100 to 100
  contrast: number;   // -100 to 100
  saturation: number; // -100 to 100
  exposure: number;   // -100 to 100
  temperature: number;// -100 to 100
  tint: number;       // -100 to 100
  highlights: number; // -100 to 100
  shadows: number;    // -100 to 100
  vignette: number;   // 0 to 100
  sharpen: number;    // 0 to 100
}

export interface ClipTransform {
  positionX: number; // pixels offset from center
  positionY: number; // pixels offset from center
  scale: number;     // 100 = 100%
  rotation: number;  // degrees
  opacity: number;   // 0 to 100
  fitMode: FitMode;
  cropTop: number;   // 0 to 45%
  cropBottom: number;
  cropLeft: number;
  cropRight: number;
  flipH: boolean;
  flipV: boolean;
}

export interface TimelineClip {
  id: string;
  trackId: string;
  assetId?: string;
  name: string;
  type: TrackType;
  startTime: number;   // timeline start in seconds
  duration: number;    // clip duration on timeline in seconds
  sourceStart: number; // media trim in-point in seconds
  sourceDuration: number;
  speed: number;       // 0.25 to 4.0
  reverse: boolean;
  volume: number;      // 0 to 200%
  muted: boolean;
  pan: number;         // -1 (L) to 1 (R)
  fadeIn: number;      // seconds
  fadeOut: number;     // seconds
  audioDucking: boolean;
  transform: ClipTransform;
  color: ColorAdjustments;
  effects: ClipEffectInstance[];
  transitionIn?: ClipTransition;
  transitionOut?: ClipTransition;
  keyframes: Keyframe[];
  textConfig?: TextStyleConfig;
  stickerIcon?: string;
  colorTag?: string;
}

export interface TimelineTrack {
  id: string;
  name: string;
  type: TrackType;
  muted: boolean;
  locked: boolean;
  visible: boolean;
  height: number; // px (44 to 110)
  order: number;
}

export interface TimelineMarker {
  id: string;
  time: number;
  label: string;
  color: string;
}

export interface ExportSettings {
  format: 'webm' | 'mp4';
  codec: 'vp9' | 'vp8' | 'h264';
  resolution: '360p' | '480p' | '720p' | '1080p' | '1440p' | '2160p' | 'custom';
  width: number;
  height: number;
  fps: 23.976 | 24 | 25 | 29.97 | 30 | 50 | 59.94 | 60;
  quality: 'low' | 'medium' | 'high' | 'max';
  videoBitrateMbps: number;
  audioBitrateKbps: 128 | 192 | 256 | 320;
  audioSampleRate: 44100 | 48000;
  includeVideo: boolean;
  includeAudio: boolean;
  burnCaptions: boolean;
  useServerRender: boolean;
}

export interface ProjectData {
  id: string;
  version: number;
  name: string;
  updatedAt: number;
  aspectRatio: AspectRatioId;
  width: number;
  height: number;
  fps: number;
  backgroundFill: 'black' | 'blur' | 'charcoal' | 'indigo';
  inPoint: number | null;
  outPoint: number | null;
  tracks: TimelineTrack[];
  clips: TimelineClip[];
  markers: TimelineMarker[];
  assets: MediaAsset[];
  exportSettings: ExportSettings;
}

export type AIToolName =
  | 'get_project_summary'
  | 'list_media_assets'
  | 'get_timeline'
  | 'get_selected_clip'
  | 'find_scene_changes'
  | 'analyze_audio_beats'
  | 'get_clip_metadata'
  | 'add_clip'
  | 'remove_clip'
  | 'split_clip'
  | 'trim_clip'
  | 'move_clip'
  | 'duplicate_clip'
  | 'set_clip_transform'
  | 'set_clip_speed'
  | 'add_transition'
  | 'add_effect'
  | 'update_effect'
  | 'add_text'
  | 'add_captions'
  | 'add_keyframe'
  | 'set_aspect_ratio'
  | 'undo_edit'
  | 'redo_edit'
  | 'validate_project'
  | 'prepare_export';

export interface AIToolOperation {
  id: string;
  tool: AIToolName;
  description: string;
  args: Record<string, unknown>;
  destructive?: boolean;
}

export interface AIEditPlan {
  id: string;
  prompt: string;
  summary: string;
  reasoning: string[];
  operations: AIToolOperation[];
  warnings: string[];
  status: 'proposed' | 'applied' | 'cancelled' | 'undone';
  createdAt: number;
  modelUsed: string;
}
