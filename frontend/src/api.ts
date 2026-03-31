import axios from 'axios';
import type { BackupsResponse, ConfigSummary, MemorySummaryResponse, ModelSummaryResponse, PluginWizardActionResult, PluginWizardSummaryResponse, RollbackResponse, SaveResponse, SystemStatus, ValidateResponse, TelegramChannelsResponse, SkillsSummaryResponse, TelegramAccount } from './types';

const apiBaseURL = (import.meta.env.VITE_API_BASE_URL as string | undefined) || '/api';

const api = axios.create({
  baseURL: apiBaseURL,
  timeout: 30000,
});

export const loadConfig = async () => (await api.get<ConfigSummary>('/config/load')).data;
export const getSystemStatus = async () => (await api.get<SystemStatus>('/system/status')).data;
export const listBackups = async () => (await api.get<BackupsResponse>('/config/backups')).data;
export const validateConfig = async (config: Record<string, unknown>) =>
  (await api.post<ValidateResponse>('/config/validate', { config })).data;
export const saveConfig = async (config: Record<string, unknown>) =>
  (await api.post<SaveResponse>('/config/save', { config })).data;
export const runDoctor = async () => (await api.post('/config/doctor')).data;
export const rollbackBackup = async (backupPath: string) =>
  (await api.post<RollbackResponse>('/config/rollback', { backupPath })).data;
export const deleteBackup = async (backupPath: string) =>
  (await api.post<SaveResponse>('/config/delete-backup', { backupPath })).data;
export const getModelSummary = async () => (await api.get<ModelSummaryResponse>('/models/summary')).data;
export const updateGlobalModels = async (payload: { model: string; fallbackModel: string; visionModel: string; modelFallbacks: string[]; visionFallbacks: string[] }) =>
  (await api.post<SaveResponse>('/models/global', payload)).data;
export const updateAgentModels = async (payload: { agentId: string; useDefaultModel: boolean; useDefaultFallbacks: boolean; useDefaultVision: boolean; model: string; fallbackModel: string; visionModel: string; modelFallbacks: string[]; visionFallbacks: string[] }) =>
  (await api.post<SaveResponse>('/models/agent', payload)).data;
export const resetAgentModels = async (agentId: string) =>
  (await api.post<SaveResponse>('/models/reset-agent', { agentId })).data;
export const getMemorySummary = async () => (await api.get<MemorySummaryResponse>('/memory/summary')).data;
export const saveMemorySettings = async (settings: Record<string, any>) =>
  (await api.post<SaveResponse>('/memory/save', { settings })).data;
export const getPluginWizardSummary = async () => (await api.get<PluginWizardSummaryResponse>('/plugins/wizard/summary')).data;
export const runPluginWizardInstall = async (pluginId: string, action: string) =>
  (await api.post<PluginWizardActionResult>('/plugins/wizard/install', { pluginId, action })).data;
export const runPluginWizardConfigure = async (pluginId: string) =>
  (await api.post<PluginWizardActionResult>('/plugins/wizard/configure', { pluginId })).data;
export const runPluginWizardValidate = async (pluginId: string) =>
  (await api.post<PluginWizardActionResult>('/plugins/wizard/validate', { pluginId })).data;
export const getTelegramChannels = async () => (await api.get<TelegramChannelsResponse>('/channels/telegram')).data;
export const updateTelegramChannels = async (payload: { enabled: boolean; accounts: Record<string, TelegramAccount> }) =>
  (await api.post<SaveResponse>('/channels/telegram', payload)).data;
export const getSkillsSummary = async () => (await api.get<SkillsSummaryResponse>('/skills/summary')).data;
export const toggleSkill = async (skillId: string, enabled: boolean) =>
  (await api.post<SaveResponse>('/skills/toggle', { skillId, enabled })).data;
export const removeSkill = async (skillId: string, deleteFiles: boolean, skillPath: string) =>
  (await api.post<SaveResponse>('/skills/remove', { skillId, deleteFiles, skillPath })).data;
export const pullSkill = async (skillPath: string) =>
  (await api.post<{ success: boolean; stdout: string; stderr: string; message?: string }>('/skills/pull', { skillPath })).data;
export const cloneSkill = async (gitUrl: string, target: string) =>
  (await api.post<{ success: boolean; stdout: string; stderr: string; message?: string }>('/skills/clone', { gitUrl, target })).data;
export const checkSkillUpdates = async (paths: string[]) =>
  (await api.post<Record<string, import('./types').SkillUpdateStatus>>('/skills/check-updates', { paths }, { timeout: 0 })).data;

export const getAgents = async () => (await api.get<import('./types').AgentsSummaryResponse>('/agents')).data;
export const updateAgent = async (agentId: string, updates: Partial<import('./types').AgentConfig>) =>
  (await api.post<SaveResponse>(`/agents/${agentId}`, { updates })).data;

export const getAgentFiles = async (agentId: string) =>
  (await api.get<import('./types').AgentFile[]>(`/agents/${agentId}/files`)).data;

export const updateAgentFile = async (agentId: string, filename: string, content: string) =>
  (await api.post<SaveResponse>(`/agents/${agentId}/files`, { filename, content })).data;

export const deleteAgent = async (agentId: string) =>
  (await api.delete<SaveResponse>(`/agents/${agentId}`)).data;

export const cloneAgent = async (agentId: string, targetId: string) =>
  (await api.post<SaveResponse>(`/agents/${agentId}/clone`, { target_id: targetId })).data;

export const checkAgent = async (agentId: string) =>
  (await api.post<{ success: boolean; status: string; issues: string[]; message: string }>(`/agents/${agentId}/check`)).data;

export const optimizeAgent = async (agentId: string) =>
  (await api.post<{ success: boolean; message: string; changes: string[] }>(`/agents/${agentId}/optimize`)).data;
