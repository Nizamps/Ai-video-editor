import React, { useState } from 'react';
import {
  Sliders,
  Palette,
  Wand2,
  Diamond,
  Type,
  Volume2,
  Trash2,
  RotateCcw,
  FlipHorizontal,
  FlipVertical,
  Plus,
} from 'lucide-react';
import { RightInspectorTab, useEditorStore } from '../editor/store';
import {
  AnimatableProperty,
  CaptionStyleId,
  ColorAdjustments,
  EasingType,
  FitMode,
} from '../types/editor';
import { DEFAULT_COLOR, DEFAULT_TRANSFORM } from '../editor/timebase';
import { EFFECTS_REGISTRY } from '../effects/registry';

const INSPECTOR_TABS: { id: RightInspectorTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'transform', label: 'Layout', icon: Sliders },
  { id: 'color', label: 'Color', icon: Palette },
  { id: 'effects', label: 'Effects', icon: Wand2 },
  { id: 'keyframes', label: 'Keys', icon: Diamond },
  { id: 'text', label: 'Text', icon: Type },
  { id: 'audio', label: 'Audio', icon: Volume2 },
];

export const RightInspector: React.FC = () => {
  const {
    project,
    selectedClipIds,
    rightTab,
    currentTime,
    setRightTab,
    updateClipProperties,
    updateClipTransform,
    updateClipColor,
    updateClipTextConfig,
    toggleClipEffect,
    updateClipEffectParam,
    removeClipEffect,
    removeClipTransition,
    addOrUpdateKeyframe,
    removeKeyframe,
    setCurrentTime,
    deleteSelectedClips,
    duplicateClip,
  } = useEditorStore();

  const selectedClip = project.clips.find((c) => c.id === selectedClipIds[0]) || null;
  const [kfProperty, setKfProperty] = useState<AnimatableProperty>('scale');
  const [kfEasing, setKfEasing] = useState<EasingType>('ease-in-out');

  if (!selectedClip) {
    return (
      <aside aria-label="Inspector Panel" className="w-[310px] bg-[#12151E] border-l border-[#232838] p-4 flex flex-col justify-between select-none shrink-0">
        <div className="space-y-4">
          <h2 className="text-xs font-bold text-slate-200">Project Inspector</h2>
          <div className="p-3 rounded-lg bg-[#0B0D12] border border-[#232838] space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Project Name</span>
              <span className="text-slate-200 font-medium">{project.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Resolution</span>
              <span className="text-slate-200 font-mono tabular-nums">
                {project.width}×{project.height} ({project.aspectRatio})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Timebase</span>
              <span className="text-slate-200 font-mono tabular-nums">{project.fps} FPS</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Timeline Clips</span>
              <span className="text-slate-200 font-mono tabular-nums">{project.clips.length}</span>
            </div>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Select any video, caption, overlay, or audio clip on the timeline to inspect and keyframe its parameters.
          </p>
        </div>
      </aside>
    );
  }

  const localOffset = Math.max(
    0,
    Math.min(selectedClip.duration, Number((currentTime - selectedClip.startTime).toFixed(2)))
  );

  return (
    <aside aria-label="Clip Inspector" className="w-[310px] bg-[#12151E] border-l border-[#232838] flex flex-col select-none shrink-0 h-full overflow-hidden">
      {/* Clip Header */}
      <div className="p-3 border-b border-[#232838] flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-bold text-slate-100 truncate" title={selectedClip.name}>
            {selectedClip.name}
          </p>
          <p className="text-[11px] text-slate-400 font-mono tabular-nums">
            {selectedClip.startTime.toFixed(2)}s – {(selectedClip.startTime + selectedClip.duration).toFixed(2)}s ({selectedClip.duration.toFixed(2)}s)
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => duplicateClip(selectedClip.id)}
            className="px-2 py-1 rounded bg-[#1A1E2B] hover:bg-[#232838] text-[11px] font-medium text-slate-200"
            title="Duplicate Clip"
          >
            Copy
          </button>
          <button
            type="button"
            onClick={deleteSelectedClips}
            aria-label="Delete Selected Clip"
            title="Delete Clip (Delete)"
            className="p-1.5 rounded bg-rose-950/50 hover:bg-rose-600 text-rose-300 hover:text-white transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Inspector Section Tabs */}
      <div className="grid grid-cols-6 bg-[#0B0D12] border-b border-[#232838] p-1 gap-0.5 shrink-0">
        {INSPECTOR_TABS.map((t) => {
          const Icon = t.icon;
          const active = rightTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setRightTab(t.id)}
              title={t.label}
              className={`py-1.5 rounded flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors ${
                active
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#161A26]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="truncate max-w-full px-0.5">{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Inspector Body */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-4 text-xs">
        {/* 1. TRANSFORM TAB */}
        {rightTab === 'transform' && (
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-200">Geometry & Transform</span>
              <button
                type="button"
                onClick={() => updateClipTransform(selectedClip.id, { ...DEFAULT_TRANSFORM }, true)}
                className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>

            <SliderField
              label="Scale"
              value={selectedClip.transform.scale}
              min={10}
              max={300}
              unit="%"
              onChange={(v) => updateClipTransform(selectedClip.id, { scale: v })}
            />
            <SliderField
              label="Position X"
              value={selectedClip.transform.positionX}
              min={-960}
              max={960}
              unit="px"
              onChange={(v) => updateClipTransform(selectedClip.id, { positionX: v })}
            />
            <SliderField
              label="Position Y"
              value={selectedClip.transform.positionY}
              min={-960}
              max={960}
              unit="px"
              onChange={(v) => updateClipTransform(selectedClip.id, { positionY: v })}
            />
            <SliderField
              label="Rotation"
              value={selectedClip.transform.rotation}
              min={-180}
              max={180}
              unit="°"
              onChange={(v) => updateClipTransform(selectedClip.id, { rotation: v })}
            />
            <SliderField
              label="Opacity"
              value={selectedClip.transform.opacity}
              min={0}
              max={100}
              unit="%"
              onChange={(v) => updateClipTransform(selectedClip.id, { opacity: v })}
            />

            {/* Fit Mode & Mirroring */}
            <div className="pt-2 border-t border-[#232838] space-y-2">
              <label className="text-[11px] text-slate-400 block">Frame Fit Mode</label>
              <div className="grid grid-cols-4 gap-1 bg-[#0B0D12] p-1 rounded border border-[#232838]">
                {(['fit', 'fill', 'crop', 'blur-bg'] as FitMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => updateClipTransform(selectedClip.id, { fitMode: mode }, true)}
                    className={`py-1 rounded text-[11px] font-medium capitalize ${
                      selectedClip.transform.fitMode === mode
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() =>
                    updateClipTransform(
                      selectedClip.id,
                      { flipH: !selectedClip.transform.flipH },
                      true
                    )
                  }
                  className={`flex-1 py-1.5 px-2 rounded border text-[11px] font-medium flex items-center justify-center gap-1.5 ${
                    selectedClip.transform.flipH
                      ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200'
                      : 'bg-[#0B0D12] border-[#232838] text-slate-300'
                  }`}
                >
                  <FlipHorizontal className="w-3.5 h-3.5" />
                  <span>Flip H</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    updateClipTransform(
                      selectedClip.id,
                      { flipV: !selectedClip.transform.flipV },
                      true
                    )
                  }
                  className={`flex-1 py-1.5 px-2 rounded border text-[11px] font-medium flex items-center justify-center gap-1.5 ${
                    selectedClip.transform.flipV
                      ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200'
                      : 'bg-[#0B0D12] border-[#232838] text-slate-300'
                  }`}
                >
                  <FlipVertical className="w-3.5 h-3.5" />
                  <span>Flip V</span>
                </button>
              </div>
            </div>

            {/* Crop Controls */}
            <div className="pt-2 border-t border-[#232838] space-y-2">
              <span className="font-semibold text-slate-200 block">Edge Crop</span>
              <div className="grid grid-cols-2 gap-2">
                <SliderField
                  label="Crop Top"
                  value={selectedClip.transform.cropTop}
                  min={0}
                  max={45}
                  unit="%"
                  onChange={(v) => updateClipTransform(selectedClip.id, { cropTop: v })}
                />
                <SliderField
                  label="Crop Bottom"
                  value={selectedClip.transform.cropBottom}
                  min={0}
                  max={45}
                  unit="%"
                  onChange={(v) => updateClipTransform(selectedClip.id, { cropBottom: v })}
                />
                <SliderField
                  label="Crop Left"
                  value={selectedClip.transform.cropLeft}
                  min={0}
                  max={45}
                  unit="%"
                  onChange={(v) => updateClipTransform(selectedClip.id, { cropLeft: v })}
                />
                <SliderField
                  label="Crop Right"
                  value={selectedClip.transform.cropRight}
                  min={0}
                  max={45}
                  unit="%"
                  onChange={(v) => updateClipTransform(selectedClip.id, { cropRight: v })}
                />
              </div>
            </div>

            {/* Speed & Timing */}
            <div className="pt-2 border-t border-[#232838] space-y-2.5">
              <span className="font-semibold text-slate-200 block">Speed & Fades</span>
              <SliderField
                label="Playback Speed"
                value={selectedClip.speed}
                min={0.25}
                max={4}
                step={0.25}
                unit="x"
                onChange={(v) => updateClipProperties(selectedClip.id, { speed: v }, 'Change clip speed')}
              />
              <SliderField
                label="Fade In"
                value={selectedClip.fadeIn}
                min={0}
                max={3}
                step={0.1}
                unit="s"
                onChange={(v) => updateClipProperties(selectedClip.id, { fadeIn: v })}
              />
              <SliderField
                label="Fade Out"
                value={selectedClip.fadeOut}
                min={0}
                max={3}
                step={0.1}
                unit="s"
                onChange={(v) => updateClipProperties(selectedClip.id, { fadeOut: v })}
              />
            </div>
          </div>
        )}

        {/* 2. COLOR GRADING TAB */}
        {rightTab === 'color' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-200">Color & Lumetri</span>
              <button
                type="button"
                onClick={() => updateClipColor(selectedClip.id, { ...DEFAULT_COLOR }, true)}
                className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>

            {(
              [
                { key: 'brightness', label: 'Brightness', min: -100, max: 100 },
                { key: 'contrast', label: 'Contrast', min: -100, max: 100 },
                { key: 'saturation', label: 'Saturation', min: -100, max: 100 },
                { key: 'exposure', label: 'Exposure', min: -100, max: 100 },
                { key: 'temperature', label: 'Temperature', min: -100, max: 100 },
                { key: 'tint', label: 'Tint', min: -100, max: 100 },
                { key: 'vignette', label: 'Vignette', min: 0, max: 100 },
              ] as { key: keyof ColorAdjustments; label: string; min: number; max: number }[]
            ).map((item) => (
              <SliderField
                key={item.key}
                label={item.label}
                value={selectedClip.color[item.key]}
                min={item.min}
                max={item.max}
                onChange={(v) => updateClipColor(selectedClip.id, { [item.key]: v })}
              />
            ))}
          </div>
        )}

        {/* 3. EFFECTS & TRANSITIONS TAB */}
        {rightTab === 'effects' && (
          <div className="space-y-3">
            <span className="font-semibold text-slate-200 block">
              Active Effects ({selectedClip.effects.length})
            </span>

            {selectedClip.effects.length === 0 ? (
              <p className="text-[11px] text-slate-400 bg-[#0B0D12] border border-[#232838] rounded p-3">
                No effects applied to this clip yet. Open the Effects library on the left sidebar to add effects.
              </p>
            ) : (
              selectedClip.effects.map((inst) => {
                const def = EFFECTS_REGISTRY.find((d) => d.id === inst.effectId);
                return (
                  <div
                    key={inst.id}
                    className="p-2.5 rounded-lg bg-[#0B0D12] border border-[#232838] space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <label className="flex items-center gap-2 text-xs font-semibold text-slate-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={inst.enabled}
                          onChange={() => toggleClipEffect(selectedClip.id, inst.id)}
                          className="rounded border-slate-600 text-indigo-600 focus:ring-0"
                        />
                        <span>{inst.name}</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => removeClipEffect(selectedClip.id, inst.id)}
                        aria-label={`Remove ${inst.name}`}
                        className="text-slate-400 hover:text-rose-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {def?.parameters.map((param) => (
                      <SliderField
                        key={param.key}
                        label={param.label}
                        value={inst.params[param.key] ?? param.defaultValue}
                        min={param.min}
                        max={param.max}
                        step={param.step}
                        unit={param.unit}
                        onChange={(v) =>
                          updateClipEffectParam(selectedClip.id, inst.id, param.key, v)
                        }
                      />
                    ))}
                  </div>
                );
              })
            )}

            {/* Clip Transitions Summary */}
            <div className="pt-2 border-t border-[#232838] space-y-2">
              <span className="font-semibold text-slate-200 block">Clip Transitions</span>
              {selectedClip.transitionIn && (
                <div className="p-2 rounded bg-[#0B0D12] border border-[#232838] flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-200">
                      In: {selectedClip.transitionIn.name}
                    </p>
                    <p className="text-[11px] text-slate-400 font-mono">
                      {selectedClip.transitionIn.duration}s
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeClipTransition(selectedClip.id, 'in')}
                    className="text-slate-400 hover:text-rose-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              {selectedClip.transitionOut && (
                <div className="p-2 rounded bg-[#0B0D12] border border-[#232838] flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-200">
                      Out: {selectedClip.transitionOut.name}
                    </p>
                    <p className="text-[11px] text-slate-400 font-mono">
                      {selectedClip.transitionOut.duration}s
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeClipTransition(selectedClip.id, 'out')}
                    className="text-slate-400 hover:text-rose-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              {!selectedClip.transitionIn && !selectedClip.transitionOut && (
                <p className="text-[11px] text-slate-400">
                  No transitions attached. Choose one from the Transitions sidebar tab.
                </p>
              )}
            </div>
          </div>
        )}

        {/* 4. KEYFRAMES TAB */}
        {rightTab === 'keyframes' && (
          <div className="space-y-3">
            <div className="p-2.5 rounded-lg bg-[#0B0D12] border border-[#232838] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-200">Add Keyframe at Playhead</span>
                <span className="font-mono text-[11px] text-indigo-400">+{localOffset}s</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="kf-prop-select" className="text-[10px] text-slate-400 block mb-1">
                    Property
                  </label>
                  <select
                    id="kf-prop-select"
                    value={kfProperty}
                    onChange={(e) => setKfProperty(e.target.value as AnimatableProperty)}
                    className="w-full bg-[#12151E] border border-[#232838] rounded px-2 py-1 text-xs text-slate-200"
                  >
                    <option value="scale">Scale (%)</option>
                    <option value="positionX">Position X (px)</option>
                    <option value="positionY">Position Y (px)</option>
                    <option value="rotation">Rotation (°)</option>
                    <option value="opacity">Opacity (%)</option>
                    <option value="volume">Volume (%)</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="kf-ease-select" className="text-[10px] text-slate-400 block mb-1">
                    Interpolation
                  </label>
                  <select
                    id="kf-ease-select"
                    value={kfEasing}
                    onChange={(e) => setKfEasing(e.target.value as EasingType)}
                    className="w-full bg-[#12151E] border border-[#232838] rounded px-2 py-1 text-xs text-slate-200"
                  >
                    <option value="linear">Linear</option>
                    <option value="ease-in">Ease In</option>
                    <option value="ease-out">Ease Out</option>
                    <option value="ease-in-out">Ease In-Out</option>
                    <option value="bounce">Bounce</option>
                    <option value="hold">Hold Step</option>
                  </select>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  const currentVal =
                    kfProperty === 'volume'
                      ? selectedClip.volume
                      : (selectedClip.transform[kfProperty as keyof typeof selectedClip.transform] as number) ?? 100;
                  addOrUpdateKeyframe(selectedClip.id, kfProperty, localOffset, currentVal, kfEasing);
                }}
                className="w-full py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Insert Keyframe at +{localOffset}s</span>
              </button>
            </div>

            <div className="space-y-1.5">
              <span className="font-semibold text-slate-200 block">
                Clip Keyframes ({selectedClip.keyframes.length})
              </span>
              {selectedClip.keyframes.length === 0 ? (
                <p className="text-[11px] text-slate-400">
                  No keyframes on this clip. Insert one above or choose an Animation Preset from the left sidebar.
                </p>
              ) : (
                selectedClip.keyframes
                  .slice()
                  .sort((a, b) => a.timeOffset - b.timeOffset)
                  .map((kf) => (
                    <div
                      key={kf.id}
                      className="p-2 rounded bg-[#0B0D12] border border-[#232838] flex items-center justify-between gap-2"
                    >
                      <button
                        type="button"
                        onClick={() => setCurrentTime(selectedClip.startTime + kf.timeOffset)}
                        className="text-left min-w-0 flex-1 hover:text-indigo-300"
                      >
                        <p className="text-xs font-semibold text-slate-200 capitalize">
                          ◆ {kf.property}: <span className="font-mono text-indigo-300">{kf.value}</span>
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          +{kf.timeOffset.toFixed(2)}s · {kf.easing}
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={() => removeKeyframe(selectedClip.id, kf.id)}
                        aria-label="Delete Keyframe"
                        className="text-slate-400 hover:text-rose-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
              )}
            </div>
          </div>
        )}

        {/* 5. TEXT & SUBTITLES TAB */}
        {rightTab === 'text' && (
          <div className="space-y-3">
            {selectedClip.textConfig ? (
              <>
                <div>
                  <label htmlFor="inspector-caption-text" className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Caption / Subtitle Content
                  </label>
                  <textarea
                    id="inspector-caption-text"
                    rows={2}
                    value={selectedClip.textConfig.text}
                    onChange={(e) => updateClipTextConfig(selectedClip.id, { text: e.target.value })}
                    className="w-full bg-[#0B0D12] border border-[#232838] rounded p-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="inspector-caption-style" className="text-[11px] text-slate-400 block mb-1">
                    Animation Style
                  </label>
                  <select
                    id="inspector-caption-style"
                    value={selectedClip.textConfig.captionStyle}
                    onChange={(e) =>
                      updateClipTextConfig(selectedClip.id, {
                        captionStyle: e.target.value as CaptionStyleId,
                      })
                    }
                    className="w-full bg-[#0B0D12] border border-[#232838] rounded px-2.5 py-1.5 text-xs text-slate-200"
                  >
                    <option value="word-highlight">Animated Word Highlight</option>
                    <option value="karaoke">Karaoke Progressive Fill</option>
                    <option value="bold-gaming">Bold Gaming Impact</option>
                    <option value="large-hook">Viral Hook Header</option>
                    <option value="clean-subtitles">Clean Broadcast Subtitles</option>
                    <option value="minimal-doc">Documentary Minimal</option>
                  </select>
                </div>

                <SliderField
                  label="Font Size"
                  value={selectedClip.textConfig.fontSize}
                  min={20}
                  max={110}
                  unit="px"
                  onChange={(v) => updateClipTextConfig(selectedClip.id, { fontSize: v })}
                />

                <SliderField
                  label="Stroke Width"
                  value={selectedClip.textConfig.strokeWidth}
                  min={0}
                  max={12}
                  unit="px"
                  onChange={(v) => updateClipTextConfig(selectedClip.id, { strokeWidth: v })}
                />

                <SliderField
                  label="Background Plate Opacity"
                  value={selectedClip.textConfig.backgroundOpacity}
                  min={0}
                  max={100}
                  unit="%"
                  onChange={(v) => updateClipTextConfig(selectedClip.id, { backgroundOpacity: v })}
                />

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="text-primary-color" className="text-[11px] text-slate-400 block mb-1">
                      Text Color
                    </label>
                    <input
                      id="text-primary-color"
                      type="color"
                      value={selectedClip.textConfig.color}
                      onChange={(e) => updateClipTextConfig(selectedClip.id, { color: e.target.value })}
                      className="w-full h-8 rounded bg-[#0B0D12] border border-[#232838] cursor-pointer"
                    />
                  </div>
                  <div>
                    <label htmlFor="text-highlight-color" className="text-[11px] text-slate-400 block mb-1">
                      Highlight Color
                    </label>
                    <input
                      id="text-highlight-color"
                      type="color"
                      value={selectedClip.textConfig.highlightColor}
                      onChange={(e) =>
                        updateClipTextConfig(selectedClip.id, { highlightColor: e.target.value })
                      }
                      className="w-full h-8 rounded bg-[#0B0D12] border border-[#232838] cursor-pointer"
                    />
                  </div>
                </div>
              </>
            ) : (
              <p className="text-[11px] text-slate-400">
                Select a Text/Caption clip on the timeline or add one from the Text tab to edit typography.
              </p>
            )}
          </div>
        )}

        {/* 6. AUDIO TAB */}
        {rightTab === 'audio' && (
          <div className="space-y-3">
            <span className="font-semibold text-slate-200 block">Audio Gain & Mixing</span>
            <SliderField
              label="Clip Volume Gain"
              value={selectedClip.volume}
              min={0}
              max={200}
              unit="%"
              onChange={(v) => updateClipProperties(selectedClip.id, { volume: v })}
            />
            <SliderField
              label="Stereo Pan (L/R)"
              value={selectedClip.pan}
              min={-1}
              max={1}
              step={0.1}
              onChange={(v) => updateClipProperties(selectedClip.id, { pan: v })}
            />
            <SliderField
              label="Audio Fade In"
              value={selectedClip.fadeIn}
              min={0}
              max={5}
              step={0.1}
              unit="s"
              onChange={(v) => updateClipProperties(selectedClip.id, { fadeIn: v })}
            />
            <SliderField
              label="Audio Fade Out"
              value={selectedClip.fadeOut}
              min={0}
              max={5}
              step={0.1}
              unit="s"
              onChange={(v) => updateClipProperties(selectedClip.id, { fadeOut: v })}
            />

            <label className="flex items-center justify-between p-2.5 rounded bg-[#0B0D12] border border-[#232838] cursor-pointer">
              <span className="text-xs text-slate-200">Auto-Duck Background Music</span>
              <input
                type="checkbox"
                checked={selectedClip.audioDucking}
                onChange={(e) =>
                  updateClipProperties(selectedClip.id, { audioDucking: e.target.checked })
                }
                className="rounded border-slate-600 text-indigo-600"
              />
            </label>

            <label className="flex items-center justify-between p-2.5 rounded bg-[#0B0D12] border border-[#232838] cursor-pointer">
              <span className="text-xs text-slate-200">Mute Clip Audio</span>
              <input
                type="checkbox"
                checked={selectedClip.muted}
                onChange={(e) =>
                  updateClipProperties(selectedClip.id, { muted: e.target.checked })
                }
                className="rounded border-slate-600 text-indigo-600"
              />
            </label>
          </div>
        )}
      </div>
    </aside>
  );
};

interface SliderFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (val: number) => void;
}

const SliderField: React.FC<SliderFieldProps> = ({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange,
}) => {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-slate-300">{label}</span>
        <span className="font-mono tabular-nums text-slate-200">
          {Number(value.toFixed(2))}
          {unit}
        </span>
      </div>
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-indigo-500 h-1.5 bg-[#0B0D12] rounded-lg cursor-pointer"
      />
    </div>
  );
};
