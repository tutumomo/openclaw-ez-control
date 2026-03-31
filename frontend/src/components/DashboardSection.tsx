import { Activity, FileJson, HardDrive, Shield, AlertTriangle, XCircle } from 'lucide-react';
import type { ConfigSummary, SystemStatus, CommandResult } from '../types';

interface Props {
  summary: ConfigSummary | null;
  status: SystemStatus | null;
  health: string;
  error: string | null;
  cliValidation: CommandResult | null;
}

export default function DashboardSection({ summary, status, health, error, cliValidation }: Props) {
  return (
    <div className="backdrop-blur-glass bg-white/5 rounded-xl p-6 border border-white/10">
      <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
        <Activity className="w-5 h-5" /> 設定摘要
      </h2>

      {error && <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-red-300">{error}</div>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-800/50 rounded-lg p-4 border border-white/5">
          <div className="text-2xl font-bold text-white">{summary?.topLevelKeys.length ?? '-'}</div>
          <div className="text-sm text-slate-400">頂層區段</div>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-4 border border-white/5">
          <div className="text-2xl font-bold text-blue-400">{status?.backupCount ?? 0}</div>
          <div className="text-sm text-slate-400">備份數量</div>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-4 border border-white/5">
          <div className={`text-2xl font-bold ${health === 'ok' ? 'text-green-400' : health === 'warn' ? 'text-yellow-400' : 'text-red-400'}`}>{health}</div>
          <div className="text-sm text-slate-400">健康狀態</div>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-4 border border-white/5">
          <div className="text-2xl font-bold text-purple-400">{summary?.sizeBytes ? Math.round(summary.sizeBytes / 1024) : '-'} KB</div>
          <div className="text-sm text-slate-400">設定檔大小</div>
        </div>
      </div>

      {(health === 'warn' || health === 'error') && cliValidation && (
        <div className={`mb-6 rounded-xl border p-5 ${health === 'warn' ? 'border-yellow-500/30 bg-yellow-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
          <div className="flex items-center gap-3 mb-3">
            {health === 'warn' ? <AlertTriangle className="w-6 h-6 text-yellow-400" /> : <XCircle className="w-6 h-6 text-red-500" />}
            <span className={`text-lg font-bold ${health === 'warn' ? 'text-yellow-400' : 'text-red-400'}`}>
              系統診斷報告: {health === 'warn' ? '配置警告' : '嚴重錯誤'}
            </span>
          </div>
          <div className="bg-slate-950/80 rounded-lg border border-white/10 p-4 font-mono text-xs overflow-auto max-h-64 whitespace-pre-wrap text-slate-300 shadow-inner">
            {cliValidation.stderr || cliValidation.stdout || '無詳細錯誤訊息'}
          </div>
          <div className="mt-3 text-xs text-slate-500 italic">
            💡 提示：您可以前往「結果面板」查看完整指令執行細節。
          </div>
        </div>
      )}

      <div className="space-y-4 text-sm">
        <div className="bg-slate-800/40 rounded-lg p-4 border border-white/5">
          <div className="flex items-center gap-2 mb-2 text-slate-300"><FileJson className="w-4 h-4" /> Config 路徑</div>
          <div className="break-all text-slate-400">{summary?.configPath ?? status?.configPath ?? '載入中...'}</div>
        </div>
        <div className="bg-slate-800/40 rounded-lg p-4 border border-white/5">
          <div className="flex items-center gap-2 mb-2 text-slate-300"><Shield className="w-4 h-4" /> 最後修改時間</div>
          <div className="text-slate-400">{summary?.modifiedAt ?? status?.modifiedAt ?? '載入中...'}</div>
        </div>
        <div className="bg-slate-800/40 rounded-lg p-4 border border-white/5">
          <div className="flex items-center gap-2 mb-2 text-slate-300"><HardDrive className="w-4 h-4" /> Top-level keys</div>
          <div className="flex flex-wrap gap-2">
            {(summary?.topLevelKeys ?? []).map((key) => (
              <span key={key} className="rounded-full bg-slate-700 px-3 py-1 text-xs text-slate-300">{key}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}