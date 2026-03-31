import { ArchiveRestore, RotateCcw, Trash2 } from 'lucide-react';
import type { BackupItem } from '../types';

interface Props {
  backups: BackupItem[];
  busy: string | null;
  onRollback: (backupPath: string) => void;
  onDelete: (backupPath: string) => void;
}

export default function AgentSection({ backups, busy, onRollback, onDelete }: Props) {
  return (
    <div className="backdrop-blur-glass bg-white/5 rounded-xl p-6 border border-white/10">
      <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
        <ArchiveRestore className="w-5 h-5" /> 備份與回滾
      </h2>

      <div className="space-y-3">
        {backups.length === 0 && <div className="text-slate-400">尚未建立備份。第一次安全儲存後就會出現在這裡。</div>}
        {backups.map((backup) => (
          <div key={backup.path} className="bg-slate-800/50 rounded-lg p-4 border border-white/5">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="font-medium text-white truncate">{backup.name}</div>
                <div className="text-xs text-slate-400 break-all">{backup.path}</div>
                <div className="text-xs text-slate-500 mt-1">{backup.createdAt} · {Math.round(backup.sizeBytes / 1024)} KB</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onDelete(backup.path)}
                  disabled={!!busy}
                  className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 disabled:opacity-50 transition-all"
                  title="刪除備份"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onRollback(backup.path)}
                  disabled={!!busy}
                  className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm flex items-center gap-2 shadow-lg shadow-indigo-900/20 active:scale-95 transition-all"
                >
                  <RotateCcw className="w-4 h-4" /> 回滾
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}