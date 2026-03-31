#!/bin/bash
# OpenClaw EZ-Control 啟動腳本（具備自動重連與監控功能）

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPTDIR/backend"
VENV_DIR="$BACKEND_DIR/venv"
PID_FILE="$SCRIPT_DIR/.ez_control.pid"
LOG_FILE="$SCRIPT_DIR/.ez_control.log"

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 檢查是否正在運行
check_running() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p "$PID" > /dev/null 2>&1; then
            return 0  # 正在運行
        else
            rm -f "$PID_FILE"
            return 1  # PID 文件存在但進程不存在
        fi
    fi
    return 1  # 未運行
}

# 停止服務
stop_service() {
    if check_running; then
        PID=$(cat "$PID_FILE")
        log_info "停止運行中的服務 (PID: $PID)..."
        kill "$PID" 2>/dev/null || true
        sleep 2
        if ps -p "$PID" > /dev/null 2>&1; then
            log_warn "進程未正常終止，強制終止..."
            kill -9 "$PID" 2>/dev/null || true
        fi
        rm -f "$PID_FILE"
        log_info "服務已停止"
    else
        log_info "服務未運行"
    fi
}

# 啟動服務
start_service() {
    if check_running; then
        log_warn "服務已在運行中"
        return 0
    fi

    log_info "啟動 OpenClaw EZ-Control 後端服務..."

    # 檢查虛擬環境
    if [ ! -d "$VENV_DIR" ]; then
        log_error "虛擬環境不存在：$VENV_DIR"
        log_info "正在建立虛擬環境..."
        cd "$BACKEND_DIR"
        python3 -m venv venv
    fi

    # 激活虛擬環境
    source "$VENV_DIR/bin/activate"

    # 檢查並安裝依賴
    if [ -f "$BACKEND_DIR/requirements.txt" ]; then
        log_info "檢查並安裝依賴..."
        pip install -q -r "$BACKEND_DIR/requirements.txt"
    fi

    # 啟動 uvicorn（帶重啟監控）
    cd "$BACKEND_DIR"
    log_info "啟動 uvicorn 服務器 (port 8002)..."
    
    # 使用 nohup 後台運行
    nohup uvicorn main:app --host 0.0.0.0 --port 8002 --reload > "$LOG_FILE" 2>&1 &
    UVICORN_PID=$!
    
    echo "$UVICORN_PID" > "$PID_FILE"
    
    # 等待服務啟動
    sleep 3
    
    if ps -p "$UVICORN_PID" > /dev/null 2>&1; then
        log_info "服務已啟動 (PID: $UVICORN_PID)"
        log_info "訪問地址：http://localhost:8002"
        log_info "日誌文件：$LOG_FILE"
    else
        log_error "服務啟動失敗，檢查日誌：$LOG_FILE"
        rm -f "$PID_FILE"
        return 1
    fi
}

# 重啟服務
restart_service() {
    stop_service
    sleep 2
    start_service
}

# 檢查服務狀態
status_service() {
    if check_running; then
        PID=$(cat "$PID_FILE")
        log_info "服務運行中 (PID: $PID)"
        
        # 檢查 Gateway 連接
        if command -v curl &> /dev/null; then
            HEALTH=$(curl -s "http://localhost:8002/api/gateway/health" 2>/dev/null || echo "")
            if [ -n "$HEALTH" ]; then
                echo "Gateway 健康狀態：$HEALTH"
            fi
        fi
        
        return 0
    else
        log_info "服務未運行"
        return 1
    fi
}

# 監控服務（看門狗模式）
watchdog_service() {
    log_info "啟動看門狗監控..."
    
    while true; do
        if ! check_running; then
            log_warn "服務未運行，嘗試重啟..."
            start_service
        else
            # 檢查 Gateway 連接
            if command -v curl &> /dev/null; then
                HEALTH=$(curl -s "http://localhost:8002/api/gateway/health" 2>/dev/null || echo "")
                if echo "$HEALTH" | grep -q '"health":"unhealthy"'; then
                    log_warn "Gateway 連接異常，但服務仍運行"
                fi
            fi
        fi
        sleep 30
    done
}

# 主程式
case "${1:-start}" in
    start)
        start_service
        ;;
    stop)
        stop_service
        ;;
    restart)
        restart_service
        ;;
    status)
        status_service
        ;;
    watchdog)
        watchdog_service
        ;;
    *)
        echo "用法: $0 {start|stop|restart|status|watchdog}"
        exit 1
        ;;
esac
