import React, { useEffect, useState } from 'react';
import { TopToolbar } from './components/TopToolbar';
import { LeftSidebar } from './components/LeftSidebar';
import { PreviewCompositor } from './preview/PreviewCompositor';
import { RightInspector } from './components/RightInspector';
import { AIPanel } from './components/AIPanel';
import { TimelinePanel } from './components/TimelinePanel';
import { Modals } from './components/Modals';
import { useEditorStore } from './editor/store';
import { calculateProjectDuration } from './editor/timebase';
import { inspectAndImportMediaFile } from './media/sampleAssets';
import { saveProjectToIndexedDB } from './storage/projectStorage';

export default function App() {
  const {
    project,
    timelineZoom,
    togglePlay,
    undo,
    redo,
    splitSelectedOrAtPlayhead,
    deleteSelectedClips,
    stepFrames,
    setCurrentTime,
    setTimelineZoom,
    addMarkerAtPlayhead,
    setActiveModal,
    selectClip,
    addMediaAsset,
    addClipFromAsset,
  } = useEditorStore();

  const [isDraggingFileOver, setIsDraggingFileOver] = useState(false);

  // Global keyboard shortcuts handler (ignores active inputs/textareas/selects)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      const isMod = e.metaKey || e.ctrlKey;

      if (isMod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }

      if (isMod && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveProjectToIndexedDB(useEditorStore.getState().project);
        return;
      }

      switch (e.key) {
        case ' ':
          e.preventDefault();
          togglePlay();
          break;
        case 's':
        case 'S':
          e.preventDefault();
          splitSelectedOrAtPlayhead();
          break;
        case 'Delete':
        case 'Backspace':
          e.preventDefault();
          deleteSelectedClips();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          stepFrames(-1);
          break;
        case 'ArrowRight':
          e.preventDefault();
          stepFrames(1);
          break;
        case 'Home':
          e.preventDefault();
          setCurrentTime(0);
          break;
        case 'End':
          e.preventDefault();
          setCurrentTime(calculateProjectDuration(project.clips, 10));
          break;
        case '=':
        case '+':
          e.preventDefault();
          setTimelineZoom(timelineZoom + 16);
          break;
        case '-':
          e.preventDefault();
          setTimelineZoom(timelineZoom - 16);
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          addMarkerAtPlayhead();
          break;
        case 'Escape':
          setActiveModal('none');
          selectClip(null);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    project.clips,
    timelineZoom,
    togglePlay,
    undo,
    redo,
    splitSelectedOrAtPlayhead,
    deleteSelectedClips,
    stepFrames,
    setCurrentTime,
    setTimelineZoom,
    addMarkerAtPlayhead,
    setActiveModal,
    selectClip,
  ]);

  const handleDropFiles = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingFileOver(false);
    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;
    for (const file of Array.from(files)) {
      const asset = await inspectAndImportMediaFile(file);
      addMediaAsset(asset);
      addClipFromAsset(asset.id);
    }
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDraggingFileOver(true);
      }}
      onDragLeave={() => setIsDraggingFileOver(false)}
      onDrop={handleDropFiles}
      className="h-screen w-screen overflow-hidden flex flex-col bg-[#0B0D12] text-[#F1F5F9]"
    >
      {/* 1. Top Navigation & Project Toolbar */}
      <TopToolbar />

      {/* Middle Workspace: Left Sidebar + Central Preview Monitor + Right Contextual Inspector + Optional AI Panel */}
      <main className="flex-1 flex min-h-0 min-w-0 overflow-hidden">
        <LeftSidebar />
        <PreviewCompositor />
        <RightInspector />
        <AIPanel />
      </main>

      {/* 5. Bottom Multitrack Timeline */}
      <TimelinePanel />

      {/* Modals (Export, Projects, Shortcuts, Settings) */}
      <Modals />

      {/* Drag & Drop Media Overlay */}
      {isDraggingFileOver && (
        <div className="fixed inset-0 z-50 bg-indigo-950/80 backdrop-blur-xs border-2 border-dashed border-indigo-400 flex items-center justify-center pointer-events-none">
          <div className="text-center space-y-1">
            <p className="text-lg font-bold text-white">Drop Media Files to Import</p>
            <p className="text-xs text-indigo-200">
              Supports MP4, WebM, MOV, MP3, WAV, PNG, JPEG, SVG, SRT, VTT
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
