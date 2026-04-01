from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import uvicorn

from openclaw_config_manager import ConfigManager, FRONTEND_DIST_DIR
from gateway_connection import gateway_manager, initialize_connection
import logging

# 設定日誌
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="OpenClaw EZ-Control API")
manager = ConfigManager()

# 初始化時檢查 Gateway 連接 (改為非同步啟動，不阻塞主流程)
import threading
threading.Thread(target=initialize_connection, daemon=True).start()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class ConfigPayload(BaseModel):
    config: Dict[str, Any]


class RollbackPayload(BaseModel):
    backupPath: str


class DeleteBackupPayload(BaseModel):
    backupPath: str


class GlobalModelsPayload(BaseModel):
    model: str | None = None
    fallbackModel: str | None = None
    visionModel: str | None = None
    modelFallbacks: list[str] | None = None
    visionFallbacks: list[str] | None = None


class AgentModelsPayload(BaseModel):
    agentId: str
    useDefaultModel: bool = False
    useDefaultFallbacks: bool = False
    useDefaultVision: bool = False
    model: str | None = None
    fallbackModel: str | None = None
    visionModel: str | None = None
    modelFallbacks: list[str] | None = None
    visionFallbacks: list[str] | None = None


class MemorySettingsPayload(BaseModel):
    settings: Dict[str, Any]


class PluginWizardPayload(BaseModel):
    pluginId: str
    action: str | None = None


class TelegramChannelsPayload(BaseModel):
    enabled: bool
    accounts: Dict[str, Any]


class SkillTogglePayload(BaseModel):
    skillId: str
    enabled: bool


class SkillRemovePayload(BaseModel):
    skillId: str
    deleteFiles: bool = False
    skillPath: str = ""


class SkillPullPayload(BaseModel):
    skillPath: str


class SkillClonePayload(BaseModel):
    gitUrl: str
    target: str


class SkillMetadataPayload(BaseModel):
    path: str


class CheckUpdatesPayload(BaseModel):
    paths: List[str]


class AgentUpdatePayload(BaseModel):
    updates: Dict[str, Any]


class AgentFileUpdatePayload(BaseModel):
    filename: str
    content: str


class AgentClonePayload(BaseModel):
    target_id: str



def check_gateway_connection():
    """檢查 Gateway 連接，如果斷線則嘗試重連。"""
    if not gateway_manager.is_connected:
        status = gateway_manager.check_gateway_status()
        if status["running"]:
            gateway_manager.is_connected = True
            logger.info("Gateway 連接已恢復")
        else:
            logger.warning("Gateway 未就緒，但 API 仍可操作配置文件")
    return gateway_manager.is_connected


@app.get("/api/gateway/health")
async def gateway_health():
    """檢查 Gateway 連接健康狀態。"""
    try:
        health = gateway_manager.health_check()
        return health
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/api/gateway/reconnect")
async def gateway_reconnect():
    """手動觸發 Gateway 重連。"""
    try:
        check_gateway_connection()
        return {"success": gateway_manager.is_connected}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/api/config/load")
async def load_config():
    try:
        check_gateway_connection()
        return manager.get_summary()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/api/config/validate")
async def validate_config(payload: ConfigPayload):
    try:
        check_gateway_connection()
        return {
            "draftValidation": manager.local_validate_draft(payload.config),
            "cliValidation": manager.validate_current_config(),
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/api/config/save")
async def save_config(payload: ConfigPayload):
    try:
        check_gateway_connection()
        return manager.save_with_safety(payload.config, run_repair_doctor=False)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/api/config/doctor")
async def run_doctor():
    try:
        check_gateway_connection()
        return manager.run_doctor(repair=False)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/api/config/backups")
async def list_backups():
    try:
        return {"items": manager.list_backups(limit=20), "total": len(manager.list_backups(limit=None))}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/api/config/rollback")
async def rollback_config(payload: RollbackPayload):
    try:
        check_gateway_connection()
        restored = manager.restore_backup(payload.backupPath)
        return {
            "restore": restored,
            "cliValidation": manager.validate_current_config(),
            "doctor": manager.run_doctor(repair=False),
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/api/config/delete-backup")
async def delete_backup(payload: DeleteBackupPayload):
    try:
        check_gateway_connection()
        return manager.delete_backup(payload.backupPath)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/api/system/status")
async def system_status():
    try:
        check_gateway_connection()
        return manager.system_status()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/api/models/summary")
async def model_summary():
    try:
        check_gateway_connection()
        return manager.get_model_summary()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/api/models/global")
async def update_global_models(payload: GlobalModelsPayload):
    try:
        check_gateway_connection()
        return manager.update_global_models(payload.model, payload.fallbackModel, payload.visionModel, payload.modelFallbacks, payload.visionFallbacks)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/api/models/agent")
async def update_agent_models(payload: AgentModelsPayload):
    try:
        check_gateway_connection()
        return manager.update_agent_models(payload.agentId, payload.useDefaultModel, payload.useDefaultFallbacks, payload.useDefaultVision, payload.model, payload.fallbackModel, payload.visionModel, payload.modelFallbacks, payload.visionFallbacks)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/api/models/reset-agent")
async def reset_agent_models(payload: AgentModelsPayload):
    try:
        check_gateway_connection()
        return manager.reset_agent_models(payload.agentId)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/api/memory/summary")
async def memory_summary():
    try:
        check_gateway_connection()
        return manager.get_memory_summary()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/api/memory/save")
async def save_memory_settings(payload: MemorySettingsPayload):
    try:
        check_gateway_connection()
        return manager.update_memory_settings(payload.settings)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/api/plugins/wizard/summary")
async def plugin_wizard_summary():
    try:
        check_gateway_connection()
        return manager.plugin_wizard_summary()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/api/plugins/wizard/install")
async def plugin_wizard_install(payload: PluginWizardPayload):
    try:
        check_gateway_connection()
        return manager.run_plugin_wizard_action(payload.pluginId, payload.action or "clone")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/api/plugins/wizard/configure")
async def plugin_wizard_configure(payload: PluginWizardPayload):
    try:
        check_gateway_connection()
        return manager.configure_plugin_wizard_plugin(payload.pluginId)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/api/plugins/wizard/validate")
async def plugin_wizard_validate(payload: PluginWizardPayload):
    try:
        check_gateway_connection()
        return manager.plugin_wizard_validate_chain(payload.pluginId)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


# --- Channels Endpoints ---
@app.get("/api/channels/telegram")
async def get_telegram_channels():
    try:
        check_gateway_connection()
        return manager.get_telegram_channels()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/api/channels/telegram")
async def update_telegram_channels(payload: TelegramChannelsPayload):
    try:
        check_gateway_connection()
        return manager.update_telegram_accounts(payload.accounts, payload.enabled)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


# --- Skills Endpoints ---
@app.get("/api/skills/summary")
async def skills_summary():
    try:
        check_gateway_connection()
        return manager.get_skills_summary()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/api/skills/toggle")
async def skills_toggle(payload: SkillTogglePayload):
    try:
        check_gateway_connection()
        return manager.toggle_skill(payload.skillId, payload.enabled)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/api/skills/remove")
async def skills_remove(payload: SkillRemovePayload):
    try:
        check_gateway_connection()
        return manager.remove_skill(payload.skillId, payload.deleteFiles, payload.skillPath)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/api/skills/pull")
async def skills_pull(payload: SkillPullPayload):
    try:
        check_gateway_connection()
        return manager.pull_skill(payload.skillPath)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/api/skills/clone")
async def skills_clone(payload: SkillClonePayload):
    try:
        check_gateway_connection()
        return manager.clone_skill(payload.gitUrl, payload.target)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/api/skills/metadata")
async def skills_metadata(payload: SkillMetadataPayload):
    try:
        check_gateway_connection()
        return manager.get_skill_metadata(payload.path)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/api/skills/check-updates")
async def check_skills_updates(payload: CheckUpdatesPayload):
    try:
        check_gateway_connection()
        return manager.check_skills_updates(payload.paths)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/api/agents")
async def get_agents():
    try:
        check_gateway_connection()
        return manager.get_agents_summary()
    except Exception as e:
        logger.error(f"Error getting agents: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/agents/{agent_id}")
async def update_agent(agent_id: str, payload: AgentUpdatePayload):
    try:
        check_gateway_connection()
        return manager.update_agent(agent_id, payload.updates)
    except Exception as e:
        logger.error(f"Error updating agent {agent_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/agents/{agent_id}/files")
async def get_agent_files(agent_id: str):
    try:
        check_gateway_connection()
        return manager.get_agent_markdown_files(agent_id)
    except Exception as e:
        logger.error(f"Error getting agent files for {agent_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/agents/{agent_id}/files")
async def update_agent_file(agent_id: str, payload: AgentFileUpdatePayload):
    try:
        check_gateway_connection()
        return manager.save_agent_markdown_file(agent_id, payload.filename, payload.content)
    except Exception as e:
        logger.error(f"Error updating agent file for {agent_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/agents/{agent_id}")
async def delete_agent(agent_id: str):
    try:
        check_gateway_connection()
        return manager.delete_agent(agent_id)
    except Exception as e:
        logger.error(f"Error deleting agent {agent_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/agents/{agent_id}/clone")
async def clone_agent(agent_id: str, payload: AgentClonePayload):
    try:
        check_gateway_connection()
        return manager.clone_agent(agent_id, payload.target_id)
    except Exception as e:
        logger.error(f"Error cloning agent {agent_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/agents/{agent_id}/check")
async def check_agent(agent_id: str):
    """實質檢測 Agent 狀態。"""
    try:
        check_gateway_connection()
        return manager.check_agent(agent_id)
    except Exception as e:
        logger.error(f"Error checking agent {agent_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/agents/{agent_id}/optimize")
async def optimize_agent(agent_id: str):
    """實質優化 Agent 配置。"""
    try:
        check_gateway_connection()
        return manager.optimize_agent(agent_id)
    except Exception as e:
        logger.error(f"Error optimizing agent {agent_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Mount frontend assets
assets_dir = FRONTEND_DIST_DIR / "assets"
index_file = FRONTEND_DIST_DIR / "index.html"

if assets_dir.exists():
    app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")


@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="API route not found")
    if index_file.exists():
        return FileResponse(str(index_file))
    raise HTTPException(status_code=404, detail="Frontend build not found. Run npm run build in frontend.")


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8002)
