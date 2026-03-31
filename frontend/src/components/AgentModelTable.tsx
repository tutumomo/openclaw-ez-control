import React from 'react';
import type { AgentModelRow } from '../types';

interface Props {
  agents: AgentModelRow[];
  availableModels: string[];
  busy: string | null;
  onSave: (payload: { agentId: string; useDefaultModel: boolean; useDefaultFallbacks: boolean; useDefaultVision: boolean; model: string; fallbackModel: string; visionModel: string; modelFallbacks: string[]; visionFallbacks: string[] }) => void;
  onReset: (agentId: string) => void;
}

function toLines(values: string[]) {
  return values.join('\n');
}
function fromLines(value: string) {
  return value.split('\n').map((v) => v.trim()).filter(Boolean);
}

export default function AgentModelTable({ agents, availableModels, busy, onSave, onReset }: Props) {
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [drafts, setDrafts] = React.useState<Record<string, AgentModelRow>>({});

  React.useEffect(() => {
    const next: Record<string, AgentModelRow> = {};
    agents.forEach((agent) => { next[agent.id] = { ...agent }; });
    setDrafts(next);
  }, [agents]);

  const update = (id: string, patch: Partial<AgentModelRow>) => {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  return (
    <div className="space-y-4">
      {agents.map((agent) => {
        const row = drafts[agent.id] || agent;
        const expanded = openId === agent.id;
        return (
          <div key={agent.id} className="backdrop-blur-glass bg-white/5 rounded-xl border border-white/10 overflow-hidden">
            <button
              className="w-full px-5 py-4 text-left hover:bg-white/5"
              onClick={() => setOpenId(expanded ? null : agent.id)}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-lg font-semibold text-white">{agent.id}</div>
                  <div className="text-sm text-slate-400 mt-1 break-all">Model: {agent.effectiveModel || '-'} | Vision: {agent.effectiveVisionModel || '-'} </div>
                  <div className="text-xs text-slate-500 mt-1">Model fallbacks: {agent.effectiveModelFallbacks.length} | Vision fallbacks: {agent.effectiveVisionFallbacks.length}</div>
                </div>
                <div className="text-xs text-slate-400">{expanded ? '收合' : '展開'}</div>
              </div>
            </button>

            {expanded && (
              <div className="border-t border-white/10 p-5 space-y-6">
                <div className="grid grid-cols-1 gap-6">
                  <section className="rounded-lg bg-slate-900/50 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium text-white">Model</h3>
                      <label className="text-sm text-slate-300 flex items-center gap-2"><input type="checkbox" checked={row.useDefaultModel} onChange={(e) => update(agent.id, { useDefaultModel: e.target.checked })} /> Use Default</label>
                    </div>
                    <select disabled={row.useDefaultModel} value={row.model || ''} onChange={(e) => update(agent.id, { model: e.target.value })} className="w-full rounded-lg bg-slate-800 border border-white/10 px-3 py-2 text-sm text-white mb-3">
                      <option value="">(default)</option>
                      {availableModels.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <label className="block text-sm text-slate-400 mb-2">Model Fallbacks（每行一個）</label>
                    <textarea disabled={row.useDefaultModel} value={toLines(row.modelFallbacks || [])} onChange={(e) => update(agent.id, { modelFallbacks: fromLines(e.target.value) })} className="w-full min-h-[120px] rounded-lg bg-slate-800 border border-white/10 px-3 py-2 text-sm text-white font-mono" />
                  </section>

                  <section className="rounded-lg bg-slate-900/50 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium text-white">Fallback Override</h3>
                      <label className="text-sm text-slate-300 flex items-center gap-2"><input type="checkbox" checked={row.useDefaultFallbacks} onChange={(e) => update(agent.id, { useDefaultFallbacks: e.target.checked })} /> Use Default</label>
                    </div>
                    <select disabled={row.useDefaultFallbacks} value={row.fallbackModel || ''} onChange={(e) => update(agent.id, { fallbackModel: e.target.value })} className="w-full rounded-lg bg-slate-800 border border-white/10 px-3 py-2 text-sm text-white">
                      <option value="">(default)</option>
                      {availableModels.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </section>

                  <section className="rounded-lg bg-slate-900/50 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium text-white">Vision</h3>
                      <label className="text-sm text-slate-300 flex items-center gap-2"><input type="checkbox" checked={row.useDefaultVision} onChange={(e) => update(agent.id, { useDefaultVision: e.target.checked })} /> Use Default</label>
                    </div>
                    <select disabled={row.useDefaultVision} value={row.visionModel || ''} onChange={(e) => update(agent.id, { visionModel: e.target.value })} className="w-full rounded-lg bg-slate-800 border border-white/10 px-3 py-2 text-sm text-white mb-3">
                      <option value="">(default)</option>
                      {availableModels.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <label className="block text-sm text-slate-400 mb-2">Vision Fallbacks（每行一個）</label>
                    <textarea disabled={row.useDefaultVision} value={toLines(row.visionFallbacks || [])} onChange={(e) => update(agent.id, { visionFallbacks: fromLines(e.target.value) })} className="w-full min-h-[120px] rounded-lg bg-slate-800 border border-white/10 px-3 py-2 text-sm text-white font-mono" />
                  </section>
                </div>

                <div className="flex gap-3">
                  <button disabled={!!busy} onClick={() => onSave({ agentId: agent.id, useDefaultModel: !!row.useDefaultModel, useDefaultFallbacks: !!row.useDefaultFallbacks, useDefaultVision: !!row.useDefaultVision, model: row.model || '', fallbackModel: row.fallbackModel || '', visionModel: row.visionModel || '', modelFallbacks: row.modelFallbacks || [], visionFallbacks: row.visionFallbacks || [] })} className="rounded-lg bg-indigo-600 px-4 py-2 text-white disabled:opacity-50">Save</button>
                  <button disabled={!!busy} onClick={() => onReset(agent.id)} className="rounded-lg bg-slate-700 px-4 py-2 text-white disabled:opacity-50">Reset All to Defaults</button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
