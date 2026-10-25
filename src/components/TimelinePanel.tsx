import React, { useEffect, useRef, useState } from 'react';
import {
  Scissors,
  Trash2,
  Copy,
  Magnet,
  Bookmark,
  ZoomIn,
  ZoomOut,
  Plus,
  Volume2,
  VolumeX,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Film,
  Music,
  Type,
  Layers,
  GitCommitHorizontal,
} from 'lucide-react';
import { useEditorStore } from '../editor/store';
import {
  calculateProjectDuration,
  formatShortDuration,
  snapTimeToTargets,
} from '../editor/timebase';
import { TrackType } from '../types/editor';

export const TimelinePanel: React.FC = () => {
  const {
    project,
    currentTime,
    selectedClipIds,
    timelineZoom,
    timelineCollapsed,
    timelineHeightPx,
    snappingEnabled,
    rippleEdit,
    setCurrentTime,
    setIsPlaying,
    selectClip,
    splitSelectedOrAtPlayhead,
    deleteSelectedClips,
    duplicateClip,
    toggleSnapping,
    toggleRippleEdit,
    setTimelineZoom,
    setTimelineCollapsed,
    addTrack,
    deleteTrack,
    toggleTrackMute,
    toggleTrackLock,
    toggleTrackVisible,
    moveClip,
    trimClip,
    addMarkerAtPlayhead,
    recordSnapshot,
  } = useEditorStore();

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const [dragState, setDragState] = useState<null | {
    mode: 'move' | 'trim-left' | 'trim-right' | 'scrub';
    clipId?: string;
    startX: number;
    initialStart: number;
    initialDuration: number;
  }>(null);

  const totalDuration = Math.max(16, calculateProjectDuration(project.clips, 14) + 4);
  const timelineWidthPx = Math.max(900, Math.round(totalDuration * timelineZoom));

  const sortedTracks = [...project.tracks].sort((a, b) => a.order - b.order);

  // Collect snap targets (0, playhead, clip boundaries, markers)
  const getSnapTargets = (excludeClipId?: string): number[] => {
    const targets: number[] = [0, currentTime];
    for (const m of project.markers) targets.push(m.time);
    for (const c of project.clips) {
      if (c.id === excludeClipId) continue;
      targets.push(c.startTime, c.startTime + c.duration);
    }
    return targets;
  };

  // Global mouse listeners for scrubbing, moving, or trimming clips
  useEffect(() => {
    if (!dragState) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (dragState.mode === 'scrub') {
        if (!scrollContainerRef.current) return;
        const rect = scrollContainerRef.current.getBoundingClientRect();
        const relX = e.clientX - rect.left + scrollContainerRef.current.scrollLeft;
        const time = Math.max(0, relX / timelineZoom);
        setCurrentTime(time);
        return;
      }

      if (!dragState.clipId) return;
      const dxSec = (e.clientX - dragState.startX) / timelineZoom;
      const targets = getSnapTargets(dragState.clipId);
      const snapThreshold = 8 / timelineZoom;

      if (dragState.mode === 'move') {
        const candidate = Math.max(0, dragState.initialStart + dxSec);
        const snapped = snapTimeToTargets(candidate, targets, snapThreshold, snappingEnabled);
        moveClip(dragState.clipId, snapped.time);
      } else if (dragState.mode === 'trim-left') {
        const maxMove = dragState.initialDuration - 0.25;
        const clampedDelta = Math.max(-dragState.initialStart, Math.min(maxMove, dxSec));
        const nextStart = dragState.initialStart + clampedDelta;
        const nextDur = dragState.initialDuration - clampedDelta;
        trimClip(dragState.clipId, nextStart, nextDur);
      } else if (dragState.mode === 'trim-right') {
        const candidateEnd = Math.max(
          dragState.initialStart + 0.25,
          dragState.initialStart + dragState.initialDuration + dxSec
        );
        const snappedEnd = snapTimeToTargets(candidateEnd, targets, snapThreshold, snappingEnabled);
        trimClip(
          dragState.clipId,
          dragState.initialStart,
          Math.max(0.25, snappedEnd.time - dragState.initialStart)
        );
      }
    };

    const handleMouseUp = () => {
      setDragState(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleUpListener);
    };

    function handleUpListener() {
      handleMouseUp();
    }
  }, [dragState, timelineZoom, snappingEnabled, moveClip, trimClip, setCurrentTime]);

  const handleRulerMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!scrollContainerRef.current) return;
    setIsPlaying(false);
    const rect = scrollContainerRef.current.getBoundingClientRect();
    const relX = e.clientX - rect.left + scrollContainerRef.current.scrollLeft;
    const nextTime = Math.max(0, relX / timelineZoom);
    setCurrentTime(nextTime);
    setDragState({
      mode: 'scrub',
      startX: e.clientX,
      initialStart: nextTime,
      initialDuration: 0,
    });
  };

  const trackIcon = (type: TrackType) => {
    switch (type) {
      case 'video':
        return <Film className="w-3.5 h-3.5 text-indigo-400" />;
      case 'audio':
        return <Music className="w-3.5 h-3.5 text-emerald-400" />;
      case 'text':
        return <Type className="w-3.5 h-3.5 text-amber-400" />;
      default:
        return <Layers className="w-3.5 h-3.5 text-sky-400" />;
    }
  };

  return (
    <section
      aria-label="Multitrack Timeline"
      style={{ height: timelineCollapsed ? 42 : timelineHeightPx }}
      className="bg-[#12151E] border-t border-[#232838] flex flex-col select-none shrink-0 transition-[height] duration-150"
    >
      {/* Timeline Action Toolbar */}
      <div className="h-10 px-3 bg-[#10131C] border-b border-[#232838] flex items-center justify-between gap-3 shrink-0">
        {/* Left Editing Actions */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => splitSelectedOrAtPlayhead()}
            className="px-2.5 py-1 rounded bg-[#1A1E2B] hover:bg-indigo-600 text-slate-200 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
            title="Split Clip at Playhead (S)"
          >
            <Scissors className="w-3.5 h-3.5" />
            <span>Split</span>
          </button>

          <button
            type="button"
            onClick={() => duplicateClip()}
            disabled={selectedClipIds.length === 0}
            className="px-2 py-1 rounded bg-[#1A1E2B] hover:bg-[#232838] disabled:opacity-40 text-slate-200 text-xs font-medium flex items-center gap-1 transition-colors"
            title="Duplicate Selected Clip"
          >
            <Copy className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Duplicate</span>
          </button>

          <button
            type="button"
            onClick={deleteSelectedClips}
            disabled={selectedClipIds.length === 0}
            aria-label="Delete Selected Clip on Timeline"
            className="px-2 py-1 rounded bg-[#1A1E2B] hover:bg-rose-600 disabled:opacity-40 text-slate-200 hover:text-white text-xs font-medium flex items-center gap-1 transition-colors"
            title="Delete Selected Clip (Delete)"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Delete</span>
          </button>

          <span className="text-slate-700 mx-1" aria-hidden="true">|</span>

          <button
            type="button"
            onClick={toggleSnapping}
            className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 transition-colors ${
              snappingEnabled
                ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40'
                : 'bg-[#1A1E2B] text-slate-400'
            }`}
            title="Toggle Magnetic Snapping"
          >
            <Magnet className="w-3.5 h-3.5" />
            <span>Snap</span>
          </button>

          <button
            type="button"
            onClick={toggleRippleEdit}
            className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 transition-colors ${
              rippleEdit
                ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40'
                : 'bg-[#1A1E2B] text-slate-400'
            }`}
            title="Toggle Ripple Delete Mode"
          >
            <GitCommitHorizontal className="w-3.5 h-3.5" />
            <span>Ripple</span>
          </button>

          <button
            type="button"
            onClick={() => addMarkerAtPlayhead()}
            className="px-2 py-1 rounded bg-[#1A1E2B] hover:bg-[#232838] text-slate-300 text-xs font-medium flex items-center gap-1"
            title="Add Timeline Marker at Playhead"
          >
            <Bookmark className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden md:inline">Marker</span>
          </button>
        </div>

        {/* Center: Add Track Buttons */}
        <div className="hidden lg:flex items-center gap-1">
          {(['video', 'audio', 'text', 'overlay'] as TrackType[]).map((tType) => (
            <button
              key={tType}
              type="button"
              onClick={() => addTrack(tType)}
              className="px-2 py-1 rounded bg-[#0B0D12] border border-[#232838] hover:border-indigo-500/50 text-[11px] text-slate-300 hover:text-white flex items-center gap-1 capitalize"
            >
              <Plus className="w-3 h-3 text-indigo-400" />
              <span>{tType} Track</span>
            </button>
          ))}
        </div>

        {/* Right: Zoom Controls & Collapse */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTimelineZoom(timelineZoom - 16)}
            aria-label="Zoom Out Timeline"
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#1A1E2B]"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <input
            type="range"
            aria-label="Timeline Zoom"
            min={20}
            max={180}
            value={timelineZoom}
            onChange={(e) => setTimelineZoom(Number(e.target.value))}
            className="w-24 accent-indigo-500 h-1 bg-[#0B0D12] rounded cursor-pointer"
          />
          <button
            type="button"
            onClick={() => setTimelineZoom(timelineZoom + 16)}
            aria-label="Zoom In Timeline"
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#1A1E2B]"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setTimelineCollapsed(!timelineCollapsed)}
            aria-label={timelineCollapsed ? 'Expand Timeline' : 'Collapse Timeline'}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#1A1E2B]"
          >
            {timelineCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Multitrack Area */}
      {!timelineCollapsed && (
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Left Track Headers Column */}
          <div className="w-52 bg-[#10131C] border-r border-[#232838] flex flex-col shrink-0 overflow-y-auto">
            {/* Spacer matching time ruler height */}
            <div className="h-7 border-b border-[#232838] px-3 flex items-center justify-between text-[10px] font-mono text-slate-400 shrink-0">
              <span>TRACKS ({sortedTracks.length})</span>
              <span>M / L / V</span>
            </div>

            {sortedTracks.map((track) => (
              <div
                key={track.id}
                style={{ height: track.height }}
                className="border-b border-[#1E2333] px-2.5 flex items-center justify-between gap-1.5 bg-[#12151E] hover:bg-[#161A26] shrink-0"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  {trackIcon(track.type)}
                  <span className="text-xs font-medium text-slate-200 truncate" title={track.name}>
                    {track.name}
                  </span>
                </div>

                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => toggleTrackMute(track.id)}
                    aria-label={`${track.muted ? 'Unmute' : 'Mute'} ${track.name}`}
                    className={`p-1 rounded ${
                      track.muted ? 'text-rose-400 bg-rose-950/50' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {track.muted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleTrackLock(track.id)}
                    aria-label={`${track.locked ? 'Unlock' : 'Lock'} ${track.name}`}
                    className={`p-1 rounded ${
                      track.locked ? 'text-amber-400 bg-amber-950/50' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {track.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleTrackVisible(track.id)}
                    aria-label={`${track.visible ? 'Hide' : 'Show'} ${track.name}`}
                    className={`p-1 rounded ${
                      !track.visible ? 'text-slate-600' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {track.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  </button>
                  {sortedTracks.length > 1 && (
                    <button
                      type="button"
                      onClick={() => deleteTrack(track.id)}
                      aria-label={`Delete ${track.name}`}
                      className="p-1 rounded text-slate-500 hover:text-rose-400"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Right Scrollable Time Ruler + Track Lanes */}
          <div
            ref={scrollContainerRef}
            className="flex-1 overflow-auto relative bg-[#0B0D12]"
          >
            <div style={{ width: timelineWidthPx }} className="relative min-h-full">
              {/* Time Ruler */}
              <div
                onMouseDown={handleRulerMouseDown}
                className="h-7 bg-[#0E1118] border-b border-[#232838] relative cursor-pointer sticky top-0 z-10"
              >
                {Array.from({ length: Math.ceil(totalDuration) + 1 }).map((_, sec) => {
                  const leftPx = sec * timelineZoom;
                  return (
                    <div
                      key={sec}
                      style={{ left: leftPx }}
                      className="absolute top-0 bottom-0 flex flex-col justify-between pointer-events-none"
                    >
                      <span className="text-[10px] font-mono tabular-nums text-slate-400 pl-1 pt-0.5">
                        {formatShortDuration(sec)}
                      </span>
                      <div className="w-px h-2 bg-slate-600" />
                    </div>
                  );
                })}

                {/* Timeline Markers */}
                {project.markers.map((mk) => (
                  <div
                    key={mk.id}
                    style={{ left: mk.time * timelineZoom }}
                    title={`${mk.label} (${mk.time.toFixed(2)}s)`}
                    className="absolute top-0 bottom-0 flex flex-col justify-end items-start pointer-events-none"
                  >
                    <div className="px-1 py-0.2 rounded-t bg-indigo-600/90 text-[8px] font-semibold text-white whitespace-nowrap leading-tight">
                      {mk.label}
                    </div>
                  </div>
                ))}
              </div>

              {/* Track Lanes */}
              {sortedTracks.map((track) => {
                const trackClips = project.clips.filter((c) => c.trackId === track.id);
                return (
                  <div
                    key={track.id}
                    style={{ height: track.height }}
                    className={`border-b border-[#191D2B] relative ${
                      track.locked ? 'opacity-65 bg-[#0D0F17]' : 'bg-[#0B0D12]'
                    }`}
                  >
                    {trackClips.map((clip) => {
                      const left = clip.startTime * timelineZoom;
                      const width = Math.max(24, clip.duration * timelineZoom);
                      const isSelected = selectedClipIds.includes(clip.id);
                      const asset = project.assets.find((a) => a.id === clip.assetId);

                      const clipColorClasses =
                        clip.type === 'video'
                          ? 'bg-indigo-950/80 border-indigo-500/60 text-indigo-100'
                          : clip.type === 'audio'
                          ? 'bg-emerald-950/75 border-emerald-500/60 text-emerald-100'
                          : clip.type === 'text'
                          ? 'bg-amber-950/75 border-amber-500/60 text-amber-100'
                          : 'bg-sky-950/75 border-sky-500/60 text-sky-100';

                      return (
                        <div
                          key={clip.id}
                          data-testid={`timeline-clip-${clip.id}`}
                          style={{ left, width, top: 4, bottom: 4 }}
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            selectClip(clip.id, e.shiftKey);
                            if (track.locked) return;
                            recordSnapshot(`Move "${clip.name}"`);
                            setDragState({
                              mode: 'move',
                              clipId: clip.id,
                              startX: e.clientX,
                              initialStart: clip.startTime,
                              initialDuration: clip.duration,
                            });
                          }}
                          className={`absolute rounded-md border overflow-hidden cursor-grab active:cursor-grabbing flex flex-col justify-between px-2 py-1 transition-shadow ${clipColorClasses} ${
                            isSelected ? 'ring-2 ring-white shadow-lg z-10' : ''
                          }`}
                        >
                          {/* Left Trim Handle */}
                          <div
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              selectClip(clip.id);
                              if (track.locked) return;
                              recordSnapshot(`Trim start of "${clip.name}"`);
                              setDragState({
                                mode: 'trim-left',
                                clipId: clip.id,
                                startX: e.clientX,
                                initialStart: clip.startTime,
                                initialDuration: clip.duration,
                              });
                            }}
                            className="absolute left-0 top-0 bottom-0 w-2 bg-white/15 hover:bg-white/50 cursor-ew-resize z-10"
                            title="Drag to trim clip start"
                          />

                          {/* Right Trim Handle */}
                          <div
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              selectClip(clip.id);
                              if (track.locked) return;
                              recordSnapshot(`Trim end of "${clip.name}"`);
                              setDragState({
                                mode: 'trim-right',
                                clipId: clip.id,
                                startX: e.clientX,
                                initialStart: clip.startTime,
                                initialDuration: clip.duration,
                              });
                            }}
                            className="absolute right-0 top-0 bottom-0 w-2 bg-white/15 hover:bg-white/50 cursor-ew-resize z-10"
                            title="Drag to trim clip end"
                          />

                          {/* Clip Top Row: Label + Effect/Transition/Keyframe indicators */}
                          <div className="flex items-center justify-between gap-1 text-[11px] font-semibold truncate pointer-events-none">
                            <span className="truncate">{clip.name}</span>
                            <div className="flex items-center gap-1 shrink-0 font-mono text-[9px]">
                              {clip.effects.length > 0 && (
                                <span className="px-1 rounded bg-black/40 text-indigo-300">
                                  FX:{clip.effects.length}
                                </span>
                              )}
                              {(clip.transitionIn || clip.transitionOut) && (
                                <span className="px-1 rounded bg-black/40 text-pink-300">⇄</span>
                              )}
                            </div>
                          </div>

                          {/* Audio Waveform or Keyframe Diamonds */}
                          {asset && asset.waveform.length > 0 && (
                            <div className="h-5 flex items-end gap-0.5 opacity-60 pointer-events-none">
                              {asset.waveform.map((wVal, idx) => (
                                <div
                                  key={idx}
                                  className="flex-1 bg-current rounded-t"
                                  style={{ height: `${Math.max(15, wVal * 100)}%` }}
                                />
                              ))}
                            </div>
                          )}

                          {/* Keyframe diamonds along bottom edge */}
                          {clip.keyframes.length > 0 && (
                            <div className="relative h-3 pointer-events-none">
                              {clip.keyframes.map((kf) => (
                                <span
                                  key={kf.id}
                                  style={{
                                    left: `${Math.min(96, Math.max(2, (kf.timeOffset / clip.duration) * 100))}%`,
                                  }}
                                  className="absolute bottom-0 -translate-x-1/2 text-[9px] text-amber-300"
                                >
                                  ◆
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}

              {/* Playhead Line & Handle */}
              <div
                style={{ left: currentTime * timelineZoom }}
                className="absolute top-0 bottom-0 w-0.5 bg-rose-500 pointer-events-none z-20"
              >
                <div className="w-3 h-3 -ml-[5px] bg-rose-500 rotate-45 rounded-xs shadow" />
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
