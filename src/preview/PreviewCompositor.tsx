import React, { useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Grid,
  Move,
} from 'lucide-react';
import { useEditorStore } from '../editor/store';
import { calculateProjectDuration, formatTimecode } from '../editor/timebase';
import { MediaElementCache, renderProjectFrame } from './renderEngine';
import { getAnimatedClipValues } from '../animation/keyframes';

export const sharedMediaCache: MediaElementCache = {
  videos: new Map<string, HTMLVideoElement>(),
  images: new Map<string, HTMLImageElement>(),
};

export const PreviewCompositor: React.FC = () => {
  const {
    project,
    isPlaying,
    currentTime,
    playbackSpeed,
    previewQuality,
    previewZoom,
    showSafeGuides,
    selectedClipIds,
    togglePlay,
    setIsPlaying,
    setCurrentTime,
    stepFrames,
    jumpToEditPoint,
    setPlaybackSpeed,
    setPreviewZoom,
    toggleSafeGuides,
    updateClipTransform,
    recordSnapshot,
  } = useEditorStore();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const [draggingGizmo, setDraggingGizmo] = useState<null | {
    mode: 'move' | 'scale';
    clipId: string;
    startClientX: number;
    startClientY: number;
    initialPosX: number;
    initialPosY: number;
    initialScale: number;
  }>(null);

  const totalDuration = calculateProjectDuration(project.clips, 10);
  const selectedClip = project.clips.find((c) => c.id === selectedClipIds[0]) || null;

  // Populate HTMLVideoElement and HTMLImageElement cache for imported assets
  useEffect(() => {
    for (const asset of project.assets) {
      if (asset.type === 'video' && asset.url && !sharedMediaCache.videos.has(asset.id)) {
        const v = document.createElement('video');
        v.src = asset.url;
        v.muted = true;
        v.playsInline = true;
        v.preload = 'auto';
        sharedMediaCache.videos.set(asset.id, v);
      } else if (asset.type === 'image' && asset.url && !sharedMediaCache.images.has(asset.id)) {
        const img = new Image();
        img.src = asset.url;
        sharedMediaCache.images.set(asset.id, img);
      } else if (
        (asset.type === 'audio' || asset.type === 'procedural-audio') &&
        asset.url &&
        !audioElementsRef.current.has(asset.id)
      ) {
        const aud = new Audio(asset.url);
        aud.preload = 'auto';
        audioElementsRef.current.set(asset.id, aud);
      }
    }
  }, [project.assets]);

  // Synchronize HTMLVideoElement and HTMLAudioElement playback with timeline clock
  useEffect(() => {
    const visibleTrackMap = new Map(project.tracks.map((t) => [t.id, !t.muted && t.visible]));

    // Sync audio clips
    const activeAudioClips = project.clips.filter(
      (c) =>
        c.type === 'audio' &&
        !c.muted &&
        visibleTrackMap.get(c.trackId) &&
        currentTime >= c.startTime &&
        currentTime < c.startTime + c.duration
    );

    const activeAssetIds = new Set(activeAudioClips.map((c) => c.assetId).filter(Boolean));
    audioElementsRef.current.forEach((aud, assetId) => {
      if (!isPlaying || !activeAssetIds.has(assetId)) {
        if (!aud.paused) aud.pause();
      }
    });

    for (const clip of activeAudioClips) {
      if (!clip.assetId) continue;
      const aud = audioElementsRef.current.get(clip.assetId);
      if (!aud) continue;
      const targetSourceTime = clip.sourceStart + (currentTime - clip.startTime) * clip.speed;
      const anim = getAnimatedClipValues(clip, currentTime);
      aud.volume = Math.max(0, Math.min(1, anim.volume / 100));
      aud.playbackRate = Math.max(0.25, Math.min(4, clip.speed * playbackSpeed));

      if (Math.abs(aud.currentTime - targetSourceTime) > 0.28) {
        try {
          aud.currentTime = targetSourceTime;
        } catch {
          // ignore seek error on unbuffered audio
        }
      }
      if (isPlaying && aud.paused) {
        aud.play().catch(() => {});
      }
    }

    // Sync video clips
    for (const clip of project.clips) {
      if (clip.type !== 'video' || !clip.assetId) continue;
      const vid = sharedMediaCache.videos.get(clip.assetId);
      if (!vid) continue;
      const isClipActive =
        currentTime >= clip.startTime && currentTime <= clip.startTime + clip.duration;
      if (isClipActive) {
        const targetTime = clip.sourceStart + (currentTime - clip.startTime) * clip.speed;
        if (Math.abs(vid.currentTime - targetTime) > 0.2) {
          try {
            vid.currentTime = targetTime;
          } catch {
            // ignore
          }
        }
        if (isPlaying && vid.paused) vid.play().catch(() => {});
        else if (!isPlaying && !vid.paused) vid.pause();
      } else if (!vid.paused) {
        vid.pause();
      }
    }
  }, [currentTime, isPlaying, playbackSpeed, project.clips, project.tracks]);

  // Playback loop via requestAnimationFrame (only runs while isPlaying === true)
  useEffect(() => {
    if (!isPlaying) return;
    let rafId = 0;
    let lastTs = performance.now();

    const tick = (now: number) => {
      const dt = ((now - lastTs) / 1000) * playbackSpeed;
      lastTs = now;
      const state = useEditorStore.getState();
      const maxDur = calculateProjectDuration(state.project.clips, 10);
      const nextTime = state.currentTime + dt;

      if (nextTime >= maxDur) {
        state.setCurrentTime(0);
        state.setIsPlaying(false);
        return;
      }

      state.setCurrentTime(nextTime);
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, playbackSpeed]);

  // Render current frame whenever currentTime, project, or quality changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    renderProjectFrame(ctx, project, currentTime, sharedMediaCache, {
      showSafeGuides,
      selectedClipId: selectedClip?.id || null,
      burnCaptions: true,
    });
  }, [project, currentTime, previewQuality, showSafeGuides, selectedClip?.id]);

  // Handle interactive Transform Gizmo dragging on preview monitor
  useEffect(() => {
    if (!draggingGizmo) return;

    const handleMove = (e: MouseEvent) => {
      const dx = e.clientX - draggingGizmo.startClientX;
      const dy = e.clientY - draggingGizmo.startClientY;
      if (draggingGizmo.mode === 'move') {
        updateClipTransform(
          draggingGizmo.clipId,
          {
            positionX: Math.round(draggingGizmo.initialPosX + dx * 2),
            positionY: Math.round(draggingGizmo.initialPosY + dy * 2),
          },
          false
        );
      } else {
        const nextScale = Math.max(15, Math.min(300, Math.round(draggingGizmo.initialScale + dx * 0.5)));
        updateClipTransform(draggingGizmo.clipId, { scale: nextScale }, false);
      }
    };

    const handleUp = () => {
      setDraggingGizmo(null);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [draggingGizmo, updateClipTransform]);

  const qualityDivisor = previewQuality === 'full' ? 2 : previewQuality === 'half' ? 3 : 4;
  const internalCanvasW = Math.max(240, Math.round(project.width / qualityDivisor));
  const internalCanvasH = Math.max(240, Math.round(project.height / qualityDivisor));

  const aspectNum = project.width / Math.max(1, project.height);
  const isPortrait = aspectNum < 1;

  const isSelectedClipVisibleAtPlayhead =
    selectedClip &&
    selectedClip.type !== 'audio' &&
    currentTime >= selectedClip.startTime &&
    currentTime <= selectedClip.startTime + selectedClip.duration;

  const handleFullscreen = () => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      containerRef.current.requestFullscreen().catch(() => {});
    }
  };

  return (
    <section
      ref={containerRef}
      aria-label="Video Preview Monitor"
      className="flex-1 flex flex-col bg-[#0B0D12] min-w-0 min-h-0 select-none overflow-hidden"
    >
      {/* Top Viewport Status Strip */}
      <div className="h-9 px-4 border-b border-[#232838] bg-[#10131C] flex items-center justify-between text-xs text-slate-400 shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-slate-200">Program Monitor</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono tabular-nums text-[11px]">
            {project.width}×{project.height} ({project.aspectRatio}) @ {project.fps} FPS
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleSafeGuides}
            className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition-colors ${
              showSafeGuides
                ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#1A1E2B]'
            }`}
            title="Toggle Action & Title Safe Area Guides"
          >
            <Grid className="w-3 h-3" />
            <span>Safe Guides</span>
          </button>

          <label htmlFor="preview-zoom-select" className="sr-only">
            Preview Zoom
          </label>
          <select
            id="preview-zoom-select"
            aria-label="Preview Zoom"
            value={String(previewZoom)}
            onChange={(e) =>
              setPreviewZoom(e.target.value === 'fit' ? 'fit' : Number(e.target.value))
            }
            className="bg-[#0B0D12] border border-[#232838] rounded px-2 py-0.5 text-[11px] text-slate-300 focus:outline-none"
          >
            <option value="fit">Fit Window</option>
            <option value="50">50%</option>
            <option value="100">100%</option>
            <option value="125">125%</option>
          </select>

          <button
            type="button"
            onClick={handleFullscreen}
            aria-label="Fullscreen Preview"
            title="Fullscreen Preview"
            className="p-1 rounded hover:bg-[#1A1E2B] text-slate-400 hover:text-white transition-colors"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Central Canvas Stage */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-hidden relative bg-[#080A0F]">
        <div
          className="relative shadow-2xl border border-[#262C3F] bg-black overflow-hidden flex items-center justify-center"
          style={{
            aspectRatio: `${project.width} / ${project.height}`,
            height: isPortrait ? '92%' : 'auto',
            width: isPortrait ? 'auto' : '92%',
            maxHeight: '100%',
            maxWidth: '100%',
            transform:
              typeof previewZoom === 'number' ? `scale(${previewZoom / 100})` : undefined,
          }}
        >
          <canvas
            ref={canvasRef}
            data-testid="preview-canvas"
            width={internalCanvasW}
            height={internalCanvasH}
            onClick={togglePlay}
            className="w-full h-full block cursor-pointer"
          />

          {/* Interactive Transform Gizmo Overlay for active clip */}
          {isSelectedClipVisibleAtPlayhead && selectedClip && (
            <div
              className="absolute inset-4 border border-indigo-400/70 pointer-events-none flex items-start justify-end p-2"
              aria-hidden="true"
            >
              <div className="pointer-events-auto flex items-center gap-1 bg-[#0B0D12]/90 border border-indigo-500/60 rounded px-2 py-1 text-[10px] text-indigo-200 shadow">
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    recordSnapshot('Drag clip position in preview');
                    setDraggingGizmo({
                      mode: 'move',
                      clipId: selectedClip.id,
                      startClientX: e.clientX,
                      startClientY: e.clientY,
                      initialPosX: selectedClip.transform.positionX,
                      initialPosY: selectedClip.transform.positionY,
                      initialScale: selectedClip.transform.scale,
                    });
                  }}
                  className="flex items-center gap-1 cursor-move hover:text-white"
                  title="Drag to reposition layer on canvas"
                >
                  <Move className="w-3 h-3 text-indigo-400" />
                  <span>{selectedClip.name.slice(0, 18)}</span>
                </button>
                <span className="text-slate-600">·</span>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    recordSnapshot('Scale clip in preview');
                    setDraggingGizmo({
                      mode: 'scale',
                      clipId: selectedClip.id,
                      startClientX: e.clientX,
                      startClientY: e.clientY,
                      initialPosX: selectedClip.transform.positionX,
                      initialPosY: selectedClip.transform.positionY,
                      initialScale: selectedClip.transform.scale,
                    });
                  }}
                  className="cursor-ew-resize font-mono text-indigo-300 hover:text-white"
                  title="Drag horizontally to scale layer"
                >
                  {Math.round(selectedClip.transform.scale)}%
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Transport Control Bar */}
      <div className="h-11 px-4 bg-[#12151E] border-t border-[#232838] flex items-center justify-between gap-4 shrink-0">
        {/* Timecode Display */}
        <div className="flex items-center gap-2 font-mono tabular-nums text-xs">
          <span className="text-indigo-400 font-semibold" data-testid="current-timecode">
            {formatTimecode(currentTime, project.fps)}
          </span>
          <span className="text-slate-600">/</span>
          <span className="text-slate-400">{formatTimecode(totalDuration, project.fps)}</span>
        </div>

        {/* Transport Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => jumpToEditPoint('prev')}
            aria-label="Previous Edit Point"
            title="Previous Edit Point"
            className="p-1.5 rounded text-slate-300 hover:text-white hover:bg-[#1A1E2B] transition-colors"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => stepFrames(-1)}
            aria-label="Step Back 1 Frame"
            title="Step Back 1 Frame (Left Arrow)"
            className="p-1.5 rounded text-slate-300 hover:text-white hover:bg-[#1A1E2B] transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={togglePlay}
            aria-label={isPlaying ? 'Pause playback' : 'Play playback'}
            title="Play / Pause (Space)"
            className="w-8 h-8 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow transition-colors"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>

          <button
            type="button"
            onClick={() => stepFrames(1)}
            aria-label="Step Forward 1 Frame"
            title="Step Forward 1 Frame (Right Arrow)"
            className="p-1.5 rounded text-slate-300 hover:text-white hover:bg-[#1A1E2B] transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => jumpToEditPoint('next')}
            aria-label="Next Edit Point"
            title="Next Edit Point"
            className="p-1.5 rounded text-slate-300 hover:text-white hover:bg-[#1A1E2B] transition-colors"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Playback Speed */}
        <div className="flex items-center gap-2">
          <label htmlFor="playback-rate-select" className="text-[11px] text-slate-400">
            Rate:
          </label>
          <select
            id="playback-rate-select"
            aria-label="Playback Speed"
            value={playbackSpeed}
            onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
            className="bg-[#0B0D12] border border-[#232838] rounded px-2 py-0.5 text-xs font-mono tabular-nums text-slate-200 focus:outline-none"
          >
            <option value={0.5}>0.5x</option>
            <option value={1}>1.0x</option>
            <option value={1.5}>1.5x</option>
            <option value={2}>2.0x</option>
          </select>
        </div>
      </div>
    </section>
  );
};
