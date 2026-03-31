import React from 'react';
import { FileSearch, ShieldCheck, Wrench } from 'lucide-react';
import type { CommandResult, ConfigSummary, DraftValidation } from '../types';

interface Props {
  draftValidation: DraftValidation | null;
  cliValidation: CommandResult | null;
  doctorResult: CommandResult | null;
  summary: ConfigSummary | null;
}

function ResultCard({ title, icon, body }: { title: string; icon: React.ReactNode; body: React.ReactNode }) {
  return (
    <div className="bg-slate-800/50 rounded-lg p-4 border border-white/5">
      <div className="flex items-center gap-2 mb-3 text-white">{icon}{title}</div>
      {body}
    </div>
  );
}

export default function LLMSection({ draftValidation, cliValidation, doctorResult, summary }: Props) {
  return (
    <div className="backdrop-blur-glass bg-white/5 rounded-xl p-6 border border-white/10 space-y-4">
      <h2 className="text-xl font-semibold flex items-center gap-2">
        <FileSearch className="w-5 h-5" /> 驗證與結果面板
      </h2>

      <ResultCard
        title="Draft Validation"
        icon={<ShieldCheck className="w-4 h-4" />}
        body={<div className="text-sm text-slate-300 whitespace-pre-wrap">{draftValidation ? `${draftValidation.valid ? 'VALID' : 'INVALID'}\n${draftValidation.message}` : '尚未執行'}</div>}
      />

      <ResultCard
        title="CLI Validation"
        icon={<ShieldCheck className="w-4 h-4" />}
        body={<div className="text-xs text-slate-300 whitespace-pre-wrap">{cliValidation ? `success=${cliValidation.success}\nreturncode=${cliValidation.returncode}\nstdout:\n${cliValidation.stdout || '(empty)'}\nstderr:\n${cliValidation.stderr || '(empty)'}` : '尚未執行'}</div>}
      />

      <ResultCard
        title="Doctor"
        icon={<Wrench className="w-4 h-4" />}
        body={<div className="text-xs text-slate-300 whitespace-pre-wrap">{doctorResult ? `success=${doctorResult.success}\nreturncode=${doctorResult.returncode}\nstdout:\n${doctorResult.stdout || '(empty)'}\nstderr:\n${doctorResult.stderr || '(empty)'}` : '尚未執行'}</div>}
      />

      <ResultCard
        title="Config JSON Preview"
        icon={<FileSearch className="w-4 h-4" />}
        body={<pre className="text-xs text-slate-300 whitespace-pre-wrap overflow-auto max-h-80">{summary ? JSON.stringify(summary.config, null, 2).slice(0, 4000) : '載入中...'}</pre>}
      />
    </div>
  );
}