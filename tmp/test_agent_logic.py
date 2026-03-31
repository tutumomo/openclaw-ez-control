import sys
from pathlib import Path
import json
import os

# 加入 backend 路徑以導入 ConfigManager
sys.path.append(str(Path.cwd() / "backend"))
from openclaw_config_manager import ConfigManager

def test():
    # 建立測試環境
    home = Path.home()
    test_agent_id = "test_debug_agent"
    state_dir = home / ".openclaw" / "agents" / test_agent_id
    ws_dir = Path.cwd() / "tmp" / "test_workspace"
    
    state_dir.mkdir(parents=True, exist_ok=True)
    ws_dir.mkdir(parents=True, exist_ok=True)
    
    # 準備模擬配置
    manager = ConfigManager()
    config = manager.load()
    
    # 確保測試 Agent 在配置中
    agents_list = config.setdefault("agents", {}).setdefault("list", [])
    # 移除舊的測試資料
    config["agents"]["list"] = [a for a in agents_list if a.get("id") != test_agent_id]
    
    test_agent_entry = {
        "id": test_agent_id,
        "workspace": str(ws_dir)
    }
    config["agents"]["list"].append(test_agent_entry)
    manager.save_with_safety(config)
    
    print(f"--- 測試情境 1: 僅在私體目錄 ---")
    (state_dir / "IDENTITY.md").write_text("State Content", encoding='utf-8')
    if (ws_dir / "IDENTITY.md").exists(): (ws_dir / "IDENTITY.md").unlink()
    
    files = manager.get_agent_markdown_files(test_agent_id)
    for f in files:
        print(f"File: {f['filename']}, Origin: {f['origin']}, Warning: {f['warning']}")
        
    print(f"\n--- 測試情境 2: 僅在工作空間 ---")
    (state_dir / "IDENTITY.md").unlink()
    (ws_dir / "IDENTITY.md").write_text("WS Content", encoding='utf-8')
    
    files = manager.get_agent_markdown_files(test_agent_id)
    for f in files:
        print(f"File: {f['filename']}, Origin: {f['origin']}, Warning: {f['warning']}")
        
    print(f"\n--- 測試情境 3: 兩處皆有 (衝突) ---")
    (state_dir / "IDENTITY.md").write_text("State Content", encoding='utf-8')
    (ws_dir / "IDENTITY.md").write_text("WS Content", encoding='utf-8')
    
    files = manager.get_agent_markdown_files(test_agent_id)
    for f in files:
        print(f"File: {f['filename']}, Origin: {f['origin']}, Warning: {f['warning']}")
        print(f"Content shown (should be WS): {f['content']}")

    print(f"\n--- 測試情境 4: 儲存測試 ---")
    res = manager.save_agent_markdown_file(test_agent_id, "USER.md", "New User Content")
    print(f"Save Result: {res['message']}")
    print(f"Save Path: {res['path']}")
    
    # 清理
    import shutil
    # shutil.rmtree(state_dir)
    # shutil.rmtree(ws_dir.parent)

if __name__ == "__main__":
    test()
