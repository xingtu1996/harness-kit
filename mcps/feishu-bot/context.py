"""小途 - 群聊对话上下文管理"""
import time
import threading
from collections import defaultdict
from config import CONTEXT_MAX_MESSAGES, CONTEXT_TTL


class ContextManager:
    """按群聊管理对话上下文，线程安全。"""

    def __init__(self):
        self._contexts: dict[str, list[dict]] = defaultdict(list)
        self._timestamps: dict[str, float] = {}
        self._lock = threading.Lock()

    def _is_expired(self, chat_id: str) -> bool:
        ts = self._timestamps.get(chat_id, 0)
        return (time.time() - ts) > CONTEXT_TTL

    def get(self, chat_id: str) -> list[dict]:
        """获取群聊上下文（过期则清空）。"""
        with self._lock:
            if self._is_expired(chat_id):
                self._contexts[chat_id] = []
            self._timestamps[chat_id] = time.time()
            return list(self._contexts[chat_id])

    def add(self, chat_id: str, role: str, content: str):
        """添加一条对话记录。"""
        with self._lock:
            if self._is_expired(chat_id):
                self._contexts[chat_id] = []
            self._contexts[chat_id].append({"role": role, "content": content})
            # 保留最近N条
            if len(self._contexts[chat_id]) > CONTEXT_MAX_MESSAGES:
                self._contexts[chat_id] = self._contexts[chat_id][-CONTEXT_MAX_MESSAGES:]
            self._timestamps[chat_id] = time.time()

    def clear(self, chat_id: str):
        """清空群聊上下文。"""
        with self._lock:
            self._contexts[chat_id] = []
            self._timestamps.pop(chat_id, None)


# 全局实例
context_manager = ContextManager()
