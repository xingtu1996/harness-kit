"""小途 - LLM客户端（豆包/火山方舟，兼容OpenAI格式）"""
import json
import logging
import requests
from config import LLM_CONFIG, SYSTEM_PROMPT

logger = logging.getLogger(__name__)


def chat(messages: list[dict], temperature: float = None) -> str:
    """调用LLM生成回复。

    Args:
        messages: [{"role": "system/user/assistant", "content": "..."}]
        temperature: 温度参数

    Returns:
        LLM回复文本，失败返回None
    """
    if not LLM_CONFIG["api_key"]:
        return None

    url = f"{LLM_CONFIG['base_url']}/chat/completions"
    headers = {
        "Authorization": f"Bearer {LLM_CONFIG['api_key']}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": LLM_CONFIG["model"],
        "messages": messages,
        "temperature": temperature or LLM_CONFIG["temperature"],
        "max_tokens": LLM_CONFIG["max_tokens"],
    }

    try:
        resp = requests.post(url, headers=headers, json=payload, timeout=60)
        data = resp.json()
        if resp.status_code == 200 and "choices" in data:
            return data["choices"][0]["message"]["content"].strip()
        logger.error(f"LLM API错误: status={resp.status_code}, data={data}")
        return None
    except Exception as e:
        logger.error(f"LLM调用异常: {e}", exc_info=True)
        return None


def build_messages(system_prompt: str, context: list[dict], user_msg: str) -> list[dict]:
    """构建完整的消息列表。"""
    messages = [{"role": "system", "content": system_prompt}]
    messages.extend(context)
    messages.append({"role": "user", "content": user_msg})
    return messages
