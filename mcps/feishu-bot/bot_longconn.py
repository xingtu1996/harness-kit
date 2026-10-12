#!/usr/bin/env python3
"""
小途 - 飞书机器人长连接客户端
接收群消息，@机器人时智能回复（LLM + 命令路由）
"""

import os
import sys
import json
import signal
import logging
from datetime import datetime

import lark_oapi as lark
from lark_oapi.api.im.v1 import (
    P2ImMessageReceiveV1,
    CreateMessageRequest,
    CreateMessageRequestBody,
)

from config import (
    FEISHU_APP_ID,
    FEISHU_APP_SECRET,
    BOT_NAME,
    LOG_DIR,
    SYSTEM_PROMPT,
    LLM_CONFIG,
)
from context import context_manager
from commands import handle_command
import llm as llm_client

# 日志
os.makedirs(LOG_DIR, exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(
            f"{LOG_DIR}/bot_{datetime.now().strftime('%Y%m%d')}.log",
            encoding="utf-8",
        ),
    ],
)
logger = logging.getLogger(__name__)

# 创建API客户端
api_client = (
    lark.Client.builder()
    .app_id(FEISHU_APP_ID)
    .app_secret(FEISHU_APP_SECRET)
    .log_level(lark.LogLevel.WARNING)
    .build()
)


def send_text_message(chat_id: str, text: str):
    """发送文本消息到指定群"""
    request = (
        CreateMessageRequest.builder()
        .receive_id_type("chat_id")
        .request_body(
            CreateMessageRequestBody.builder()
            .receive_id(chat_id)
            .msg_type("text")
            .content(json.dumps({"text": text}))
            .build()
        )
        .build()
    )
    response = api_client.im.v1.message.create(request)
    if not response.success():
        logger.error(f"发送消息失败: code={response.code}, msg={response.msg}")
    else:
        logger.info(f"回复发送成功: {response.data.message_id}")
    return response.success()


def get_smart_reply(chat_id: str, user_text: str) -> str:
    """获取智能回复（命令优先，其次LLM）。"""
    # 1. 命令路由
    cmd_reply = handle_command(user_text, chat_id, "")
    if cmd_reply is not None:
        return cmd_reply

    # 2. LLM对话
    if not LLM_CONFIG["api_key"]:
        return (
            f"【{BOT_NAME}】收到boss指令：{user_text}\n\n"
            f"LLM尚未配置API Key，当前为占位回复。\n"
            f"配置火山方舟ARK_API_KEY后即可智能对话。\n"
            f"发送 /help 查看可用命令。"
        )

    context = context_manager.get(chat_id)
    messages = llm_client.build_messages(SYSTEM_PROMPT, context, user_text)
    reply = llm_client.chat(messages)

    if reply:
        # 保存上下文
        context_manager.add(chat_id, "user", user_text)
        context_manager.add(chat_id, "assistant", reply)
        return reply
    return f"抱歉boss，我暂时无法处理这个请求，请稍后再试。"


def handle_message_event(event: P2ImMessageReceiveV1):
    """处理接收消息事件"""
    try:
        msg = event.event.message
        chat_id = msg.chat_id
        msg_type = msg.message_type
        chat_type = msg.chat_type

        if msg_type != "text":
            logger.info(f"非文本消息，跳过: {msg_type}")
            return

        # 解析消息内容
        content = json.loads(msg.content)
        text = content.get("text", "")

        # 判断是否@了机器人
        mentions = msg.mentions or []
        is_at_bot = False
        for mention in mentions:
            if mention.name == BOT_NAME:
                is_at_bot = True
                break

        # 单聊消息也处理
        if chat_type == "p2p":
            is_at_bot = True

        if not is_at_bot:
            return

        # 清理@标记（mention.key 格式为 @_user_N）
        clean_text = text
        for mention in mentions:
            clean_text = clean_text.replace(mention.key, "").strip()

        sender_id = event.event.sender.sender_id.open_id
        logger.info(f"收到消息 chat={chat_id} text={clean_text}")

        # 获取回复
        reply = get_smart_reply(chat_id, clean_text)
        send_text_message(chat_id, reply)

    except Exception as e:
        logger.error(f"处理消息异常: {e}", exc_info=True)


def main():
    logger.info("=" * 50)
    logger.info(f"{BOT_NAME} 长连接客户端启动 (PID: {os.getpid()})")
    logger.info(f"App ID: {FEISHU_APP_ID}")
    logger.info(f"LLM: {'已配置' if LLM_CONFIG['api_key'] else '未配置API Key'}")
    logger.info("=" * 50)

    handler = (
        lark.EventDispatcherHandler.builder("", "")
        .register_p2_im_message_receive_v1(handle_message_event)
        .build()
    )

    def signal_handler(sig, frame):
        logger.info(f"收到信号 {sig}，退出")
        sys.exit(0)

    signal.signal(signal.SIGTERM, signal_handler)
    signal.signal(signal.SIGINT, signal_handler)

    lark.ws.Client(
        FEISHU_APP_ID,
        FEISHU_APP_SECRET,
        event_handler=handler,
        log_level=lark.LogLevel.WARNING,
        auto_reconnect=True,
    ).start()


if __name__ == "__main__":
    main()
