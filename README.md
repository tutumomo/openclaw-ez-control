# openclaw-ez-control

Built with Local UI Forge.

## Project location

This project lives at:

`/Users/tuchengshin/.openclaw/agents/oc_admin/projects/openclaw-ez-control/`

### Main code locations
- Frontend UI: `frontend/`
- Backend API: `backend/`
- Planning notes: `docs/plans/`

## 🚀 快速啟動 (Quick Start Scripts)

為了方便不同作業系統的使用者快速啟動管理面板，我們提供了專屬的啟動腳本。只要您已經執行過一次 `npm run build` (建立前端發佈檔)，之後都只需要雙擊或執行這些腳本即可：

### 🍎 Mac / 🐧 Linux (自動背景執行)
打開終端機，執行以下指令：
```bash
./start_mac_linux.sh
```
此腳本會自動檢查相依套件，並將伺服器放入**背景安靜執行**。關閉終端機後也不會中斷。
若要停止伺服器，只需執行腳本最後印出的 `kill <PID>` 指令即可。

### 🪟 Windows (批次檔啟動)
直接雙擊執行目錄下的：
```text
start_windows.bat
```
它會打開一個黑框 (命令提示字元) 並自動啟動伺服器。
> ⚠️ **注意**：在 Windows 中，請保持該黑框開啟。若要關閉面板伺服器，直接叉叉關閉黑框即可。

### 🍱 多開副本與埠口衝突解決 (Multi-Port Support)
如果您在同一台電腦同時運行多個 OpenClaw 環境 (例如同時有 Windows 版與 WSL 版)，請務必為它們指派不同的埠口。

您可以在指令後方加入埠口參數：
- **Mac / Linux**: `./start_mac_linux.sh 8003`
- **Windows**: 在 CMD 或 PowerShell 輸入 `start_windows.bat 8003` (或是建立一個新的批次檔，內容寫 `start_windows.bat 8003`)。

這樣兩者就不會打架了！

## Stable run mode (recommended)

Use production build + FastAPI static serving instead of relying on Vite dev server.

### 1) Build the frontend
```bash
cd frontend
npm install
npm run build
```

### 2) Start the backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8002 --reload
```

### 3) Open the UI
- `http://localhost:8002`

In stable mode:
- no separate frontend port is needed
- FastAPI serves the built frontend from `frontend/dist`
- API routes are available under `/api`

## Dev mode (only when actively editing frontend)

```bash
# terminal 1
cd backend
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8002 --reload

# terminal 2
cd frontend
npm run dev
```

Dev frontend:
- default port: `5173`
- only needed when using Vite dev server directly

## Plugin wizard scope
- `memory-lancedb-pro`
- `lossless-claw-enhanced` (actual plugin id: `lossless-claw`)

## Current notes
- If `lossless-claw-enhanced` shows stale in doctor, the actual plugin entry id must match the plugin schema id `lossless-claw`.
- Recommended daily usage is the stable run mode above.

## Quick answers
- **Where is the full code?** `projects/openclaw-ez-control/`
- **Is there a README?** Yes, this file.
- **Do I need to specify the frontend port every time?** No, not in stable mode. Just open the backend URL on `8002`.
