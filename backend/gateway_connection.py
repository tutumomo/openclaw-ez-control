#!/usr/bin/env python3
"""OpenClaw 網關連接管理器 - 具備自動重連與健康檢查功能。"""

import subprocess
import time
import json
from typing import Optional, Dict, Any, Callable
from datetime import datetime
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class GatewayConnectionManager:
    """管理與 OpenClaw Gateway 的連接，具備自動重連機制。"""
    
    def __init__(self, max_retries: int = 5, base_delay: float = 2.0, max_delay: float = 30.0):
        """
        初始化連接管理器。
        
        Args:
            max_retries: 最大重試次數
            base_delay: 基礎延遲時間（秒）
            max_delay: 最大延遲時間（秒）
        """
        self.max_retries = max_retries
        self.base_delay = base_delay
        self.max_delay = max_delay
        self.is_connected: bool = False
        self.last_check_time: Optional[datetime] = None
        self.consecutive_failures: int = 0
        
    def check_gateway_status(self) -> Dict[str, Any]:
        """
        檢查 OpenClaw Gateway 狀態。
        
        Returns:
            包含狀態資訊的字典
        """
        try:
            import os
            is_windows = os.name == 'nt'
            result = subprocess.run(
                ["openclaw", "gateway", "status"],
                capture_output=True,
                text=True,
                timeout=10,
                shell=is_windows
            )
            
            is_running = result.returncode == 0
            self.last_check_time = datetime.now()
            
            return {
                "success": is_running,
                "running": is_running,
                "stdout": result.stdout.strip(),
                "stderr": result.stderr.strip(),
                "returncode": result.returncode,
                "timestamp": self.last_check_time.isoformat()
            }
        except subprocess.TimeoutExpired:
            return {
                "success": False,
                "running": False,
                "stdout": "",
                "stderr": "Gateway status check timed out",
                "returncode": -1,
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            return {
                "success": False,
                "running": False,
                "stdout": "",
                "stderr": str(e),
                "returncode": -1,
                "timestamp": datetime.now().isoformat()
            }
    
    def wait_for_gateway(self, timeout: int = 60, poll_interval: float = 2.0) -> Dict[str, Any]:
        """
        等待 Gateway 啟動，直到超時或成功。
        
        Args:
            timeout: 超時時間（秒）
            poll_interval: 輪詢間隔（秒）
            
        Returns:
            最終狀態
        """
        start_time = time.time()
        attempts = 0
        
        logger.info("等待 OpenClaw Gateway 啟動...")
        
        while time.time() - start_time < timeout:
            attempts += 1
            status = self.check_gateway_status()
            
            if status["running"]:
                logger.info(f"Gateway 已就緒（嘗試 {attempts} 次）")
                self.is_connected = True
                self.consecutive_failures = 0
                return {"success": True, "attempts": attempts, "status": status}
            
            logger.info(f"Gateway 尚未就緒，等待 {poll_interval} 秒後重試...（嘗試 {attempts}）")
            time.sleep(poll_interval)
        
        logger.error(f"等待 Gateway 超時（{timeout}秒）")
        self.consecutive_failures += 1
        return {"success": False, "attempts": attempts, "error": "Timeout waiting for gateway"}
    
    def reconnect_with_backoff(self, on_status_change: Optional[Callable[[bool], None]] = None) -> Dict[str, Any]:
        """
        使用指數退避策略重連 Gateway。
        
        Args:
            on_status_change: 連接狀態改變時的回調函數
            
        Returns:
            重連結果
        """
        if self.is_connected:
            return {"success": True, "message": "Already connected"}
        
        logger.info("開始重連流程...")
        
        for attempt in range(1, self.max_retries + 1):
            status = self.check_gateway_status()
            
            if status["running"]:
                self.is_connected = True
                self.consecutive_failures = 0
                logger.info(f"重連成功（嘗試 {attempt}/{self.max_retries}）")
                
                if on_status_change:
                    on_status_change(True)
                
                return {"success": True, "attempts": attempt, "status": status}
            
            self.consecutive_failures += 1
            logger.warning(f"重連失敗（嘗試 {attempt}/{self.max_retries}）")
            
            if attempt < self.max_retries:
                delay = min(self.base_delay * (2 ** (attempt - 1)), self.max_delay)
                logger.info(f"等待 {delay} 秒後重試...")
                time.sleep(delay)
        
        logger.error(f"重連失敗，已達最大重試次數 {self.max_retries}")
        return {
            "success": False,
            "error": "Max retries exceeded",
            "consecutive_failures": self.consecutive_failures
        }
    
    def health_check(self) -> Dict[str, Any]:
        """
        執行健康檢查，包含連接狀態和統計資訊。
        
        Returns:
            健康狀態報告
        """
        status = self.check_gateway_status()
        
        return {
            "timestamp": datetime.now().isoformat(),
            "is_connected": self.is_connected,
            "gateway_running": status["running"],
            "last_check_time": self.last_check_time.isoformat() if self.last_check_time else None,
            "consecutive_failures": self.consecutive_failures,
            "gateway_status": status,
            "health": "healthy" if self.is_connected and status["running"] else "unhealthy"
        }

# 全域實例
gateway_manager = GatewayConnectionManager()

def initialize_connection() -> bool:
    """
    初始化時檢查並等待 Gateway 就緒。
    
    Returns:
        是否成功連接
    """
    logger.info("初始化 OpenClaw Gateway 連接...")
    
    # 先檢查一次
    status = gateway_manager.check_gateway_status()
    
    if status["running"]:
        gateway_manager.is_connected = True
        logger.info("Gateway 已在運行")
        return True
    
    # 等待 Gateway 啟動
    result = gateway_manager.wait_for_gateway(timeout=60)
    
    if result["success"]:
        logger.info("Gateway 啟動成功")
        return True
    else:
        logger.error("無法連接到 Gateway，但服務將繼續運行")
        return False

def check_connection_before_request():
    """
    裝飾器：在請求前檢查連接。
    用於包裝需要 Gateway 連接的 API 端點。
    """
    def decorator(func):
        def wrapper(*args, **kwargs):
            if not gateway_manager.is_connected:
                # 嘗試重新連接
                logger.warning("偵測到未連接，嘗試重連...")
                result = gateway_manager.reconnect_with_backoff()
                if not result["success"]:
                    from fastapi import HTTPException
                    raise HTTPException(
                        status_code=503,
                        detail="OpenClaw Gateway 未就緒，請重啟服務或檢查 Gateway 狀態"
                    )
            return func(*args, **kwargs)
        return wrapper
    return decorator
