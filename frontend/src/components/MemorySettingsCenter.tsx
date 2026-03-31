import React from 'react';

interface HelpItem {
  label: string;
  summary: string;
  default: string;
  required: boolean;
  whenToUse: string;
  risk: string;
  path: string;
}

interface Props {
  settings: Record<string, any>;
  help: Record<string, HelpItem>;
  busy: string | null;
  onSave: (settings: Record<string, any>) => void;
}

function HelpBlock({ item }: { item?: HelpItem }) {
  const [open, setOpen] = React.useState(false);
  if (!item) return null;
  return (
    <div className="mt-2 rounded-lg border border-white/10 bg-slate-900/40 p-3 text-xs text-slate-300">
      <div>{item.summary}</div>
      <button className="mt-2 text-blue-300" onClick={() => setOpen(!open)}>{open ? '收合詳細說明' : '展開詳細說明'}</button>
      {open && (
        <div className="mt-2 space-y-1 text-slate-400">
          <div><b>預設值：</b>{item.default}</div>
          <div><b>是否必要：</b>{item.required ? '必要' : '非必要'}</div>
          <div><b>什麼時候要開：</b>{item.whenToUse}</div>
          <div><b>注意事項：</b>{item.risk}</div>
          <div><b>設定路徑：</b>{item.path}</div>
        </div>
      )}
    </div>
  );
}

export default function MemorySettingsCenter({ settings, help, busy, onSave }: Props) {
  const [draft, setDraft] = React.useState(settings);
  React.useEffect(() => setDraft(settings), [settings]);
  const set = (key: string, value: any) => setDraft((prev: Record<string, any>) => ({ ...prev, [key]: value }));

  return (
    <div className="space-y-6">
      <div className="backdrop-blur-glass bg-white/5 rounded-xl p-6 border border-white/10">
        <h2 className="text-xl font-semibold mb-4">Memory Search Settings Center</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-300">Provider</label>
            <input className="w-full rounded-lg bg-slate-800 border border-white/10 px-3 py-2 text-white" value={draft.provider || ''} onChange={(e)=>set('provider', e.target.value)} />
            <HelpBlock item={help.provider} />
          </div>
          <div>
            <label className="block text-sm text-slate-300">Model</label>
            <input className="w-full rounded-lg bg-slate-800 border border-white/10 px-3 py-2 text-white" value={draft.model || ''} onChange={(e)=>set('model', e.target.value)} />
            <HelpBlock item={help.model} />
          </div>
          <div>
            <label className="block text-sm text-slate-300">Fallback</label>
            <input className="w-full rounded-lg bg-slate-800 border border-white/10 px-3 py-2 text-white" value={draft.fallback || ''} onChange={(e)=>set('fallback', e.target.value)} />
            <HelpBlock item={help.fallback} />
          </div>
          <div>
            <label className="block text-sm text-slate-300">Extra Paths（每行一個）</label>
            <textarea className="w-full min-h-[100px] rounded-lg bg-slate-800 border border-white/10 px-3 py-2 text-white font-mono" value={(draft.extraPaths || []).join('\n')} onChange={(e)=>set('extraPaths', e.target.value.split('\n').map(v=>v.trim()).filter(Boolean))} />
            <HelpBlock item={help.extraPaths} />
          </div>
        </div>
      </div>

      <div className="backdrop-blur-glass bg-white/5 rounded-xl p-6 border border-white/10">
        <h3 className="text-lg font-semibold mb-4">Hybrid Search</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg bg-slate-900/40 p-3"><label className="text-sm text-slate-300 flex items-center gap-2"><input type="checkbox" checked={!!draft.hybridEnabled} onChange={(e)=>set('hybridEnabled', e.target.checked)} /> 啟用 Hybrid Search</label><div className="mt-2 text-xs text-slate-400">同時使用語意搜尋與關鍵字搜尋，讓檢索更準。預設通常關閉，資料量大時建議開。</div><HelpBlock item={help.hybridEnabled} /></div>
          <div className="rounded-lg bg-slate-900/40 p-3"><label className="text-sm text-slate-300 flex items-center gap-2"><input type="checkbox" checked={!!draft.mmrEnabled} onChange={(e)=>set('mmrEnabled', e.target.checked)} /> 啟用 MMR</label><div className="mt-2 text-xs text-slate-400">避免搜尋結果太重複，讓返回內容更多樣。當結果常常很像時可開。</div><HelpBlock item={help.mmrEnabled} /></div>
          <div className="rounded-lg bg-slate-900/40 p-3"><label className="text-sm text-slate-300 flex items-center gap-2"><input type="checkbox" checked={!!draft.temporalDecayEnabled} onChange={(e)=>set('temporalDecayEnabled', e.target.checked)} /> 啟用 Temporal Decay</label><div className="mt-2 text-xs text-slate-400">讓新的記憶比舊的記憶更容易排前面，適合每日筆記很多的場景。</div><HelpBlock item={help.temporalDecayEnabled} /></div>
          <div className="rounded-lg bg-slate-900/40 p-3"><label className="text-sm text-slate-300 flex items-center gap-2"><input type="checkbox" checked={!!draft.cacheEnabled} onChange={(e)=>set('cacheEnabled', e.target.checked)} /> 啟用 Cache</label><div className="mt-2 text-xs text-slate-400">快取嵌入結果，加快重建速度並降低重複計算成本，但會占用額外空間。</div><HelpBlock item={help.cacheEnabled} /></div>
          <div><label className="block text-sm text-slate-300">Vector Weight</label><div className="mb-2 text-xs text-slate-400">語意向量搜尋的權重。數值越高，越偏向語意相近的結果。常見預設值：0.7。</div><input type="number" step="0.1" className="w-full rounded-lg bg-slate-800 border border-white/10 px-3 py-2 text-white" value={draft.vectorWeight ?? 0.7} onChange={(e)=>set('vectorWeight', Number(e.target.value))} /><div className="mt-2 text-xs text-slate-500">若您希望「意思接近」比「字詞相同」更重要，就調高它。</div></div>
          <div><label className="block text-sm text-slate-300">Text Weight</label><div className="mb-2 text-xs text-slate-400">關鍵字 / 全文搜尋的權重。數值越高，越偏向字面命中。常見預設值：0.3。</div><input type="number" step="0.1" className="w-full rounded-lg bg-slate-800 border border-white/10 px-3 py-2 text-white" value={draft.textWeight ?? 0.3} onChange={(e)=>set('textWeight', Number(e.target.value))} /><div className="mt-2 text-xs text-slate-500">若常搜尋 ID、路徑、指令名稱、關鍵字，就可以提高它。</div></div>
          <div><label className="block text-sm text-slate-300">MMR Lambda</label><input type="number" step="0.1" className="w-full rounded-lg bg-slate-800 border border-white/10 px-3 py-2 text-white" value={draft.mmrLambda ?? 0.7} onChange={(e)=>set('mmrLambda', Number(e.target.value))} /><HelpBlock item={help.mmrEnabled} /></div>
          <div><label className="block text-sm text-slate-300">Half Life Days</label><input type="number" className="w-full rounded-lg bg-slate-800 border border-white/10 px-3 py-2 text-white" value={draft.halfLifeDays ?? 30} onChange={(e)=>set('halfLifeDays', Number(e.target.value))} /><HelpBlock item={help.temporalDecayEnabled} /></div>
          <div><label className="block text-sm text-slate-300">Cache Max Entries</label><input type="number" className="w-full rounded-lg bg-slate-800 border border-white/10 px-3 py-2 text-white" value={draft.cacheMaxEntries ?? 50000} onChange={(e)=>set('cacheMaxEntries', Number(e.target.value))} /><HelpBlock item={help.cacheEnabled} /></div>
        </div>
      </div>

      <button disabled={!!busy} onClick={() => onSave(draft)} className="rounded-lg bg-indigo-600 px-4 py-2 text-white disabled:opacity-50">{busy === 'save-memory' ? '儲存中...' : '儲存 Memory Search 設定'}</button>
    </div>
  );
}
