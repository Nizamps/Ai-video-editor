import React, { useState } from 'react';
import {
  Sparkles,
  X,
  CheckCircle2,
  XCircle,
  Send,
  Undo2,
  AlertTriangle,
  Terminal,
} from 'lucide-react';
import { useEditorStore } from '../editor/store';

const EXAMPLE_COMMANDS = [
  'Make a 30-second GTA 6 Short from the best action moments, add zoom effects, animated captions, and energetic transitions.',
  'Convert this landscape video into a 9:16 Reel and keep the main action centered.',
  'Make this clip look cinematic with dramatic color grading and smooth zoom-ins.',
  'Add subtitles with animated word highlighting.',
  'Create a gaming montage with beat-synchronized cuts.',
  'Add transitions between all clips, but keep them fast and energetic.',
  'Export this project at 1080p, 60 FPS, in MP4 format.',
];

export const AIPanel: React.FC = () => {
  const {
    aiDrawerOpen,
    aiPlans,
    aiLoading,
    aiAutoExecuteLowRisk,
    lastAIStatusMessage,
    undoStack,
    setAiDrawerOpen,
    proposeAIEditPlan,
    applyAIEditPlan,
    cancelAIEditPlan,
    setAiAutoExecuteLowRisk,
    undo,
  } = useEditorStore();

  const [promptInput, setPromptInput] = useState('');

  if (!aiDrawerOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = promptInput.trim();
    if (!trimmed || aiLoading) return;
    setPromptInput('');
    await proposeAIEditPlan(trimmed);
  };

  return (
    <aside
      aria-label="AI Editing Agent Panel"
      className="w-[360px] bg-[#12151E] border-l border-[#232838] flex flex-col h-full select-none shrink-0 z-10"
    >
      {/* Header */}
      <div className="p-3.5 border-b border-[#232838] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-slate-100">ClipForge AI Editing Agent</h2>
            <p className="text-[10px] text-slate-400">Validated Timeline Operation Planner</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setAiDrawerOpen(false)}
          aria-label="Close AI Editing Agent Panel"
          className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#1A1E2B]"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Auto-apply toggle & Quick Undo */}
      <div className="px-3.5 py-2 bg-[#0B0D12] border-b border-[#232838] flex items-center justify-between text-[11px]">
        <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={aiAutoExecuteLowRisk}
            onChange={(e) => setAiAutoExecuteLowRisk(e.target.checked)}
            className="rounded border-slate-600 text-indigo-600"
          />
          <span>Auto-apply low-risk plans</span>
        </label>

        <button
          type="button"
          onClick={undo}
          disabled={undoStack.length === 0}
          className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 disabled:opacity-40 font-medium"
        >
          <Undo2 className="w-3 h-3" />
          <span>Undo Last Edit</span>
        </button>
      </div>

      {/* Scrollable Plan History & Prompt Suggestions */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5">
        {lastAIStatusMessage && (
          <div className="p-2.5 rounded-lg bg-indigo-950/40 border border-indigo-500/40 text-[11px] text-indigo-200">
            {lastAIStatusMessage}
          </div>
        )}

        {aiPlans.length === 0 && (
          <div className="space-y-2.5">
            <p className="text-xs text-slate-300 leading-relaxed">
              Describe your edit in plain English. The AI inspects your timeline clips, proposes a structured Edit Plan, and updates the composition upon approval.
            </p>
            <p className="text-[11px] font-semibold text-slate-400">Try an Example Command:</p>
            <div className="space-y-1.5">
              {EXAMPLE_COMMANDS.map((cmd) => (
                <button
                  key={cmd}
                  type="button"
                  onClick={() => proposeAIEditPlan(cmd)}
                  className="w-full text-left p-2.5 rounded-lg bg-[#0B0D12] border border-[#232838] hover:border-indigo-500/60 text-xs text-slate-200 transition-colors"
                >
                  &ldquo;{cmd}&rdquo;
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Proposed & Applied Edit Plans */}
        {aiPlans.map((plan) => (
          <div
            key={plan.id}
            data-testid="ai-edit-plan-card"
            className="rounded-lg bg-[#0B0D12] border border-[#232838] p-3 space-y-2.5"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[10px] font-mono text-indigo-400 block">
                  {plan.modelUsed}
                </span>
                <p className="text-xs font-semibold text-slate-100 mt-0.5">
                  &ldquo;{plan.prompt}&rdquo;
                </p>
              </div>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded capitalize shrink-0 ${
                  plan.status === 'applied'
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/50'
                    : plan.status === 'cancelled'
                    ? 'bg-slate-800 text-slate-400'
                    : 'bg-amber-950 text-amber-300 border border-amber-700/50'
                }`}
              >
                {plan.status}
              </span>
            </div>

            {plan.reasoning.length > 0 && (
              <div className="space-y-1 text-[11px] text-slate-300">
                {plan.reasoning.map((r, idx) => (
                  <p key={idx}>• {r}</p>
                ))}
              </div>
            )}

            {/* Structured Tool Operations */}
            <div className="space-y-1 pt-1">
              <p className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                <Terminal className="w-3 h-3 text-indigo-400" />
                <span>Validated Timeline Operations ({plan.operations.length})</span>
              </p>
              <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                {plan.operations.map((op, idx) => (
                  <div
                    key={op.id || idx}
                    className="p-2 rounded bg-[#12151E] border border-[#1E2333] text-[11px] flex items-start justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <span className="font-mono text-[10px] text-indigo-300 block">
                        {idx + 1}. {op.tool}
                      </span>
                      <span className="text-slate-300 block">{op.description}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {plan.warnings.length > 0 && (
              <div className="p-2 rounded bg-amber-950/40 border border-amber-700/40 text-[11px] text-amber-200 flex items-start gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <div>{plan.warnings.join(' ')}</div>
              </div>
            )}

            {/* Approval Controls */}
            {plan.status === 'proposed' && (
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => applyAIEditPlan(plan.id)}
                  className="flex-1 py-1.5 px-3 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Approve & Apply Plan</span>
                </button>
                <button
                  type="button"
                  onClick={() => cancelAIEditPlan(plan.id)}
                  className="py-1.5 px-2.5 rounded bg-[#1A1E2B] hover:bg-[#232838] text-slate-300 text-xs font-medium flex items-center gap-1"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Cancel</span>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Prompt Input Form */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-[#232838] bg-[#0B0D12] space-y-2">
        <div className="relative">
          <textarea
            rows={2}
            aria-label="Describe your video edit in plain English"
            placeholder="Describe an edit (e.g. 'Convert to 9:16 Short, add zoom keyframes and animated captions')..."
            value={promptInput}
            onChange={(e) => setPromptInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            className="w-full bg-[#12151E] border border-[#232838] focus:border-indigo-500 rounded-lg p-2.5 pr-10 text-xs text-white placeholder:text-slate-500 focus:outline-none resize-none"
          />
          <button
            type="submit"
            disabled={aiLoading || !promptInput.trim()}
            aria-label="Send AI Edit Command"
            className="absolute right-2 bottom-2.5 p-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>
    </aside>
  );
};
