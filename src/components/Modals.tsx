import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  Download,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FolderPlus,
  Save,
  Upload,
  FileJson,
  Trash2,
  ShieldCheck,
  Cpu,
} from 'lucide-react';
import { createInitialProject, useEditorStore } from '../editor/store';
import {
  ExportProgressUpdate,
  detectBrowserCodecSupport,
  estimateOutputSizeMB,
  renderProjectToVideoBlob,
  resolveExportDimensions,
  validateProjectForExport,
} from '../export/exporter';
import { calculateProjectDuration } from '../editor/timebase';
import { sharedMediaCache } from '../preview/PreviewCompositor';
import {
  deleteProjectFromIndexedDB,
  loadAllProjectsFromIndexedDB,
  saveProjectToIndexedDB,
} from '../storage/projectStorage';
import { ExportSettings, ProjectData } from '../types/editor';

export const Modals: React.FC = () => {
  const {
    activeModal,
    project,
    setActiveModal,
    updateExportSettings,
    loadProjectData,
    resetNewProject,
    setProjectFps,
    setBackgroundFill,
  } = useEditorStore();

  const [exportProgress, setExportProgress] = useState<ExportProgressUpdate | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [savedProjects, setSavedProjects] = useState<ProjectData[]>([]);
  const [shortcutFilter, setShortcutFilter] = useState('');
  const [aiServerStatus, setAiServerStatus] = useState<{
    online: boolean;
    provider: string;
    model: string;
  } | null>(null);
  const projectJsonInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (activeModal === 'projects') {
      loadAllProjectsFromIndexedDB().then(setSavedProjects);
    } else if (activeModal === 'settings') {
      fetch('/api/ai/status')
        .then((r) => r.json())
        .then((data) => setAiServerStatus(data))
        .catch(() =>
          setAiServerStatus({
            online: false,
            provider: 'Local Structured Planner (Static Mode)',
            model: 'ClipForge Deterministic Engine',
          })
        );
    } else if (activeModal !== 'export') {
      setExportProgress(null);
    }
  }, [activeModal]);

  if (activeModal === 'none') return null;

  const codecReport = detectBrowserCodecSupport();
  const totalDuration = calculateProjectDuration(project.clips, 4);
  const exportValidation = validateProjectForExport(project);
  const resolvedDims = resolveExportDimensions(
    project.exportSettings.resolution,
    project.aspectRatio,
    project.exportSettings.width,
    project.exportSettings.height
  );
  const estimatedMB = estimateOutputSizeMB(totalDuration, project.exportSettings);

  const handleStartExport = async () => {
    const ctrl = new AbortController();
    abortControllerRef.current = ctrl;
    setExportProgress({
      phase: 'validating',
      progressPct: 2,
      currentFrame: 0,
      totalFrames: Math.ceil(totalDuration * project.exportSettings.fps),
      etaSeconds: 2.5,
    });

    try {
      await renderProjectToVideoBlob(
        project,
        sharedMediaCache,
        (update) => setExportProgress(update),
        ctrl.signal
      );
    } catch (err) {
      const msg = (err as Error).message || 'Export failed';
      setExportProgress({
        phase: msg.includes('cancelled') ? 'cancelled' : 'error',
        progressPct: 0,
        currentFrame: 0,
        totalFrames: 0,
        etaSeconds: 0,
        errorMessage: msg,
      });
    }
  };

  const handleCancelExport = () => {
    abortControllerRef.current?.abort();
  };

  const handleExportProjectJson = () => {
    const json = JSON.stringify(project, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.replace(/\s+/g, '_')}.clipforge.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  const handleImportProjectJson = async (files: FileList | null) => {
    if (!files || !files[0]) return;
    try {
      const text = await files[0].text();
      const parsed = JSON.parse(text) as ProjectData;
      if (parsed && Array.isArray(parsed.tracks) && Array.isArray(parsed.clips)) {
        loadProjectData(parsed);
        await saveProjectToIndexedDB(parsed);
        setActiveModal('none');
      }
    } catch {
      // ignore invalid json
    }
  };

  const SHORTCUTS = [
    { key: 'Space', desc: 'Play / Pause timeline composition' },
    { key: 'S', desc: 'Split selected clip at playhead' },
    { key: 'Delete / Backspace', desc: 'Delete selected clips (respects Ripple mode)' },
    { key: 'Ctrl / Cmd + Z', desc: 'Undo last editing operation' },
    { key: 'Ctrl / Cmd + Shift + Z', desc: 'Redo editing operation' },
    { key: 'Ctrl / Cmd + S', desc: 'Save project to IndexedDB' },
    { key: 'Left / Right Arrow', desc: 'Step 1 frame backward or forward' },
    { key: 'Home / End', desc: 'Jump playhead to start or end of timeline' },
    { key: '+ / -', desc: 'Zoom timeline in or out horizontally' },
    { key: 'M', desc: 'Add timeline marker at playhead' },
    { key: 'Escape', desc: 'Close modal or deselect active clip' },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 select-none"
    >
      {/* 1. EXPORT MODAL */}
      {activeModal === 'export' && (
        <div className="w-full max-w-xl bg-[#12151E] border border-[#282E42] rounded-xl shadow-2xl overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-[#232838] flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white">Export & Render Video</h2>
              <p className="text-xs text-slate-400">
                {project.name} · {resolvedDims.width}×{resolvedDims.height} ({project.aspectRatio})
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveModal('none')}
              aria-label="Close Export Modal"
              className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-[#1A1E2B]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 space-y-4 text-xs overflow-y-auto max-h-[75vh]">
            {/* Active Render Progress at top of modal for immediate visibility */}
            {exportProgress && (
              <div
                data-testid="export-status-box"
                className="p-3.5 rounded-lg bg-[#0B0D12] border border-indigo-500/50 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-100 capitalize">
                    {exportProgress.phase === 'completed'
                      ? 'Render Complete!'
                      : exportProgress.phase === 'error'
                      ? 'Render Error'
                      : `Rendering Video (${exportProgress.progressPct}%)`}
                  </span>
                  <span className="font-mono tabular-nums text-[11px] text-slate-400">
                    Frame {exportProgress.currentFrame} / {exportProgress.totalFrames}
                  </span>
                </div>

                <div className="w-full h-2 bg-[#1A1E2B] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 transition-all duration-150"
                    style={{ width: `${exportProgress.progressPct}%` }}
                  />
                </div>

                {exportProgress.phase === 'completed' && exportProgress.downloadUrl && (
                  <div className="pt-1 flex items-center justify-between gap-3">
                    <span className="text-emerald-300 flex items-center gap-1 text-xs font-medium">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        Ready ({Math.max(1, Math.round((exportProgress.fileSizeBytes || 2048) / 1024))} KB)
                      </span>
                    </span>
                    <a
                      href={exportProgress.downloadUrl}
                      download={exportProgress.filename || 'ClipForge_Export.webm'}
                      className="px-3.5 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download {exportProgress.filename}</span>
                    </a>
                  </div>
                )}

                {exportProgress.errorMessage && (
                  <p className="text-rose-300 text-xs">{exportProgress.errorMessage}</p>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="export-format" className="text-slate-300 font-medium block mb-1">
                  Container Format
                </label>
                <select
                  id="export-format"
                  value={project.exportSettings.format}
                  onChange={(e) =>
                    updateExportSettings({ format: e.target.value as 'webm' | 'mp4' })
                  }
                  className="w-full bg-[#0B0D12] border border-[#232838] rounded-md px-3 py-2 text-slate-100"
                >
                  <option value="webm">
                    WebM ({codecReport.webmVp9 ? 'VP9 + Opus Supported' : 'VP8 Supported'})
                  </option>
                  <option value="mp4">
                    MP4 ({codecReport.mp4H264 ? 'H.264 Supported' : 'Browser Fallback Container'})
                  </option>
                </select>
              </div>

              <div>
                <label htmlFor="export-resolution" className="text-slate-300 font-medium block mb-1">
                  Resolution
                </label>
                <select
                  id="export-resolution"
                  value={project.exportSettings.resolution}
                  onChange={(e) =>
                    updateExportSettings({
                      resolution: e.target.value as ExportSettings['resolution'],
                    })
                  }
                  className="w-full bg-[#0B0D12] border border-[#232838] rounded-md px-3 py-2 text-slate-100"
                >
                  <option value="360p">360p Draft</option>
                  <option value="480p">480p SD</option>
                  <option value="720p">720p HD</option>
                  <option value="1080p">1080p Full HD</option>
                  <option value="1440p">1440p QHD</option>
                  <option value="2160p">2160p 4K</option>
                </select>
              </div>

              <div>
                <label htmlFor="export-fps" className="text-slate-300 font-medium block mb-1">
                  Frame Rate (FPS)
                </label>
                <select
                  id="export-fps"
                  value={project.exportSettings.fps}
                  onChange={(e) =>
                    updateExportSettings({
                      fps: Number(e.target.value) as ExportSettings['fps'],
                    })
                  }
                  className="w-full bg-[#0B0D12] border border-[#232838] rounded-md px-3 py-2 text-slate-100 font-mono"
                >
                  <option value={23.976}>23.976 FPS</option>
                  <option value={24}>24 FPS (Cinema)</option>
                  <option value={25}>25 FPS (PAL)</option>
                  <option value={29.97}>29.97 FPS (NTSC)</option>
                  <option value={30}>30 FPS</option>
                  <option value={50}>50 FPS</option>
                  <option value={59.94}>59.94 FPS</option>
                  <option value={60}>60 FPS (High Action)</option>
                </select>
              </div>

              <div>
                <label htmlFor="export-quality" className="text-slate-300 font-medium block mb-1">
                  Quality & Bitrate Preset
                </label>
                <select
                  id="export-quality"
                  value={project.exportSettings.quality}
                  onChange={(e) => {
                    const q = e.target.value as ExportSettings['quality'];
                    const bitrateMap = { low: 4, medium: 8, high: 14, max: 24 };
                    updateExportSettings({
                      quality: q,
                      videoBitrateMbps: bitrateMap[q],
                    });
                  }}
                  className="w-full bg-[#0B0D12] border border-[#232838] rounded-md px-3 py-2 text-slate-100"
                >
                  <option value="low">Low (4 Mbps)</option>
                  <option value="medium">Medium (8 Mbps)</option>
                  <option value="high">High (14 Mbps Recommended)</option>
                  <option value="max">Maximum (24 Mbps Master)</option>
                </select>
              </div>
            </div>

            {/* Summary Specs Box */}
            <div className="p-3 rounded-lg bg-[#0B0D12] border border-[#232838] grid grid-cols-3 gap-2 font-mono tabular-nums">
              <div>
                <span className="text-[10px] text-slate-400 block">Output Dimensions</span>
                <span className="text-xs font-semibold text-slate-100">
                  {resolvedDims.width}×{resolvedDims.height}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Duration / Frames</span>
                <span className="text-xs font-semibold text-slate-100">
                  {totalDuration.toFixed(1)}s ({Math.ceil(totalDuration * project.exportSettings.fps)}f)
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Est. File Size</span>
                <span className="text-xs font-semibold text-indigo-300">~{estimatedMB} MB</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 bg-[#0B0D12] px-3 py-2 rounded border border-[#232838]">
              <span className="flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                <span>{codecReport.hardwareAcceleration}</span>
              </span>
              <label className="flex items-center gap-1.5 text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={project.exportSettings.burnCaptions}
                  onChange={(e) => updateExportSettings({ burnCaptions: e.target.checked })}
                  className="rounded border-slate-600 text-indigo-600"
                />
                <span>Burn-in Subtitles</span>
              </label>
            </div>

            {/* Validation Warnings/Errors */}
            {exportValidation.warnings.map((w, i) => (
              <div
                key={i}
                className="p-2.5 rounded bg-amber-950/40 border border-amber-700/50 text-amber-200 flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{w}</span>
              </div>
            ))}
          </div>

          <div className="px-5 py-3.5 bg-[#0E1118] border-t border-[#232838] flex items-center justify-end gap-2">
            {exportProgress &&
            (exportProgress.phase === 'rendering' || exportProgress.phase === 'encoding') ? (
              <button
                type="button"
                onClick={handleCancelExport}
                className="px-4 py-2 rounded-md bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
              >
                Cancel Render
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setActiveModal('none')}
                  className="px-3.5 py-2 rounded-md bg-[#1A1E2B] hover:bg-[#232838] text-slate-300 text-xs font-medium"
                >
                  Close
                </button>
                <button
                  type="button"
                  disabled={!exportValidation.valid}
                  onClick={handleStartExport}
                  className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  {exportProgress?.phase === 'validating' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  <span>Start Render</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* 2. PROJECTS MANAGER MODAL */}
      {activeModal === 'projects' && (
        <div className="w-full max-w-lg bg-[#12151E] border border-[#282E42] rounded-xl shadow-2xl overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-[#232838] flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">Project Management & Persistence</h2>
            <button
              type="button"
              onClick={() => setActiveModal('none')}
              aria-label="Close Projects Modal"
              className="p-1.5 rounded text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 space-y-4 text-xs overflow-y-auto max-h-[70vh]">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  resetNewProject('New Empty Project');
                  setActiveModal('none');
                }}
                className="p-3 rounded-lg bg-[#0B0D12] border border-[#232838] hover:border-indigo-500/60 flex items-center gap-2 font-semibold text-slate-200"
              >
                <FolderPlus className="w-4 h-4 text-indigo-400" />
                <span>New Blank Project</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  await saveProjectToIndexedDB(project);
                  const list = await loadAllProjectsFromIndexedDB();
                  setSavedProjects(list);
                }}
                className="p-3 rounded-lg bg-[#0B0D12] border border-[#232838] hover:border-indigo-500/60 flex items-center gap-2 font-semibold text-slate-200"
              >
                <Save className="w-4 h-4 text-emerald-400" />
                <span>Save Snapshot Now</span>
              </button>

              <button
                type="button"
                onClick={handleExportProjectJson}
                className="p-3 rounded-lg bg-[#0B0D12] border border-[#232838] hover:border-indigo-500/60 flex items-center gap-2 font-semibold text-slate-200"
              >
                <FileJson className="w-4 h-4 text-sky-400" />
                <span>Export .clipforge.json</span>
              </button>

              <input
                ref={projectJsonInputRef}
                type="file"
                accept=".json"
                onChange={(e) => handleImportProjectJson(e.target.files)}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => projectJsonInputRef.current?.click()}
                className="p-3 rounded-lg bg-[#0B0D12] border border-[#232838] hover:border-indigo-500/60 flex items-center gap-2 font-semibold text-slate-200"
              >
                <Upload className="w-4 h-4 text-amber-400" />
                <span>Import .clipforge.json</span>
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-300">
                  Saved Projects in Browser IndexedDB ({savedProjects.length})
                </span>
                <button
                  type="button"
                  onClick={() => {
                    loadProjectData(createInitialProject());
                    setActiveModal('none');
                  }}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300"
                >
                  Restore Demo Project
                </button>
              </div>

              {savedProjects.length === 0 ? (
                <p className="p-3 rounded bg-[#0B0D12] border border-[#232838] text-slate-400">
                  Click &ldquo;Save Snapshot Now&rdquo; or edit any clip on the timeline to trigger IndexedDB autosave.
                </p>
              ) : (
                savedProjects.map((sp) => (
                  <div
                    key={sp.id}
                    className="p-3 rounded-lg bg-[#0B0D12] border border-[#232838] flex items-center justify-between gap-2"
                  >
                    <div>
                      <p className="font-semibold text-slate-100">{sp.name}</p>
                      <p className="text-[11px] text-slate-400 font-mono">
                        {sp.aspectRatio} · {sp.clips.length} clips ·{' '}
                        {new Date(sp.updatedAt).toLocaleTimeString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          loadProjectData(sp);
                          setActiveModal('none');
                        }}
                        className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium"
                      >
                        Open
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await deleteProjectFromIndexedDB(sp.id);
                          setSavedProjects(await loadAllProjectsFromIndexedDB());
                        }}
                        aria-label={`Delete project ${sp.name}`}
                        className="p-1.5 rounded text-slate-400 hover:text-rose-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. KEYBOARD SHORTCUTS MODAL */}
      {activeModal === 'shortcuts' && (
        <div className="w-full max-w-md bg-[#12151E] border border-[#282E42] rounded-xl shadow-2xl overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-[#232838] flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">Keyboard Shortcuts Reference</h2>
            <button
              type="button"
              onClick={() => setActiveModal('none')}
              aria-label="Close Shortcuts Modal"
              className="p-1.5 rounded text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 space-y-3 text-xs">
            <input
              type="search"
              placeholder="Filter shortcuts..."
              value={shortcutFilter}
              onChange={(e) => setShortcutFilter(e.target.value)}
              className="w-full bg-[#0B0D12] border border-[#232838] rounded px-3 py-1.5 text-slate-200 focus:outline-none"
            />
            <div className="space-y-1.5 max-h-72 overflow-y-auto">
              {SHORTCUTS.filter(
                (s) =>
                  !shortcutFilter ||
                  s.key.toLowerCase().includes(shortcutFilter.toLowerCase()) ||
                  s.desc.toLowerCase().includes(shortcutFilter.toLowerCase())
              ).map((s) => (
                <div
                  key={s.key}
                  className="p-2 rounded bg-[#0B0D12] border border-[#232838] flex items-center justify-between gap-3"
                >
                  <span className="text-slate-300">{s.desc}</span>
                  <kbd className="px-2 py-0.5 rounded bg-[#1A1E2B] border border-[#2C3347] font-mono text-[11px] text-indigo-300 whitespace-nowrap">
                    {s.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4. SETTINGS & AI ARCHITECTURE MODAL */}
      {activeModal === 'settings' && (
        <div className="w-full max-w-lg bg-[#12151E] border border-[#282E42] rounded-xl shadow-2xl overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-[#232838] flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">Project Settings & AI Architecture</h2>
            <button
              type="button"
              onClick={() => setActiveModal('none')}
              aria-label="Close Settings Modal"
              className="p-1.5 rounded text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="settings-fps" className="text-slate-300 font-medium block mb-1">
                  Timeline Frame Timebase
                </label>
                <select
                  id="settings-fps"
                  value={project.fps}
                  onChange={(e) => setProjectFps(Number(e.target.value))}
                  className="w-full bg-[#0B0D12] border border-[#232838] rounded px-3 py-2 text-slate-100 font-mono"
                >
                  <option value={24}>24 FPS</option>
                  <option value={25}>25 FPS</option>
                  <option value={30}>30 FPS</option>
                  <option value={60}>60 FPS</option>
                </select>
              </div>

              <div>
                <label htmlFor="settings-bg" className="text-slate-300 font-medium block mb-1">
                  Canvas Background Fill
                </label>
                <select
                  id="settings-bg"
                  value={project.backgroundFill}
                  onChange={(e) =>
                    setBackgroundFill(e.target.value as ProjectData['backgroundFill'])
                  }
                  className="w-full bg-[#0B0D12] border border-[#232838] rounded px-3 py-2 text-slate-100"
                >
                  <option value="blur">Blurred Media Fill (9:16 Reels)</option>
                  <option value="black">Cinema Black</option>
                  <option value="charcoal">Studio Charcoal</option>
                  <option value="indigo">Deep Indigo Gradient</option>
                </select>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-[#0B0D12] border border-[#232838] space-y-2">
              <div className="flex items-center gap-2 text-indigo-300 font-semibold">
                <ShieldCheck className="w-4 h-4" />
                <span>Server-Side AI Provider & Privacy Status</span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                AI requests are routed through the server-side API adapter (<code className="text-indigo-300">/api/ai/plan</code>). API keys are managed strictly in server-side environment variables and are never exposed in the client bundle or GitHub Pages static build.
              </p>
              {aiServerStatus && (
                <div className="pt-1 font-mono text-[11px] text-slate-400 space-y-0.5">
                  <div>Backend Bridge: {aiServerStatus.online ? 'Connected' : 'Local Fallback Active'}</div>
                  <div>Active Planner: {aiServerStatus.model}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
