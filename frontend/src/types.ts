export interface SystemStatus {
  configPath: string;
  configExists: boolean;
  modifiedAt: string | null;
  sizeBytes: number;
  backupCount: number;
}

export interface ConfigSummary {
  configPath: string;
  modifiedAt: string;
  sizeBytes: number;
  topLevelKeys: string[];
  backupCount: number;
  config: Record<string, unknown>;
  cliValidation?: CommandResult;
}

export interface CommandResult {
  success: boolean;
  command: string[];
  returncode: number;
  stdout: string;
  stderr: string;
  parsed?: unknown;
}

export interface DraftValidation {
  valid: boolean;
  message: string;
  topLevelKeys: string[];
}

export interface BackupItem {
  path: string;
  name: string;
  sizeBytes: number;
  createdAt: string;
}

export interface ValidateResponse {
  draftValidation: DraftValidation;
  cliValidation: CommandResult;
}

export interface SaveResponse {
  success: boolean;
  step: string;
  message?: string;
  backup?: BackupItem;
  draftValidation?: DraftValidation;
  cliValidation?: CommandResult;
  doctor?: CommandResult;
}

export interface RollbackResponse {
  restore: {
    restored: boolean;
    source: string;
    configPath: string;
    modifiedAt: string;
  };
  cliValidation: CommandResult;
  doctor: CommandResult;
}

export interface BackupsResponse {
  items: BackupItem[];
  total: number;
}

export interface ModelGlobals {
  model: string | null;
  fallbackModel: string | null;
  visionModel: string | null;
  modelFallbacks: string[];
  visionFallbacks: string[];
}

export interface AgentModelRow {
  id: string;
  useDefaultModel: boolean;
  useDefaultFallbacks: boolean;
  useDefaultVision: boolean;
  model: string | null;
  fallbackModel: string | null;
  visionModel: string | null;
  modelFallbacks: string[];
  visionFallbacks: string[];
  effectiveModel: string | null;
  effectiveFallbackModel: string | null;
  effectiveVisionModel: string | null;
  effectiveModelFallbacks: string[];
  effectiveVisionFallbacks: string[];
}

export interface ModelSummaryResponse {
  globals: ModelGlobals;
  availableModels: string[];
  agents: AgentModelRow[];
}

export interface MemoryHelpItem {
  label: string;
  summary: string;
  default: string;
  required: boolean;
  whenToUse: string;
  risk: string;
  path: string;
}

export interface MemorySummaryResponse {
  settings: Record<string, any>;
  help: Record<string, MemoryHelpItem>;
}

export interface PluginWizardCommandLike extends CommandResult {}

export interface PluginWizardStepResult {
  step: string;
  label: string;
  success: boolean;
  skipped?: boolean;
  message?: string;
  result?: PluginWizardCommandLike | null;
}

export interface PluginWizardPluginStatus {
  repo: string;
  pluginDir: string;
  dirExists: boolean;
  entryId: string;
  installed: boolean;
  enabled: boolean;
  configPresent: boolean;
  slotted?: boolean;
  configKeys?: string[];
  contextThreshold?: number;
  dbPath?: string;
}

export interface PluginWizardActionResult {
  success: boolean;
  pluginId?: string;
  action?: string;
  status?: PluginWizardPluginStatus;
  steps?: PluginWizardStepResult[];
  draftValidation?: DraftValidation;
  cliValidation?: CommandResult;
  doctor?: CommandResult;
  changes?: {
    before?: PluginWizardPluginStatus;
    after?: PluginWizardPluginStatus;
    notes?: string[];
  };
}

export interface PluginWizardSummaryResponse {
  checks: Record<string, boolean>;
  website?: {
    frontendDistReady: boolean;
    frontendDistPath: string;
  };
  plugins: Record<string, PluginWizardPluginStatus>;
}

export interface TelegramAccount {
  botToken?: string;
  dmPolicy?: string;
  groupPolicy?: string;
  streaming?: string;
  allowFrom?: number[];
  groups?: Record<string, any>;
}

export interface TelegramChannelsResponse {
  enabled: boolean;
  accounts: Record<string, TelegramAccount>;
}

export interface SkillItem {
  id: string;
  path: string;
  isGitRepo: boolean;
  gitInfo?: { hash: string; date: string } | null;
  enabled: boolean;
  inConfig: boolean;
  category: 'global' | 'workspace' | 'system';
}

export interface SkillsSummaryResponse {
  skills: SkillItem[];
  agents?: string[];
}

export interface SkillUpdateStatus {
  needsUpdate: boolean;
  remoteHash: string;
}

export interface AgentConfig {
  id: string;
  name?: string;
  description?: string;
  instructions?: string;
  workspace?: string;
  model?: {
    primary?: string;
    fallbacks?: string[];
  };
  tools?: {
    allow?: string[];
  };
  skills?: {
    allow?: string[];
  };
  subagents?: {
    allowAgents?: string[];
  };
  memorySearch?: Record<string, unknown>;
  [key: string]: any;
}

export interface AgentsSummaryResponse {
  defaults: Record<string, any>;
  agents: AgentConfig[];
  availableModels: string[];
  toolCatalog: string[];
}

export interface AgentFile {
  filename: string;
  content: string;
  sizeBytes: number;
  modifiedAt: string;
}
