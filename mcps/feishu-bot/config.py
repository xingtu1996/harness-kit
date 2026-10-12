"""行途小助 - 配置管理（开源骨架版）"""
import os
import json
from pathlib import Path

# 飞书应用配置 —— 密钥一律走环境变量，不硬编码
FEISHU_APP_ID = os.environ.get("FEISHU_APP_ID", "")
FEISHU_APP_SECRET = os.environ.get("FEISHU_APP_SECRET", "")
BOT_NAME = "行途小助"

# 项目路径
BASE_DIR = Path(__file__).parent
LOG_DIR = BASE_DIR / "logs"
DATA_DIR = BASE_DIR / "data"
LOG_DIR.mkdir(exist_ok=True)
DATA_DIR.mkdir(exist_ok=True)

# LLM 配置（兼容 OpenAI 格式，火山方舟示例 endpoint）
LLM_CONFIG = {
    "api_key": os.environ.get("ARK_API_KEY", ""),
    "base_url": os.environ.get("ARK_BASE_URL", "https://ark.cn-beijing.volces.com/api/v3"),
    "model": os.environ.get("ARK_MODEL", "doubao-1-5-pro-32k-250115"),
    "temperature": 0.7,
    "max_tokens": 2000,
}

# 系统提示词（占位示例：接入方可按自己的运营场景改写）
SYSTEM_PROMPT = """你是「行途小助」，一位 AI 自媒体运营助手。

职责：
1. 协助运营技术类自媒体（公众号、抖音、小红书等）
2. 内容选题、写作、排版、合规审查、发布排期
3. 管理知识素材库、发布清单
4. 技术问题解答

风格要求：
- 称呼用户为"boss"
- 回复简洁专业，结论先行
- 涉及发布操作必须等确认
- 用中文回复

快捷命令：
- /help 查看帮助
- /status 查看系统状态
- /tasks 查看待办任务
- /newtask 创建任务
- /clear 清空对话上下文
"""

# 群聊上下文保留条数
CONTEXT_MAX_MESSAGES = 20
# 上下文过期时间（秒）
CONTEXT_TTL = 3600
