#!/bin/bash

# 取得腳本所在的目錄的絕對路徑
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "=========================================="
echo "   OpenClaw EZ-Control Start Script (Unix) "
echo "=========================================="

# 1. 檢查 Python 3
if ! command -v python3 &> /dev/null; then
    echo "[ERROR] Cannot find python3, please install Python 3.8+"
    exit 1
fi

# 2. 檢查 Git
if ! command -v git &> /dev/null; then
    echo "[ERROR] Cannot find git, which is required for updating skills."
    exit 1
fi

cd "$DIR"

# 3. 檢查前端是否已編譯
if [ ! -d "frontend/dist" ]; then
    echo "[WARNING] frontend/dist directory NOT found!"
    echo "Please ensure you have run 'cd frontend && npm run build'."
    echo "------------------------------------------"
fi

# 4. 建立並檢查專屬虛擬環境 (venv_unix)
VENV_DIR="backend/venv_unix"
if [ ! -d "$VENV_DIR" ]; then
    echo "[SYSTEM] Creating Unix venv (venv_unix)..."
    python3 -m venv "$VENV_DIR"
fi

# 5. 安裝依賴套件
echo "[SYSTEM] Checking and updating backend packages..."
source "$VENV_DIR/bin/activate"
python3 -m pip install --upgrade pip &> /dev/null
pip install -r backend/requirements.txt &> /dev/null

# 6. 取得埠口設定 (預設 8002)
PORT=${1:-8002}

# 7. 啟動 FastAPI (使用專屬路徑)
echo "[SYSTEM] Starting server (Port: $PORT)..."
cd "backend"

# 使用 nohup 並在主視窗顯示訊息
nohup ../$VENV_DIR/bin/python3 -m uvicorn main:app --host 0.0.0.0 --port $PORT > ../server.log 2>&1 &
PID=$!

echo "[SUCCESS] Server started in background (PID: $PID)!"
echo "[URL] Please access: http://127.0.0.1:$PORT"
echo ""
echo "[INFO] To stop, run: kill $PID"
echo "=========================================="
