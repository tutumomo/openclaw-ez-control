import React, { useEffect, useMemo, useState } from 'react';
import { Settings, Shield, Archive, FileJson, RefreshCw, Wrench, Table2, SlidersHorizontal, BrainCircuit, Puzzle, MessageCircle, UserCircle } from 'lucide-react';
import NavBar from './components/NavBar';
import DashboardSection from './components/DashboardSection';
import LLMSection from './components/LLMSection';
import AgentSection from './components/AgentSection';
import SystemSection from './components/SystemSection';
import TerminalLog from './components/TerminalLog';
import GlobalModelCenter from './components/GlobalModelCenter';
import AgentModelTable from './components/AgentModelTable';
import MemorySettingsCenter from './components/MemorySettingsCenter';
import PluginWizardCenter from './components/PluginWizardCenter';
import ChannelsCenter from './components/ChannelsCenter';
import SkillsCenter from './components/SkillsCenter';
import { getMemorySummary, getModelSummary, getPluginWizardSummary, getSystemStatus, listBackups, loadConfig, resetAgentModels, rollbackBackup, deleteBackup, runDoctor, runPluginWizardConfigure, runPluginWizardInstall, runPluginWizardValidate, saveConfig, saveMemorySettings, updateAgentModels, updateGlobalModels, validateConfig, getTelegramChannels, updateTelegramChannels, getSkillsSummary, toggleSkill, removeSkill, pullSkill, cloneSkill, getAgents, updateAgent } from './api';
import type { AgentModelRow, BackupItem, CommandResult, ConfigSummary, DraftValidation, MemorySummaryResponse, ModelGlobals, PluginWizardActionResult, PluginWizardSummaryResponse, SystemStatus, TelegramChannelsResponse, SkillsSummaryResponse, TelegramAccount, AgentsSummaryResponse } from './types';
import AgentsManager from './components/AgentsManager';

function App() {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [logs, setLogs] = useState<string[]>(['🚀 OpenClaw EZ-Control A1 啟動']);
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [summary, setSummary] = useState<ConfigSummary | null>(null);
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [draftValidation, setDraftValidation] = useState<DraftValidation | null>(null);
  const [cliValidation, setCliValidation] = useState<CommandResult | null>(null);
  const [doctorResult, setDoctorResult] = useState<CommandResult | null>(null);
  const [modelGlobals, setModelGlobals] = useState<ModelGlobals | null>(null);
  const [agentModels, setAgentModels] = useState<AgentModelRow[]>([]);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [memorySummary, setMemorySummary] = useState<MemorySummaryResponse | null>(null);
  const [pluginWizardSummary, setPluginWizardSummary] = useState<PluginWizardSummaryResponse | null>(null);
  const [pluginWizardLastResult, setPluginWizardLastResult] = useState<PluginWizardActionResult | null>(null);
  const [channelsSummary, setChannelsSummary] = useState<TelegramChannelsResponse | null>(null);
  const [skillsSummary, setSkillsSummary] = useState<SkillsSummaryResponse | null>(null);
  const [agentsSummary, setAgentsSummary] = useState<AgentsSummaryResponse | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const pushNotice = (type: 'success' | 'error' | 'info', message: string) => {
    setNotice({ type, message });
  };

  const refreshAll = async () => {
    setBusy('refresh');
    setError(null);
    try {
      const allRes = await Promise.all([
        getSystemStatus(), loadConfig(), listBackups(), getModelSummary(), getMemorySummary(), getPluginWizardSummary(), getTelegramChannels(), getSkillsSummary(), getAgents()
      ]);
      setStatus(allRes[0]); 
      setSummary(allRes[1]); 
      setCliValidation(allRes[1].cliValidation ?? null);
      setBackups(allRes[2].items); 
      setModelGlobals(allRes[3].globals); 
      setAgentModels(allRes[3].agents); 
      setAvailableModels(allRes[3].availableModels); 
      setMemorySummary(allRes[4]); 
      setPluginWizardSummary(allRes[5]); 
      setChannelsSummary(allRes[6]); 
      setSkillsSummary(allRes[7]); 
      setAgentsSummary(allRes[8]);

      addLog('已重新載入設定、狀態與備份清單');
      pushNotice('info', '已同步最新設定與備份狀態');
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || '載入失敗';
      setError(msg);
      addLog(`載入失敗：${msg}`);
      pushNotice('error', `載入失敗：${msg}`);
    } finally {
      setBusy(null);
    }
  };

  const handleSaveChannels = async (payload: { enabled: boolean; accounts: Record<string, TelegramAccount> }) => {
    setBusy('save-channels');
    setError(null);
    try {
      const result = await updateTelegramChannels(payload);
      setCliValidation(result.cliValidation ?? null);
      setDoctorResult(result.doctor ?? null);
      addLog('Telegram 通訊設定已更新');
      pushNotice(result.success ? 'success' : 'error', result.success ? 'Telegram 通訊設定已儲存' : '通訊設定儲存失敗');
      await refreshAll();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || '通訊設定儲存失敗';
      setError(msg);
      addLog(`通訊設定儲存失敗：${msg}`);
      pushNotice('error', `通訊設定儲存失敗：${msg}`);
    } finally {
      setBusy(null);
    }
  };

  const handleToggleSkill = async (skillId: string, enabled: boolean) => {
    setBusy('toggle-skill');
    try {
      const result = await toggleSkill(skillId, enabled);
      addLog(`技能 ${skillId} 已${enabled ? '啟用':'停用'}`);
      pushNotice(result.success ? 'success' : 'error', result.success ? `技能 ${skillId} 已${enabled ? '啟用':'停用'}` : `技能切換失敗`);
      await refreshAll();
    } catch (err: any) {
      pushNotice('error', `切換失敗: ${err?.message}`);
    } finally { setBusy(null); }
  };

  const handleRemoveSkill = async (skillId: string, deleteFiles: boolean, skillPath: string) => {
    setBusy('remove-skill');
    try {
      const result = await removeSkill(skillId, deleteFiles, skillPath);
      addLog(`技能 ${skillId} 已移除${deleteFiles ? ' (含檔案刪除)' : ''}`);
      pushNotice(result.success ? 'success' : 'error', result.success ? `技能 ${skillId} 已移除` : `技能移除失敗`);
      await refreshAll();
    } catch (err: any) {
      pushNotice('error', `移除失敗: ${err?.message}`);
    } finally { setBusy(null); }
  };

  const handlePullSkill = async (skillPath: string) => {
    setBusy('pull-skill');
    try {
      const result = await pullSkill(skillPath);
      addLog(`技能 Git Pull 更新：${result.success ? 'OK' : 'FAIL'}`);
      pushNotice(result.success ? 'success' : 'error', result.success ? `已更新技能原始碼` : `技能更新失敗: ${result.message || '未知錯誤'}`);
    } catch (err: any) {
      pushNotice('error', `更新失敗: ${err?.message}`);
    } finally { setBusy(null); }
  };

  const handleCloneSkill = async (gitUrl: string, target: string) => {
    setBusy('clone-skill');
    try {
      const result = await cloneSkill(gitUrl, target);
      addLog(`技能 Git Clone 匯入：${result.success ? 'OK' : 'FAIL'}`);
      pushNotice(result.success ? 'success' : 'error', result.success ? `已成功匯入技能：${gitUrl}` : `技能匯入失敗: ${result.message || '未知錯誤'}`);
      await refreshAll();
    } catch (err: any) {
      pushNotice('error', `匯入失敗: ${err?.message}`);
    } finally { setBusy(null); }
  };

  const handleSaveMemorySettings = async (settings: Record<string, any>) => {
    setBusy('save-memory');
    setError(null);
    try {
      const result = await saveMemorySettings(settings);
      setDraftValidation(result.draftValidation ?? null);
      setCliValidation(result.cliValidation ?? null);
      setDoctorResult(result.doctor ?? null);
      addLog('Memory Search 設定已更新');
      pushNotice(result.success ? 'success' : 'error', result.success ? 'Memory Search 設定已儲存' : 'Memory Search 設定儲存失敗');
      await refreshAll();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Memory Search 設定儲存失敗';
      setError(msg);
      addLog(`Memory Search 設定儲存失敗：${msg}`);
      pushNotice('error', `Memory Search 設定儲存失敗：${msg}`);
    } finally {
      setBusy(null);
    }
  };

  const handlePluginWizardAction = async (pluginId: string, action: string) => {
    setBusy('plugin-wizard');
    setError(null);
    try {
      const result = await runPluginWizardInstall(pluginId, action);
      setPluginWizardLastResult(result);
      addLog(`插件精靈：${pluginId} / ${action} / ${result.success ? 'OK' : 'FAIL'}`);
      pushNotice(result.success ? 'success' : 'error', `${pluginId} ${action} 已執行`);
      await refreshAll();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || '插件精靈執行失敗';
      setError(msg);
      addLog(`插件精靈失敗：${msg}`);
      pushNotice('error', `插件精靈失敗：${msg}`);
    } finally {
      setBusy(null);
    }
  };

  const handlePluginWizardConfigure = async (pluginId: string) => {
    setBusy('plugin-wizard-configure');
    setError(null);
    try {
      const result = await runPluginWizardConfigure(pluginId);
      setPluginWizardLastResult(result);
      setDraftValidation(result.draftValidation ?? null);
      setCliValidation(result.cliValidation ?? null);
      setDoctorResult(result.doctor ?? null);
      addLog(`插件設定已套用：${pluginId}`);
      pushNotice(result.success ? 'success' : 'error', `${pluginId} 設定已套用`);
      await refreshAll();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || '插件設定失敗';
      setError(msg);
      addLog(`插件設定失敗：${msg}`);
      pushNotice('error', `插件設定失敗：${msg}`);
    } finally {
      setBusy(null);
    }
  };

  const handlePluginWizardValidate = async (pluginId: string) => {
    setBusy('plugin-wizard-validate');
    setError(null);
    try {
      const result = await runPluginWizardValidate(pluginId);
      setPluginWizardLastResult(result);
      setCliValidation(result.cliValidation ?? null);
      setDoctorResult(result.doctor ?? null);
      addLog(`插件驗證完成：${pluginId}`);
      pushNotice(result.cliValidation?.success && result.doctor?.success ? 'success' : 'error', `${pluginId} validate / doctor 已完成`);
      await refreshAll();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || '插件驗證失敗';
      setError(msg);
      addLog(`插件驗證失敗：${msg}`);
      pushNotice('error', `插件驗證失敗：${msg}`);
    } finally {
      setBusy(null);
    }
  };

  const handleSaveGlobalModels = async (payload: { model: string; fallbackModel: string; visionModel: string; modelFallbacks: string[]; visionFallbacks: string[] }) => {
    setBusy('save-global-models');
    setError(null);
    try {
      const result = await updateGlobalModels(payload);
      setDraftValidation(result.draftValidation ?? null);
      setCliValidation(result.cliValidation ?? null);
      setDoctorResult(result.doctor ?? null);
      addLog(`全域模型設定已更新：${payload.model || '(none)'}`);
      pushNotice(result.success ? 'success' : 'error', result.success ? '全域模型設定已儲存' : '全域模型設定儲存失敗');
      await refreshAll();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || '全域模型儲存失敗';
      setError(msg);
      addLog(`全域模型儲存失敗：${msg}`);
      pushNotice('error', `全域模型儲存失敗：${msg}`);
    } finally {
      setBusy(null);
    }
  };

  const handleSaveAgentModels = async (payload: { agentId: string; useDefaultModel: boolean; useDefaultFallbacks: boolean; useDefaultVision: boolean; model: string; fallbackModel: string; visionModel: string; modelFallbacks: string[]; visionFallbacks: string[] }) => {
    setBusy('save-agent-models');
    setError(null);
    try {
      const result = await updateAgentModels(payload);
      setDraftValidation(result.draftValidation ?? null);
      setCliValidation(result.cliValidation ?? null);
      setDoctorResult(result.doctor ?? null);
      addLog(`Agent ${payload.agentId} 模型設定已更新`);
      pushNotice(result.success ? 'success' : 'error', result.success ? `Agent ${payload.agentId} 已儲存` : `Agent ${payload.agentId} 儲存失敗`);
      await refreshAll();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'agent 模型儲存失敗';
      setError(msg);
      addLog(`Agent 模型儲存失敗：${msg}`);
      pushNotice('error', `Agent 模型儲存失敗：${msg}`);
    } finally {
      setBusy(null);
    }
  };

  const handleResetAgentModels = async (agentId: string) => {
    setBusy('reset-agent-models');
    setError(null);
    try {
      const result = await resetAgentModels(agentId);
      setDraftValidation(result.draftValidation ?? null);
      setCliValidation(result.cliValidation ?? null);
      setDoctorResult(result.doctor ?? null);
      addLog(`Agent ${agentId} 已重設為預設模型`);
      pushNotice(result.success ? 'success' : 'error', result.success ? `Agent ${agentId} 已重設` : `Agent ${agentId} 重設失敗`);
      await refreshAll();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'agent 模型重設失敗';
      setError(msg);
      addLog(`Agent 模型重設失敗：${msg}`);
      pushNotice('error', `Agent 模型重設失敗：${msg}`);
    } finally {
      setBusy(null);
    }
  };

  useEffect(() => {
    refreshAll();
  }, []);

  const handleValidate = async () => {
    if (!summary) return;
    setBusy('validate');
    setError(null);
    try {
      const result = await validateConfig(summary.config);
      setDraftValidation(result.draftValidation);
      setCliValidation(result.cliValidation);
      addLog(`validate 完成：draft=${result.draftValidation.valid ? 'OK' : 'FAIL'} / cli=${result.cliValidation.success ? 'OK' : 'FAIL'}`);
      pushNotice(result.draftValidation.valid && result.cliValidation.success ? 'success' : 'error', 'Validate 已完成');
      await refreshAll();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'validate 失敗';
      setError(msg);
      addLog(`validate 失敗：${msg}`);
      pushNotice('error', `Validate 失敗：${msg}`);
    } finally {
      setBusy(null);
    }
  };

  const handleDoctor = async () => {
    setBusy('doctor');
    setError(null);
    try {
      const result = await runDoctor();
      setDoctorResult(result);
      addLog(`doctor 完成：${result.success ? 'OK' : 'FAIL'}`);
      pushNotice(result.success ? 'success' : 'error', 'Doctor 已完成');
      await refreshAll();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'doctor 失敗';
      setError(msg);
      addLog(`doctor 失敗：${msg}`);
      pushNotice('error', `Doctor 失敗：${msg}`);
    } finally {
      setBusy(null);
    }
  };

  const handleSave = async () => {
    if (!summary) return;
    setBusy('save');
    setError(null);
    try {
      const result = await saveConfig(summary.config);
      setDraftValidation(result.draftValidation ?? null);
      setCliValidation(result.cliValidation ?? null);
      setDoctorResult(result.doctor ?? null);
      addLog(`安全儲存完成：${result.success ? '成功' : '失敗'}`);
      pushNotice(result.success ? 'success' : 'error', result.success ? '安全儲存成功，已建立備份' : '安全儲存失敗');
      await refreshAll();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || '儲存失敗';
      setError(msg);
      addLog(`儲存失敗：${msg}`);
      pushNotice('error', `儲存失敗：${msg}`);
    } finally {
      setBusy(null);
    }
  };

  const handleRollback = async (backupPath: string) => {
    setBusy('rollback');
    setError(null);
    try {
      const result = await rollbackBackup(backupPath);
      setCliValidation(result.cliValidation);
      setDoctorResult(result.doctor);
      addLog(`已回滾：${result.restore.source}`);
      pushNotice('success', '已完成回滾並重新驗證設定');
      await refreshAll();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || '回滾失敗';
      setError(msg);
      addLog(`回滾失敗：${msg}`);
      pushNotice('error', `回滾失敗：${msg}`);
    } finally {
      setBusy(null);
    }
  };

  const handleDeleteBackup = async (backupPath: string) => {
    const filename = backupPath.split('/').pop() || backupPath;
    if (!window.confirm(`確定要刪除備份檔 ${filename} 嗎？此操作不可逆。`)) return;

    setBusy('delete-backup');
    try {
      const res = await deleteBackup(backupPath);
      if (res.success) {
        addLog(`已刪除備份: ${filename}`);
        pushNotice('success', res.message || '備份已成功刪除');
        await refreshAll();
      } else {
        pushNotice('error', `刪除失敗: ${res.message}`);
      }
    } catch (err: any) {
      pushNotice('error', `刪除備份時發生錯誤: ${err.message}`);
    } finally {
      setBusy(null);
    }
  };

  const navItems = [
    { id: 'dashboard', label: '設定摘要', icon: Settings },
    { id: 'operations', label: '安全操作', icon: Shield },
    { id: 'backups', label: '備份回滾', icon: Archive },
    { id: 'agents', label: '代理管理', icon: UserCircle },
    { id: 'results', label: '結果面板', icon: FileJson },
    { id: 'global-models', label: '全域模型', icon: SlidersHorizontal },
    { id: 'agent-models', label: 'Agent 模型表', icon: Table2 },
    { id: 'memory-search', label: '記憶檢索', icon: BrainCircuit },
    { id: 'channels', label: '通訊通道', icon: MessageCircle },
    { id: 'skills', label: '技能管理', icon: Puzzle },
    { id: 'plugin-wizard', label: '插件精靈', icon: Wrench },
  ];

  const currentHealth = useMemo(() => {
    if (error) return 'error';
    if (cliValidation && !cliValidation.success) return 'warn';
    return 'ok';
  }, [error, cliValidation]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-200">
      <NavBar items={navItems} active={activeSection} onChange={setActiveSection} />

      <div className="container mx-auto px-6 py-8">
        {notice && (
          <div className={`mb-6 rounded-xl border px-4 py-3 text-sm ${notice.type === 'success' ? 'border-green-500/30 bg-green-500/10 text-green-300' : notice.type === 'error' ? 'border-red-500/30 bg-red-500/10 text-red-300' : 'border-blue-500/30 bg-blue-500/10 text-blue-300'}`}>
            {notice.message}
          </div>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {activeSection === 'dashboard' && (
              <DashboardSection summary={summary} status={status} health={currentHealth} error={error} cliValidation={cliValidation} />
            )}
            {activeSection === 'operations' && (
              <SystemSection
                busy={busy}
                onReload={refreshAll}
                onValidate={handleValidate}
                onSave={handleSave}
                onDoctor={handleDoctor}
              />
            )}
            {activeSection === 'backups' && (
              <AgentSection backups={backups} busy={busy} onRollback={handleRollback} onDelete={handleDeleteBackup} />
            )}
            {activeSection === 'results' && (
              <LLMSection draftValidation={draftValidation} cliValidation={cliValidation} doctorResult={doctorResult} summary={summary} />
            )}
            {activeSection === 'agents' && agentsSummary && skillsSummary && (
              <AgentsManager 
                summary={agentsSummary} 
                allSkills={skillsSummary.skills}
                onRefresh={refreshAll}
              />
            )}
            {activeSection === 'global-models' && modelGlobals && (
              <GlobalModelCenter availableModels={availableModels} globals={modelGlobals} busy={busy} onSave={handleSaveGlobalModels} />
            )}
            {activeSection === 'agent-models' && (
              <AgentModelTable agents={agentModels} availableModels={availableModels} busy={busy} onSave={handleSaveAgentModels} onReset={handleResetAgentModels} />
            )}
            { activeSection === 'memory-search' && memorySummary && (
              <MemorySettingsCenter settings={memorySummary.settings} help={memorySummary.help} busy={busy} onSave={handleSaveMemorySettings} />
            )}
            { activeSection === 'channels' && channelsSummary && (
              <ChannelsCenter channels={channelsSummary} busy={busy} onSave={handleSaveChannels} />
            )}
            { activeSection === 'skills' && skillsSummary && (
              <SkillsCenter skills={skillsSummary.skills} agents={skillsSummary.agents} busy={busy} onToggle={handleToggleSkill} onPull={handlePullSkill} onRemove={handleRemoveSkill} onClone={handleCloneSkill} />
            )}
            {activeSection === 'plugin-wizard' && pluginWizardSummary && (
              <PluginWizardCenter summary={pluginWizardSummary} busy={busy} lastResult={pluginWizardLastResult} onAction={handlePluginWizardAction} onConfigure={handlePluginWizardConfigure} onValidate={handlePluginWizardValidate} />
            )}
          </div>

          <div className="space-y-6">
            <TerminalLog logs={logs} />

            <div className="backdrop-blur-glass bg-white/5 rounded-xl p-5 border border-white/10">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Wrench className="w-5 h-5" /> 快速動作
              </h3>
              <div className="space-y-3">
                <button
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 px-4 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
                  disabled={!!busy}
                  onClick={handleDoctor}
                >
                  <Wrench className="w-4 h-4" /> {busy === 'doctor' ? '執行中...' : '執行 doctor'}
                </button>
                <button
                  className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 py-2.5 px-4 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
                  disabled={!!busy}
                  onClick={refreshAll}
                >
                  <RefreshCw className="w-4 h-4" /> {busy === 'refresh' ? '載入中...' : '重新載入'}
                </button>
              </div>
            </div>

            <div className="backdrop-blur-glass bg-white/5 rounded-xl p-5 border border-white/10">
              <h3 className="text-lg font-semibold mb-4">A1 系統狀態</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between gap-3"><span className="text-slate-400">Config Exists</span><span>{status?.configExists ? 'Yes' : 'No'}</span></div>
                <div className="flex justify-between gap-3"><span className="text-slate-400">Backups</span><span>{status?.backupCount ?? '-'}</span></div>
                <div className="flex justify-between gap-3"><span className="text-slate-400">Health</span><span className={currentHealth === 'ok' ? 'text-green-400' : currentHealth === 'warn' ? 'text-yellow-400' : 'text-red-400'}>{currentHealth}</span></div>
                <div className="text-slate-400 break-all">{status?.configPath}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
