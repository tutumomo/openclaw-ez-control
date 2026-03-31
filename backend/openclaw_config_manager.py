#!/usr/bin/env python3
"""OpenClaw EZ-Control 安全設定管理器。"""
from __future__ import annotations

import json
import os
import shutil as which_shutil
import shutil
import subprocess
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from copy import deepcopy

OPENCLAW_CLI = os.getenv("OPENCLAW_CLI", "openclaw")
DEFAULT_CONFIG_PATH = Path(
    os.getenv("OPENCLAW_CONFIG_PATH", str(Path.home() / ".openclaw" / "openclaw.json"))
).expanduser()
PLUGIN_WIZARD_DIR = Path.home() / ".openclaw" / "plugin-wizard"
FRONTEND_DIST_DIR = Path(__file__).resolve().parent.parent / "frontend" / "dist"


@dataclass
class CommandResult:
    success: bool
    command: List[str]
    returncode: int
    stdout: str
    stderr: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "success": self.success,
            "command": self.command,
            "returncode": self.returncode,
            "stdout": self.stdout,
            "stderr": self.stderr,
        }


@dataclass
class WizardStepResult:
    step: str
    label: str
    success: bool
    skipped: bool = False
    message: str = ""
    result: Optional[Dict[str, Any]] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "step": self.step,
            "label": self.label,
            "success": self.success,
            "skipped": self.skipped,
            "message": self.message,
            "result": self.result,
        }


class ConfigManager:
    @staticmethod
    def _model_value(raw: Any) -> Any:
        if isinstance(raw, dict):
            return raw.get("primary")
        return raw

    @staticmethod
    def _model_fallbacks(raw: Any) -> List[str]:
        if isinstance(raw, dict):
            return list(raw.get("fallbacks") or [])
        return []

    def __init__(self, config_path: Optional[str] = None):
        self.config_path = Path(config_path).expanduser() if config_path else DEFAULT_CONFIG_PATH
        self.backup_dir = self.config_path.parent / "backups"
        self.backup_dir.mkdir(parents=True, exist_ok=True)

    def load(self) -> Dict[str, Any]:
        if not self.config_path.exists():
            raise FileNotFoundError(f"設定檔不存在: {self.config_path}")
        with self.config_path.open("r", encoding="utf-8") as f:
            return json.load(f)

    def get_summary(self) -> Dict[str, Any]:
        config = self.load()
        stat = self.config_path.stat()
        return {
            "configPath": str(self.config_path),
            "modifiedAt": datetime.fromtimestamp(stat.st_mtime).isoformat(),
            "sizeBytes": stat.st_size,
            "topLevelKeys": sorted(list(config.keys())),
            "backupCount": len(self.list_backups(limit=None)),
            "config": config,
            "cliValidation": self.validate_current_config(),
        }

    def _timestamp(self) -> str:
        return datetime.now().strftime("%Y-%m-%dT%H-%M-%S")

    def create_backup(self) -> Dict[str, Any]:
        if not self.config_path.exists():
            raise FileNotFoundError(f"設定檔不存在: {self.config_path}")
        backup_name = f"openclaw.{self._timestamp()}.json.bak"
        backup_path = self.backup_dir / backup_name
        shutil.copy2(self.config_path, backup_path)
        stat = backup_path.stat()
        return {
            "path": str(backup_path),
            "name": backup_path.name,
            "sizeBytes": stat.st_size,
            "createdAt": datetime.now().isoformat(),
        }

    def write_config(self, config: Dict[str, Any]) -> None:
        serialized = json.dumps(config, indent=2, ensure_ascii=False) + "\n"
        with self.config_path.open("w", encoding="utf-8") as f:
            f.write(serialized)

    def local_validate_draft(self, config: Any) -> Dict[str, Any]:
        try:
            serialized = json.dumps(config, indent=2, ensure_ascii=False)
            parsed = json.loads(serialized)
            return {
                "valid": True,
                "message": "Draft JSON is valid.",
                "topLevelKeys": sorted(list(parsed.keys())) if isinstance(parsed, dict) else [],
            }
        except Exception as exc:
            return {
                "valid": False,
                "message": str(exc),
                "topLevelKeys": [],
            }

    def _run_command(self, command: List[str]) -> CommandResult:
        try:
            # On Windows, we need shell=True to run .cmd/.bat files like 'openclaw.cmd' from npm
            is_windows = os.name == 'nt'
            result = subprocess.run(command, capture_output=True, text=True, shell=is_windows)
            return CommandResult(
                success=result.returncode == 0,
                command=command,
                returncode=result.returncode,
                stdout=result.stdout,
                stderr=result.stderr,
            )
        except FileNotFoundError:
            return CommandResult(
                success=False,
                command=command,
                returncode=-1,
                stdout="",
                stderr=f"找不到指令: {command[0]}。請確認 OpenClaw 是否已正確安裝並加入 PATH。",
            )
        except Exception as e:
            return CommandResult(
                success=False,
                command=command,
                returncode=-1,
                stdout="",
                stderr=str(e),
            )

    def validate_current_config(self) -> Dict[str, Any]:
        result = self._run_command([OPENCLAW_CLI, "config", "validate", "--json"])
        payload: Dict[str, Any] = result.to_dict()
        try:
            payload["parsed"] = json.loads(result.stdout) if result.stdout.strip() else None
        except json.JSONDecodeError:
            payload["parsed"] = None
        return payload

    def run_doctor(self, repair: bool = False) -> Dict[str, Any]:
        command = [OPENCLAW_CLI, "doctor", "--non-interactive"]
        if repair:
            command.append("--fix")
        return self._run_command(command).to_dict()

    def list_backups(self, limit: Optional[int] = 20) -> List[Dict[str, Any]]:
        items: List[Dict[str, Any]] = []
        for path in sorted(self.backup_dir.glob("*.bak"), key=lambda p: p.stat().st_mtime, reverse=True):
            stat = path.stat()
            items.append(
                {
                    "path": str(path),
                    "name": path.name,
                    "sizeBytes": stat.st_size,
                    "createdAt": datetime.fromtimestamp(stat.st_ctime).isoformat(),
                }
            )
        return items if limit is None else items[:limit]

    def restore_backup(self, backup_path: str) -> Dict[str, Any]:
        source = Path(backup_path).expanduser()
        if not source.exists():
            raise FileNotFoundError(f"備份檔不存在: {source}")
        shutil.copy2(source, self.config_path)
        stat = self.config_path.stat()
        return {
            "restored": True,
            "source": str(source),
            "configPath": str(self.config_path),
            "modifiedAt": datetime.fromtimestamp(stat.st_mtime).isoformat(),
        }

    def delete_backup(self, backup_path: str) -> Dict[str, Any]:
        p = Path(backup_path).expanduser()
        if not p.exists():
            return {"success": False, "message": f"找不到備份檔: {backup_path}"}
        
        # 安全檢查：確保檔案在備份目錄內
        try:
            if not str(p.resolve()).startswith(str(self.backup_dir.resolve())):
                 return {"success": False, "message": "非法刪除路徑"}
        except Exception as e:
            return {"success": False, "message": f"路徑驗證失敗: {str(e)}"}

        try:
            os.remove(p)
            return {"success": True, "message": f"備份檔 {p.name} 已刪除"}
        except Exception as e:
            return {"success": False, "message": f"刪除失敗: {str(e)}"}

    def save_with_safety(self, config: Dict[str, Any], run_repair_doctor: bool = False) -> Dict[str, Any]:
        draft_validation = self.local_validate_draft(config)
        if not draft_validation["valid"]:
            return {
                "success": False,
                "step": "local_validate",
                "draftValidation": draft_validation,
            }

        backup = self.create_backup()
        self.write_config(config)
        cli_validation = self.validate_current_config()
        doctor = self.run_doctor(repair=run_repair_doctor)
        return {
            "success": cli_validation["success"],
            "step": "done",
            "backup": backup,
            "draftValidation": draft_validation,
            "cliValidation": cli_validation,
            "doctor": doctor,
        }

    def system_status(self) -> Dict[str, Any]:
        exists = self.config_path.exists()
        stat = self.config_path.stat() if exists else None
        return {
            "configPath": str(self.config_path),
            "configExists": exists,
            "modifiedAt": datetime.fromtimestamp(stat.st_mtime).isoformat() if stat else None,
            "sizeBytes": stat.st_size if stat else 0,
            "backupCount": len(self.list_backups(limit=None)),
        }

    def get_model_summary(self) -> Dict[str, Any]:
        config = self.load()
        agents_cfg = config.get("agents", {})
        defaults = agents_cfg.get("defaults", {})
        default_model_raw = defaults.get("model")
        default_fallback_raw = defaults.get("fallbackModel")
        default_vision_raw = defaults.get("visionModel") or defaults.get("imageModel")
        default_model = self._model_value(default_model_raw)
        default_fallback = self._model_value(default_fallback_raw)
        default_vision = self._model_value(default_vision_raw)
        default_model_fallbacks = self._model_fallbacks(default_model_raw)
        default_vision_fallbacks = self._model_fallbacks(default_vision_raw)
        available_models = sorted(list((defaults.get("models") or {}).keys()))

        agent_rows: List[Dict[str, Any]] = []
        for agent in agents_cfg.get("list", []):
            model_raw = agent.get("model")
            fallback_raw = agent.get("fallbackModel")
            vision_raw = agent.get("visionModel") or agent.get("imageModel")
            model = self._model_value(model_raw)
            fallback = self._model_value(fallback_raw)
            vision = self._model_value(vision_raw)
            model_fallbacks = self._model_fallbacks(model_raw)
            vision_fallbacks = self._model_fallbacks(vision_raw)
            agent_rows.append(
                {
                    "id": agent.get("id"),
                    "useDefaultModel": model is None and not model_fallbacks,
                    "useDefaultFallbacks": fallback is None and not model_fallbacks,
                    "useDefaultVision": vision is None and not vision_fallbacks,
                    "model": model,
                    "fallbackModel": fallback,
                    "visionModel": vision,
                    "modelFallbacks": model_fallbacks,
                    "visionFallbacks": vision_fallbacks,
                    "effectiveModel": model or default_model,
                    "effectiveFallbackModel": fallback or default_fallback,
                    "effectiveVisionModel": vision or default_vision,
                    "effectiveModelFallbacks": model_fallbacks or default_model_fallbacks,
                    "effectiveVisionFallbacks": vision_fallbacks or default_vision_fallbacks,
                }
            )

        return {
            "globals": {
                "model": default_model,
                "fallbackModel": default_fallback,
                "visionModel": default_vision,
                "modelFallbacks": default_model_fallbacks,
                "visionFallbacks": default_vision_fallbacks,
            },
            "availableModels": available_models,
            "agents": agent_rows,
        }

    def update_global_models(self, model: Optional[str], fallback_model: Optional[str], vision_model: Optional[str], model_fallbacks: Optional[List[str]] = None, vision_fallbacks: Optional[List[str]] = None) -> Dict[str, Any]:
        config = self.load()
        defaults = config.setdefault("agents", {}).setdefault("defaults", {})
        if isinstance(defaults.get("model"), dict):
            defaults["model"]["primary"] = model
            defaults["model"]["fallbacks"] = model_fallbacks or []
        else:
            defaults["model"] = model
        if fallback_model:
            if isinstance(defaults.get("fallbackModel"), dict):
                defaults["fallbackModel"]["primary"] = fallback_model
            else:
                defaults["fallbackModel"] = fallback_model
        else:
            defaults.pop("fallbackModel", None)
        if vision_model:
            if isinstance(defaults.get("imageModel"), dict):
                defaults["imageModel"]["primary"] = vision_model
                defaults["imageModel"]["fallbacks"] = vision_fallbacks or []
            else:
                defaults["imageModel"] = vision_model
            defaults.pop("visionModel", None)
        else:
            defaults.pop("imageModel", None)
            defaults.pop("visionModel", None)
        return self.save_with_safety(config)

    def update_agent_models(self, agent_id: str, use_default_model: bool, use_default_fallbacks: bool, use_default_vision: bool, model: Optional[str], fallback_model: Optional[str], vision_model: Optional[str], model_fallbacks: Optional[List[str]] = None, vision_fallbacks: Optional[List[str]] = None) -> Dict[str, Any]:
        config = self.load()
        agents = config.setdefault("agents", {}).setdefault("list", [])
        target = next((agent for agent in agents if agent.get("id") == agent_id), None)
        if target is None:
            raise ValueError(f"找不到 agent: {agent_id}")

        if use_default_model and use_default_fallbacks and use_default_vision:
            target.pop("model", None)
            target.pop("fallbackModel", None)
            target.pop("visionModel", None)
            target.pop("imageModel", None)
        else:
            if use_default_model:
                target.pop("model", None)
            else:
                if model_fallbacks:
                    target["model"] = {"primary": model, "fallbacks": model_fallbacks}
                elif model:
                    target["model"] = model
                else:
                    target.pop("model", None)

            if use_default_fallbacks:
                target.pop("fallbackModel", None)
            else:
                if fallback_model:
                    target["fallbackModel"] = fallback_model
                else:
                    target.pop("fallbackModel", None)

            if use_default_vision:
                target.pop("imageModel", None)
                target.pop("visionModel", None)
            else:
                if vision_fallbacks:
                    target["imageModel"] = {"primary": vision_model, "fallbacks": vision_fallbacks}
                elif vision_model:
                    target["imageModel"] = vision_model
                else:
                    target.pop("imageModel", None)
                    target.pop("visionModel", None)

        return self.save_with_safety(config)

    def reset_agent_models(self, agent_id: str) -> Dict[str, Any]:
        return self.update_agent_models(agent_id, True, True, True, None, None, None, None, None)

    def get_memory_summary(self) -> Dict[str, Any]:
        config = self.load()
        memory = config.setdefault("agents", {}).setdefault("defaults", {}).get("memorySearch", {})
        hybrid = (((memory.get("query") or {}).get("hybrid")) or {})
        return {
            "settings": {
                "enabled": memory.get("enabled", True),
                "provider": memory.get("provider", "auto"),
                "model": memory.get("model", ""),
                "fallback": memory.get("fallback", "none"),
                "extraPaths": memory.get("extraPaths", []),
                "sessionMemory": ((memory.get("experimental") or {}).get("sessionMemory", False)),
                "sources": memory.get("sources", ["memory"]),
                "hybridEnabled": hybrid.get("enabled", False),
                "vectorWeight": hybrid.get("vectorWeight", 0.7),
                "textWeight": hybrid.get("textWeight", 0.3),
                "mmrEnabled": ((hybrid.get("mmr") or {}).get("enabled", False)),
                "mmrLambda": ((hybrid.get("mmr") or {}).get("lambda", 0.7)),
                "temporalDecayEnabled": ((hybrid.get("temporalDecay") or {}).get("enabled", False)),
                "halfLifeDays": ((hybrid.get("temporalDecay") or {}).get("halfLifeDays", 30)),
                "cacheEnabled": ((memory.get("cache") or {}).get("enabled", False)),
                "cacheMaxEntries": ((memory.get("cache") or {}).get("maxEntries", 50000)),
            },
            "help": {
                "provider": {"label": "Embedding Provider", "summary": "選擇記憶檢索使用的向量嵌入供應商。", "default": "auto", "required": False, "whenToUse": "當你要固定使用 gemini/openai/local/ollama 時設定。", "risk": "設定錯誤會導致 memory_search 無法工作。", "path": "agents.defaults.memorySearch.provider"},
                "model": {"label": "Embedding Model", "summary": "指定記憶檢索使用的 embedding model。", "default": "依 provider 而定", "required": False, "whenToUse": "需要固定向量模型或提升檢索品質時設定。", "risk": "更換模型可能觸發重建索引。", "path": "agents.defaults.memorySearch.model"},
                "fallback": {"label": "Fallback Provider", "summary": "主 provider 失敗時的後援供應商。", "default": "none", "required": False, "whenToUse": "希望 memorySearch 在主供應商失敗時仍可運作。", "risk": "可能增加成本或造成結果差異。", "path": "agents.defaults.memorySearch.fallback"},
                "extraPaths": {"label": "Extra Paths", "summary": "額外要納入記憶索引的 Markdown 路徑。", "default": "[]", "required": False, "whenToUse": "要把工作筆記、額外文件夾一起納入檢索時。", "risk": "索引量過大會增加建立時間與成本。", "path": "agents.defaults.memorySearch.extraPaths"},
                "hybridEnabled": {"label": "Hybrid Search", "summary": "同時使用向量檢索與關鍵字 BM25。", "default": "false", "required": False, "whenToUse": "資料量較大、需要語意+關鍵字兼顧時。", "risk": "參數不佳時可能造成排序不如預期。", "path": "agents.defaults.memorySearch.query.hybrid.enabled"},
                "mmrEnabled": {"label": "MMR 去重重排", "summary": "降低重複相似結果，增加多樣性。", "default": "false", "required": False, "whenToUse": "搜尋結果常出現高度相似片段時。", "risk": "過度去重可能犧牲最相關結果。", "path": "agents.defaults.memorySearch.query.hybrid.mmr.enabled"},
                "temporalDecayEnabled": {"label": "Temporal Decay 時序衰減", "summary": "讓新近資料比舊資料更容易排前面。", "default": "false", "required": False, "whenToUse": "每日筆記很多、近期資訊更重要時。", "risk": "可能讓舊但重要的資訊被壓後。", "path": "agents.defaults.memorySearch.query.hybrid.temporalDecay.enabled"},
                "cacheEnabled": {"label": "Embedding Cache", "summary": "快取嵌入結果，加快重建與更新。", "default": "false", "required": False, "whenToUse": "記憶量大、重建頻繁時。", "risk": "快取空間會持續增加。", "path": "agents.defaults.memorySearch.cache.enabled"},
            },
        }

    def update_memory_settings(self, settings: Dict[str, Any]) -> Dict[str, Any]:
        config = self.load()
        memory = config.setdefault("agents", {}).setdefault("defaults", {}).setdefault("memorySearch", {})
        memory["enabled"] = settings.get("enabled", True)
        memory["provider"] = settings.get("provider") or "auto"
        if settings.get("model"):
            memory["model"] = settings.get("model")
        else:
            memory.pop("model", None)
        memory["fallback"] = settings.get("fallback") or "none"
        memory["extraPaths"] = settings.get("extraPaths", [])
        memory.setdefault("experimental", {})["sessionMemory"] = settings.get("sessionMemory", False)
        memory["sources"] = settings.get("sources", ["memory"])
        hybrid = memory.setdefault("query", {}).setdefault("hybrid", {})
        hybrid["enabled"] = settings.get("hybridEnabled", False)
        hybrid["vectorWeight"] = settings.get("vectorWeight", 0.7)
        hybrid["textWeight"] = settings.get("textWeight", 0.3)
        hybrid.setdefault("mmr", {})["enabled"] = settings.get("mmrEnabled", False)
        hybrid["mmr"]["lambda"] = settings.get("mmrLambda", 0.7)
        hybrid.setdefault("temporalDecay", {})["enabled"] = settings.get("temporalDecayEnabled", False)
        hybrid["temporalDecay"]["halfLifeDays"] = settings.get("halfLifeDays", 30)
        memory.setdefault("cache", {})["enabled"] = settings.get("cacheEnabled", False)
        memory["cache"]["maxEntries"] = settings.get("cacheMaxEntries", 50000)
        return self.save_with_safety(config)

    def _plugin_definitions(self) -> Dict[str, Dict[str, Any]]:
        return {
            "memory-lancedb-pro": {
                "repo": "https://github.com/CortexReach/memory-lancedb-pro-skill.git",
                "dir": PLUGIN_WIZARD_DIR / "memory-lancedb-pro-skill",
                "setup_script": "https://raw.githubusercontent.com/CortexReach/toolbox/main/memory-lancedb-pro-setup/setup-memory.sh",
                "entry_id": "memory-lancedb-pro",
            },
            "lossless-claw-enhanced": {
                "repo": "https://github.com/win4r/lossless-claw-enhanced",
                "dir": PLUGIN_WIZARD_DIR / "lossless-claw-enhanced",
                "entry_id": "lossless-claw",
            },
        }

    def _plugin_runtime_status(self, plugin_id: str, config: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        config = config or self.load()
        definitions = self._plugin_definitions()
        if plugin_id not in definitions:
            raise ValueError(f"不支援的 plugin: {plugin_id}")

        definition = definitions[plugin_id]
        plugins = config.get("plugins") or {}
        entries = plugins.get("entries") or {}
        slots = plugins.get("slots") or {}
        entry = entries.get(definition["entry_id"]) or {}
        plugin_dir = definition["dir"]

        status: Dict[str, Any] = {
            "repo": definition["repo"],
            "pluginDir": str(plugin_dir),
            "dirExists": plugin_dir.exists(),
            "entryId": definition["entry_id"],
            "installed": definition["entry_id"] in entries,
            "enabled": bool(entry.get("enabled", False)),
            "configPresent": bool(entry.get("config")),
        }
        if plugin_id == "memory-lancedb-pro":
            status["slotted"] = slots.get("memory") == "memory-lancedb-pro"
        if plugin_id == "lossless-claw-enhanced":
            plugin_config = entry.get("config") or {}
            status["configKeys"] = sorted(plugin_config.keys())
            status["contextThreshold"] = plugin_config.get("contextThreshold")
            status["dbPath"] = plugin_config.get("dbPath")
        return status

    def _run_wizard_commands(self, steps: List[Dict[str, Any]]) -> Dict[str, Any]:
        step_results: List[Dict[str, Any]] = []
        success = True
        for step in steps:
            result = self._run_command(step["command"])
            wrapped = WizardStepResult(
                step=step["step"],
                label=step["label"],
                success=result.success,
                message=step.get("message", ""),
                result=result.to_dict(),
            )
            step_results.append(wrapped.to_dict())
            if not result.success:
                success = False
                break
        return {"success": success, "steps": step_results}

    def plugin_wizard_summary(self) -> Dict[str, Any]:
        config = self.load()
        return {
            "checks": {
                "git": which_shutil.which("git") is not None,
                "bash": which_shutil.which("bash") is not None,
                "openclaw": which_shutil.which("openclaw") is not None,
                "curl": which_shutil.which("curl") is not None,
                "conda": which_shutil.which("conda") is not None,
            },
            "website": {
                "frontendDistReady": FRONTEND_DIST_DIR.exists(),
                "frontendDistPath": str(FRONTEND_DIST_DIR),
            },
            "plugins": {
                plugin_id: self._plugin_runtime_status(plugin_id, config)
                for plugin_id in self._plugin_definitions().keys()
            },
        }

    def run_plugin_wizard_action(self, plugin_id: str, action: str) -> Dict[str, Any]:
        PLUGIN_WIZARD_DIR.mkdir(parents=True, exist_ok=True)
        plugin_defs = self._plugin_definitions()
        if plugin_id not in plugin_defs:
            raise ValueError(f"不支援的 plugin: {plugin_id}")

        target = plugin_defs[plugin_id]
        plugin_dir = target["dir"]
        if action == "clone":
            if plugin_dir.exists():
                return {
                    "success": True,
                    "pluginId": plugin_id,
                    "action": action,
                    "steps": [
                        WizardStepResult(
                            step="clone",
                            label="Clone repository",
                            success=True,
                            skipped=True,
                            message=f"{plugin_dir} 已存在，略過 clone",
                            result=None,
                        ).to_dict()
                    ],
                    "status": self._plugin_runtime_status(plugin_id),
                }
            steps = [
                {
                    "step": "clone",
                    "label": "Clone repository",
                    "command": ["git", "clone", target["repo"], str(plugin_dir)],
                }
            ]
        elif action == "setup" and plugin_id == "memory-lancedb-pro":
            script_path = PLUGIN_WIZARD_DIR / "setup-memory.sh"
            steps = [
                {
                    "step": "download-setup",
                    "label": "Download setup script",
                    "command": ["curl", "-fsSL", target["setup_script"], "-o", str(script_path)],
                },
                {
                    "step": "run-setup",
                    "label": "Run setup script",
                    "command": ["bash", str(script_path)],
                },
            ]
        elif action == "install":
            steps = [
                {
                    "step": "install",
                    "label": "Install plugin with openclaw",
                    "command": [OPENCLAW_CLI, "plugins", "install", "--link", str(plugin_dir)],
                }
            ]
        else:
            raise ValueError(f"不支援的 action: {action}")

        result = self._run_wizard_commands(steps)
        result.update({
            "pluginId": plugin_id,
            "action": action,
            "status": self._plugin_runtime_status(plugin_id),
        })
        return result

    def configure_plugin_wizard_plugin(self, plugin_id: str) -> Dict[str, Any]:
        config = self.load()
        before_config = deepcopy(config)
        plugins = config.setdefault("plugins", {})
        entries = plugins.setdefault("entries", {})
        slots = plugins.setdefault("slots", {})
        notes: List[str] = []

        if plugin_id == "memory-lancedb-pro":
            slots["memory"] = "memory-lancedb-pro"
            entries["memory-lancedb-pro"] = {
                "enabled": True,
                "config": {
                    "embedding": {
                        "provider": "openai-compatible",
                        "apiKey": "${OPENAI_API_KEY}",
                        "model": "text-embedding-3-small",
                    },
                    "autoCapture": True,
                    "autoRecall": True,
                    "smartExtraction": True,
                    "extractMinMessages": 2,
                    "extractMaxChars": 8000,
                    "sessionMemory": {"enabled": False},
                },
            }
            notes.append("已設定 memory slot 指向 memory-lancedb-pro")
            notes.append("已寫入 memory-lancedb-pro 預設 config")
        elif plugin_id == "lossless-claw-enhanced":
            entries.pop("lossless-claw-enhanced", None)
            entry = entries.setdefault("lossless-claw", {"enabled": True, "config": {}})
            entry["enabled"] = True
            current_config = entry.get("config") or {}
            entry["config"] = {
                key: value
                for key, value in current_config.items()
                if key in {
                    "enabled",
                    "contextThreshold",
                    "incrementalMaxDepth",
                    "freshTailCount",
                    "leafMinFanout",
                    "condensedMinFanout",
                    "condensedMinFanoutHard",
                    "dbPath",
                    "ignoreSessionPatterns",
                    "statelessSessionPatterns",
                    "skipStatelessSessions",
                    "largeFileThresholdTokens",
                    "summaryModel",
                    "summaryProvider",
                    "expansionModel",
                    "expansionProvider",
                }
            }
            plugin_config = entry["config"]
            plugin_config.setdefault("contextThreshold", 0.7)
            plugin_config.setdefault("freshTailCount", 8)
            plugin_config.setdefault("dbPath", "~/.openclaw/lcm.db")
            notes.append("已以正確 plugin id `lossless-claw` 啟用 lossless-claw-enhanced")
            notes.append("已清除不符合 schema 的舊 key，改為最小安全預設設定")
        else:
            raise ValueError(f"不支援的 plugin: {plugin_id}")

        result = self.save_with_safety(config)
        result["pluginId"] = plugin_id
        result["changes"] = {
            "before": self._plugin_runtime_status(plugin_id, before_config),
            "after": self._plugin_runtime_status(plugin_id, config),
            "notes": notes,
        }
        return result

    def plugin_wizard_validate_chain(self, plugin_id: Optional[str] = None) -> Dict[str, Any]:
        cli_validation = self.validate_current_config()
        doctor = self.run_doctor(repair=False)
        payload = {
            "cliValidation": cli_validation,
            "doctor": doctor,
            "success": bool(cli_validation.get("success") and doctor.get("success")),
        }
        if plugin_id:
            payload["pluginId"] = plugin_id
            payload["status"] = self._plugin_runtime_status(plugin_id)
        return payload

    # --- Channels Settings (Telegram) ---
    def get_telegram_channels(self) -> Dict[str, Any]:
        config = self.load()
        channels = config.get("channels", {})
        telegram = channels.get("telegram", {})
        return {
            "enabled": telegram.get("enabled", False),
            "accounts": telegram.get("accounts", {})
        }

    def update_telegram_accounts(self, accounts: Dict[str, Any], enabled: bool) -> Dict[str, Any]:
        config = self.load()
        telegram = config.setdefault("channels", {}).setdefault("telegram", {})
        telegram["enabled"] = enabled
        telegram["accounts"] = accounts
        return self.save_with_safety(config)

    # --- Skills Management ---
    def get_skills_summary(self) -> Dict[str, Any]:
        config = self.load()
        entries = config.get("skills", {}).get("entries", {})
        
        # Get available agents and build dynamic workspace paths
        agents_section = config.get("agents", {})
        agent_list = agents_section.get("list", [])
        agent_names = [a.get("id") for a in agent_list if a.get("id")]
        
        # We'll use a set of strings to keep search paths unique
        unique_search_dirs = {
            str(Path.home() / ".openclaw" / "skills"),
            str(Path.home() / ".openclaw" / "workspace" / "skills")
        }
        
        # Add all agent specific skill paths (state dir and defined workspace)
        for agent in agent_list:
            agent_id = agent.get("id")
            if agent_id:
                # 1. State dir skills
                unique_search_dirs.add(str(Path.home() / ".openclaw" / "agents" / agent_id / "skills"))
            
            # 2. Workspace skills (if defined)
            ws_path = agent.get("workspace")
            if ws_path:
                try:
                    ws_skills = Path(ws_path).expanduser() / "skills"
                    unique_search_dirs.add(str(ws_skills))
                except Exception:
                    pass

        search_dirs = [Path(d) for d in unique_search_dirs]

        local_skills: Dict[str, Dict[str, Any]] = {}
        
        def get_git_info(p: Path) -> Dict[str, str]:
            if not (p / ".git").exists(): return None
            try:
                import subprocess
                res = subprocess.run(["git", "log", "-1", "--format=%h|%aI"], cwd=str(p), capture_output=True, text=True, check=True)
                parts = res.stdout.strip().split("|", 1)
                if len(parts) == 2:
                    return {"hash": parts[0], "date": parts[1]}
            except Exception:
                pass
            return None

        for base_dir in search_dirs:
            if not base_dir.exists() or not base_dir.is_dir():
                continue
            
            # Determine category based on path (Simple Global vs Workspace)
            global_p_res = (Path.home() / ".openclaw" / "skills").resolve()
            
            try:
                is_global = base_dir.resolve() == global_p_res
            except Exception:
                is_global = False
                
            category = "global" if is_global else "workspace"

            for item in base_dir.iterdir():
                if item.is_dir() and not item.name.startswith("."):
                    skill_id = item.name
                    path_str = str(item)
                    if path_str not in local_skills:
                        is_git = (item / ".git").exists()
                        git_info = get_git_info(item) if is_git else None
                        local_skills[path_str] = {
                            "id": skill_id,
                            "path": path_str,
                            "isGitRepo": is_git,
                            "gitInfo": git_info,
                            "enabled": entries.get(skill_id, {}).get("enabled", False),
                            "inConfig": skill_id in entries,
                            "category": category
                        }
        
        # Also add skills that are in config but not found on disk (maybe remote or other paths?)
        # Since we use path_str as key, we need to check if config skill_id was already handled
        found_skill_ids = {s["id"] for s in local_skills.values()}
        for skill_id, entry_data in entries.items():
            if skill_id not in found_skill_ids:
                dummy_path = f"Unknown-{skill_id}"
                local_skills[dummy_path] = {
                    "id": skill_id,
                    "path": "Unknown",
                    "isGitRepo": False,
                    "enabled": entry_data.get("enabled", False),
                    "inConfig": True,
                    "category": "workspace"
                }
                
        return {
            "skills": list(local_skills.values()),
            "agents": agent_names
        }

    def get_skill_metadata(self, path_str: str) -> Dict[str, Any]:
        """動態讀取技能元數據 (用途說明與觸發指令)。"""
        if not path_str or path_str == "Unknown":
            return {"description": "無法取得檔案資訊", "triggers": []}
            
        p = Path(path_str)
        if not p.exists() or not p.is_dir():
            return {"description": "目錄不存在或已移除", "triggers": []}
            
        md_files = ["SKILL.md", "README.md", f"{p.name}.md"]
        desc = ""
        triggers = []
        
        for md_name in md_files:
            md_path = p / md_name
            if md_path.exists():
                try:
                    content = md_path.read_text(encoding="utf-8")
                    lines = content.splitlines()
                    
                    # 1. 提取描述 (第一個非標題段落)
                    for line in lines:
                        clean = line.strip()
                        if clean and not clean.startswith("#") and not desc:
                            desc = clean
                            break
                    
                    # 2. 提取觸發字 (尋找特定標題下的清單)
                    trigger_headers = ["觸發", "指令", "trigger", "command", "usage", "指令"]
                    capturing = False
                    for line in lines:
                        clean = line.strip()
                        if any(h in clean.lower() for h in trigger_headers) and clean.startswith("#"):
                            capturing = True
                            continue
                        if capturing:
                            if clean.startswith(("#")): # 下一個標題，停止
                                capturing = False
                                if triggers: break
                                continue
                            if clean.startswith(("-", "*", "1.")):
                                t = clean.lstrip("- *1. `").rstrip("`").strip()
                                if t: triggers.append(t)
                                if len(triggers) > 8: break # 限制數量
                except Exception:
                    pass
                if desc or triggers: break
        
        return {"description": desc or "無說明", "triggers": triggers}

    def toggle_skill(self, skill_id: str, enabled: bool) -> Dict[str, Any]:
        config = self.load()
        skills = config.setdefault("skills", {})
        entries = skills.setdefault("entries", {})
        if skill_id not in entries:
            entries[skill_id] = {}
        entries[skill_id]["enabled"] = enabled
        return self.save_with_safety(config)

    def remove_skill(self, skill_id: str, delete_files: bool, skill_path: str = "") -> Dict[str, Any]:
        config = self.load()
        entries = config.get("skills", {}).get("entries", {})
        if skill_id in entries:
            del entries[skill_id]
        
        # Optionally remove files
        file_removed = False
        if delete_files and skill_path:
            p = Path(skill_path)
            if p.exists() and p.is_dir():
                shutil.rmtree(p, ignore_errors=True)
                file_removed = True
                
        result = self.save_with_safety(config)
        result["file_removed"] = file_removed
        return result

    def pull_skill(self, skill_path: str) -> Dict[str, Any]:
        p = Path(skill_path)
        if not p.exists() or not p.is_dir():
            return {"success": False, "message": "目錄不存在"}
        if not (p / ".git").exists():
            return {"success": False, "message": "不是 Git Repository"}
        
        result = self._run_command(["git", "-C", str(p), "pull"])
        return {
            "success": result.success,
            "stdout": result.stdout,
            "stderr": result.stderr
        }

    def check_skills_updates(self, paths: List[str]) -> Dict[str, Any]:
        import subprocess
        from concurrent.futures import ThreadPoolExecutor, as_completed
        
        results = {}
        
        def check_single_skill(p_str: str) -> tuple:
            p = Path(p_str)
            if not (p / ".git").exists():
                return p_str, None
            try:
                # Get local hash
                res_local = subprocess.run(["git", "rev-parse", "HEAD"], cwd=str(p), capture_output=True, text=True, check=True)
                local_hash = res_local.stdout.strip()
                
                # Get remote hash with timeout to avoid hanging
                res_remote = subprocess.run(
                    ["git", "ls-remote", "origin", "HEAD"], 
                    cwd=str(p), capture_output=True, text=True, check=True, timeout=10
                )
                if res_remote.stdout.strip():
                    remote_hash = res_remote.stdout.strip().split()[0]
                    needs_update = local_hash != remote_hash
                    return p_str, {"needsUpdate": needs_update, "remoteHash": remote_hash}
            except Exception:
                # Silently ignore if remote is unreachable or times out
                pass
            return p_str, None

        with ThreadPoolExecutor(max_workers=10) as executor:
            future_to_path = {executor.submit(check_single_skill, p_str): p_str for p_str in paths}
            for future in as_completed(future_to_path):
                p_str, res = future.result()
                if res is not None:
                    results[p_str] = res
                    
        return results

    def clone_skill(self, git_url: str, target: str) -> Dict[str, Any]:
        # target can be 'global', 'workspace' (default common), or 'agent:<agent_name>'
        if target == 'global':
            base_dir = Path.home() / ".openclaw" / "skills"
        elif target.startswith('agent:'):
            agent_name = target.split(":", 1)[1]
            base_dir = Path.home() / ".openclaw" / "agents" / agent_name / "skills"
        else:
            base_dir = Path.home() / ".openclaw" / "workspace" / "skills"

        base_dir.mkdir(parents=True, exist_ok=True)
        
        # Extract name from git url
        name = git_url.split("/")[-1].replace(".git", "")
        if not name:
            return {"success": False, "message": "無法解析 Git URL的名稱"}
            
        target_dir = base_dir / name
        if target_dir.exists():
            return {"success": False, "message": f"技能 {name} 目錄已存在"}
            
        result = self._run_command(["git", "clone", git_url, str(target_dir)])
        
        if result.success:
            # Auto register it as enabled
            config = self.load()
            skills = config.setdefault("skills", {})
            entries = skills.setdefault("entries", {})
            if name not in entries:
                entries[name] = {}
            entries[name]["enabled"] = True
            self.save_with_safety(config)

        return {
            "success": result.success,
            "stdout": result.stdout,
            "stderr": result.stderr,
            "message": result.stderr if not result.success else "複製並註冊成功"
        }

    def get_agents_summary(self) -> Dict[str, Any]:
        config = self.load()
        agents_section = config.get("agents", {})
        defaults = agents_section.get("defaults", {})
        agent_list = agents_section.get("list", [])
        
        # Extract all available models from the global config
        models_section = config.get("models", {})
        available_models = []
        providers = models_section.get("providers", {})
        for provider_id, provider_info in providers.items():
            for m in provider_info.get("models", []):
                available_models.append(f"{provider_id}/{m['id']}")
        
        # Build tool catalog by scanning all agents and adding common ones
        tool_catalog = set([
            "read", "write", "edit", "web_search", "web_fetch", "browser", 
            "sessions_list", "sessions_history", "sessions_send", "message",
            "docx", "xlsx", "mcp-civil-tools", "engineering-composer"
        ])
        for agent in agent_list:
            tools = agent.get("tools", {})
            if isinstance(tools, dict):
                allow = tools.get("allow", [])
                if isinstance(allow, list):
                    for t in allow:
                        tool_catalog.add(t)
        
        return {
            "defaults": defaults,
            "agents": agent_list,
            "availableModels": sorted(list(set(available_models))),
            "toolCatalog": sorted(list(tool_catalog))
        }

    def update_agent(self, agent_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        config = self.load()
        agents_section = config.get("agents", {})
        agent_list = agents_section.get("list", [])
        
        found = False
        for i, agent in enumerate(agent_list):
            if agent.get("id") == agent_id:
                # For complex fields like tools, we expect the full nested structure from frontend
                # We perform a shallow update for top-level keys
                agent_list[i].update(updates)
                found = True
                break
        
        if not found:
            return {"success": False, "message": f"找不到 Agent ID: {agent_id}"}
            
        self.save_with_safety(config)
        return {"success": True, "message": f"Agent {agent_id} 更新成功"}

    def get_agent_markdown_files(self, agent_id: str) -> List[Dict[str, Any]]:
        # 1. 確定私體目錄 (State Dir)
        state_dir = Path.home() / ".openclaw" / "agents" / agent_id
        
        # 2. 從配置中獲取定義的工作空間 (Workspace Dir)
        workspace_dir: Optional[Path] = None
        try:
            config = self.load()
            agents = config.get("agents", {}).get("list", [])
            target_agent = next((a for a in agents if a.get("id") == agent_id), None)
            if target_agent and target_agent.get("workspace"):
                workspace_dir = Path(target_agent.get("workspace")).expanduser()
        except Exception as e:
            logger.error(f"Error loading config for agent {agent_id}: {e}")

        whitelist = ['AGENTS.md', 'IDENTITY.md', 'SOUL.md', 'USER.md', 'HEARTBEAT.md', 'MEMORY.md']
        results = []
        
        for filename in whitelist:
            state_p = state_dir / filename
            ws_p = workspace_dir / filename if workspace_dir else None
            
            exists_in_state = state_p.exists() and state_p.is_file()
            exists_in_ws = ws_p and ws_p.exists() and ws_p.is_file()
            
            if not exists_in_state and not exists_in_ws:
                continue
                
            # 決定讀取來源 (優先讀取 Workspace)
            primary_p = ws_p if exists_in_ws else state_p
            origin = "workspace" if exists_in_ws else "state"
            warning = None
            
            if exists_in_state and exists_in_ws:
                origin = "both"
                warning = f"偵測到衝突：檔案同時存在於私體目錄 ({state_dir}) 與工作空間 ({workspace_dir})。目前優先顯示工作空間版本。"
            
            try:
                content = primary_p.read_text(encoding='utf-8')
                results.append({
                    "filename": filename,
                    "content": content,
                    "sizeBytes": primary_p.stat().st_size,
                    "modifiedAt": datetime.fromtimestamp(primary_p.stat().st_mtime).isoformat(),
                    "origin": origin,
                    "warning": warning,
                    "path": str(primary_p)
                })
            except Exception as e:
                logger.error(f"Error reading agent file {filename}: {e}")
                
        return results

    def save_agent_markdown_file(self, agent_id: str, filename: str, content: str) -> Dict[str, Any]:
        whitelist = ['AGENTS.md', 'IDENTITY.md', 'SOUL.md', 'USER.md', 'HEARTBEAT.md', 'MEMORY.md']
        if filename not in whitelist:
            return {"success": False, "message": "不允許編輯此檔案類型"}
            
        # 1. 獲取可能的所有路徑
        state_dir = Path.home() / ".openclaw" / "agents" / agent_id
        workspace_dir: Optional[Path] = None
        try:
            config = self.load()
            agents = config.get("agents", {}).get("list", [])
            target_agent = next((a for a in agents if a.get("id") == agent_id), None)
            if target_agent and target_agent.get("workspace"):
                workspace_dir = Path(target_agent.get("workspace")).expanduser()
        except Exception:
            pass
            
        state_p = state_dir / filename
        ws_p = workspace_dir / filename if workspace_dir else None
        
        # 2. 決定保存路徑 (優先保存至 Workspace)
        # 如果兩處都存在，保存至 Workspace 並警告
        # 如果只有一處存在，保存至該處
        # 如果都無，保存至 Workspace (若有定義) 否則 State
        target_p = ws_p if ws_p else state_p
        
        # 針對同時存在的警告
        warning = None
        if ws_p and ws_p.exists() and state_p.exists():
            warning = f"注意：檔案同時存在於工作空間與私體目錄。已更新工作空間版本，請手動清理私體目錄中的 {filename} 以避免衝突。"

        try:
            # 建立父目錄
            target_p.parent.mkdir(parents=True, exist_ok=True)
            
            # 備份
            if target_p.exists():
                backup_p = target_p.with_suffix(f'.md.bak')
                import shutil
                shutil.copy2(target_p, backup_p)
                
            target_p.write_text(content, encoding='utf-8')
            return {
                "success": True, 
                "message": f"檔案 {filename} 已成功儲存",
                "warning": warning,
                "path": str(target_p)
            }
        except Exception as e:
            return {"success": False, "message": f"儲存失敗: {str(e)}"}

    def delete_agent(self, agent_id: str) -> Dict[str, Any]:
        config = self._load_json()
        agents = config.get("agents", [])
        
        # 1. Find the agent to get workspace path
        target_agent = next((a for a in agents if a.get("id") == agent_id), None)
        if not target_agent:
            return {"success": False, "message": f"找不到 Agent {agent_id}"}
            
        # 2. Remove from agents list
        config["agents"] = [a for a in agents if a.get("id") != agent_id]
        
        # 3. Remove from bindings
        if "bindings" in config:
            config["bindings"] = [b for b in config["bindings"] if b.get("agentId") != agent_id]
            
        # 4. Physical deletion
        workspace = target_agent.get("workspace")
        if workspace:
            workspace_path = Path(workspace)
            if workspace_path.exists() and workspace_path.is_dir():
                import shutil
                try:
                    shutil.rmtree(workspace_path)
                except Exception as e:
                    logger.error(f"Failed to delete directory {workspace_path}: {e}")
                    # Continue even if directory delete fails, but log it
                    
        # 5. Save config
        self.save_with_safety(config)
        return {"success": True, "message": f"Agent {agent_id} 及其所有綁定設定與實體檔案已刪除"}

    def clone_agent(self, src_id: str, target_id: str) -> Dict[str, Any]:
        config = self._load_json()
        agents = config.get("agents", [])
        
        # 1. Check source exists and target does not
        src_agent = next((a for a in agents if a.get("id") == src_id), None)
        if not src_agent:
            return {"success": False, "message": f"找不到來源 Agent {src_id}"}
            
        if any(a.get("id") == target_id for a in agents):
            return {"success": False, "message": f"目標 ID {target_id} 已存在"}
            
        # 2. Clone config
        import copy
        new_agent = copy.deepcopy(src_agent)
        new_agent["id"] = target_id
        new_agent["name"] = (new_agent.get("name") or src_id) + " (Copy)"
        
        # 3. Physical copy
        src_workspace = src_agent.get("workspace")
        if src_workspace:
            src_path = Path(src_workspace)
            if src_path.exists() and src_path.is_dir():
                # Define new workspace path
                target_path = src_path.parent / target_id
                new_agent["workspace"] = str(target_path)
                
                import shutil
                try:
                    shutil.copytree(src_path, target_path)
                except Exception as e:
                    return {"success": False, "message": f"實體目錄複製失敗: {str(e)}"}
            else:
                return {"success": False, "message": "找不到來源 Agent 的實體目錄"}
        else:
            return {"success": False, "message": "來源 Agent 沒有定義工作空間"}
            
        # 4. Add to config
        config["agents"].append(new_agent)
        
        # 5. Save config
        self.save_with_safety(config)
        return {"success": True, "message": f"Agent {src_id} 已成功複製為 {target_id}"}

    def check_agent(self, agent_id: str) -> Dict[str, Any]:
        """實質檢測 Agent 的配置與環境狀態。"""
        config = self.load()
        agents = config.get("agents", {}).get("list", [])
        target = next((a for a in agents if a.get("id") == agent_id), None)
        
        if not target:
            return {"success": False, "message": f"找不到 Agent: {agent_id}"}
            
        issues = []
        status = "healthy"
        
        # 1. 檢查工作空間
        workspace = target.get("workspace")
        if not workspace:
            issues.append("未定義工作空間路徑 (Workspace Path)")
            status = "warning"
        else:
            p = Path(workspace).expanduser()
            if not p.exists():
                issues.append(f"定義的工作空間目錄不存在: {workspace}")
                status = "error"
            elif not p.is_dir():
                issues.append(f"工作空間路徑不是一個目錄: {workspace}")
                status = "error"
            else:
                # 檢查核心定義檔
                core_files = ['AGENTS.md', 'IDENTITY.md', 'SOUL.md']
                found_files = [f for f in core_files if (p / f).exists()]
                if not found_files:
                    issues.append(f"工作空間中找不到核心定義檔 ({', '.join(core_files)})")
                    status = "warning"

        # 2. 檢查模型配置
        model = target.get("model", {})
        if not model.get("primary"):
            issues.append("未指定主力模型 (Primary Model)，將使用系統預設值")
            if status == "healthy": status = "info"

        # 3. 檢查指令長度
        instructions = target.get("instructions", "")
        if len(instructions) < 20:
            issues.append("系統指令 (Instructions) 過於簡短，可能影響表現")
            if status == "healthy": status = "warning"

        return {
            "success": status != "error",
            "status": status,
            "agentId": agent_id,
            "issues": issues,
            "message": "檢測完成" if not issues else f"檢測到 {len(issues)} 個事項",
            "timestamp": datetime.now().isoformat()
        }

    def optimize_agent(self, agent_id: str) -> Dict[str, Any]:
        """實質優化 Agent 的配置結構。"""
        config = self.load()
        agents = config.get("agents", {}).get("list", [])
        
        target_idx = -1
        for i, a in enumerate(agents):
            if a.get("id") == agent_id:
                target_idx = i
                break
                
        if target_idx == -1:
            return {"success": False, "message": f"找不到 Agent: {agent_id}"}
            
        target = agents[target_idx]
        changes = []
        
        # 1. 優化工具列表：去重並排序
        tools = target.get("tools", {})
        if isinstance(tools, dict) and "allow" in tools:
            original = tools["allow"]
            optimized = sorted(list(set(original)))
            if original != optimized:
                tools["allow"] = optimized
                changes.append("已整理並排序工具權限清單 (Tools.Allow)")

        # 2. 優化技能列表：去重並排序
        skills = target.get("skills", {})
        if isinstance(skills, dict) and "allow" in skills:
            original = skills["allow"]
            optimized = sorted(list(set(original)))
            if original != optimized:
                skills["allow"] = optimized
                changes.append("已整理並排序技能權限清單 (Skills.Allow)")

        # 3. 移除空欄位
        keys_to_check = ["description", "name", "instructions"]
        for k in keys_to_check:
            if k in target and target[k] is None:
                target.pop(k)
                changes.append(f"移除了無效的空欄位: {k}")

        if not changes:
            return {"success": True, "message": "配置已是最佳狀態，無需變更", "changes": []}
            
        # 儲存變更
        self.save_with_safety(config)
        return {
            "success": True, 
            "message": f"成功執行了 {len(changes)} 項優化", 
            "changes": changes
        }
