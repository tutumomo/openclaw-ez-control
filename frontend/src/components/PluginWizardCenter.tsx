import React from 'react';
import type { PluginWizardActionResult, PluginWizardPluginStatus, PluginWizardSummaryResponse } from '../types';

interface Props {
  summary: PluginWizardSummaryResponse;
  busy: string | null;
  lastResult: PluginWizardActionResult | null;
  onAction: (pluginId: string, action: string) => void;
  onConfigure: (pluginId: string) => void;
  onValidate: (pluginId: string) => void;
}

function StatusRow({ label, value, ok }: { label: string; value: React.ReactNode; ok?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-900/40 px-3 py-2 border border-white/5 text-sm">
      <span className="text-slate-400">{label}</span>
      <span className={ok === undefined ? 'text-slate-200' : ok ? 'text-green-400' : 'text-yellow-400'}>{value}</span>
    </div>
  );
}

function CommandBlock({ command, stdout, stderr, returncode, success }: { command?: string[]; stdout?: string; stderr?: string; returncode?: number; success?: boolean }) {
  return (
    <div className="rounded-xl bg-slate-950/80 border border-white/10 p-4 space-y-3">
      <div className="text-xs text-slate-400">command</div>
      <pre className="text-xs text-emerald-300 whitespace-pre-wrap break-all">{command?.join(' ') || '(none)'}</pre>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div>
          <div className="text-xs text-slate-400 mb-1">stdout</div>
          <pre className="max-h-56 overflow-auto rounded bg-slate-900/80 p-3 text-xs text-slate-200 whitespace-pre-wrap">{stdout || '(empty)'}</pre>
        </div>
        <div>
          <div className="text-xs text-slate-400 mb-1">stderr</div>
          <pre className="max-h-56 overflow-auto rounded bg-slate-900/80 p-3 text-xs text-rose-300 whitespace-pre-wrap">{stderr || '(empty)'}</pre>
        </div>
      </div>
      <div className="text-xs text-slate-400">exit code: {returncode ?? '-'} · result: <span className={success ? 'text-green-400' : 'text-rose-400'}>{success ? 'success' : 'failed'}</span></div>
    </div>
  );
}

function PluginCard({
  id,
  item,
  busy,
  onAction,
  onConfigure,
  onValidate,
}: {
  id: string;
  item: PluginWizardPluginStatus;
  busy: string | null;
  onAction: (pluginId: string, action: string) => void;
  onConfigure: (pluginId: string) => void;
  onValidate: (pluginId: string) => void;
}) {
  return (
    <div className="backdrop-blur-glass bg-white/5 rounded-xl p-6 border border-white/10 space-y-4">
      <div>
        <h3 className="text-lg font-semibold">{id}</h3>
        <div className="text-xs text-slate-400 break-all mt-1">{item.repo}</div>
        <div className="text-xs text-slate-500 break-all">{item.pluginDir}</div>
      </div>

      <div className="grid grid-cols-1 gap-2">
        <StatusRow label="Repository cloned" value={item.dirExists ? 'yes' : 'no'} ok={item.dirExists} />
        <StatusRow label="Installed in openclaw.json" value={item.installed ? 'yes' : 'no'} ok={item.installed} />
        <StatusRow label="Enabled" value={item.enabled ? 'yes' : 'no'} ok={item.enabled} />
        <StatusRow label="Config present" value={item.configPresent ? 'yes' : 'no'} ok={item.configPresent} />
        {'slotted' in item && <StatusRow label="Memory slot" value={item.slotted ? 'bound' : 'not bound'} ok={item.slotted} />}
        {id === 'lossless-claw-enhanced' && (
          <>
            <StatusRow label="Plugin entry id" value={item.entryId || 'lossless-claw'} />
            <StatusRow label="Context threshold" value={item.contextThreshold ?? 'default'} />
          </>
        )}
      </div>

      <div className="flex gap-2 flex-wrap">
        <button disabled={!!busy} onClick={() => onAction(id, 'clone')} className="rounded bg-indigo-600 px-3 py-2 text-sm text-white disabled:opacity-50">Step 2A：Clone</button>
        {id === 'memory-lancedb-pro' && <button disabled={!!busy} onClick={() => onAction(id, 'setup')} className="rounded bg-slate-700 px-3 py-2 text-sm text-white disabled:opacity-50">Step 2B：Setup</button>}
        <button disabled={!!busy} onClick={() => onAction(id, 'install')} className="rounded bg-emerald-600 px-3 py-2 text-sm text-white disabled:opacity-50">Step 3：Install</button>
        <button disabled={!!busy} onClick={() => onConfigure(id)} className="rounded bg-amber-600 px-3 py-2 text-sm text-white disabled:opacity-50">Step 4：Configure</button>
        <button disabled={!!busy} onClick={() => onValidate(id)} className="rounded bg-cyan-600 px-3 py-2 text-sm text-white disabled:opacity-50">Step 5：Validate</button>
      </div>

      <div className="rounded-lg bg-slate-900/40 p-3 text-xs text-slate-400 space-y-1">
        {id === 'lossless-claw-enhanced' ? (
          <>
            <div>• configure 會改用正確 plugin id `lossless-claw`，並清除不符合 schema 的舊 key。</div>
            <div>• validate 會顯示 openclaw config validate 與 doctor 結果，方便立即確認 openclaw.json 健康度。</div>
          </>
        ) : (
          <>
            <div>• configure 會自動綁定 memory slot 與 plugin entry。</div>
            <div>• setup 階段會下載並執行官方 setup script。</div>
          </>
        )}
      </div>
    </div>
  );
}

export default function PluginWizardCenter({ summary, busy, lastResult, onAction, onConfigure, onValidate }: Props) {
  const plugins = summary?.plugins || {};
  const checks = summary?.checks || {};
  const website = summary?.website;

  return (
    <div className="space-y-6">
      <div className="backdrop-blur-glass bg-white/5 rounded-xl p-6 border border-white/10 space-y-4">
        <div>
          <h2 className="text-xl font-semibold mb-2">插件安裝精靈</h2>
          <div className="text-sm text-slate-400">現在會顯示每一步的 commands / stdout / stderr / exit code，並同步回報插件配置狀態。</div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg bg-slate-900/50 p-4 border border-white/10">
            <div className="text-slate-400 mb-1">網站提供模式</div>
            <div className="text-slate-200">Backend 直接提供前端 build</div>
            <div className="text-xs text-slate-500 mt-1 break-all">dist: {website?.frontendDistPath || '-'}</div>
          </div>
          <div className="rounded-lg bg-slate-900/50 p-4 border border-white/10">
            <div className="text-slate-400 mb-1">前端 build 狀態</div>
            <div className={website?.frontendDistReady ? 'text-green-400' : 'text-yellow-400'}>{website?.frontendDistReady ? 'ready' : 'not built yet'}</div>
          </div>
        </div>
      </div>

      <div className="backdrop-blur-glass bg-white/5 rounded-xl p-6 border border-white/10">
        <h3 className="text-lg font-semibold mb-4">Step 1：前置檢查</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
          {Object.entries(checks).map(([key, ok]) => (
            <div key={key} className="rounded-lg bg-slate-900/50 p-3 border border-white/10">
              <div className="text-slate-400">{key}</div>
              <div className={ok ? 'text-green-400' : 'text-red-400'}>{ok ? '可用' : '缺少'}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(plugins).map(([id, item]) => (
          <PluginCard
            key={id}
            id={id}
            item={item}
            busy={busy}
            onAction={onAction}
            onConfigure={onConfigure}
            onValidate={onValidate}
          />
        ))}
      </div>

      <div className="backdrop-blur-glass bg-white/5 rounded-xl p-6 border border-white/10 space-y-4">
        <h3 className="text-lg font-semibold">結果面板</h3>
        {!lastResult ? (
          <div className="text-sm text-slate-400">尚未執行插件精靈動作。</div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg bg-slate-900/50 p-4 border border-white/10 text-sm space-y-1">
              <div><span className="text-slate-400">plugin:</span> {lastResult.pluginId || '-'}</div>
              <div><span className="text-slate-400">action:</span> {lastResult.action || 'validate/configure'}</div>
              <div><span className="text-slate-400">overall:</span> <span className={lastResult.success ? 'text-green-400' : 'text-rose-400'}>{lastResult.success ? 'success' : 'failed'}</span></div>
            </div>

            {lastResult.changes?.notes?.length ? (
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-4 text-sm text-amber-200">
                {lastResult.changes.notes.map((note, idx) => <div key={idx}>• {note}</div>)}
              </div>
            ) : null}

            {lastResult.steps?.map((step, idx) => (
              <div key={`${step.step}-${idx}`} className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium text-slate-100">{step.label}</span>
                  <span className={step.success ? 'text-green-400' : 'text-rose-400'}>{step.success ? 'OK' : 'FAIL'}</span>
                  {step.skipped && <span className="text-yellow-400">(skipped)</span>}
                </div>
                {step.message && <div className="text-xs text-slate-400">{step.message}</div>}
                {step.result && <CommandBlock {...step.result} />}
              </div>
            ))}

            {lastResult.cliValidation && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-slate-100">openclaw config validate</div>
                <CommandBlock {...lastResult.cliValidation} />
              </div>
            )}

            {lastResult.doctor && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-slate-100">openclaw doctor</div>
                <CommandBlock {...lastResult.doctor} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
