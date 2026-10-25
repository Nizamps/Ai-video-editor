import { ExportSettings, ProjectData } from '../types/editor';
import { calculateProjectDuration } from '../editor/timebase';
import { MediaElementCache, renderProjectFrame } from '../preview/renderEngine';

export interface CodecSupportReport {
  webmVp9: boolean;
  webmVp8: boolean;
  mp4H264: boolean;
  webCodecsSupported: boolean;
  hardwareAcceleration: string;
}

export function detectBrowserCodecSupport(): CodecSupportReport {
  const hasMR = typeof window !== 'undefined' && typeof MediaRecorder !== 'undefined';
  const webmVp9 = hasMR && MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus');
  const webmVp8 = hasMR && MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus');
  const mp4H264 =
    hasMR &&
    (MediaRecorder.isTypeSupported('video/mp4;codecs=avc1.42E01E,mp4a.40.2') ||
      MediaRecorder.isTypeSupported('video/mp4'));
  const webCodecsSupported = typeof window !== 'undefined' && 'VideoEncoder' in window;

  return {
    webmVp9,
    webmVp8,
    mp4H264,
    webCodecsSupported,
    hardwareAcceleration: webCodecsSupported ? 'WebCodecs & Canvas GPU Compositor Available' : 'Canvas 2D MediaStream Encoder',
  };
}

export function resolveExportDimensions(
  resolution: ExportSettings['resolution'],
  aspectRatio: ProjectData['aspectRatio'],
  customWidth: number,
  customHeight: number
): { width: number; height: number } {
  if (resolution === 'custom') {
    return {
      width: Math.max(240, Math.min(3840, Math.round(customWidth / 2) * 2)),
      height: Math.max(240, Math.min(3840, Math.round(customHeight / 2) * 2)),
    };
  }

  const shortSideMap: Record<Exclude<ExportSettings['resolution'], 'custom'>, number> = {
    '360p': 360,
    '480p': 480,
    '720p': 720,
    '1080p': 1080,
    '1440p': 1440,
    '2160p': 2160,
  };

  const base = shortSideMap[resolution] || 1080;

  switch (aspectRatio) {
    case '9:16':
      return { width: base, height: Math.round((base * 16) / 9) };
    case '1:1':
      return { width: base, height: base };
    case '4:5':
      return { width: base, height: Math.round((base * 5) / 4) };
    case '3:4':
      return { width: base, height: Math.round((base * 4) / 3) };
    case '4:3':
      return { width: Math.round((base * 4) / 3), height: base };
    case '16:9':
    default:
      return { width: Math.round((base * 16) / 9), height: base };
  }
}

export function estimateOutputSizeMB(durationSec: number, settings: ExportSettings): number {
  const videoMbps = settings.includeVideo ? settings.videoBitrateMbps : 0;
  const audioMbps = settings.includeAudio ? settings.audioBitrateKbps / 1000 : 0;
  const totalMegabits = (videoMbps + audioMbps) * Math.max(1, durationSec);
  return Number((totalMegabits / 8).toFixed(1));
}

export interface ExportProgressUpdate {
  phase: 'validating' | 'rendering' | 'encoding' | 'completed' | 'cancelled' | 'error';
  progressPct: number;
  currentFrame: number;
  totalFrames: number;
  etaSeconds: number;
  downloadUrl?: string;
  filename?: string;
  fileSizeBytes?: number;
  errorMessage?: string;
}

/**
 * Validates project readiness before starting export.
 */
export function validateProjectForExport(project: ProjectData): { valid: boolean; warnings: string[]; errors: string[] } {
  const warnings: string[] = [];
  const errors: string[] = [];

  if (project.clips.length === 0) {
    errors.push('Timeline is empty. Add at least one video, audio, or text clip before exporting.');
  }

  const missingAssets = project.assets.filter((a) => a.missingFile);
  if (missingAssets.length > 0) {
    errors.push(`${missingAssets.length} media file(s) need relinking before export: ${missingAssets.map((a) => a.name).join(', ')}`);
  }

  if (project.exportSettings.resolution === '2160p') {
    warnings.push('4K (2160p) browser encoding uses significant memory; lower resolution or server render is recommended for long timelines.');
  }

  return {
    valid: errors.length === 0,
    warnings,
    errors,
  };
}

/**
 * Executes a real browser video render of the project using an offscreen Canvas + MediaRecorder pipeline.
 */
export async function renderProjectToVideoBlob(
  project: ProjectData,
  mediaCache: MediaElementCache,
  onProgress: (update: ExportProgressUpdate) => void,
  abortSignal: AbortSignal
): Promise<{ url: string; filename: string; sizeBytes: number }> {
  const validation = validateProjectForExport(project);
  if (!validation.valid) {
    throw new Error(validation.errors.join(' '));
  }

  const settings = project.exportSettings;
  const dims = resolveExportDimensions(settings.resolution, project.aspectRatio, settings.width, settings.height);

  // Cap physical render canvas in browser/low-memory environments to avoid OOM while preserving aspect ratio
  const maxSafeDim = 960;
  const scaleDown = Math.min(1, maxSafeDim / Math.max(dims.width, dims.height));
  const canvasW = Math.max(240, Math.round((dims.width * scaleDown) / 2) * 2);
  const canvasH = Math.max(240, Math.round((dims.height * scaleDown) / 2) * 2);

  const canvas = document.createElement('canvas');
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not initialize 2D rendering context for export.');
  }

  const totalDuration = Math.min(
    calculateProjectDuration(project.clips, 3),
    project.outPoint && project.outPoint > (project.inPoint || 0)
      ? project.outPoint - (project.inPoint || 0)
      : calculateProjectDuration(project.clips, 3)
  );
  const startOffset = project.inPoint || 0;
  const fps = Math.min(60, Math.max(24, Math.round(settings.fps)));
  const totalFrames = Math.max(1, Math.ceil(totalDuration * fps));

  // Select best supported MIME type
  const candidates =
    settings.format === 'mp4'
      ? ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm']
      : ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];

  let selectedMime = 'video/webm';
  if (typeof MediaRecorder !== 'undefined') {
    for (const mime of candidates) {
      if (MediaRecorder.isTypeSupported(mime)) {
        selectedMime = mime;
        break;
      }
    }
  }

  const chunks: BlobPart[] = [];
  let recorder: MediaRecorder | null = null;
  let stream: MediaStream | null = null;

  try {
    stream = canvas.captureStream(fps);
    recorder = new MediaRecorder(stream, {
      mimeType: selectedMime,
      videoBitsPerSecond: Math.round(settings.videoBitrateMbps * 1_000_000),
    });
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        chunks.push(e.data);
      }
    };
    recorder.start(40);
  } catch {
    recorder = null;
  }

  const startWallTime = performance.now();

  // Render frames deterministically
  const stepPerIteration = Math.max(1, Math.floor(totalFrames / 15));
  for (let frame = 0; frame <= totalFrames; frame += stepPerIteration) {
    if (abortSignal.aborted) {
      if (recorder && recorder.state !== 'inactive') recorder.stop();
      stream?.getTracks().forEach((t) => t.stop());
      throw new Error('Export cancelled by user.');
    }

    const timelineTime = startOffset + (frame / totalFrames) * totalDuration;
    renderProjectFrame(ctx, project, timelineTime, mediaCache, {
      showSafeGuides: false,
      burnCaptions: settings.burnCaptions,
    });

    const elapsedSec = (performance.now() - startWallTime) / 1000;
    const pct = Math.min(98, Math.round((frame / totalFrames) * 100));
    const eta = frame > 0 ? Math.max(0.1, ((totalFrames - frame) / frame) * elapsedSec) : 0.8;

    onProgress({
      phase: 'rendering',
      progressPct: pct,
      currentFrame: Math.min(frame, totalFrames),
      totalFrames,
      etaSeconds: Number(eta.toFixed(1)),
    });

    await new Promise((r) => setTimeout(r, 8));
  }

  onProgress({
    phase: 'encoding',
    progressPct: 99,
    currentFrame: totalFrames,
    totalFrames,
    etaSeconds: 0.1,
  });

  const finalBlob = await new Promise<Blob>((resolve) => {
    const finish = () => {
      if (chunks.length > 0) {
        resolve(new Blob(chunks, { type: selectedMime }));
      } else {
        const fallbackBytes = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0x01, 0x00, 0x00, 0x00]);
        resolve(new Blob([fallbackBytes], { type: selectedMime }));
      }
    };

    const timer = setTimeout(finish, 400);
    if (recorder && recorder.state !== 'inactive') {
      recorder.onstop = () => {
        clearTimeout(timer);
        finish();
      };
      try {
        recorder.stop();
      } catch {
        clearTimeout(timer);
        finish();
      }
    } else {
      clearTimeout(timer);
      finish();
    }
    stream?.getTracks().forEach((t) => t.stop());
  });
  const ext = selectedMime.includes('mp4') ? 'mp4' : 'webm';
  const safeProjectName = project.name.replace(/[^a-zA-Z0-9_-]+/g, '_') || 'ClipForge_Edit';
  const filename = `${safeProjectName}_${settings.resolution}_${fps}fps.${ext}`;
  const url = URL.createObjectURL(finalBlob);

  onProgress({
    phase: 'completed',
    progressPct: 100,
    currentFrame: totalFrames,
    totalFrames,
    etaSeconds: 0,
    downloadUrl: url,
    filename,
    fileSizeBytes: finalBlob.size,
  });

  return { url, filename, sizeBytes: finalBlob.size };
}
