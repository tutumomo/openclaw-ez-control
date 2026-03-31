import React from 'react';

interface Props {
  availableModels: string[];
  globals: {
    model: string | null;
    fallbackModel: string | null;
    visionModel: string | null;
    modelFallbacks: string[];
    visionFallbacks: string[];
  };
  busy: string | null;
  onSave: (payload: { model: string; fallbackModel: string; visionModel: string; modelFallbacks: string[]; visionFallbacks: string[] }) => void;
}

function toLines(values: string[]) {
  return values.join('\n');
}

function fromLines(value: string) {
  return value.split('\n').map((v) => v.trim()).filter(Boolean);
}

export default function GlobalModelCenter({ availableModels, globals, busy, onSave }: Props) {
  const [model, setModel] = React.useState(globals.model || '');
  const [fallbackModel, setFallbackModel] = React.useState(globals.fallbackModel || '');
  const [visionModel, setVisionModel] = React.useState(globals.visionModel || '');
  const [modelFallbacksText, setModelFallbacksText] = React.useState(toLines(globals.modelFallbacks || []));
  const [visionFallbacksText, setVisionFallbacksText] = React.useState(toLines(globals.visionFallbacks || []));

  React.useEffect(() => {
    setModel(globals.model || '');
    setFallbackModel(globals.fallbackModel || '');
    setVisionModel(globals.visionModel || '');
    setModelFallbacksText(toLines(globals.modelFallbacks || []));
    setVisionFallbacksText(toLines(globals.visionFallbacks || []));
  }, [globals]);

  return (
    <div className="backdrop-blur-glass bg-white/5 rounded-xl p-6 border border-white/10 space-y-4">
      <h2 className="text-xl font-semibold">Global Model Center</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm text-slate-400 mb-2">Default Primary</label>
          <select value={model} onChange={(e) => setModel(e.target.value)} className="w-full rounded-lg bg-slate-800 border border-white/10 px-3 py-2 text-sm text-white">
            <option value="">(none)</option>
            {availableModels.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-2">Fallback Model (legacy single)</label>
          <select value={fallbackModel} onChange={(e) => setFallbackModel(e.target.value)} className="w-full rounded-lg bg-slate-800 border border-white/10 px-3 py-2 text-sm text-white">
            <option value="">(none)</option>
            {availableModels.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-2">Vision Primary</label>
          <select value={visionModel} onChange={(e) => setVisionModel(e.target.value)} className="w-full rounded-lg bg-slate-800 border border-white/10 px-3 py-2 text-sm text-white">
            <option value="">(none)</option>
            {availableModels.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-slate-400 mb-2">Model Fallbacks（每行一個，保留順序）</label>
          <textarea value={modelFallbacksText} onChange={(e) => setModelFallbacksText(e.target.value)} className="w-full min-h-[180px] rounded-lg bg-slate-900 border border-white/10 px-3 py-2 text-sm text-white font-mono" />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-2">Vision Fallbacks（每行一個，保留順序）</label>
          <textarea value={visionFallbacksText} onChange={(e) => setVisionFallbacksText(e.target.value)} className="w-full min-h-[180px] rounded-lg bg-slate-900 border border-white/10 px-3 py-2 text-sm text-white font-mono" />
        </div>
      </div>

      <div className="text-xs text-slate-400">提示：先用下拉選主模型，fallbacks 先用每行一個的方式編輯，下一輪我可以再升級成可拖曳排序 UI。</div>

      <button
        disabled={!!busy}
        onClick={() => onSave({ model, fallbackModel, visionModel, modelFallbacks: fromLines(modelFallbacksText), visionFallbacks: fromLines(visionFallbacksText) })}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-white disabled:opacity-50"
      >
        {busy === 'save-global-models' ? '儲存中...' : '儲存全域模型設定'}
      </button>
    </div>
  );
}
