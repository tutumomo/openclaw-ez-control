import React, { useState, useEffect } from 'react';
import { UserCircle, Brain, ShieldCheck, MessageSquare, Save, Settings2, Info, ChevronRight, CheckCircle2, AlertCircle, RefreshCw, Wrench, Code2, FileText, FileCode, Copy, Trash2, SearchCheck, Zap, Shield, Key, Check, X } from 'lucide-react';
import type { AgentConfig, AgentsSummaryResponse, SaveResponse, SkillItem, AgentFile, AgentIsolationStatus, InstanceConfigResponse } from '../types';
import { updateAgent, getAgentFiles, updateAgentFile, deleteAgent, cloneAgent, runDoctor, checkAgent, optimizeAgent, getAgentIsolation, provisionAgentIsolation, getAgentInstanceConfig, saveAgentInstanceConfig } from '../api';

interface AgentsManagerProps {
  summary: AgentsSummaryResponse;
  allSkills: SkillItem[];
  onRefresh: () => Promise<void>;
}

export default function AgentsManager({ summary, allSkills, onRefresh }: AgentsManagerProps) {
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(summary.agents[0]?.id || null);
  const [editingAgent, setEditingAgent] = useState<AgentConfig | null>(null);
  const [activeTab, setActiveTab] = useState<'identity' | 'brain' | 'capabilities' | 'social' | 'memory' | 'files' | 'isolation' | 'vault'>('identity');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [agentFiles, setAgentFiles] = useState<AgentFile[]>([]);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [fileEditingContent, setFileEditingContent] = useState<string>('');
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);

  // New Isolation & Vault State
  const [isolationStatus, setIsolationStatus] = useState<AgentIsolationStatus | null>(null);
  const [instanceConfig, setInstanceConfig] = useState<string>('{}');
  const [isProvisioning, setIsProvisioning] = useState(false);

  const selectedAgent = summary.agents.find(a => a.id === selectedAgentId);

  useEffect(() => {
    if (selectedAgent) {
      setEditingAgent(JSON.parse(JSON.stringify(selectedAgent)));
      setSaveStatus(null);
      fetchAgentFiles(selectedAgent.id);
      fetchIsolationAndVault(selectedAgent.id);
    }
  }, [selectedAgentId, summary.agents]);

  const fetchAgentFiles = async (agentId: string) => {
    setIsLoadingFiles(true);
    try {
      const files = await getAgentFiles(agentId);
      setAgentFiles(files);
      if (files.length > 0) {
        setSelectedFileName(files[0].filename);
        setFileEditingContent(files[0].content);
      } else {
        setSelectedFileName(null);
        setFileEditingContent('');
      }
    } catch (err) {
      console.error("Failed to fetch agent files", err);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const fetchIsolationAndVault = async (agentId: string) => {
    try {
      const [iso, vault] = await Promise.all([
        getAgentIsolation(agentId),
        getAgentInstanceConfig(agentId)
      ]);
      setIsolationStatus(iso);
      setInstanceConfig(JSON.stringify(vault.config, null, 2));
    } catch (err) {
      console.error("Failed to fetch isolation/vault data", err);
    }
  };

  const handleProvision = async () => {
    if (!editingAgent) return;
    setIsProvisioning(true);
    try {
      const res = await provisionAgentIsolation(editingAgent.id);
      if (res.success) {
        setSaveStatus({ type: 'success', message: res.message || '隔離環境初始化成功！' });
        await fetchIsolationAndVault(editingAgent.id);
      } else {
        setSaveStatus({ type: 'error', message: res.message || '初始化失敗' });
      }
    } catch (err: any) {
      setSaveStatus({ type: 'error', message: err.message || '初始化過程發生錯誤' });
    } finally {
      setIsProvisioning(false);
    }
  };

  const handleSaveVault = async () => {
    if (!editingAgent) return;
    try {
      let configObj;
      try {
        configObj = JSON.parse(instanceConfig);
      } catch (e) {
        setSaveStatus({ type: 'error', message: '憑證格式錯誤，請確保為標準 JSON 格式。' });
        return;
      }
      setIsSaving(true);
      const res = await saveAgentInstanceConfig(editingAgent.id, configObj);
      if (res.success) {
        setSaveStatus({ type: 'success', message: '憑證金庫已安全儲存！' });
      } else {
        setSaveStatus({ type: 'error', message: res.message || '憑證儲存失敗' });
      }
    } catch (err: any) {
      setSaveStatus({ type: 'error', message: err.message || '儲存過程發生錯誤' });
    } finally {
      setIsSaving(false);
    }
  };

  if (!editingAgent) return <div className="p-8 text-slate-400">尚未載入 Agent 資料</div>;

  const handleUpdateField = (path: string, value: any) => {
    const newConfig = { ...editingAgent };
    const parts = path.split('.');
    let current: any = newConfig;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) current[parts[i]] = {};
      current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = value;
    setEditingAgent(newConfig);
  };

  const handleSave = async () => {
    if (!editingAgent.id) return;
    setIsSaving(true);
    setSaveStatus(null);
    try {
      if (activeTab === 'files' && selectedFileName) {
        const res = await updateAgentFile(editingAgent.id, selectedFileName, fileEditingContent);
        if (res.success) {
          setSaveStatus({ type: 'success', message: `檔案 ${selectedFileName} 儲存成功！` });
          await fetchAgentFiles(editingAgent.id);
        } else {
          setSaveStatus({ type: 'error', message: res.message || '檔案儲存失敗' });
        }
      } else {
        const { id, ...updates } = editingAgent;
        const res = await updateAgent(id, updates);
        if (res.success) {
          setSaveStatus({ type: 'success', message: 'Agent 設定儲存成功！' });
          await onRefresh();
        } else {
          setSaveStatus({ type: 'error', message: res.cliValidation?.stderr || '儲存失敗' });
        }
      }
    } catch (err: any) {
      setSaveStatus({ type: 'error', message: err.message || '發生未知錯誤' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClone = async () => {
    if (!editingAgent) return;
    const targetId = prompt(`請輸入新 Agent 的 ID (來源: ${editingAgent.id})`, `${editingAgent.id}_copy`);
    if (!targetId || targetId === editingAgent.id) return;

    setIsSaving(true);
    setSaveStatus(null);
    try {
      const res = await cloneAgent(editingAgent.id, targetId);
      if (res.success) {
        setSaveStatus({ type: 'success', message: res.message || '複製成功！' });
        await onRefresh();
        setSelectedAgentId(targetId);
      } else {
        setSaveStatus({ type: 'error', message: res.message || '複製失敗' });
      }
    } catch (err: any) {
      setSaveStatus({ type: 'error', message: err.message || '複製過程發生錯誤' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingAgent) return;
    const confirmId = prompt(`⚠️ 警告：這將會物理刪除 ${editingAgent.id} 的所有設定與實體檔案！操作不可逆。\n\n確認刪除請輸入 Agent ID: ${editingAgent.id}`);
    if (confirmId !== editingAgent.id) return;

    setIsSaving(true);
    setSaveStatus(null);
    try {
      const res = await deleteAgent(editingAgent.id);
      if (res.success) {
        setSaveStatus({ type: 'success', message: res.message || '刪除成功' });
        await onRefresh();
        setSelectedAgentId(summary.agents[0]?.id || null);
      } else {
        setSaveStatus({ type: 'error', message: res.message || '刪除失敗' });
      }
    } catch (err: any) {
      setSaveStatus({ type: 'error', message: err.message || '刪除過程發生錯誤' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDetect = async () => {
    if (!editingAgent) return;
    setIsSaving(true);
    setSaveStatus({ type: 'success', message: `正在對 Agent "${editingAgent.id}" 進行環境與配置檢測...` });
    try {
      const res = await checkAgent(editingAgent.id);
      if (res.success) {
        if (res.issues && res.issues.length > 0) {
          setSaveStatus({ 
            type: res.status === 'error' ? 'error' : 'success', 
            message: `檢測完成，發現以下事項：\n${res.issues.join('\n')}` 
          });
        } else {
          setSaveStatus({ type: 'success', message: `檢測完成：Agent "${editingAgent.id}" 配置與環境狀態良好。` });
        }
      } else {
        setSaveStatus({ type: 'error', message: `檢測失敗：${res.message}` });
      }
    } catch (err: any) {
      setSaveStatus({ type: 'error', message: `檢測過程發生錯誤: ${err.message}` });
    } finally {
      setIsSaving(false);
    }
  };

  const handleOptimize = async () => {
    if (!editingAgent) return;
    setIsSaving(true);
    setSaveStatus({ type: 'success', message: `正在優化 Agent "${editingAgent.id}" 的配置結構...` });
    try {
      const res = await optimizeAgent(editingAgent.id);
      if (res.success) {
        if (res.changes && res.changes.length > 0) {
          setSaveStatus({ type: 'success', message: `優化完成：\n${res.changes.join('\n')}` });
          await onRefresh(); 
        } else {
          setSaveStatus({ type: 'success', message: res.message || '配置已是最佳狀態。' });
        }
      } else {
        setSaveStatus({ type: 'error', message: `優化失敗：${res.message}` });
      }
    } catch (err: any) {
      setSaveStatus({ type: 'error', message: `優化過程發生錯誤: ${err.message}` });
    } finally {
      setIsSaving(false);
    }
  };

  const toolGroups = [
    { label: '對話與紀錄 (Sessions)', tools: ['sessions_list', 'sessions_history', 'sessions_send', 'message'] },
    { label: '檔案系統 (FileSystem)', tools: ['read', 'write', 'edit', 'ls', 'rm', 'mkdir', 'mv', 'cp'] },
    { label: '網路功能 (Web)', tools: ['web_search', 'web_fetch', 'browser'] },
    { label: '專業工具 (Engineering/Office)', tools: ['docx', 'xlsx', 'mcp-civil-tools', 'engineering-composer', 'guushan-budget-master', 'dwg-to-excel'] },
  ];

  const currentTools = editingAgent.tools?.allow || [];
  const currentSkills = editingAgent.skills || [];
  const currentSubagents = editingAgent.subagents?.allowAgents || [];

  return (
    <div className="flex bg-slate-900/50 rounded-xl border border-slate-800 overflow-hidden min-h-[600px]">
      {/* Sidebar */}
      <div className="w-64 border-r border-slate-800 bg-black/20 overflow-y-auto">
        <div className="p-4 border-b border-slate-800">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">代理人列表</h3>
        </div>
        <div className="p-2 space-y-1">
          {summary.agents.map(agent => (
            <div key={agent.id} className="group relative">
              <button
                onClick={() => setSelectedAgentId(agent.id)}
                className={`w-full flex items-center px-3 py-3 rounded-lg transition-all ${
                  selectedAgentId === agent.id 
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent'
                }`}
              >
                <UserCircle size={18} className="mr-3 shrink-0" />
                <div className="text-left overflow-hidden pr-6">
                  <div className="font-semibold truncate">{agent.id}</div>
                  <div className="text-xs opacity-60 truncate">{agent.name || '無名稱'}</div>
                </div>
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(agent.id);
                  // Temporary feedback could be added here if state allows
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-500 hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity"
                title="複製 ID"
              >
                <Copy size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 bg-slate-900/40 flex justify-between items-center">
          <div className="flex items-center">
            <div className="w-12 h-12 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-500 mr-4">
              <UserCircle size={28} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-100">{editingAgent.id} <span className="font-normal text-slate-500">的管理與設定</span></h2>
              <p className="text-sm text-slate-400">{editingAgent.description || '這個代理人還沒有詳細敘述'}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button 
              onClick={handleDetect}
              disabled={isSaving}
              className="flex items-center px-4 py-2 bg-slate-800 hover:bg-slate-700 text-blue-400 rounded-lg text-sm font-bold transition-all border border-slate-700 disabled:opacity-50"
              title="執行代理人環境與配置檢測"
            >
              <SearchCheck size={16} className="mr-2" /> 檢測
            </button>
            <button 
              onClick={handleOptimize}
              disabled={isSaving}
              className="flex items-center px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-lg text-sm font-bold transition-all border border-slate-700 disabled:opacity-50"
              title="優化代理人性能與指令結構"
            >
              <Zap size={16} className="mr-2" /> 優化
            </button>
            <div className="w-px h-8 bg-slate-800 mx-2" />
            <button 
              onClick={handleClone}
              disabled={isSaving}
              className="flex items-center px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-bold transition-all border border-slate-700 disabled:opacity-50"
              title="複製此代理人為新 ID"
            >
              <Copy size={16} className="mr-2" /> 複製
            </button>
            <button 
              onClick={handleDelete}
              disabled={isSaving}
              className="flex items-center px-4 py-2 bg-red-900/20 hover:bg-red-900/40 text-red-400 rounded-lg text-sm font-bold transition-all border border-red-500/30 disabled:opacity-50"
              title="物理刪除此代理人"
            >
              <Trash2 size={16} className="mr-2" /> 刪除
            </button>
            <div className="w-px h-8 bg-slate-800 mx-2" />
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className={`flex items-center px-6 py-2.5 rounded-lg font-bold transition-all shadow-lg ${
                isSaving 
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20 active:scale-95'
              }`}
            >
              {isSaving ? <RefreshCw className="animate-spin mr-2" size={18} /> : <Save size={18} className="mr-2" />}
              {isSaving ? '儲存中...' : '儲存變更'}
            </button>
          </div>
        </div>

        {/* Save Status Banner */}
        {saveStatus && (
          <div className={`mx-6 mt-4 p-3 rounded-lg flex items-center text-sm border ${
            saveStatus.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}>
            {saveStatus.type === 'success' ? <CheckCircle2 size={16} className="mr-2" /> : <AlertCircle size={16} className="mr-2" />}
            {saveStatus.message}
          </div>
        )}

        {/* Tabs */}
        <div className="px-6 mt-4 flex border-b border-slate-800">
          {[
            { id: 'identity', label: '靈魂與指令', icon: Info },
            { id: 'files', label: '核心定義檔案', icon: FileCode },
            { id: 'brain', label: '模型大腦', icon: Brain },
            { id: 'capabilities', label: '工具與技能', icon: Wrench },
            { id: 'isolation', label: '實例隔離', icon: Shield },
            { id: 'vault', label: '憑證金庫', icon: Key },
            { id: 'social', label: '代理社交', icon: MessageSquare },
            { id: 'memory', label: '記憶檢索', icon: ShieldCheck },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center px-5 py-3 border-b-2 font-medium transition-all mr-4 text-sm ${
                activeTab === tab.id 
                  ? 'border-blue-500 text-blue-400 bg-blue-500/5' 
                  : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'
              }`}
            >
              <tab.icon size={16} className="mr-2" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Form Content */}
        <div className="flex-1 p-8 overflow-y-auto max-h-[calc(100vh-400px)]">
          {activeTab === 'identity' && (
            <div className="space-y-6 max-w-4xl">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-400 mb-2 uppercase tracking-wide">顯示名稱 (Name)</label>
                  <input 
                    type="text" 
                    value={editingAgent.name || ''} 
                    onChange={e => handleUpdateField('name', e.target.value)}
                    placeholder="例如：資深架構師"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-400 mb-2 uppercase tracking-wide">基本敘述 (Description)</label>
                  <input 
                    type="text" 
                    value={editingAgent.description || ''} 
                    onChange={e => handleUpdateField('description', e.target.value)}
                    placeholder="一句話說明這個 Agent 的主要目的"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-400 mb-2 uppercase tracking-wide">工作空間路徑 (Workspace Path)</label>
                <input 
                  type="text" 
                  value={editingAgent.workspace || ''} 
                  onChange={e => handleUpdateField('workspace', e.target.value)}
                  placeholder="例如：/Users/name/.openclaw/agents/my_agent"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-blue-500"
                />
                <p className="mt-1 text-[10px] text-slate-500 italic pl-1">指定此代理人實體檔案存放的目錄路徑</p>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-400 mb-2 uppercase tracking-wide flex justify-between items-center">
                  <span>系統核心指令 (System Instructions)</span>
                  <span className="text-[10px] font-normal lowercase opacity-50 bg-slate-800 px-2 py-0.5 rounded italic">此欄位定義了 Agent 的所有行為邏輯</span>
                </label>
                <textarea 
                  rows={12} 
                  value={editingAgent.instructions || ''} 
                  onChange={e => handleUpdateField('instructions', e.target.value)}
                  placeholder="請在此輸入 Agent 的性格、指導原則與工作流程..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-4 text-slate-300 font-mono text-sm leading-relaxed focus:outline-none focus:border-blue-500 shadow-inner"
                />
              </div>
            </div>
          )}

          {activeTab === 'isolation' && (
            <div className="space-y-6 max-w-4xl">
              <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-xl">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-slate-100 flex items-center">
                      <Shield size={20} className="mr-2 text-blue-500" /> 多租戶資源隔離狀態
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                      此代理人的專屬實例目錄：<code className="bg-black/40 px-2 py-0.5 rounded text-blue-300 font-mono text-xs">{isolationStatus?.baseDir}</code>
                    </p>
                    {(isolationStatus as any)?.port && (
                      <p className="text-sm text-blue-400 mt-2 flex items-center font-bold">
                        <Zap size={14} className="mr-2" /> 專屬執行端口：<span className="bg-blue-500/20 px-2 py-0.5 rounded ml-1 tracking-widest">{ (isolationStatus as any).port }</span>
                      </p>
                    )}
                  </div>
                  <div className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                    isolationStatus?.provisioned ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                  }`}>
                    {isolationStatus?.provisioned ? '已經撥備 (Ready)' : '未初始化 (Legacy)'}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  {['state', 'memory', 'private', 'logs'].map(dir => (
                    <div key={dir} className={`p-4 rounded-lg border flex flex-col items-center transition-all ${
                      isolationStatus?.details?.[dir] ? 'bg-slate-800/40 border-slate-700' : 'bg-red-900/10 border-red-900/30 text-red-400'
                    }`}>
                      <div className={`w-8 h-8 rounded-full mb-3 flex items-center justify-center ${
                        isolationStatus?.details?.[dir] ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {isolationStatus?.details?.[dir] ? <Check size={16} /> : <X size={16} />}
                      </div>
                      <span className="text-xs font-bold uppercase tracking-widest">{dir}</span>
                    </div>
                  ))}
                </div>

                {!isolationStatus?.provisioned && (
                  <div className="bg-blue-600/5 border border-blue-500/20 p-6 rounded-xl flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-blue-400 mb-1">一鍵初始化實例環境</h4>
                      <p className="text-xs text-slate-400">系統將自動在預設路徑下建立標準隔離目錄結構 (state, memory, private, logs)。</p>
                    </div>
                    <button 
                      onClick={handleProvision}
                      disabled={isProvisioning}
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold shadow-lg transition-all active:scale-95 disabled:opacity-50 flex items-center"
                    >
                      {isProvisioning ? <RefreshCw className="animate-spin mr-2" size={16} /> : <Zap size={16} className="mr-2" />}
                      初始化隔離環境
                    </button>
                  </div>
                )}
              </div>

              <div className="p-4 flex items-start bg-amber-500/5 border border-amber-500/10 rounded-lg">
                <Info size={16} className="text-amber-500 mt-0.5 mr-3 shrink-0" />
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  專業建議：2026.4.2 安全規範要求所有交易類 Agent 及其 Background Workers 必須指向專屬的 <code className="text-amber-500/80">instances/{editingAgent.id}/private</code> 目錄存放金鑰，避免與其他家庭成員交叉污染。
                </p>
              </div>
            </div>
          )}

          {activeTab === 'vault' && (
            <div className="space-y-6 max-w-4xl">
              <div className="flex justify-between items-end border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-100 flex items-center">
                    <Key size={20} className="mr-2 text-amber-500" /> 私有憑證金庫 (Instance Config)
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">此設定檔將安全地存放在 <code className="bg-black/40 px-1 py-0.5 rounded text-amber-500 font-mono text-xs">private/instance_config.json</code>，排除在 Git 範疇外。</p>
                </div>
                <button 
                  onClick={handleSaveVault}
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-amber-900/20 transition-all active:scale-95 disabled:opacity-50 flex items-center"
                >
                  {isSaving ? <RefreshCw className="animate-spin mr-2" size={16} /> : <Save size={16} className="mr-2" />}
                  更新憑證金庫
                </button>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-inner">
                <div className="bg-slate-900/50 px-4 py-2 border-b border-slate-800 flex justify-between text-[10px] font-mono text-slate-500">
                  <span>instance_config.json</span>
                  <span className="text-amber-500/60 uppercase tracking-widest">券商憑證/API KEY 存放區</span>
                </div>
                <textarea 
                  rows={20} 
                  value={instanceConfig} 
                  onChange={e => setInstanceConfig(e.target.value)}
                  placeholder={`{\n  "broker": "fugle",\n  "api_key": "YOUR_SECRET_KEY",\n  "api_secret": "..."\n}`}
                  className="w-full bg-transparent p-6 text-amber-500/80 font-mono text-sm leading-relaxed focus:outline-none resize-none"
                  spellCheck={false}
                />
              </div>

              {!isolationStatus?.hasVault && (
                <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-lg flex items-center text-red-400">
                  <AlertCircle size={16} className="mr-3 shrink-0" />
                  <span className="text-xs">警告：尚未建立憑證金庫檔案。請點擊「更新憑證金庫」或先初始化隔離環境。</span>
                </div>
              )}
            </div>
          )}

          {activeTab === 'brain' && (
            <div className="space-y-8 max-w-2xl">
              <div className="p-6 bg-blue-600/5 border border-blue-500/20 rounded-xl">
                <label className="block text-sm font-bold text-blue-400 mb-4 uppercase tracking-wide flex items-center">
                  <Brain size={18} className="mr-2" /> 主力大腦 (Primary Model)
                </label>
                <select 
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-blue-500"
                  value={editingAgent.model?.primary || summary.defaults.model?.primary || ''}
                  onChange={e => handleUpdateField('model.primary', e.target.value)}
                >
                  <option value="">(繼承全域預設值)</option>
                  {summary.availableModels.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-slate-500">優先使用的對話模型。若留空，將使用設定檔中的 defaults.model.primary。</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-400 mb-4 uppercase tracking-wide">備用大腦清單 (Model Fallbacks)</label>
                <div className="space-y-2 max-h-64 overflow-y-auto p-2 bg-black/20 rounded-lg border border-slate-800">
                  {summary.availableModels.map(m => (
                    <div key={m} className={`flex items-center px-3 py-2 rounded border transition-all ${
                      (editingAgent.model?.fallbacks || []).includes(m) 
                        ? 'bg-blue-600/10 border-blue-500/30' 
                        : 'border-transparent hover:bg-slate-800'
                    }`}>
                      <input 
                        type="checkbox" 
                        checked={(editingAgent.model?.fallbacks || []).includes(m)}
                        onChange={e => {
                          const list = [...(editingAgent.model?.fallbacks || [])];
                          if (e.target.checked) list.push(m);
                          else {
                            const i = list.indexOf(m);
                            if (i > -1) list.splice(i, 1);
                          }
                          handleUpdateField('model.fallbacks', list);
                        }}
                        className="w-4 h-4 rounded text-blue-600 bg-slate-800 border-slate-700"
                      />
                      <span className="ml-3 text-sm text-slate-300 font-mono">{m}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-xs text-slate-500">當主力大腦發生錯誤或 API 限制時，會依序切換至勾選的模型。</p>
              </div>
            </div>
          )}

          {activeTab === 'capabilities' && (
            <div className="space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {/* Tools column */}
                <div>
                  <h4 className="flex items-center text-sm font-bold text-slate-100 mb-4 uppercase tracking-widest border-b border-slate-800 pb-2">
                    <Wrench size={18} className="mr-2 text-blue-500" /> 工具權限控管 (Tools.Allow)
                  </h4>
                  <div className="space-y-8">
                    {toolGroups.map(group => (
                      <div key={group.label}>
                        <h5 className="text-[11px] font-bold text-slate-500 mb-3 ml-1">{group.label}</h5>
                        <div className="grid grid-cols-1 gap-2">
                          {group.tools.map(tool => (
                            <label key={tool} className={`flex items-center p-2 rounded-lg border transition-all cursor-pointer ${
                              currentTools.includes(tool) ? 'bg-blue-600/5 border-blue-500/30' : 'border-transparent hover:bg-slate-800'
                            }`}>
                              <input 
                                type="checkbox" 
                                checked={currentTools.includes(tool)}
                                onChange={e => {
                                  const list = [...currentTools];
                                  if (e.target.checked) list.push(tool);
                                  else {
                                    const i = list.indexOf(tool);
                                    if (i > -1) list.splice(i, 1);
                                  }
                                  handleUpdateField('tools.allow', list);
                                }}
                                className="w-4 h-4 rounded text-blue-600 bg-slate-900 border-slate-700"
                              />
                              <span className={`ml-3 text-xs font-mono ${currentTools.includes(tool) ? 'text-blue-300':'text-slate-400'}`}>{tool}</span>
                              {tool === 'sessions_history' && <Info size={12} className="ml-auto text-slate-600" />}
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Skills column */}
                <div>
                  <h4 className="flex items-center text-sm font-bold text-slate-100 mb-4 uppercase tracking-widest border-b border-slate-800 pb-2">
                    <Code2 size={18} className="mr-2 text-emerald-500" /> 擴充技能啟用 (Skills.Allow)
                  </h4>
                  <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl mt-2 mb-4">
                    <p className="text-xs text-emerald-500/70 leading-relaxed">
                      技能是更複雜的功能包。勾選後，此 Agent 就能呼叫技能中心的特定模組功能。
                    </p>
                  </div>
                  <div className="space-y-1 bg-black/20 rounded-xl p-2 border border-slate-800">
                    {allSkills.filter(s => s.enabled).map(skill => (
                      <label key={skill.id} className={`flex items-center p-3 rounded-lg border transition-all cursor-pointer ${
                        currentSkills.includes(skill.id) ? 'bg-emerald-600/10 border-emerald-500/30' : 'border-transparent hover:bg-slate-800'
                      }`}>
                        <input 
                          type="checkbox" 
                          checked={currentSkills.includes(skill.id)}
                          onChange={e => {
                            const list = [...currentSkills];
                            if (e.target.checked) list.push(skill.id);
                            else {
                              const i = list.indexOf(skill.id);
                              if (i > -1) list.splice(i, 1);
                            }
                            handleUpdateField('skills', list);
                          }}
                          className="w-4 h-4 rounded text-emerald-600 bg-slate-900 border-slate-700"
                        />
                        <div className="ml-3">
                          <div className={`text-sm font-bold ${currentSkills.includes(skill.id) ? 'text-emerald-400':'text-slate-300'}`}>{skill.id}</div>
                          <div className="text-[10px] text-slate-500 truncate max-w-[200px]">{skill.path}</div>
                        </div>
                        <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full ${
                          skill.category === 'global' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'
                        }`}>
                          {skill.category}
                        </span>
                      </label>
                    ))}
                    {allSkills.filter(s => s.enabled).length === 0 && (
                      <div className="p-8 text-center text-slate-500 italic text-sm">
                        目前沒有已啟用的技能庫可用於分配。
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'social' && (
            <div className="max-w-2xl">
              <h4 className="flex items-center text-sm font-bold text-slate-100 mb-6 uppercase tracking-widest border-b border-slate-800 pb-2">
                <MessageSquare size={18} className="mr-2 text-pink-500" /> 代理人通訊權限 (Subagents Capability)
              </h4>
              <div className="p-6 bg-pink-500/5 border border-pink-500/20 rounded-xl mb-6">
                <div className="flex items-center mb-4">
                  <div className={`w-10 h-6 rounded-full relative cursor-pointer transition-all ${
                    currentSubagents.includes('*') ? 'bg-pink-600' : 'bg-slate-700'
                  }`} onClick={() => {
                    handleUpdateField('subagents.allowAgents', currentSubagents.includes('*') ? [] : ['*']);
                  }}>
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                      currentSubagents.includes('*') ? 'left-5' : 'left-1'
                    }`} />
                  </div>
                  <span className="ml-4 font-bold text-pink-400">開放所有對象 (AllowAll: "*")</span>
                </div>
                <p className="text-xs text-slate-400">啟用後，{editingAgent.id} 可以呼叫系統中任何其他的 Agent 來幫忙或傳遞訊息。</p>
              </div>

              {!currentSubagents.includes('*') && (
                <div className="space-y-4">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">或是指定特定的通訊對象：</span>
                  <div className="grid grid-cols-2 gap-2">
                    {summary.agents.filter(a => a.id !== editingAgent.id).map(a => (
                      <label key={a.id} className={`flex items-center p-3 rounded-lg border transition-all cursor-pointer ${
                        currentSubagents.includes(a.id) ? 'bg-pink-600/10 border-pink-500/30' : 'border-transparent hover:bg-slate-800'
                      }`}>
                        <input 
                          type="checkbox" 
                          checked={currentSubagents.includes(a.id)}
                          onChange={e => {
                            const list = [...currentSubagents];
                            if (e.target.checked) list.push(a.id);
                            else {
                              const i = list.indexOf(a.id);
                              if (i > -1) list.splice(i, 1);
                            }
                            handleUpdateField('subagents.allowAgents', list);
                          }}
                          className="w-4 h-4 rounded text-pink-600 bg-slate-900 border-slate-700"
                        />
                        <span className="ml-3 text-sm text-slate-300 font-bold">{a.id}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'memory' && (
            <div className="max-w-2xl space-y-8">
              <h4 className="flex items-center text-sm font-bold text-slate-100 mb-2 uppercase tracking-widest border-b border-slate-800 pb-2">
                <ShieldCheck size={18} className="mr-2 text-indigo-500" /> 記憶搜索設定 (MemorySearch)
              </h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg">
                  <label className="block text-xs font-bold text-slate-500 mb-2">啟用記憶檢索</label>
                  <div className="flex items-center">
                    <input 
                      type="checkbox" 
                      checked={editingAgent.memorySearch?.enabled !== false} 
                      onChange={e => handleUpdateField('memorySearch.enabled', e.target.checked)}
                      className="w-5 h-5"
                    />
                    <span className="ml-3 text-sm text-slate-300">Enabled</span>
                  </div>
                </div>
                <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg">
                  <label className="block text-xs font-bold text-slate-500 mb-2">預設提供者 (Provider)</label>
                  <select 
                    value={String(editingAgent.memorySearch?.provider || '')}
                    onChange={e => handleUpdateField('memorySearch.provider', e.target.value)}
                    className="w-full bg-black border-none text-sm text-slate-300 focus:ring-0"
                  >
                    <option value="">(繼承預設)</option>
                    <option value="gemini">Gemini Embedding</option>
                    <option value="openai">OpenAI Embedding</option>
                    <option value="none">None</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest pl-1">額外讀取路徑 (Extra Paths)</label>
                <div className="p-4 bg-black/20 border border-slate-800 rounded-lg space-y-2">
                  <p className="text-[10px] text-slate-500 mb-4">您可以填入絕對路徑，讓此 Agent 具備讀取特定資料夾內嵌入記憶的能力。</p>
                  <textarea 
                    rows={3} 
                    value={Array.isArray(editingAgent.memorySearch?.extraPaths) ? editingAgent.memorySearch.extraPaths.join('\n') : ''}
                    onChange={e => handleUpdateField('memorySearch.extraPaths', e.target.value.split('\n').filter(Boolean))}
                    placeholder="/path/to/my/kb"
                    className="w-full bg-slate-950 border border-slate-800 rounded font-mono text-xs p-3 text-slate-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-start p-4 bg-indigo-500/5 border border-indigo-500/20 rounded-lg">
                <Settings2 size={16} className="text-indigo-400 mt-0.5 mr-3 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-indigo-400 mb-1">關於 Session Memory</div>
                  <p className="text-[10px] text-slate-500 leading-normal">
                    Agent 在對話時會自動檢索相關的歷史對話碎片。若要完全自定義更深層的 RAG 權重，建議直接在 openclaw.json 中進行 JSON 層級的高級設定。
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'files' && (
            <div className="flex bg-slate-950 rounded-xl border border-slate-800 overflow-hidden h-[500px]">
              {/* File List */}
              <div className="w-56 border-r border-slate-800 bg-black/20 flex flex-col">
                <div className="p-3 border-b border-slate-800 bg-slate-900/40 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  主要定義檔案
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {agentFiles.map(file => (
                    <button
                      key={file.filename}
                      onClick={() => {
                        setSelectedFileName(file.filename);
                        setFileEditingContent(file.content);
                      }}
                      className={`w-full flex items-center px-3 py-2.5 rounded-lg text-xs transition-all ${
                        selectedFileName === file.filename 
                          ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 font-bold' 
                          : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border border-transparent'
                      }`}
                    >
                      <FileText size={14} className="mr-3 shrink-0" />
                      <span className="truncate">{file.filename}</span>
                    </button>
                  ))}
                  {!isLoadingFiles && agentFiles.length === 0 && (
                    <div className="px-3 py-10 text-center text-[10px] text-slate-600 italic leading-relaxed">
                      此代理人目錄下未偵測到 <br/> AGENTS.md, SOUL.md 等主要定義檔
                    </div>
                  )}
                  {isLoadingFiles && (
                    <div className="p-10 flex justify-center">
                      <RefreshCw size={20} className="animate-spin text-slate-700" />
                    </div>
                  )}
                </div>
              </div>

              {/* File Editor */}
              <div className="flex-1 flex flex-col min-w-0">
                {selectedFileName ? (
                  <>
                    <div className="px-5 py-2 border-b border-slate-800 bg-slate-900/30 flex justify-between items-center shrink-0">
                      <div className="flex items-center">
                        <FileText size={12} className="text-blue-500 mr-2" />
                        <span className="text-[10px] font-mono text-slate-300">{selectedFileName}</span>
                      </div>
                      <span className="text-[9px] text-slate-500 bg-slate-800/50 px-2 py-0.5 rounded border border-slate-700">修正內容將直接覆蓋實體檔案</span>
                    </div>
                    <textarea
                      value={fileEditingContent}
                      onChange={e => setFileEditingContent(e.target.value)}
                      className="flex-1 w-full bg-transparent p-6 text-slate-300 font-mono text-sm leading-relaxed focus:outline-none resize-none overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800"
                      placeholder={`在此編輯 ${selectedFileName} 的內容...`}
                      spellCheck={false}
                    />
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-600 p-8 text-center">
                    <FileCode size={48} className="mb-4 opacity-10" />
                    <p className="text-sm italic opacity-40">請從左側清單選擇要編輯的定義檔案</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
