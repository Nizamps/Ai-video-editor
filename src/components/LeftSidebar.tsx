import React, { useRef, useState } from 'react';
import {
  Film,
  Music,
  Type,
  Layers,
  Wand2,
  Shuffle,
  Palette,
  Diamond as KeyframeIcon,
  LayoutTemplate,
  Sparkles,
  Upload,
  Plus,
  Search,
  FileText,
  Download,
  Activity,
} from 'lucide-react';
import { LeftSidebarTab, useEditorStore } from '../editor/store';
import { inspectAndImportMediaFile } from '../media/sampleAssets';
import { EFFECTS_REGISTRY, COLOR_GRADE_PRESETS } from '../effects/registry';
import { TRANSITIONS_REGISTRY } from '../transitions/registry';
import { ANIMATION_PRESETS } from '../animation/keyframes';
import { CaptionStyleId } from '../types/editor';
import { exportTimelineToSRT, exportTimelineToVTT, parseSubtitlesFile } from '../storage/projectStorage';

const NAV_ITEMS: { id: LeftSidebarTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'media', label: 'Media', icon: Film },
  { id: 'audio', label: 'Audio', icon: Music },
  { id: 'text', label: 'Text', icon: Type },
  { id: 'stickers', label: 'Overlays', icon: Layers },
  { id: 'effects', label: 'Effects', icon: Wand2 },
  { id: 'transitions', label: 'Transitions', icon: Shuffle },
  { id: 'filters', label: 'Color', icon: Palette },
  { id: 'animations', label: 'Animate', icon: KeyframeIcon },
  { id: 'templates', label: 'Templates', icon: LayoutTemplate },
  { id: 'ai', label: 'AI Tools', icon: Sparkles },
];

export const LeftSidebar: React.FC = () => {
  const {
    project,
    leftTab,
    selectedClipIds,
    setLeftTab,
    addMediaAsset,
    addClipFromAsset,
    addTextClip,
    addStickerClip,
    addEffectToClip,
    setClipTransition,
    applyColorGradePreset,
    applyAnimationPresetToClip,
    proposeAIEditPlan,
    setAiDrawerOpen,
  } = useEditorStore();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const srtInputRef = useRef<HTMLInputElement | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [effectCategory, setEffectCategory] = useState<'all' | 'basic' | 'gaming' | 'cinematic'>('all');
  const [transitionCategory, setTransitionCategory] = useState<'all' | 'basic' | 'motion' | 'stylized'>('all');
  const [customTextDraft, setCustomTextDraft] = useState('NEW ACTION CAPTION');
  const [importingMedia, setImportingMedia] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const activeClipId =
    selectedClipIds[0] ||
    project.clips.find((c) => c.type === 'video')?.id ||
    project.clips[0]?.id ||
    null;

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setImportingMedia(true);
    setImportError(null);
    try {
      for (const file of Array.from(files)) {
        if (file.size > 500 * 1024 * 1024) {
          setImportError(`File "${file.name}" exceeds 500MB browser memory safeguard.`);
          continue;
        }
        const asset = await inspectAndImportMediaFile(file);
        addMediaAsset(asset);
        addClipFromAsset(asset.id);
      }
    } catch (err) {
      setImportError((err as Error).message || 'Could not decode media file.');
    } finally {
      setImportingMedia(false);
    }
  };

  const handleSrtUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const content = await file.text();
    const parsed = parseSubtitlesFile(content);
    for (const seg of parsed) {
      addTextClip(seg.text, 'word-highlight', seg.startTime, seg.duration);
    }
  };

  const downloadTextFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  const q = searchQuery.trim().toLowerCase();

  return (
    <aside className="flex h-full bg-[#12151E] border-r border-[#232838] select-none shrink-0 w-[320px]">
      {/* Narrow Icon Tool Rail */}
      <nav aria-label="Editor Tools" className="w-16 bg-[#0B0D12] border-r border-[#232838] flex flex-col items-center py-1.5 gap-0.5 overflow-y-auto shrink-0">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = leftTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setLeftTab(item.id)}
              className={`w-13 py-1.5 rounded-md flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                active
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#161A26]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="whitespace-nowrap">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Asset Browser Drawer */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <div className="p-3 border-b border-[#232838] space-y-2.5">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-100 tracking-tight capitalize">
              {NAV_ITEMS.find((n) => n.id === leftTab)?.label} Library
            </h2>
            <span className="text-[11px] text-slate-400 font-mono tabular-nums">
              {project.aspectRatio}
            </span>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              aria-label="Search library"
              placeholder={`Search ${leftTab}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0B0D12] border border-[#232838] focus:border-indigo-500 rounded-md pl-8 pr-2.5 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {/* 1. MEDIA TAB */}
          {leftTab === 'media' && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="video/*,audio/*,image/*"
                onChange={(e) => handleFileUpload(e.target.files)}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={importingMedia}
                className="w-full py-2.5 px-3 rounded-lg border border-dashed border-indigo-500/50 bg-indigo-500/10 hover:bg-indigo-500/15 text-indigo-200 flex items-center justify-center gap-2 text-xs font-semibold transition-colors"
              >
                <Upload className="w-4 h-4 text-indigo-400" />
                <span>{importingMedia ? 'Inspecting Media...' : 'Import Video, Audio or Image'}</span>
              </button>

              {importError && (
                <div className="p-2 rounded bg-rose-950/60 border border-rose-700 text-[11px] text-rose-200">
                  {importError}
                </div>
              )}

              <div className="space-y-2">
                {project.assets
                  .filter((a) => !q || a.name.toLowerCase().includes(q))
                  .map((asset) => (
                    <div
                      key={asset.id}
                      className="group bg-[#0B0D12] border border-[#232838] hover:border-indigo-500/60 rounded-lg p-2 flex items-center gap-2.5 transition-colors"
                    >
                      <div className="w-16 h-10 rounded bg-[#161A26] overflow-hidden shrink-0 flex items-center justify-center relative">
                        {asset.thumbnails[0] ? (
                          <img
                            src={asset.thumbnails[0]}
                            alt={asset.name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Music className="w-4 h-4 text-indigo-400" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-200 truncate" title={asset.name}>
                          {asset.name}
                        </p>
                        <p className="text-[11px] text-slate-400 font-mono tabular-nums">
                          {asset.duration.toFixed(1)}s · {asset.width ? `${asset.width}×${asset.height}` : asset.codec}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => addClipFromAsset(asset.id)}
                        aria-label={`Add ${asset.name} to timeline`}
                        title="Add to Timeline"
                        className="p-1.5 rounded-md bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white transition-colors shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
              </div>
            </>
          )}

          {/* 2. AUDIO TAB */}
          {leftTab === 'audio' && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => proposeAIEditPlan('Create a gaming montage with beat-synchronized cuts.')}
                className="w-full py-2 px-3 rounded-lg bg-[#1A1E2B] hover:bg-[#232838] border border-[#2C3347] text-xs font-semibold text-slate-200 flex items-center justify-center gap-2 transition-colors"
              >
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                <span>Detect Audio Beats & Sync Cuts</span>
              </button>

              {project.assets
                .filter((a) => (a.type === 'audio' || a.type === 'procedural-audio') && (!q || a.name.toLowerCase().includes(q)))
                .map((asset) => (
                  <div
                    key={asset.id}
                    className="bg-[#0B0D12] border border-[#232838] rounded-lg p-2.5 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-200 truncate">{asset.name}</p>
                        <p className="text-[11px] text-slate-400 font-mono tabular-nums">
                          {asset.duration.toFixed(1)}s · {asset.codec}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => addClipFromAsset(asset.id)}
                        aria-label={`Add audio ${asset.name}`}
                        className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shrink-0"
                      >
                        + Track
                      </button>
                    </div>
                    {/* Mini Waveform preview */}
                    <div className="h-6 flex items-end gap-0.5 pt-1">
                      {asset.waveform.slice(0, 28).map((val, i) => (
                        <div
                          key={i}
                          className="flex-1 bg-indigo-500/60 rounded-t"
                          style={{ height: `${Math.max(15, val * 100)}%` }}
                        />
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* 3. TEXT & CAPTIONS TAB */}
          {leftTab === 'text' && (
            <div className="space-y-3">
              <div className="bg-[#0B0D12] border border-[#232838] rounded-lg p-2.5 space-y-2">
                <label htmlFor="custom-caption-input" className="text-[11px] font-semibold text-slate-300 block">
                  Quick Caption / Hook Text
                </label>
                <input
                  id="custom-caption-input"
                  type="text"
                  value={customTextDraft}
                  onChange={(e) => setCustomTextDraft(e.target.value)}
                  className="w-full bg-[#12151E] border border-[#232838] rounded px-2.5 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => addTextClip(customTextDraft || 'NEW CAPTION', 'word-highlight')}
                  className="w-full py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors"
                >
                  + Add Caption at Playhead
                </button>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <input
                  ref={srtInputRef}
                  type="file"
                  accept=".srt,.vtt"
                  onChange={(e) => handleSrtUpload(e.target.files)}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => srtInputRef.current?.click()}
                  className="py-1.5 px-2 rounded bg-[#1A1E2B] hover:bg-[#232838] text-[11px] font-medium text-slate-200 flex items-center justify-center gap-1"
                >
                  <FileText className="w-3 h-3 text-indigo-400" />
                  <span>Import SRT/VTT</span>
                </button>
                <button
                  type="button"
                  onClick={() => downloadTextFile(exportTimelineToSRT(project.clips), `${project.name}.srt`)}
                  className="py-1.5 px-2 rounded bg-[#1A1E2B] hover:bg-[#232838] text-[11px] font-medium text-slate-200 flex items-center justify-center gap-1"
                >
                  <Download className="w-3 h-3 text-emerald-400" />
                  <span>Export .SRT</span>
                </button>
              </div>

              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold text-slate-400">Social Caption Styles</p>
                {(
                  [
                    { id: 'word-highlight', name: 'Animated Word Highlight', desc: 'Active spoken word pill highlight' },
                    { id: 'bold-gaming', name: 'Bold Gaming Impact', desc: 'Yellow high-stroke montage title' },
                    { id: 'karaoke', name: 'Karaoke Fill', desc: 'Progressive green word fill' },
                    { id: 'large-hook', name: 'Viral Hook Banner', desc: 'Large top-frame retention header' },
                    { id: 'clean-subtitles', name: 'Clean Broadcast Subtitles', desc: 'Crisp white lower-third text' },
                    { id: 'minimal-doc', name: 'Documentary Minimal', desc: 'Subtle cinematic subtitle plate' },
                  ] as { id: CaptionStyleId; name: string; desc: string }[]
                ).map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => addTextClip(customTextDraft || preset.name.toUpperCase(), preset.id)}
                    className="w-full text-left p-2.5 rounded-lg bg-[#0B0D12] border border-[#232838] hover:border-indigo-500/60 transition-colors flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-semibold text-slate-200">{preset.name}</p>
                      <p className="text-[11px] text-slate-400">{preset.desc}</p>
                    </div>
                    <Plus className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => downloadTextFile(exportTimelineToVTT(project.clips), `${project.name}.vtt`)}
                className="w-full py-1.5 rounded bg-[#0B0D12] border border-[#232838] hover:bg-[#1A1E2B] text-[11px] text-slate-300"
              >
                Download WebVTT (.vtt) Captions
              </button>
            </div>
          )}

          {/* 4. STICKERS & OVERLAYS TAB */}
          {leftTab === 'stickers' && (
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: '🎯', label: 'LOCKED ON HUD' },
                { icon: '⚡', label: 'MAX BOOST' },
                { icon: '🔥', label: 'STREAK X5' },
                { icon: '🎬', label: 'REC 60FPS' },
                { icon: '🏆', label: 'NEW RECORD' },
                { icon: '💥', label: 'CRITICAL HIT' },
              ].map((st) => (
                <button
                  key={st.label}
                  type="button"
                  onClick={() => addStickerClip(st.icon, st.label)}
                  className="p-3 rounded-lg bg-[#0B0D12] border border-[#232838] hover:border-indigo-500/60 flex flex-col items-center gap-1.5 text-center transition-colors"
                >
                  <span className="text-xl">{st.icon}</span>
                  <span className="text-[11px] font-semibold text-slate-200">{st.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* 5. EFFECTS TAB */}
          {leftTab === 'effects' && (
            <div className="space-y-2.5">
              <div className="flex items-center gap-1 bg-[#0B0D12] p-1 rounded-md border border-[#232838]">
                {(['all', 'basic', 'gaming', 'cinematic'] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setEffectCategory(cat)}
                    className={`flex-1 py-1 rounded text-[11px] font-medium capitalize transition-colors ${
                      effectCategory === cat
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                {EFFECTS_REGISTRY.filter(
                  (e) =>
                    (effectCategory === 'all' || e.category === effectCategory) &&
                    (!q || e.name.toLowerCase().includes(q) || e.description.toLowerCase().includes(q))
                ).map((eff) => (
                  <div
                    key={eff.id}
                    className="p-2.5 rounded-lg bg-[#0B0D12] border border-[#232838] hover:border-indigo-500/50 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-200">{eff.name}</p>
                      <p className="text-[11px] text-slate-400 line-clamp-1">{eff.description}</p>
                    </div>
                    <button
                      type="button"
                      disabled={!activeClipId}
                      onClick={() => activeClipId && addEffectToClip(activeClipId, eff.id)}
                      aria-label={`Apply ${eff.name}`}
                      className="px-2.5 py-1 rounded bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white text-xs font-medium transition-colors shrink-0"
                    >
                      Apply
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 6. TRANSITIONS TAB */}
          {leftTab === 'transitions' && (
            <div className="space-y-2.5">
              <div className="flex items-center gap-1 bg-[#0B0D12] p-1 rounded-md border border-[#232838]">
                {(['all', 'basic', 'motion', 'stylized'] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setTransitionCategory(cat)}
                    className={`flex-1 py-1 rounded text-[11px] font-medium capitalize transition-colors ${
                      transitionCategory === cat
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                {TRANSITIONS_REGISTRY.filter(
                  (t) =>
                    (transitionCategory === 'all' || t.category === transitionCategory) &&
                    (!q || t.name.toLowerCase().includes(q))
                ).map((tr) => (
                  <div
                    key={tr.id}
                    className="p-2.5 rounded-lg bg-[#0B0D12] border border-[#232838] hover:border-indigo-500/50 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-200">{tr.name}</p>
                      <p className="text-[11px] text-slate-400">
                        {tr.defaultDuration}s · {tr.description}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={!activeClipId}
                      onClick={() => activeClipId && setClipTransition(activeClipId, 'out', tr.id, tr.defaultDuration)}
                      aria-label={`Use ${tr.name} transition`}
                      className="px-2.5 py-1 rounded bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white text-xs font-medium transition-colors shrink-0"
                    >
                      Add
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 7. FILTERS & COLOR GRADING TAB */}
          {leftTab === 'filters' && (
            <div className="space-y-2">
              {COLOR_GRADE_PRESETS.filter((p) => !q || p.name.toLowerCase().includes(q)).map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  disabled={!activeClipId}
                  onClick={() => activeClipId && applyColorGradePreset(activeClipId, preset.id)}
                  className="w-full text-left p-2.5 rounded-lg bg-[#0B0D12] border border-[#232838] hover:border-indigo-500/60 flex items-center justify-between transition-colors"
                >
                  <div>
                    <p className="text-xs font-semibold text-slate-200">{preset.name}</p>
                    <p className="text-[11px] text-slate-400">{preset.category} Look</p>
                  </div>
                  <span className="text-[11px] font-medium text-indigo-400">Apply LUT</span>
                </button>
              ))}
            </div>
          )}

          {/* 8. ANIMATION PRESETS TAB */}
          {leftTab === 'animations' && (
            <div className="space-y-2">
              {ANIMATION_PRESETS.filter((p) => !q || p.name.toLowerCase().includes(q)).map((preset) => (
                <div
                  key={preset.id}
                  className="p-2.5 rounded-lg bg-[#0B0D12] border border-[#232838] hover:border-indigo-500/50 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-200">{preset.name}</p>
                    <p className="text-[11px] text-slate-400">{preset.description}</p>
                  </div>
                  <button
                    type="button"
                    disabled={!activeClipId}
                    onClick={() => activeClipId && applyAnimationPresetToClip(activeClipId, preset.id)}
                    className="px-2.5 py-1 rounded bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white text-xs font-medium shrink-0"
                  >
                    Keyframe
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* 9. TEMPLATES TAB */}
          {leftTab === 'templates' && (
            <div className="space-y-2.5">
              {[
                {
                  title: '9:16 GTA 6 Action Short',
                  desc: 'Reframes to vertical 9:16, adds punch-in keyframes, whip transitions & word-highlight captions.',
                  prompt: 'Make a 30-second GTA 6 Short from the best action moments, add zoom effects, animated captions, and energetic transitions.',
                },
                {
                  title: 'Beat-Synced Gaming Montage',
                  desc: 'Analyzes 128 BPM synthwave beats, trims clips to high-action moments, and adds impact flashes.',
                  prompt: 'Create a gaming montage with beat-synchronized cuts and add transitions between all clips.',
                },
                {
                  title: 'Cinematic Anamorphic Trailer',
                  desc: '16:9 widescreen with Teal & Orange grading, 2.39:1 letterbox matte, and 35mm film grain.',
                  prompt: 'Make this clip look cinematic with dramatic color grading and smooth zoom-ins.',
                },
              ].map((tpl) => (
                <div
                  key={tpl.title}
                  className="p-3 rounded-lg bg-[#0B0D12] border border-[#232838] space-y-2"
                >
                  <p className="text-xs font-bold text-slate-100">{tpl.title}</p>
                  <p className="text-[11px] text-slate-400 leading-relaxed">{tpl.desc}</p>
                  <button
                    type="button"
                    onClick={async () => {
                      const plan = await proposeAIEditPlan(tpl.prompt);
                      useEditorStore.getState().applyAIEditPlan(plan.id);
                    }}
                    className="w-full py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors"
                  >
                    Apply Smart Template
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* 10. AI TOOLS TAB */}
          {leftTab === 'ai' && (
            <div className="space-y-2.5">
              <div className="p-3 rounded-lg bg-indigo-950/30 border border-indigo-500/30 space-y-2">
                <p className="text-xs font-bold text-indigo-200">Conversational Timeline Agent</p>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Describe any edit in plain English to generate a validated multi-step timeline operation plan.
                </p>
                <button
                  type="button"
                  onClick={() => setAiDrawerOpen(true)}
                  className="w-full py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                >
                  Open AI Assistant Panel
                </button>
              </div>

              {[
                {
                  label: 'Auto-Reframe to 9:16 Vertical Reel',
                  cmd: 'Convert this landscape video into a 9:16 Reel and keep the main action centered.',
                },
                {
                  label: 'Cut Boring Sections & Keep Action',
                  cmd: 'Find the most exciting moments and cut out boring sections.',
                },
                {
                  label: 'Generate Word-Highlight Subtitles',
                  cmd: 'Add subtitles with animated word highlighting.',
                },
                {
                  label: 'Cinematic Color Grade + Zoom Punch',
                  cmd: 'Make this clip look cinematic with dramatic color grading and smooth zoom-ins.',
                },
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => {
                    setAiDrawerOpen(true);
                    proposeAIEditPlan(item.cmd);
                  }}
                  className="w-full text-left p-2.5 rounded-lg bg-[#0B0D12] border border-[#232838] hover:border-indigo-500/60 transition-colors"
                >
                  <p className="text-xs font-semibold text-slate-200">{item.label}</p>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">&ldquo;{item.cmd}&rdquo;</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
