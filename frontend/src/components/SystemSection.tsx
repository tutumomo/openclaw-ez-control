import React from 'react';
import { Shield, RefreshCw, Wrench, Save, CheckCircle2 } from 'lucide-react';

interface Props {
  busy: string | null;
  onReload: () => void;
  onValidate: () => void;
  onSave: () => void;
  onDoctor: () => void;
}

export default function SystemSection({ busy, onReload, onValidate, onSave, onDoctor }: Props) {
  return (
    <div className="backdrop-blur-glass bg-white/5 rounded-xl p-6 border border-white/10">
      <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
        <Shield className="w-5 h-5" /> 安全操作面板
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button onClick={onReload} disabled={!!busy} className="rounded-xl bg-slate-800/50 p-5 text-left border border-white/5 hover:border-indigo-500 disabled:opacity-50">
          <div className="flex items-center gap-2 mb-2 text-white"><RefreshCw className="w-4 h-4" /> 重新載入</div>
          <div className="text-sm text-slate-400">重新讀取目前的 openclaw.json 與備份狀態</div>
        </button>

        <button onClick={onValidate} disabled={!!busy} className="rounded-xl bg-slate-800/50 p-5 text-left border border-white/5 hover:border-indigo-500 disabled:opacity-50">
          <div className="flex items-center gap-2 mb-2 text-white"><CheckCircle2 className="w-4 h-4" /> Validate</div>
          <div className="text-sm text-slate-400">執行 draft JSON 驗證與 `openclaw config validate`</div>
        </button>

        <button onClick={onSave} disabled={!!busy} className="rounded-xl bg-indigo-600/30 p-5 text-left border border-indigo-500/30 hover:border-indigo-400 disabled:opacity-50">
          <div className="flex items-center gap-2 mb-2 text-white"><Save className="w-4 h-4" /> 安全儲存</div>
          <div className="text-sm text-slate-300">先備份，再寫入，再執行 validate / doctor</div>
        </button>

        <button onClick={onDoctor} disabled={!!busy} className="rounded-xl bg-slate-800/50 p-5 text-left border border-white/5 hover:border-indigo-500 disabled:opacity-50">
          <div className="flex items-center gap-2 mb-2 text-white"><Wrench className="w-4 h-4" /> Doctor</div>
          <div className="text-sm text-slate-400">手動執行 `openclaw doctor --non-interactive`</div>
        </button>
      </div>

      {busy && <div className="mt-4 text-sm text-indigo-300">目前執行中：{busy}</div>}
    </div>
  );
}