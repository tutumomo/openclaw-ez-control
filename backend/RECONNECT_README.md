# 自動重連功能更新說明

## 更新時間
2026-03-30

## 更新內容

### 1. 新增 `gateway_connection.py` 模組
- **功能**: 管理與 OpenClaw Gateway 的連接
- **特性**:
  - ✅ 自動檢測 Gateway 狀態
  - ✅ 指數退避重連機制（Base delay: 2s, Max delay: 30s, Max retries: 5）
  - ✅ 健康檢查端點 (`/api/gateway/health`)
  - ✅ 啟動時自動等待 Gateway 就緒（超時 60 秒）
  - ✅ 連接狀態監控與統計

### 2. 更新 `main.py`
- 加入 `check_gateway_connection()` 函數
- 所有 API 端點在執行前會自動檢查 Gateway 連接
- 新增端點:
  - `GET /api/gateway/health` - 檢查 Gateway 健康狀態
  - `POST /api/gateway/reconnect` - 手動觸發重連

### 3. 新增 `start.sh` 啟動腳本
- **用法**:
  ```bash
  # 啟動服務
  ./start.sh start
  
  # 停止服務
  ./start.sh stop
  
  # 重啟服務
  ./start.sh restart
  
  # 查看狀態
  ./start.sh status
  
  # 看門狗模式（自動監控與重啟）
  ./start.sh watchdog
  ```

## 自動重連機制

### 工作流程
```
服務啟動
   ↓
檢查 Gateway 狀態
   ↓
如果運行中 → 建立連接
   ↓
如果未運行 → 等待最多 60 秒
   ↓
等待期間每 2 秒檢查一次
   ↓
成功 → 返回成功
   ↓
超時 → 記錄錯誤但服務繼續運行
```

### 重連策略
- **第 1 次重試**: 等待 2 秒
- **第 2 次重試**: 等待 4 秒
- **第 3 次重試**: 等待 8 秒
- **第 4 次重試**: 等待 16 秒
- **第 5 次重試**: 等待 30 秒（上限）

### 健康檢查端點
```bash
curl http://localhost:8002/api/gateway/health
```

**回應範例**:
```json
{
  "timestamp": "2026-03-30T13:45:00.123456",
  "is_connected": true,
  "gateway_running": true,
  "last_check_time": "2026-03-30T13:45:00.123456",
  "consecutive_failures": 0,
  "gateway_status": {
    "success": true,
    "running": true,
    "stdout": "Gateway is running",
    "stderr": "",
    "returncode": 0,
    "timestamp": "2026-03-30T13:45:00.123456"
  },
  "health": "healthy"
}
```

## 使用場景

### 場景 1: 正常啟動
```bash
# 進入後端目錄
cd /Users/tuchengshin/.openclaw/agents/oc_admin/projects/openclaw-ez-control/backend

# 啟動服務
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8002 --reload
```

### 場景 2: 網關重啟後自動恢復
- 無需用戶干預
- 服務會自動檢測並重連
- 可透過健康檢查端點監控狀態

### 場景 3: 手動觸發重連
```bash
curl -X POST http://localhost:8002/api/gateway/reconnect
```

## 測試驗證

### 測試 1: 啟動時 Gateway 已在運行
```bash
# 1. 確保 Gateway 運行中
openclaw gateway status

# 2. 啟動服務
./start.sh start

# 3. 檢查健康狀態
curl http://localhost:8002/api/gateway/health
```

### 測試 2: Gateway 重啟
```bash
# 1. 記錄當前健康狀態
curl http://localhost:8002/api/gateway/health

# 2. 重啟 Gateway
openclaw gateway restart

# 3. 等待 5 秒後檢查
sleep 5
curl http://localhost:8002/api/gateway/health
```

### 測試 3: 手動重連
```bash
# 1. 停止 Gateway
openclaw gateway stop

# 2. 觸發重連（應該失敗）
curl -X POST http://localhost:8002/api/gateway/reconnect

# 3. 啟動 Gateway
openclaw gateway start

# 4. 等待自動重連
sleep 10
curl http://localhost:8002/api/gateway/health
```

## 日誌位置
- **主日誌**: `/Users/tuchengshin/.openclaw/agents/oc_admin/projects/openclaw-ez-control/backend/.ez_control.log`
- **PID 文件**: `/Users/tuchengshin/.openclaw/agents/oc_admin/projects/openclaw-ez-control/backend/.ez_control.pid`

## 注意事項
1. 服務啟動時會自動等待 Gateway 就緒（最多 60 秒）
2. 如果 Gateway 始終未就緒，服務仍會運行，但部分 API 可能無法使用
3. 建議使用 `start.sh` 腳本啟動服務，以獲得完整的監控功能
4. 看門狗模式 (`watchdog`) 會每 30 秒檢查一次服務狀態

## 回滾方案
如果遇到問題，可以回到原始啟動方式：
```bash
cd /Users/tuchengshin/.openclaw/agents/oc_admin/projects/openclaw-ez-control/backend
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8002 --reload
```
