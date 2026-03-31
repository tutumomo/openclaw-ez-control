import React, { useState, useEffect } from 'react';
import { Download, Play, Square, Trash2, Github, Folder, Plus, Globe, Monitor, RefreshCw, Loader2 } from 'lucide-react';
import type { SkillItem, SkillUpdateStatus } from '../types';
import { checkSkillUpdates, fetchSkillMetadata } from '../api';

interface SkillsCenterProps {
  skills: SkillItem[];
  agents?: string[];
  busy: string | null;
  onToggle: (skillId: string, enabled: boolean) => Promise<void>;
  onPull: (skillPath: string) => Promise<void>;
  onRemove: (skillId: string, deleteFiles: boolean, skillPath: string) => Promise<void>;
  onClone?: (gitUrl: string, target: string) => Promise<void>;
}

export default function SkillsCenter({ skills, agents = [], busy, onToggle, onPull, onRemove, onClone }: SkillsCenterProps) {
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [pullingId, setPullingId] = useState<string | null>(null);
  const [pulledId, setPulledId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [gitUrl, setGitUrl] = useState('');
  const [cloneTarget, setCloneTarget] = useState('global');
  const [updateStatuses, setUpdateStatuses] = useState<Record<string, SkillUpdateStatus>>({});
  const [checkingUpdates, setCheckingUpdates] = useState(false);
  const [metadataCache, setMetadataCache] = useState<Record<string, { description: string; triggers: string[] }>>({});
  const [loadingMetadata, setLoadingMetadata] = useState<Record<string, boolean>>({});
  const [isUpdatingAll, setIsUpdatingAll] = useState(false);

  useEffect(() => {
    const gitPaths = skills.filter(s => s.isGitRepo).map(s => s.path);
    if (gitPaths.length === 0) return;
    
    let isMounted = true;
    setCheckingUpdates(true);
    checkSkillUpdates(gitPaths)
      .then(res => {
        if (isMounted) setUpdateStatuses(res);
      })
      .catch(err => console.error("Failed to check updates:", err))
      .finally(() => {
        if (isMounted) setCheckingUpdates(false);
      });

    return () => { isMounted = false; };
  }, [skills]);

  const handleMouseEnter = async (skill: SkillItem) => {
    if (metadataCache[skill.path] || loadingMetadata[skill.path] || skill.path === "Unknown") return;
    
    setLoadingMetadata(prev => ({ ...prev, [skill.path]: true }));
    try {
      const meta = await fetchSkillMetadata(skill.path);
      setMetadataCache(prev => ({ ...prev, [skill.path]: meta }));
    } catch (err) {
      console.error("Failed to fetch metadata:", err);
    } finally {
      setLoadingMetadata(prev => ({ ...prev, [skill.path]: false }));
    }
  };

  const confirmRemove = (skill: SkillItem) => {
    if (window.confirm(`確認要移除技能 ${skill.id} 嗎？\n\n按下「取消」只取消註冊設定檔。\n按下「確定」將會連帶從磁碟刪除資料夾。`)) {
      onRemove(skill.id, true, skill.path);
    } else {
      onRemove(skill.id, false, skill.path);
    }
  };

  const handleCloneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gitUrl || !onClone) return;
    await onClone(gitUrl, cloneTarget);
    setShowAddModal(false);
    setGitUrl('');
  };

  const handlePullClick = async (skill: SkillItem) => {
    if (busy || !skill.isGitRepo) return;
    setPullingId(skill.id);
    try {
      await onPull(skill.path);
      setPulledId(skill.id);
      
      // Update local state to reflect it's up to date now
      setUpdateStatuses(prev => ({
        ...prev,
        [skill.path]: { ...prev[skill.path], needsUpdate: false }
      }));
      
      setTimeout(() => setPulledId(null), 2000);
    } finally {
      setPullingId(null);
    }
  };

  const handleUpdateAll = async () => {
    const skillsToUpdate = skills.filter(s => s.isGitRepo && updateStatuses[s.path]?.needsUpdate);
    if (skillsToUpdate.length === 0 || busy || isUpdatingAll) return;
    
    setIsUpdatingAll(true);
    try {
      for (const skill of skillsToUpdate) {
        await handlePullClick(skill);
      }
    } finally {
      setIsUpdatingAll(false);
    }
  };

  const groupedSkills = {
    global: skills.filter(s => s.category === 'global'),
    workspace: skills.filter(s => s.category === 'workspace'),
    system: skills.filter(s => s.category === 'system'),
  };

  const duplicatesMap: Record<string, SkillItem[]> = {};
  skills.forEach(skill => {
    if (!duplicatesMap[skill.id]) duplicatesMap[skill.id] = [];
    duplicatesMap[skill.id].push(skill);
  });

  const getVersionStatus = (skill: SkillItem) => {
    const instances = duplicatesMap[skill.id];
    if (!instances || instances.length <= 1) return null;
    
    const haveDates = instances.every(i => i.gitInfo?.date);
    if (!haveDates) return 'duplicate';

    const sorted = [...instances].sort((a, b) => new Date(b.gitInfo!.date).getTime() - new Date(a.gitInfo!.date).getTime());
    
    if (sorted[0].path === skill.path) return 'newer';
    return 'older';
  };

  const renderSkillCard = (skill: SkillItem) => {
    const versionStatus = getVersionStatus(skill);
    const updateStats = updateStatuses[skill.path];
    const isUpToDate = updateStats && !updateStats.needsUpdate;
    const isUpdateAvailable = updateStats && updateStats.needsUpdate;
    
    const meta = metadataCache[skill.path];
    const isLoading = loadingMetadata[skill.path];
    const hasInfo = meta && (meta.description || meta.triggers.length > 0);

    return (
    <div 
      key={skill.path} 
      onMouseEnter={() => handleMouseEnter(skill)}
      className={`bg-slate-900/50 rounded-xl p-5 border flex flex-col gap-4 shadow-md transition group relative ${versionStatus === 'duplicate' || versionStatus === 'older' ? 'border-red-500/30 hover:border-red-500/60' : 'border-white/5 hover:border-white/20'}`}
    >
      
      {/* Tooltip Bubble */}
      {(hasInfo || isLoading) && (
        <div className="absolute left-1/2 -top-2 transform -translate-x-1/2 -translate-y-full mb-2 w-72 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-[100] scale-95 group-hover:scale-100">
          <div className="bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl overflow-hidden relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
            
            {isLoading ? (
              <div className="flex items-center justify-center py-4 gap-2 text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-xs">讀取說明中...</span>
              </div>
            ) : meta && (
              <div className="space-y-4">
                {meta.description && (
                  <div>
                    <div className="flex items-center gap-2 text-indigo-400 mb-1">
                      <Globe className="w-3.5 h-3.5" />
                      <span className="text-[10px] uppercase tracking-wider font-bold">用途說明</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed font-medium">
                      {meta.description}
                    </p>
                  </div>
                )}
                {meta.triggers && meta.triggers.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 text-teal-400 mb-1">
                      <Plus className="w-3.5 h-3.5" />
                      <span className="text-[10px] uppercase tracking-wider font-bold">觸發指令</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {meta.triggers.map((t, idx) => (
                        <span key={idx} className="bg-slate-800 border border-white/5 px-2 py-0.5 rounded-md text-[10px] font-mono text-slate-400">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          {/* Arrow */}
          <div className="w-3 h-3 bg-slate-900 border-r border-b border-white/10 transform rotate-45 mx-auto -mt-1.5" />
        </div>
      )}

      <div className="flex items-start justify-between relative">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${skill.enabled ? 'bg-teal-500/10 text-teal-400' : 'bg-slate-800 text-slate-500'}`}>
            {skill.isGitRepo ? <Github className="w-6 h-6" /> : <Folder className="w-6 h-6" />}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-200 break-all">{skill.id}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs px-2 py-0.5 rounded-full border ${skill.enabled ? 'border-teal-500/30 text-teal-400 bg-teal-500/10' : 'border-slate-500/30 text-slate-400 bg-slate-800'}`}>
                {skill.enabled ? '已啟用' : '已停用'}
              </span>
              {!skill.inConfig && (
                <span className="text-xs px-2 py-0.5 rounded-full border border-yellow-500/30 text-yellow-400 bg-yellow-500/10">
                  未註冊
                </span>
              )}
            </div>
          </div>
        </div>
        
        {versionStatus && (
          <div className="absolute -top-3 -right-3 whitespace-nowrap z-10">
            {versionStatus === 'newer' && (
              <span className="flex items-center gap-1 bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-1 rounded-full text-[10px] font-bold shadow-lg" title={`最新版本: ${skill.gitInfo?.hash} @ ${skill.gitInfo?.date}`}>
                <span className="text-sm">🌟</span> 較新版本
              </span>
            )}
            {versionStatus === 'older' && (
              <span className="flex items-center gap-1 bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-1 rounded-full text-[10px] font-bold shadow-lg" title={`過期版本: ${skill.gitInfo?.hash} @ ${skill.gitInfo?.date}`}>
                <span className="text-sm">📉</span> 較舊版本
              </span>
            )}
            {versionStatus === 'duplicate' && (
              <span className="flex items-center gap-1 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-2 py-1 rounded-full text-[10px] font-bold shadow-lg" title="系統中存在同名的技能，但是沒有同步的 Git 版本可供自動比對。">
                <span className="text-sm">⚠️</span> 重複安裝
              </span>
            )}
          </div>
        )}
      </div>
      
      <div className="text-sm text-slate-500 font-mono break-all line-clamp-2" title={skill.path}>
        {skill.path}
      </div>
      
      <div className="mt-auto pt-4 border-t border-white/5 flex gap-2">
        <button
          disabled={!!busy}
          onClick={() => onToggle(skill.id, !skill.enabled)}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition disabled:opacity-50 ${
            skill.enabled 
              ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' 
              : 'bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 border border-teal-500/30'
          }`}
        >
          {skill.enabled ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          {skill.enabled ? '停用' : '啟用'}
        </button>
        
        <div className="flex-1 filter relative group/btn">
          <button
            disabled={!!busy || !skill.isGitRepo || pullingId === skill.id || isUpToDate}
            onClick={() => handlePullClick(skill)}
            className={`w-full py-2 px-3 rounded-lg text-sm font-medium border flex items-center justify-center gap-2 transition disabled:cursor-not-allowed ${
              isUpToDate && !pulledId
                ? 'bg-slate-800/50 text-slate-500 border-slate-700/50'
                : pulledId === skill.id 
                ? 'bg-green-600/20 text-green-400 border-green-500/30' 
                : isUpdateAvailable
                ? 'bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 border-blue-500/50 font-bold'
                : 'bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border-indigo-500/30 disabled:opacity-30'
            }`}
          >
            {checkingUpdates && skill.isGitRepo ? (
              <><RefreshCw className="w-4 h-4 animate-spin opacity-50" /> 檢查中...</>
            ) : pullingId === skill.id ? (
              <><RefreshCw className="w-4 h-4 animate-spin" /> 拉取中...</>
            ) : pulledId === skill.id ? (
              <>✓ 已更新</>
            ) : isUpToDate ? (
              <>已是最新版</>
            ) : isUpdateAvailable ? (
              <><Download className="w-4 h-4" /> 🚀 更新可用</>
            ) : (
              <><Download className="w-4 h-4" /> 更新</>
            )}
          </button>
          {!skill.isGitRepo && (
            <div className="absolute opacity-0 group-hover/btn:opacity-100 transition-opacity bg-slate-800 text-xs rounded px-2 py-1 -top-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap pointer-events-none z-20">
              此技能非 Git 倉庫，無法自動拉取
            </div>
          )}
        </div>
        
        <button
          disabled={!!busy}
          onClick={() => confirmRemove(skill)}
          className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 flex items-center justify-center transition disabled:opacity-50"
          title="移除技能"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )};

  return (
    <div className="space-y-6">
      <div className="backdrop-blur-glass bg-white/5 rounded-2xl p-6 border border-white/10 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5 overflow-hidden pointer-events-none">
          <Github className="w-64 h-64 -mt-16 -mr-16" />
        </div>
        
        <div className="flex items-center justify-between mb-6 relative z-10">
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-teal-400 to-indigo-400 bg-clip-text text-transparent mb-2">
              技能管理中心 (Skills Center)
            </h2>
            <p className="text-slate-400 max-w-2xl">
              在這裡管理所有的 OpenClaw 技能。你可以啟用、停用、更新以及新增 Git 技能。
            </p>
          </div>
          <div className="flex items-center gap-3">
            {skills.some(s => s.isGitRepo && updateStatuses[s.path]?.needsUpdate) && (
              <button
                disabled={!!busy || checkingUpdates || isUpdatingAll}
                onClick={handleUpdateAll}
                className={`py-2 px-4 rounded-xl transition flex items-center gap-2 border ${
                  isUpdatingAll 
                    ? 'bg-amber-500/10 text-amber-500 border-amber-500/30' 
                    : 'bg-teal-600/10 hover:bg-teal-600/20 text-teal-400 border-teal-500/30'
                }`}
              >
                <RefreshCw className={`w-5 h-5 ${isUpdatingAll ? 'animate-spin' : ''}`} />
                {isUpdatingAll ? '正在全部更新...' : `全部更新 (${skills.filter(s => s.isGitRepo && updateStatuses[s.path]?.needsUpdate).length})`}
              </button>
            )}
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-xl transition flex items-center gap-2 shadow-lg shadow-indigo-500/20"
            >
              <Plus className="w-5 h-5" />
              新增技能
            </button>
          </div>
        </div>

        <div className="space-y-12 relative z-10">
          
          {/* Global Skills */}
          <section>
            <h3 className="text-xl border-b border-white/10 pb-2 mb-4 flex items-center gap-2 text-slate-300 font-semibold">
              <Globe className="w-5 h-5 text-teal-400" /> 全域技能 (Global)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {groupedSkills.global.map(renderSkillCard)}
              {groupedSkills.global.length === 0 && <p className="text-slate-500">尚無全域技能</p>}
            </div>
          </section>

          {/* Workspace Skills */}
          <section>
            <h3 className="text-xl border-b border-white/10 pb-2 mb-4 flex items-center gap-2 text-slate-300 font-semibold">
              <Monitor className="w-5 h-5 text-indigo-400" /> 工作區技能 (Workspace)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {groupedSkills.workspace.map(renderSkillCard)}
              {groupedSkills.workspace.length === 0 && <p className="text-slate-500">尚無工作區技能</p>}
            </div>
          </section>

          {/* System Skills */}
          {groupedSkills.system.length > 0 && (
            <section>
              <h3 className="text-xl border-b border-white/10 pb-2 mb-4 flex items-center gap-2 text-slate-300 font-semibold">
                <RefreshCw className="w-5 h-5 text-slate-400" /> 系統或外部技能 (System/Other)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {groupedSkills.system.map(renderSkillCard)}
              </div>
            </section>
          )}

        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-white/10 p-6 rounded-2xl w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Github className="w-5 h-5" /> 匯入 Git 技能
            </h3>
            <form onSubmit={handleCloneSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Git Repository URL</label>
                <input
                  type="url"
                  required
                  placeholder="https://github.com/user/skill.git"
                  className="w-full bg-slate-950/50 border border-slate-700/50 rounded-lg py-2 px-3 focus:ring-2 focus:outline-none"
                  value={gitUrl}
                  onChange={(e) => setGitUrl(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">目標目錄等級</label>
                <select
                  value={cloneTarget}
                  onChange={(e) => setCloneTarget(e.target.value)}
                  className="w-full bg-slate-950/50 border border-slate-700/50 rounded-lg py-2 px-3 focus:ring-2 focus:outline-none"
                >
                  <option value="global">Global (共用全域)</option>
                  <option value="workspace">Workspace (私人工作區)</option>
                  {agents.map(agent => (
                    <option key={agent} value={`agent:${agent}`}>
                      Agent: {agent}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 justify-end pt-4 mt-6 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-white/10 hover:bg-white/5 transition"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={!!busy}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 transition"
                >
                  匯入並註冊
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
