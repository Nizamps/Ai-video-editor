import { AspectRatioId, AspectRatioPreset, ColorAdjustments, ClipTransform, TimelineClip } from '../types/editor';

export const ASPECT_RATIO_PRESETS: Record<AspectRatioId, AspectRatioPreset> = {
  '16:9': { id: '16:9', label: '16:9', description: 'YouTube & Landscape (1920×1080)', width: 1920, height: 1080 },
  '9:16': { id: '9:16', label: '9:16', description: 'Shorts, Reels & TikTok (1080×1920)', width: 1080, height: 1920 },
  '1:1': { id: '1:1', label: '1:1', description: 'Square Social Post (1080×1080)', width: 1080, height: 1080 },
  '4:5': { id: '4:5', label: '4:5', description: 'Portrait Social Feed (1080×1350)', width: 1080, height: 1350 },
  '3:4': { id: '3:4', label: '3:4', description: 'Portrait Content (1080×1440)', width: 1080, height: 1440 },
  '4:3': { id: '4:3', label: '4:3', description: 'Classic Broadcast (1440×1080)', width: 1440, height: 1080 },
  'custom': { id: 'custom', label: 'Custom', description: 'Custom Canvas Dimensions', width: 1920, height: 1080 },
};

export const DEFAULT_TRANSFORM: ClipTransform = {
  positionX: 0,
  positionY: 0,
  scale: 100,
  rotation: 0,
  opacity: 100,
  fitMode: 'fit',
  cropTop: 0,
  cropBottom: 0,
  cropLeft: 0,
  cropRight: 0,
  flipH: false,
  flipV: false,
};

export const DEFAULT_COLOR: ColorAdjustments = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  exposure: 0,
  temperature: 0,
  tint: 0,
  highlights: 0,
  shadows: 0,
  vignette: 0,
  sharpen: 0,
};

/**
 * Converts seconds to exact integer frame index at given project FPS.
 */
export function secondsToFrames(seconds: number, fps: number): number {
  const safeFps = fps > 0 ? fps : 30;
  return Math.max(0, Math.round(seconds * safeFps));
}

/**
 * Converts integer frame index back to rational seconds quantized to the frame grid.
 */
export function framesToSeconds(frames: number, fps: number): number {
  const safeFps = fps > 0 ? fps : 30;
  const clampedFrames = Math.max(0, Math.round(frames));
  return Number((clampedFrames / safeFps).toFixed(6));
}

/**
 * Quantizes an arbitrary timestamp in seconds to the nearest project frame boundary.
 */
export function quantizeToFrame(seconds: number, fps: number): number {
  return framesToSeconds(secondsToFrames(seconds, fps), fps);
}

/**
 * Formats seconds into SMPTE-style timecode HH:MM:SS:FF.
 */
export function formatTimecode(seconds: number, fps: number = 30): string {
  const safeSec = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
  const nominalFps = Math.max(1, Math.round(fps));
  const totalFrames = Math.round(safeSec * nominalFps);

  const ff = totalFrames % nominalFps;
  const totalWholeSeconds = Math.floor(totalFrames / nominalFps);
  const ss = totalWholeSeconds % 60;
  const mm = Math.floor(totalWholeSeconds / 60) % 60;
  const hh = Math.floor(totalWholeSeconds / 3600);

  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(hh)}:${pad(mm)}:${pad(ss)}:${pad(ff)}`;
}

/**
 * Formats compact duration mm:ss.f for rulers and badges.
 */
export function formatShortDuration(seconds: number): string {
  const safeSec = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
  const mins = Math.floor(safeSec / 60);
  const secs = Math.floor(safeSec % 60);
  const tenths = Math.floor((safeSec - Math.floor(safeSec)) * 10);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${tenths}`;
}

/**
 * Computes total timeline duration across all clips, with a minimum floor for editing comfort.
 */
export function calculateProjectDuration(clips: TimelineClip[], minDuration = 15): number {
  if (!clips.length) return minDuration;
  let maxEnd = 0;
  for (const clip of clips) {
    const end = clip.startTime + clip.duration;
    if (end > maxEnd) maxEnd = end;
  }
  return Math.max(minDuration, Number(maxEnd.toFixed(4)));
}

/**
 * Splits a clip at a target timeline playhead position (in seconds), returning [leftClip, rightClip]
 * or null if the split point is outside the clip or too close (< 0.1s) to its edges.
 */
export function splitClipAtTime(
  clip: TimelineClip,
  splitTime: number,
  fps: number = 30
): [TimelineClip, TimelineClip] | null {
  const quantizedSplit = quantizeToFrame(splitTime, fps);
  const minSegment = Math.max(2 / fps, 0.1);

  if (
    quantizedSplit <= clip.startTime + minSegment ||
    quantizedSplit >= clip.startTime + clip.duration - minSegment
  ) {
    return null;
  }

  const leftDuration = quantizeToFrame(quantizedSplit - clip.startTime, fps);
  const rightDuration = quantizeToFrame(clip.duration - leftDuration, fps);
  const sourceDelta = leftDuration * clip.speed;

  const leftKeyframes = clip.keyframes
    .filter((kf) => kf.timeOffset <= leftDuration)
    .map((kf) => ({ ...kf, id: `${kf.id}_L` }));

  const rightKeyframes = clip.keyframes
    .filter((kf) => kf.timeOffset > leftDuration)
    .map((kf) => ({
      ...kf,
      id: `${kf.id}_R`,
      timeOffset: Number((kf.timeOffset - leftDuration).toFixed(4)),
    }));

  const leftClip: TimelineClip = {
    ... structuredCloneClip(clip),
    id: `${clip.id}_a_${Math.random().toString(36).slice(2, 6)}`,
    duration: leftDuration,
    transitionOut: undefined,
    keyframes: leftKeyframes,
  };

  const rightClip: TimelineClip = {
    ...structuredCloneClip(clip),
    id: `${clip.id}_b_${Math.random().toString(36).slice(2, 6)}`,
    name: `${clip.name} (Part 2)`,
    startTime: quantizedSplit,
    duration: rightDuration,
    sourceStart: Number((clip.sourceStart + sourceDelta).toFixed(4)),
    transitionIn: undefined,
    keyframes: rightKeyframes,
  };

  return [leftClip, rightClip];
}

/**
 * Trims a clip's start or end edge while respecting frame boundaries and source media limits.
 */
export function trimClipEdges(
  clip: TimelineClip,
  newStartTime: number,
  newDuration: number,
  fps: number = 30
): TimelineClip {
  const minDur = Math.max(2 / fps, 0.1);
  const clampedStart = Math.max(0, quantizeToFrame(newStartTime, fps));
  const startDelta = clampedStart - clip.startTime;

  let updatedSourceStart = clip.sourceStart + startDelta * clip.speed;
  if (updatedSourceStart < 0) {
    updatedSourceStart = 0;
  }

  let clampedDuration = Math.max(minDur, quantizeToFrame(newDuration, fps));
  if (clip.sourceDuration > 0 && ( clip.type === 'video' || clip.type === 'audio')) {
    const maxAvailableDuration = (clip.sourceDuration - updatedSourceStart) / clip.speed;
    if (maxAvailableDuration >= minDur) {
      clampedDuration = Math.min(clampedDuration, quantizeToFrame(maxAvailableDuration, fps));
    }
  }

  return {
    ...clip,
    startTime: clampedStart,
    duration: clampedDuration,
    sourceStart: Number(updatedSourceStart.toFixed(4)),
  };
}

/**
 * Snaps a candidate time to nearby edit points (playhead, clip starts/ends, markers, 0)
 * within thresholdSeconds.
 */
export function snapTimeToTargets(
  candidateTime: number,
  targets: number[],
  thresholdSeconds: number,
  enabled: boolean = true
): { time: number; snapped: boolean; snapTarget: number | null } {
  if (!enabled || thresholdSeconds <= 0) {
    return { time: Math.max(0, candidateTime), snapped: false, snapTarget: null };
  }

  let bestTarget: number | null = null;
  let bestDist = thresholdSeconds;

  for (const target of targets) {
    const dist = Math.abs(candidateTime - target);
    if (dist <= bestDist) {
      bestDist = dist;
      bestTarget = target;
    }
  }

  if (bestTarget !== null) {
    return { time: Math.max(0, bestTarget), snapped: true, snapTarget: bestTarget };
  }
  return { time: Math.max(0, candidateTime), snapped: false, snapTarget: null };
}

/**
 * Performs ripple deletion on a track: removes targetClipId and shifts subsequent clips on the same track left.
 */
export function rippleDeleteClip(
  clips: TimelineClip[],
  targetClipId: string,
  rippleEnabled: boolean
): TimelineClip[] {
  const target = clips.find((c) => c.id === targetClipId);
  if (!target) return clips;

  const remaining = clips.filter((c) => c.id !== targetClipId);
  if (!rippleEnabled) return remaining;

  const shiftAmount = target.duration;
  return remaining.map((clip) => {
    if (clip.trackId === target.trackId && clip.startTime >= target.startTime + target.duration - 0.001) {
      return {
        ...clip,
        startTime: Math.max(0, Number((clip.startTime - shiftAmount).toFixed(4))),
      };
    }
    return clip;
  });
}

function structuredCloneClip(clip: TimelineClip): TimelineClip {
  return JSON.parse(JSON.stringify(clip));
}
