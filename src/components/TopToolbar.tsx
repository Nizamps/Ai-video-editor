import React, { useState } from 'react';
import {
  Clapperboard,
  Undo2,
  Redo2,
  FolderOpen,
  Sparkles,
  Keyboard,
  Settings,
  Download,
  Check,
  Monitor,
} from 'lucide-react';
import { useEditorStore } from '../editor/store';
import { ASPECT_RATIO_PRESETS } from '../editor/timebase';
import { AspectRatioId } from '../types/editor';

export const TopToolbar: React.FC = () => {
  const {
    project,
    undoStack,
    redoStack,
    saveStatus,
    aiDrawerOpen,
    previewQuality,
    undo,
    redo,
    setProjectName,
    setAspectRatio,
    setPreviewQuality,
    setAiDrawerOpen,
    setActiveModal,
  } = useEditorStore();

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(project.name);

  const commitRename = () => {
    setEditingName(false);
    if (nameDraft.trim() && nameDraft.trim() !== project.name) {
      setProjectName(nameDraft.trim());
    } else {
      setNameDraft(project.name);
    }
  };

  return (
    <header className="h-14 bg-[#12151E] border-b border-[#232838] px-4 flex items-center justify-between gap-4 select-none shrink-0 z-20">
      {/* Left Zone: Brand + Project Name + Save Status */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-2 text-slate-100 font-bold tracking-tight whitespace-nowrap shrink-0">
          <div className="w-7 h-7 rounded-md bg-indigo-600 flex items-center justify-center text-white shadow-sm">
            <Clapperboard className="w-4 h-4" />
          </div>
          <span className="text-sm font-bold tracking-tight">ClipForge AI</span>
        </div>

        <span className="text-slate-600" aria-hidden="true">/</span>

        <button
          type="button"
          onClick={() => setActiveModal('projects')}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-300 hover:text-white hover:bg-[#1A1E2B] transition-colors whitespace-nowrap shrink-0"
          title="Open Project Manager"
        >
          <FolderOpen className="w-3.5 h-3.5 text-indigo-400" />
          <span>Projects</span>
        </button>

        {editingName ? (
          <input
            type="text"
            aria-label="Project Name"
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename();
              if (e.key === 'Escape') {
                setNameDraft(project.name);
                setEditingName(false);
              }
            }}
            autoFocus
            className="bg-[#0B0D12] border border-indigo-500 rounded px-2 py-1 text-xs font-semibold text-white focus:outline-none w-48"
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setNameDraft(project.name);
              setEditingName(true);
            }}
            className="text-xs font-semibold text-slate-200 hover:text-white px-2 py-1 rounded hover:bg-[#1A1E2B] truncate max-w-[200px]"
            title="Click to rename project"
          >
            {project.name}
          </button>
        )}

        <div className="hidden sm:flex items-center gap-1 text-[11px] text-slate-400 whitespace-nowrap shrink-0">
          <Check className="w-3 h-3 text-emerald-400" />
          <span>{saveStatus === 'saving' ? 'Autosaving...' : 'Saved locally'}</span>
        </div>
      </div>

      {/* Center Zone: History, Aspect Ratio, Preview Quality */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center bg-[#0B0D12] border border-[#232838] rounded-md p-0.5">
          <button
            type="button"
            onClick={undo}
            disabled={undoStack.length === 0}
            aria-label="Undo edit"
            title={
              undoStack.length > 0
                ? `Undo: ${undoStack[undoStack.length - 1].label} (Ctrl+Z)`
                : 'Nothing to undo (Ctrl+Z)'
            }
            className="p-1.5 rounded text-slate-300 hover:text-white hover:bg-[#1A1E2B] disabled:opacity-35 disabled:pointer-events-none transition-colors"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={redoStack.length === 0}
            aria-label="Redo edit"
            title={
              redoStack.length > 0
                ? `Redo: ${redoStack[redoStack.length - 1].label} (Ctrl+Shift+Z)`
                : 'Nothing to redo (Ctrl+Shift+Z)'
            }
            className="p-1.5 rounded text-slate-300 hover:text-white hover:bg-[#1A1E2B] disabled:opacity-35 disabled:pointer-events-none transition-colors"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Aspect Ratio Selector */}
        <div className="flex items-center gap-1.5 bg-[#0B0D12] border border-[#232838] rounded-md px-2.5 py-1">
          <Monitor className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <label htmlFor="aspect-ratio-select" className="sr-only">
            Aspect Ratio
          </label>
          <select
            id="aspect-ratio-select"
            aria-label="Aspect Ratio"
            value={project.aspectRatio}
            onChange={(e) => setAspectRatio(e.target.value as AspectRatioId)}
            className="bg-transparent text-xs font-medium text-slate-200 focus:outline-none cursor-pointer"
          >
            {Object.values(ASPECT_RATIO_PRESETS).map((preset) => (
              <option key={preset.id} value={preset.id} className="bg-[#12151E] text-slate-100">
                {preset.label} ({preset.width}×{preset.height})
              </option>
            ))}
          </select>
        </div>

        {/* Preview Quality Selector */}
        <div className="hidden md:flex items-center gap-1.5 bg-[#0B0D12] border border-[#232838] rounded-md px-2.5 py-1">
          <span className="text-[11px] text-slate-400">Preview:</span>
          <label htmlFor="preview-quality-select" className="sr-only">
            Preview Quality
          </label>
          <select
            id="preview-quality-select"
            aria-label="Preview Quality"
            value={previewQuality}
            onChange={(e) => setPreviewQuality(e.target.value as 'full' | 'half' | 'quarter')}
            className="bg-transparent text-xs font-medium text-slate-200 focus:outline-none cursor-pointer"
          >
            <option value="full" className="bg-[#12151E]">Full (100%)</option>
            <option value="half" className="bg-[#12151E]">Half (1/2 Fast)</option>
            <option value="quarter" className="bg-[#12151E]">Draft (1/4 Proxy)</option>
          </select>
        </div>
      </div>

      {/* Right Zone: AI Copilot, Shortcuts, Settings, Export */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => setAiDrawerOpen(!aiDrawerOpen)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 border ${
            aiDrawerOpen
              ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200'
              : 'bg-[#1A1E2B] border-[#2C3347] text-slate-200 hover:bg-[#232838]'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>AI Edit Agent</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveModal('shortcuts')}
          aria-label="Keyboard Shortcuts"
          title="Keyboard Shortcuts"
          className="p-2 rounded-md text-slate-300 hover:text-white hover:bg-[#1A1E2B] transition-colors"
        >
          <Keyboard className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => setActiveModal('settings')}
          aria-label="Project & AI Settings"
          title="Project & AI Settings"
          className="p-2 rounded-md text-slate-300 hover:text-white hover:bg-[#1A1E2B] transition-colors"
        >
          <Settings className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => setActiveModal('export')}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-colors whitespace-nowrap shrink-0"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export</span>
        </button>
      </div>
    </header>
  );
};
